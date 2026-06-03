/**
 * Port VBA UserForm logike (ToDec, stepeni, OK/NOK, validacija unosa).
 */

export function isStepen(jedinica) {
  return String(jedinica || "").toLowerCase().startsWith("step");
}

/** VBA FormatStep — 6 cifara → D° M' S" */
export function formatStep(s) {
  const t = String(s || "").trim();
  if (t.length !== 6 || !/^\d{6}$/.test(t)) return t;
  return `${t.slice(0, 2)}° ${t.slice(2, 4)}' ${t.slice(4, 6)}"`;
}

/** VBA ToDec — stepeni (6 cifara) ili decimalni broj */
export function toDec(t) {
  let s = String(t ?? "").trim();
  if (!s) return 0;

  s = s.replace(/°/g, "").replace(/'/g, "").replace(/"/g, "").replace(/\s/g, "");

  if (s.length === 6 && /^\d{6}$/.test(s)) {
    const d = Number(s.slice(0, 2));
    const m = Number(s.slice(2, 4));
    const sec = Number(s.slice(4, 6));
    return d + m / 60 + sec / 3600;
  }

  s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Samo cifre iz unosa (za stepene) */
export function samoCifre(s) {
  return String(s || "").replace(/\D/g, "");
}

/** Boja polja kao VBA ProveraBoje */
export function bojaMerenja(vrednost, lsl, usl, jedinica, C) {
  const s = String(vrednost ?? "").trim();
  if (!s) return C.input;
  const v = toDec(s);
  if (v < lsl || v > usl) return C.nok || "#2d1010";
  return C.ok || "#0f2d1a";
}

export function proveriOkNok(vrednost, lsl, usl) {
  const v = toDec(vrednost);
  return v >= lsl && v <= usl ? "OK" : "NOK";
}

/** Validacija pre dodavanja u listu */
export function validirajUnos(raw, jedinica) {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: false, poruka: "" };

  if (isStepen(jedinica)) {
    const cifre = samoCifre(s);
    if (cifre.length !== 6) {
      return { ok: false, poruka: "Mora biti tačno 6 cifara (stepeni)!" };
    }
    return { ok: true, vrednost: formatStep(cifre), dec: toDec(formatStep(cifre)) };
  }

  const dec = toDec(s);
  if (!Number.isFinite(dec) && s.replace(",", ".").match(/^-?\d*\.?\d+$/)) {
    return { ok: false, poruka: "Neispravan broj." };
  }
  return { ok: true, vrednost: s.replace(".", ","), dec };
}

/** Live format stepeni dok korisnik kuca */
export function formatLiveStep(raw) {
  const cifre = samoCifre(raw);
  if (cifre.length === 6) return formatStep(cifre);
  return raw;
}

/** Da li su sve aktivne kolone popunjene do potrebnog broja */
export function svaMerenjaZavrsena(kolone, potrebanBroj) {
  const n = potrebanBroj || 5;
  for (const k of kolone) {
    if (k.naziv && k.naziv !== "-") {
      if ((k.merenja?.length || 0) < n) return false;
    }
  }
  return true;
}

export function imaBiloSta(kolone) {
  return kolone.some(k => k.naziv !== "-" && (k.merenja?.length || 0) > 0);
}

/** Jedinstvene A/B grupe za deo */
export function grupeMerenja(karakteristike, idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  const set = new Set();
  for (const k of karakteristike) {
    if (String(k.id_deo || "").toUpperCase() === id && k.sifra_merenja) {
      set.add(String(k.sifra_merenja).trim());
    }
  }
  return [...set].sort();
}

/** Do 5 kolona za izabranu A/B grupu (kao UcitajKarakteristike) */
export function koloneZaGrupu(karakteristike, idDeo, sifraMerenja, potrebanBroj) {
  const id = String(idDeo || "").trim().toUpperCase();
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
    merenja: [],
    input: "",
    cntOK: 0,
    cntNOK: 0,
    ukupnoLabel: `0 / ${potrebanBroj || 5}`,
  });

  const cols = Array.from({ length: 5 }, prazna);
  const rows = karakteristike.filter(
    k => String(k.id_deo || "").toUpperCase() === id
      && String(k.sifra_merenja || "").trim() === ab
  );

  rows.slice(0, 5).forEach((k, i) => {
    const lslT = k.lsl_text ?? String(k.lsl ?? "");
    const uslT = k.usl_text ?? String(k.usl ?? "");
    cols[i] = {
      id: k.id,
      naziv: k.pozicija,
      nazivMere: k.naziv_mere || "",
      lslText: lslT,
      uslText: uslT,
      instrument: k.merni_instrument || "-",
      jedinica: k.jedinica || "",
      lslDec: toDec(lslT),
      uslDec: toDec(uslT),
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
 * Numerička vrednost pogodna za SPC karte (decimalni stepeni ili mm).
 * Za uglove nikad ne koristi sirovi vrednost_dec tipa 450000 — uvek toDec.
 */
export function vrednostZaKarte(vrednostRaw, vrednostDec, jedinica) {
  if (isStepen(jedinica)) {
    const raw = String(vrednostRaw ?? "").trim();
    if (raw) {
      const d = toDec(raw);
      return Number.isFinite(d) ? d : null;
    }
    if (vrednostDec == null || vrednostDec === "") return null;
    const d = toDec(vrednostDec);
    return Number.isFinite(d) ? d : null;
  }
  if (vrednostDec != null && vrednostDec !== "" && Number.isFinite(Number(vrednostDec))) {
    return Number(vrednostDec);
  }
  const d = toDec(vrednostRaw);
  return Number.isFinite(d) ? d : null;
}

/** LSL/USL/nominala u istim jedinicama kao tačke na karti. */
export function graniceKarakteristike(k) {
  if (!k) {
    return { lsl: null, usl: null, nominala: null, jedinica: "", jeUgao: false, lslText: "—", uslText: "—" };
  }
  const jeUgao = isStepen(k.jedinica);
  const lslText = k.lsl_text ?? String(k.lsl ?? "");
  const uslText = k.usl_text ?? String(k.usl ?? "");
  const lsl = toDec(lslText || k.lsl);
  const usl = toDec(uslText || k.usl);
  let nominala = toDec(k.nominala);
  if (!jeUgao && k.nominala != null && k.nominala !== "") {
    nominala = Number(k.nominala);
  }
  return {
    lsl: Number.isFinite(lsl) ? lsl : null,
    usl: Number.isFinite(usl) ? usl : null,
    nominala: Number.isFinite(nominala) ? nominala : null,
    jedinica: k.jedinica || "",
    jeUgao,
    lslText: lslText || "—",
    uslText: uslText || "—",
  };
}

/** Format vrednosti na grafikonu / KPI (° za uglove). */
export function formatVrednostKarte(v, jedinica, dec = 4) {
  if (!Number.isFinite(v)) return "—";
  if (isStepen(jedinica)) return `${(+v).toFixed(dec)}°`;
  return (+v).toFixed(dec);
}

/** Decimalni stepeni → prikaz DMS (za tooltip/listu). */
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

/** Ograničenje tastature (brojevi, jedan zarez, max 6 cifara za stepene) */
export function filterKeyUnos(key, current, jedinica) {
  if (key === "Backspace" || key === "Delete" || key === "Tab" || key.startsWith("Arrow")) return key;
  if (isStepen(jedinica)) {
    if (/^\d$/.test(key) && samoCifre(current).length < 6) return key;
    return null;
  }
  if (key === "." || key === ",") {
    if (String(current).includes(",")) return null;
    return ",";
  }
  if (/^\d$/.test(key)) return key;
  return null;
}
