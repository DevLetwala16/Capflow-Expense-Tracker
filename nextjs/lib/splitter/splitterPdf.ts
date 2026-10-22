import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import {
  SplitSession,
  MemberNetPosition,
  SettlementTransaction,
} from '@/types/splitter';
import {
  calculateMemberNetPositions,
  simplifyDebts,
  formatSplitCurrency,
  formatPDFCurrency,
} from './debtEngine';

export interface SplitterReportFilterOptions {
  startDate?: string;
  endDate?: string;
  filterMode?: 'whole' | 'last_month' | 'custom';
  dateRangeLabel?: string;
}

export function filterSessionExpenses(
  session: SplitSession,
  options?: SplitterReportFilterOptions
): { filteredSession: SplitSession; effectiveLabel: string } {
  if (!options || options.filterMode === 'whole' || (!options.filterMode && !options.startDate && !options.endDate)) {
    return {
      filteredSession: session,
      effectiveLabel: 'Whole Transactions (All-Time)',
    };
  }

  let startStr = options.startDate;
  let endStr = options.endDate;
  let label = options.dateRangeLabel;

  if (options.filterMode === 'last_month') {
    const now = new Date();
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    startStr = firstDayLastMonth.toISOString().split('T')[0];
    endStr = lastDayLastMonth.toISOString().split('T')[0];
    const monthName = firstDayLastMonth.toLocaleString('default', { month: 'short', year: 'numeric' });
    label = `Last Month (${monthName}: ${startStr} to ${endStr})`;
  } else if (!label) {
    label = `Custom Range (${startStr || 'Start'} to ${endStr || 'Current'})`;
  }

  const filteredExpenses = session.expenses.filter((e) => {
    const expDate = e.date ? e.date.split('T')[0] : '';
    if (startStr && expDate < startStr) return false;
    if (endStr && expDate > endStr) return false;
    return true;
  });

  return {
    filteredSession: {
      ...session,
      expenses: filteredExpenses,
    },
    effectiveLabel: label || 'Custom Range',
  };
}

