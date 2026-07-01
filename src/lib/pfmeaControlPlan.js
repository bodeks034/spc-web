/**
 * PFMEA i Control Plan — uvoz iz Excel JSON, poklapanje po defektu, štampa.
 */

import arhiva from "../data/pfmea-control-plan-industrijski.json";
import { scoreSablonZaDefekt } from "./troubleshootingPrimeri.js";
import { izracunajRpn } from "./pfmeaCpPolja.js";

export const PFMEA_KOLONE = [
  { key: "br_dela", label: "Dio / Proces", short: true },
  { key: "proces", label: "Operacija" },
  { key: "mod_greske", label: "Mod greške" },
  { key: "efekat_greske", label: "Efekat" },
  { key: "s", label: "S", w: 28 },
  { key: "o", label: "O", w: 28 },
  { key: "d", label: "D", w: 28 },
  { key: "rpn_before", label: "RPN pre" },
  { key: "rpn_after", label: "RPN posle" },
  { key: "akcija", label: "Preporučena akcija" },
  { key: "odgovorni", label: "Odgovorni" },
  { key: "rok", label: "Rok", short: true },
];

export const CP_KOLONE = [
  { key: "br_dela", label: "Dio", short: true },
  { key: "proces", label: "Operacija / Proces" },
  { key: "karakteristika", label: "Karakteristika" },
  { key: "klasifikacija", label: "Kl.", w: 36 },
  { key: "nominalna", label: "Nominal" },
  { key: "tolerancija", label: "Tolerancija" },
  { key: "metoda", label: "Metoda kontrole" },
  { key: "oprema", label: "Oprema" },
  { key: "ucestalost", label: "Učestalost" },
  { key: "velicina_uzoraka", label: "Uzorak" },
  { key: "odgovorni", label: "Odgovorni" },
];

/** Puna PFMEA šema — Excel šablon + dodatna polja iz arhive. */
export const PFMEA_EDIT_KOLONE = [
  { key: "br_dela", label: "Br. dela / ID", w: 110 },
  { key: "proces", label: "Proces / operacija", w: 120 },
  { key: "mod_greske", label: "Mod greške", w: 140 },
  { key: "uzrok_greske", label: "Uzrok greške", w: 120 },
  { key: "efekat_greske", label: "Efekat greške", w: 130 },
  { key: "s", label: "S", w: 36, short: true },
  { key: "uzrok_mehanizam", label: "Uzrok / mehanizam", w: 140 },
  { key: "o", label: "O", w: 36, short: true },
  { key: "postojece_kontrole", label: "Postojeće kontrole", w: 130 },
  { key: "d", label: "D", w: 36, short: true },
  { key: "rpn_before", label: "RPN pre", w: 64, short: true },
  { key: "akcija", label: "Preporučena akcija", w: 160 },
  { key: "odgovorni", label: "Odgovorni", w: 100 },
  { key: "rok", label: "Rok", w: 90, short: true },
  { key: "status", label: "Status", w: 80, short: true },
  { key: "rpn_after", label: "RPN posle", w: 72, short: true },
  { key: "s_posle", label: "S posle", w: 48, short: true },
  { key: "o_posle", label: "O posle", w: 48, short: true },
  { key: "d_posle", label: "D posle", w: 48, short: true },
  { key: "odobrio", label: "Odobrio", w: 100 },
  { key: "datum", label: "Datum", w: 90, short: true },
  { key: "pfmea_veza", label: "PFMEA ref.", w: 100, short: true },
  { key: "control_plan_ref", label: "CP ref.", w: 90, short: true },
];

/** Puna Control Plan šema — Excel šablon. */
export const CP_EDIT_KOLONE = [
  { key: "br_dela", label: "Br. dela / ID", w: 110 },
  { key: "proces", label: "Operacija / proces", w: 120 },
  { key: "karakteristika", label: "Karakteristika", w: 130 },
  { key: "klasifikacija", label: "Kl.", w: 48, short: true },
  { key: "nominalna", label: "Nominalna", w: 80 },
  { key: "tolerancija", label: "Tolerancija", w: 90 },
  { key: "metoda", label: "Metoda kontrole", w: 130 },
  { key: "oprema", label: "Oprema", w: 100 },
  { key: "msa", label: "MSA", w: 72, short: true },
  { key: "ucestalost", label: "Učestalost", w: 100 },
  { key: "velicina_uzoraka", label: "Vel. uzorka", w: 80 },
  { key: "reakcija_nekontrolisano", label: "Reakcija — nekontrolisano", w: 140 },
  { key: "reakcija_na_nepravilan_deo", label: "Reakcija — neispravan deo", w: 140 },
  { key: "zapis_forma", label: "Zapis / forma", w: 100 },
  { key: "pfmea_referenca", label: "PFMEA ref.", w: 90 },
  { key: "mod_greske_pfmea", label: "Mod greške (PFMEA)", w: 120 },
  { key: "status_cp", label: "Status CP", w: 72, short: true },
  { key: "odgovorni", label: "Odgovorni", w: 100 },
];

