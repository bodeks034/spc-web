// Supabase Edge Function — proxy za Teams / email webhook (zaobilazi CORS iz browsera).
// Deploy: supabase functions deploy send-webhook --project-ref <ref>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return host.includes("webhook.office.com")
      || host.includes("outlook.office.com")
      || host.includes("hooks.slack.com")
      || host.includes("powerautomate")
      || host.includes("logic.azure.com")
      || host.includes("make.com")
      || host.includes("n8n");
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const targetUrl = String(body?.url || "").trim();
    const payload = body?.payload ?? body?.body ?? {};

    if (!targetUrl) throw new Error("url je obavezan");
    if (!isAllowedUrl(targetUrl)) {
      throw new Error("URL nije na listi dozvoljenih webhook domena");
    }

    const upstream = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    return new Response(
      JSON.stringify({ ok: upstream.ok, status: upstream.status, body: text.slice(0, 500) }),
      {
        status: upstream.ok ? 200 : 502,
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
