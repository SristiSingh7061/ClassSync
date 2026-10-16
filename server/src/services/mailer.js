// Email is optional: if SMTP_* variables are missing, emails are skipped (only logged).
let transporter = null;
const configured = () => process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

exports.sendMail = async ({ bcc, subject, text }) => {
  if (!bcc?.length) return;
  if (!configured()) { console.log(`[mail] SMTP not configured, skipped: ${subject}`); return; }
  try {
    if (!transporter) {
      const nodemailer = require('nodemailer');
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    }
    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    await transporter.sendMail({ from, to: from, bcc, subject, text });
    console.log(`[mail] sent to ${bcc.length} students: ${subject}`);
  } catch (e) {
    console.error('[mail] failed:', e.message);
  }
};
