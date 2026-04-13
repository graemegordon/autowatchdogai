import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.status) updates.status = body.status;
  if (body.edited_description !== undefined) {
    updates.edited_description = body.edited_description;
  }
  if (body.status && ["approved", "rejected", "archived"].includes(body.status)) {
    updates.reviewed_at = new Date().toISOString();
    updates.reviewed_by = user.id;
  }

  const { data, error } = await supabase
    .from("proposed_requests")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // If approved, create a submitted_requests record
  if (body.status === "approved") {
    await supabase.from("submitted_requests").upsert(
      {
        proposed_request_id: id,
        institution: data.institution,
        description: data.edited_description || data.description,
        status: "approved",
        user_id: user.id,
      },
      { onConflict: "proposed_request_id" }
    );
  }

  return NextResponse.json({ data });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("proposed_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}
