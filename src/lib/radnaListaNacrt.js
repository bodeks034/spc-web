/**
 * Nacrt radne liste — sve što operater unese pre klika na "Zapiši u bazu"
 * do sada je živelo samo u React state-u i nestajalo na refresh ili kad
 * tablet ubije karticu. Ovde se snima u IndexedDB (fallback localStorage)
 * i vraća pri sledećem otvaranju ekrana.
 */

import { idbPodrzan, idbSnimiNacrt, idbUcitajNacrt, idbObrisiNacrt } from "./offlineQueueDb.js";

const LS_PREFIX = "spc_nacrt_";
/** Nacrt stariji od ovoga je verovatno zaboravljen, ne nudimo ga. */
export const NACRT_VAZI_MS = 12 * 60 * 60 * 1000;

function lsKljuc(kljuc) {
  return `${LS_PREFIX}${kljuc}`;
}

export async function sacuvajNacrt(kljuc, podaci) {
  const zapis = { kljuc, podaci, snimljeno: new Date().toISOString() };
  if (idbPodrzan()) {
    try {
      await idbSnimiNacrt(kljuc, podaci);
      return true;
    } catch (e) {
      console.warn("Nacrt u IndexedDB nije snimljen — fallback localStorage", e);
    }
  }
  try {
    localStorage.setItem(lsKljuc(kljuc), JSON.stringify(zapis));
    return true;
  } catch (e) {
    console.warn("Nacrt nije snimljen", e);
    return false;
  }
}

export async function ucitajNacrt(kljuc) {
  let zapis = null;
  if (idbPodrzan()) {
    try {
      zapis = await idbUcitajNacrt(kljuc);
    } catch (e) {
      console.warn("Nacrt iz IndexedDB nije učitan", e);
    }
  }
  if (!zapis) {
    try {
      const raw = localStorage.getItem(lsKljuc(kljuc));
      if (raw) zapis = JSON.parse(raw);
    } catch { /* neispravan JSON — nacrt se odbacuje */ }
  }
  if (!zapis) return null;

  const staro = Date.now() - new Date(zapis.snimljeno).getTime();
  if (!Number.isFinite(staro) || staro > NACRT_VAZI_MS) {
    await obrisiNacrt(kljuc);
    return null;
  }
  return zapis;
}

export async function obrisiNacrt(kljuc) {
  if (idbPodrzan()) {
    try {
      await idbObrisiNacrt(kljuc);
    } catch { /* */ }
  }
  try {
    localStorage.removeItem(lsKljuc(kljuc));
  } catch { /* */ }
}

/** Ima li nacrt ijednu stavku vrednu vraćanja. */
export function nacrtImaSadrzaj(podaci) {
  if (!podaci) return false;
  if (Array.isArray(podaci)) return podaci.length > 0;
  if (typeof podaci === "object") {
    return Object.values(podaci).some((v) => (Array.isArray(v) ? v.length > 0 : !!v));
  }
  return false;
}
