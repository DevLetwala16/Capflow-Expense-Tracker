import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";
import nodemailer from "nodemailer";
import {
  generateTransactionStatementPDF,
  PDFTransactionItem,
} from "@/lib/email/transactionStatementPdf";

// ─── Shared email config ──────────────────────────────────────────────────────
const LOGO_URL =
  "https://drive.google.com/uc?export=view&id=1nkfmfUBXiqwKlRqRkp3mfax1s8sS78aJ";
const FOOTER_LOGO_URL =
  "https://drive.google.com/uc?export=view&id=1XIPqEBjWXv6rlkeMb8h47E-bppzbo8Wm";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface TransactionStatementRequestBody {
  periodLabel: string;
  startDate: string;
  endDate: string;
  transactions: PDFTransactionItem[];
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  fallbackEmail?: string;
  fallbackName?: string;
}

function formatINR(val: number): string {
  return "₹" + Math.abs(val).toLocaleString("en-IN");
}

function buildTransactionEmailHTML(
  recipientName: string,
  periodLabel: string,
  startDate: string,
  endDate: string,
  transactions: PDFTransactionItem[],
  totalIncome: number,
  totalExpense: number,
  netSavings: number
): string {
  const year = new Date().getFullYear();
  const displayName = recipientName ? recipientName.trim() : "there";
  const displayRows = transactions.slice(0, 10);
  const remainingCount = transactions.length - displayRows.length;

  const rowsHtml = displayRows
    .map((tx, idx) => {
      const isExpense = tx.type === "expense";
      const amtColor = isExpense ? "#ef4444" : "#10b981";
      const amtPrefix = isExpense ? "- " : "+ ";
      const bg = idx % 2 === 0 ? "#131b2e" : "#111827";

      return `
        <tr style="background-color: ${bg}; border-bottom: 1px solid #1f293d;">
          <td style="padding: 10px 14px; font-size: 12px; color: #94a3b8; white-space: nowrap;">
            ${tx.date}
          </td>
          <td style="padding: 10px 14px;">
            <div style="font-size: 13px; font-weight: 600; color: #f8fafc;">${tx.title}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${tx.category} • ${tx.paymentMethod}</div>
          </td>
          <td style="padding: 10px 14px; text-align: right; font-size: 13px; font-weight: 700; color: ${amtColor}; white-space: nowrap;">
            ${amtPrefix}${formatINR(tx.amount)}
          </td>
        </tr>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>CapFlow Transaction Statement</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e2e8f0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b0f19; width: 100%; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; margin: 0 auto; background-color: #111827; border: 1px solid #1f293d; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #111827 0%, #1e1b4b 100%); border-bottom: 1px solid #1f293d;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <img src="${LOGO_URL}" alt="CapFlow" width="44" height="44" style="display: block; width: 44px; height: 44px; border-radius: 10px; margin-bottom: 12px; object-fit: contain;" />
                    <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                      Transaction Statement
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #818cf8; font-weight: 500;">
                      ${periodLabel} (${startDate} to ${endDate})
                    </p>
                  </td>
                  <td align="right" valign="top">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; background-color: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.3); font-size: 11px; font-weight: 600; color: #a5b4fc;">
                      PDF Attached
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Welcome & Message -->
          <tr>
            <td style="padding: 24px 32px 16px 32px;">
              <p style="margin: 0 0 8px 0; font-size: 15px; color: #f8fafc; font-weight: 600;">
                Hi ${displayName},
              </p>
              <p style="margin: 0; font-size: 13.5px; line-height: 22px; color: #94a3b8;">
                Here is your requested transaction statement for <strong style="color: #f1f5f9;">${periodLabel}</strong>. A comprehensive official PDF report with itemized ledgers has been attached to this email.
              </p>
            </td>
          </tr>

          <!-- Summary KPI Cards -->
          <tr>
            <td style="padding: 8px 32px 24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="8" border="0" style="margin: 0 -8px;">
                <tr>
                  <td width="33%" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 14px 12px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Income</div>
                    <div style="font-size: 15px; font-weight: 700; color: #10b981; margin-top: 4px;">+${formatINR(totalIncome)}</div>
                  </td>
                  <td width="33%" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 14px 12px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Expense</div>
                    <div style="font-size: 15px; font-weight: 700; color: #ef4444; margin-top: 4px;">-${formatINR(totalExpense)}</div>
                  </td>
                  <td width="33%" style="background-color: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 14px 12px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Net</div>
                    <div style="font-size: 15px; font-weight: 700; color: ${netSavings >= 0 ? "#10b981" : "#ef4444"}; margin-top: 4px;">
                      ${netSavings >= 0 ? "+" : "-"}${formatINR(netSavings)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Transaction Preview Table -->
          <tr>
            <td style="padding: 0 32px 20px 32px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 12px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px;">
                  Activity Preview (${transactions.length} total)
                </span>
              </div>
              
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #1f293d; border-radius: 10px; overflow: hidden; border-collapse: separate;">
                <thead>
                  <tr style="background-color: #0f172a; border-bottom: 1px solid #1f293d;">
                    <th align="left" style="padding: 10px 14px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Date</th>
                    <th align="left" style="padding: 10px 14px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Transaction</th>
                    <th align="right" style="padding: 10px 14px; font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml || `<tr><td colspan="3" style="padding: 20px; text-align: center; color: #64748b; font-size: 13px;">No transactions recorded in this period.</td></tr>`}
                </tbody>
              </table>

              ${
                remainingCount > 0
                  ? `<p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b; text-align: center;">
                      + ${remainingCount} more transaction${remainingCount > 1 ? "s" : ""} included in the attached PDF statement.
                    </p>`
                  : ""
              }
            </td>
          </tr>

          <!-- PDF Attachment Banner -->
          <tr>
            <td style="padding: 0 32px 28px 32px;">
              <div style="background-color: #131b2e; border: 1px dashed #3b82f6; border-radius: 12px; padding: 14px 18px; text-align: center;">
                <p style="margin: 0; font-size: 13px; font-weight: 600; color: #60a5fa;">
                  📎 Official Statement PDF Attached
                </p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">
                  Check the attachment section below to download and print your complete itemized statement.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0d1321; border-top: 1px solid #1f293d; padding: 22px 32px; text-align: center;">
              <img src="${FOOTER_LOGO_URL}" alt="CapFlow" width="60" height="20" style="display: block; width: 60px; height: 20px; margin: 0 auto 8px; object-fit: contain;" />
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">
                &copy; ${year} CapFlow Financial Technologies. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                This statement was generated on request. Your data remains protected and encrypted.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body: TransactionStatementRequestBody = await req.json();
    const {
      periodLabel,
      startDate,
      endDate,
      transactions = [],
      totalIncome = 0,
      totalExpense = 0,
      netSavings = 0,
      fallbackEmail,
      fallbackName,
    } = body;

    if (!periodLabel || !startDate || !endDate) {
      return NextResponse.json(
        { error: "periodLabel, startDate, and endDate are required." },
        { status: 400 }
      );
    }

    // ── Resolve recipient (JWT first, fallback second) ────────────────────────
    let recipientEmail = "";
    let recipientName = "User";

    const token = req.cookies.get("capflow_token")?.value;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
          userId: string;
          email: string;
        };
        await connectMongoDB();
        const user = await User.findById(decoded.userId).select("email name").lean();
        if (user) {
          recipientEmail = (user as any).email;
          recipientName = (user as any).name ?? "User";
        }
      } catch {
        // JWT expired or invalid
      }
    }

    if (!recipientEmail && fallbackEmail) {
      recipientEmail = fallbackEmail;
      recipientName = fallbackName ?? "User";
    }

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in or provide a valid email address." },
        { status: 401 }
      );
    }

    // ── Generate PDF ──────────────────────────────────────────────────────────
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateTransactionStatementPDF({
        periodLabel,
        startDate,
        endDate,
        recipientName,
        recipientEmail,
        totalIncome,
        totalExpense,
        netSavings,
        transactions,
      });
    } catch (pdfErr) {
      console.error("[Transaction PDF generation failed]", pdfErr);
    }

    const safeFilename = `CapFlow_Statement_${periodLabel.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

    // ── Render HTML Email ─────────────────────────────────────────────────────
    const html = buildTransactionEmailHTML(
      recipientName,
      periodLabel,
      startDate,
      endDate,
      transactions,
      totalIncome,
      totalExpense,
      netSavings
    );

    // ── Send Email via Nodemailer ─────────────────────────────────────────────
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"CapFlow" <dev.lethwala@gmail.com>',
      to: recipientEmail,
      subject: `📊 Transaction Statement: ${periodLabel} (${transactions.length} records)`,
      html,
      attachments: pdfBuffer
        ? [
            {
              filename: safeFilename,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ]
        : undefined,
    });

    return NextResponse.json({
      ok: true,
      sentTo: recipientEmail,
      count: transactions.length,
      pdfAttached: !!pdfBuffer,
    });
  } catch (err: any) {
    console.error("[Transaction Statement API Error]:", err?.message ?? err);
    return NextResponse.json(
      { error: err?.message || "Failed to generate or send transaction statement." },
      { status: 500 }
    );
  }
}
