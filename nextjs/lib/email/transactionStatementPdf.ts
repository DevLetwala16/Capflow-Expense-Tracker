import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface PDFTransactionItem {
  date: string;
  title: string;
  category: string;
  paymentMethod: string;
  type: "expense" | "income";
  amount: number;
}

export interface TransactionStatementPDFData {
  periodLabel: string;
  startDate: string;
  endDate: string;
  recipientName: string;
  recipientEmail: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  transactions: PDFTransactionItem[];
}

function formatCurrency(amount: number): string {
  return "Rs. " + amount.toLocaleString("en-IN");
}

export async function generateTransactionStatementPDF(
  data: TransactionStatementPDFData
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

  // ── Colors ──────────────────────────────────────────────────────────────────
  const cBrand = rgb(0.39, 0.40, 0.95);       // Indigo
  const cDark = rgb(0.09, 0.13, 0.20);        // Deep Navy
  const cBody = rgb(0.22, 0.27, 0.35);        // Slate
  const cMuted = rgb(0.48, 0.53, 0.62);       // Muted
  const cBorder = rgb(0.88, 0.91, 0.94);      // Border
  const cCardBg = rgb(0.97, 0.98, 0.99);      // Slate Card
  const cWhite = rgb(1, 1, 1);

  const cIncome = rgb(0.09, 0.62, 0.38);      // Green
  const cExpense = rgb(0.86, 0.22, 0.22);     // Red

  // ── 1. Brand Header Bar ─────────────────────────────────────────────────────
  page.drawText("CAPFLOW", {
    x: MARGIN_LEFT,
    y: y - 14,
    size: 18,
    font: fontBold,
    color: cDark,
  });

  page.drawText("ACCOUNT TRANSACTION STATEMENT", {
    x: MARGIN_LEFT,
    y: y - 26,
    size: 7.5,
    font: fontBold,
    color: cBrand,
  });

  const todayStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  page.drawText("OFFICIAL STATEMENT", {
    x: PAGE_WIDTH - MARGIN_RIGHT - 160,
    y: y - 14,
    size: 11,
    font: fontBold,
    color: cDark,
  });

  page.drawText(`Generated: ${todayStr}`, {
    x: PAGE_WIDTH - MARGIN_RIGHT - 160,
    y: y - 26,
    size: 8.5,
    font: fontRegular,
    color: cMuted,
  });

  y -= 38;

  // Indigo Accent Line
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
    thickness: 2,
    color: cBrand,
  });

  y -= 14;

  // ── 2. Account & Period Information Card ────────────────────────────────────
  const infoCardHeight = 56;
  const infoCardY = y - infoCardHeight;

  page.drawRectangle({
    x: MARGIN_LEFT,
    y: infoCardY,
    width: CONTENT_WIDTH,
    height: infoCardHeight,
    color: cCardBg,
    borderColor: cBorder,
    borderWidth: 1,
  });

  // Left col: User
  const col1X = MARGIN_LEFT + 14;
  page.drawText("ACCOUNT HOLDER", {
    x: col1X,
    y: infoCardY + 38,
    size: 7,
    font: fontBold,
    color: cMuted,
  });
  page.drawText(data.recipientName || "Valued User", {
    x: col1X,
    y: infoCardY + 24,
    size: 9.5,
    font: fontBold,
    color: cDark,
  });
  page.drawText(data.recipientEmail, {
    x: col1X,
    y: infoCardY + 12,
    size: 8,
    font: fontRegular,
    color: cBody,
  });

  // Middle col: Statement Period
  const col2X = MARGIN_LEFT + 200;
  page.drawText("STATEMENT PERIOD", {
    x: col2X,
    y: infoCardY + 38,
    size: 7,
    font: fontBold,
    color: cMuted,
  });
  page.drawText(data.periodLabel, {
    x: col2X,
    y: infoCardY + 24,
    size: 9.5,
    font: fontBold,
    color: cDark,
  });
  page.drawText(`${data.startDate} to ${data.endDate}`, {
    x: col2X,
    y: infoCardY + 12,
    size: 8,
    font: fontRegular,
    color: cBody,
  });

  // Right col: Records Count
  const col3X = MARGIN_LEFT + 380;
  page.drawText("TOTAL ENTRIES", {
    x: col3X,
    y: infoCardY + 38,
    size: 7,
    font: fontBold,
    color: cMuted,
  });
  page.drawText(`${data.transactions.length} Transactions`, {
    x: col3X,
    y: infoCardY + 24,
    size: 9.5,
    font: fontBold,
    color: cDark,
  });
  page.drawText("Verified Dexie Ledger", {
    x: col3X,
    y: infoCardY + 12,
    size: 8,
    font: fontRegular,
    color: cMuted,
  });

  y = infoCardY - 14;

  // ── 3. Summary Financial KPI Cards (3 Cards) ────────────────────────────────
  const kpiCardWidth = (CONTENT_WIDTH - 16) / 3;
  const kpiCardHeight = 54;
  const kpiY = y - kpiCardHeight;

  const kpis = [
    {
      title: "TOTAL INCOME (+)",
      value: formatCurrency(data.totalIncome),
      valColor: cIncome,
      sub: "Total inflows recorded",
    },
    {
      title: "TOTAL EXPENSES (-)",
      value: formatCurrency(data.totalExpense),
      valColor: cExpense,
      sub: "Total outflows recorded",
    },
    {
      title: "NET CASH FLOW",
      value: (data.netSavings >= 0 ? "+" : "-") + formatCurrency(Math.abs(data.netSavings)),
      valColor: data.netSavings >= 0 ? cIncome : cExpense,
      sub: data.netSavings >= 0 ? "Net surplus" : "Net deficit",
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
      y: kpiY + 40,
      size: 7.5,
      font: fontBold,
      color: cMuted,
    });

    page.drawText(kpi.value, {
      x: cardX + 12,
      y: kpiY + 22,
      size: 13,
      font: fontBold,
      color: kpi.valColor,
    });

    page.drawText(kpi.sub, {
      x: cardX + 12,
      y: kpiY + 9,
      size: 7,
      font: fontRegular,
      color: cMuted,
    });
  });

  y = kpiY - 20;

  // ── 4. Table Section Title ──────────────────────────────────────────────────
  page.drawText("ITEMIZED TRANSACTION HISTORY", {
    x: MARGIN_LEFT,
    y: y - 8,
    size: 10,
    font: fontBold,
    color: cDark,
  });

  page.drawText(`Chronological breakdown (${data.transactions.length} entries)`, {
    x: MARGIN_LEFT + 220,
    y: y - 8,
    size: 7.5,
    font: fontRegular,
    color: cMuted,
  });

  y -= 16;

  // ── Column X Positions ──────────────────────────────────────────────────────
  const colX = {
    num: MARGIN_LEFT + 8,
    date: MARGIN_LEFT + 36,
    title: MARGIN_LEFT + 115,
    category: MARGIN_LEFT + 250,
    method: MARGIN_LEFT + 345,
    amount: MARGIN_LEFT + 420,
  };

  const TABLE_HEADER_HEIGHT = 22;

  const drawTableHeader = (targetPage: typeof page, atY: number) => {
    targetPage.drawRectangle({
      x: MARGIN_LEFT,
      y: atY - TABLE_HEADER_HEIGHT,
      width: CONTENT_WIDTH,
      height: TABLE_HEADER_HEIGHT,
      color: rgb(0.12, 0.16, 0.24), // #1E293B Deep Navy
    });

    const textY = atY - 14;

    targetPage.drawText("#", {
      x: colX.num,
      y: textY,
      size: 8,
      font: fontBold,
      color: cWhite,
    });
    targetPage.drawText("DATE", {
      x: colX.date,
      y: textY,
      size: 8,
      font: fontBold,
      color: cWhite,
    });
    targetPage.drawText("DESCRIPTION", {
      x: colX.title,
      y: textY,
      size: 8,
      font: fontBold,
      color: cWhite,
    });
    targetPage.drawText("CATEGORY", {
      x: colX.category,
      y: textY,
      size: 8,
      font: fontBold,
      color: cWhite,
    });
    targetPage.drawText("METHOD", {
      x: colX.method,
      y: textY,
      size: 8,
      font: fontBold,
      color: cWhite,
    });
    targetPage.drawText("AMOUNT", {
      x: colX.amount,
      y: textY,
      size: 8,
      font: fontBold,
      color: cWhite,
    });
  };

  drawTableHeader(page, y);
  y -= TABLE_HEADER_HEIGHT;

  // ── 5. Table Rows ───────────────────────────────────────────────────────────
  const ROW_HEIGHT = 19;

  for (let i = 0; i < data.transactions.length; i++) {
    const tx = data.transactions[i];

    // Check page overflow
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

    const textY = rowBottomY + 5.5;

    // #
    page.drawText(String(i + 1), {
      x: colX.num,
      y: textY,
      size: 8,
      font: fontRegular,
      color: cMuted,
    });

    // Date
    page.drawText(tx.date, {
      x: colX.date,
      y: textY,
      size: 8,
      font: fontRegular,
      color: cDark,
    });

    // Title (truncate if too long)
    const truncatedTitle =
      tx.title.length > 22 ? tx.title.slice(0, 20) + "…" : tx.title;
    page.drawText(truncatedTitle, {
      x: colX.title,
      y: textY,
      size: 8,
      font: fontBold,
      color: cDark,
    });

    // Category
    const truncatedCat =
      tx.category.length > 16 ? tx.category.slice(0, 14) + "…" : tx.category;
    page.drawText(truncatedCat, {
      x: colX.category,
      y: textY,
      size: 8,
      font: fontRegular,
      color: cBody,
    });

    // Payment Method
    const methodStr = tx.paymentMethod.toUpperCase().replace("_", " ");
    page.drawText(methodStr, {
      x: colX.method,
      y: textY,
      size: 7.5,
      font: fontRegular,
      color: cMuted,
    });

    // Amount (+ / -)
    const isInc = tx.type === "income";
    const amtStr = (isInc ? "+" : "-") + formatCurrency(tx.amount);
    page.drawText(amtStr, {
      x: colX.amount,
      y: textY,
      size: 8.5,
      font: fontBold,
      color: isInc ? cIncome : cExpense,
    });

    y -= ROW_HEIGHT;
  }

  // ── 6. Page Footers ─────────────────────────────────────────────────────────
  const pages = pdfDoc.getPages();
  pages.forEach((p, idx) => {
    p.drawLine({
      start: { x: MARGIN_LEFT, y: 32 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: 32 },
      thickness: 0.5,
      color: cBorder,
    });

    p.drawText("CapFlow Financial Technologies • Confidential Account Statement", {
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
