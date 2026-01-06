import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Prevent static generation - this route uses pdf-parse which requires runtime
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ParsedExperience {
  company_name: string;
  company_website: string | null;
  job_title: string;
  start_date: string; // YYYY-MM format
  end_date: string | null; // YYYY-MM format or null if current
  is_current: boolean;
  description: string | null;
  location: string | null;
}

interface ParsedProfile {
  name: string | null;
  headline: string | null;
  location: string | null;
  skills: string[];
  experiences: ParsedExperience[];
}

export async function POST(request: NextRequest) {
  try {
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not configured");
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.includes("pdf")) {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    // Convert file to buffer and extract text
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from PDF using pdf2json (pure JS, serverless-compatible)
    let pdfText: string;
    try {
      const PDFParser = (await import("pdf2json")).default;

      pdfText = await new Promise((resolve, reject) => {
        const pdfParser = new PDFParser();

        pdfParser.on("pdfParser_dataReady", (pdfData: { Pages: Array<{ Texts: Array<{ R: Array<{ T: string }> }> }> }) => {
          // Extract text from all pages
          const text = pdfData.Pages.map(page =>
            page.Texts.map(textItem =>
              textItem.R.map(r => decodeURIComponent(r.T)).join("")
            ).join(" ")
          ).join("\n");
          resolve(text);
        });

        pdfParser.on("pdfParser_dataError", (error: Error) => {
          reject(error);
        });

        pdfParser.parseBuffer(buffer);
      });
    } catch (pdfError) {
      console.error("PDF parsing error:", pdfError);
      return NextResponse.json({ error: "Failed to read PDF file. Please ensure it's a valid PDF." }, { status: 400 });
    }

    if (!pdfText || pdfText.trim().length < 50) {
      return NextResponse.json({ error: "Could not extract text from PDF" }, { status: 400 });
    }

    // Use OpenAI to parse the extracted text
    const prompt = `Parse this LinkedIn profile PDF export and extract work experiences into structured JSON.

## PDF Content:
${pdfText}

## Instructions:
Extract all work experiences from the "Experience" section. For each experience, extract:
- company_name: The company name
- company_website: Infer the company website domain (e.g., "salesforce.com" for Salesforce, "microsoft.com" for Microsoft). Use lowercase. Return null if unknown.
- job_title: The job title/position
- start_date: Start date in YYYY-MM format (e.g., "2024-02" for February 2024)
- end_date: End date in YYYY-MM format, or null if "Present" or current
- is_current: true if this is the current job (end date is "Present")
- description: The role description if provided, or null
- location: The location if provided, or null

Also extract:
- name: The person's full name
- headline: Their headline/title (e.g., "Director, Salesforce AI")
- location: Their general location
- skills: Array of their top skills

## Important:
- LinkedIn groups multiple roles at the same company together. Extract each role as a separate experience.
- Dates are formatted like "February 2024 - Present" or "August 2009 - January 2014"
- Convert month names to numbers (January=01, February=02, etc.)

Return ONLY valid JSON in this exact format:
{
  "name": "string or null",
  "headline": "string or null",
  "location": "string or null",
  "skills": ["string"],
  "experiences": [
    {
      "company_name": "string",
      "company_website": "string or null",
      "job_title": "string",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM or null",
      "is_current": boolean,
      "description": "string or null",
      "location": "string or null"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a precise data extraction assistant. Extract structured data from LinkedIn PDF exports. Return only valid JSON with no additional text or markdown formatting.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.1, // Low temperature for consistent extraction
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      return NextResponse.json({ error: "Failed to parse PDF content" }, { status: 500 });
    }

    // Clean up the response - remove markdown code blocks if present
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

    // Parse the JSON response
    let parsed: ParsedProfile;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("Failed to parse JSON response:", jsonText);
      return NextResponse.json({ error: "Failed to parse extracted data" }, { status: 500 });
    }

    // Validate the response has experiences
    if (!parsed.experiences || !Array.isArray(parsed.experiences)) {
      return NextResponse.json({ error: "No experiences found in PDF" }, { status: 400 });
    }

    return NextResponse.json({
      profile: {
        name: parsed.name,
        headline: parsed.headline,
        location: parsed.location,
        skills: parsed.skills || [],
      },
      experiences: parsed.experiences,
    });
  } catch (error) {
    console.error("Error parsing LinkedIn PDF:", error);
    // Provide more specific error messages
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
