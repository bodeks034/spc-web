import { normalizujIdDeo } from "./idDeoUtil.js";
import { GLAVNI_UNOS_BROJ_MERENJA_DEFAULT } from "./glavniUnosCore.js";

/** Polja koja se ponavljaju za sve dimenzije istog dela (zaglavlje). */
export const GLAVNI_UNOS_GENERALIJA_POLJA = [
  "id_deo",
  "radni_nalog",
  "kupac",
  "naziv_dela",
  "broj_crteza",
  "linija",
  "operacija",
  "masina_id",
  "ukupno_kom",
  "kom_za_kontrolu_n",
  "slika",
  "kontolor",
  "nivo_kontrole_fac",
];

/** Polja specifična po dimenziji / karakteristici. */
export const GLAVNI_UNOS_DIMENZIJA_POLJA = [
  "karakteristika",
  "tip",
  "klasa",
  "nominal",
  "usl",
  "lsl",
  "jedinica",
  "instrument",
  "spc_broj_merenja",
  "fac_broj",
];

export function praznaDimenzijaPolja(tip = "Merljiva") {
  return {
    karakteristika: "",
    tip: tip || "Merljiva",
    klasa: "",
    nominal: "",
    usl: "",
    lsl: "",
    jedinica: "mm",
    instrument: "",
    spc_broj_merenja: GLAVNI_UNOS_BROJ_MERENJA_DEFAULT,
    fac_broj: "",
  };
}

/** Polja dimenzije koja se kopiraju pri dupliranju (bez karakteristike). */
export const GRUPNI_KOPIJA_DIM_POLJA = GLAVNI_UNOS_DIMENZIJA_POLJA.filter(
  (k) => k !== "karakteristika",
);

export function kopirajDimenzijaPolja(izvor, { zadrziKarakteristiku = "" } = {}) {
  const out = praznaDimenzijaPolja(izvor?.tip);
  if (!izvor) return out;
  for (const k of GRUPNI_KOPIJA_DIM_POLJA) {
    const v = izvor[k];
    if (v != null && v !== "") out[k] = v;
  }
  if (zadrziKarakteristiku) out.karakteristika = zadrziKarakteristiku;
  return out;
}

/** Poslednji red sa istim ID dela (preferira red sa popunjenom karakteristikom). */
export function nadjiSablonZaDeo(redovi, idDeo, osimIdx = -1) {
  const id = normalizujIdDeo(idDeo);
  if (!id || !Array.isArray(redovi)) return null;

  for (let i = redovi.length - 1; i >= 0; i--) {
    if (i === osimIdx) continue;
    const r = redovi[i];
    if (normalizujIdDeo(r?.id_deo) !== id) continue;
    if (String(r.karakteristika || "").trim()) return r;
  }
  for (let i = redovi.length - 1; i >= 0; i--) {
    if (i === osimIdx) continue;
    if (normalizujIdDeo(redovi[i]?.id_deo) === id) return redovi[i];
  }
  return null;
}

export function brojDimenzijaZaDeo(redovi, idDeo) {
  const id = normalizujIdDeo(idDeo);
  if (!id) return 0;
  return redovi.filter((r) => normalizujIdDeo(r?.id_deo) === id).length;
}

/** Kopira zaglavlje dela; dimenzija ostaje prazna. */
export function kopirajGeneraleUSablon(sablon, prazanRed = {}) {
  const out = { ...prazanRed };
  if (!sablon) return out;
  for (const k of GLAVNI_UNOS_GENERALIJA_POLJA) {
    const v = sablon[k];
    if (v != null && v !== "") out[k] = v;
  }
  out.id_deo = normalizujIdDeo(sablon.id_deo) || sablon.id_deo || "";
  return out;
}

/** Novi red: isto zaglavlje, prazna dimenzija (isti tip kao šablon). */
export function novaDimenzijaRed(sablon, prazanRed = {}) {
  const base = kopirajGeneraleUSablon(sablon, prazanRed);
  const dim = praznaDimenzijaPolja(sablon?.tip);
  return { ...base, ...dim };
}

/**
 * Kada korisnik unese ID koji već postoji na listi, dopuni zaglavlje iz postojećeg reda.
 * Ne prepisuje već unetu karakteristiku / granice.
 */
export function primeniSablonNaRed(redovi, red, osimIdx = -1) {
  const id = normalizujIdDeo(red?.id_deo);
  if (!id) return red;
  const sablon = nadjiSablonZaDeo(redovi, id, osimIdx);
  if (!sablon) return { ...red, id_deo: id };

  const merged = kopirajGeneraleUSablon(sablon, red);
  for (const k of GLAVNI_UNOS_DIMENZIJA_POLJA) {
    if (red[k] != null && red[k] !== "") merged[k] = red[k];
  }
  merged.id_deo = id;
  return merged;
}

/** Pretvara grupni unos (zaglavlje + N dimenzija) u niz redova za glavni_unos_redovi. */
export function redoviIzGrupnogUnosa(zaglavlje, dimenzije, prazanRed = {}) {
  const id = normalizujIdDeo(zaglavlje?.id_deo);
  if (!id) return [];

  const base = kopirajGeneraleUSablon({ ...zaglavlje, id_deo: id }, prazanRed);

  return (dimenzije || [])
    .filter((d) => String(d?.karakteristika || "").trim())
    .map((d) => ({
      ...base,
      ...praznaDimenzijaPolja(d?.tip),
      ...d,
      id_deo: id,
    }));
}

export function pocetneGrupneDimenzije(broj = 5, tip = "Merljiva") {
  const n = Math.max(1, Math.min(20, Number(broj) || 5));
  return Array.from({ length: n }, () => praznaDimenzijaPolja(tip));
}
