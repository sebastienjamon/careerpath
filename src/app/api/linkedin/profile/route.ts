import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Extract a name from a LinkedIn vanity URL slug
 * e.g., "john-smith-a1b2c3d" → "John Smith"
 * e.g., "connor-haynes" → "Connor Haynes"
 */
function parseLinkedInSlug(slug: string): string {
  // LinkedIn random suffixes contain BOTH letters AND numbers (e.g., -a1b2c3d, -3a4b5c6)
  // Only remove if it looks like a random ID (mix of letters and numbers, 7+ chars)
  const cleanSlug = slug.replace(/-(?=.*\d)(?=.*[a-z])[a-z0-9]{7,}$/i, "");

  // Convert slug to name: "john-smith" → "John Smith"
  const name = cleanSlug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

  return name;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const linkedinUrl = request.nextUrl.searchParams.get("url");

  if (!linkedinUrl) {
    return NextResponse.json(
      { error: "LinkedIn URL is required" },
      { status: 400 }
    );
  }

  // Validate LinkedIn URL format and extract slug
  const linkedinUrlPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/([\w-]+)\/?$/i;
  const match = linkedinUrl.match(linkedinUrlPattern);

  if (!match) {
    return NextResponse.json(
      { error: "Invalid LinkedIn profile URL. Format: linkedin.com/in/username" },
      { status: 400 }
    );
  }

  const slug = match[2];
  const suggestedName = parseLinkedInSlug(slug);

  // Return parsed info from the URL (no external API call)
  return NextResponse.json({
    name: suggestedName,
    headline: null,
    role: null,
    company: null,
    photo_url: null,
    linkedin_url: linkedinUrl,
  });
}
