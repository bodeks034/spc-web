import { pogonKodKarakteristike, propagirajMetaKarakteristika } from "./definicijaKarakteristika.js";

/**
 * Port VBA / Excel DATA logike (ToDec, uglovi, OK/NOK).
 *
 * Excel (lista DATA):
 * =IF(O7="Ugao";
 *   INT(G7/10000) + (INT(MOD(G7;10000)/100)/60) + (MOD(G7;100)/3600);
 *   G7)
 */

/** Excel INT — zaokružuje nadole. */
function excelInt(x) {
  return Math.floor(x);
}

/** Excel MOD — ostatak kao u Excelu. */
function excelMod(n, d) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return NaN;
  return n - d * excelInt(n / d);
}

/**
 * Grana IF kada je O7 = "Ugao" (G7 = pakovani ugao).
 * 15000 → 1,833333 mm; 450000 → 45 mm.
 */
export function excelUgaoG7(g7) {
  const g = Number(g7);
  if (!Number.isFinite(g)) return 0;
  const d = excelInt(g / 10000);
  const m = excelInt(excelMod(g, 10000) / 100);
  const s = excelMod(g, 100);
  return d + m / 60 + s / 3600;
}

/**
 * Cela Excel formula: IF(O7="Ugao"; …; G7).
 * @param {number|string} g7 — DATA!G7
 * @param {string} tipO7 — DATA!O7 (npr. "Ugao", "stepen", "mm")
 */
export function excelDataG7(g7, tipO7) {
  if (isUgao(tipO7)) return excelUgaoG7(g7);
  const n = Number(g7);
  return Number.isFinite(n) ? n : 0;
}

/** DATA!O7="Ugao" ili jedinica stepen u šifarniku. */
export function isUgao(tipO7) {
  const j = String(tipO7 || "").trim().toLowerCase();
  return j === "ugao" || j.startsWith("step") || j.includes("ugao");
}

/** Šifarnik / Excel ponekad ima jedinicu mm, a granice su u stepenima (44–46). */
export function prepoznajUgaoKarakteristiku(k) {
  if (!k) return false;
  if (isUgao(k.jedinica)) return true;
  const blob = `${k.pozicija || ""} ${k.naziv_mere || ""} ${k.merni_instrument || ""}`.toLowerCase();
  return blob.includes("ugao") || blob.includes("uglomer");
}

const JEDINICE_MERE = new Set(["mm", "stepen", "ugao", "μm", "um", "µm", "deg", "degree", "ra", ""]);

function izgledaKaoNazivMerila(s) {
  const t = String(s || "").trim().toLowerCase();
  if (!t || JEDINICE_MERE.has(t)) return false;
  return /merilo|metar|uglomer|komparator|profilomet|tolerancijski|sublere|kalibrator|cep/.test(t);
}

/**
 * Uvoz/CSV ponekad pomeri kolone: Profilometrar završi u jedinici, mm u napomeni.
 */
export function normalizujKarakteristikuRed(k) {
  if (!k) return k;
  let instrument = String(k.merni_instrument || "").trim();
  let jedinica = String(k.jedinica || "").trim();
  const napomena = String(k.napomena || "").trim();

  if (!instrument && izgledaKaoNazivMerila(jedinica)) {
    instrument = jedinica;
    jedinica = JEDINICE_MERE.has(napomena.toLowerCase()) ? napomena : "mm";
  } else if (!instrument && izgledaKaoNazivMerila(napomena)) {
    instrument = napomena;
    if (!jedinica || izgledaKaoNazivMerila(jedinica)) jedinica = "mm";
  } else if (instrument && !jedinica && JEDINICE_MERE.has(napomena.toLowerCase())) {
    jedinica = napomena;
  }

  return {
    ...k,
    merni_instrument: instrument || k.merni_instrument,
    jedinica: jedinica || k.jedinica || "mm",
  };
}

/** Da li je vrednost pakovani DMS (npr. 440000, 15000), ne običan mm broj. */
export function izgledaPakovaniUgao(raw) {
  const cifre = samoCifre(raw);
  if (cifre.length < 5 || cifre.length > 7) return false;
  const packed = parseInt(cifre, 10);
  const m = Math.floor((packed % 10000) / 100);
  const sec = packed % 100;
  return m <= 59 && sec <= 59;
}

