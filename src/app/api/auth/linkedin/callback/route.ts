import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
}

interface LinkedInUserInfo {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
  email: string;
  email_verified: boolean;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const storedState = request.cookies.get("linkedin_oauth_state")?.value;

  // Handle errors from LinkedIn
  if (error) {
    console.error("LinkedIn OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=linkedin_auth_failed&message=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Verify state to prevent CSRF
  if (!state || state !== storedState) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=invalid_state`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=no_code`
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      throw new Error("Failed to exchange code for token");
    }

    const tokenData: LinkedInTokenResponse = await tokenResponse.json();

    // Get user info using the access token
    const userInfoResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error("Failed to fetch user info");
    }

    const userInfo: LinkedInUserInfo = await userInfoResponse.json();

    // Store LinkedIn data in Supabase
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=not_authenticated`
      );
    }

    // Update user with LinkedIn data
    const linkedinData = {
      linkedin_id: userInfo.sub,
      name: userInfo.name,
      given_name: userInfo.given_name,
      family_name: userInfo.family_name,
      picture: userInfo.picture,
      email: userInfo.email,
      email_verified: userInfo.email_verified,
      connected_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("users")
      .update({
        linkedin_profile_url: `https://www.linkedin.com/in/${userInfo.sub}`,
        linkedin_data: linkedinData,
        // Optionally update avatar if not set
        ...(user.user_metadata?.avatar_url ? {} : { avatar_url: userInfo.picture }),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update user:", updateError);
      throw new Error("Failed to save LinkedIn data");
    }

    // Clear the state cookie and redirect to settings with success
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?linkedin=connected`
    );
    response.cookies.delete("linkedin_oauth_state");

    return response;
  } catch (err) {
    console.error("LinkedIn OAuth error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=linkedin_connection_failed`
    );
  }
}
