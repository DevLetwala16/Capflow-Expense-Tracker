import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface PDFInstallment {
  number: number;
  dueDate: string;
  status: "paid" | "pending" | "overdue";
}

export interface StatementPDFData {
  emiName: string;
  monthlyCost: number;
  totalCost: number;
  dueDay: number;
  startDate: string;
  totalInstallments: number;
  paidInstallments: number;
  recipientName: string;
  recipientEmail: string;
  installments: PDFInstallment[];
}

function formatCurrency(amount: number): string {
  return "Rs. " + amount.toLocaleString("en-IN");
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export async function generateEMIStatementPDF(
  data: StatementPDFData
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 595.28; // A4
  const PAGE_HEIGHT = 841.89; // A4
  const MARGIN_LEFT = 40;
  const MARGIN_RIGHT = 40;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 36;

  // ── Palette (Executive / Fintech Grade) ──────────────────────────────────────
  const cBrand = rgb(0.39, 0.40, 0.95);       // #6366F1 Indigo
  const cBrandDark = rgb(0.28, 0.29, 0.80);   // Darker Indigo
  const cDark = rgb(0.09, 0.13, 0.20);        // #172033 Deep Navy
  const cBody = rgb(0.22, 0.27, 0.35);        // Slate Text
  const cMuted = rgb(0.48, 0.53, 0.62);       // #7A879E Muted Gray
  const cBorder = rgb(0.88, 0.91, 0.94);      // #E2E8F0 Soft Border
  const cCardBg = rgb(0.97, 0.98, 0.99);      // #F8FAFC Soft Slate Bg
  const cWhite = rgb(1, 1, 1);

  // Status colors (Pill backgrounds and texts)
  const cPaidBg = rgb(0.90, 0.97, 0.93);
  const cPaidText = rgb(0.09, 0.62, 0.38);

  const cOverdueBg = rgb(0.99, 0.92, 0.92);
  const cOverdueText = rgb(0.86, 0.22, 0.22);

  const cPendingBg = rgb(0.93, 0.94, 0.96);
  const cPendingText = rgb(0.42, 0.47, 0.56);

  // ── 1. Top Brand Header Bar ─────────────────────────────────────────────────
  // Brand title
  page.drawText("CAPFLOW", {
    x: MARGIN_LEFT,
    y: y - 14,
    size: 18,
    font: fontBold,
    color: cDark,
  });

  page.drawText("PERSONAL FINANCE & LOAN TRACKER", {
    x: MARGIN_LEFT,
    y: y - 26,
    size: 7.5,
    font: fontBold,
    color: cBrand,
  });

  // Right-aligned Statement Info Badge
  const todayStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  page.drawText("STATEMENT OF ACCOUNT", {
    x: PAGE_WIDTH - MARGIN_RIGHT - 160,
    y: y - 14,
    size: 11,
    font: fontBold,
    color: cDark,
  });

  page.drawText(`Date: ${todayStr}`, {
    x: PAGE_WIDTH - MARGIN_RIGHT - 160,
    y: y - 26,
    size: 8.5,
    font: fontRegular,
    color: cMuted,
  });

  y -= 38;

  // Thin Indigo Accent Line
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
    thickness: 2,
    color: cBrand,
  });

  y -= 14;

  // ── 2. Facility & Account Information Card ──────────────────────────────────
  const infoCardHeight = 62;
  const infoCardY = y - infoCardHeight;

  // Background Box
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: infoCardY,
    width: CONTENT_WIDTH,
    height: infoCardHeight,
    color: cCardBg,
    borderColor: cBorder,
    borderWidth: 1,
  });

  // Left column: User / Borrower
  const col1X = MARGIN_LEFT + 14;
  page.drawText("BORROWER / ACCOUNT", {
    x: col1X,
    y: infoCardY + 44,
    size: 7,
    font: fontBold,
    color: cMuted,
  });
  page.drawText(data.recipientName || "Valued User", {
    x: col1X,
    y: infoCardY + 30,
    size: 9.5,
    font: fontBold,
    color: cDark,
  });
  page.drawText(data.recipientEmail, {
    x: col1X,
    y: infoCardY + 16,
    size: 8,
    font: fontRegular,
    color: cBody,
  });

  // Middle column: Facility & Payment Day
  const col2X = MARGIN_LEFT + 185;
  page.drawText("LOAN FACILITY", {
    x: col2X,
    y: infoCardY + 44,
    size: 7,
    font: fontBold,
    color: cMuted,
  });
  page.drawText(data.emiName, {
    x: col2X,
    y: infoCardY + 30,
    size: 10,
    font: fontBold,
    color: cBrandDark,
  });
  page.drawText(`Due on ${ordinal(data.dueDay)} each month`, {
    x: col2X,
    y: infoCardY + 16,
    size: 8,
    font: fontRegular,
    color: cBody,
  });

  // Right column: Schedule & Tenure
  const col3X = MARGIN_LEFT + 355;
  page.drawText("TENURE & START DATE", {
    x: col3X,
    y: infoCardY + 44,
    size: 7,
    font: fontBold,
    color: cMuted,
  });
  page.drawText(`${data.totalInstallments} Installments (${data.totalInstallments} Mo.)`, {
    x: col3X,
    y: infoCardY + 30,
    size: 9.5,
    font: fontBold,
    color: cDark,
  });
  page.drawText(`Started: ${data.startDate}`, {
    x: col3X,
    y: infoCardY + 16,
    size: 8,
    font: fontRegular,
    color: cBody,
  });

  y = infoCardY - 14;

  // ── 3. Summary Financial KPI Cards (3 Cards) ────────────────────────────────
  const kpiCardWidth = (CONTENT_WIDTH - 16) / 3;
  const kpiCardHeight = 56;
  const kpiY = y - kpiCardHeight;

  const paidAmount = data.paidInstallments * data.monthlyCost;
  const remainingAmount = Math.max(0, data.totalCost - paidAmount);
  const pendingCount = Math.max(0, data.totalInstallments - data.paidInstallments);

  const kpis = [
    {
      title: "TOTAL LOAN VALUE",
      value: formatCurrency(data.totalCost),
      valColor: cDark,
      sub: `${data.totalInstallments} inst. @ ${formatCurrency(data.monthlyCost)}`,
      subColor: cMuted,
    },
    {
      title: "AMOUNT PAID (TO DATE)",
      value: formatCurrency(paidAmount),
      valColor: cPaidText,
      sub: `${data.paidInstallments} settled installments`,
      subColor: cPaidText,
    },
    {
      title: "REMAINING BALANCE",
      value: formatCurrency(remainingAmount),
      valColor: cOverdueText,
      sub: `${pendingCount} pending installments`,
      subColor: cMuted,
    },
  ];

  kpis.forEach((kpi, index) => {
    const cardX = MARGIN_LEFT + index * (kpiCardWidth + 8);

    page.drawRectangle({
      x: cardX,
      y: kpiY,
      width: kpiCardWidth,
      height: kpiCardHeight,
      color: cCardBg,
      borderColor: cBorder,
      borderWidth: 1,
    });

    page.drawText(kpi.title, {
      x: cardX + 12,
      y: kpiY + 41,
      size: 7.5,
      font: fontBold,
      color: cMuted,
    });

    page.drawText(kpi.value, {
      x: cardX + 12,
      y: kpiY + 23,
      size: 13.5,
      font: fontBold,
      color: kpi.valColor,
    });

    page.drawText(kpi.sub, {
      x: cardX + 12,
      y: kpiY + 10,
      size: 7.5,
      font: fontRegular,
      color: kpi.subColor,
    });
  });

  y = kpiY - 16;

  // ── 4. Repayment Progress Bar ───────────────────────────────────────────────
  const progressPercent = Math.min(
    100,
    Math.round((data.paidInstallments / data.totalInstallments) * 100)
  );

  page.drawText(
    `Repayment Progress: ${data.paidInstallments} of ${data.totalInstallments} installments completed`,
    {
      x: MARGIN_LEFT,
      y: y - 8,
      size: 8.5,
      font: fontBold,
      color: cDark,
    }
  );

  const pctText = `${progressPercent}%`;
  page.drawText(pctText, {
    x: PAGE_WIDTH - MARGIN_RIGHT - 28,
    y: y - 8,
    size: 8.5,
    font: fontBold,
    color: cBrandDark,
  });

  y -= 16;

  // Track bar
  const barHeight = 6;
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - barHeight,
    width: CONTENT_WIDTH,
    height: barHeight,
    color: rgb(0.90, 0.92, 0.95),
  });

  // Active progress fill
  if (progressPercent > 0) {
    page.drawRectangle({
      x: MARGIN_LEFT,
      y: y - barHeight,
      width: (CONTENT_WIDTH * progressPercent) / 100,
      height: barHeight,
      color: cBrand,
    });
  }

  // Generous margin before the table header to avoid ANY collision
  y -= (barHeight + 24);

  // ── 5. Installment Repayment Schedule Header ────────────────────────────────
  page.drawText("INSTALLMENT REPAYMENT SCHEDULE", {
    x: MARGIN_LEFT,
    y: y - 9,
    size: 10,
    font: fontBold,
    color: cDark,
  });

  page.drawText("Complete installment timeline from loan start date to maturity", {
    x: MARGIN_LEFT + 220,
    y: y - 9,
    size: 7.5,
    font: fontRegular,
    color: cMuted,
  });

  y -= 18;

  // ── Column X Positions ──────────────────────────────────────────────────────
  const colX = {
    num: MARGIN_LEFT + 12,
    dueDate: MARGIN_LEFT + 65,
    amount: MARGIN_LEFT + 210,
    status: MARGIN_LEFT + 380,
  };

  const TABLE_HEADER_HEIGHT = 22;

  const drawTableHeader = (targetPage: typeof page, atY: number) => {
    // Header background rectangle
    targetPage.drawRectangle({
      x: MARGIN_LEFT,
      y: atY - TABLE_HEADER_HEIGHT,
      width: CONTENT_WIDTH,
      height: TABLE_HEADER_HEIGHT,
      color: rgb(0.12, 0.16, 0.24), // #1E293B Deep Charcoal Navy
    });

    const textY = atY - 14;

    targetPage.drawText("INST #", {
      x: colX.num,
      y: textY,
      size: 8,
      font: fontBold,
      color: cWhite,
    });
    targetPage.drawText("DUE DATE", {
      x: colX.dueDate,
      y: textY,
      size: 8,
      font: fontBold,
      color: cWhite,
    });
    targetPage.drawText("MONTHLY AMOUNT", {
      x: colX.amount,
      y: textY,
      size: 8,
      font: fontBold,
      color: cWhite,
    });
    targetPage.drawText("STATUS", {
      x: colX.status,
      y: textY,
      size: 8,
      font: fontBold,
      color: cWhite,
    });
  };

  drawTableHeader(page, y);
  y -= TABLE_HEADER_HEIGHT;

  // ── 6. Table Rows ───────────────────────────────────────────────────────────
  const ROW_HEIGHT = 20;

  for (let i = 0; i < data.installments.length; i++) {
    const inst = data.installments[i];

    // Check page overflow (leave 50pt for bottom footer)
    if (y - ROW_HEIGHT < 55) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 45;
      drawTableHeader(page, y);
      y -= TABLE_HEADER_HEIGHT;
    }

    const rowBottomY = y - ROW_HEIGHT;

    // Alternating zebra row
    if (i % 2 === 1) {
      page.drawRectangle({
        x: MARGIN_LEFT,
        y: rowBottomY,
        width: CONTENT_WIDTH,
        height: ROW_HEIGHT,
        color: rgb(0.98, 0.98, 0.99),
      });
    }

    // Border line bottom
    page.drawLine({
      start: { x: MARGIN_LEFT, y: rowBottomY },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: rowBottomY },
      thickness: 0.5,
      color: rgb(0.91, 0.93, 0.96),
    });

    const textY = rowBottomY + 6;

    // Installment number
    page.drawText(`#${inst.number}`, {
      x: colX.num,
      y: textY,
      size: 8.5,
      font: fontBold,
      color: cMuted,
    });

    // Due date
    page.drawText(inst.dueDate, {
      x: colX.dueDate,
      y: textY,
      size: 8.5,
      font: fontRegular,
      color: cDark,
    });

    // Monthly amount
    page.drawText(formatCurrency(data.monthlyCost), {
      x: colX.amount,
      y: textY,
      size: 8.5,
      font: fontBold,
      color: cDark,
    });

    // Status Pill
    let badgeText = "PENDING";
    let badgeBg = cPendingBg;
    let badgeTextColor = cPendingText;

    if (inst.status === "paid") {
      badgeText = "PAID";
      badgeBg = cPaidBg;
      badgeTextColor = cPaidText;
    } else if (inst.status === "overdue") {
      badgeText = "OVERDUE";
      badgeBg = cOverdueBg;
      badgeTextColor = cOverdueText;
    }

    const pillWidth = 56;
    const pillHeight = 13;
    const pillY = rowBottomY + 3.5;

    page.drawRectangle({
      x: colX.status,
      y: pillY,
      width: pillWidth,
      height: pillHeight,
      color: badgeBg,
      borderColor: badgeBg,
      borderWidth: 1,
    });

    // Center text inside pill
    const textWidth = fontBold.widthOfTextAtSize(badgeText, 7);
    const pillTextX = colX.status + (pillWidth - textWidth) / 2;

    page.drawText(badgeText, {
      x: pillTextX,
      y: pillY + 3.5,
      size: 7,
      font: fontBold,
      color: badgeTextColor,
    });

    y -= ROW_HEIGHT;
  }

  // ── 7. Page Footers ─────────────────────────────────────────────────────────
  const pages = pdfDoc.getPages();
  pages.forEach((p, idx) => {
    // Footer line
    p.drawLine({
      start: { x: MARGIN_LEFT, y: 32 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: 32 },
      thickness: 0.5,
      color: cBorder,
    });

    p.drawText("CapFlow Financial Tracker • Confidential Loan Statement", {
      x: MARGIN_LEFT,
      y: 18,
      size: 7.5,
      font: fontRegular,
      color: cMuted,
    });

    const pageNumText = `Page ${idx + 1} of ${pages.length}`;
    p.drawText(pageNumText, {
      x: PAGE_WIDTH - MARGIN_RIGHT - 50,
      y: 18,
      size: 7.5,
      font: fontRegular,
      color: cMuted,
    });
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
