import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { requireAdmin, logAdminAction } from "@/lib/auth/adminAuth";

export const dynamic = "force-dynamic";

const LOGO_URL =
  "https://drive.google.com/uc?export=view&id=1nkfmfUBXiqwKlRqRkp3mfax1s8sS78aJ";
const FOOTER_LOGO_URL =
  "https://drive.google.com/uc?export=view&id=1XIPqEBjWXv6rlkeMb8h47E-bppzbo8Wm";

function buildCustomEmailHTML(recipientName: string, subject: string, bodyText: string): string {
  const year = new Date().getFullYear();
  const displayName = recipientName?.trim() || "User";

  // Convert basic linebreaks and markdown-like patterns to HTML
  const formattedBody = bodyText
    .split("\n\n")
    .map((paragraph) => {
      let p = paragraph.trim();
      if (!p) return "";
      // Bold
      p = p.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #ffffff;">$1</strong>');
      // Links
      p = p.replace(
        /\[(.*?)\]\((.*?)\)/g,
        '<a href="$2" style="color: #6366f1; text-decoration: underline;">$1</a>'
      );
      // Code / Highlights
      p = p.replace(
        /`(.*?)`/g,
        '<code style="background-color: #1f2937; color: #a5b4fc; padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>'
      );
      return `<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #cbd5e1;">${p.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>${subject}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; width: 100% !important; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    table, td { border-collapse: collapse; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b0f19; width: 100%; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 32px 32px 20px 32px; background: linear-gradient(180deg, #161f33 0%, #111827 100%);">
              <img src="${LOGO_URL}" alt="CapFlow Logo" width="56" height="56" style="display: block; width: 56px; height: 56px; border-radius: 12px; margin: 0 auto 14px; object-fit: contain;" />
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.2px;">
                CapFlow Support & Announcements
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #818cf8; font-weight: 500;">
                Official Communication &bull; Team Softcapphyjas
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #1f2937; width: 100%;"></div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 28px 32px 24px 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 600; color: #f8fafc;">
                Hello ${displayName},
              </p>

              <div style="margin-bottom: 24px;">
                ${formattedBody}
              </div>

              <!-- Admin Signoff Box -->
              <div style="background-color: #0d1321; border-left: 3px solid #6366f1; border-radius: 6px; padding: 14px 16px; margin: 24px 0 20px 0;">
                <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
                  This message was sent directly to you by the CapFlow Administration Team (<a href="mailto:capflow@softcapphyjas.com" style="color: #818cf8; text-decoration: none;">capflow@softcapphyjas.com</a>).
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #94a3b8;">
                Best regards,<br />
                <span style="color: #e2e8f0; font-weight: 600;">CapFlow Support & Administration</span><br/>
                <span style="color: #64748b; font-size: 12px;">Softcapphyjas Technologies</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0d1321; border-top: 1px solid #1f2937; padding: 20px 32px; text-align: center;">
              <img src="${FOOTER_LOGO_URL}" alt="CapFlow" width="64" height="22" style="display: block; width: 64px; height: 22px; margin: 0 auto 8px; object-fit: contain;" />
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">
                &copy; ${year} Softcapphyjas Pvt. Ltd. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                CapFlow &bull; Private & Secure Personal Finance Management
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
  const auth = requireAdmin(req);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  try {
    const { recipientEmail, recipientName, subject, body, templateType } = await req.json();

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json({ error: "Valid recipient email is required" }, { status: 400 });
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: "Subject line is required" }, { status: 400 });
    }

    if (!body || !body.trim()) {
      return NextResponse.json({ error: "Email body content is required" }, { status: 400 });
    }

    const html = buildCustomEmailHTML(recipientName || "", subject.trim(), body.trim());

    // Setup nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"CapFlow Support" <dev.lethwala@gmail.com>',
      to: recipientEmail.trim(),
      replyTo: "capflow@softcapphyjas.com",
      subject: subject.trim(),
      text: body.trim(),
      html,
    });

    // Record in Audit Log
    await logAdminAction({
      action: "EMAIL_DISPATCHED",
      adminEmail: auth.admin.email,
      targetType: "Email",
      targetId: recipientEmail.trim(),
      details: {
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName || "User",
        subject: subject.trim(),
        templateType: templateType || "custom",
        messageId: info.messageId,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Email dispatched successfully to ${recipientEmail}`,
      messageId: info.messageId,
    });
  } catch (error: any) {
    console.error("Admin send email error:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Failed to dispatch email. Please verify SMTP credentials.",
      },
      { status: 500 }
    );
  }
}