export const RPN_SUMMARY_KOLONE = [
  { key: "dio", label: "Deo / ID" },
  { key: "mod_greske", label: "Mod greške" },
  { key: "s", label: "S", w: 36, short: true },
  { key: "o", label: "O", w: 36, short: true },
  { key: "d", label: "D", w: 36, short: true },
  { key: "rpn_before", label: "RPN Before (pre)", w: 90, short: true },
  { key: "rpn_after", label: "RPN After (posle)", w: 90, short: true },
  { key: "poboljsanje", label: "Poboljšanje %", w: 90, short: true },
];

export function pfmeaPrazanRed() {
  return Object.fromEntries(PFMEA_EDIT_KOLONE.map((k) => [k.key, ""]));
}

export function cpPrazanRed() {
  return Object.fromEntries(CP_EDIT_KOLONE.map((k) => [k.key, ""]));
}

export function rpnPrazanRed() {
  return Object.fromEntries(RPN_SUMMARY_KOLONE.map((k) => [k.key, ""]));
}

/** Iz PFMEA redova — RPN summary (jedan red po PFMEA stavci). */
export function izracunajRpnSummary(pfmeaRedovi) {
  const out = [];
  for (let i = 0; i < (pfmeaRedovi || []).length; i++) {
    const r = pfmeaRedovi[i];
    if (!r) continue;

    const dio = String(r.br_dela || r.proces || "").replace(/\n/g, " ").trim();
    const mod = String(
      r.mod_greske || r.efekat_greske || r.proces || r.akcija?.slice(0, 80) || "",
    ).trim();
    const imaIdent = dio || mod;
    const imaRpn = r.s || r.o || r.d || r.s_posle || r.o_posle || r.d_posle
      || r.rpn_before || r.rpn_after;
    if (!imaIdent && !imaRpn) continue;

    const rpnBefore = String(r.rpn_before || izracunajRpn(r.s, r.o, r.d) || "").trim();
    const rpnAfter = String(
      r.rpn_after || izracunajRpn(r.s_posle, r.o_posle, r.d_posle) || "",
    ).trim();

    const rb = Number(rpnBefore);
    const ra = Number(rpnAfter);
    let pob = "";
    if (Number.isFinite(rb) && rb > 0 && Number.isFinite(ra)) {
      pob = String(Math.round((1 - ra / rb) * 1000) / 10);
    } else if (r.poboljsanje) {
      const p = Number(r.poboljsanje);
      pob = String(p > 0 && p <= 1 ? Math.round(p * 1000) / 10 : p);
    }

    out.push({
      dio: dio || "—",
      mod_greske: mod || `PFMEA stavka ${i + 1}`,
      s: r.s ?? "",
      o: r.o ?? "",
      d: r.d ?? "",
      rpn_before: rpnBefore,
      rpn_after: rpnAfter,
      poboljsanje: pob,
    });
  }
  return out;
}

/** Normalizuj ključeve iz uvezenog reda (unicode š → ascii). */
export function normalizujPfmeaCpRed(red) {
  if (!red || typeof red !== "object") return red;
  const o = { ...red };
  if (o["mod_greške_pfmea"] && !o.mod_greske_pfmea) o.mod_greske_pfmea = o["mod_greške_pfmea"];
  if (o.reakcija_neispravno && !o.reakcija_na_nepravilan_deo) {
    o.reakcija_na_nepravilan_deo = o.reakcija_neispravno;
  }
  return o;
}

