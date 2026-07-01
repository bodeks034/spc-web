/**
 * Koji dijagram (silueta vozila) za koji model.
 * Zone (K, M, T…) uvek crta aplikacija — u slici ide samo oblik vozila, bez krugova.
 *
 * Prioritet: statička mapa (NTV/MRAP/MRAP1) → tipovi_vozila.dijagram_src → ugrađena limuzina.
 */

import { ucitajPrikazSliku } from "./slikePaths.js";

export const VOZILO_DIJAGRAMI = {
  default: null,

  "NTV-001": "/vozilo/dijagrami/NTV.png",
  NTV: "/vozilo/dijagrami/NTV.png",

  "MRAP-001": "/vozilo/dijagrami/MRAP.png",
  MRAP: "/vozilo/dijagrami/MRAP.png",

  "MRAP1-001": "/vozilo/dijagrami/MRAP1.png",
  MRAP1: "/vozilo/dijagrami/MRAP1.png",

  "FINAL-001": "/vozilo/dijagrami/auto-limuzina.svg",
  "AUTO-001": "/vozilo/dijagrami/auto-limuzina.svg",

  SUV: "/vozilo/dijagrami/suv.svg",
  "AUTO-SUV": "/vozilo/dijagrami/suv.svg",

  KAMION: "/vozilo/dijagrami/kamion.svg",
  "AUTO-KAMION": "/vozilo/dijagrami/kamion.svg",

  DZIP: "/vozilo/dijagrami/dzip.svg",
  "AUTO-DZIP": "/vozilo/dijagrami/dzip.svg",

  KOMBI: "/vozilo/dijagrami/kombi.svg",
  "AUTO-KOMBI": "/vozilo/dijagrami/kombi.svg",

  LIMUZINA: "/vozilo/dijagrami/auto-limuzina.svg",
};

const PREFIKS_DIJAGRAM = [
  ["MRAP1", "MRAP1-001"],
  ["MRAP", "MRAP-001"],
  ["NTV", "NTV-001"],
];

function kljucDijagrama(k) {
  const u = String(k || "").trim().toUpperCase();
  if (!u) return null;
  if (Object.prototype.hasOwnProperty.call(VOZILO_DIJAGRAMI, u)) return u;
  for (const [pref, mapKey] of PREFIKS_DIJAGRAM) {
    if (u === pref || u.startsWith(`${pref}-`)) return mapKey;
  }
  return null;
}

/** Kod tipa vozila iz dela (vozilo_katalog_id ili prefiks id_deo). */
export function tipKodZaDeo(deo, tipovi = []) {
  if (!deo) return null;
  const kandidati = new Set();
  for (const raw of [deo.vozilo_katalog_id, deo.id_deo].filter(Boolean)) {
    const u = String(raw).trim().toUpperCase();
    kandidati.add(u);
    kandidati.add(u.split("-")[0]);
    const mapKey = kljucDijagrama(raw);
    if (mapKey) kandidati.add(mapKey.split("-")[0]);
  }
  for (const kod of kandidati) {
    if (tipovi.some((t) => t.kod === kod)) return kod;
  }
  return null;
}

function dijagramIzTipova(deo, tipovi) {
  if (!tipovi?.length) return null;
  const kod = tipKodZaDeo(deo, tipovi);
  if (!kod) return null;
  const tip = tipovi.find((t) => t.kod === kod);
  const src = String(tip?.dijagram_src || "").trim();
  return src || null;
}

function statickiDijagramZaDeo(deo) {
  if (!deo) return null;
  for (const raw of [deo.id_deo, deo.vozilo_katalog_id].filter(Boolean)) {
    const k = kljucDijagrama(raw);
    if (k && VOZILO_DIJAGRAMI[k]) return VOZILO_DIJAGRAMI[k];
  }
  return null;
}

/**
 * Sirova putanja (public, Storage ključ ili null za ugrađeni crtež).
 * @param {{ vozilo_katalog_id?: string, id_deo?: string } | null | undefined} deo
 * @param {{ kod: string, dijagram_src?: string }[] | null | undefined} [tipovi]
 */
export function dijagramSrcZaDeo(deo, tipovi = null) {
  if (!deo) return VOZILO_DIJAGRAMI.default;

  const staticki = statickiDijagramZaDeo(deo);
  if (staticki) return staticki;

  const fromDb = dijagramIzTipova(deo, tipovi);
  if (fromDb) return fromDb;

  return VOZILO_DIJAGRAMI.default;
}

/** URL za &lt;img&gt; — public putanja ili signed URL iz Storage-a. */
export async function dijagramUrlZaPrikaz(src, supabase) {
  const s = String(src || "").trim();
  if (!s) return null;
  if (s.startsWith("/") || /^https?:\/\//i.test(s)) return s;
  return ucitajPrikazSliku(supabase, "atributivne", s);
}
