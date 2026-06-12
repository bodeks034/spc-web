// Admin postavlja lozinku radniku (Auth). Deploy:
// supabase functions deploy admin-radnik-lozinka --project-ref <ref>

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findAuthUserByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  const target = normalizeEmail(email);
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users || [];
    const found = users.find((u) => normalizeEmail(String(u.email || "")) === target);
    if (found) return found;
    if (users.length < 200) break;
  }
  return null;
}

async function postaviLozinkuRadniku(
  adminClient: ReturnType<typeof createClient>,
  radnik: { id: number; ime: string; email: string | null; user_id: string | null },
  novaLozinka: string,
) {
  const email = normalizeEmail(String(radnik.email || ""));
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Radnik nema ispravan email u tabeli radnici.");
  }

  let userId = radnik.user_id as string | null;
  let created = false;
  let relinked = false;

  const updatePassword = async (uid: string) => {
    const { error } = await adminClient.auth.admin.updateUserById(uid, {
      password: novaLozinka,
      email,
    });
    if (error) throw error;
  };

  const linkRadnika = async (uid: string) => {
    const { error } = await adminClient
      .from("radnici")
      .update({ user_id: uid, email })
      .eq("id", radnik.id);
    if (error) throw error;
  };

  if (userId) {
    const { data, error } = await adminClient.auth.admin.getUserById(userId);
    if (!error && data?.user) {
      await updatePassword(userId);
      return { userId, created, relinked, ime: radnik.ime, radnikId: radnik.id };
    }
    userId = null;
  }

  const postojeci = await findAuthUserByEmail(adminClient, email);
  if (postojeci) {
    userId = postojeci.id;
    await updatePassword(userId);
    await linkRadnika(userId);
    relinked = true;
    return { userId, created, relinked, ime: radnik.ime, radnikId: radnik.id };
  }

  const { data: createdUser, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password: novaLozinka,
    email_confirm: true,
  });

  if (createErr) {
    const msg = createErr.message || "";
    if (/already registered|already been registered|duplicate/i.test(msg)) {
      const ponovo = await findAuthUserByEmail(adminClient, email);
      if (!ponovo) {
        throw new Error(
          `Auth nalog sa emailom ${email} postoji, ali nije pronađen za povezivanje. U Admin panelu klikni „Reset Auth“, pa ponovo „Lozinka“.`,
        );
      }
      userId = ponovo.id;
      await updatePassword(userId);
      await linkRadnika(userId);
      relinked = true;
      return { userId, created, relinked, ime: radnik.ime, radnikId: radnik.id };
    }
    throw createErr;
  }

  userId = createdUser.user.id;
  created = true;
  await linkRadnika(userId);
  return { userId, created, relinked, ime: radnik.ime, radnikId: radnik.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "POST only" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ ok: false, error: "Niste prijavljeni." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ ok: false, error: "Supabase env nije podešen na serveru." }, 500);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData, error: authErr } = await callerClient.auth.getUser();
    if (authErr || !authData.user) {
      return json({ ok: false, error: "Neispravna sesija — uloguj se ponovo." }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: adminRadnik, error: adminErr } = await adminClient
      .from("radnici")
      .select("id,uloga,aktivan")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (adminErr) {
      return json({ ok: false, error: adminErr.message }, 500);
    }
    if (!adminRadnik || adminRadnik.uloga !== "admin" || adminRadnik.aktivan === false) {
      return json({ ok: false, error: "Samo aktivni admin može menjati lozinke." }, 403);
    }

    const body = await req.json();
    const radnikId = Number(body?.radnikId);
    const novaLozinka = String(body?.novaLozinka ?? "");

    if (!Number.isFinite(radnikId) || radnikId <= 0) {
      return json({ ok: false, error: "Neispravan radnik ID." }, 400);
    }
    if (novaLozinka.length < 6) {
      return json({ ok: false, error: "Lozinka mora imati najmanje 6 karaktera." }, 400);
    }

    const { data: radnik, error: radnikErr } = await adminClient
      .from("radnici")
      .select("id,ime,email,user_id,aktivan")
      .eq("id", radnikId)
      .maybeSingle();

    if (radnikErr) {
      return json({ ok: false, error: radnikErr.message }, 500);
    }
    if (!radnik) {
      return json({ ok: false, error: "Radnik nije pronađen." }, 404);
    }

    const result = await postaviLozinkuRadniku(adminClient, radnik, novaLozinka);

    return json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: msg }, 400);
  }
});
