import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectMongoDB } from "@/lib/mongodb/connection";
import User from "@/lib/mongodb/userModel";
import nodemailer from "nodemailer";
import { generateEMIStatementPDF } from "@/lib/email/statementPdf";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EMIEmailRequestBody {
  type: "reminder" | "statement";
  // EMI data (always required)
  emiName: string;
  monthlyCost: number;
  totalCost: number;
  dueDay: number;
  startDate: string;       // "YYYY-MM-DD"
  totalInstallments: number;
  paidInstallments: number;
  reminderLeadDays: number;
  // Fallback user data (used only when no JWT cookie — dev / guest)
  fallbackEmail?: string;
  fallbackName?: string;
}

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

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Build installment timeline ───────────────────────────────────────────────

interface Installment {
  number: number;
  dueDate: string;    // display string
  status: "paid" | "pending" | "overdue";
}

function buildInstallmentTimeline(
  startDate: string,
  dueDay: number,
  totalInstallments: number,
  paidInstallments: number
): Installment[] {
  const installments: Installment[] = [];
  const today = new Date();

  // Start from the month of startDate
  const [sy, sm] = startDate.split("-").map(Number);

  for (let i = 0; i < totalInstallments; i++) {
    // Calculate the due date for this installment
    const year = sy + Math.floor((sm - 1 + i) / 12);
    const month = ((sm - 1 + i) % 12) + 1;

    // Clamp dueDay to last day of month
    const lastDay = new Date(year, month, 0).getDate();
    const day = Math.min(dueDay, lastDay);
    const dueDate = new Date(year, month - 1, day);

    let status: "paid" | "pending" | "overdue";
    if (i < paidInstallments) {
      status = "paid";
    } else if (dueDate < today) {
      status = "overdue";
    } else {
      status = "pending";
    }

    installments.push({
      number: i + 1,
      dueDate: dueDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      status,
    });
  }

  return installments;
}

// ─── Reminder email HTML ──────────────────────────────────────────────────────

