const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  return transporter;
}

/**
 * Sends a 4-digit OTP email to the user.
 * @param {string} toEmail - Recipient email
 * @param {string} otpCode - 4-digit OTP
 */
async function sendOtpEmail(toEmail, otpCode) {
  const mailTransporter = getTransporter();
  const fromAddress = process.env.FROM_EMAIL || '"Lucid Dreams" <noreply@luciddreams.app>';

  const subject = 'Your Lucid Dreams verification code';
  const textContent = `Hello,\n\nYour Lucid Dreams verification code is: ${otpCode}\n\nThis code will expire in 10 minutes. If you did not request this code, please ignore this email.\n\nWarmly,\nThe Lucid Dreams Team`;
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #FAF9FD; border-radius: 16px; border: 1px solid #EBE4F5;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #4C3B87; margin: 0; font-size: 24px;">Lucid Dreams</h2>
        <p style="color: #6B7280; font-size: 14px; margin-top: 4px;">Password Reset Verification</p>
      </div>
      <div style="background: #FFFFFF; border-radius: 12px; padding: 24px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid #F0EEF8;">
        <p style="color: #374151; font-size: 15px; margin-bottom: 20px;">Use the verification code below to reset your password:</p>
        <div style="display: inline-block; background: #F0EEF8; color: #4C3B87; font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 12px 24px; border-radius: 10px; margin-bottom: 20px;">
          ${otpCode}
        </div>
        <p style="color: #9CA3AF; font-size: 13px; margin: 0;">This code is valid for <strong>10 minutes</strong>.</p>
      </div>
      <p style="color: #9CA3AF; font-size: 12px; text-align: center; margin-top: 24px;">
        If you did not request a password reset, you can safely ignore this email.
      </p>
    </div>
  `;

  if (mailTransporter) {
    try {
      await mailTransporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });
      console.log(`[EMAIL] Verification code sent to ${toEmail}`);
      return { success: true, delivered: true };
    } catch (sendError) {
      console.error('[EMAIL ERROR] Failed to send via SMTP:', sendError);
      // Fall through to console logging in development
    }
  }

  // Fallback / Development Simulation
  console.log('\n=========================================');
  console.log(' [DEV OTP EMAIL SIMULATION]');
  console.log(` To: ${toEmail}`);
  console.log(` Subject: ${subject}`);
  console.log(` Verification Code: ${otpCode}`);
  console.log(' (Expires in 10 minutes)');
  console.log('=========================================\n');

  return { success: true, delivered: false, simulated: true };
}

module.exports = {
  sendOtpEmail,
};
