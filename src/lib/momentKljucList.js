/** Jedan inženjerski list → automatska distribucija u JOB / pozicija / korak. */

import {
  momentBlokadaZaKlasu,
  momentUzorakObavezan,
} from "./momentKljuc.js";
import toolMaster from "../data/momentToolMaster.json" with { type: "json" };

export const MOMENT_ERROR_KOD = {
  E001: "Moment ispod minimuma",
  E002: "Moment iznad maksimuma",
  E003: "Ugao nije postignut",
  E004: "Prekid ciklusa",
  E005: "Pogrešan program",
  E006: "Pogrešan alat",
  E007: "Dvostruko zatezanje",
};

/** Kolone jednog lista (red = jedan korak zatezanja). */
export const MOMENT_LIST_KOLONE = [
  { key: "id_deo", label: "ID deo", w: 100 },
  { key: "kod_job", label: "JOB", w: 72 },
  { key: "naziv_job", label: "Naziv JOB", w: 140 },
  { key: "operacija", label: "Operacija", w: 88 },
  { key: "redosled", label: "Korak", w: 48 },
  { key: "prolaz", label: "Prolaz", w: 48 },
  { key: "poz_br", label: "Poz.", w: 40 },
  { key: "poz_opis", label: "Opis pozicije", w: 140 },
  { key: "sklop", label: "Sklop", w: 88 },
  { key: "vijak", label: "Vijak", w: 72 },
  { key: "klasa_vijka", label: "Klasa", w: 48 },
  { key: "cilj_nm", label: "Nm", w: 52 },
  { key: "tol_min", label: "Min", w: 48 },
  { key: "tol_max", label: "Max", w: 48 },
  { key: "tol_pct", label: "Tol%", w: 44 },
  { key: "ugao_cilj", label: "Ugao°", w: 52 },
  { key: "ugao_tol", label: "±Ugao", w: 48 },
  { key: "tip", label: "Tip", w: 56 },
  { key: "klasifikacija", label: "VSK", w: 44 },
  { key: "tool_kod", label: "Alat", w: 48 },
  { key: "program_kod", label: "Prog.", w: 48 },
  { key: "torque_id", label: "Torque ID", w: 72 },
  { key: "pfmea_veza", label: "PFMEA", w: 88 },
  { key: "dijagram", label: "Dijagram", w: 120 },
  { key: "vendor_profil", label: "Vendor", w: 56 },
  { key: "sekvenca_sablon", label: "Sekvenca", w: 88 },
  { key: "napomena", label: "Napomena", w: 120 },
];

const HEADER_ALIASES = {
  id_deo: ["id_deo", "part_id", "id deo", "deo"],
  kod_job: ["kod_job", "job", "sklop"],
  naziv_job: ["naziv_job", "naziv job", "naziv dela", "part_name"],
  operacija: ["operacija", "operation"],
  redosled: ["redosled", "korak", "rbr", "n"],
  prolaz: ["prolaz", "pass"],
  poz_br: ["poz_br", "poz.", "pozicija", "position", "poz_br"],
  poz_opis: ["poz_opis", "opis pozicije", "opis", "pozicija opis"],
  sklop: ["sklop", "subsystem", "system"],
  vijak: ["vijak", "bolt", "navoj"],
  klasa_vijka: ["klasa_vijka", "klasa", "grade", "klasa vijka"],
  cilj_nm: ["cilj_nm", "moment (nm)", "moment", "targettorquenm", "targettorque", "cilj nm"],
  tol_min: ["tol_min", "min"],
  tol_max: ["tol_max", "max"],
  tol_pct: ["tol_pct", "tol.", "tol", "tolerancija"],
  ugao_cilj: ["ugao_cilj", "ugao", "angledeg", "angle"],
  ugao_tol: ["ugao_tol"],
  tip: ["tip", "type"],
  klasifikacija: ["klasifikacija", "klasa spoja", "criticality"],
  tool_kod: ["tool_kod", "alat", "tool"],
  program_kod: ["program_kod", "program"],
  torque_id: ["torque_id", "torque id"],
  pfmea_veza: ["pfmea_veza", "pfmea veza", "pfmea ref", "pfmea_referenca"],
  dijagram: ["dijagram", "dijagram_fajl", "svg"],
  vendor_profil: ["vendor_profil", "vendor"],
  sekvenca_sablon: ["sekvenca_sablon", "sekvenca", "sequence"],
  napomena: ["napomena", "note"],
};

function normHdr(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function mapHeader(hdr) {
  const h = normHdr(hdr);
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((a) => h === a || h.includes(a))) return key;
  }
  return null;
}