export async function generateSplitterReportPDF(
  session: SplitSession,
  options?: SplitterReportFilterOptions
): Promise<Uint8Array> {
  const { filteredSession, effectiveLabel } = filterSessionExpenses(session, options);

  const pdfDoc = await PDFDocument.create();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 595.28; // A4
  const PAGE_HEIGHT = 841.89; // A4
  const MARGIN_LEFT = 36;
  const MARGIN_RIGHT = 36;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - 36;

  // Colors
  const cBrand = rgb(0.39, 0.4, 0.95); // #6366F1 Indigo
  const cDark = rgb(0.09, 0.13, 0.2); // Navy
  const cMuted = rgb(0.48, 0.53, 0.62); // Slate
  const cBorder = rgb(0.88, 0.91, 0.94);
  const cCardBg = rgb(0.97, 0.98, 0.99);
  const cWhite = rgb(1, 1, 1);
  const cGreen = rgb(0.06, 0.72, 0.51); // #10B981
  const cRed = rgb(0.93, 0.27, 0.27); // #EF4444

  const positions: MemberNetPosition[] = calculateMemberNetPositions(filteredSession);
  const settlements: SettlementTransaction[] = simplifyDebts(positions);
  const totalSpend = filteredSession.expenses.reduce((sum, e) => sum + e.amount, 0);

  function checkPageSpace(requiredHeight: number) {
    if (y - requiredHeight < 40) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - 36;
    }
  }

  // ── 1. Top Brand Header Bar ───────────────────────────────────────────────
  page.drawText('CAPFLOW', {
    x: MARGIN_LEFT,
    y: y - 14,
    size: 16,
    font: fontBold,
    color: cDark,
  });

  page.drawText('GROUP EXPENSE & SPLITTER AUDIT REPORT', {
    x: MARGIN_LEFT,
    y: y - 26,
    size: 7.5,
    font: fontBold,
    color: cBrand,
  });

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  page.drawText('OFFICIAL AUDIT LEDGER', {
    x: PAGE_WIDTH - MARGIN_RIGHT - 140,
    y: y - 14,
    size: 9.5,
    font: fontBold,
    color: cDark,
  });

  page.drawText(`Generated: ${todayStr}`, {
    x: PAGE_WIDTH - MARGIN_RIGHT - 140,
    y: y - 26,
    size: 8,
    font: fontRegular,
    color: cMuted,
  });

  y -= 38;

  // Indigo Accent Bar
  page.drawLine({
    start: { x: MARGIN_LEFT, y },
    end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
    thickness: 2,
    color: cBrand,
  });

  y -= 14;

  // ── 2. Session Metadata Card ──────────────────────────────────────────────
  const metaHeight = 68;
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - metaHeight,
    width: CONTENT_WIDTH,
    height: metaHeight,
    color: cCardBg,
    borderColor: cBorder,
    borderWidth: 1,
  });

  // Col 1: Session Details
  page.drawText('SESSION DETAILS', {
    x: MARGIN_LEFT + 12,
    y: y - 14,
    size: 7.5,
    font: fontBold,
    color: cMuted,
  });
  page.drawText(session.name, {
    x: MARGIN_LEFT + 12,
    y: y - 28,
    size: 11,
    font: fontBold,
    color: cDark,
  });
  page.drawText(`ID: ${session.sessionId} | ${session.template.toUpperCase()} MODE`, {
    x: MARGIN_LEFT + 12,
    y: y - 42,
    size: 8,
    font: fontRegular,
    color: cBrand,
  });
  page.drawText(`Scope: ${effectiveLabel}`, {
    x: MARGIN_LEFT + 12,
    y: y - 56,
    size: 7.5,
    font: fontBold,
    color: cBrand,
  });

  // Col 2: Financial Stats
  const col2X = MARGIN_LEFT + 320;
  page.drawText('SESSION FINANCIALS', {
    x: col2X,
    y: y - 14,
    size: 7.5,
    font: fontBold,
    color: cMuted,
  });
  page.drawText(`Total Spend: ${formatPDFCurrency(totalSpend, session.currency)}`, {
    x: col2X,
    y: y - 28,
    size: 10,
    font: fontBold,
    color: cDark,
  });
  if (session.budgetCap) {
    page.drawText(`Budget Cap: ${formatPDFCurrency(session.budgetCap, session.currency)}`, {
      x: col2X,
      y: y - 42,
      size: 8,
      font: fontRegular,
      color: cMuted,
    });
  }
  page.drawText(`Status: ${session.status.toUpperCase()} | ${session.members.length} Members`, {
    x: col2X,
    y: y - 56,
    size: 8,
    font: fontBold,
    color: session.status === 'active' ? cBrand : cGreen,
  });

  y -= metaHeight + 20;

  // ── 3. Member Net Capital Summary Table ────────────────────────────────────
  checkPageSpace(120);
  page.drawText('MEMBER NET CAPITAL SUMMARY (GAIN / LOSS)', {
    x: MARGIN_LEFT,
    y,
    size: 9.5,
    font: fontBold,
    color: cDark,
  });
  y -= 14;

  // Table header
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 18,
    width: CONTENT_WIDTH,
    height: 18,
    color: rgb(0.93, 0.94, 0.96),
  });

  const tCol1 = MARGIN_LEFT + 8;
  const tCol2 = MARGIN_LEFT + 140;
  const tCol3 = MARGIN_LEFT + 240;
  const tCol4 = MARGIN_LEFT + 340;
  const tCol5 = MARGIN_LEFT + 430;

  page.drawText('Member', { x: tCol1, y: y - 13, size: 7.5, font: fontBold, color: cDark });
  page.drawText('Type / Role', { x: tCol2, y: y - 13, size: 7.5, font: fontBold, color: cDark });
  page.drawText('Consumption', { x: tCol3, y: y - 13, size: 7.5, font: fontBold, color: cDark });
  page.drawText('Total Paid', { x: tCol4, y: y - 13, size: 7.5, font: fontBold, color: cDark });
  page.drawText('Net Standing', { x: tCol5, y: y - 13, size: 7.5, font: fontBold, color: cDark });

  y -= 20;

  positions.forEach((pos) => {
    checkPageSpace(20);
    // Draw row line
    page.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
      thickness: 0.5,
      color: cBorder,
    });

    const isGetsBack = pos.netBalance > 0.009;
    const isOwes = pos.netBalance < -0.009;
    const netColor = isGetsBack ? cGreen : isOwes ? cRed : cMuted;
    const netText = isGetsBack
      ? `Gets back ${formatPDFCurrency(pos.netBalance, session.currency)}`
      : isOwes
      ? `Owes ${formatPDFCurrency(Math.abs(pos.netBalance), session.currency)}`
      : 'Settled';

    let roleStr = pos.isDependent
      ? `Dependent (Payer: ${pos.primaryPayerName || 'Linked'})`
      : 'Independent';

    page.drawText(`${pos.memberName} (${pos.handle})`, {
      x: tCol1,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: cDark,
    });
    page.drawText(roleStr, {
      x: tCol2,
      y: y - 12,
      size: 7,
      font: fontRegular,
      color: cMuted,
    });
    page.drawText(formatPDFCurrency(pos.individualSpend, session.currency), {
      x: tCol3,
      y: y - 12,
      size: 7.5,
      font: fontRegular,
      color: cDark,
    });
    page.drawText(formatPDFCurrency(pos.totalPaid, session.currency), {
      x: tCol4,
      y: y - 12,
      size: 7.5,
      font: fontRegular,
      color: cDark,
    });
    page.drawText(netText, {
      x: tCol5,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: netColor,
    });

    y -= 18;
  });

  y -= 14;

  // ── 4. Optimized Settlement Roadmap ───────────────────────────────────────
  checkPageSpace(80);
  page.drawText('OPTIMIZED SETTLEMENT ROADMAP ("WHO PAYS WHOM")', {
    x: MARGIN_LEFT,
    y,
    size: 9.5,
    font: fontBold,
    color: cDark,
  });
  y -= 14;

  if (settlements.length === 0) {
    page.drawText('All members are currently settled up. No pending transactions required.', {
      x: MARGIN_LEFT + 8,
      y: y - 10,
      size: 8,
      font: fontRegular,
      color: cGreen,
    });
    y -= 22;
  } else {
    settlements.forEach((st) => {
      checkPageSpace(22);
      page.drawRectangle({
        x: MARGIN_LEFT,
        y: y - 20,
        width: CONTENT_WIDTH,
        height: 20,
        color: cCardBg,
        borderColor: cBorder,
        borderWidth: 0.5,
      });

      page.drawText(`${st.fromMemberName}`, {
        x: MARGIN_LEFT + 12,
        y: y - 14,
        size: 8.5,
        font: fontBold,
        color: cRed,
      });

      page.drawText(`pays`, {
        x: MARGIN_LEFT + 130,
        y: y - 14,
        size: 7.5,
        font: fontRegular,
        color: cMuted,
      });

      page.drawText(`${st.toMemberName}`, {
        x: MARGIN_LEFT + 170,
        y: y - 14,
        size: 8.5,
        font: fontBold,
        color: cGreen,
      });

      page.drawText(formatPDFCurrency(st.amount, session.currency), {
        x: PAGE_WIDTH - MARGIN_RIGHT - 110,
        y: y - 14,
        size: 9,
        font: fontBold,
        color: cDark,
      });

      y -= 24;
    });
  }

  y -= 14;

  // ── 5. Itemized Multi-Day Expense Ledger ───────────────────────────────────
  checkPageSpace(100);
  page.drawText(`ITEMIZED EXPENSE LEDGER (${filteredSession.expenses.length} Records · ${effectiveLabel})`, {
    x: MARGIN_LEFT,
    y,
    size: 9.5,
    font: fontBold,
    color: cDark,
  });
  y -= 14;

  // Table header
  page.drawRectangle({
    x: MARGIN_LEFT,
    y: y - 18,
    width: CONTENT_WIDTH,
    height: 18,
    color: rgb(0.93, 0.94, 0.96),
  });

  const eCol1 = MARGIN_LEFT + 8;
  const eCol2 = MARGIN_LEFT + 90;
  const eCol3 = MARGIN_LEFT + 220;
  const eCol4 = MARGIN_LEFT + 330;
  const eCol5 = MARGIN_LEFT + 440;

  page.drawText('Date', { x: eCol1, y: y - 13, size: 7.5, font: fontBold, color: cDark });
  page.drawText('Title & Category', { x: eCol2, y: y - 13, size: 7.5, font: fontBold, color: cDark });
  page.drawText('Created By', { x: eCol3, y: y - 13, size: 7.5, font: fontBold, color: cDark });
  page.drawText('Paid By', { x: eCol4, y: y - 13, size: 7.5, font: fontBold, color: cDark });
  page.drawText('Amount', { x: eCol5, y: y - 13, size: 7.5, font: fontBold, color: cDark });

  y -= 20;

  const memberNameMap = new Map(session.members.map((m) => [m.id, m.name]));

  filteredSession.expenses.forEach((exp) => {
    checkPageSpace(26);
    page.drawLine({
      start: { x: MARGIN_LEFT, y },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
      thickness: 0.5,
      color: cBorder,
    });

    const expDate = exp.date ? exp.date.split('T')[0] : '';
    const paidByStr = exp.paidBy
      .map((p) => `${memberNameMap.get(p.memberId) || 'Member'} (${p.amount})`)
      .join(', ');

    page.drawText(expDate, {
      x: eCol1,
      y: y - 12,
      size: 7.5,
      font: fontRegular,
      color: cMuted,
    });

    page.drawText(`${exp.title} [${exp.category}]`, {
      x: eCol2,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: cDark,
    });

    page.drawText(`By: ${exp.createdBy?.name || 'Member'}`, {
      x: eCol3,
      y: y - 12,
      size: 7.5,
      font: fontRegular,
      color: cBrand,
    });

    // Truncate paidBy string if too long
    const cleanPaidStr = paidByStr.length > 22 ? paidByStr.slice(0, 20) + '...' : paidByStr;
    page.drawText(cleanPaidStr, {
      x: eCol4,
      y: y - 12,
      size: 7.5,
      font: fontRegular,
      color: cDark,
    });

    page.drawText(formatPDFCurrency(exp.amount, session.currency), {
      x: eCol5,
      y: y - 12,
      size: 8,
      font: fontBold,
      color: cDark,
    });

    y -= 20;
  });

  // Footer on each page
  const pageIndices = pdfDoc.getPageIndices();
  for (const idx of pageIndices) {
    const p = pdfDoc.getPage(idx);
    p.drawText(`CapFlow Splitter Module · Page ${idx + 1} of ${pageIndices.length} · Financial Integrity Guarantee`, {
      x: MARGIN_LEFT,
      y: 20,
      size: 7,
      font: fontRegular,
      color: cMuted,
    });
  }

  return await pdfDoc.save();
}

