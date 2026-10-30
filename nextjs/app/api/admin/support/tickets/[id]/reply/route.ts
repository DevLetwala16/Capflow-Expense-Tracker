import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { requireAdmin, logAdminAction } from "@/lib/auth/adminAuth";
import { connectMongoDB } from "@/lib/mongodb/connection";
import SupportTicket from "@/lib/mongodb/supportTicketModel";

export const dynamic = "force-dynamic";

const LOGO_URL =
  "https://drive.google.com/uc?export=view&id=1nkfmfUBXiqwKlRqRkp3mfax1s8sS78aJ";
const FOOTER_LOGO_URL =
  "https://drive.google.com/uc?export=view&id=1XIPqEBjWXv6rlkeMb8h47E-bppzbo8Wm";

function buildTicketReplyEmailHTML(
  userName: string,
  ticketId: string,
  subject: string,
  replyText: string
): string {
  const year = new Date().getFullYear();
  const displayName = userName?.trim() || "there";

  const formattedReply = replyText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("<br/>");

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="dark" />
  <title>Re: [${ticketId}] ${subject}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; width: 100% !important; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b0f19; width: 100%; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 36px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 28px 32px 18px 32px; background: linear-gradient(180deg, #182235 0%, #111827 100%);">
              <img src="${LOGO_URL}" alt="CapFlow" width="52" height="52" style="display: block; width: 52px; height: 52px; border-radius: 12px; margin: 0 auto 12px; object-fit: contain;" />
              <h1 style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff;">
                CapFlow Customer Support
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #818cf8; font-weight: 600;">
                Case Reference: #${ticketId}
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #1f2937; width: 100%;"></div>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 14px 0; font-size: 14px; font-weight: 600; color: #f1f5f9;">
                Hello ${displayName},
              </p>
              
              <p style="margin: 0 0 16px 0; font-size: 13px; color: #94a3b8;">
                Our administration and support team has responded to your inquiry regarding <strong>"${subject}"</strong>:
              </p>

              <div style="background-color: #0d1321; border-left: 3px solid #6366f1; border-radius: 6px; padding: 16px 18px; margin: 16px 0 20px 0;">
                <p style="margin: 0; font-size: 14px; line-height: 22px; color: #e2e8f0;">
                  ${formattedReply}
                </p>
              </div>

              <p style="margin: 0 0 8px 0; font-size: 12px; line-height: 18px; color: #64748b;">
                You can reply directly to this email or access the CapFlow web portal to view your case updates.
              </p>

              <p style="margin: 16px 0 0 0; font-size: 13px; color: #94a3b8;">
                Best regards,<br />
                <span style="color: #e2e8f0; font-weight: 600;">CapFlow Support Desk</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0d1321; border-top: 1px solid #1f2937; padding: 16px 32px; text-align: center;">
              <img src="${FOOTER_LOGO_URL}" alt="CapFlow" width="60" height="20" style="display: block; width: 60px; height: 20px; margin: 0 auto 6px; object-fit: contain;" />
              <p style="margin: 0; font-size: 11px; color: #64748b;">&copy; ${year} Softcapphyjas Pvt. Ltd. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireAdmin(req);
  if ("errorResponse" in auth) {
    return auth.errorResponse;
  }

  try {
    const { id } = params;
    const { message, updateStatusTo } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Reply message cannot be empty" }, { status: 400 });
    }

    await connectMongoDB();

    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    const newMessage = {
      sender: "admin" as const,
      senderEmail: auth.admin.email,
      senderName: "CapFlow Support Desk",
      message: message.trim(),
      createdAt: new Date(),
    };

    ticket.messages.push(newMessage);
    ticket.lastRepliedBy = "admin";

    if (updateStatusTo && ["open", "in_progress", "resolved"].includes(updateStatusTo)) {
      ticket.status = updateStatusTo;
      if (updateStatusTo === "resolved") {
        ticket.resolvedAt = new Date();
      }
    }

    await ticket.save();

    // Send email to user
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "465"),
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const html = buildTicketReplyEmailHTML(
        ticket.userName,
        ticket.ticketId,
        ticket.subject,
        message.trim()
      );

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"CapFlow Support" <dev.lethwala@gmail.com>',
        to: ticket.userEmail,
        replyTo: "capflow@softcapphyjas.com",
        subject: `Re: [${ticket.ticketId}] ${ticket.subject}`,
        text: message.trim(),
        html,
      });
    } catch (mailErr) {
      console.warn("[SupportTicketReply] Could not send notification email:", mailErr);
    }

    // Audit log
    await logAdminAction({
      action: "TICKET_REPLIED",
      adminEmail: auth.admin.email,
      targetType: "Ticket",
      targetId: ticket.ticketId,
      details: {
        ticketId: ticket.ticketId,
        recipient: ticket.userEmail,
        messagePreview: message.trim().slice(0, 100),
        status: ticket.status,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Reply sent and recorded successfully",
      ticket,
    });
  } catch (error: any) {
    console.error("Support ticket reply error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to submit reply" },
      { status: 500 }
    );
  }
}
