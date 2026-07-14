/** Kombinovani pregled smene — atributivne + merljive, po pogonima (A–I). */

import { fetchPredajaPodataka } from "./predajaSmenePdf.js";
import { izracunajFpyIzDash } from "./sefSmenaDashboard.js";
import {
  fetchSmenaStatPoPogonima,
  fetchAktivniRadniNalozi,
  fetchListaPogona,
} from "./smenaPogonBreakdown.js";

export { fetchSmenaStatPoPogonima, fetchAktivniRadniNalozi, fetchListaPogona } from "./smenaPogonBreakdown.js";

export function dIsoSmena() {
  return new Date().toISOString().split("T")[0];
}

export function statIzPredajaPodataka(pod) {
  const m = pod?.merenja || {};
  const n = m.n || 0;
  return {
    n,
    ok: m.ok || 0,
    nok: m.nok || 0,
    fpy: n > 0 ? m.rty : null,
    dpmo: m.dpmo || 0,
    topNok: pod?.topNok || [],
    skartKpi: pod?.skartKpi || null,
  };
}

export function spojiSmenaPogonaStat(attr = {}, merljive = {}) {
  const ukN = (attr.n || 0) + (merljive.n || 0);
  const ukNok = (attr.nok || 0) + (merljive.nok || 0);
  const fpy = izracunajFpyIzDash(
    { ukN: attr.n || 0, ukNOK: attr.nok || 0 },
    { merenja: merljive.n || 0, nok: merljive.nok || 0 },
  );
  return {
    n: ukN,
    ok: (attr.ok || 0) + (merljive.ok || 0),
    nok: ukNok,
    fpy,
    dpmo: ukN > 0 ? Math.round((ukNok / ukN) * 1e6) : 0,
  };
}

export function imaSadrzajPredajeSmene(pod, { napomena = "", offlineInfo = null } = {}) {
  if (!pod) return false;
  if (pod.imaPodatke || (pod.ukupno?.n || 0) > 0) return true;
  if (pod.poPogon?.length) return true;
  if (pod.alarmi?.length || pod.ncr?.length || pod.osmd?.length) return true;
  if (pod.radniNalozi?.length) return true;
  if ((pod.skartKpi?.skart || 0) > 0 || (pod.skartKpi?.dorada || 0) > 0) return true;
  if (String(napomena || "").trim()) return true;
  if (offlineInfo?.total > 0) return true;
  return false;
}

export async function fetchSmenaPogonaPregled(supabase, {
  datum,
  smena,
  linija = null,
  pogonKod = null,
} = {}) {
  const d = datum || dIsoSmena();
  const sm = Number(smena) || 1;
  const base = { datum: d, smena: sm, linija: linija || null, pogonKod: pogonKod || null };

  const [attrPod, merPod, poPogon, radniNalozi, listaPogona] = await Promise.all([
    fetchPredajaPodataka(supabase, { ...base, modul: "atributivne" }),
    fetchPredajaPodataka(supabase, { ...base, modul: "merljive" }),
    pogonKod ? Promise.resolve({ redovi: [] }) : fetchSmenaStatPoPogonima(supabase, { datum: d, smena: sm, linija }),
    fetchAktivniRadniNalozi(supabase, { pogonKod }),
    fetchListaPogona(supabase),
  ]);

  const attr = statIzPredajaPodataka(attrPod);
  const merljive = statIzPredajaPodataka(merPod);
  const ukupno = spojiSmenaPogonaStat(attr, merljive);

  const skartKpi = {
    skart: (attrPod.skartKpi?.skart || 0) + (merPod.skartKpi?.skart || 0),
    dorada: (attrPod.skartKpi?.dorada || 0) + (merPod.skartKpi?.dorada || 0),
    ukupno: (attrPod.skartKpi?.ukupno || 0) + (merPod.skartKpi?.ukupno || 0),
    planirano: (attrPod.skartKpi?.planirano || 0) + (merPod.skartKpi?.planirano || 0),
  };

  return {
    datum: d,
    smena: sm,
    pogonKod: pogonKod || null,
    attr,
    merljive,
    ukupno,
    skartKpi,
    poPogon: poPogon.redovi || [],
    listaPogona,
    radniNalozi,
    alarmi: attrPod.alarmi || [],
    ncr: attrPod.ncr || [],
    osmd: attrPod.osmd || [],
    moment: attrPod.moment?.n > 0 ? attrPod.moment : merPod.moment,
    msaKasni: attrPod.msaKasni || [],
    kalIstekla: attrPod.kalIstekla || [],
    imaPodatke: ukupno.n > 0,
    attrPod,
    merPod,
  };
}
