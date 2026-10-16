import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

// ─── Types ────────────────────────────────────────────────────────────────────
type FeedbackCategory = "bug" | "feature" | "general";

interface FeedbackPayload {
  category: FeedbackCategory;
  subject: string;
  message: string;
  userEmail?: string;
  userName?: string;
  contactConsent: boolean;
}

// ─── SMTP Transporter (mirrors lib/email/mailer.ts exactly) ──────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,
  maxConnections: 5,
});

// ─── Assets (same Google Drive URLs as mailer.ts) ────────────────────────────
const LOGO_URL =
  "https://drive.google.com/uc?export=view&id=1nkfmfUBXiqwKlRqRkp3mfax1s8sS78aJ";
const FOOTER_LOGO_URL =
  "https://drive.google.com/uc?export=view&id=1XIPqEBjWXv6rlkeMb8h47E-bppzbo8Wm";

// ─── Category display helpers ─────────────────────────────────────────────────
const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "🐛 Bug Report",
  feature: "✨ Feature Request",
  general: "💬 General Feedback",
};

const CATEGORY_COLORS: Record<FeedbackCategory, string> = {
  bug: "#EF4444",
  feature: "#6366F1",
  general: "#10B981",
};

// ─── Support Email HTML ───────────────────────────────────────────────────────
function buildSupportEmailHTML(payload: FeedbackPayload, timestamp: string): string {
  const { category, subject, message, userEmail, userName, contactConsent } = payload;
  const year = new Date().getFullYear();
  const categoryLabel = CATEGORY_LABELS[category];
  const categoryColor = CATEGORY_COLORS[category];
  const displayUser = userName?.trim() || "Anonymous";
  const displayEmail = userEmail?.trim() || "Not provided";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="dark" />
  <title>CapFlow Feedback — ${categoryLabel}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #0b0f19; }
    @media only screen and (max-width: 520px) {
      .card-container { width: 100% !important; max-width: 100% !important; }
      .card-padding { padding: 28px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b0f19; width: 100%; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" class="card-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 32px 32px 16px 32px;">
              <img src="${LOGO_URL}" alt="CapFlow Logo" width="48" height="48" style="display: block; width: 48px; height: 48px; border-radius: 10px; margin: 0 auto 12px; object-fit: contain;" />
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">New Feedback Received</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">CapFlow Support Inbox</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #1f2937; width: 100%;"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="card-padding" style="padding: 24px 32px 32px 32px;">

              <!-- Category Badge -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: ${categoryColor}22; border: 1px solid ${categoryColor}55; border-radius: 999px; padding: 4px 14px; font-size: 12px; font-weight: 600; color: ${categoryColor}; letter-spacing: 0.3px;">
                      ${categoryLabel}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Subject -->
              <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; font-weight: 600;">Subject</p>
              <p style="margin: 0 0 20px 0; font-size: 16px; font-weight: 700; color: #e2e8f0;">${subject}</p>

              <!-- Message -->
              <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; font-weight: 600;">Message</p>
              <div style="background-color: #0b0f19; border: 1px solid #1f2937; border-radius: 10px; padding: 16px 18px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; line-height: 22px; color: #cbd5e1; white-space: pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
              </div>

              <!-- Sender Info -->
              <p style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; font-weight: 600;">Sender Info</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #1f2937; border-radius: 10px; overflow: hidden; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #1f2937; font-size: 12px; color: #64748b; width: 110px;">Name</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #1f2937; font-size: 13px; color: #e2e8f0;">${displayUser}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #1f2937; font-size: 12px; color: #64748b;">Email</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #1f2937; font-size: 13px; color: #38bdf8;">${displayEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #1f2937; font-size: 12px; color: #64748b;">Contact OK?</td>
                  <td style="padding: 10px 14px; border-bottom: 1px solid #1f2937; font-size: 13px; color: ${contactConsent ? "#10B981" : "#EF4444"};">${contactConsent ? "✓ Yes" : "✗ No"}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 14px; font-size: 12px; color: #64748b;">Received At</td>
                  <td style="padding: 10px 14px; font-size: 13px; color: #94a3b8;">${timestamp}</td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #475569;">
                This ticket was submitted via the CapFlow in-app feedback form.
                ${contactConsent && userEmail ? `The sender has consented to be contacted at <strong style="color: #94a3b8;">${userEmail}</strong>.` : "The sender has not consented to follow-up contact."}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0d1321; border-top: 1px solid #1f2937; padding: 18px 32px; text-align: center;">
              <img src="${FOOTER_LOGO_URL}" alt="CapFlow" width="64" height="22" style="display: block; width: 64px; height: 22px; margin: 0 auto 8px; object-fit: contain;" />
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">&copy; ${year} Softcapphyjas Pvt. Ltd. All rights reserved.</p>
              <p style="margin: 0; font-size: 11px; color: #475569;">Internal support notification — do not forward externally.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Auto-Responder HTML ──────────────────────────────────────────────────────
function buildAutoResponderHTML(
  displayName: string,
  subject: string,
  category: FeedbackCategory,
): string {
  const year = new Date().getFullYear();
  const categoryLabel = CATEGORY_LABELS[category];
  const categoryColor = CATEGORY_COLORS[category];

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="dark" />
  <title>We received your feedback — CapFlow</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #0b0f19; }
    @media only screen and (max-width: 520px) {
      .card-container { width: 100% !important; max-width: 100% !important; }
      .card-padding { padding: 28px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b0f19; width: 100%; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" class="card-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding: 32px 32px 16px 32px;">
              <img src="${LOGO_URL}" alt="CapFlow Logo" width="56" height="56" style="display: block; width: 56px; height: 56px; border-radius: 12px; margin: 0 auto 16px; object-fit: contain;" />
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.2px;">Thanks for your feedback!</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">Softcapphyjas Support</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 16px 32px 0 32px;">
              <div style="height: 1px; background-color: #1f2937; width: 100%;"></div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="card-padding" style="padding: 24px 32px 32px 32px;">
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #e2e8f0; font-weight: 500;">
                Hi ${displayName},
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                We've received your submission and our team will review it shortly. Here's a quick summary of what you sent us:
              </p>

              <!-- Summary box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #0b0f19; border: 1px solid #1f2937; border-radius: 12px; padding: 16px 18px;">
                    <p style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; font-weight: 600;">Category</p>
                    <span style="display: inline-block; background-color: ${categoryColor}22; border: 1px solid ${categoryColor}55; border-radius: 999px; padding: 3px 12px; font-size: 12px; font-weight: 600; color: ${categoryColor}; margin-bottom: 12px;">
                      ${categoryLabel}
                    </span>
                    <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; font-weight: 600;">Subject</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 600; color: #e2e8f0;">${subject}</p>
                  </td>
                </tr>
              </table>

              <!-- Info callout -->
              <div style="background-color: #0d1321; border-left: 3px solid #6366F1; border-radius: 4px; padding: 12px 14px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
                  <strong style="color: #e2e8f0;">What happens next?</strong> Our team reviews every piece of feedback personally. If we have follow-up questions or updates related to your submission, we'll reach out at this email address.
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #94a3b8;">
                Thank you for helping us improve CapFlow. We truly appreciate it!<br /><br />
                Warm regards,<br />
                <span style="color: #e2e8f0; font-weight: 600;">Team Softcapphyjas</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0d1321; border-top: 1px solid #1f2937; padding: 20px 32px; text-align: center;">
              <img src="${FOOTER_LOGO_URL}" alt="CapFlow" width="70" height="24" style="display: block; width: 70px; height: 24px; margin: 0 auto 10px; object-fit: contain;" />
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">&copy; ${year} Softcapphyjas Pvt. Ltd. All rights reserved.</p>
              <p style="margin: 0; font-size: 11px; color: #475569;">This is an automated confirmation. Please do not reply directly to this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Plain-text fallbacks ─────────────────────────────────────────────────────
function buildSupportEmailText(payload: FeedbackPayload, timestamp: string): string {
  const { category, subject, message, userEmail, userName, contactConsent } = payload;
  return [
    "CapFlow — New Feedback Submission",
    "=".repeat(50),
    "",
    `Category  : ${CATEGORY_LABELS[category]}`,
    `Subject   : ${subject}`,
    "",
    "Message:",
    "-".repeat(40),
    message,
    "-".repeat(40),
    "",
    `Sender    : ${userName?.trim() || "Anonymous"}`,
    `Email     : ${userEmail?.trim() || "Not provided"}`,
    `Contact?  : ${contactConsent ? "Yes" : "No"}`,
    `Received  : ${timestamp}`,
    "",
    "This ticket was submitted via the CapFlow in-app feedback form.",
  ].join("\n");
}

function buildAutoResponderText(
  displayName: string,
  subject: string,
  category: FeedbackCategory,
): string {
  return [
    "CapFlow — We received your feedback!",
    "=".repeat(50),
    "",
    `Hi ${displayName},`,
    "",
    "Thank you for reaching out! We've received your submission and our team will review it shortly.",
    "",
    `Category : ${CATEGORY_LABELS[category]}`,
    `Subject  : ${subject}`,
    "",
    "What happens next?",
    "Our team reviews every piece of feedback personally.",
    "If we have follow-up questions, we'll reach out at this email address.",
    "",
    "We truly appreciate your help in improving CapFlow!",
    "",
    "Warm regards,",
    "Team Softcapphyjas",
    "Softcapphyjas Pvt. Ltd.",
  ].join("\n");
}

// ─── POST /api/feedback ───────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Parse body
  let body: Partial<FeedbackPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const { category, subject, message, userEmail, userName, contactConsent } = body;

  // 2. Validate and normalize category (handles 'bug', 'Bug Report', 'feature', etc.)
  function normalizeCategory(cat: unknown): FeedbackCategory | null {
    if (typeof cat !== "string") return null;
    const c = cat.toLowerCase().trim();
    if (c.includes("bug")) return "bug";
    if (c.includes("feat")) return "feature";
    if (c.includes("gen") || c.includes("feed")) return "general";
    return null;
  }

  const safeCategory = normalizeCategory(category);
  if (!safeCategory) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid or missing 'category'. Must be one of: Bug Report, Feature Request, General Feedback.",
      },
      { status: 422 },
    );
  }

  if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
    return NextResponse.json(
      { success: false, message: "Field 'subject' is required and must not be empty." },
      { status: 422 },
    );
  }

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { success: false, message: "Field 'message' is required and must not be empty." },
      { status: 422 },
    );
  }

  const safeContactConsent = Boolean(contactConsent);

  // 3. Prepare values
  const safeSubject = subject.trim();
  const safeMessage = message.trim();
  const safeName = userName?.trim() || "Anonymous";
  const timestamp = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "long",
    timeStyle: "medium",
  });

  const supportAddress =
    process.env.SUPPORT_EMAIL || process.env.SMTP_USER || "dev.lethwala@gmail.com";
  const fromAddress =
    process.env.EMAIL_FROM || '"CapFlow" <dev.lethwala@gmail.com>';

  const validatedPayload: FeedbackPayload = {
    category: safeCategory,
    subject: safeSubject,
    message: safeMessage,
    userEmail: userEmail?.trim(),
    userName: safeName,
    contactConsent: safeContactConsent,
  };

  try {
    // 4a. Send formatted feedback directly to company support email
    await transporter.sendMail({
      from: fromAddress,
      to: supportAddress,
      replyTo: userEmail?.trim() || undefined,
      subject: `[${CATEGORY_LABELS[safeCategory]}] ${safeSubject}`,
      text: buildSupportEmailText(validatedPayload, timestamp),
      html: buildSupportEmailHTML(validatedPayload, timestamp),
    });
    console.info(`[Feedback] Support email successfully sent to company → ${supportAddress} (category: ${safeCategory})`);

    // 4b. Send auto-responder to user (if consent given and email provided, non-blocking)
    if (safeContactConsent && userEmail?.trim()) {
      try {
        await transporter.sendMail({
          from: fromAddress,
          to: userEmail.trim(),
          subject: "We received your feedback — CapFlow",
          text: buildAutoResponderText(safeName, safeSubject, safeCategory),
          html: buildAutoResponderHTML(safeName, safeSubject, safeCategory),
        });
        console.info(`[Feedback] Auto-responder sent → ${userEmail.trim()}`);
      } catch (autoErr) {
        console.warn(`[Feedback] Auto-responder delivery warning:`, autoErr);
      }
    }

    // 5. Success response
    return NextResponse.json(
      { success: true, message: "Feedback sent successfully." },
      { status: 200 },
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown mailer error.";
    console.error(`[Feedback] Mailer error:`, errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: `Failed to send feedback: ${errorMessage}`,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}

// ─── Method guard ─────────────────────────────────────────────────────────────
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed. Use POST." },
    { status: 405 },
  );
}