const FMT_TABELA = 2;

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function scoreRedPoDefektu(nazivDefekta, red, poljaTekst) {
  const tekst = poljaTekst.map((k) => red[k]).filter(Boolean).join(" ");
  return scoreSablonZaDefekt(nazivDefekta, {
    kljucevi: tekst.toLowerCase().split(/[\s,;/()+]+/).filter((w) => w.length > 2),
    problem: red.mod_greske || red.karakteristika || "",
    d2: { sta: red.mod_greske || red.karakteristika || "" },
  });
}

/** Redovi PFMEA slični nazivu defekta (ne po ID dela). */
export function filtrirajPfmeaPoDefektu(nazivDefekta, { limit = 3, sviRedovi = null } = {}) {
  const redovi = sviRedovi || arhiva?.pfmea?.redovi || [];
  if (!nazivDefekta?.trim()) return [];
  return redovi
    .map((r) => ({ r, s: scoreRedPoDefektu(nazivDefekta, r, ["mod_greske", "efekat_greske", "uzrok_greske", "proces"]) }))
    .filter((x) => x.s >= 4)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.r);
}

/** Redovi Control Plan slični defektu / modu greške. */
export function filtrirajControlPlanPoDefektu(nazivDefekta, { limit = 4, sviRedovi = null } = {}) {
  const redovi = sviRedovi || arhiva?.controlPlan?.redovi || [];
  if (!nazivDefekta?.trim()) return [];
  return redovi
    .map((r) => ({ r, s: scoreRedPoDefektu(nazivDefekta, r, ["karakteristika", "proces", "operacija", "tolerancija", "metoda"]) }))
    .filter((x) => x.s >= 3)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.r);
}

export function serializePfmeaTabela(redovi) {
  if (!redovi?.length) return "";
  return JSON.stringify({ _fmt: FMT_TABELA, kolone: PFMEA_KOLONE.map((k) => k.key), redovi });
}

export function serializeControlPlanTabela(redovi) {
  if (!redovi?.length) return "";
  return JSON.stringify({ _fmt: FMT_TABELA, kolone: CP_KOLONE.map((k) => k.key), redovi });
}

/** Polja REF u 8D — sažetak (Word format), ne puna tabela. */
export const PFMEA_REF_POLJA = [
  { key: "proces", label: "Proces / operacija", rows: 2 },
  { key: "mod_greske", label: "Mod greške", rows: 2 },
  { key: "efekat", label: "Efekat greške", rows: 2 },
  { key: "otkrivanje_pre", label: "Otkrivanje (pre korekcije)", rows: 2 },
  { key: "otkrivanje_posle", label: "Otkrivanje (posle korekcije)", rows: 2 },
  { key: "rpn_pre", label: "RPN pre", rows: 1 },
  { key: "rpn_posle", label: "RPN posle", rows: 1 },
];

export const CP_REF_POLJA = [
  { key: "operacija", label: "Operacija / proces", rows: 2 },
  { key: "karakteristika", label: "Karakteristika", rows: 2 },
  { key: "metoda_kontrole", label: "Metoda kontrole (pre)", rows: 2 },
  { key: "ucestalost", label: "Učestalost (pre)", rows: 1 },
  { key: "korigovana_metoda", label: "Korigovana metoda / kontrola", rows: 2 },
  { key: "odgovornost", label: "Odgovornost", rows: 1 },
];

function spojiProces(red) {
  return [red?.br_dela, red?.proces].filter(Boolean).join(" — ").replace(/\n/g, ", ").trim();
}

function formatRpnPre(red) {
  const s = red?.s;
  const o = red?.o;
  const d = red?.d;
  const rpn = red?.rpn_before;
  if (s && o && d) {
    const izr = Number(s) * Number(o) * Number(d);
    const rb = rpn || (Number.isFinite(izr) ? izr : "");
    const nivo = Number(rb) >= 200 ? "KRITIČNO" : "PRIHVATLJIVO";
    return `RPN = ${o}×${d}×${s} = ${rb}${rb ? ` (${nivo})` : ""}`;
  }
  return rpn ? `RPN = ${rpn}` : "";
}

function formatRpnPosle(red) {
  const rpn = red?.rpn_after;
  if (!rpn) return red?.akcija ? `Korekcija: ${red.akcija}` : "";
  const nivo = Number(rpn) >= 100 ? "U PRAĆENJU" : "PRIHVATLJIVO";
  return `RPN = ${rpn} (${nivo})`;
}

