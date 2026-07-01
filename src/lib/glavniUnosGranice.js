/**
 * LSL / USL / nominal u glavnom unosu — mm ili stepeni (DMS).
 */
import {
  isUgao,
  samoCifre,
  formatStep,
  formatLiveStep,
  prikazUgaoGranica,
  toDecStepen,
} from "./varijabilneUtils.js";

export { isUgao as jeGlavniUnosUgao };

export function granicaZaSnimanje(v, jedinica) {
  if (v === "" || v == null) return null;
  if (!isUgao(jedinica)) {
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  const s = String(v).trim();
  const cifre = samoCifre(s);
  if (cifre.length >= 5 && cifre.length <= 7) {
    const packed = parseInt(cifre, 10);
    const m = Math.floor((packed % 10000) / 100);
    const sec = packed % 100;
    if (m <= 59 && sec <= 59) return packed;
  }
  const dec = toDecStepen(s);
  if (Number.isFinite(dec)) {
    if (dec > 180) return Math.round(dec);
    return dec;
  }
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function granicaZaPrikaz(v, jedinica) {
  if (v == null || v === "") return "";
  if (!isUgao(jedinica)) return String(v);
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return prikazUgaoGranica(n);
}

export function granicaTextZaKarakteristiku(v, jedinica) {
  if (v == null || v === "") return null;
  if (!isUgao(jedinica)) return String(v);
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return prikazUgaoGranica(n);
}

export function formatGraniceRedZaFormu(r) {
  const jed = r?.jedinica || "mm";
  return {
    ...r,
    nominala: granicaZaPrikaz(r.nominala, jed),
    usl: granicaZaPrikaz(r.usl, jed),
    lsl: granicaZaPrikaz(r.lsl, jed),
  };
}

/** Live unos DMS u formi (kao merljivi unos). */
export function sanitizujUnosUgaoGranice(raw) {
  const s = String(raw ?? "");
  const cifre = samoCifre(s);
  if (!cifre && !s.trim()) return "";
  if (/°|['"]/.test(s) && cifre.length >= 5) return formatStep(cifre);
  return formatLiveStep(s);
}
