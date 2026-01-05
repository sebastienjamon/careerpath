import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revokeToken } from "@/lib/google-calendar";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's calendar tokens to revoke
    const { data: tokenData } = await supabase
      .from("google_calendar_tokens")
      .select("access_token")
      .eq("user_id", user.id)
      .single();

    // Try to revoke token with Google (don't fail if this doesn't work)
    if (tokenData?.access_token) {
      try {
        await revokeToken(tokenData.access_token);
      } catch (revokeError) {
        console.error("Failed to revoke token with Google:", revokeError);
        // Continue anyway - we'll still remove from our database
      }
    }

    // Delete tokens from database
    const { error: deleteError } = await supabase
      .from("google_calendar_tokens")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Failed to delete calendar tokens:", deleteError);
      return NextResponse.json(
        { error: "Failed to disconnect calendar" },
        { status: 500 }
      );
    }

    // Clear any linked calendar events from process steps
    await supabase
      .from("process_steps")
      .update({
        google_calendar_event_id: null,
        google_calendar_event_summary: null,
      })
      .eq("process_id", supabase.rpc("get_user_process_ids", { uid: user.id }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Disconnect calendar error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect calendar" },
      { status: 500 }
    );
  }
}
