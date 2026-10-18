import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb/connection';
import SplitSessionModel from '@/lib/mongodb/splitSessionModel';
import { generateSplitterReportPDF } from '@/lib/splitter/splitterPdf';
import { SplitSession } from '@/types/splitter';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectMongoDB();
    const id = params.id;

    const sessionDoc = await SplitSessionModel.findOne({
      $or: [{ sessionId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    }).lean();

    if (!sessionDoc) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionDoc as unknown as SplitSession;
    const { searchParams } = new URL(req.url);
    const filterMode = (searchParams.get('filterMode') as 'whole' | 'last_month' | 'custom') || 'whole';
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const dateRangeLabel = searchParams.get('dateRangeLabel') || undefined;

    const pdfBytes = await generateSplitterReportPDF(session, {
      filterMode,
      startDate,
      endDate,
      dateRangeLabel,
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="CapFlow_Split_${session.sessionId}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    console.error('Failed to generate PDF statement:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate PDF statement' },
      { status: 500 }
    );
  }
}
