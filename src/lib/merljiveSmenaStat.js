import { calcDPMO, calcRTY } from "./spcStats.js";
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
  return {
    ok, nok, merenja: n,
    rty: calcRTY(ok, n),
    dpmo: calcDPMO(nok, n),
    p: n > 0 ? +((nok / n) * 100).toFixed(2) : 0,
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
