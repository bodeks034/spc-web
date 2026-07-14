/**
 * Poziv Supabase edge funkcije send-email (iz CLI, cron-a, deploy skripti).
 */

export function supabaseEmailConfig(env = process.env) {
  const base = String(env.VITE_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  return { base, key };
}

function imaPunSmtpEnv(env) {
  return Boolean(
    String(env.SMTP_HOST || "").trim()
    && String(env.SMTP_USER || "").trim()
    && String(env.SMTP_PASS || "").trim(),
  );
}

/** Telo za POST — Resend (edge secrets) ili SMTP iz env. */
export function buildEmailBody(env, { provider, to, subject, text, html, from, tls } = {}) {
  const primalac = String(to || env.SMTP_TO || env.SMTP_DEFAULT_TO || "").trim();
  if (!primalac) throw new Error("Primalac (to) nije podešen — --to ili SMTP_TO u .env.local");

  const body = {
    to: primalac,
    subject: String(subject || "SPC obaveštenje").trim(),
    text: String(text || subject || "").trim(),
  };
  if (html) body.html = String(html);

  const mode = String(provider || env.EMAIL_PROVIDER || "").trim().toLowerCase()
    || (imaPunSmtpEnv(env) ? "smtp" : (env.RESEND_API_KEY ? "resend" : "smtp"));

  if (mode === "resend") {
    body.provider = "resend";
    const resendFrom = String(from || env.RESEND_FROM || env.email_resend_from || "").trim();
    if (resendFrom) body.from = resendFrom;
    return body;
  }

  body.provider = "smtp";
  const host = String(env.SMTP_HOST || "").trim();
  const user = String(env.SMTP_USER || "").trim();
  const pass = String(env.SMTP_PASS || "").trim();

  if (host && user && pass) {
    body.smtp_host = host;
    body.smtp_port = Number(env.SMTP_PORT) || 587;
    body.smtp_user = user;
    body.smtp_pass = pass;
    if (env.SMTP_FROM) body.smtp_from = String(env.SMTP_FROM).trim();
  }

  const port = Number(env.SMTP_PORT) || 587;
  const tlsEnv = env.SMTP_TLS;
  if (tls !== undefined) {
    body.smtp_tls = tls !== false && tls !== "0";
  } else if (tlsEnv === "0" || tlsEnv === "false") {
    body.smtp_tls = false;
  } else if (tlsEnv === "1" || tlsEnv === "true") {
    body.smtp_tls = port === 465;
  } else {
    body.smtp_tls = port === 465;
  }

  return body;
}

/** @deprecated koristi buildEmailBody */
export function buildSmtpBody(env, opts) {
  return buildEmailBody(env, opts);
}

export async function pozoviSendEmail(env, payload) {
  const { base, key } = supabaseEmailConfig(env);
  if (!base || !key) {
    throw new Error("Nedostaje VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY (ili SERVICE_ROLE)");
  }

  const res = await fetch(`${base}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      apikey: key,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `send-email HTTP ${res.status}`);
  }
  return json;
}
