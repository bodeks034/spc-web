/**
 * Most moment korak ↔ PFMEA / Control Plan (QS-TRQ-001).
 */

import { predloziMomentKlasifikaciju } from "./momentPfmeaMetodologija.js";

const MOMENT_CP_RE = /moment|zatezan|torque|pritisk|navoj|vijak|\bnm\b|ugao/i;

function normId(s) {
  return String(s || "").trim().toUpperCase();
}

function normRef(s) {
  return String(s || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function idDeoIzTeksta(s) {
  const m = String(s || "").match(/^([A-Z0-9][A-Z0-9-]*)/i);
  return m ? m[1].toUpperCase() : "";
}

/** Učitaj CP + PFMEA stavke za deo (sa DB id-jevima). */
export async function ucitajPfmeaCpPaketZaDeo(supabase, idDeo) {
  const deo = normId(idDeo);
  if (!deo) return { dokumenti: [], pfmea: [], cp: [] };

  const { data: docs, error: eDoc } = await supabase
    .from("pfmea_cp_dokumenti")
    .select("id,naziv,id_deo,revizija,updated_at")
    .eq("aktivan", true)
    .eq("id_deo", deo)
    .order("updated_at", { ascending: false });

  if (eDoc) throw eDoc;

  let dokumenti = docs || [];
  let docIds = dokumenti.map((d) => d.id);

  if (!docIds.length) {
    const { data: docsSvi, error: e2 } = await supabase
      .from("pfmea_cp_dokumenti")
      .select("id,naziv,id_deo,revizija,updated_at")
      .eq("aktivan", true)
      .order("updated_at", { ascending: false })
      .limit(20);
    if (e2) throw e2;
    dokumenti = (docsSvi || []).filter((d) => !d.id_deo || normId(d.id_deo) === deo);
    docIds = dokumenti.map((d) => d.id);
  }

  if (!docIds.length) return { dokumenti: [], pfmea: [], cp: [] };

  const docMap = new Map(dokumenti.map((d) => [d.id, d]));

  const [{ data: pfmea }, { data: cp }] = await Promise.all([
    supabase.from("pfmea_stavke").select("*").in("dokument_id", docIds).order("red_broj").order("id"),
    supabase.from("control_plan_stavke").select("*").in("dokument_id", docIds).order("red_broj").order("id"),
  ]);

  const pfmeaStavke = (pfmea || []).map((r) => ({
    ...r,
    _dbId: r.id,
    _dokumentId: r.dokument_id,
    _dokument: docMap.get(r.dokument_id) || null,
  }));

  const cpStavke = (cp || []).map((r) => ({
    ...r,
    _dbId: r.id,
    _dokumentId: r.dokument_id,
    _dokument: docMap.get(r.dokument_id) || null,
  }));

  return { dokumenti, pfmea: pfmeaStavke, cp: cpStavke };
}

/** Jedna CP stavka + povezani PFMEA red. */
export async function ucitajCpPfmeaDetalj(supabase, controlPlanStavkaId) {
  const id = Number(controlPlanStavkaId);
  if (!Number.isFinite(id)) return null;

  const { data: cp, error } = await supabase
    .from("control_plan_stavke")
    .select("*, pfmea_cp_dokumenti(id,naziv,id_deo,revizija)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!cp) return null;

  const cpStavka = {
    ...cp,
    _dbId: cp.id,
    _dokumentId: cp.dokument_id,
    _dokument: cp.pfmea_cp_dokumenti || null,
  };

  const { data: pfmeaRows } = await supabase
    .from("pfmea_stavke")
    .select("*")
    .eq("dokument_id", cp.dokument_id);

  const pfmea = nadjiPfmeaZaCp(cpStavka, (pfmeaRows || []).map((r) => ({ ...r, _dbId: r.id })));
  return { cp: cpStavka, pfmea };
}

export function cpStavkaJeMoment(cp) {
  const hay = [
    cp?.karakteristika,
    cp?.metoda,
    cp?.oprema,
    cp?.zapis_forma,
    cp?.proces,
    cp?.mod_greske_pfmea,
  ].join(" ");
  return MOMENT_CP_RE.test(hay);
}

export function nadjiPfmeaZaCp(cp, pfmeaStavke) {
  const ref = normRef(cp?.pfmea_referenca);
  if (!ref) return null;

  const lista = pfmeaStavke || [];
  const tacno = lista.find((p) => normRef(p.pfmea_veza) === ref);
  if (tacno) return tacno;

  const delRef = ref.replace(/§/g, "").split(" ").filter(Boolean);
  const kljuc = delRef[0];
  if (!kljuc) return null;

  return lista.find((p) => {
    const pv = normRef(p.pfmea_veza);
    return pv.includes(kljuc) || kljuc.includes(pv.split(" ")[0]);
  }) || null;
}

export function nadjiCpPoTorqueId(cpStavke, torqueId) {
  const tid = String(torqueId || "").trim().toUpperCase();
  if (!tid) return null;
  const num = tid.replace(/^T0*/, "");
  return (cpStavke || []).find((c) => {
    if (String(c._dbId) === num) return true;
    if (formatTorqueId(c._dbId).toUpperCase() === tid) return true;
    return normRef(c.pfmea_referenca).includes(tid.toLowerCase());
  }) || null;
}

export function formatTorqueId(cpStavkaId) {
  const n = Number(cpStavkaId);
  if (!Number.isFinite(n)) return "";
  return `T${String(n).padStart(6, "0")}`;
}

/** Parsiraj nominalnu / toleranciju CP → Nm. */
export function parsirajCpMomentVrednosti(cp) {
  const nom = String(cp?.nominalna || "");
  const tol = String(cp?.tolerancija || "");

  const nmMatch = nom.match(/([\d.,]+)\s*nm/i) || nom.match(/^([\d.,]+)\s*$/);
  const cilj = nmMatch ? Number(String(nmMatch[1]).replace(",", ".")) : null;

  const range = tol.match(/([\d.,]+)\s*[–\-—]\s*([\d.,]+)\s*nm?/i)
    || tol.match(/([\d.,]+)\s*±\s*([\d.,]+)/);
  if (range && Number.isFinite(cilj)) {
    const a = Number(String(range[1]).replace(",", "."));
    const b = Number(String(range[2]).replace(",", "."));
    if (tol.includes("±")) {
      return { cilj_nm: cilj, tol_min: cilj - b, tol_max: cilj + b };
    }
    return { cilj_nm: cilj, tol_min: Math.min(a, b), tol_max: Math.max(a, b) };
  }

  const pct = tol.match(/±\s*([\d.,]+)\s*%/);
  if (pct && Number.isFinite(cilj)) {
    const p = Number(String(pct[1]).replace(",", "."));
    const delta = cilj * (p / 100);
    return { cilj_nm: cilj, tol_min: roundNm(cilj - delta), tol_max: roundNm(cilj + delta) };
  }

  return { cilj_nm: Number.isFinite(cilj) ? cilj : null, tol_min: null, tol_max: null };
}

function roundNm(v) {
  return Math.round(v * 10) / 10;
}

/** Mapiranje CP (+ PFMEA) → polja moment koraka. */
export function mapirajCpNaMomentPolja(cp, pfmea = null) {
  const { cilj_nm, tol_min, tol_max } = parsirajCpMomentVrednosti(cp);
  const s = pfmea?.s != null && pfmea.s !== "" ? Number(pfmea.s) : null;
  const o = pfmea?.o != null && pfmea.o !== "" ? Number(pfmea.o) : null;
  const d = pfmea?.d != null && pfmea.d !== "" ? Number(pfmea.d) : null;

  let klasifikacija = String(cp?.klasifikacija || "").trim().toUpperCase();
  if (!["VSK", "KSK", "STD"].includes(klasifikacija) && s != null) {
    klasifikacija = predloziMomentKlasifikaciju(s, o, d) || klasifikacija || "STD";
  }
  if (!["VSK", "KSK", "STD"].includes(klasifikacija)) klasifikacija = "STD";

  const pfmeaVeza = pfmea?.pfmea_veza || cp?.pfmea_referenca || "";

  return {
    control_plan_stavka_id: cp?._dbId || cp?.id || null,
    pfmea_veza: pfmeaVeza,
    pfmea_stavka_id: pfmea?._dbId || pfmea?.id || null,
    torque_id: formatTorqueId(cp?._dbId || cp?.id),
    klasifikacija,
    cilj_nm: cilj_nm ?? undefined,
    tol_min: tol_min ?? undefined,
    tol_max: tol_max ?? undefined,
    pfmea_s: Number.isFinite(s) ? s : "",
    pfmea_o: Number.isFinite(o) ? o : "",
    pfmea_d: Number.isFinite(d) ? d : "",
    sklop: idDeoIzTeksta(cp?.br_dela) || undefined,
    napomena_cp: [
      cp?.karakteristika,
      cp?.metoda ? `Metoda: ${cp.metoda}` : "",
      cp?.velicina_uzoraka ? `Uzorak: ${cp.velicina_uzoraka}` : "",
    ].filter(Boolean).join(" · ") || undefined,
  };
}

export function formatCpStavkaLabel(cp) {
  const deo = String(cp?.br_dela || "").split("\n")[0].trim();
  const kar = String(cp?.karakteristika || "").trim();
  const nom = String(cp?.nominalna || "").trim();
  const kl = cp?.klasifikacija ? ` [${cp.klasifikacija}]` : "";
  const ref = cp?.pfmea_referenca ? ` · ${cp.pfmea_referenca}` : "";
  return [deo, kar, nom].filter(Boolean).join(" — ") + kl + ref;
}

export function filtrirajCpZaMoment(cpStavke, { tekst = "", samoMoment = true } = {}) {
  const q = normRef(tekst);
  let lista = [...(cpStavke || [])];
  if (samoMoment) {
    const moment = lista.filter(cpStavkaJeMoment);
    if (moment.length) lista = moment;
  }
  if (!q) return lista;
  return lista.filter((c) => {
    const hay = normRef([
      c.br_dela, c.proces, c.karakteristika, c.nominalna, c.tolerancija,
      c.pfmea_referenca, c.metoda, formatTorqueId(c._dbId),
    ].join(" "));
    return hay.includes(q);
  });
}

export function formatPfmeaKratko(pfmea) {
  if (!pfmea) return null;
  return {
    ref: pfmea.pfmea_veza || "—",
    mod: pfmea.mod_greske || pfmea.efekat_greske || "—",
    s: pfmea.s || "—",
    o: pfmea.o || "—",
    d: pfmea.d || "—",
    rpn: pfmea.rpn_before || (pfmea.s && pfmea.o && pfmea.d ? Number(pfmea.s) * Number(pfmea.o) * Number(pfmea.d) : "—"),
  };
}
