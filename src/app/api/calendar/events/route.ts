import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchCalendarEvents,
  refreshAccessToken,
  isTokenExpired,
} from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's calendar tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from("google_calendar_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: "Calendar not connected", code: "NOT_CONNECTED" },
        { status: 400 }
      );
    }

    let accessToken = tokenData.access_token;
    const tokenExpiresAt = new Date(tokenData.token_expires_at);

    // Refresh token if expired
    if (isTokenExpired(tokenExpiresAt)) {
      try {
        const newTokens = await refreshAccessToken(tokenData.refresh_token);
        accessToken = newTokens.access_token;

        // Calculate new expiry time
        const newExpiresAt = new Date();
        newExpiresAt.setSeconds(newExpiresAt.getSeconds() + newTokens.expires_in);

        // Update tokens in database
        await supabase
          .from("google_calendar_tokens")
          .update({
            access_token: newTokens.access_token,
            token_expires_at: newExpiresAt.toISOString(),
          })
          .eq("user_id", user.id);
      } catch (refreshError) {
        console.error("Failed to refresh token:", refreshError);
        return NextResponse.json(
          { error: "Calendar connection expired. Please reconnect.", code: "TOKEN_EXPIRED" },
          { status: 401 }
        );
      }
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const timeMin = searchParams.get("timeMin") || undefined;
    const timeMax = searchParams.get("timeMax") || undefined;
    const q = searchParams.get("q") || undefined;
    const maxResults = searchParams.get("maxResults")
      ? parseInt(searchParams.get("maxResults")!)
      : undefined;

    // Fetch events from Google Calendar
    const events = await fetchCalendarEvents(accessToken, {
      timeMin,
      timeMax,
      q,
      maxResults,
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Calendar events error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}