function buildReminderHTML(
  name: string,
  emiName: string,
  monthlyCost: number,
  dueDay: number
): string {
  const year = new Date().getFullYear();
  const displayName = name.trim() || "there";
  const month = new Date().toLocaleString("default", { month: "long" });
  const dueDateStr = `${ordinal(dueDay)} ${month} ${year}`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>EMI Due Reminder</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b0f19;width:100%;min-height:100vh;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="max-width:480px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr><td align="center" style="padding:28px 32px 12px;">
          <img src="${LOGO_URL}" alt="CapFlow" width="48" height="48"
            style="display:block;border-radius:10px;margin:0 auto 12px;"/>
          <h1 style="margin:0;font-size:18px;font-weight:700;color:#fff;">EMI Due Reminder</h1>
          <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">CapFlow Financial Tracker</p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:#1f2937;"></div></td></tr>

        <!-- Body -->
        <tr><td style="padding:24px 32px 28px;">
          <p style="margin:0 0 8px;font-size:14px;color:#e2e8f0;">Hi ${displayName},</p>
          <p style="margin:0 0 20px;font-size:13px;line-height:22px;color:#94a3b8;">
            Your <strong style="color:#38bdf8;">${emiName}</strong> EMI payment is coming up soon.
            Make sure your account is funded before the due date.
          </p>

          <!-- Amount Box -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
            <tr><td style="background:#0b0f19;border:1px solid #334155;border-radius:12px;padding:18px 16px;text-align:center;">
              <p style="margin:0 0 4px;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;">Amount Due</p>
              <p style="margin:0 0 6px;font-size:34px;font-weight:800;color:#38bdf8;">
                &#8377;${monthlyCost.toLocaleString("en-IN")}
              </p>
              <p style="margin:0;font-size:12px;color:#64748b;">Due on ${dueDateStr}</p>
            </td></tr>
          </table>

          <!-- Reminder tip -->
          <div style="background:#0d1321;border-left:3px solid #38bdf8;border-radius:4px;padding:10px 14px;margin-bottom:20px;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:18px;">
              <strong style="color:#e2e8f0;">Tip:</strong> Set up auto-debit to avoid missing payments and late fees.
            </p>
          </div>

          <p style="margin:0;font-size:12px;color:#94a3b8;">
            Best regards,<br/>
            <span style="color:#e2e8f0;font-weight:600;">Team CapFlow</span>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0d1321;border-top:1px solid #1f2937;padding:16px 32px;text-align:center;">
          <img src="${FOOTER_LOGO_URL}" alt="CapFlow" width="60" height="20"
            style="display:block;margin:0 auto 8px;object-fit:contain;"/>
          <p style="margin:0;font-size:10px;color:#475569;">
            &copy; ${year} Softcapphyjas Pvt. Ltd. All rights reserved.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Statement email HTML ─────────────────────────────────────────────────────

function buildStatementHTML(
  name: string,
  emi: {
    emiName: string;
    monthlyCost: number;
    totalCost: number;
    dueDay: number;
    startDate: string;
    totalInstallments: number;
    paidInstallments: number;
  },
  installments: Installment[]
): string {
  const year = new Date().getFullYear();
  const displayName = name.trim() || "there";
  const paidAmount = emi.paidInstallments * emi.monthlyCost;
  const remainingAmount = emi.totalCost - paidAmount;
  const progressPct = Math.round(
    (emi.paidInstallments / emi.totalInstallments) * 100
  );

  // Build installment rows — show all paid + next 3 pending
  const paidRows = installments.filter((i) => i.status === "paid");
  const overdueRows = installments.filter((i) => i.status === "overdue");
  const pendingRows = installments
    .filter((i) => i.status === "pending")
    .slice(0, 3);

  const renderRows = [...paidRows, ...overdueRows, ...pendingRows];
  const hasMore =
    installments.length - paidRows.length - overdueRows.length - 3 > 0;

  const statusDot: Record<string, string> = {
    paid: "#10B981",
    overdue: "#EF4444",
    pending: "#64748b",
  };
  const statusLabel: Record<string, string> = {
    paid: "✅ Paid",
    overdue: "⚠️ Overdue",
    pending: "⏳ Pending",
  };

  const tableRows = renderRows
    .map(
      (inst) => `
    <tr>
      <td style="padding:8px 12px;font-size:12px;color:#94a3b8;border-bottom:1px solid #1f2937;">#${inst.number}</td>
      <td style="padding:8px 12px;font-size:12px;color:#e2e8f0;border-bottom:1px solid #1f2937;">${inst.dueDate}</td>
      <td style="padding:8px 12px;font-size:12px;color:#e2e8f0;border-bottom:1px solid #1f2937;">&#8377;${emi.monthlyCost.toLocaleString("en-IN")}</td>
      <td style="padding:8px 12px;font-size:12px;font-weight:600;color:${statusDot[inst.status]};border-bottom:1px solid #1f2937;">${statusLabel[inst.status]}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>EMI Statement</title>
</head>
<body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:#0b0f19;width:100%;min-height:100vh;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        style="max-width:520px;margin:0 auto;background:#111827;border:1px solid #1f2937;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr><td align="center" style="padding:28px 32px 12px;">
          <img src="${LOGO_URL}" alt="CapFlow" width="48" height="48"
            style="display:block;border-radius:10px;margin:0 auto 12px;"/>
          <h1 style="margin:0;font-size:18px;font-weight:700;color:#fff;">EMI Statement</h1>
          <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">
            ${emi.emiName} &bull; ${formatDate(emi.startDate)} → Today
          </p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:#1f2937;"></div></td></tr>

        <!-- Summary cards -->
        <tr><td style="padding:20px 32px 0;">
          <p style="margin:0 0 10px;font-size:13px;color:#e2e8f0;">Hi ${displayName},</p>
          <p style="margin:0 0 16px;font-size:12px;color:#94a3b8;line-height:20px;">
            Here is the complete payment statement for your
            <strong style="color:#38bdf8;">${emi.emiName}</strong> EMI from
            ${formatDate(emi.startDate)} to today.
          </p>

          <!-- PDF Attached Notice -->
          <div style="background:#0d1321;border-left:3px solid #6366F1;border-radius:6px;padding:10px 14px;margin-bottom:18px;">
            <p style="margin:0;font-size:12px;color:#cbd5e1;line-height:18px;">
              <strong style="color:#fff;">PDF Statement Attached:</strong> An official loan statement PDF is attached to this email for your financial records.
            </p>
          </div>

          <!-- 3-stat row -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
            <tr>
              <td width="33%" style="text-align:center;padding:10px 4px;background:#0b0f19;border-radius:10px;">
                <p style="margin:0 0 3px;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Total EMI</p>
                <p style="margin:0;font-size:16px;font-weight:800;color:#e2e8f0;">&#8377;${emi.totalCost.toLocaleString("en-IN")}</p>
              </td>
              <td width="2%"></td>
              <td width="33%" style="text-align:center;padding:10px 4px;background:#10B98118;border-radius:10px;">
                <p style="margin:0 0 3px;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Paid So Far</p>
                <p style="margin:0;font-size:16px;font-weight:800;color:#10B981;">&#8377;${paidAmount.toLocaleString("en-IN")}</p>
              </td>
              <td width="2%"></td>
              <td width="33%" style="text-align:center;padding:10px 4px;background:#EF444418;border-radius:10px;">
                <p style="margin:0 0 3px;font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Remaining</p>
                <p style="margin:0;font-size:16px;font-weight:800;color:#EF4444;">&#8377;${remainingAmount.toLocaleString("en-IN")}</p>
              </td>
            </tr>
          </table>

          <!-- Progress bar -->
          <div style="background:#1f2937;border-radius:99px;height:8px;overflow:hidden;margin-bottom:6px;">
            <div style="background:#6366F1;height:8px;width:${progressPct}%;border-radius:99px;"></div>
          </div>
          <p style="margin:0 0 20px;font-size:11px;color:#64748b;text-align:right;">
            ${emi.paidInstallments} of ${emi.totalInstallments} installments paid (${progressPct}%)
          </p>

          <!-- EMI meta -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
            style="background:#0b0f19;border:1px solid #1f2937;border-radius:10px;margin-bottom:20px;">
            <tr>
              <td style="padding:10px 14px;font-size:12px;color:#64748b;border-bottom:1px solid #1f2937;">Monthly EMI</td>
              <td style="padding:10px 14px;font-size:12px;color:#e2e8f0;font-weight:600;text-align:right;border-bottom:1px solid #1f2937;">&#8377;${emi.monthlyCost.toLocaleString("en-IN")}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-size:12px;color:#64748b;border-bottom:1px solid #1f2937;">Due Date</td>
              <td style="padding:10px 14px;font-size:12px;color:#e2e8f0;font-weight:600;text-align:right;border-bottom:1px solid #1f2937;">${ordinal(emi.dueDay)} of every month</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;font-size:12px;color:#64748b;">Start Date</td>
              <td style="padding:10px 14px;font-size:12px;color:#e2e8f0;font-weight:600;text-align:right;">${formatDate(emi.startDate)}</td>
            </tr>
          </table>
        </td></tr>

        <!-- Installment Table -->
        <tr><td style="padding:0 32px 24px;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#e2e8f0;text-transform:uppercase;letter-spacing:0.5px;">
            Payment History
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
            style="background:#0b0f19;border:1px solid #1f2937;border-radius:10px;overflow:hidden;">
            <!-- Table header -->
            <tr style="background:#0d1321;">
              <td style="padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">#</td>
              <td style="padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Due Date</td>
              <td style="padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Amount</td>
              <td style="padding:8px 12px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#64748b;">Status</td>
            </tr>
            ${tableRows}
            ${
              hasMore
                ? `<tr><td colspan="4" style="padding:8px 12px;font-size:11px;color:#64748b;text-align:center;">
                + ${installments.length - renderRows.length} more pending installments
              </td></tr>`
                : ""
            }
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#0d1321;border-top:1px solid #1f2937;padding:16px 32px;text-align:center;">
          <img src="${FOOTER_LOGO_URL}" alt="CapFlow" width="60" height="20"
            style="display:block;margin:0 auto 8px;object-fit:contain;"/>
          <p style="margin:0;font-size:10px;color:#475569;">
            &copy; ${year} Softcapphyjas Pvt. Ltd. All rights reserved.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── POST /api/emis/email ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── 1. Parse body ────────────────────────────────────────────────────────
    let body: EMIEmailRequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      type,
      emiName,
      monthlyCost,
      totalCost,
      dueDay,
      startDate,
      totalInstallments,
      paidInstallments,
      reminderLeadDays,
      fallbackEmail,
      fallbackName,
    } = body;

    // ── 2. Validate required EMI fields ──────────────────────────────────────
    if (!type || !["reminder", "statement"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'reminder' or 'statement'" },
        { status: 400 }
      );
    }
    if (!emiName?.trim()) {
      return NextResponse.json({ error: "emiName is required" }, { status: 400 });
    }

    // ── 3. Resolve recipient — JWT cookie first, fallback to body email ──────
    let recipientEmail = "";
    let recipientName = "there";

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
          recipientName = (user as any).name ?? "there";
        }
      } catch {
        // JWT invalid/expired — fall through to fallback
      }
    }

    // Fallback: use email provided in request body (self-service: user sends to themselves)
    if (!recipientEmail && fallbackEmail) {
      recipientEmail = fallbackEmail;
      recipientName = fallbackName ?? "there";
    }

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to send EMI emails." },
        { status: 401 }
      );
    }

    // ── 4. Build and send the appropriate email ──────────────────────────────
    if (type === "reminder") {
      // ── REMINDER: simple due-date alert ─────────────────────────────────
      const html = buildReminderHTML(
        recipientName,
        emiName.trim(),
        monthlyCost,
        dueDay
      );

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"CapFlow" <dev.lethwala@gmail.com>',
        to: recipientEmail,
        subject: `⏰ Reminder: ${emiName} EMI due on ${ordinal(dueDay)}`,
        html,
      });

      return NextResponse.json({
        ok: true,
        type: "reminder",
        sentTo: recipientEmail,
      });
    } else {
      // ── STATEMENT: full installment history from start to today ─────────
      const installments = buildInstallmentTimeline(
        startDate,
        dueDay,
        totalInstallments,
        paidInstallments
      );

      const html = buildStatementHTML(recipientName, body, installments);

      // Generate the official PDF statement attachment
      let pdfBuffer: Buffer | null = null;
      try {
        pdfBuffer = await generateEMIStatementPDF({
          emiName,
          monthlyCost,
          totalCost,
          dueDay,
          startDate,
          totalInstallments,
          paidInstallments,
          recipientName,
          recipientEmail,
          installments,
        });
      } catch (pdfErr) {
        console.error("[EMI PDF generation failed]", pdfErr);
      }

      const safeFilename = `${emiName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Statement.pdf`;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"CapFlow" <dev.lethwala@gmail.com>',
        to: recipientEmail,
        subject: `📋 EMI Statement: ${emiName} (${paidInstallments}/${totalInstallments} paid)`,
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
        type: "statement",
        sentTo: recipientEmail,
        pdfAttached: !!pdfBuffer,
        installmentsSent: installments.length,
        paidInstallments,
        remainingAmount: totalCost - paidInstallments * monthlyCost,
      });
    }
  } catch (err: any) {
    console.error("[EMI email] Error:", err?.message ?? err);
    return NextResponse.json(
      {
        error:
          "Failed to send email. Check SMTP configuration in .env.local.",
      },
      { status: 500 }
    );
  }
}