/** LSL/USL/nominala u mm-skali za uglove (excelUgaoG7). */
export function graniceIzKarakteristike(k) {
  k = normalizujKarakteristikuRed(k);
  const jeUgao = prepoznajUgaoKarakteristiku(k);
  const jedinica = jeUgao ? (k.jedinica && isUgao(k.jedinica) ? k.jedinica : "Ugao") : (k.jedinica || "");

  const fmtTxt = (text, num) => {
    if (!jeUgao) return (text != null && String(text).trim() !== "") ? String(text) : String(num ?? "");
    const t = String(text ?? "").trim();
    if (t && (/°|['"]/.test(t) || /[°'"]/.test(t))) return t;
    if (/^\d{4,7}$/.test(t)) return formatStep(t);
    const n = num ?? (/^\d{4,7}$/.test(t) ? Number(t) : null);
    if (Number.isFinite(n) && n >= 1000) return formatStep(String(Math.round(n)));
    if (t) return t;
    return Number.isFinite(num) ? formatStep(String(Math.round(num))) : "—";
  };

  let lslT = k.lsl_text ?? (k.lsl != null ? String(k.lsl) : "");
  let uslT = k.usl_text ?? (k.usl != null ? String(k.usl) : "");
  let lslDec = toDec(lslT, jedinica);
  let uslDec = toDec(uslT, jedinica);

  if (jeUgao) {
    if (!Number.isFinite(lslDec) || lslDec > 180) lslDec = toDec(String(k.lsl ?? ""), jedinica);
    if (!Number.isFinite(uslDec) || uslDec > 180) uslDec = toDec(String(k.usl ?? ""), jedinica);
    if (Number.isFinite(lslDec) && Number.isFinite(uslDec) && lslDec > uslDec) {
      [lslDec, uslDec] = [uslDec, lslDec];
      [lslT, uslT] = [uslT, lslT];
    }
  }

  let nominalDec = null;
  if (k.nominala != null && k.nominala !== "") {
    if (jeUgao) {
      const n = Number(k.nominala);
      if (Number.isFinite(n) && n > 0 && n <= 180) nominalDec = n;
      else nominalDec = toDec(String(k.nominala), jedinica);
      if (Number.isFinite(nominalDec) && nominalDec > 180) {
        nominalDec = excelUgaoG7(Math.round(n));
      }
    } else if (Number.isFinite(Number(k.nominala))) {
      nominalDec = Number(k.nominala);
    } else {
      nominalDec = toDec(String(k.nominala), jedinica);
    }
    if (!Number.isFinite(nominalDec)) nominalDec = null;
  }

  return {
    jeUgao,
    jedinica,
    lslText: fmtTxt(lslT, k.lsl),
    uslText: fmtTxt(uslT, k.usl),
    lslDec: Number.isFinite(lslDec) ? lslDec : 0,
    uslDec: Number.isFinite(uslDec) ? uslDec : 0,
    nominalDec,
  };
}

/** Kolona koristi DMS unos (stepeni). */
export function koristiUgaoUnosKolone(k) {
  return prepoznajUgaoKarakteristiku(k) || isUgao(k?.jedinica);
}

import { jeAtributivnaPoInstrumentu, jeMerljivaPoInstrumentu } from "./karakteristikaMerljive.js";
import { faiObaveznoIzReda, faiBrojMerenjaIzKolone } from "./faiWorkflow.js";
import { faiBrojMerenjaIzReda } from "./karakteristikaMerljive.js";
import { labelKlasaSaPragom } from "./spcAlarmPragovi.js";
import { GLAVNI_UNOS_BROJ_MERENJA_DEFAULT } from "./spcDefaults.js";

/** Da li red ide u merljivi unos (dimenzije/SPC), a ne u atributivni OK/NOK. */
export function jeMerljivaKarakteristika(k) {
  if (!k) return false;
  if (jeAtributivnaPoInstrumentu(k)) return false;
  return jeMerljivaPoInstrumentu(k);
}

/** Korak za +/- stepper na liniji (null = bez steppera, npr. uglovi). */
export function korakUnosaMerenja(k) {
  if (koristiUgaoUnosKolone(k)) return null;
  const nom = k?.nominalDec;
  if (Number.isFinite(nom)) {
    const s = String(nom);
    const tacka = s.indexOf(".");
    if (tacka >= 0) {
      const dec = s.length - tacka - 1;
      return Math.pow(10, -Math.min(Math.max(dec, 1), 3));
    }
  }
  const lsl = k?.lslDec;
  const usl = k?.uslDec;
  if (Number.isFinite(lsl) && Number.isFinite(usl)) {
    const span = Math.abs(usl - lsl);
    if (span > 0 && span < 1) return 0.01;
    if (span >= 1 && span < 10) return 0.1;
  }
  return 0.01;
}

/** inputMode za ugrađenu tastaturu na telefonu/tabletu. */
export function inputModeMerenja(k) {
  return koristiUgaoUnosKolone(k) ? "numeric" : "decimal";
}

/** Unos merenja: ugao ako je jedinica Ugao ili pakovani DMS u opsegu LSL/USL. */
export function unosKaoUgao(jedinica, raw, lslDec, uslDec) {
  if (isUgao(jedinica)) return true;
  if (!izgledaPakovaniUgao(raw)) return false;
  if (!Number.isFinite(lslDec) || !Number.isFinite(uslDec)) return false;
  if (lslDec > 200 || uslDec > 200) return false;
  const dec = excelUgaoG7(parseInt(samoCifre(raw), 10));
  const lo = Math.min(lslDec, uslDec) - 2;
  const hi = Math.max(lslDec, uslDec) + 2;
  return dec >= lo && dec <= hi;
}

/** @deprecated koristi isUgao */
export const isStepen = isUgao;

/** Alias — ista formula kao excelUgaoG7 */
export function ugaoPackedToMm(packed) {
  return excelUgaoG7(packed);
}

/** @deprecated alias — ista vrednost kao ugaoPackedToMm */
export const ugaoPackedToDec = ugaoPackedToMm;

/** Pakovani ugao → D° M' S" (prikaz unosa) */
export function formatStep(s) {
  const cifre = samoCifre(String(s ?? ""));
  if (!cifre) return String(s || "").trim();
  const v = parseInt(cifre, 10);
  if (!Number.isFinite(v)) return cifre;
  const d = Math.floor(v / 10000);
  const m = Math.floor((v % 10000) / 100);
  const sec = v % 100;
  return `${d}° ${String(m).padStart(2, "0")}' ${String(sec).padStart(2, "0")}"`;
}

/** Ugao: pakovani broj ili decimal → mm (ista formula kao DMS u decimalnom obliku) */
export function toDecStepen(t) {
  const s = String(t ?? "").trim();
  if (!s) return 0;

  const bezSimbola = s.replace(/°/g, "").replace(/'/g, "").replace(/"/g, "").replace(/\s/g, "");
  const normalized = bezSimbola.replace(",", ".");

  if (/^-?\d+\.\d+$/.test(normalized)) {
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  const cifre = samoCifre(s);
  if (cifre) return excelUgaoG7(parseInt(cifre, 10));

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** ToDec — excelDataG7 za uglove; inače G7 kao broj */
export function toDec(t, jedinica) {
  if (isUgao(jedinica)) return toDecStepen(t);

  let s = String(t ?? "").trim();
  if (!s) return 0;
  s = s.replace(",", ".");
  return excelDataG7(s, jedinica);
}

/** Samo cifre iz unosa (za stepene) */
export function samoCifre(s) {
  return String(s || "").replace(/\D/g, "");
}

/** Boja polja kao VBA ProveraBoje */
export function bojaMerenja(vrednost, lsl, usl, jedinica, C) {
  const s = String(vrednost ?? "").trim();
  if (!s) return C.input;
  const v = toDec(s, jedinica);
  if (v < lsl || v > usl) return C.nok || "#2d1010";
  return C.ok || "#0f2d1a";
}

export function proveriOkNok(vrednost, lsl, usl, jedinica) {
  const v = toDec(vrednost, jedinica);
  return v >= lsl && v <= usl ? "OK" : "NOK";
}

/**
 * Razuman opseg unosa (zaštita od „napamet“ / pogrešne cifre: 33 → 333).
 * Uži je od LSL/USL — OK/NOK i dalje po specifikaciji.
 */
export function granicePlausibilnostiUnosa(lslDec, uslDec, nominalDec, jedinica) {
  const hasLsl = Number.isFinite(lslDec);
  const hasUsl = Number.isFinite(uslDec);
  const hasNom = Number.isFinite(nominalDec);

  if (!hasLsl && !hasUsl && !hasNom) return null;

  const lo = hasLsl ? lslDec : (hasUsl ? uslDec : null);
  const hi = hasUsl ? uslDec : (hasLsl ? lslDec : null);
  const nomUOpsegu = hasNom && hasLsl && hasUsl
    && nominalDec >= Math.min(lslDec, uslDec) - 1e-9
    && nominalDec <= Math.max(lslDec, uslDec) + 1e-9;

  let center;
  let span = 0;
  let istaGranica = false;

  if (hasLsl && hasUsl) {
    span = uslDec - lslDec;
    if (Math.abs(span) < 1e-9) {
      istaGranica = true;
      center = lslDec;
      span = Math.max(Math.abs(center) * 0.5, 0.05);
    } else {
      center = nomUOpsegu ? nominalDec : (lslDec + uslDec) / 2;
    }
  } else if (hasNom) {
    center = nominalDec;
    span = Math.max(Math.abs(nominalDec) * 0.05, 0.01);
  } else {
    center = hasLsl ? lslDec : uslDec;
    span = Math.max(Math.abs(center) * 0.05, 0.01);
  }

  if (!Number.isFinite(center)) return null;

  const margin = Math.max(
    span * 3,
    Math.abs(center) * 0.2,
    span > 0 ? span : Math.abs(center) * 0.35,
    isUgao(jedinica) ? 0.001 : 0.01,
  );

  let min = (hasLsl ? Math.min(lslDec, center) : center) - margin;
  let max = (hasUsl ? Math.max(uslDec, center) : center) + margin;

  const ratioOk = !istaGranica
    && (nomUOpsegu || !hasNom || !hasLsl || !hasUsl
      || (nominalDec >= (lo ?? -Infinity) * 0.5 && nominalDec <= (hi ?? Infinity) * 2));

  if (ratioOk && Math.abs(center) >= 1e-6 && (!isUgao(jedinica) || center < 10)) {
    const ratio = isUgao(jedinica) ? 4 : 2.5;
    min = Math.max(min, center / ratio - margin * 0.5);
    max = Math.min(max, center * ratio + margin * 0.5);
  }

  if (isUgao(jedinica) && span > 0 && span < 20 && !istaGranica) {
    const ugaoMargin = Math.max(span * 2, 1);
    min = (hasLsl ? Math.min(lslDec, center) : center) - ugaoMargin;
    max = (hasUsl ? Math.max(uslDec, center) : center) + ugaoMargin;
  }

  if (istaGranica && hasLsl && hasUsl) {
    const m = Math.max(Math.abs(center) * 0.5, 0.05);
    min = center - m;
    max = center + m;
    if (center >= 0 && lslDec >= 0 && uslDec >= 0) {
      min = Math.max(0, min);
    }
  }

  if (min > max) [min, max] = [max, min];

  return { min, max, center, span, margin };
}

function decimaleZaPrikazOpsega(v, jedinica) {
  if (!Number.isFinite(v)) return 2;
  if (isUgao(jedinica)) return 3;
  const a = Math.abs(v);
  if (a < 1) return 2;
  if (a < 100) return 1;
  return 0;
}

function formatBrojOpseg(v, jedinica) {
  if (!Number.isFinite(v)) return "—";
  const dec = decimaleZaPrikazOpsega(v, jedinica);
  if (isUgao(jedinica)) return formatVrednostKarte(v, jedinica, dec);
  return (+v).toFixed(dec).replace(".", ",");
}

export function formatOpsegPlausibilnosti(opseg, jedinica) {
  if (!opseg) return "";
  const j = jedinicaSpcOsi(jedinica);
  const a = formatBrojOpseg(opseg.min, jedinica);
  const b = formatBrojOpseg(opseg.max, jedinica);
  return j ? `${a} – ${b} ${j}` : `${a} – ${b}`;
}

export function maxDuzinaUnosaBroja(opseg) {
  if (!opseg) return 14;
  const cap = Math.max(Math.abs(opseg.min), Math.abs(opseg.max), 1);
  const intLen = String(Math.floor(cap)).length;
  return intLen + 4;
}

/** Koliko decimala očekujemo iz LSL/USL/nominala (za nepotpun unos). */
export function brojDecimalaIzGranica(lslDec, uslDec, nominalDec) {
  let maxDec = 0;
  for (const v of [lslDec, uslDec, nominalDec]) {
    if (!Number.isFinite(v)) continue;
    const s = String(v);
    const idx = s.indexOf(".");
    if (idx >= 0) maxDec = Math.max(maxDec, s.length - idx - 1);
  }
  return maxDec;
}

/**
 * Operator još kuca decimale (npr. 11,9 umesto 11,939).
 * Ne bojimo NOK niti auto-dodajemo dok vrednost može postati OK.
 */
export function unosMerenjaNepotpun(raw, granice = {}) {
  const s = String(raw ?? "").trim();
  if (!s || !s.includes(",")) return false;

  const { lslDec, uslDec, nominalDec, jedinica } = granice;
  const minDec = brojDecimalaIzGranica(lslDec, uslDec, nominalDec);
  if (minDec <= 0) return false;

  const posle = s.split(",")[1] ?? "";
  if (!posle.length) return true;
  if (posle.length >= minDec) return false;

  const j = jedinica ?? "mm";
  const dec = toDec(s, j);
  if (!Number.isFinite(dec)) return true;
  if (proveriOkNok(s, lslDec, uslDec, j) === "OK") return false;

  return true;
}

/** Da li je broj u razumnom opsegu (pre dodavanja merenja). */
export function proveriPlausibilnostUnosa(dec, lslDec, uslDec, nominalDec, jedinica) {
  if (!Number.isFinite(dec)) {
    return { ok: false, poruka: "Unesite ispravan broj." };
  }

  const opseg = granicePlausibilnostiUnosa(lslDec, uslDec, nominalDec, jedinica);
  if (!opseg) return { ok: true, opseg: null };

  if (dec < opseg.min || dec > opseg.max) {
    const raspon = formatOpsegPlausibilnosti(opseg, jedinica);
    return {
      ok: false,
      poruka: `Vrednost ${formatVrednostKarte(dec, jedinica)} nije u razumnom opsegu (${raspon}). `
        + "Proverite cifre (npr. 33 umesto 333) — pogrešan unos kvare SPC karte.",
      opseg,
    };
  }

  return { ok: true, opseg };
}

/** Boja polja dok operator kuca (plausibilnost + LSL/USL). */
export function bojaUnosMerenja(raw, lslDec, uslDec, nominalDec, jedinica, C) {
  const s = String(raw ?? "").trim();
  if (!s) return C.input;

  if (unosKaoUgao(jedinica, s, lslDec, uslDec)) {
    const cifre = samoCifre(s);
    if (cifre.length >= 5) {
      const pl = proveriPlausibilnostUnosa(toDecStepen(cifre), lslDec, uslDec, nominalDec, "Ugao");
      if (!pl.ok) return C.nok || "#2d1010";
      return bojaMerenja(s, lslDec, uslDec, "Ugao", C);
    }
    return C.input;
  }

  const normalized = s.replace(",", ".");
  if (!/^-?\d*[.,]?\d*$/.test(normalized)) return C.nok || "#2d1010";

  const dec = toDec(s, jedinica);
  if (!Number.isFinite(dec)) return C.input;

  if (unosMerenjaNepotpun(s, { lslDec, uslDec, nominalDec, jedinica })) return C.input;

  const pl = proveriPlausibilnostUnosa(dec, lslDec, uslDec, nominalDec, jedinica);
  if (!pl.ok) return C.nok || "#2d1010";

  return bojaMerenja(s, lslDec, uslDec, jedinica, C);
}

/** Da li je unos dovoljno potpun za automatsko dodavanje (blur / serial). */
export function unosMerenjaSpremanZaDodavanje(raw, k) {
  const s = String(raw ?? "").trim();
  if (!s) return false;

  const granice = {
    lslDec: k.lslDec,
    uslDec: k.uslDec,
    nominalDec: k.nominalDec,
    jedinica: k.jedinica,
  };

  if (koristiUgaoUnosKolone(k) || unosKaoUgao(k.jedinica, s, k.lslDec, k.uslDec)) {
    return false;
  }

  if (s.includes(",")) {
    const posle = s.split(",")[1];
    if (!posle?.length) return false;
    if (unosMerenjaNepotpun(s, granice)) return false;
    return validirajUnos(s, k.jedinica, granice).ok;
  }

  const maxLen = maxDuzinaUnosaBroja(k.plausibilnost);
  const digitLen = s.replace(/[^\d]/g, "").length;
  if (digitLen >= maxLen) {
    return validirajUnos(s, k.jedinica, granice).ok;
  }

  return false;
}

/** Validacija pre dodavanja u listu */
export function validirajUnos(raw, jedinica, granice = {}) {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: false, poruka: "" };

  const { lslDec, uslDec, nominalDec } = granice;

  if (unosKaoUgao(jedinica, s, lslDec, uslDec)) {
    const cifre = samoCifre(s);
    if (cifre.length < 5 || cifre.length > 7) {
      return { ok: false, poruka: "Ugao: 5–7 cifara (npr. 440000 = 44°00′00″, 15000 = 1°50′00″)" };
    }
    const packed = parseInt(cifre, 10);
    const m = Math.floor((packed % 10000) / 100);
    const sec = packed % 100;
    if (m > 59 || sec > 59) {
      return { ok: false, poruka: "Minute i sekunde moraju biti 0–59." };
    }
    const dec = toDecStepen(cifre);
    const pl = proveriPlausibilnostUnosa(dec, lslDec, uslDec, nominalDec, "Ugao");
    if (!pl.ok) return { ok: false, poruka: pl.poruka };
    return { ok: true, vrednost: formatStep(cifre), dec };
  }

  const normalized = s.replace(",", ".");
  if (!/^-?\d+([.,]\d+)?$/.test(normalized)) {
    return { ok: false, poruka: "Samo broj (zarez ili tačka za decimale)." };
  }

  const dec = toDec(s, jedinica);
  if (!Number.isFinite(dec)) {
    return { ok: false, poruka: "Neispravan broj." };
  }

  const pl = proveriPlausibilnostUnosa(dec, lslDec, uslDec, nominalDec, jedinica);
  if (!pl.ok) return { ok: false, poruka: pl.poruka };

  return { ok: true, vrednost: s.replace(".", ","), dec };
}

/** Live format stepeni dok korisnik kuca */
export function formatLiveStep(raw) {
  const cifre = samoCifre(raw);
  if (cifre.length >= 5) return formatStep(cifre);
  return cifre.length ? cifre : raw;
}

/** Da li su sve aktivne kolone popunjene do potrebnog broja */
export function svaMerenjaZavrsena(kolone, potrebanBroj) {
  const n = potrebanBroj || 5;
  const aktivne = (kolone || []).filter(k => k.naziv && k.naziv !== "-");
  if (!aktivne.length) return false;
  for (const k of aktivne) {
    if ((k.merenja?.length || 0) < n) return false;
  }
  return true;
}

/** Skraćuje / čisti unos dok operator kuca (bez Delete). */
export function sanitizujInputMerenja(raw, k) {
  const s = String(raw ?? "");
  if (!s) return "";

  if (koristiUgaoUnosKolone(k) || unosKaoUgao(k.jedinica, s, k.lslDec, k.uslDec)) {
    const cifre = samoCifre(s).slice(0, 7);
    return cifre.length ? formatLiveStep(cifre) : "";
  }

  let v = s.replace(/\./g, ",");
  const neg = v.startsWith("-");
  v = v.replace(/-/g, "");
  const idxZarez = v.indexOf(",");
  const pre = idxZarez >= 0 ? v.slice(0, idxZarez) : v;
  const pos = idxZarez >= 0 ? v.slice(idxZarez + 1) : "";
  const cisti = (deo) => deo.replace(/\D/g, "");
  const maxLen = maxDuzinaUnosaBroja(k.plausibilnost);
  let preC = cisti(pre);
  let posC = cisti(pos);
  const uk = preC.length + posC.length;
  if (uk > maxLen) {
    const visak = uk - maxLen;
    if (posC.length >= visak) posC = posC.slice(0, posC.length - visak);
    else {
      const ost = visak - posC.length;
      posC = "";
      preC = preC.slice(0, Math.max(0, preC.length - ost));
    }
  }
  let out = preC;
  if (idxZarez >= 0 || s.includes(",")) out += "," + posC;
  return neg ? `-${out}` : out;
}

export function imaBiloSta(kolone) {
  return kolone.some(k => k.naziv !== "-" && (k.merenja?.length || 0) > 0);
}

function deoImaVisePogona(karakteristike, idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  const pogoni = new Set();
  for (const k of karakteristike || []) {
    if (String(k.id_deo || "").toUpperCase() !== id) continue;
    const pk = pogonKodKarakteristike(k, { multiPogon: true });
    if (pk) pogoni.add(pk);
  }
  return pogoni.size > 1;
}

function redoviZaDeo(karakteristike, idDeo, pogonKod) {
  const id = String(idDeo || "").trim().toUpperCase();
  const pogon = String(pogonKod || "").trim().toUpperCase();
  const normalized = propagirajMetaKarakteristika(karakteristike);
  const zaDeo = normalized.filter((k) => String(k.id_deo || "").toUpperCase() === id);
  const pogoni = new Set();
  for (const k of zaDeo) {
    const pk = pogonKodKarakteristike(k, { multiPogon: true });
    if (pk) pogoni.add(pk);
  }
  const multiPogon = pogoni.size > 1;

  // Više pogona — bez izabranog pogona ne vraćaj ništa (ne mešaj ulaznu sa Preserajem…).
  if (multiPogon && !pogon) return [];

  return zaDeo.filter((k) => {
    if (!pogon) return true;
    const pk = pogonKodKarakteristike(k, { multiPogon: true });
    if (pk) return pk === pogon;
    return false;
  }).filter(jeMerljivaKarakteristika);
}

function sortSerijeMerenja(arr) {
  return [...arr].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });
}

function redoviSerije(karakteristike, idDeo, sifraMerenja, pogonKod) {
  const ab = String(sifraMerenja || "").trim();
  return redoviZaDeo(karakteristike, idDeo, pogonKod).filter(
    (k) => String(k.sifra_merenja || "").trim() === ab,
  );
}

/** Broj uzoraka za seriju — samo karakteristike_merljive.broj_merenja (glavni unos kol. X); bez SOP fallbacka. */
export function brojMerenjaZaSeriju(karakteristike, idDeo, sifraMerenja, _sopFallbackZanemaren = 5, pogonKod) {
  const rows = redoviSerije(karakteristike, idDeo, sifraMerenja, pogonKod)
    .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
  const pogon = String(pogonKod || "").trim().toUpperCase();
  let best = 0;
  for (const k of rows) {
    const pk = pogonKodKarakteristike(k, { multiPogon: true });
    const n = Number(k.broj_merenja);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (pogon && pk && pk !== pogon) continue;
    if (n > best) best = n;
  }
  if (best > 0) return best;
  const imaMerljivih = rows.some(jeMerljivaKarakteristika);
  return imaMerljivih ? GLAVNI_UNOS_BROJ_MERENJA_DEFAULT : 5;
}

/** Meta po seriji: faza KP, linija (Preseraj/Karoserija…), broj uzoraka. */
export function metaSerije(karakteristike, idDeo, sifraMerenja, fallbackBroj = 5, pogonKod) {
  const rows = redoviSerije(karakteristike, idDeo, sifraMerenja, pogonKod);
  const prvi = rows[0];
  return {
    sifra: String(sifraMerenja || "").trim(),
    faza_naziv: prvi?.faza_naziv?.trim() || "",
    linija_faza: prvi?.linija_faza?.trim() || "",
    broj_merenja: brojMerenjaZaSeriju(karakteristike, idDeo, sifraMerenja, fallbackBroj, pogonKod),
  };
}

/** Jedinstveni ID delova iz učitanog šifrarnika. */
export function listaIdDeoIzKarakteristika(karakteristike) {
  const set = new Set();
  for (const k of karakteristike || []) {
    const id = String(k.id_deo || "").trim().toUpperCase();
    if (id) set.add(id);
  }
  return [...set].sort();
}

/** Slični ID-ovi za poruku greške (NM-000 → NM-001). */
export function predloziIdDeo(karakteristike, idDeo, limit = 6) {
  const id = String(idDeo || "").trim().toUpperCase();
  const svi = listaIdDeoIzKarakteristika(karakteristike);
  if (!id) return svi.slice(0, limit);
  const dash = id.indexOf("-");
  const pref = dash >= 0 ? id.slice(0, dash + 1) : id.slice(0, 2);
  const istiPrefiks = svi.filter((x) => x.startsWith(pref) && x !== id);
  if (istiPrefiks.length) return istiPrefiks.slice(0, limit);
  return svi.filter((x) => x !== id).slice(0, limit);
}

/** Poruka kad ID nije u karakteristike_merljive (uvoz OK, pogrešan ID). */
export function porukaNepoznatIdDeo(karakteristike, idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  const predlozi = predloziIdDeo(karakteristike, id);
  let msg = `ID ${id}: nema u karakteristike_merljive. Proveri unos`;
  if (/NM-000/i.test(id)) msg += " — u šifrarniku postoji NM-001, ne NM-000";
  else msg += " (npr. NM-001, NT-001)";
  if (predlozi.length) msg += `. Poznati ID-ovi: ${predlozi.join(", ")}.`;
  return msg;
}

/** Da li je ID dovoljno potpun za učitavanje (ne okidati učitavanje na „NT-“). */
export function idSpremanZaUcitavanje(id) {
  const s = String(id || "").trim().toUpperCase();
  if (s.length < 5) return false;
  const dash = s.indexOf("-");
  if (dash < 0) return s.length >= 6;
  const pre = s.slice(0, dash);
  const posle = s.slice(dash + 1);
  if (!pre || !posle) return false;
  if (/^[A-Z]{2,}$/.test(pre)) return posle.length >= 3;
  return posle.length >= 1;
}

/** Pogon sa najviše serija merenja (NM-001 / NT-001 multi-pogon). */
export function podrazumevaniPogonMerljive(karakteristike, idDeo) {
  const pogoni = pogoniSaMerenjima(karakteristike, idDeo);
  if (!pogoni.length) return "A";
  if (pogoni.length === 1) return pogoni[0];
  let best = pogoni[0];
  let bestN = 0;
  for (const p of pogoni) {
    const n = grupeMerenja(karakteristike, idDeo, p).length;
    if (n > bestN) {
      bestN = n;
      best = p;
    }
  }
  return best;
}

/** Pogoni koji imaju bar jednu merljivu dimenziju (posle meta propagacije). */
export function pogoniSaMerenjima(karakteristike, idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  const normalized = propagirajMetaKarakteristika(karakteristike);
  const set = new Set();
  for (const k of normalized) {
    if (String(k.id_deo || "").toUpperCase() !== id) continue;
    if (!jeMerljivaKarakteristika(k)) continue;
    const pk = pogonKodKarakteristike(k, { multiPogon: true });
    if (pk) set.add(pk);
  }
  return [...set].sort();
}

/** Jedinstvene serije (A,B,C…) za deo */
export function grupeMerenja(karakteristike, idDeo, pogonKod) {
  const set = new Set();
  for (const k of redoviZaDeo(karakteristike, idDeo, pogonKod)) {
    if (k.sifra_merenja) set.add(String(k.sifra_merenja).trim());
  }
  return sortSerijeMerenja([...set]);
}

/** Serije sa metapodacima za UI (redom A→G). */
export function grupeMerenjaSaMetom(karakteristike, idDeo, fallbackBroj = 5, pogonKod) {
  return grupeMerenja(karakteristike, idDeo, pogonKod).map((sifra) =>
    metaSerije(karakteristike, idDeo, sifra, fallbackBroj, pogonKod),
  );
}

/** Kratki naslov serije za dugme / poruku */
export function labelSerije(meta) {
  if (!meta) return "—";
  const faza = meta.faza_naziv || `Serija ${meta.sifra}`;
  const br = meta.broj_merenja ? ` · ${meta.broj_merenja}×` : "";
  const lin = meta.linija_faza ? ` (${meta.linija_faza})` : "";
  return `${meta.sifra} — ${faza}${br}${lin}`;
}

/** Do 5 kolona za izabranu A/B grupu (kao UcitajKarakteristike) */
export function koloneZaGrupu(karakteristike, idDeo, sifraMerenja, potrebanBroj, pogonKod) {
  const ab = String(sifraMerenja || "").trim();
  const prazna = () => ({
    id: null,
    naziv: "-",
    lslText: "-",
    uslText: "-",
    instrument: "-",
    nazivMere: "",
    jedinica: "",
    lslDec: 0,
    uslDec: 0,
    nominalDec: null,
    plausibilnost: null,
    faiObavezno: false,
    faiBrojMerenja: 1,
    merenja: [],
    input: "",
    cntOK: 0,
    cntNOK: 0,
    ukupnoLabel: `0 / ${potrebanBroj || 5}`,
  });

  const cols = Array.from({ length: 5 }, prazna);
  const rows = redoviSerije(karakteristike, idDeo, ab, pogonKod)
    .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));

  rows.slice(0, 5).forEach((k, i) => {
    const kn = normalizujKarakteristikuRed(k);
    const g = graniceIzKarakteristike(kn);
    const nomFin = g.nominalDec;
    cols[i] = {
      id: kn.id,
      naziv: kn.pozicija,
      nazivMere: kn.naziv_mere || "",
      lslText: g.lslText,
      uslText: g.uslText,
      instrument: kn.merni_instrument || "-",
      jedinica: g.jedinica,
      lslDec: g.lslDec,
      uslDec: g.uslDec,
      nominalDec: nomFin,
      plausibilnost: granicePlausibilnostiUnosa(g.lslDec, g.uslDec, nomFin, g.jedinica),
      klasa: kn.klasa || null,
      klasaLabel: labelKlasaSaPragom(kn.klasa),
      faiObavezno: faiObaveznoIzReda(kn),
      faiBrojMerenja: faiObaveznoIzReda(kn) ? faiBrojMerenjaIzReda(kn) : 1,
      merenja: [],
      input: "",
      cntOK: 0,
      cntNOK: 0,
      ukupnoLabel: `0 / ${potrebanBroj || 5}`,
    };
  });
  return cols;
}

/**
 * Numerička vrednost za SPC — excelDataG7(G7, O7).
 * Uglovi: ne koristi sirovi vrednost_dec tipa 450000 bez formule.
 */
export function vrednostZaKarte(vrednostRaw, vrednostDec, jedinica) {
  if (isUgao(jedinica)) {
    const raw = String(vrednostRaw ?? "").trim();
    if (raw) {
      const d = toDec(raw, jedinica);
      return Number.isFinite(d) ? d : null;
    }
    if (vrednostDec == null || vrednostDec === "") return null;
    const d = excelDataG7(vrednostDec, jedinica);
    return Number.isFinite(d) ? d : null;
  }
  if (vrednostDec != null && vrednostDec !== "") {
    const d = excelDataG7(vrednostDec, jedinica);
    if (Number.isFinite(d)) return d;
  }
  const raw = String(vrednostRaw ?? "").trim();
  if (!raw) return null;
  const d = excelDataG7(raw.replace(",", "."), jedinica);
  return Number.isFinite(d) ? d : null;
}

/** LSL/USL/nominala u istim jedinicama kao tačke na karti. */
export function graniceKarakteristike(k) {
  if (!k) {
    return { lsl: null, usl: null, nominala: null, jedinica: "", jeUgao: false, lslText: "—", uslText: "—" };
  }
  const g = graniceIzKarakteristike(k);
  return {
    lsl: Number.isFinite(g.lslDec) ? g.lslDec : null,
    usl: Number.isFinite(g.uslDec) ? g.uslDec : null,
    nominala: g.nominalDec,
    jedinica: g.jedinica,
    jedinicaOs: g.jeUgao ? "mm" : (g.jedinica || ""),
    jeUgao: g.jeUgao,
    lslText: g.lslText || "—",
    uslText: g.uslText || "—",
  };
}

/** Jedinica na osi SPC grafika (uglovi → mm). */
export function jedinicaSpcOsi(jedinica) {
  return isUgao(jedinica) ? "mm" : String(jedinica || "").trim();
}

/** Format vrednosti na grafikonu / KPI. */
export function formatVrednostKarte(v, jedinica, dec = 4) {
  if (!Number.isFinite(v)) return "—";
  if (isUgao(jedinica)) return `${(+v).toFixed(dec)} mm`;
  return (+v).toFixed(dec);
}

/** Vrednost u mm (ugao) → prikaz DMS u tooltipu (npr. 1,833333 → 01° 50′ 00″). */
export function decStepenUDms(dec) {
  if (!Number.isFinite(dec)) return "—";
  const neg = dec < 0;
  let x = Math.abs(dec);
  let d = Math.floor(x);
  x = (x - d) * 60;
  let m = Math.floor(x);
  let s = Math.round((x - m) * 60);
  if (s >= 60) { s = 0; m += 1; }
  if (m >= 60) { m = 0; d += 1; }
  const txt = `${String(d).padStart(2, "0")}° ${String(m).padStart(2, "0")}' ${String(s).padStart(2, "0")}"`;
  return neg ? `-${txt}` : txt;
}

/** Ograničenje tastature (brojevi, jedan zarez, max cifara po opsegu mere) */
export function filterKeyUnos(key, current, jedinica, plausibilnost = null) {
  if (key === "Backspace" || key === "Delete" || key === "Tab" || key.startsWith("Arrow")) return key;
  if (isUgao(jedinica) || izgledaPakovaniUgao(current)) {
    if (/^\d$/.test(key)) return key;
    return null;
  }
  const maxLen = maxDuzinaUnosaBroja(plausibilnost);
  const nextLen = String(current).replace(/[^\d]/g, "").length + (/^\d$/.test(key) ? 1 : 0);
  if (key === "." || key === ",") {
    if (String(current).includes(",")) return null;
    return ",";
  }
  if (/^\d$/.test(key)) {
    if (nextLen > maxLen) return null;
    return key;
  }
  return null;
}

/** Jedan pritisak na ugrađenoj numeričkoj tastaturi (tel/tablet). */
export function primeniTastMerenja(akcija, tekst, k, cifra = "") {
  const t = String(tekst ?? "");
  if (akcija === "backspace") {
    if (koristiUgaoUnosKolone(k) || unosKaoUgao(k.jedinica, t, k.lslDec, k.uslDec)) {
      const cifre = samoCifre(t);
      if (!cifre.length) return "";
      return sanitizujInputMerenja(cifre.slice(0, -1), k);
    }
    if (!t.length) return "";
    return sanitizujInputMerenja(t.slice(0, -1), k);
  }
  if (akcija === "zarez") {
    if (filterKeyUnos(",", t, k.jedinica, k.plausibilnost) === null) return t;
    return sanitizujInputMerenja(t + ",", k);
  }
  if (akcija === "cifra") {
    const d = String(cifra ?? "");
    if (!/^\d$/.test(d)) return t;
    if (filterKeyUnos(d, t, k.jedinica, k.plausibilnost) === null) return t;
    return sanitizujInputMerenja(t + d, k);
  }
  return t;
}
