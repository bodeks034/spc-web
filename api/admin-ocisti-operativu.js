/**
 * Admin API — puno SQL čišćenje operativnih podataka (Vercel / lokalni dev).
 * Auth: Bearer CRON_SECRET | ADMIN_API_SECRET ili Supabase JWT admin radnika.
 */
import { createClient } from "@supabase/supabase-js";
import { runOcistiOperativu } from "../scripts/ocistiOperativuLib.mjs";

async function verifyAdminJwt(token) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || !token) return false;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return false;

  const { data: radnik } = await admin
    .from("radnici")
    .select("uloga, aktivan")
    .eq("user_id", user.id)
    .maybeSingle();

  return radnik?.uloga === "admin" && radnik?.aktivan !== false;
}

function authorizedService(authHeader) {
  const secret = process.env.ADMIN_API_SECRET || process.env.CRON_SECRET;
  return secret && authHeader === `Bearer ${secret}`;
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const serviceOk = authorizedService(auth);
  const adminOk = serviceOk || await verifyAdminJwt(token);

  if (!adminOk) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Nevalidan JSON" }, { status: 400 });
  }

  if (String(body.potvrdi || "").trim().toUpperCase() !== "OCISTI") {
    return Response.json({
      ok: false,
      error: 'Potrebna potvrda: potvrdi = "OCISTI". Pre toga uradi npm run backup:db.',
    }, { status: 400 });
  }

  try {
    const rez = await runOcistiOperativu({ zadrziQms: !!body.zadrziQms });
    return Response.json(rez);
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export const config = {
  maxDuration: 120,
};
