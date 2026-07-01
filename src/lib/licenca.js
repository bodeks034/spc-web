import { supabase } from "./supabaseClient.js";

import { LICENCA_PUBLIC_PEM } from "./licencaPublicKey.js";



const PROVERA_INTERVAL_MS = 15 * 60 * 1000;

const LICENCA_CACHE_KEY = "spc_licenca_cache";

const GRACE_DANA = Number(import.meta.env.VITE_LICENCA_GRACE_DANA || 7);

const GRACE_MS = GRACE_DANA * 24 * 60 * 60 * 1000;



const MODULI_DEFAULT = {

  atributivne: true,

  varijabilne: true,

  admin: true,

  sifrarnik: true,

};



function imaJavniKljuc() {

  return LICENCA_PUBLIC_PEM && !LICENCA_PUBLIC_PEM.includes("placeholder");

}



function pemToSpki(pem) {

  const b64 = pem.replace(/-----BEGIN PUBLIC KEY-----/g, "")

    .replace(/-----END PUBLIC KEY-----/g, "")

    .replace(/\s/g, "");

  const raw = atob(b64);

  const buf = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i += 1) buf[i] = raw.charCodeAt(i);

  return buf.buffer;

}



async function verifikujPotpis(payload, potpisB64) {

  const key = await crypto.subtle.importKey(

    "spki",

    pemToSpki(LICENCA_PUBLIC_PEM),

    { name: "Ed25519" },

    false,

    ["verify"],

  );

  const data = new TextEncoder().encode(JSON.stringify(payload));

  const sig = Uint8Array.from(atob(potpisB64), (c) => c.charCodeAt(0));

  return crypto.subtle.verify({ name: "Ed25519" }, key, sig, data);

}



function licencaFajlPreskoceno(razlog) {

  return { ok: true, preskoceno: true, poruka: razlog || "license.json nije prisutan" };

}



function izgledaKaoHtml(text) {

  const t = (text || "").trimStart();

  return t.startsWith("<") || /^<!DOCTYPE/i.test(t);

}



export function normalizujModuli(moduli) {

  if (!moduli || typeof moduli !== "object") return { ...MODULI_DEFAULT };

  return {

    atributivne: moduli.atributivne !== false,

    varijabilne: moduli.varijabilne !== false,

    admin: moduli.admin !== false,

    sifrarnik: moduli.sifrarnik !== false,

  };

}



export function modulDozvoljen(licenca, modulId) {

  if (!licenca?.ok) return false;

  const m = normalizujModuli(licenca.moduli);

  if (modulId === "varijabilne") return m.varijabilne;

  if (modulId === "atributivne") return m.atributivne;

  if (modulId === "admin") return m.admin;

  if (modulId === "sifrarnik") return m.sifrarnik;

  return true;

}



export function formatujDatumLicence(iso) {

  if (!iso) return "—";

  try {

    return new Date(iso).toLocaleString("sr-RS", {

      day: "2-digit", month: "2-digit", year: "numeric",

      hour: "2-digit", minute: "2-digit",

    });

  } catch {

    return String(iso);

  }

}



function sacuvajKes(r) {

  if (!r?.ok) return;

  try {

    localStorage.setItem(LICENCA_CACHE_KEY, JSON.stringify({

      ok: true,

      vazi_do: r.vazi_do,

      napomena: r.napomena,

      tenant_id: r.tenant_id,

      deployment: r.deployment,

      moduli: normalizujModuli(r.moduli),

      max_korisnika: r.max_korisnika ?? null,

      slojevi: r.slojevi,

      sacuvano: Date.now(),

    }));

  } catch {

    /* quota / private mode */

  }

}



