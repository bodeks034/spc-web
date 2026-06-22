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

function listaSessionMatch(parsed, smena, idDeo) {
  if (!parsed?.ok) return false;
  if (Number(parsed.smena) !== Number(smena)) return false;
  const idNorm = normalizujIdDeo(idDeo);
  if (!idNorm) return true;
  return normalizujIdDeo(parsed.id_deo) === idNorm;
}

/** Potvrda da je operater popunio listu za smenu (i ID deo na liniji). */
export function setListaOkSession(modul, smena, idDeo = null) {
  const sm = Number(smena);
  sessionStorage.setItem(sessionKey(modul), JSON.stringify({
    smena: Number.isFinite(sm) ? sm : null,
    id_deo: normalizujIdDeo(idDeo) || null,
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

export function getListaOkSession(modul, smena, idDeo = null) {
  const key = sessionKey(modul);
  const raw = sessionStorage.getItem(key);
  const sm = Number(smena);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (listaSessionMatch(parsed, sm, idDeo)) return true;
    } catch {
      if (raw === "1" && !normalizujIdDeo(idDeo)) return true;
    }
  }
  return !normalizujIdDeo(idDeo) && sessionStorage.getItem(LISTA_SESSION.legacy) === "1";
}

/** Sesija ili zapis u bazi — dovoljno za nastavak na poka-yoke / unos. */
export function kontrolnaListaSpremna(modul, smena, dbZavrsena = false, idDeo = null) {
  return !!dbZavrsena || getListaOkSession(modul, smena, idDeo);
}

export function procitajSmenuIzStorage() {
  return smenaPoSatu();
}

function logZaIdDeo(logs, idDeo) {
  const idNorm = normalizujIdDeo(idDeo);
  if (!idNorm) return logs?.[0] ?? null;
  return (logs || []).find(
    (l) => normalizujIdDeo(l.stavke_json?.id_deo) === idNorm,
  ) ?? null;
}

/** Da li je lista završena danas u bazi + da li postoje aktivne stavke. */
export async function proveriKontrolnaListaDanas(supabase, { radnikId, smena, idDeo = null }) {
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
      zavrsena: !!logZaIdDeo(logs, idDeo),
      imaStavki: (count ?? 0) > 0,
      greska: null,
    };
  } catch (e) {
    return { zavrsena: false, imaStavki: false, greska: e.message };
  }
}
