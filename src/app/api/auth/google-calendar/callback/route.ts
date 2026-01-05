import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const storedState = request.cookies.get("google_calendar_oauth_state")?.value;

  // Handle errors from Google
  if (error) {
    console.error("Google Calendar OAuth error:", error, errorDescription);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=calendar_auth_failed&message=${encodeURIComponent(errorDescription || error)}`
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
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`;

    // Exchange code for tokens
    const tokenData = await exchangeCodeForTokens(code, redirectUri);

    // Get current user from Supabase
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/login?error=not_authenticated`
      );
    }

    // Calculate token expiry time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    // Store tokens in database (upsert to handle reconnection)
    const { error: upsertError } = await supabase
      .from("google_calendar_tokens")
      .upsert(
        {
          user_id: user.id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || "",
          token_expires_at: expiresAt.toISOString(),
          scope: tokenData.scope,
        },
        {
          onConflict: "user_id",
        }
      );

    if (upsertError) {
      console.error("Failed to store calendar tokens:", upsertError);
      throw new Error("Failed to save calendar connection");
    }

    // Clear the state cookie and redirect to settings with success
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?calendar=connected`
    );
    response.cookies.delete("google_calendar_oauth_state");

    return response;
  } catch (err) {
    console.error("Google Calendar OAuth error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=calendar_connection_failed`
    );
  }
}
