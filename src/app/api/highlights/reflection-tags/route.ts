import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ReflectionTagRequest {
  reflection: string;
  title?: string;
  result?: string;
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

    const body: ReflectionTagRequest = await request.json();
    const { reflection, title, result } = body;

    if (!reflection || reflection.trim().length < 10) {
      return NextResponse.json({ error: "Please provide a meaningful reflection (at least 10 characters)" }, { status: 400 });
    }

    const prompt = `Analyze this career achievement reflection and identify the personal values, traits, and soft skills it demonstrates.

## Achievement Context:
${title ? `**Title:** ${title}` : ""}
${result ? `**Result:** ${result}` : ""}

## User's Reflection (why this matters and what it demonstrates):
${reflection}

## Instructions:
1. Identify 1-3 core values or personal traits this achievement demonstrates
2. Focus on soft skills and character qualities, NOT technical skills
3. Choose from qualities like:
   - Integrity (honesty, ethics, doing the right thing)
   - Collaboration (teamwork, partnership, building consensus)
   - Resilience (overcoming obstacles, perseverance, grit)
   - Adaptability (flexibility, learning, pivoting)
   - Initiative (proactivity, self-starting, ownership)
   - Accountability (responsibility, reliability, follow-through)
   - Empathy (understanding others, emotional intelligence)
   - Intellectual Curiosity (learning, questioning, growth mindset)
   - Strategic Thinking (big picture, planning, vision)
   - Communication (clarity, persuasion, influence)
   - Creativity (innovation, problem-solving, thinking differently)
   - Courage (taking risks, speaking up, challenging status quo)

Return ONLY valid JSON in this exact format:
{
  "tags": ["Value1", "Value2"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a career coach analyzing professional achievements to identify the personal values and character traits they demonstrate. Focus on soft skills and human qualities, not technical abilities. Return only valid JSON with no additional text or markdown formatting.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      return NextResponse.json({ error: "Failed to generate tags" }, { status: 500 });
    }

    // Clean up response
    let jsonText = responseText.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.slice(7);
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.slice(3);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.slice(0, -3);
    }
    jsonText = jsonText.trim();

    let parsed: { tags: string[] };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("Failed to parse JSON response:", jsonText);
      return NextResponse.json({ error: "Failed to parse tags" }, { status: 500 });
    }

    if (!parsed.tags || !Array.isArray(parsed.tags)) {
      return NextResponse.json({ error: "Invalid tags response" }, { status: 500 });
    }

    // Limit to 3 tags
    const tags = parsed.tags.slice(0, 3);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error generating reflection tags:", error);
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
