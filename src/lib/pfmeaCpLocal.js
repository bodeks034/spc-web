/**
 * Lokalni fallback dok Supabase migracija nije primenjena.
 */

import { izracunajRpnSummary, normalizujPfmeaCpRed } from "./pfmeaControlPlan.js";

const KEY = "spc_pfmea_cp_local_v2";

function id() {
  return `local-${Date.now().toString(36)}`;
}

function ucitaj() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function snimi(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr));
}

export function localListaDokumenata() {
  return ucitaj()
    .filter((d) => d.aktivan !== false)
    .sort((a, b) => (b.azurirano || "").localeCompare(a.azurirano || ""))
    .map((d) => ({
      id: d.id,
      naziv: d.naziv,
      id_deo: d.idDeo,
      revizija: d.revizija,
      updated_at: d.azurirano,
      osmd_izvestaj_id: d.osmdIzvestajId || null,
      broj_8d: d.broj8d || "",
      napomena: d.napomena || "",
    }));
}

export function localUcitajDokument(docId) {
  const d = ucitaj().find((x) => x.id === docId);
  if (!d) return null;
  return {
    ...d,
    pfmea: { redovi: (d.pfmea?.redovi || []).map(normalizujPfmeaCpRed) },
    controlPlan: { redovi: (d.controlPlan?.redovi || []).map(normalizujPfmeaCpRed) },
    rpnSummary: d.rpnSummary || izracunajRpnSummary(d.pfmea?.redovi),
  };
}

export function localKreirajDokument({
  naziv, idDeo, revizija, osmdIzvestajId, broj8d, napomena,
} = {}) {
  const doc = {
    id: id(),
    naziv: naziv || "PFMEA / Control Plan",
    idDeo: idDeo || "",
    revizija: revizija || "A",
    napomena: napomena || "",
    osmdIzvestajId: osmdIzvestajId || null,
    broj8d: broj8d || "",
    kreirano: new Date().toISOString(),
    azurirano: new Date().toISOString(),
    aktivan: true,
    pfmea: { redovi: [] },
    controlPlan: { redovi: [] },
    rpnSummary: [],
  };
  const svi = ucitaj();
  svi.unshift(doc);
  snimi(svi);
  return doc;
}

export function localSacuvajDokument(doc) {
  const svi = ucitaj();
  const idx = svi.findIndex((d) => d.id === doc.id);
  const azurirano = {
    ...doc,
    azurirano: new Date().toISOString(),
    rpnSummary: izracunajRpnSummary(doc.pfmea?.redovi),
  };
  if (idx >= 0) svi[idx] = azurirano;
  else svi.unshift(azurirano);
  snimi(svi);
  return azurirano;
}

export function localObrisiDokument(docId) {
  snimi(ucitaj().map((d) => (d.id === docId ? { ...d, aktivan: false } : d)));
}

export function localDuplirajDokument(docId) {
  const src = localUcitajDokument(docId);
  if (!src) throw new Error("Dokument nije pronađen");
  const kopija = {
    ...JSON.parse(JSON.stringify(src)),
    id: id(),
    naziv: `${src.naziv} (kopija)`,
    kreirano: new Date().toISOString(),
    azurirano: new Date().toISOString(),
  };
  const svi = ucitaj();
  svi.unshift(kopija);
  snimi(svi);
  return kopija;
}