/**
 * Trigger client-side direct download of the generated PDF in the browser.
 */
export function downloadSplitterPDF(pdfBytes: Uint8Array, fileName: string) {
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate formatted text summary for instant WhatsApp / messaging sharing.
 */
export function generateWhatsAppSummary(
  session: SplitSession,
  options?: SplitterReportFilterOptions
): string {
  const { filteredSession, effectiveLabel } = filterSessionExpenses(session, options);
  const positions = calculateMemberNetPositions(filteredSession);
  const settlements = simplifyDebts(positions);
  const totalSpend = filteredSession.expenses.reduce((sum, e) => sum + e.amount, 0);

  let text = `*CapFlow Splitter Summary: ${session.name}*\n`;
  text += `Session ID: ${session.sessionId}\n`;
  text += `Report Scope: ${effectiveLabel}\n`;
  text += `Total Spent: ${formatSplitCurrency(totalSpend, session.currency)} (${filteredSession.expenses.length} expenses)\n`;
  text += `Status: ${session.status.toUpperCase()}\n\n`;

  text += `*--- Member Net Standing ---*\n`;
  for (const pos of positions) {
    if (pos.isDependent) {
      text += `- ${pos.memberName}: Consumed ${formatSplitCurrency(pos.individualSpend, session.currency)} (Dues covered by ${pos.primaryPayerName || 'Parent'})\n`;
    } else if (pos.netBalance > 0.009) {
      text += `- ${pos.memberName}: Gets back ${formatSplitCurrency(pos.netBalance, session.currency)} (Paid: ${formatSplitCurrency(pos.totalPaid, session.currency)})\n`;
    } else if (pos.netBalance < -0.009) {
      text += `- ${pos.memberName}: Owes ${formatSplitCurrency(Math.abs(pos.netBalance), session.currency)}\n`;
    } else {
      text += `- ${pos.memberName}: Settled up\n`;
    }
  }

  text += `\n*--- Who Pays Whom (Settlement Roadmap) ---*\n`;
  if (settlements.length === 0) {
    text += `All settled up! No payments pending.\n`;
  } else {
    for (const st of settlements) {
      text += `• *${st.fromMemberName}* pays *${st.toMemberName}*: ${formatSplitCurrency(st.amount, session.currency)}\n`;
    }
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const queryParams = new URLSearchParams();
  if (options?.filterMode && options.filterMode !== 'whole') {
    queryParams.set('filterMode', options.filterMode);
  }
  if (options?.startDate) queryParams.set('startDate', options.startDate);
  if (options?.endDate) queryParams.set('endDate', options.endDate);
  const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';

  text += `\n📄 View / Download Verified PDF Statement:\n${origin}/api/splitter/sessions/${encodeURIComponent(session.sessionId)}/pdf${qs}\n`;
  text += `\n🔗 Join or track live in CapFlow:\n${origin}/budgets/splitter?join=${encodeURIComponent(session.sessionId)}`;
  return text;
}
