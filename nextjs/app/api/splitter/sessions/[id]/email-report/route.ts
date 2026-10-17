import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { connectMongoDB } from '@/lib/mongodb/connection';
import SplitSessionModel from '@/lib/mongodb/splitSessionModel';
import UserModel from '@/lib/mongodb/userModel';
import { generateSplitterReportPDF } from '@/lib/splitter/splitterPdf';
import { SplitSession } from '@/types/splitter';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectMongoDB();
    const id = params.id;
    const body = await req.json().catch(() => ({}));

    const sessionDoc = await SplitSessionModel.findOne({
      $or: [{ sessionId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    }).lean();

    if (!sessionDoc) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionDoc as unknown as SplitSession;

    // Determine recipient emails
    let targetEmails: string[] = [];
    if (body.recipients && Array.isArray(body.recipients) && body.recipients.length > 0) {
      targetEmails = body.recipients
        .filter((e: unknown) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()))
        .map((e: string) => e.trim().toLowerCase());
    } else {
      // Collect emails of all members who have one
      targetEmails = session.members
        .map((m) => m.email)
        .filter((e): e is string => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()))
        .map((e) => e.trim().toLowerCase());
    }

    // Fallback: If still no emails, check if the session creator has an email
    if (targetEmails.length === 0 && (sessionDoc as any).userId) {
      try {
        const creator = await UserModel.findById((sessionDoc as any).userId).lean();
        if (creator?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(creator.email.trim())) {
          targetEmails.push(creator.email.trim().toLowerCase());
        }
      } catch (uErr) {
        // ignore lookup error
      }
    }

    // De-duplicate emails
    targetEmails = Array.from(new Set(targetEmails));

    if (targetEmails.length === 0) {
      return NextResponse.json(
        {
          error:
            'No valid recipient email addresses found. Please enter at least one recipient email address.',
        },
        { status: 400 }
      );
    }

    // Generate PDF report
    const pdfBytes = await generateSplitterReportPDF(session);
    const pdfBuffer = Buffer.from(pdfBytes);

    const smtpPort = parseInt(process.env.SMTP_PORT || '465');
    const isSecure = process.env.SMTP_SECURE !== undefined
      ? process.env.SMTP_SECURE === 'true'
      : smtpPort === 465;

    // Setup SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const totalSpend = session.expenses.reduce((s, e) => s + e.amount, 0);

    const mailOptions = {
      from: `"CapFlow Splitter" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@capflow.app'}>`,
      to: targetEmails.join(', '),
      subject: `CapFlow Expense & Split Audit Report: ${session.name} (${session.sessionId})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 32px 16px;">
          <div style="max-width: 580px; margin: 0 auto; background-color: #131b2e; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden;">
            <div style="background-color: #6366F1; padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px;">CAPFLOW SPLITTER</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 13px;">Official Group Financial Statement & Audit Ledger</p>
            </div>
            <div style="padding: 28px;">
              <h2 style="color: #ffffff; font-size: 18px; margin-top: 0;">Session: ${session.name}</h2>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">
                Here is the verified financial summary and settlement roadmap for your group session.
              </p>
              ${
                body.note
                  ? `
              <div style="background-color: #1e293b; border-left: 4px solid #6366F1; border-radius: 8px; padding: 12px 16px; margin: 16px 0;">
                <p style="color: #e2e8f0; font-size: 13px; margin: 0; font-style: italic;">
                  &ldquo;${String(body.note).replace(/</g, '&lt;').replace(/>/g, '&gt;')}&rdquo;
                </p>
              </div>
              `
                  : ''
              }
              
              <div style="background-color: #0b0f19; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <tr>
                    <td style="color: #64748b; padding: 6px 0;">Session ID:</td>
                    <td style="color: #6366F1; font-weight: bold; text-align: right; padding: 6px 0;">${session.sessionId}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 6px 0;">Date Range:</td>
                    <td style="color: #f8fafc; text-align: right; padding: 6px 0;">${session.startDate} to ${session.endDate}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 6px 0;">Total Group Spend:</td>
                    <td style="color: #10B981; font-weight: bold; text-align: right; padding: 6px 0;">${session.currency} ${totalSpend.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b; padding: 6px 0;">Participants:</td>
                    <td style="color: #f8fafc; text-align: right; padding: 6px 0;">${session.members.length} members</td>
                  </tr>
                </table>
              </div>

              <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
                The complete itemized ledger, individual net positions, and optimized "Who pays whom" settlement roadmap are attached as a tamper-evident PDF statement.
              </p>
            </div>
            <div style="background-color: #0b0f19; border-top: 1px solid #1e293b; padding: 16px; text-align: center; color: #64748b; font-size: 11px;">
              Generated securely by CapFlow · Local-First Finance Management
            </div>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `CapFlow_Split_${session.sessionId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions);
      return NextResponse.json({
        success: true,
        message: `Report statement PDF sent successfully to ${targetEmails.join(', ')}.`,
        recipients: targetEmails,
      });
    } else {
      // In development or when SMTP credentials not provided, report success with mock indicator
      return NextResponse.json({
        success: true,
        mock: true,
        message: `Report compiled successfully for ${targetEmails.join(', ')} (SMTP not configured in local environment).`,
        recipients: targetEmails,
      });
    }
  } catch (error: any) {
    console.error('Error sending split report email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send report email' },
      { status: 500 }
    );
  }
}
