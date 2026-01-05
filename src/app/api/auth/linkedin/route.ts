import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "LinkedIn client ID not configured" },
      { status: 500 }
    );
  }

  // LinkedIn OAuth 2.0 scopes for OpenID Connect
  const scope = encodeURIComponent("openid profile email");

  // Generate a random state for CSRF protection
  const state = Math.random().toString(36).substring(2, 15);

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;

  // Store state in a cookie for verification
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("linkedin_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  });

  return response;
}
