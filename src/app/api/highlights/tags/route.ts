import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TagRequest {
  situation: string;
  task: string;
  action: string;
  result: string;
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

    const body: TagRequest = await request.json();
    const { situation, task, action, result } = body;

    if (!situation || !task || !action || !result) {
      return NextResponse.json({ error: "All STAR fields are required" }, { status: 400 });
    }

    // Fetch user's existing categories
    const { data: existingCategories } = await supabase
      .from("user_highlight_categories")
      .select("name")
      .eq("user_id", user.id);

    const categoryList = existingCategories?.map(c => c.name) || [];

    const prompt = `Analyze this career achievement and assign 1-3 category tags.

## Achievement (STAR Format):

**Situation:** ${situation}

**Task:** ${task}

**Action:** ${action}

**Result:** ${result}

## Instructions:
1. Assign 1-3 tags that best categorize this achievement
2. Tags should be broad professional categories
3. ${categoryList.length > 0
  ? `The user has these existing categories: ${categoryList.join(", ")}. Prefer using these when they fit well.`
  : "Suggest appropriate new categories."}
4. Good category examples: Leadership, Technical Excellence, Revenue Impact, Problem Solving, Team Building, Process Improvement, Customer Success, Innovation, Cost Reduction, Strategic Planning

Return ONLY valid JSON in this exact format:
{
  "tags": ["Tag1", "Tag2"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a career coach specializing in categorizing professional achievements. Return only valid JSON with no additional text or markdown formatting.",
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

    // Add new categories to user's category list
    const newCategories = tags.filter(tag => !categoryList.includes(tag));
    if (newCategories.length > 0) {
      await supabase
        .from("user_highlight_categories")
        .upsert(
          newCategories.map(name => ({ user_id: user.id, name })),
          { onConflict: "user_id,name" }
        );
    }

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error generating tags:", error);
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
