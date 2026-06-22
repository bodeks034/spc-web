import { calcDPMO, calcRTY, mergeSmenaStat } from "./spcStats.js";
import { fetchKpiUnos, agregirajKpiUnos } from "./kpiUnos.js";
import { generisiPredajaSmenePdf } from "./predajaSmenePdf.js";

export async function fetchSmenaStatMerljive(supabase, { datum, smena, idDeo }) {
  let q = supabase.from("merenja_varijabilna")
    .select("status")
    .eq("datum", datum)
    .eq("smena", Number(smena));
  if (idDeo) q = q.eq("id_deo", idDeo);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data || [];
  const n = rows.length;
  const nok = rows.filter(r => (r.status || "").toUpperCase() === "NOK").length;
  const ok = n - nok;
  const dbStat = { ok, nok, merenja: n };

  let kpi = null;
  try {
    const kpiRows = await fetchKpiUnos(supabase, {
      modul: "merljive",
      datumOd: datum,
      datumDo: datum,
      smena,
      idDeo: idDeo || undefined,
      limit: 50,
    });
    kpi = agregirajKpiUnos(kpiRows, { modul: "merljive" });
  } catch { /* KPI opciono */ }

  const kval = mergeSmenaStat(dbStat, { ok: 0, nok: 0 }, kpi?.ukupno_kom > 0 ? kpi : null);
  return {
    ok: kval.ok,
    nok: kval.nok,
    merenja: kval.merenja,
    okNakonDorade: kval.okNakonDorade,
    rty: kval.rty,
    dpmo: kval.dpmo,
    p: kval.p,
  };
}

export async function generisiIzvestajSmeneMerljive(supabase, korisnik, smena, C, addToast) {
  return generisiPredajaSmenePdf(supabase, {
    korisnik,
    smena,
    modul: "merljive",
    addToast,
  });
}
