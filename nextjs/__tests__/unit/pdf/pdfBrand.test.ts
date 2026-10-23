import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  tryEmbedCapFlowLogo,
  drawCapFlowBrandHeader,
  DEFAULT_LOGO_SIZE,
  DEFAULT_LOGO_GAP,
  cleanPDFText,
  decodeBase64,
} from '@/lib/pdf/pdfBrand';
import { generateEMIStatementPDF, StatementPDFData } from '@/lib/email/statementPdf';
import { generateTransactionStatementPDF, TransactionStatementPDFData } from '@/lib/email/transactionStatementPdf';
import { generateSplitterReportPDF } from '@/lib/splitter/splitterPdf';
import { SplitSession } from '@/types/splitter';

describe('CapFlow PDF Branding & Logo Integration', () => {
  describe('cleanPDFText sanitization & WinAnsi safety', () => {
    test('removes soft ice cream emoji (0x1f366) and other emojis without throwing', () => {
      const input = 'Ice Cream \u{1F366}';
      expect(cleanPDFText(input)).toBe('Ice Cream');

      const multiEmoji = 'Lunch 🍕 & Drinks 🍻 at Bar';
      expect(cleanPDFText(multiEmoji)).toBe('Lunch & Drinks at Bar');
    });

    test('replaces Indian Rupee symbol (₹) with Rs.', () => {
      expect(cleanPDFText('Total: ₹15,000')).toBe('Total: Rs. 15,000');
    });

    test('replaces Euro symbol (€) with EUR', () => {
      expect(cleanPDFText('Fare: €25.50')).toBe('Fare: EUR 25.50');
    });

    test('normalizes smart quotes, dashes, ellipsis, and newlines', () => {
      const complex = '“CapFlow” – ‘Fast’…\nNext line';
      expect(cleanPDFText(complex)).toBe('"CapFlow" - \'Fast\'... Next line');
    });

    test('returns fallback when input is empty or only emojis', () => {
      expect(cleanPDFText('\u{1F366}\u{1F355}', 'Untitled')).toBe('Untitled');
      expect(cleanPDFText('', 'Fallback')).toBe('Fallback');
      expect(cleanPDFText(null, 'N/A')).toBe('N/A');
      expect(cleanPDFText(undefined, 'Default')).toBe('Default');
    });
  });

  describe('tryEmbedCapFlowLogo', () => {
    test('successfully embeds logo and returns a valid PDFImage with positive dimensions', async () => {
      const pdfDoc = await PDFDocument.create();
      const logo = await tryEmbedCapFlowLogo(pdfDoc);

      expect(logo).not.toBeNull();
      expect(logo?.width).toBeGreaterThan(0);
      expect(logo?.height).toBeGreaterThan(0);
    });

    test('gracefully returns null if embedding fails without throwing errors', async () => {
      const brokenDoc = {
        embedPng: jest.fn().mockRejectedValue(new Error('Corrupted PNG')),
      } as unknown as PDFDocument;

      const result = await tryEmbedCapFlowLogo(brokenDoc);
      expect(result).toBeNull();
    });
  });

  describe('drawCapFlowBrandHeader layout & alignment', () => {
    test('offsets title and subtitle when logo is present', async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const logo = await tryEmbedCapFlowLogo(pdfDoc);

      const MARGIN = 40;
      const layout = drawCapFlowBrandHeader({
        page,
        topY: 806,
        marginLeft: MARGIN,
        logoImage: logo,
        titleFont: fontBold,
        subtitle: 'TEST SUBTITLE',
        subtitleFont: fontBold,
      });

      expect(layout.logoDrawn).toBe(true);
      expect(layout.textStartX).toBe(MARGIN + DEFAULT_LOGO_SIZE + DEFAULT_LOGO_GAP);
    });

    test('aligns title and subtitle directly at marginLeft when logo is null (fallback mode)', async () => {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const MARGIN = 40;
      const layout = drawCapFlowBrandHeader({
        page,
        topY: 806,
        marginLeft: MARGIN,
        logoImage: null, // Simulate logo missing/failed to load
        titleFont: fontBold,
        subtitle: 'TEST SUBTITLE',
        subtitleFont: fontBold,
      });

      expect(layout.logoDrawn).toBe(false);
      // When logo not shown, only name shows starting at original margin
      expect(layout.textStartX).toBe(MARGIN);
    });
  });

  describe('All PDF Generators with CapFlow Branding & Emoji Safety', () => {
    test('EMI Statement PDF generates valid PDF with CapFlow header even with emojis', async () => {
      const mockEmiData: StatementPDFData = {
        emiName: 'Home Renovation Loan 🏠',
        monthlyCost: 15000,
        totalCost: 180000,
        dueDay: 5,
        startDate: '2026-01-05',
        totalInstallments: 12,
        paidInstallments: 4,
        recipientName: 'Dev Letwala 🚀',
        recipientEmail: 'dev@example.com',
        installments: [
          { number: 1, dueDate: '2026-01-05', status: 'paid' },
          { number: 2, dueDate: '2026-02-05', status: 'paid' },
          { number: 3, dueDate: '2026-03-05', status: 'paid' },
          { number: 4, dueDate: '2026-04-05', status: 'paid' },
          { number: 5, dueDate: '2026-05-05', status: 'pending' },
        ],
      };

      const buffer = await generateEMIStatementPDF(mockEmiData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });

    test('Transaction Statement PDF generates valid PDF with CapFlow header even with emojis', async () => {
      const mockTxData: TransactionStatementPDFData = {
        periodLabel: 'October 2026 🗓️',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        recipientName: 'Dev Letwala \u{1F366}',
        recipientEmail: 'dev@example.com',
        totalIncome: 75000,
        totalExpense: 32000,
        netSavings: 43000,
        transactions: [
          {
            date: '2026-10-05',
            title: 'Monthly Salary 💰',
            category: 'Salary',
            paymentMethod: 'Bank Transfer',
            type: 'income',
            amount: 75000,
          },
          {
            date: '2026-10-10',
            title: 'Ice Cream \u{1F366}',
            category: 'Food 🍦',
            paymentMethod: 'UPI',
            type: 'expense',
            amount: 4500,
          },
        ],
      };

      const buffer = await generateTransactionStatementPDF(mockTxData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    });

    test('Splitter Report PDF works with all 3 filter options (Whole, Monthly, Custom) and handles emojis', async () => {
      const mockSession: SplitSession = {
        sessionId: 'CAP-TEST-123',
        userId: 'u1',
        name: 'Roadtrip 2026 🚗',
        description: 'Fuel and Snacks \u{1F366}',
        template: 'group',
        startDate: '2026-09-15',
        endDate: '2026-10-15',
        currency: 'INR',
        budgetCap: 10000,
        status: 'active',
        members: [
          { id: 'm1', name: 'Dev 👤', handle: '@dev', color: '#6366F1', isDependent: false },
          { id: 'm2', name: 'Alex ✨', handle: '@alex', color: '#10B981', isDependent: false },
        ],
        expenses: [
          {
            id: 'e1',
            sessionId: 'CAP-TEST-123',
            title: 'Ice Cream \u{1F366}',
            amount: 300,
            currency: 'INR',
            category: 'Snacks 🍦',
            date: '2026-10-01T12:00:00Z',
            createdBy: { memberId: 'm1', name: 'Dev \u{1F366}' },
            paidBy: [{ memberId: 'm1', amount: 300 }],
            splitMode: 'equal',
            splits: [
              { memberId: 'm1', amount: 150 },
              { memberId: 'm2', amount: 150 },
            ],
            createdAt: '2026-10-01T12:00:00Z',
            updatedAt: '2026-10-01T12:00:00Z',
          },
          {
            id: 'e2',
            sessionId: 'CAP-TEST-123',
            title: 'Fuel Station ⛽',
            amount: 2500,
            currency: 'INR',
            category: 'Travel 🚗',
            date: '2026-09-20T10:00:00Z',
            createdBy: { memberId: 'm2', name: 'Alex' },
            paidBy: [{ memberId: 'm2', amount: 2500 }],
            splitMode: 'equal',
            splits: [
              { memberId: 'm1', amount: 1250 },
              { memberId: 'm2', amount: 1250 },
            ],
            createdAt: '2026-09-20T10:00:00Z',
            updatedAt: '2026-09-20T10:00:00Z',
          },
        ],
        settlements: [],
        auditLogs: [],
        createdAt: '2026-09-15T10:00:00Z',
        updatedAt: '2026-10-01T12:00:00Z',
      };

      // Option 1: Whole
      const wholeBytes = await generateSplitterReportPDF(mockSession, { filterMode: 'whole' });
      expect(wholeBytes).toBeInstanceOf(Uint8Array);
      expect(wholeBytes.length).toBeGreaterThan(1000);
      expect(String.fromCharCode(...Array.from(wholeBytes.slice(0, 5)))).toBe('%PDF-');

      // Option 2: Monthly (last_month)
      const monthlyBytes = await generateSplitterReportPDF(mockSession, { filterMode: 'last_month' });
      expect(monthlyBytes).toBeInstanceOf(Uint8Array);
      expect(monthlyBytes.length).toBeGreaterThan(1000);
      expect(String.fromCharCode(...Array.from(monthlyBytes.slice(0, 5)))).toBe('%PDF-');

      // Option 3: Custom date range
      const customBytes = await generateSplitterReportPDF(mockSession, {
        filterMode: 'custom',
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      });
      expect(customBytes).toBeInstanceOf(Uint8Array);
      expect(customBytes.length).toBeGreaterThan(1000);
      expect(String.fromCharCode(...Array.from(customBytes.slice(0, 5)))).toBe('%PDF-');
    });
  });
});
