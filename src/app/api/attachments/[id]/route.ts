import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to find attachment in all tables
    const tables = ["process_attachments", "step_attachments", "highlight_attachments"];
    let attachment = null;
    let foundTable = null;

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (!error && data) {
        attachment = data;
        foundTable = table;
        break;
      }
    }

    if (!attachment || !foundTable) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // Delete from storage if it has a storage path (not just a link)
    if (attachment.storage_path) {
      const { error: storageError } = await supabase.storage
        .from("process-documents")
        .remove([attachment.storage_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from(foundTable)
      .delete()
      .eq("id", id);

    if (dbError) {
      return NextResponse.json({ error: "Failed to delete attachment" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
