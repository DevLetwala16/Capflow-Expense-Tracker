import { generateSplitterReportPDF, generateWhatsAppSummary } from '@/lib/splitter/splitterPdf';
import { SplitSession } from '@/types/splitter';

describe('Splitter PDF and Summary Generator', () => {
  const mockSession: SplitSession = {
    sessionId: 'CAP-SPLIT-9999-X',
    userId: 'user_1',
    name: 'Goa Weekend 2026',
    description: 'Beach resort and scooter rental',
    template: 'group',
    startDate: '2026-10-10',
    endDate: '2026-10-14',
    currency: 'INR',
    budgetCap: 50000,
    status: 'active',
    members: [
      {
        id: 'm1',
        name: 'Rahul',
        handle: '@rahul',
        color: '#6366F1',
        isDependent: false,
      },
      {
        id: 'm2',
        name: 'Priya',
        handle: '@priya',
        color: '#10B981',
        isDependent: false,
      },
    ],
    expenses: [
      {
        id: 'e1',
        sessionId: 'CAP-SPLIT-9999-X',
        title: 'Seafood Dinner',
        amount: 2400,
        currency: 'INR',
        category: 'Food & Dining',
        date: '2026-10-11T20:00:00Z',
        createdBy: { memberId: 'm1', name: 'Rahul' },
        paidBy: [{ memberId: 'm1', amount: 2400 }],
        splitMode: 'equal',
        splits: [
          { memberId: 'm1', amount: 1200 },
          { memberId: 'm2', amount: 1200 },
        ],
        createdAt: '2026-10-11T20:00:00Z',
        updatedAt: '2026-10-11T20:00:00Z',
      },
    ],
    settlements: [],
    auditLogs: [
      {
        id: 'log1',
        sessionId: 'CAP-SPLIT-9999-X',
        timestamp: '2026-10-10T10:00:00Z',
        memberName: 'Rahul',
        action: 'Created new session "Goa Weekend 2026"',
      },
    ],
    createdAt: '2026-10-10T10:00:00Z',
    updatedAt: '2026-10-11T20:00:00Z',
  };

  test('generateSplitterReportPDF produces valid PDF byte stream', async () => {
    const pdfBytes = await generateSplitterReportPDF(mockSession);
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Verify PDF header magic bytes: %PDF-
    const header = String.fromCharCode(...Array.from(pdfBytes.slice(0, 5)));
    expect(header).toBe('%PDF-');
  });

  test('generateWhatsAppSummary includes session details and debts', () => {
    const text = generateWhatsAppSummary(mockSession);
    expect(text).toContain('Goa Weekend 2026');
    expect(text).toContain('CAP-SPLIT-9999-X');
    expect(text).toContain('Rahul');
    expect(text).toContain('Priya');
    expect(text).toContain('Who Pays Whom');
  });
});
