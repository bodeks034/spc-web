/**
 * Radni tok Modula 0 — poslednji deo, dnevni brojač, „Gotovo → sledeći“.
 */

import { normalizujKodLinije } from "./linijaProizvoda.js";
import { logSifrarnikAudit, fetchDanasZatvorenoIzAudit } from "./sifrarnikAudit.js";

const LAST_KEY = "spc_sifrarnik_poslednji_deo";
const DAN_KEY = "spc_sifrarnik_danas_zatvoreno";
const TOUR_KEY = "spc_sifrarnik_radni_tour_done";
const GOTOV_KEY = "spc_sifrarnik_gotovo_sledeci";
const RED_KEY = "spc_sifrarnik_gotovo_red";

function danasIso() {
  return new Date().toISOString().slice(0, 10);
}

function normIdLista(lista) {
  return [...new Set(
    (lista || [])
      .map((x) => String(x || "").trim().toUpperCase())
      .filter(Boolean),
  )];
}

/** @returns {{ idDeo: string, tab?: string, linija?: string, ts: string } | null} */
export function ucitajPoslednjiDeo() {
  try {
    const raw = JSON.parse(localStorage.getItem(LAST_KEY) || "null");
    if (!raw?.idDeo) return null;
    return {
      idDeo: String(raw.idDeo).trim().toUpperCase(),
      tab: raw.tab || null,
      linija: normalizujKodLinije(raw.linija) || "",
      ts: raw.ts || null,
    };
  } catch {
    return null;
  }
}

export function sacuvajPoslednjiDeo({ idDeo, tab = null, linija = "" } = {}) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return;
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify({
      idDeo: id,
      tab: tab || null,
      linija: normalizujKodLinije(linija) || "",
      ts: new Date().toISOString(),
    }));
  } catch { /* ignore */ }
}

/** Broj delova označenih kompletnim danas (lokalno, po browseru). */
export function ucitajDanasnjiBrojac() {
  try {
    const raw = JSON.parse(localStorage.getItem(DAN_KEY) || "null");
    if (!raw || raw.dan !== danasIso()) return { dan: danasIso(), broj: 0, ids: [], izvor: "lokal" };
    return {
      dan: raw.dan,
      broj: Number(raw.broj) || 0,
      ids: Array.isArray(raw.ids) ? raw.ids : [],
      izvor: "lokal",
    };
  } catch {
    return { dan: danasIso(), broj: 0, ids: [], izvor: "lokal" };
  }
}

