import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateATIRequests } from "@/lib/claude";
import { Resend } from "resend";
import Papa from "papaparse";

const CANADA_ATI_CSV =
  "https://open.canada.ca/data/en/datastore/dump/0797e893-751e-4695-8229-a5066e4fe7a3?format=csv";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}

async function handler(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (
    cronSecret &&
    authHeader !== `Bearer ${cronSecret}` &&
    authHeader !== "Bearer manual"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Download CSV
    const csvResponse = await fetch(CANADA_ATI_CSV, {
      headers: { "User-Agent": "ATIPRequestGenerator/1.0 (investigative journalism tool)" },
      signal: AbortSignal.timeout(30000),
    });

    if (!csvResponse.ok) {
      throw new Error(`Failed to download CSV: ${csvResponse.status}`);
    }

    const csvText = await csvResponse.text();

    // Parse CSV — take a sample of recent rows for context
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    const rows = parsed.data as Record<string, string>[];

    // Take the most recent 200 rows (the CSV is sorted by date desc)
    const sample = rows.slice(0, 200);

    // Format for Claude
    const formattedSample = sample
      .map((row, i) => {
        const institution =
          row["org_name_en"] || row["institution"] || row["org_id"] || "Unknown";
        const summary =
          row["summary_en"] || row["english_summary"] || row["summary"] || "";
        const completed =
          row["udate"] || row["date"] || row["year"] || "";
        const pages = row["pages"] || "";
        return `${i + 1}. [${institution}] ${summary} (Completed: ${completed}${pages ? `, Pages: ${pages}` : ""})`;
      })
      .join("\n");

    // Call Claude
    const aiRequests = await generateATIRequests(formattedSample);

    // Save to Supabase
    const supabase = await createServiceClient();

    const inserts = aiRequests.map((req) => ({
      institution: req.institution,
      institution_code: req.institution_code,
      description: req.description,
      date_range: req.date_range,
      ai_reasoning: req.reasoning,
      source_type: "csv",
      status: "pending",
      batch_date: new Date().toISOString().split("T")[0],
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("proposed_requests")
      .insert(inserts)
      .select();

    if (insertError) throw insertError;

    // Send email notification
    if (process.env.RESEND_API_KEY && process.env.NOTIFICATION_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "ATIP Generator <noreply@atipgenerator.ca>",
        to: process.env.NOTIFICATION_EMAIL,
        subject: `[ATIP] New batch: ${inserted?.length ?? 0} proposals generated`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #CC0000; padding: 16px 24px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 18px;">New ATIP Proposals Ready</h1>
            </div>
            <div style="background: #f9f9f9; border: 1px solid #e2e2e2; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
              <p>Your daily ATIP batch has been generated.</p>
              <ul>
                ${(inserted ?? [])
                  .map((r) => `<li><strong>${r.institution}</strong>: ${(r.description ?? "").slice(0, 100)}…</li>`)
                  .join("")}
              </ul>
              <p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
                   style="background: #CC0000; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">
                  Review proposals →
                </a>
              </p>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({
      success: true,
      count: inserted?.length ?? 0,
      requests: inserted,
    });
  } catch (error: unknown) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
