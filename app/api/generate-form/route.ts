import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateATIPForm } from "@/lib/pdf-generator";
import { getInstitutionByName } from "@/lib/institutions";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Fetch the request
  const { data: req, error } = await supabase
    .from("proposed_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !req) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (req.status !== "approved") {
    return NextResponse.json({ error: "Request must be approved first" }, { status: 400 });
  }

  // Get user profile for requester info
  const { data: profile } = await supabase.auth.getUser();
  const email = profile.user?.email ?? "";

  const institution = getInstitutionByName(req.institution);
  const institutionCode = req.institution_code || institution?.code || "DEPT";

  const formData = {
    requestId: req.id,
    institution: req.institution,
    institutionCode,
    description: req.description,
    edited_description: req.edited_description,
    date_range: req.date_range || "All available records",
    requesterName: email.split("@")[0].replace(/[._]/g, " "),
    requesterAddress: "[Your Street Address]",
    requesterCity: "[Your City]",
    requesterProvince: "ON",
    requesterPostal: "[A1A 1A1]",
    requesterPhone: "",
    requesterEmail: email,
    requestDate: format(new Date(), "MMMM d, yyyy"),
  };

  try {
    const pdfBytes = await generateATIPForm(formData);

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ATIP-${institutionCode}-${id.slice(0, 8)}.pdf"`,
        "Content-Length": pdfBytes.length.toString(),
      },
    });
  } catch (err: unknown) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF generation failed" },
      { status: 500 }
    );
  }
}