/** Zabeleži zatvoren (kompletan) deo — jednom po ID po danu (lokalno). */
export function beleziZatvorenDeo(idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return ucitajDanasnjiBrojac();
  const cur = ucitajDanasnjiBrojac();
  if (cur.ids.includes(id)) return cur;
  const next = {
    dan: danasIso(),
    broj: cur.broj + 1,
    ids: [...cur.ids, id].slice(-200),
    izvor: "lokal",
  };
  try {
    localStorage.setItem(DAN_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
  return next;
}

/** Lokalni brojač + audit insert (timski ritam). */
export async function beleziZatvorenDeoAsync(idDeo) {
  const lokal = beleziZatvorenDeo(idDeo);
  const id = String(idDeo || "").trim().toUpperCase();
  if (id) {
    await logSifrarnikAudit({
      idDeo: id,
      akcija: "zatvoren_deo",
      izvor: "radni_tok",
    });
  }
  return lokal;
}

/** Spoji lokalni i audit brojač (distinct ID). */
export async function ucitajDanasnjiBrojacSpojen() {
  const lokal = ucitajDanasnjiBrojac();
  try {
    const audit = await fetchDanasZatvorenoIzAudit();
    const ids = normIdLista([...lokal.ids, ...(audit.ids || [])]);
    return {
      dan: lokal.dan,
      broj: ids.length,
      ids,
      izvor: audit.broj > 0 ? "audit+lokal" : "lokal",
    };
  } catch {
    return lokal;
  }
}

export function tourZavrsen() {
  try {
    return localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    return false;
  }
}

export function zavrsiTour() {
  try {
    localStorage.setItem(TOUR_KEY, "1");
  } catch { /* ignore */ }
}

/** Omogući ponovno prikazivanje obuke. */
export function resetujTour() {
  try {
    localStorage.removeItem(TOUR_KEY);
  } catch { /* ignore */ }
}

/** Session flag — Hub prikazuje „Gotovo → sledeći“. */
export function postaviGotovoSledeci({ idDeo = null, idDeovi = null, akcija = null } = {}) {
  const ids = normIdLista(idDeovi?.length ? idDeovi : (idDeo ? [idDeo] : []));
  try {
    sessionStorage.setItem(GOTOV_KEY, JSON.stringify({
      idDeo: ids[0] || (idDeo ? String(idDeo).trim().toUpperCase() : null),
      idDeovi: ids,
      akcija,
      ts: Date.now(),
    }));
  } catch { /* ignore */ }
}

export function ucitajGotovoSledeci({ maxAgeMs = 120000 } = {}) {
  try {
    const raw = JSON.parse(sessionStorage.getItem(GOTOV_KEY) || "null");
    if (!raw?.ts) return null;
    if (Date.now() - raw.ts > maxAgeMs) {
      sessionStorage.removeItem(GOTOV_KEY);
      return null;
    }
    return {
      ...raw,
      idDeovi: normIdLista(raw.idDeovi || (raw.idDeo ? [raw.idDeo] : [])),
    };
  } catch {
    return null;
  }
}

export function obrisiGotovoSledeci() {
  try {
    sessionStorage.removeItem(GOTOV_KEY);
  } catch { /* ignore */ }
}

/** Red preostalih ID-eva iz batch snimanja (Gotovo → sledeći kroz više). */
export function postaviGotovoRed(ids = []) {
  const lista = normIdLista(ids);
  try {
    if (!lista.length) {
      sessionStorage.removeItem(RED_KEY);
      return;
    }
    sessionStorage.setItem(RED_KEY, JSON.stringify({ ids: lista, ts: Date.now() }));
  } catch { /* ignore */ }
}

export function ucitajGotovoRed() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(RED_KEY) || "null");
    const ids = normIdLista(raw?.ids);
    if (!ids.length) return [];
    return ids;
  } catch {
    return [];
  }
}

export function obrisiGotovoRed() {
  postaviGotovoRed([]);
}

/**
 * Podeli listu ID-eva na kompletirane vs. sa sledećim korakom.
 * @param {Array<{ id: string, status?: string, koraci?: Array<{ tab: string, ctx?: object, label?: string }> }>} navLista
 */
export function podeliGotovoRed(navLista = []) {
  const kompletirani = [];
  const pending = [];
  for (const n of navLista || []) {
    const id = String(n?.id || n?.idDeo || "").trim().toUpperCase();
    if (!id) continue;
    if (n.status === "kompletan") {
      kompletirani.push(id);
      continue;
    }
    const korak = n.koraci?.[0] || n.korak || null;
    if (korak?.tab) pending.push({ id, korak });
  }
  return { kompletirani, pending };
}

export const RADNI_FILTERI = [
  { id: "", label: "Svi" },
  { id: "gu", label: "GU" },
  { id: "greske", label: "Greške" },
  { id: "crtez", label: "Crtež" },
  { id: "barkod", label: "Barkod" },
];

/** Mapiranje filter ključa → label u `nedostaje` nizu. */
export const RADNI_FILTER_NEDOSTAJE = {
  gu: "Glavni unos",
  greske: "Greške",
  crtez: "Crtež",
  barkod: "Barkod profil",
};

/** Da li delimična stavka odgovara filteru (GU / greške / crtež / barkod). */
export function stavkaOdgovaraRadniFilter(stavka, filterKey) {
  const key = String(filterKey || "").trim();
  if (!key) return true;
  const label = RADNI_FILTER_NEDOSTAJE[key];
  if (!label) return true;
  return (stavka?.nedostaje || []).includes(label);
}

/** Jedinstveni ID-evi sa sheeta / filtera za status event. */
export function idDeoviIzKonteksta(redovi, filterId = "") {
  const f = String(filterId || "").trim().toUpperCase();
  if (f) return [f];
  return normIdLista((redovi || []).map((r) => r?.id_deo));
}
