import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CareerAssistantRequest {
  question: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not configured");
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CareerAssistantRequest = await request.json();
    const { question } = body;

    if (!question || question.trim().length < 5) {
      return NextResponse.json({ error: "Please provide a valid question" }, { status: 400 });
    }

    // Fetch all user career data in parallel
    const [highlightsResult, experiencesResult, processesResult, connectionsResult] = await Promise.all([
      supabase
        .from("career_highlights")
        .select("title, company_name, achievement_date, situation, task, action, result, tags, reflection, reflection_tags")
        .eq("user_id", user.id)
        .order("achievement_date", { ascending: false }),
      supabase
        .from("career_experiences")
        .select("company_name, job_title, start_date, end_date, description, skills, is_current")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false }),
      supabase
        .from("recruitment_processes")
        .select(`
          company_name,
          job_title,
          status,
          applied_date,
          process_steps (
            step_type,
            status,
            went_well,
            to_improve,
            output_score,
            output_score_brief
          )
        `)
        .eq("user_id", user.id)
        .order("applied_date", { ascending: false })
        .limit(10),
      supabase
        .from("network_connections")
        .select("name, company, role, relationship_strength, can_help_with")
        .eq("user_id", user.id)
        .limit(20),
    ]);

    const highlights = highlightsResult.data || [];
    const experiences = experiencesResult.data || [];
    const processes = processesResult.data || [];
    const connections = connectionsResult.data || [];

    // Build context sections
    const highlightsContext = highlights.length > 0
      ? highlights.map((h, i) => `
### Achievement ${i + 1}: ${h.title}
- **Company:** ${h.company_name}
- **Date:** ${h.achievement_date || "Not specified"}
- **Situation:** ${h.situation}
- **Task:** ${h.task}
- **Action:** ${h.action}
- **Result:** ${h.result}
- **Skills Demonstrated:** ${h.tags?.join(", ") || "None tagged"}
- **Values Shown:** ${h.reflection_tags?.join(", ") || "None tagged"}
${h.reflection ? `- **Personal Reflection:** ${h.reflection}` : ""}`).join("\n")
      : "No career highlights recorded yet.";

    const experiencesContext = experiences.length > 0
      ? experiences.map(e => `
- **${e.job_title}** at **${e.company_name}** (${e.start_date || "?"} - ${e.is_current ? "Present" : e.end_date || "?"})
  ${e.description ? `Description: ${e.description}` : ""}
  ${e.skills?.length ? `Skills: ${e.skills.join(", ")}` : ""}`).join("\n")
      : "No work experience recorded yet.";

    const processesContext = processes.length > 0
      ? processes.map(p => {
          const outputSteps = p.process_steps?.filter((s: { step_type: string }) => s.step_type === "output") || [];
          const feedback = outputSteps.map((s: { went_well?: string[], to_improve?: string[], output_score?: number }) => {
            const parts = [];
            if (s.went_well?.length) parts.push(`What went well: ${s.went_well.join(", ")}`);
            if (s.to_improve?.length) parts.push(`To improve: ${s.to_improve.join(", ")}`);
            if (s.output_score) parts.push(`Score: ${s.output_score}/100`);
            return parts.join("; ");
          }).filter(Boolean).join(" | ");
          return `- **${p.job_title}** at **${p.company_name}** (Status: ${p.status})${feedback ? ` - Feedback: ${feedback}` : ""}`;
        }).join("\n")
      : "No recruitment processes recorded yet.";

    const networkContext = connections.length > 0
      ? `${connections.length} professional connections across companies like ${[...new Set(connections.map(c => c.company).filter(Boolean))].slice(0, 5).join(", ")}`
      : "No network connections recorded yet.";

    // Aggregate skills and values
    const allSkills = [...new Set(highlights.flatMap(h => h.tags || []))];
    const allValues = [...new Set(highlights.flatMap(h => h.reflection_tags || []))];

    const prompt = `Based on the user's career data below, answer their question thoughtfully and specifically.

## User's Career Data

### Career Highlights (STAR Method Achievements)
${highlightsContext}

### Work Experience
${experiencesContext}

### Recent Interview Activity
${processesContext}

### Professional Network
${networkContext}

### Aggregated Profile
- **Key Skills:** ${allSkills.length > 0 ? allSkills.join(", ") : "Not yet identified"}
- **Core Values:** ${allValues.length > 0 ? allValues.join(", ") : "Not yet identified"}
- **Total Achievements Documented:** ${highlights.length}
- **Career Span:** ${experiences.length} positions

## User's Question
${question}

## Instructions
1. Answer based ONLY on the provided data - do not make up information
2. Reference specific achievements, companies, and skills by name when relevant
3. Be concise but insightful (2-4 paragraphs max)
4. Use markdown formatting for readability (bold for emphasis, bullet points where helpful)
5. If the data is insufficient to fully answer, acknowledge what's missing
6. Frame answers in first person as if helping the user articulate their own story`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a supportive career coach helping a professional reflect on and articulate their career story. You help them understand their strengths, achievements, and value proposition based on their documented career data. Be warm but professional, specific rather than generic.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
    }

    return NextResponse.json({
      answer: responseText.trim(),
      sourcesUsed: {
        highlights: highlights.length,
        experiences: experiences.length,
        processes: processes.length,
        connections: connections.length,
      },
    });
  } catch (error) {
    console.error("Error in career assistant:", error);
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json({ error: "AI service authentication failed" }, { status: 500 });
      }
      if (error.message.includes("rate limit")) {
        return NextResponse.json({ error: "AI service rate limit reached. Please try again later." }, { status: 429 });
      }
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
