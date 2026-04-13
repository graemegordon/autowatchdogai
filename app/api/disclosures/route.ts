import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateHeadline } from "@/lib/claude";
import Papa from "papaparse";

const COMPLETED_ATIP_CSV =
  "https://open.canada.ca/data/en/datastore/dump/0797e893-751e-4695-8229-a5066e4fe7a3?format=csv";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh") === "true";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  // Check if we have fresh data (cached within 12h)
  const serviceClient = await createServiceClient();
  const { count } = await serviceClient
    .from("atip_disclosures")
    .select("*", { count: "exact", head: true })
    .gte("cached_at", new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString());

  if (!refresh && (count ?? 0) > 0) {
    // Return cached data
    const { data, error, count: total } = await serviceClient
      .from("atip_disclosures")
      .select("*", { count: "exact" })
      .order("released_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data, total, page, cached: true });
  }

  // Fetch fresh data
  try {
    const csvResponse = await fetch(COMPLETED_ATIP_CSV, {
      signal: AbortSignal.timeout(30000),
    });
    if (!csvResponse.ok) throw new Error("Failed to fetch CSV");

    const csvText = await csvResponse.text();
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const rows = parsed.data as Record<string, string>[];

    // Process and upsert disclosures (latest 100)
    const recent = rows.slice(0, 100);
    const toUpsert = [];

    for (const row of recent) {
      const atipNumber =
        row["request_number"] || row["atip_number"] || row["number"] || "";
      const institution =
        row["org_name_en"] || row["institution"] || row["org_id"] || "";
      const summary =
        row["summary_en"] || row["english_summary"] || row["summary"] || "";
      const url =
        row["record_url"] || row["url"] || row["link"] || "";
      const releasedDate =
        row["udate"] || row["date"] || row["year"] || "";
      const pages = parseInt(row["pages"] || "0") || 0;

      if (!summary || !institution) continue;

      toUpsert.push({
        atip_number: atipNumber || `GEN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        institution,
        institution_code: row["org_id"] || "",
        summary: summary.slice(0, 2000),
        url,
        pages,
        released_date: releasedDate ? releasedDate.slice(0, 10) : null,
        cached_at: new Date().toISOString(),
      });
    }

    if (toUpsert.length > 0) {
      await serviceClient
        .from("atip_disclosures")
        .upsert(toUpsert, { onConflict: "atip_number", ignoreDuplicates: false });
    }

    // Generate headlines for any rows missing them (batch, non-blocking)
    const { data: noHeadlines } = await serviceClient
      .from("atip_disclosures")
      .select("id, summary, institution")
      .is("ai_headline", null)
      .limit(10);

    if (noHeadlines && noHeadlines.length > 0) {
      // Fire-and-forget headline generation
      Promise.allSettled(
        noHeadlines.map(async (d) => {
          const headline = await generateHeadline(d.summary, d.institution);
          await serviceClient
            .from("atip_disclosures")
            .update({ ai_headline: headline })
            .eq("id", d.id);
        })
      ).catch(console.error);
    }

    // Return data
    const { data, count: total } = await serviceClient
      .from("atip_disclosures")
      .select("*", { count: "exact" })
      .order("released_date", { ascending: false })
      .range(offset, offset + limit - 1);

    return NextResponse.json({ data, total, page, cached: false });
  } catch (err: unknown) {
    console.error("Disclosures error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch disclosures" },
      { status: 500 }
    );
  }
}