function procitajKes() {

  try {

    const raw = localStorage.getItem(LICENCA_CACHE_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (!parsed?.ok || !parsed.sacuvano) return null;

    if (Date.now() - parsed.sacuvano > GRACE_MS) return null;

    if (parsed.vazi_do && new Date(parsed.vazi_do) < new Date()) return null;

    return parsed;

  } catch {

    return null;

  }

}



function mapServerOdgovor(data) {

  if (!data || typeof data !== "object") {

    return { ok: false, kod: "server", poruka: "Neispravan odgovor servera (očekivan JSON)." };

  }

  return {

    ok: !!data.ok,

    kod: data.kod,

    poruka: data.poruka,

    vazi_do: data.vazi_do,

    napomena: data.napomena,

    tenant_id: data.tenant_id || "default",

    deployment: data.deployment || "cloud",

    moduli: normalizujModuli(data.moduli),

    max_korisnika: data.max_korisnika ?? null,

  };

}



/** Sloj A — potpisani public/license.json (opciono) */

export async function proveriLicencuFajl() {

  try {

    const res = await fetch(`${import.meta.env.BASE_URL}license.json`, { cache: "no-store" });

    if (!res.ok) {

      return licencaFajlPreskoceno("license.json nije prisutan (404)");

    }



    const text = await res.text();

    if (!text.trim()) {

      return licencaFajlPreskoceno("license.json je prazan");

    }

    if (izgledaKaoHtml(text)) {

      return licencaFajlPreskoceno("license.json nije prisutan (server vraća HTML)");

    }



    let lic;

    try {

      lic = JSON.parse(text);

    } catch {

      return licencaFajlPreskoceno("license.json nije validan JSON");

    }



    if (!imaJavniKljuc()) {

      return licencaFajlPreskoceno("Javni ključ nije podešen — sloj A preskočen");

    }



    const { potpis, ...payload } = lic;

    if (!potpis || payload.verzija !== 1) {

      return { ok: false, kod: "format", poruka: "Neispravan format licence (license.json)." };

    }

    const valid = await verifikujPotpis(payload, potpis);

    if (!valid) {

      return { ok: false, kod: "potpis", poruka: "Potpis licence nije ispravan." };

    }

    if (!payload.aktivna) {

      return { ok: false, kod: "iskljuceno", poruka: "Program je deaktiviran (licenca fajl)." };

    }

    if (new Date(payload.vazi_do) < new Date()) {

      return { ok: false, kod: "isteklo", poruka: "Licenca je istekla.", vazi_do: payload.vazi_do };

    }

    return {

      ok: true,

      vazi_do: payload.vazi_do,

      tenant_id: payload.tenant_id || "default",

      deployment: payload.deployment || "cloud",

      moduli: normalizujModuli(payload.moduli),

      max_korisnika: payload.max_korisnika ?? null,

    };

  } catch (e) {

    const msg = e.message || "";

    if (msg.includes("<!DOCTYPE") || msg.includes("Unexpected token '<'")) {

      return licencaFajlPreskoceno("license.json nije prisutan");

    }

    return licencaFajlPreskoceno(`Čitanje licence preskočeno: ${msg}`);

  }

}



/** Sloj B — RPC proveri_licencu() na serveru */

export async function proveriLicencuServer() {

  try {

    const { data, error } = await supabase.rpc("proveri_licencu");

    if (error) {

      return { ok: false, kod: "rpc", poruka: error.message || "Provera licence na serveru nije dostupna." };

    }

    return mapServerOdgovor(data);

  } catch (e) {

    return { ok: false, kod: "rpc", poruka: e.message };

  }

}



function spojiSlojeve(server, fajl) {

  const moduli = normalizujModuli({

    ...fajl.moduli,

    ...server.moduli,

  });

  return {

    ok: true,

    vazi_do: server.vazi_do || fajl.vazi_do,

    napomena: server.napomena || fajl.napomena,

    tenant_id: server.tenant_id || fajl.tenant_id || "default",

    deployment: server.deployment || fajl.deployment || "cloud",

    moduli,

    max_korisnika: server.max_korisnika ?? fajl.max_korisnika ?? null,

    slojevi: { server: true, fajl: fajl.preskoceno ? "preskoceno" : true },

  };

}



/** Server obavezan; fajl opciono. Offline grace iz keša. */

export async function proveriLicencuKomplet() {

  if (import.meta.env.VITE_LICENCA_ISKLJUCENA === "1") {

    return {

      ok: true,

      preskoceno: true,

      moduli: { ...MODULI_DEFAULT },

      tenant_id: "dev",

      deployment: "dev",

    };

  }



  const [fajl, server] = await Promise.all([

    proveriLicencuFajl(),

    proveriLicencuServer(),

  ]);



  if (!server.ok) {

    const kes = procitajKes();

    if (kes) {

      return {

        ok: true,

        offlineGrace: true,

        vazi_do: kes.vazi_do,

        napomena: kes.napomena,

        tenant_id: kes.tenant_id,

        deployment: kes.deployment,

        moduli: normalizujModuli(kes.moduli),

        max_korisnika: kes.max_korisnika,

        slojevi: kes.slojevi,

        poruka: `Offline grace (${GRACE_DANA} dana)`,

      };

    }

    if (import.meta.env.DEV && server.kod === "rpc") {

      return {

        ok: true,

        devBypass: true,

        poruka: "Licenca nije podešena (dev režim).",

        moduli: { ...MODULI_DEFAULT },

        tenant_id: "dev",

        deployment: "dev",

      };

    }

    return { ok: false, izvor: "server", ...server };

  }



  if (!fajl.ok && !fajl.preskoceno) {

    return { ok: false, izvor: "fajl", ...fajl };

  }



  const spojeno = spojiSlojeve(server, fajl);

  sacuvajKes(spojeno);

  return spojeno;

}



export { PROVERA_INTERVAL_MS, GRACE_DANA };