/** Jedan PFMEA red → REF sažetak za 8D / PDF. */
export function pfmeaRedUSummaryRef(red, cpRed = null) {
  if (!red) return {};
  const posle = formatRpnPosle(red);
  const otkPosle = red.akcija
    ? `${red.akcija}${posle ? ` — ${posle}` : ""}`
    : posle;
  return {
    proces: spojiProces(red),
    mod_greske: red.mod_greske || "",
    efekat: red.efekat_greske || red.efekat || "",
    otkrivanje_pre: red.d
      ? `D = ${red.d}${red.postojece_kontrole ? ` (${red.postojece_kontrole})` : ""}`
      : (red.postojece_kontrole || ""),
    otkrivanje_posle: otkPosle,
    rpn_pre: formatRpnPre(red),
    rpn_posle: formatRpnPosle(red),
    dokument_ref: red.pfmea_veza || "",
  };
}

/** Jedan CP red → REF sažetak za 8D / PDF. */
export function cpRedUSummaryRef(red, pfmeaRed = null) {
  if (!red) return {};
  const kar = [red.karakteristika, red.nominalna, red.tolerancija].filter(Boolean).join(" — ");
  const korig = pfmeaRed?.akcija
    ? `${red.metoda || ""}${red.metoda && pfmeaRed.akcija ? " → " : ""}${pfmeaRed.akcija}`.trim()
    : (red.metoda || "");
  return {
    operacija: spojiProces(red),
    karakteristika: kar,
    metoda_kontrole: red.metoda || "",
    ucestalost: [red.ucestalost, red.velicina_uzoraka].filter(Boolean).join("; "),
    korigovana_metoda: korig,
    odgovornost: red.odgovorni || "",
  };
}

export function serializePfmeaSummary(summary) {
  if (!summary || !Object.values(summary).some((v) => String(v ?? "").trim())) return "";
  const { dokument_ref, ...rest } = summary;
  return JSON.stringify(rest);
}

export function serializeControlPlanSummary(summary) {
  if (!summary || !Object.values(summary).some((v) => String(v ?? "").trim())) return "";
  return JSON.stringify(summary);
}

export function serializePfmeaSummaryIzReda(red, cpRed = null) {
  return serializePfmeaSummary(pfmeaRedUSummaryRef(red, cpRed));
}

export function serializeControlPlanSummaryIzReda(red, pfmeaRed = null) {
  return serializeControlPlanSummary(cpRedUSummaryRef(red, pfmeaRed));
}

/** REF za 8D — najrelevantniji red po defektu (limit 1). */
export function pfmeaCpRefZaDefekt(nazivDefekta, { pfmeaRedovi = null, cpRedovi = null } = {}) {
  const pRows = filtrirajPfmeaPoDefektu(nazivDefekta, { limit: 1, sviRedovi: pfmeaRedovi });
  const cRows = filtrirajControlPlanPoDefektu(nazivDefekta, { limit: 1, sviRedovi: cpRedovi });
  const p = pRows[0];
  const c = cRows[0];
  return {
    pfmea_ref: p ? serializePfmeaSummaryIzReda(p, c) : "",
    control_plan_ref: c ? serializeControlPlanSummaryIzReda(c, p) : "",
    pfmeaRed: p,
    cpRed: c,
  };
}

/** REF iz eksplicitno izabranih redova (modul PFMEA/CP). */
export function pfmeaCpRefIzRedova(pfmeaRed, cpRed) {
  return {
    pfmea_ref: pfmeaRed ? serializePfmeaSummaryIzReda(pfmeaRed, cpRed) : "",
    control_plan_ref: cpRed ? serializeControlPlanSummaryIzReda(cpRed, pfmeaRed) : "",
  };
}

/** Za editor 8D — uvek sažetak, i legacy tabela se konvertuje. */
export function pfmeaRefZaEditor(raw) {
  const p = parsePfmeaRefRaw(raw);
  if (p.fmt === 1 && p.summary) return { ...p.summary };
  if (p.fmt === FMT_TABELA && p.redovi?.[0]) return pfmeaRedUSummaryRef(p.redovi[0]);
  return {};
}

export function cpRefZaEditor(raw) {
  const p = parseControlPlanRefRaw(raw);
  if (p.fmt === 1 && p.summary) return { ...p.summary };
  if (p.fmt === FMT_TABELA && p.redovi?.[0]) return cpRedUSummaryRef(p.redovi[0]);
  return {};
}

