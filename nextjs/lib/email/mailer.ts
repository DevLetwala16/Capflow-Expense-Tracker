import nodemailer from "nodemailer";

// SMTP_SSL on port 465 — same as Python smtplib.SMTP_SSL
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,         // Reuse connections
  maxConnections: 5,
});

// Google Drive public image links (work in all email clients)
const LOGO_URL =
  "https://drive.google.com/uc?export=view&id=1nkfmfUBXiqwKlRqRkp3mfax1s8sS78aJ";
const FOOTER_LOGO_URL =
  "https://drive.google.com/uc?export=view&id=1XIPqEBjWXv6rlkeMb8h47E-bppzbo8Wm";

function buildOTPHTML(otp: string, name: string): string {
  const year = new Date().getFullYear();
  const digits = otp.split("").join("</td><td>");
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="x-apple-disable-message-reformatting"/>
<title>CapFlow OTP</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');
  *,*::before,*::after{box-sizing:border-box}
  body{margin:0;padding:0;background:#060610;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt}
  img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;display:block}
  a{text-decoration:none}

  /* Outer */
  .body-wrap{background:#060610;padding:40px 16px;width:100%;min-width:100%}

  /* Card */
  .card{
    background:linear-gradient(160deg,#0d0d2b 0%,#0a0a1e 60%,#050518 100%);
    border:1px solid rgba(0,212,255,0.25);
    border-radius:20px;
    max-width:580px;
    margin:0 auto;
    overflow:hidden;
    box-shadow:0 0 60px rgba(0,212,255,0.08),0 20px 60px rgba(0,0,0,0.6);
  }

  /* Header glow band */
  .header-band{
    background:linear-gradient(135deg,#0a0a2e 0%,#0f0f3a 50%,#0a0a2e 100%);
    padding:36px 32px 28px;
    text-align:center;
    border-bottom:1px solid rgba(0,212,255,0.15);
    position:relative;
  }
  .header-glow{
    position:absolute;top:-40px;left:50%;transform:translateX(-50%);
    width:200px;height:120px;
    background:radial-gradient(ellipse,rgba(0,212,255,0.15) 0%,transparent 70%);
    pointer-events:none;
  }

  /* Body */
  .body-pad{padding:36px 40px}

  /* OTP grid */
  .otp-wrap{
    background:rgba(0,212,255,0.04);
    border:1px solid rgba(0,212,255,0.2);
    border-radius:16px;
    padding:24px 20px;
    text-align:center;
    margin:28px 0;
    position:relative;
    overflow:hidden;
  }
  .otp-glow{
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    width:280px;height:80px;
    background:radial-gradient(ellipse,rgba(0,212,255,0.12) 0%,transparent 70%);
    pointer-events:none;
  }
  .otp-digits td{
    width:48px;height:64px;
    background:rgba(0,212,255,0.07);
    border:1px solid rgba(0,212,255,0.3);
    border-radius:12px;
    text-align:center;vertical-align:middle;
    font-size:30px;font-weight:900;
    color:#00d4ff;
    font-family:'Courier New',monospace;
    letter-spacing:0;
    padding:0 6px;
  }
  .otp-digits td+td{margin-left:8px}

  /* Pill */
  .pill{
    display:inline-block;
    background:rgba(0,212,255,0.06);
    border:1px solid rgba(0,212,255,0.2);
    border-radius:100px;
    padding:6px 20px;
    font-size:12px;color:#7dd3ef;
    font-family:Inter,Arial,sans-serif;
    margin-top:16px;letter-spacing:0.3px;
  }

  /* Warning */
  .warn-box{
    background:rgba(239,68,68,0.05);
    border:1px solid rgba(239,68,68,0.2);
    border-radius:12px;padding:14px 18px;margin-top:12px;
  }

  /* Footer */
  .footer{
    background:rgba(0,0,0,0.3);
    border-top:1px solid rgba(0,212,255,0.08);
    padding:24px 32px;text-align:center;
  }

  /* Typography */
  h1{margin:10px 0 4px;font-size:22px;font-weight:700;color:#e2eaf5;font-family:Inter,Arial,sans-serif;letter-spacing:-0.3px}
  h2{margin:0;font-size:12px;font-weight:500;color:#5a7a99;font-family:Inter,Arial,sans-serif;letter-spacing:1.5px;text-transform:uppercase}
  p{margin:0 0 14px;font-size:15px;line-height:1.65;color:#94b3cc;font-family:Inter,Arial,sans-serif}
  .hi{color:#c8dced}
  .accent{color:#00d4ff}
  .small{font-size:12px;color:#3d5a6e;font-family:Inter,Arial,sans-serif}

  @media only screen and (max-width:500px){
    .body-pad{padding:24px 20px!important}
    .header-band{padding:28px 20px 22px!important}
    .footer{padding:20px!important}
    h1{font-size:18px!important}
    .otp-digits td{width:38px!important;height:52px!important;font-size:22px!important;border-radius:8px!important}
    .warn-box{padding:10px 14px!important}
  }
</style>
</head>
<body>
<div class="body-wrap">
<div class="card">

  <!-- HEADER -->
  <div class="header-band">
    <div class="header-glow"></div>
    <img src="${LOGO_URL}" alt="Softcapphyjas" width="96" height="96"
         style="width:96px;height:96px;object-fit:contain;margin:0 auto 16px;border-radius:20px;"/>
    <h1>Softcapphyjas Pvt. Ltd.</h1>
    <h2>&#128274; Secure Access Portal</h2>
  </div>

  <!-- BODY -->
  <div class="body-pad">

    <p>Dear <strong class="hi">${name || "Customer"}</strong>,</p>
    <p>
      Your One-Time Password (OTP) for logging into
      <strong class="accent">CapFlow</strong> is:
    </p>

    <!-- OTP Box -->
    <div class="otp-wrap">
      <div class="otp-glow"></div>
      <p style="margin:0 0 16px;font-size:11px;color:#4a7a99;text-transform:uppercase;letter-spacing:2px;font-family:Inter,Arial,sans-serif;">
        Your Login Code
      </p>
      <table class="otp-digits" role="presentation" cellpadding="0" cellspacing="8" style="margin:0 auto;">
        <tr>
          <td>${digits}</td>
        </tr>
      </table>
      <span class="pill">&#9200; Valid for 10 minutes &nbsp;&bull;&nbsp; Single use only</span>
    </div>

    <p>Enter this code on the CapFlow login screen to complete your sign-in.</p>

    <!-- Warning -->
    <div class="warn-box">
      <p style="margin:0;font-size:13px;color:#f87171;font-family:Inter,Arial,sans-serif;line-height:1.5;">
        &#9888;&#65039; &nbsp;<strong>Never share this code with anyone.</strong><br/>
        <span style="color:#9ca3af;font-size:12px;">
          Softcapphyjas will never call or email asking for your OTP.
        </span>
      </p>
    </div>

    <p style="margin-top:28px;">
      Thank you for using CapFlow.<br/>
      <strong class="accent">&#8212; Team Softcapphyjas</strong>
    </p>

  </div>

  <!-- FOOTER -->
  <div class="footer">
    <img src="${FOOTER_LOGO_URL}" alt="CapFlow" width="88" height="32"
         style="width:88px;height:32px;object-fit:contain;margin:0 auto 12px;"/>
    <p class="small" style="margin:0 0 4px;">&#169; ${year} Softcapphyjas Pvt. Ltd. All rights reserved.</p>
    <p class="small" style="margin:0;">This is an automated message. Please do not reply.</p>
  </div>

</div>
</div>
</body>
</html>`;
}

function buildOTPText(otp: string, name: string): string {
  return [
    "Your Capflow Login OTP",
    "========================",
    "",
    `Dear ${name || "Customer"},`,
    "",
    "Your One-Time Password (OTP) for logging into Capflow is:",
    "",
    `  >>> ${otp} <<<`,
    "",
    "This code is valid for 10 minutes and can only be used once.",
    "Do not share it with anyone.",
    "",
    "Thank you,",
    "Team Softcapphyjas",
    "Softcapphyjas Pvt. Ltd.",
  ].join("\n");
}

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
    // Always log OTP to terminal in dev — never locks out the developer
    console.info(
      `\n==================================\n` +
      `\uD83D\uDD11 [DEV OTP] ${email} => ${otp}\n` +
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

export async function sendEMIReminder(
  email: string,
  name: string,
  emiName: string,
  amount: number,
  dueDate: string,
): Promise<void> {
  const year = new Date().getFullYear();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"CapFlow" <dev.lethwala@gmail.com>',
    to: email,
    subject: `Reminder: ${emiName} EMI due on ${dueDate}`,
    text: `Hi ${name},\n\nYour ${emiName} EMI of Rs.${amount.toLocaleString()} is due on ${dueDate}.\n\nTeam Softcapphyjas`,
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{margin:0;padding:0;background:#060610;font-family:Inter,Arial,sans-serif}
.card{max-width:560px;margin:32px auto;background:linear-gradient(160deg,#0d0d2b,#050518);border:1px solid rgba(0,212,255,0.25);border-radius:20px;overflow:hidden}
.hdr{background:linear-gradient(135deg,#0a0a2e,#0f0f3a);padding:32px;text-align:center;border-bottom:1px solid rgba(0,212,255,0.15)}
.body{padding:32px 40px}.ftr{background:rgba(0,0,0,0.3);border-top:1px solid rgba(0,212,255,0.08);padding:20px 32px;text-align:center}
h1{color:#e2eaf5;font-size:20px;margin:12px 0 4px}p{color:#94b3cc;font-size:15px;line-height:1.65;margin:0 0 14px}
.amt{font-size:38px;font-weight:900;color:#00d4ff;font-family:'Courier New',monospace}
.amtbox{background:rgba(0,212,255,0.04);border:1px solid rgba(0,212,255,0.2);border-radius:16px;padding:20px;text-align:center;margin:24px 0}
.small{font-size:12px;color:#3d5a6e}
@media(max-width:500px){.body{padding:20px!important}.hdr{padding:24px 20px!important}}
</style></head>
<body><div class="card">
<div class="hdr">
  <img src="${LOGO_URL}" alt="Softcapphyjas" width="72" height="72" style="width:72px;height:72px;object-fit:contain;margin:0 auto 12px;border-radius:16px;display:block"/>
  <h1>EMI Due Reminder</h1>
  <p style="margin:0;font-size:12px;color:#5a7a99;text-transform:uppercase;letter-spacing:1.5px;">Softcapphyjas &bull; CapFlow</p>
</div>
<div class="body">
  <p>Dear <strong style="color:#c8dced">${name}</strong>,</p>
  <p>Your <strong style="color:#00d4ff">${emiName}</strong> EMI is due on <strong style="color:#00d4ff">${dueDate}</strong>.</p>
  <div class="amtbox">
    <p style="margin:0 0 8px;font-size:11px;color:#4a7a99;text-transform:uppercase;letter-spacing:2px;">Amount Due</p>
    <p class="amt" style="margin:0">&#8377;${amount.toLocaleString()}</p>
  </div>
  <p>Please ensure sufficient funds to avoid late charges.</p>
  <p style="margin-top:20px">Stay on top of your finances.<br/><strong style="color:#00d4ff">&#8212; Team Softcapphyjas</strong></p>
</div>
<div class="ftr">
  <img src="${FOOTER_LOGO_URL}" alt="CapFlow" width="80" height="30" style="width:80px;height:30px;object-fit:contain;margin:0 auto 10px;display:block"/>
  <p class="small" style="margin:0 0 4px">&#169; ${year} Softcapphyjas Pvt. Ltd. All rights reserved.</p>
</div>
</div></body></html>`,
  });
}
