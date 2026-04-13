import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStory } from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limiting
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for") ?? "unknown";
  const { allowed, remaining } = await checkRateLimit(user.id, "/api/story", ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": "0" } }
    );
  }

  const body = await request.json();
  const { disclosureId } = body;

  if (!disclosureId) {
    return NextResponse.json({ error: "Missing disclosureId" }, { status: 400 });
  }

  // Fetch disclosure
  const { data: disclosure, error } = await supabase
    .from("atip_disclosures")
    .select("*")
    .eq("id", disclosureId)
    .single();

  if (error || !disclosure) {
    return NextResponse.json({ error: "Disclosure not found" }, { status: 404 });
  }

  try {
    const { story, questions } = await generateStory(
      disclosure.ai_headline || disclosure.summary.slice(0, 80),
      disclosure.summary,
      disclosure.institution,
      disclosure.atip_number
    );

    // Save story
    const { data: saved } = await supabase
      .from("generated_stories")
      .insert({
        disclosure_id: disclosureId,
        story_text: story,
        questions,
        user_id: user.id,
      })
      .select()
      .single();

    return NextResponse.json(
      { story, questions, id: saved?.id },
      { headers: { "X-RateLimit-Remaining": remaining.toString() } }
    );
  } catch (err: unknown) {
    console.error("Story generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Story generation failed" },
      { status: 500 }
    );
  }
}