export function pfmeaRefIzEditora(summary) {
  return serializePfmeaSummary(summary);
}

export function cpRefIzEditora(summary) {
  return serializeControlPlanSummary(summary);
}

export function parsePfmeaRefRaw(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return { fmt: 0, redovi: [], summary: {} };
  try {
    const o = JSON.parse(s);
    if (o?._fmt === FMT_TABELA && Array.isArray(o.redovi)) {
      return { fmt: FMT_TABELA, redovi: o.redovi, summary: null };
    }
    if (o && typeof o === "object" && !o._fmt) {
      return { fmt: 1, redovi: [], summary: o };
    }
  } catch { /* legacy */ }
  return { fmt: 1, redovi: [], summary: { proces: s } };
}

export function parseControlPlanRefRaw(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return { fmt: 0, redovi: [], summary: {} };
  try {
    const o = JSON.parse(s);
    if (o?._fmt === FMT_TABELA && Array.isArray(o.redovi)) {
      return { fmt: FMT_TABELA, redovi: o.redovi, summary: null };
    }
    if (o && typeof o === "object" && !o._fmt) {
      return { fmt: 1, redovi: [], summary: o };
    }
  } catch { /* legacy */ }
  return { fmt: 1, redovi: [], summary: { operacija: s } };
}

/** PFMEA + CP za nacrt 8D na osnovu defekta iz Pareta — samo REF sažetak. */
export function pfmeaCpZaDefekt(nazivDefekta, opts = {}) {
  const pfmeaRedovi = opts.sviPfmea ?? arhiva?.pfmea?.redovi ?? [];
  const cpRedovi = opts.sviCp ?? arhiva?.controlPlan?.redovi ?? [];
  const refs = pfmeaCpRefZaDefekt(nazivDefekta, { pfmeaRedovi, cpRedovi });
  return {
    pfmea_ref: refs.pfmea_ref,
    control_plan_ref: refs.control_plan_ref,
    pfmeaRedovi: filtrirajPfmeaPoDefektu(nazivDefekta, { limit: 3, sviRedovi: pfmeaRedovi }),
    cpRedovi: filtrirajControlPlanPoDefektu(nazivDefekta, { limit: 4, sviRedovi: cpRedovi }),
  };
}

function formatSummaryHtml(kolone, summary) {
  const redovi = kolone.map((k) => `<tr><th>${esc(k.label)}</th><td>${esc(summary[k.key] ?? "—")}</td></tr>`).join("");
  return `<table class="tbl ref-tbl"><tbody>${redovi}</tbody></table>`;
}

export function formatPfmeaHtml(raw) {
  const { fmt, redovi, summary } = parsePfmeaRefRaw(raw);
  const sum = fmt === 1 && summary
    ? summary
    : (fmt === FMT_TABELA && redovi?.[0] ? pfmeaRedUSummaryRef(redovi[0]) : null);
  if (sum && Object.values(sum).some(Boolean)) {
    return `<div class="ref-blok"><div class="ref-naslov">PFMEA — REFERENCA</div>${formatSummaryHtml(
      PFMEA_REF_POLJA.map((p) => ({ key: p.key, label: p.label })),
      sum,
    )}</div>`;
  }
  return "";
}

export function formatControlPlanHtml(raw) {
  const { fmt, redovi, summary } = parseControlPlanRefRaw(raw);
  const sum = fmt === 1 && summary
    ? summary
    : (fmt === FMT_TABELA && redovi?.[0] ? cpRedUSummaryRef(redovi[0]) : null);
  if (sum && Object.values(sum).some(Boolean)) {
    return `<div class="ref-blok"><div class="ref-naslov">CONTROL PLAN — REFERENCA</div>${formatSummaryHtml(
      CP_REF_POLJA.map((p) => ({ key: p.key, label: p.label })),
      sum,
    )}</div>`;
  }
  return "";
}

export function imaPfmeaCpSadrzaj(izv) {
  const pSum = pfmeaRefZaEditor(izv?.pfmea_ref);
  const cSum = cpRefZaEditor(izv?.control_plan_ref);
  return Object.values(pSum).some(Boolean) || Object.values(cSum).some(Boolean);
}

export { arhiva as pfmeaCpArhiva };
