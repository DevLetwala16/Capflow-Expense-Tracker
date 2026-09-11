import nodemailer from "nodemailer";

// ─── SMTP Transporter (SSL port 465) ─────────────────────────────────────────
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

// ─── Google Drive Assets (Exact links requested) ─────────────────────────────
const LOGO_URL =
  "https://drive.google.com/uc?export=view&id=1nkfmfUBXiqwKlRqRkp3mfax1s8sS78aJ";
const FOOTER_LOGO_URL =
  "https://drive.google.com/uc?export=view&id=1XIPqEBjWXv6rlkeMb8h47E-bppzbo8Wm";

// ─── Professional & Simple OTP HTML Template ─────────────────────────────────
function buildOTPHTML(otp: string, name: string): string {
  const year = new Date().getFullYear();
  const displayName = name ? name.trim() : "there";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="dark" />
  <title>CapFlow Verification Code</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #0b0f19; }

    @media only screen and (max-width: 520px) {
      .card-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .card-padding {
        padding: 28px 20px !important;
      }
      .otp-text {
        font-size: 32px !important;
        letter-spacing: 8px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b0f19; width: 100%; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <!-- Email Container Card -->
        <table role="presentation" class="card-container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden;">
          
          <!-- Card Header / Brand -->
          <tr>
            <td align="center" style="padding: 32px 32px 12px 32px;">
              <img src="${LOGO_URL}" alt="CapFlow Logo" width="56" height="56" style="display: block; width: 56px; height: 56px; border-radius: 12px; margin: 0 auto 16px; object-fit: contain;" />
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.2px;">
                CapFlow
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">
                Softcapphyjas Secure Access
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 16px 32px 0 32px;">
              <div style="height: 1px; background-color: #1f2937; width: 100%;"></div>
            </td>
          </tr>

          <!-- Card Body -->
          <tr>
            <td class="card-padding" style="padding: 24px 32px 32px 32px;">
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #e2e8f0; font-weight: 500;">
                Hi ${displayName},
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                Your One-Time Password (OTP) for signing in to CapFlow is below. Enter this code to verify your identity.
              </p>

              <!-- Simple & Clean OTP Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px 0;">
                <tr>
                  <td align="center" style="background-color: #0b0f19; border: 1px solid #334155; border-radius: 12px; padding: 20px 16px;">
                    <div class="otp-text" style="font-family: 'SF Mono', Consolas, 'Courier New', Courier, monospace; font-size: 36px; font-weight: 700; color: #38bdf8; letter-spacing: 10px; padding-left: 10px;">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Validity & Security Info -->
              <p style="margin: 0 0 20px 0; font-size: 12px; color: #64748b; text-align: center; line-height: 18px;">
                This code is valid for <strong>10 minutes</strong> and can only be used once.
              </p>

              <div style="background-color: #0d1321; border-left: 3px solid #38bdf8; border-radius: 4px; padding: 12px 14px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94a3b8;">
                  <strong style="color: #e2e8f0;">Security tip:</strong> Never share this code with anyone. Softcapphyjas will never ask you for your OTP.
                </p>
              </div>

              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #94a3b8;">
                Thank you,<br />
                <span style="color: #e2e8f0; font-weight: 600;">Team Softcapphyjas</span>
              </p>
            </td>
          </tr>

          <!-- Footer Inside Card -->
          <tr>
            <td style="background-color: #0d1321; border-top: 1px solid #1f2937; padding: 20px 32px; text-align: center;">
              <img src="${FOOTER_LOGO_URL}" alt="CapFlow" width="70" height="24" style="display: block; width: 70px; height: 24px; margin: 0 auto 10px; object-fit: contain;" />
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">
                &copy; ${year} Softcapphyjas Pvt. Ltd. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569;">
                This is an automated message. Please do not reply directly to this email.
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

// ─── Plain Text Fallback ──────────────────────────────────────────────────────
function buildOTPText(otp: string, name: string): string {
  const displayName = name ? name.trim() : "there";
  return [
    "CapFlow Verification Code",
    "=====================================",
    "",
    `Hi ${displayName},`,
    "",
    "Your One-Time Password (OTP) for logging into CapFlow is:",
    "",
    `  ${otp}`,
    "",
    "This code is valid for 10 minutes and can only be used once.",
    "Do not share this code with anyone.",
    "",
    "Thank you,",
    "Team Softcapphyjas",
    "Softcapphyjas Pvt. Ltd.",
  ].join("\n");
}

// ─── Send OTP Email ───────────────────────────────────────────────────────────
export async function sendOTPEmail(
  email: string,
  otp: string,
  name: string,
): Promise<void> {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"CapFlow" <dev.lethwala@gmail.com>',
      to: email,
      subject: "Capflow Service OTP",
      text: buildOTPText(otp, name),
      html: buildOTPHTML(otp, name),
    });
    console.info(`[Mailer] OTP sent to ${email}`);
  } catch (err: any) {
    console.warn(`[SMTP] ${err.message}`);
    // Log OTP to terminal in development so developer is never locked out
    console.info(
      `\n==================================\n` +
      `🔑 [DEV OTP] ${email} => ${otp}\n` +
      `==================================\n`
    );
    if (
      process.env.NODE_ENV === "production" &&
      !err.message?.includes("sending limit")
    ) {
      throw err;
    }
  }
}

// ─── Send EMI Reminder Email ──────────────────────────────────────────────────
export async function sendEMIReminder(
  email: string,
  name: string,
  emiName: string,
  amount: number,
  dueDate: string,
): Promise<void> {
  const year = new Date().getFullYear();
  const displayName = name ? name.trim() : "there";

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"CapFlow" <dev.lethwala@gmail.com>',
    to: email,
    subject: `Reminder: ${emiName} EMI due on ${dueDate}`,
    text: `Hi ${displayName},\n\nYour ${emiName} EMI of Rs.${amount.toLocaleString()} is due on ${dueDate}.\n\nTeam Softcapphyjas`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EMI Due Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b0f19; width: 100%; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden;">
          <tr>
            <td align="center" style="padding: 32px 32px 16px 32px;">
              <img src="${LOGO_URL}" alt="Softcapphyjas" width="48" height="48" style="display: block; width: 48px; height: 48px; border-radius: 10px; margin: 0 auto 12px; object-fit: contain;" />
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">EMI Due Reminder</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">CapFlow Financial Tracker</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #1f2937; width: 100%;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 32px 32px;">
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #e2e8f0;">Dear ${displayName},</p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #94a3b8;">
                This is a friendly reminder that your <strong style="color: #38bdf8;">${emiName}</strong> EMI is due on <strong style="color: #ffffff;">${dueDate}</strong>.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center" style="background-color: #0b0f19; border: 1px solid #334155; border-radius: 12px; padding: 20px 16px;">
                    <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b;">Amount Due</p>
                    <p style="margin: 0; font-size: 32px; font-weight: 700; color: #38bdf8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      &#8377;${amount.toLocaleString()}
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 20px; color: #94a3b8;">
                Please ensure your account has sufficient funds to avoid any late fees.
              </p>
              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #94a3b8;">
                Best regards,<br />
                <span style="color: #e2e8f0; font-weight: 600;">Team Softcapphyjas</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #0d1321; border-top: 1px solid #1f2937; padding: 18px 32px; text-align: center;">
              <img src="${FOOTER_LOGO_URL}" alt="CapFlow" width="64" height="22" style="display: block; width: 64px; height: 22px; margin: 0 auto 8px; object-fit: contain;" />
              <p style="margin: 0; font-size: 11px; color: #64748b;">&copy; ${year} Softcapphyjas Pvt. Ltd. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}
