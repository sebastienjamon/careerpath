import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CoachWithExperience {
  id: string;
  user_id: string;
  specialties: string[];
  hourly_rate: number;
  bio: string | null;
  rating: number | null;
  users: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  career_experiences: Array<{
    company_name: string;
    job_title: string;
    description: string | null;
    skills: string[];
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { processId, stepId } = await request.json();

    if (!processId) {
      return NextResponse.json({ error: "processId is required" }, { status: 400 });
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

    // Fetch step details if stepId provided
    let step = null;
    if (stepId) {
      const { data: stepData } = await supabase
        .from("process_steps")
        .select("*")
        .eq("id", stepId)
        .eq("process_id", processId)
        .single();
      step = stepData;
    }

    // Fetch user's career highlights for context
    const { data: highlights } = await supabase
      .from("career_highlights")
      .select("title, company_name, tags, reflection_tags, result")
      .eq("user_id", user.id)
      .limit(5);

    // Fetch all available coaches with their career experiences
    const { data: coaches, error: coachesError } = await supabase
      .from("coaches")
      .select(`
        id,
        user_id,
        specialties,
        hourly_rate,
        bio,
        rating,
        users (
          full_name,
          avatar_url
        )
      `)
      .eq("availability_status", "available")
      .eq("stripe_onboarding_complete", true)
      .neq("user_id", user.id);

    if (coachesError || !coaches || coaches.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    // Fetch career experiences for each coach
    const coachUserIds = coaches.map(c => c.user_id);
    const { data: allExperiences } = await supabase
      .from("career_experiences")
      .select("user_id, company_name, job_title, description, skills")
      .in("user_id", coachUserIds);

    // Group experiences by user_id
    const experiencesByUser: Record<string, any[]> = {};
    (allExperiences || []).forEach(exp => {
      if (!experiencesByUser[exp.user_id]) {
        experiencesByUser[exp.user_id] = [];
      }
      experiencesByUser[exp.user_id].push(exp);
    });

    // Attach experiences to coaches - cast users properly (Supabase returns single object for FK relationships)
    const coachesWithExperience: CoachWithExperience[] = coaches.map(coach => {
      // Handle the users field which could be an array from Supabase typing
      const usersData = coach.users;
      const userData = Array.isArray(usersData) ? usersData[0] : usersData;

      return {
        id: coach.id,
        user_id: coach.user_id,
        specialties: coach.specialties,
        hourly_rate: coach.hourly_rate,
        bio: coach.bio,
        rating: coach.rating,
        users: userData as { full_name: string | null; avatar_url: string | null } | null,
        career_experiences: experiencesByUser[coach.user_id] || [],
      };
    });

    // Build context for AI analysis
    const stepTypeLabels: Record<string, string> = {
      phone_screen: "Phone Screen",
      technical: "Technical Interview",
      behavioral: "Behavioral Interview",
      onsite: "Onsite Interview",
      offer: "Offer/Negotiation Discussion",
      other: "General Interview",
    };

    const userHighlightsContext = highlights?.map(h =>
      `- "${h.title}" | Skills: ${h.tags?.join(", ") || "none"} | Values: ${h.reflection_tags?.join(", ") || "none"}`
    ).join("\n") || "No career highlights recorded";

    const coachProfiles = coachesWithExperience.map((coach, idx) => {
      const experiences = coach.career_experiences.map(exp =>
        `    - ${exp.job_title} at ${exp.company_name}${exp.skills?.length ? ` (${exp.skills.join(", ")})` : ""}`
      ).join("\n");

      return `
COACH ${idx + 1} (ID: ${coach.id}):
  Name: ${coach.users?.full_name || "Unknown"}
  Specialties: ${coach.specialties?.join(", ") || "None listed"}
  Hourly Rate: $${coach.hourly_rate}
  Rating: ${coach.rating ? `${coach.rating}/5` : "New coach"}
  Bio: ${coach.bio || "No bio"}
  Career Experience:
${experiences || "    No experience listed"}`;
    }).join("\n");

    const prompt = `You are an expert career coach matcher. Analyze the candidate's recruitment opportunity and recommend the best coaches from the available pool.

## RECRUITMENT CONTEXT

**Target Company:** ${process.company_name}
**Target Role:** ${process.job_title}
${process.company_website ? `**Company Website:** ${process.company_website}` : ""}
${step ? `
**Current Interview Stage:** ${stepTypeLabels[step.step_type] || step.step_type}
${step.description ? `**Stage Description:** ${step.description}` : ""}
${step.notes ? `**Stage Notes:** ${step.notes}` : ""}` : ""}

## CANDIDATE'S CAREER HIGHLIGHTS

${userHighlightsContext}

## AVAILABLE COACHES

${coachProfiles}

---

## YOUR TASK

Analyze and rank the top 3 coaches who would be MOST helpful for this candidate. Consider:

1. **Direct Experience Match**: Did the coach work at the same company or direct competitors?
2. **Industry Alignment**: Does the coach have relevant industry experience?
3. **Role Expertise**: Has the coach held similar roles or hired for similar positions?
4. **Specialty Match**: Do their specialties align with ${step ? `a ${stepTypeLabels[step.step_type] || step.step_type}` : "the overall interview process"}?
5. **Skill Gaps**: Based on the candidate's highlights, what skills might need coaching?

For each recommended coach, provide:
- A match score (1-100)
- A brief headline reason (10 words max)
- 2-3 specific reasons why they're a good fit
- What specific value they could provide for this opportunity

Respond in this exact JSON format:
{
  "recommendations": [
    {
      "coach_id": "uuid-here",
      "match_score": 95,
      "headline": "Former Salesforce hiring manager",
      "reasons": [
        "Worked at target company for 5 years",
        "Specialized in technical interviews",
        "Has hired for similar roles"
      ],
      "value_proposition": "Can provide insider perspective on Salesforce's interview culture and what they look for in candidates."
    }
  ]
}

Only include coaches that are genuinely relevant (score > 60). If no coaches are a good match, return empty recommendations array.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are an expert at matching career coaches to job candidates. Be specific and factual in your recommendations. Only recommend coaches who provide genuine value. Return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      return NextResponse.json({ recommendations: [] });
    }

    let aiRecommendations;
    try {
      aiRecommendations = JSON.parse(aiResponse);
    } catch {
      console.error("Failed to parse AI response:", aiResponse);
      return NextResponse.json({ recommendations: [] });
    }

    // Enrich recommendations with full coach data
    const enrichedRecommendations = (aiRecommendations.recommendations || []).map((rec: any) => {
      const coach = coachesWithExperience.find(c => c.id === rec.coach_id);
      if (!coach) return null;

      return {
        ...rec,
        coach: {
          id: coach.id,
          name: coach.users?.full_name || "Unknown",
          avatar_url: coach.users?.avatar_url,
          specialties: coach.specialties,
          hourly_rate: coach.hourly_rate,
          rating: coach.rating,
          bio: coach.bio,
        },
      };
    }).filter(Boolean);

    return NextResponse.json({ recommendations: enrichedRecommendations });
  } catch (error) {
    console.error("Error generating coach recommendations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
