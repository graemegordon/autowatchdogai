import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";
import { INSTITUTIONS, getInstitutionByName, getInstitutionFullAddress } from "./institutions";

export interface ATIPFormData {
  requestId: string;
  institution: string;
  institutionCode: string;
  description: string;
  dateRange: string;
  requesterName: string;
  requesterAddress: string;
  requesterCity: string;
  requesterProvince: string;
  requesterPostal: string;
  requesterPhone?: string;
  requesterEmail?: string;
  requestDate: string;
}

const RED = rgb(0.8, 0, 0);
const BLACK = rgb(0, 0, 0);
const DARK_GRAY = rgb(0.2, 0.2, 0.2);
const LIGHT_GRAY = rgb(0.95, 0.95, 0.95);
const MID_GRAY = rgb(0.6, 0.6, 0.6);
const WHITE = rgb(1, 1, 1);
const BORDER = rgb(0.7, 0.7, 0.7);

function drawBox(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  fill = WHITE,
  stroke = BORDER
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: fill,
    borderColor: stroke,
    borderWidth: 0.5,
  });
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = BLACK
) {
  page.drawText(text, { x, y, size, font, color });
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  lineHeight: number,
  color = BLACK
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, size);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size, font, color });
      currentY -= lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) {
    page.drawText(line, { x, y: currentY, size, font, color });
    currentY -= lineHeight;
  }
  return currentY;
}

