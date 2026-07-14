// Supabase Edge — email: Resend (HTTP, preporučeno u browseru) ili SMTP (IT server)
// Deploy: npm run deploy:resend  |  npm run deploy:smtp
// Secrets Resend: RESEND_API_KEY, RESEND_FROM
// Secrets SMTP: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function envBool(val, fallback = false) {
  if (val === undefined || val === null || val === "") return fallback;
  if (val === false || val === "0" || val === "false") return false;
  return true;
}

function smtpImplicitTls(port, tlsOverride) {
  if (tlsOverride === "0" || tlsOverride === false) return false;
  if (tlsOverride === "1" || tlsOverride === true) return port === 465;
  return port === 465;
}

function parseRecipients(to) {
  return String(to || "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function posaljiResend({ apiKey, from, to, subject, text, html }) {
  const payload = {
    from,
    to: parseRecipients(to),
    subject,
  };
  if (html) payload.html = html;
  else payload.text = text || subject;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json.message || json.error || `Resend HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

async function posaljiSmtp({ host, port, user, pass, from, to, subject, text, html, tls }) {
  const client = new SMTPClient({
    connection: {
      hostname: host,
      port,
      tls,
      auth: { username: user, password: pass },
    },
  });

  await client.send({
    from,
    to: parseRecipients(to),
    subject,
    content: text || subject,
    html,
  });

  await client.close();
}

function resolveProvider(body) {
  const explicit = String(body?.provider || "").trim().toLowerCase();
  if (explicit === "resend" || explicit === "smtp") return explicit;

  const host = String(body?.smtp_host || "").trim();
  const user = String(body?.smtp_user || "").trim();
  const pass = String(body?.smtp_pass || "").trim();
  if (host && user && pass) return "smtp";

  if (Deno.env.get("RESEND_API_KEY")) return "resend";
  return "smtp";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const to = String(body?.to || Deno.env.get("SMTP_DEFAULT_TO") || "").trim();
    const subject = String(body?.subject || "SPC obaveštenje").trim();
    const text = String(body?.text || body?.opis || "").trim();
    const html = body?.html ? String(body.html) : undefined;

    if (!to) throw new Error("to (primalac) je obavezan");

    const provider = resolveProvider(body);

    if (provider === "resend") {
      const apiKey = String(body?.resend_api_key || Deno.env.get("RESEND_API_KEY") || "").trim();
      const from = String(
        body?.from || body?.resend_from || Deno.env.get("RESEND_FROM") || "",
      ).trim();
      if (!apiKey) {
        throw new Error(
          "Resend nije konfigurisan. Postavi RESEND_API_KEY secret: npm run deploy:resend",
        );
      }
      if (!from) {
        throw new Error(
          "Resend from adresa nije podešena. Postavi RESEND_FROM secret ili email_resend_from u adminu.",
        );
      }

      const rez = await posaljiResend({ apiKey, from, to, subject, text, html });
      return new Response(
        JSON.stringify({ ok: true, provider: "resend", to, subject, id: rez.id }),
        { headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const host = String(body?.smtp_host || Deno.env.get("SMTP_HOST") || "").trim();
    const port = Number(body?.smtp_port || Deno.env.get("SMTP_PORT") || 587);
    const user = String(body?.smtp_user || Deno.env.get("SMTP_USER") || "").trim();
    const pass = String(body?.smtp_pass || Deno.env.get("SMTP_PASS") || "").trim();
    const from = String(body?.smtp_from || Deno.env.get("SMTP_FROM") || user || "").trim();
    const tls = smtpImplicitTls(port, body?.smtp_tls ?? Deno.env.get("SMTP_TLS"));

    if (!host || !user || !pass) {
      throw new Error(
        "SMTP nije konfigurisan. Postavi secrets (deploy:smtp) ili koristi provider: resend (deploy:resend).",
      );
    }

    await posaljiSmtp({ host, port, user, pass, from, to, subject, text, html, tls });

    return new Response(
      JSON.stringify({ ok: true, provider: "smtp", to, subject }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
