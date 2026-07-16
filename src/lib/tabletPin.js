/** PIN za brzu smenu operatera na deljenom tabletu (bez Auth logout). */

const PIN_RE = /^\d{4,6}$/;

export function validanPinFormat(pin) {
  return PIN_RE.test(String(pin || "").trim());
}

export async function hashPin(pin, radnikId) {
  const raw = `${String(pin || "").trim()}::spc-tablet::${Number(radnikId) || 0}`;
  const data = new TextEncoder().encode(raw);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function snimiPinRadnika(supabase, radnikId, pin) {
  if (!validanPinFormat(pin)) throw new Error("PIN mora biti 4–6 cifara.");
  const pin_hash = await hashPin(pin, radnikId);
  const { error } = await supabase.from("radnici").update({ pin_hash }).eq("id", radnikId);
  if (error) throw error;
  return true;
}

export async function obrisiPinRadnika(supabase, radnikId) {
  const { error } = await supabase.from("radnici").update({ pin_hash: null }).eq("id", radnikId);
  if (error) throw error;
}

export async function proveriPinRadnika(supabase, radnikId, pin) {
  const { data, error } = await supabase
    .from("radnici")
    .select("id,ime,uloga,email,user_id,aktivan,pin_hash")
    .eq("id", radnikId)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.aktivan === false) throw new Error("Radnik nije aktivan.");
  if (!data.pin_hash) throw new Error("PIN nije postavljen — admin mora podesiti PIN.");
  const h = await hashPin(pin, radnikId);
  if (h !== data.pin_hash) throw new Error("Pogrešan PIN.");
  return data;
}

/** Lista radnika koji imaju PIN (za brzu smenu). */
export async function listaRadnikaSaPin(supabase) {
  const { data, error } = await supabase
    .from("radnici")
    .select("id,ime,uloga,pin_hash,aktivan")
    .eq("aktivan", true)
    .not("pin_hash", "is", null)
    .order("ime");
  if (error) throw error;
  return (data || []).map(({ pin_hash: _p, ...r }) => r);
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

export function idleMinuta() {
  const n = Number(localStorage.getItem(IDLE_KEY));
  return Number.isFinite(n) && n >= 1 ? n : 5;
}

export function snimiIdleMinuta(min) {
  localStorage.setItem(IDLE_KEY, String(Math.max(1, Math.min(60, Number(min) || 5))));
}
