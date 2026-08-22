/** Pregled za šefa smene — FPY, RTY, alarmi, TOP NOK. */

import { fetchZajednickiDashboard } from "./zajednickiDashboard.js";

const danasIso = () => new Date().toISOString().split("T")[0];

export function izracunajFpyIzDash(attr = {}, mer = {}) {
  const ukN = (attr.ukN || 0) + (mer.merenja || 0);
  const ukOk = ((attr.ukN || 0) - (attr.ukNOK || 0)) + ((mer.merenja || 0) - (mer.nok || 0));
  return ukN > 0 ? +((ukOk / ukN) * 100).toFixed(1) : null;
}

export function bojaFpyKpi(fpy, C) {
  if (fpy == null) return C.sivi;
  if (fpy >= 98) return C.zelena;
  if (fpy >= 95) return C.zuta;
  return C.crvena;
}

export async function fetchSefSmenaPregled(supabase, {
  smena = null,
  linija = "",
  idDeo = "",
  period = 1,
} = {}) {
  const danas = danasIso();
  const deo = String(idDeo || "").trim().toUpperCase();

  const dash = await fetchZajednickiDashboard(supabase, {
    period: Number(period) || 1,
    idDeo: deo || undefined,
    linija: linija || undefined,
    smena: smena ?? undefined,
  });

  let spcQ = supabase.from("spc_alarmi")
    .select("id,id_deo,pravilo,status,datum,tip_karte")
    .eq("status", "otvoren")
    .gte("datum", danas)
    .order("created_at", { ascending: false })
    .limit(15);
  if (deo) spcQ = spcQ.eq("id_deo", deo);

  let ncrQ = supabase.from("ncr_capa")
    .select("id,broj_ncr,id_deo,status,prioritet,izvor,spc_alarm_id,osmd_id,eskalacija_id,opis,created_at")
    .not("status", "eq", "zatvoren")
    .order("created_at", { ascending: false })
    .limit(10);
  if (deo) ncrQ = ncrQ.eq("id_deo", deo);

  const [spcRes, ncrRes] = await Promise.all([spcQ, ncrQ]);

  const attr = dash?.attr || {};
  const mer = dash?.merljive || {};
  const fpy = izracunajFpyIzDash(attr, mer);

  return {
    fpy,
    rty: dash?.rtyPogon ?? null,
    skart: dash?.kpi?.skart ?? 0,
    dorada: dash?.kpi?.dorada ?? 0,
    ukupnoKpi: dash?.kpi?.agregat?.ukupno_kom ?? dash?.kpi?.imaKpi ? (dash?.kpi?.skart + dash?.kpi?.dorada) : 0,
    kalUpozorenja: dash?.merila?.upozorenja ?? 0,
    merilaIstekla: dash?.merila?.istekla ?? 0,
    topNok: dash?.topNok || [],
    eskOtvorene: dash?.eskalacije?.otvorene ?? 0,
    visokNokDelovi: dash?.visokNokDelovi || [],
    spcAlarmi: spcRes.data || [],
    ncrOtvoreni: ncrRes.error ? [] : (ncrRes.data || []),
    operativniAlarmi: dash?.alarmi || [],
    offlinePaketi: dash?.offlinePaketi ?? 0,
    danas,
  };
}
