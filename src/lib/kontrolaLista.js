import { smenaPoSatu } from "./smena.js";

/** Kontrolna lista smene — zajednička logika (obavezna za operatere). */

export const LISTA_SESSION = {
  atributivne: "spc_lista_ok_atributivne",
  varijabilne: "spc_lista_ok_varijabilne",
  legacy: "spc_lista_ok",
};

export function danasIso() {
  return new Date().toISOString().split("T")[0];
}

export function normalizujIdDeo(idDeo) {
  return String(idDeo || "").trim().toUpperCase();
}

/** Lista je obavezna za sve uloge u modulu (nema „preskoči“). */
export function kontrolnaListaObavezna() {
  return true;
}

function sessionKey(modul) {
  return modul === "varijabilne" ? LISTA_SESSION.varijabilne : LISTA_SESSION.atributivne;
}

function listaSessionMatch(parsed, smena) {
  if (!parsed?.ok) return false;
  if (parsed.datum && parsed.datum !== danasIso()) return false;
  return Number(parsed.smena) === Number(smena);
}

/** Potvrda da je operater popunio listu za smenu (jednom po smeni 1/2/3). */
export function setListaOkSession(modul, smena) {
  const sm = Number(smena);
  sessionStorage.setItem(sessionKey(modul), JSON.stringify({
    smena: Number.isFinite(sm) ? sm : null,
    datum: danasIso(),
    ok: true,
  }));
}

export function clearListaOkSession(modul) {
  if (modul === "varijabilne") {
    sessionStorage.removeItem(LISTA_SESSION.varijabilne);
  } else {
    sessionStorage.removeItem(LISTA_SESSION.atributivne);
  }
  sessionStorage.removeItem(LISTA_SESSION.legacy);
}

export function getListaOkSession(modul, smena) {
  const key = sessionKey(modul);
  const raw = sessionStorage.getItem(key);
  const sm = Number(smena);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (listaSessionMatch(parsed, sm)) return true;
    } catch {
      if (raw === "1") return false;
    }
  }
  return false;
}

/** Sesija ili zapis u bazi — dovoljno za nastavak na poka-yoke / unos. */
export function kontrolnaListaSpremna(modul, smena, dbZavrsena = false) {
  return !!dbZavrsena || getListaOkSession(modul, smena);
}

export function procitajSmenuIzStorage() {
  return smenaPoSatu();
}

export function logZaSmenu(logs) {
  return logs?.[0] ?? null;
}

/** Da li je lista završena danas u bazi + da li postoje aktivne stavke. */
export async function proveriKontrolnaListaDanas(supabase, { radnikId, smena }) {
  const sm = Number(smena);
  if (!radnikId || !Number.isFinite(sm)) {
    return { zavrsena: false, imaStavki: false, greska: null };
  }

  const danas = danasIso();

  try {
    const [{ data: logs, error: logErr }, { count, error: stErr }] = await Promise.all([
      supabase.from("kontrolna_lista_log")
        .select("id,stavke_json")
        .eq("radnik_id", radnikId)
        .eq("smena", sm)
        .eq("datum", danas)
        .eq("zavrsena", true),
      supabase.from("kontrolna_lista_stavke")
        .select("id", { count: "exact", head: true })
        .eq("aktivna", true),
    ]);

    if (logErr) throw logErr;
    if (stErr) throw stErr;

    return {
      zavrsena: !!logZaSmenu(logs),
      imaStavki: (count ?? 0) > 0,
      greska: null,
    };
  } catch (e) {
    return { zavrsena: false, imaStavki: false, greska: e.message };
  }
}
