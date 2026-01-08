import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stepId } = await params;

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the step with its process
    const { data: step, error: stepError } = await supabase
      .from("process_steps")
      .select(`
        *,
        recruitment_processes!inner (
          id,
          user_id,
          company_name,
          job_title
        )
      `)
      .eq("id", stepId)
      .single();

    if (stepError || !step) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    // Verify ownership
    if ((step.recruitment_processes as any).user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only score output steps
    if (step.step_type !== "output") {
      return NextResponse.json({ error: "Only output steps can be scored" }, { status: 400 });
    }

    const wentWell = step.went_well || [];
    const toImprove = step.to_improve || [];

    // If no items, return null score
    if (wentWell.length === 0 && toImprove.length === 0) {
      await supabase
        .from("process_steps")
        .update({ output_score: null })
        .eq("id", stepId);

      return NextResponse.json({ score: null });
    }

    // Fetch linked step for context
    let linkedStepContext = "";
    if (step.linked_step_id) {
      const { data: linkedStep } = await supabase
        .from("process_steps")
        .select("step_type, description, notes")
        .eq("id", step.linked_step_id)
        .single();

      if (linkedStep) {
        const stepTypeLabels: Record<string, string> = {
          phone_screen: "Phone Screen",
          technical: "Technical Interview",
          behavioral: "Behavioral Interview",
          onsite: "Onsite Interview",
          offer: "Offer Discussion",
          other: "Other",
        };
        linkedStepContext = `\n\n**Interview Type:** ${stepTypeLabels[linkedStep.step_type] || linkedStep.step_type}
${linkedStep.description ? `**Interview Description:** ${linkedStep.description}` : ""}`;
      }
    }

    const prompt = `You are an expert interview performance evaluator. Score this interview reflection on a scale of 0-100.

**Context:**
Company: ${(step.recruitment_processes as any).company_name}
Position: ${(step.recruitment_processes as any).job_title}${linkedStepContext}

**What Went Well:**
${wentWell.length > 0 ? wentWell.map((item: string) => `- ${item}`).join("\n") : "- Nothing listed"}

**What Could Be Improved:**
${toImprove.length > 0 ? toImprove.map((item: string) => `- ${item}`).join("\n") : "- Nothing listed"}

**Scoring Criteria:**
- 90-100: Exceptional - Strong technical & soft skills, minimal improvements needed, excellent self-awareness
- 75-89: Strong - Good performance with minor areas for growth, shows good self-reflection
- 60-74: Solid - Decent performance with notable areas to improve, balanced reflection
- 45-59: Developing - Several concerns raised, needs focused preparation for next rounds
- 30-44: Challenging - Significant issues identified, major prep needed
- 0-29: Difficult - Critical problems, may need to reassess approach

**Important:**
- Consider the QUALITY and SIGNIFICANCE of each point, not just quantity
- Weight "went well" items as positive signals
- Weight "to improve" items based on severity (minor adjustments vs critical gaps)
- Consider balance: all positives with no self-criticism = lower score (lack of self-awareness)
- Consider balance: all negatives with no positives = evaluate honestly based on severity

Return ONLY a JSON object: {"score": <number>, "brief": "<15 word summary>"}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an objective interview performance evaluator. Return only valid JSON with a score (0-100) and a brief 15-word-max summary. Be fair but honest in your assessment.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();

    if (!responseText) {
      return NextResponse.json({ error: "Failed to generate score" }, { status: 500 });
    }

    // Parse JSON response
    let scoreData;
    try {
      scoreData = JSON.parse(responseText);
    } catch {
      // Try to extract score from text if JSON parsing fails
      const scoreMatch = responseText.match(/\d+/);
      scoreData = {
        score: scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[0]))) : 50,
        brief: "Score generated",
      };
    }

    const score = Math.min(100, Math.max(0, Math.round(scoreData.score)));
    const brief = scoreData.brief || "Score generated";

    // Save the score and brief to the database
    const { error: updateError } = await supabase
      .from("process_steps")
      .update({ output_score: score, output_score_brief: brief })
      .eq("id", stepId);

    if (updateError) {
      console.error("Failed to save score:", updateError);
      return NextResponse.json({ error: "Failed to save score" }, { status: 500 });
    }

    return NextResponse.json({ score, brief: scoreData.brief });
  } catch (error) {
    console.error("Error generating score:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