function numOrNull(v) {
  if (v == null || v === "") return null;
  const s = String(v).replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseUgao(raw) {
  const s = String(raw || "").trim();
  if (!s || s === "–" || s === "-") return { ugao_cilj: null, ugao_tol: null };
  const m = s.match(/(\d+(?:\.\d+)?)/);
  const ugao = m ? Number(m[1]) : null;
  return { ugao_cilj: ugao, ugao_tol: 5 };
}

function inferTip(red) {
  if (red.tip) return String(red.tip).trim().toUpperCase();
  const prolaz = Number(red.prolaz) || 1;
  if (prolaz > 1) return "STAGED";
  if (red.ugao_cilj != null) return "NM_UGAO";
  return "NM";
}

function inferTol(red) {
  let tolMin = numOrNull(red.tol_min);
  let tolMax = numOrNull(red.tol_max);
  let tolPct = numOrNull(red.tol_pct);
  const cilj = numOrNull(red.cilj_nm);
  if (red.tol_pct && typeof red.tol_pct === "string" && red.tol_pct.includes("%")) {
    tolPct = numOrNull(red.tol_pct.replace("%", ""));
  }
  if (cilj != null && tolPct != null && tolMin == null && tolMax == null) {
    const d = cilj * (tolPct / 100);
    tolMin = Math.round((cilj - d) * 10) / 10;
    tolMax = Math.round((cilj + d) * 10) / 10;
  }
  return { tol_min: tolMin, tol_max: tolMax, tol_pct: tolPct };
}

export function normalizujMomentListRed(raw, idx = 0) {
  const red = { _idx: idx };
  for (const k of MOMENT_LIST_KOLONE.map((c) => c.key)) {
    red[k] = raw[k] != null ? String(raw[k]).trim() : "";
  }
  red.id_deo = red.id_deo.toUpperCase();
  red.kod_job = red.kod_job || red.sklop || "";
  red.redosled = numOrNull(red.redosled) || (idx + 1);
  red.prolaz = numOrNull(red.prolaz) || 1;
  red.cilj_nm = numOrNull(red.cilj_nm);
  const tol = inferTol(red);
  red.tol_min = tol.tol_min;
  red.tol_max = tol.tol_max;
  red.tol_pct = tol.tol_pct;
  if (!red.ugao_cilj && red.ugao_cilj !== 0) {
    const u = parseUgao(raw.ugao_cilj || raw.ugao);
    red.ugao_cilj = u.ugao_cilj;
    red.ugao_tol = numOrNull(red.ugao_tol) ?? u.ugao_tol;
  } else {
    red.ugao_cilj = numOrNull(red.ugao_cilj);
    red.ugao_tol = numOrNull(red.ugao_tol);
  }
  red.tip = inferTip(red);
  red.klasifikacija = (red.klasifikacija || "STD").toUpperCase();
  if (!red.tool_kod && red.cilj_nm != null) {
    red.tool_kod = predloziToolKod(red.cilj_nm);
  }
  if (!red.program_kod && red.tool_kod) {
    const t = toolMaster.alati.find((a) => a.tool_kod === red.tool_kod);
    if (t?.program_kod) red.program_kod = t.program_kod;
  }
  if (!red.poz_br && red.poz_opis) {
    red.poz_br = String(red.redosled);
  }
  return red;
}

export function predloziToolKod(ciljNm) {
  const n = Number(ciljNm);
  if (!Number.isFinite(n)) return "";
  const hit = toolMaster.alati.find((a) => n >= a.nm_min && n <= a.nm_max);
  return hit?.tool_kod || "";
}

export function kljucZaJob(red) {
  return [
    red.id_deo,
    red.kod_job,
    red.operacija || "",
    red.revizija || "A",
  ].join("|").toUpperCase();
}

/** Parsiraj TSV/CSV (prvi red = header). */
export function parseMomentListTekst(tekst) {
  const linije = String(tekst || "").trim().split(/\r?\n/).filter(Boolean);
  if (!linije.length) return [];
  const sep = linije[0].includes("\t") ? "\t" : (linije[0].includes(";") ? ";" : ",");
  const hdrs = linije[0].split(sep).map((h) => mapHeader(h));
  const out = [];
  for (let i = 1; i < linije.length; i++) {
    const cells = linije[i].split(sep);
    const raw = {};
    hdrs.forEach((k, j) => {
      if (k && cells[j] != null) raw[k] = cells[j].trim();
    });
    if (!raw.id_deo && !raw.kod_job && !raw.cilj_nm) continue;
    out.push(normalizujMomentListRed(raw, out.length));
  }
  return out;
}

/** Objekti iz Excel parsera (key = column key). */
export function parseMomentListObjekti(redovi) {
  return (redovi || [])
    .filter((r) => r.id_deo || r.kod_job || r.cilj_nm)
    .map((r, i) => normalizujMomentListRed(r, i));
}

/** Grupiši listu u JOB / pozicije / korake za upis u bazu. */
export function rasporediMomentListu(redovi) {
  const jobs = new Map();
  const pozicije = [];
  const koraci = [];
  const greske = [];

  for (const red of redovi) {
    if (!red.id_deo || !red.kod_job) {
      greske.push(`Red ${red._idx + 1}: nedostaje id_deo ili kod_job`);
      continue;
    }
    if (!Number.isFinite(red.cilj_nm) && red.tip !== "INFO") {
      greske.push(`Red ${red._idx + 1}: nedostaje cilj_nm`);
      continue;
    }
    const jk = kljucZaJob(red);
    if (!jobs.has(jk)) {
      jobs.set(jk, {
        id_deo: red.id_deo,
        kod_job: red.kod_job,
        naziv: red.naziv_job || red.kod_job,
        operacija: red.operacija || null,
        tip_vozila: red.tip_vozila || null,
        vendor_profil: red.vendor_profil || "atlas",
        revizija: red.revizija || "A",
        dijagram_fajl: red.dijagram || null,
        sekvenca_sablon: red.sekvenca_sablon || null,
        napomena: red.napomena_job || null,
      });
    }
    if (red.poz_br) {
      pozicije.push({
        jobKey: jk,
        poz_br: String(red.poz_br),
        opis: red.poz_opis || red.sklop || null,
        klasifikacija: red.klasifikacija || "STD",
      });
    }
    koraci.push({
      jobKey: jk,
      redosled: red.redosled,
      poz_br: red.poz_br ? String(red.poz_br) : null,
      prolaz: red.prolaz || 1,
      tip: red.tip || "NM",
      cilj_nm: red.cilj_nm,
      tol_min: red.tol_min,
      tol_max: red.tol_max,
      tol_pct: red.tol_pct,
      ugao_cilj: red.ugao_cilj,
      ugao_tol: red.ugao_tol,
      klasifikacija: red.klasifikacija || "STD",
      varijanta: red.varijanta || null,
      torque_id: red.torque_id || null,
      pfmea_veza: red.pfmea_veza || null,
      pfmea_stavka_id: red.pfmea_stavka_id || null,
      control_plan_stavka_id: red.control_plan_stavka_id || null,
      tool_kod: red.tool_kod || null,
      program_kod: red.program_kod || null,
      vijak: red.vijak || null,
      klasa_vijka: red.klasa_vijka || null,
      sklop: red.sklop || null,
      blokiraj_na_nok: momentBlokadaZaKlasu(red.klasifikacija),
      uzorak_obavezan: momentUzorakObavezan(red.klasifikacija),
      napomena: red.napomena || null,
    });
  }

  const uniqPoz = new Map();
  for (const p of pozicije) {
    uniqPoz.set(`${p.jobKey}|${p.poz_br}`, p);
  }

  return {
    jobovi: [...jobs.values()],
    pozicije: [...uniqPoz.values()],
    koraci,
    greske,
  };
}

/** Iz baze (job + koraci + pozicije) → flat lista za UI. */
export function spljostiMomentUBazu(job, koraci, pozicije, crtez) {
  const pozMap = new Map((pozicije || []).map((p) => [String(p.poz_br), p]));
  const dijagram = job.dijagram_fajl
    || (crtez?.prikaz_putanja ? crtez.prikaz_putanja.split("/").pop() : "");

  return [...(koraci || [])]
    .sort((a, b) => a.redosled - b.redosled)
    .map((k, i) => {
      const poz = k.poz_br ? pozMap.get(String(k.poz_br)) : null;
      return normalizujMomentListRed({
        id_deo: job.id_deo,
        kod_job: job.kod_job,
        naziv_job: job.naziv,
        operacija: job.operacija,
        vendor_profil: job.vendor_profil,
        dijagram,
        sekvenca_sablon: job.sekvenca_sablon,
        redosled: k.redosled,
        prolaz: k.prolaz,
        poz_br: k.poz_br,
        poz_opis: poz?.opis || k.sklop,
        sklop: k.sklop,
        vijak: k.vijak,
        klasa_vijka: k.klasa_vijka,
        cilj_nm: k.cilj_nm,
        tol_min: k.tol_min,
        tol_max: k.tol_max,
        tol_pct: k.tol_pct,
        ugao_cilj: k.ugao_cilj,
        ugao_tol: k.ugao_tol,
        tip: k.tip,
        klasifikacija: k.klasifikacija || poz?.klasifikacija,
        tool_kod: k.tool_kod,
        program_kod: k.program_kod,
        torque_id: k.torque_id,
        pfmea_veza: k.pfmea_veza,
        pfmea_stavka_id: k.pfmea_stavka_id,
        control_plan_stavka_id: k.control_plan_stavka_id,
        pfmea_s: k.pfmea_s,
        pfmea_o: k.pfmea_o,
        pfmea_d: k.pfmea_d,
        napomena: k.napomena,
      }, i);
    });
}

export function momentErrorKod(provera) {
  if (provera?.ok) return null;
  const r = String(provera?.razlog || "").toLowerCase();
  if (r.includes("ispod")) return "E001";
  if (r.includes("iznad")) return "E002";
  if (r.includes("ugao")) return "E003";
  if (r.includes("nema vrednosti")) return "E004";
  return "E002";
}

export { toolMaster };
