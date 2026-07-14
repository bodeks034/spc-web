/** Pregled za šefa smene — FPY, OEE, alarmi, TOP NOK, moment %. */

import { fetchZajednickiDashboard } from "./zajednickiDashboard.js";
import { izracunajMomentPct } from "./shopFloorStatus.js";

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

  let momQ = supabase.from("moment_protokol")
    .select("status,id_deo")
    .eq("datum", danas);
  if (deo) momQ = momQ.eq("id_deo", deo);
  if (smena) momQ = momQ.eq("smena", Number(smena));

  let ncrQ = supabase.from("ncr_capa")
    .select("id,broj_ncr,id_deo,status,prioritet,izvor,spc_alarm_id,osmd_id,eskalacija_id,opis,created_at")
    .not("status", "eq", "zatvoren")
    .order("created_at", { ascending: false })
    .limit(10);
  if (deo) ncrQ = ncrQ.eq("id_deo", deo);

  const [spcRes, momRes, ncrRes] = await Promise.all([spcQ, momQ, ncrQ]);

  let momOk = 0;
  let momNok = 0;
  for (const r of momRes.data || []) {
    if (r.status === "OK") momOk += 1;
    else if (r.status === "NOK") momNok += 1;
  }

  const attr = dash?.attr || {};
  const mer = dash?.merljive || {};
  const fpy = izracunajFpyIzDash(attr, mer);

  return {
    fpy,
    oee: dash?.oee?.prosek ?? null,
    rty: dash?.rtyPogon ?? null,
    skart: dash?.oee?.skart ?? 0,
    dorada: dash?.oee?.dorada ?? 0,
    ukupnoKpi: dash?.oee?.kpi?.ukupno_kom ?? dash?.oee?.imaKpi ? (dash?.oee?.skart + dash?.oee?.dorada) : 0,
    kalUpozorenja: dash?.merila?.upozorenja ?? 0,
    merilaIstekla: dash?.merila?.istekla ?? 0,
    topNok: dash?.topNok || [],
    eskOtvorene: dash?.eskalacije?.otvorene ?? 0,
    visokNokDelovi: dash?.visokNokDelovi || [],
    spcAlarmi: spcRes.data || [],
    ncrOtvoreni: ncrRes.error ? [] : (ncrRes.data || []),
    momentPctOk: izracunajMomentPct(momOk, momNok),
    momentOk: momOk,
    momentNok: momNok,
    operativniAlarmi: dash?.alarmi || [],
    offlinePaketi: dash?.offlinePaketi ?? 0,
    danas,
  };
}
