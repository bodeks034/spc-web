/**
 * Direktno SMTP slanje iz Node (van Supabase Edge — port 587/465 radi lokalno).
 */
import nodemailer from "nodemailer";

export function smtpConfigFromEnv(env = process.env) {
  const host = String(env.SMTP_HOST || "").trim();
  const user = String(env.SMTP_USER || "").trim();
  const pass = String(env.SMTP_PASS || "").trim();
  const port = Number(env.SMTP_PORT) || 587;
  const from = String(env.SMTP_FROM || user).trim();

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER i SMTP_PASS su obavezni u .env.local");
  }

  return { host, user, pass, port, from };
}

export async function posaljiSmtpDirektno(env, { to, subject, text, html, attachments = [] }) {
  const { host, user, pass, port, from } = smtpConfigFromEnv(env);
  const secure = port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const mail = {
    from,
    to,
    subject,
    text: text || subject,
    html,
  };
  if (attachments?.length) {
    mail.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType || "application/pdf",
    }));
  }

  await transporter.sendMail(mail);
}
