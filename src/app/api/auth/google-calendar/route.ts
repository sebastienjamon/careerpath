import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/google-calendar";

export async function GET() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "Google Calendar client ID not configured" },
      { status: 500 }
    );
  }

  // Generate a random state for CSRF protection
  const state = Math.random().toString(36).substring(2, 15);

  const authUrl = buildAuthUrl(redirectUri, state);

  // Store state in a cookie for verification
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("google_calendar_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  });

  return response;
}
