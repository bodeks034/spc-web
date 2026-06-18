// Supabase Edge — SMTP email (IT mail server)
// Deploy: supabase functions deploy send-email --project-ref <ref>
// Secrets: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (optional override)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const to = String(body?.to || "").trim();
    const subject = String(body?.subject || "SPC obaveštenje").trim();
    const text = String(body?.text || body?.opis || "").trim();
    const html = body?.html ? String(body.html) : undefined;

    if (!to) throw new Error("to (primalac) je obavezan");

    const host = String(body?.smtp_host || Deno.env.get("SMTP_HOST") || "").trim();
    const port = Number(body?.smtp_port || Deno.env.get("SMTP_PORT") || 587);
    const user = String(body?.smtp_user || Deno.env.get("SMTP_USER") || "").trim();
    const pass = String(body?.smtp_pass || Deno.env.get("SMTP_PASS") || "").trim();
    const from = String(body?.smtp_from || Deno.env.get("SMTP_FROM") || user || "").trim();
    const tls = body?.smtp_tls !== false && body?.smtp_tls !== "0";

    if (!host || !user || !pass) {
      throw new Error("SMTP nije konfigurisan (host/user/pass)");
    }

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
      to: to.split(/[,;]/).map((s) => s.trim()).filter(Boolean),
      subject,
      content: text || subject,
      html,
    });

    await client.close();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
