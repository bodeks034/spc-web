/** Zajedničko slanje emaila iz Node skripti (bez spawn — bez problema sa C:\Program Files). */

import { buildSmtpBody, pozoviSendEmail } from "./smtpEdge.mjs";
import { posaljiSmtpDirektno, smtpConfigFromEnv } from "./smtpDirect.mjs";

export async function posaljiEmailIzEnv(env, { to, subject, text, html, useEdge = false, attachments = [] } = {}) {
  const primalac = (to || env.SMTP_TO || "").trim();
  if (!primalac) throw new Error("Primalac (to / SMTP_TO) nije podešen");
  if (!text && !html) throw new Error("Tekst ili HTML poruke je obavezan");

  const imaLokalniSmtp = (() => {
    try { smtpConfigFromEnv(env); return true; } catch { return false; }
  })();

  if (!useEdge && imaLokalniSmtp) {
    await posaljiSmtpDirektno(env, { to: primalac, subject, text, html, attachments });
    return { kanal: "smtp" };
  }

  if (attachments?.length) {
    console.warn("⚠ PDF prilozi rade samo sa lokalnim SMTP — edge preskače attachment");
  }

  const body = buildSmtpBody(env, { to: primalac, subject, text, html });
  await pozoviSendEmail(env, body);
  return { kanal: body.smtp_host ? "edge+smtp" : "edge" };
}