export async function generateATIPForm(data: ATIPFormData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // PAGE 1: TBS 350-57 ATIP Request Form
  const page1 = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page1.getSize();
  const margin = 45;
  const contentWidth = width - margin * 2;

  // === HEADER ===
  // Canada wordmark area
  drawBox(page1, margin, height - 70, contentWidth, 55, LIGHT_GRAY);
  drawText(page1, "Canada", margin + 10, height - 28, helveticaBold, 22, RED);
  drawText(
    page1,
    "Government of Canada / Gouvernement du Canada",
    margin + 10,
    height - 48,
    helvetica,
    8,
    DARK_GRAY
  );
  drawText(
    page1,
    "TBS/SCT 350-57E",
    width - margin - 90,
    height - 35,
    helveticaBold,
    9,
    DARK_GRAY
  );
  drawText(
    page1,
    "Rev. 2023-01",
    width - margin - 90,
    height - 48,
    helvetica,
    8,
    MID_GRAY
  );

  // Form title
  drawBox(page1, margin, height - 105, contentWidth, 32, RED);
  drawText(
    page1,
    "ACCESS TO INFORMATION REQUEST / DEMANDE D'ACCÈS À L'INFORMATION",
    margin + 10,
    height - 87,
    helveticaBold,
    9.5,
    WHITE
  );
  drawText(
    page1,
    "Access to Information Act / Loi sur l'accès à l'information",
    margin + 10,
    height - 100,
    helvetica,
    8,
    WHITE
  );

  // === SECTION 1: INSTITUTION ===
  let y = height - 130;
  drawBox(page1, margin, y - 18, contentWidth, 18, rgb(0.85, 0.85, 0.85));
  drawText(page1, "SECTION 1 — FEDERAL INSTITUTION / INSTITUTION FÉDÉRALE", margin + 5, y - 12, helveticaBold, 8.5, DARK_GRAY);

  y -= 20;
  drawBox(page1, margin, y - 35, contentWidth, 35, WHITE);
  drawText(page1, "Name of federal institution / Nom de l'institution fédérale:", margin + 5, y - 12, helvetica, 7.5, MID_GRAY);

  const institution =
    getInstitutionByName(data.institution) ||
    Object.values(INSTITUTIONS)[0];
  drawText(page1, institution.name, margin + 8, y - 27, helveticaBold, 10, BLACK);

  // === SECTION 2: APPLICANT INFO ===
  y -= 40;
  drawBox(page1, margin, y - 18, contentWidth, 18, rgb(0.85, 0.85, 0.85));
  drawText(page1, "SECTION 2 — APPLICANT INFORMATION / RENSEIGNEMENTS SUR LE DEMANDEUR", margin + 5, y - 12, helveticaBold, 8.5, DARK_GRAY);

  y -= 22;
  // Name field
  const halfW = contentWidth / 2 - 3;
  drawBox(page1, margin, y - 32, halfW, 32, WHITE);
  drawText(page1, "Last name / Nom de famille:", margin + 5, y - 11, helvetica, 7, MID_GRAY);
  const [lastName, ...firstParts] = data.requesterName.split(" ");
  const firstName = firstParts.join(" ");
  drawText(page1, lastName || data.requesterName, margin + 5, y - 25, helveticaBold, 9.5, BLACK);

  drawBox(page1, margin + halfW + 6, y - 32, halfW, 32, WHITE);
  drawText(page1, "First name / Prénom:", margin + halfW + 11, y - 11, helvetica, 7, MID_GRAY);
  drawText(page1, firstName || "", margin + halfW + 11, y - 25, helveticaBold, 9.5, BLACK);

  y -= 36;
  // Address
  drawBox(page1, margin, y - 32, contentWidth, 32, WHITE);
  drawText(page1, "Mailing address / Adresse postale:", margin + 5, y - 11, helvetica, 7, MID_GRAY);
  drawText(page1, data.requesterAddress, margin + 5, y - 25, helveticaBold, 9.5, BLACK);

  y -= 36;
  // City/Prov/Postal
  const thirdW = contentWidth / 3 - 4;
  drawBox(page1, margin, y - 32, thirdW + 20, 32, WHITE);
  drawText(page1, "City / Ville:", margin + 5, y - 11, helvetica, 7, MID_GRAY);
  drawText(page1, data.requesterCity, margin + 5, y - 25, helveticaBold, 9.5, BLACK);

  drawBox(page1, margin + thirdW + 24, y - 32, 60, 32, WHITE);
  drawText(page1, "Prov/Terr:", margin + thirdW + 29, y - 11, helvetica, 7, MID_GRAY);
  drawText(page1, data.requesterProvince, margin + thirdW + 29, y - 25, helveticaBold, 9.5, BLACK);

  drawBox(page1, margin + thirdW + 88, y - 32, 90, 32, WHITE);
  drawText(page1, "Postal code / Code postal:", margin + thirdW + 93, y - 11, helvetica, 7, MID_GRAY);
  drawText(page1, data.requesterPostal, margin + thirdW + 93, y - 25, helveticaBold, 9.5, BLACK);

  drawBox(page1, margin + thirdW + 182, y - 32, contentWidth - thirdW - 182, 32, WHITE);
  drawText(page1, "Phone / Téléphone:", margin + thirdW + 187, y - 11, helvetica, 7, MID_GRAY);
  if (data.requesterPhone) {
    drawText(page1, data.requesterPhone, margin + thirdW + 187, y - 25, helveticaBold, 9.5, BLACK);
  }

  y -= 36;
  drawBox(page1, margin, y - 32, contentWidth, 32, WHITE);
  drawText(page1, "Email address / Adresse courriel:", margin + 5, y - 11, helvetica, 7, MID_GRAY);
  if (data.requesterEmail) {
    drawText(page1, data.requesterEmail, margin + 5, y - 25, helveticaBold, 9.5, BLACK);
  }

  // === SECTION 3: DESCRIPTION OF RECORDS ===
  y -= 40;
  drawBox(page1, margin, y - 18, contentWidth, 18, rgb(0.85, 0.85, 0.85));
  drawText(page1, "SECTION 3 — DESCRIPTION OF RECORDS SOUGHT / DESCRIPTION DES DOCUMENTS DEMANDÉS", margin + 5, y - 12, helveticaBold, 8.5, DARK_GRAY);

  y -= 22;
  drawBox(page1, margin, y - 130, contentWidth, 130, WHITE);
  drawText(page1, "Please describe the records you are requesting (be as specific as possible):", margin + 5, y - 12, helvetica, 7.5, MID_GRAY);

  const description = data.edited_description || data.description;
  drawWrappedText(
    page1,
    description,
    margin + 5,
    y - 26,
    contentWidth - 12,
    helvetica,
    9,
    13,
    BLACK
  );

  y -= 135;
  // Date range
  drawBox(page1, margin, y - 32, contentWidth, 32, WHITE);
  drawText(page1, "Date range of records sought / Période visée par la demande:", margin + 5, y - 11, helvetica, 7, MID_GRAY);
  drawText(page1, data.dateRange, margin + 5, y - 25, helveticaBold, 9.5, BLACK);

  // === SECTION 4: FORMAT ===
  y -= 40;
  drawBox(page1, margin, y - 18, contentWidth, 18, rgb(0.85, 0.85, 0.85));
  drawText(page1, "SECTION 4 — FORMAT / FORMAT", margin + 5, y - 12, helveticaBold, 8.5, DARK_GRAY);

  y -= 22;
  drawBox(page1, margin, y - 32, contentWidth, 32, WHITE);
  drawText(page1, "Preferred format / Format préféré:", margin + 5, y - 11, helvetica, 7, MID_GRAY);

  // Checkboxes
  page1.drawRectangle({ x: margin + 8, y: y - 27, width: 10, height: 10, borderColor: BORDER, borderWidth: 1 });
  page1.drawText("✓", { x: margin + 9, y: y - 26, size: 9, font: helveticaBold, color: BLACK });
  drawText(page1, "Paper copies by mail / Copies papier par courrier", margin + 22, y - 24, helvetica, 9, BLACK);

  page1.drawRectangle({ x: margin + 210, y: y - 27, width: 10, height: 10, borderColor: BORDER, borderWidth: 1 });
  drawText(page1, "Electronic format / Format électronique", margin + 224, y - 24, helvetica, 9, BLACK);

  // === SECTION 5: APPLICATION FEE ===
  y -= 40;
  drawBox(page1, margin, y - 18, contentWidth, 18, rgb(0.85, 0.85, 0.85));
  drawText(page1, "SECTION 5 — APPLICATION FEE / FRAIS DE DEMANDE", margin + 5, y - 12, helveticaBold, 8.5, DARK_GRAY);

  y -= 22;
  drawBox(page1, margin, y - 55, contentWidth, 55, rgb(1.0, 0.98, 0.92));
  drawText(page1, "Application fee: $5.00 (mandatory)", margin + 5, y - 15, helveticaBold, 9, BLACK);
  drawText(page1, "Enclose a cheque or money order payable to the Receiver General for Canada.", margin + 5, y - 28, helvetica, 8.5, BLACK);
  drawText(page1, "Do not send cash. / N'envoyez pas d'argent comptant.", margin + 5, y - 40, helveticaOblique, 8, DARK_GRAY);
  drawText(page1, "Amount enclosed / Montant ci-joint: $5.00", margin + 5, y - 52, helveticaBold, 9, RED);

  // === SECTION 6: SIGNATURE ===
  y -= 70;
  drawBox(page1, margin, y - 18, contentWidth, 18, rgb(0.85, 0.85, 0.85));
  drawText(page1, "SECTION 6 — SIGNATURE AND DATE / SIGNATURE ET DATE", margin + 5, y - 12, helveticaBold, 8.5, DARK_GRAY);

  y -= 22;
  drawBox(page1, margin, y - 50, contentWidth * 0.65, 50, WHITE);
  drawText(page1, "Signature of applicant / Signature du demandeur:", margin + 5, y - 12, helvetica, 7, MID_GRAY);
  // Signature line
  page1.drawLine({
    start: { x: margin + 5, y: y - 38 },
    end: { x: margin + contentWidth * 0.65 - 10, y: y - 38 },
    thickness: 0.5,
    color: BORDER,
  });

  drawBox(page1, margin + contentWidth * 0.65 + 5, y - 50, contentWidth * 0.35 - 5, 50, WHITE);
  drawText(page1, "Date:", margin + contentWidth * 0.65 + 10, y - 12, helvetica, 7, MID_GRAY);
  drawText(page1, data.requestDate, margin + contentWidth * 0.65 + 10, y - 28, helveticaBold, 10, BLACK);

  // Footer
  y -= 60;
  drawBox(page1, margin, y - 35, contentWidth, 35, LIGHT_GRAY);
  drawText(page1, "Mail this completed form with your $5.00 fee to:", margin + 5, y - 12, helveticaBold, 8, DARK_GRAY);
  const instAddress = getInstitutionFullAddress(institution);
  const addressLines = instAddress.split("\n");
  drawText(page1, `${institution.name}, ${addressLines[0]}`, margin + 5, y - 24, helvetica, 8, BLACK);
  if (addressLines[1]) {
    drawText(page1, addressLines[1], margin + 5, y - 34, helvetica, 8, BLACK);
  }

  // Page number
  drawText(page1, "Page 1 of 2", width / 2 - 25, 20, helvetica, 8, MID_GRAY);

  // === PAGE 2: INSTRUCTION SHEET ===
  const page2 = pdfDoc.addPage([612, 792]);

  // Header
  drawBox(page2, margin, height - 70, contentWidth, 55, LIGHT_GRAY);
  drawText(page2, "Canada", margin + 10, height - 28, helveticaBold, 22, RED);
  drawText(page2, "ACCESS TO INFORMATION REQUEST — FILING INSTRUCTIONS", margin + 10, height - 50, helveticaBold, 11, DARK_GRAY);

  let iy = height - 95;

  drawText(page2, "HOW TO FILE YOUR ATIP REQUEST", margin, iy, helveticaBold, 13, RED);
  iy -= 20;

  const steps = [
    {
      num: "1",
      title: "Complete the form",
      body: "Fill in all fields on page 1. Be as specific as possible in your description of records — vague requests may result in delays or missed documents.",
    },
    {
      num: "2",
      title: "Sign the form",
      body: "Sign and date the form in Section 6. Unsigned requests will be returned.",
    },
    {
      num: "3",
      title: "Prepare your $5.00 fee",
      body: `Write a cheque or money order for exactly $5.00 payable to:\n"Receiver General for Canada"\nDo NOT send cash. Personal cheques are accepted.`,
    },
    {
      num: "4",
      title: "Mail to the institution",
      body: `Address your envelope to:\n${institution.name}\nATIP Coordinator\n${instAddress}${institution.phone ? `\n\nPhone: ${institution.phone}` : ""}`,
    },
    {
      num: "5",
      title: "Track your request",
      body: "Keep a copy of this form. The institution must acknowledge your request within 30 days. Response time is up to 30 days (extensions possible). If you do not receive a response within 30 days, you can file a complaint with the Office of the Information Commissioner at 1-800-267-0441.",
    },
  ];

  for (const step of steps) {
    drawBox(page2, margin, iy - 10, 22, 22, RED);
    drawText(page2, step.num, margin + 7, iy - 2, helveticaBold, 12, WHITE);
    drawText(page2, step.title, margin + 28, iy - 2, helveticaBold, 11, BLACK);
    iy -= 16;
    iy = drawWrappedText(page2, step.body, margin + 28, iy, contentWidth - 32, helvetica, 9, 13, DARK_GRAY);
    iy -= 14;
  }

  // Tips box
  iy -= 5;
  drawBox(page2, margin, iy - 90, contentWidth, 90, rgb(0.93, 0.97, 1.0), rgb(0.4, 0.6, 0.9));
  drawText(page2, "PRO TIPS FOR JOURNALISTS", margin + 8, iy - 14, helveticaBold, 9.5, rgb(0.1, 0.2, 0.6));
  const tips = [
    "• Request records in electronic format when possible — faster and free to reproduce.",
    "• Narrow your date range to get faster responses. Broad requests invite broad extensions.",
    "• Ask for emails, memos, briefing notes, and contracts separately if targeting multiple formats.",
    "• Cite the specific policy/program if known — e.g. 'relating to Contract #2023-TC-0042'.",
    "• Follow up at 30 days if you receive no acknowledgement.",
  ];
  let tipY = iy - 28;
  for (const tip of tips) {
    drawText(page2, tip, margin + 8, tipY, helvetica, 8.5, DARK_GRAY);
    tipY -= 12;
  }

  // Confirmation details box
  iy -= 100;
  drawBox(page2, margin, iy - 65, contentWidth, 65, LIGHT_GRAY);
  drawText(page2, "REQUEST SUMMARY (keep for your records)", margin + 8, iy - 14, helveticaBold, 9, DARK_GRAY);
  drawText(page2, `Institution: ${institution.name}`, margin + 8, iy - 28, helvetica, 9, BLACK);
  drawText(page2, `Date filed: ${data.requestDate}`, margin + 8, iy - 40, helvetica, 9, BLACK);
  drawText(page2, `Request ID: ${data.requestId}`, margin + 8, iy - 52, helvetica, 9, BLACK);
  drawText(page2, `Fee enclosed: $5.00`, margin + contentWidth / 2, iy - 28, helvetica, 9, BLACK);

  // Legal notice
  iy -= 75;
  drawWrappedText(
    page2,
    "The personal information collected on this form is used to process your request under the Access to Information Act (R.S.C. 1985, c. A-1). It is protected under the Privacy Act. Questions about this collection can be directed to the institution's ATIP Coordinator.",
    margin,
    iy,
    contentWidth,
    helveticaOblique,
    7.5,
    11,
    MID_GRAY
  );

  drawText(page2, "Page 2 of 2", width / 2 - 25, 20, helvetica, 8, MID_GRAY);

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
