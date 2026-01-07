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

    // Fetch user's career highlights for STAR story suggestions
    const { data: highlights } = await supabase
      .from("career_highlights")
      .select("title, company_name, tags, reflection_tags, result")
      .eq("user_id", user.id)
      .order("achievement_date", { ascending: false })
      .limit(10);

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
    const previousStepsContext = previousSteps.map(s => {
      let context = `- Step ${s.step_number} (${stepTypeLabels[s.step_type] || s.step_type}): ${s.status}`;
      if (s.outcome) context += ` - Outcome: ${s.outcome}`;
      if (s.notes) context += ` - Notes: ${s.notes}`;
      return context;
    }).join("\n");

    const contactsContext = contacts?.map(c =>
      `- ${c.name}${c.role ? ` (${c.role})` : ""}${c.linkedin_url ? ` - LinkedIn: ${c.linkedin_url}` : ""}`
    ).join("\n") || "None added";

    const highlightsContext = highlights?.map(h =>
      `- "${h.title}" at ${h.company_name} | Skills: ${h.tags?.join(", ") || "none"} | Values: ${h.reflection_tags?.join(", ") || "none"} | Result: ${h.result?.substring(0, 100)}...`
    ).join("\n") || "No career highlights recorded";

    const prompt = `You are a brutally honest interview coach. Your job is to identify GAPS and BLIND SPOTS in the user's preparation - what they've MISSED or haven't thought about.

## INTERVIEW CONTEXT

**Company:** ${process.company_name}
**Position:** ${process.job_title}
${process.company_website ? `**Website:** ${process.company_website}` : ""}
${process.notes ? `**Process Notes:** ${process.notes}` : ""}

**This Interview Step:** ${stepTypeLabels[step.step_type] || step.step_type} (Step ${step.step_number})
${step.scheduled_date ? `**When:** ${new Date(step.scheduled_date).toLocaleString()}` : "**When:** Not scheduled yet"}
${step.description ? `**Description:** ${step.description}` : ""}
${step.notes ? `**Step Notes:** ${step.notes}` : ""}

**Interviewers:** ${contactsContext}

**Previous Steps:**
${previousStepsContext || "This is the first step"}

---

## USER'S CURRENT PREPARATION NOTES

${step.preparation_notes || "*EMPTY - User has written nothing*"}

---

## USER'S AVAILABLE STAR STORIES (from Career Highlights)

${highlightsContext}

---

## YOUR TASK

Analyze the user's preparation notes critically. Identify what's MISSING, WEAK, or OVERLOOKED.

**Rules:**
1. Do NOT give generic advice like "research the company" - be SPECIFIC about WHAT to research and WHY it matters for THIS interview
2. If they have NO preparation notes, call that out directly and tell them exactly what they need to prepare
3. If they have notes, identify GAPS - what critical topics are they missing for this type of interview?
4. Reference their career highlights if relevant - suggest SPECIFIC stories they should prepare based on the interview type
5. If interviewers are listed, give specific advice about researching THOSE people
6. Consider what typically goes WRONG in ${stepTypeLabels[step.step_type] || step.step_type} interviews

**Format:**
- Start with a 1-line assessment of their current preparation level (Unprepared / Partially Prepared / Well Prepared)
- Then list 3-5 SPECIFIC gaps or action items, prioritized by importance
- Each item should be actionable and specific to THIS interview, not generic advice
- If they're missing obvious things for a ${stepTypeLabels[step.step_type] || step.step_type}, say so directly`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a direct, no-nonsense interview coach. Your job is to find gaps in preparation - not to give generic advice or encouragement. Be specific, be critical, and focus on what's MISSING. Never pad your response with obvious or generic tips. If their preparation is weak, say so clearly.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 600,
      temperature: 0.3,
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
