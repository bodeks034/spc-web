/** PIN za brzu smenu operatera na deljenom tabletu (bez Auth logout). */

import { GO_LIVE_RPC_PORUKA } from "./schemaCheck.js";

const PIN_RE = /^\d{4,6}$/;

export function validanPinFormat(pin) {
  return PIN_RE.test(String(pin || "").trim());
}

/** Legacy SHA-256 — samo za migraciju starih hash-eva unutar RPC (92). Ne koristiti klijentski. */
export async function hashPin(pin, radnikId) {
  const raw = `${String(pin || "").trim()}::spc-tablet::${Number(radnikId) || 0}`;
  const data = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function rpcNedostaje(error) {
  const s = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return s.includes("pgrst202") || s.includes("could not find the function") || s.includes("does not exist");
}

function zahtevajPinRpc(error) {
  if (rpcNedostaje(error)) {
    throw new Error(`${GO_LIVE_RPC_PORUKA} (PIN: 92_bezbednost_rls_i_pin.sql)`);
  }
  throw error;
}

export async function snimiPinRadnika(supabase, radnikId, pin) {
  if (!validanPinFormat(pin)) throw new Error("PIN mora biti 4–6 cifara.");

  const { data, error } = await supabase.rpc("postavi_pin_radnika", {
    p_radnik_id: Number(radnikId),
    p_pin: String(pin).trim(),
  });
  if (!error) {
    if (data && data.ok === false) throw new Error(data.poruka || "PIN nije sačuvan.");
    return true;
  }
  zahtevajPinRpc(error);
}

export async function obrisiPinRadnika(supabase, radnikId) {
  const { data, error } = await supabase.rpc("postavi_pin_radnika", {
    p_radnik_id: Number(radnikId),
    p_pin: "",
  });
  if (!error) {
    if (data && data.ok === false) throw new Error(data.poruka || "PIN nije obrisan.");
    return;
  }
  zahtevajPinRpc(error);
}

export async function proveriPinRadnika(supabase, radnikId, pin) {
  const { data, error } = await supabase.rpc("proveri_pin_radnika", {
    p_radnik_id: Number(radnikId),
    p_pin: String(pin || "").trim(),
  });
  if (!error) {
    if (!data || data.ok !== true) throw new Error(data?.poruka || "Pogrešan PIN.");
    return data.radnik;
  }
  zahtevajPinRpc(error);
}

/** Lista radnika koji imaju PIN (za brzu smenu). */
export async function listaRadnikaSaPin(supabase) {
  const { data, error } = await supabase.rpc("radnici_sa_pinom");
  if (!error) return data || [];
  zahtevajPinRpc(error);
}

export function korisnikIzRadnika(radnik, authUser) {
  const ulogaRaw = String(radnik?.uloga || "kontrolor").toLowerCase().trim();
  const uloga = ["admin", "kontrolor", "operator", "kvalitet", "sef"].includes(ulogaRaw)
    ? ulogaRaw
    : "kontrolor";
  return {
    id: authUser?.id || null,
    email: authUser?.email || radnik?.email || "",
    ime: radnik?.ime || "Operater",
    uloga,
    radnikId: radnik?.id ?? null,
    deaktiviran: false,
    userLinked: !!radnik?.user_id,
    tabletSmena: true,
  };
}

const IDLE_KEY = "spc_tablet_idle_min";

function safeLocalGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalSet(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* private mode / quota */
  }
}

/** Podrazumevano 10 min — 5 je kratko za čekanje / čitanje na liniji. */
export function idleMinuta() {
  const n = Number(safeLocalGet(IDLE_KEY));
  return Number.isFinite(n) && n >= 1 ? n : 10;
}

export function snimiIdleMinuta(min) {
  safeLocalSet(IDLE_KEY, String(Math.max(1, Math.min(60, Number(min) || 10))));
}
