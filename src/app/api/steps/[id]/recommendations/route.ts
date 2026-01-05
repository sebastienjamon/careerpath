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
    const { processId } = await request.json();

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the process details
    const { data: process, error: processError } = await supabase
      .from("recruitment_processes")
      .select("*")
      .eq("id", processId)
      .eq("user_id", user.id)
      .single();

    if (processError || !process) {
      return NextResponse.json({ error: "Process not found" }, { status: 404 });
    }

    // Fetch the current step
    const { data: step, error: stepError } = await supabase
      .from("process_steps")
      .select("*")
      .eq("id", stepId)
      .eq("process_id", processId)
      .single();

    if (stepError || !step) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    // Fetch all steps for context
    const { data: allSteps } = await supabase
      .from("process_steps")
      .select("*")
      .eq("process_id", processId)
      .order("step_number", { ascending: true });

    // Fetch contacts for this step
    const { data: contacts } = await supabase
      .from("step_contacts")
      .select("*")
      .eq("step_id", stepId);

    // Build the context for the AI
    const stepTypeLabels: Record<string, string> = {
      phone_screen: "Phone Screen",
      technical: "Technical Interview",
      behavioral: "Behavioral Interview",
      onsite: "Onsite Interview",
      offer: "Offer Discussion",
      other: "Other",
    };

    const previousSteps = allSteps?.filter(s => s.step_number < step.step_number) || [];
    const previousStepsContext = previousSteps.map(s =>
      `- Step ${s.step_number} (${stepTypeLabels[s.step_type] || s.step_type}): ${s.status}${s.outcome ? ` - Outcome: ${s.outcome}` : ""}`
    ).join("\n");

    const contactsContext = contacts?.map(c =>
      `- ${c.name}${c.role ? ` (${c.role})` : ""}`
    ).join("\n") || "No contacts added yet";

    const prompt = `You are a career coach helping someone prepare for a job interview. Based on the following information about their recruitment process and upcoming interview step, provide specific, actionable recommendations on what they should prepare.

## Company & Role
- Company: ${process.company_name}
- Position: ${process.job_title}
${process.company_website ? `- Website: ${process.company_website}` : ""}
${process.notes ? `- Additional notes: ${process.notes}` : ""}

## Current Interview Step
- Step ${step.step_number}: ${stepTypeLabels[step.step_type] || step.step_type}
${step.scheduled_date ? `- Scheduled: ${new Date(step.scheduled_date).toLocaleString()}` : "- Not yet scheduled"}
${step.description ? `- Purpose: ${step.description}` : ""}
${step.notes ? `- Notes: ${step.notes}` : ""}

## Interviewers
${contactsContext}

## Previous Steps in This Process
${previousStepsContext || "This is the first step"}

## User's Current Preparation Notes
${step.preparation_notes || "No notes yet"}

---

Please provide 4-6 specific, actionable recommendations for preparing for this interview. Consider:
1. Research to do about the company, role, and interviewers
2. Technical topics or skills to review (if applicable)
3. Questions to prepare for the interviewers
4. Stories or examples to have ready (STAR method)
5. Logistics and presentation tips

Be concise but specific. Format as a bulleted list with clear action items.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful career coach providing interview preparation advice. Be specific, actionable, and encouraging. Keep recommendations concise but valuable.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const recommendations = completion.choices[0]?.message?.content;

    if (!recommendations) {
      return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
    }

    // Save the recommendations to the database
    const { error: updateError } = await supabase
      .from("process_steps")
      .update({
        ai_recommendations: recommendations,
        ai_recommendations_updated_at: new Date().toISOString(),
      })
      .eq("id", stepId);

    if (updateError) {
      console.error("Failed to save recommendations:", updateError);
      return NextResponse.json({ error: "Failed to save recommendations" }, { status: 500 });
    }

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
