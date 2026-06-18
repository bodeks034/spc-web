/** Plan uzorkovanja — cilj prekontrole, ture po broj_merenja, brojač sačuvanih tura (Faza 1). */

import { propagirajMetaKarakteristika, pogonKodKarakteristike } from "./definicijaKarakteristika.js";
import { jeMerljivaKarakteristika } from "./varijabilneUtils.js";
import { ucitajKontrolniPlan } from "./kontrolniPlan.js";

export function datumSrUIso(datum) {
  const m = String(datum || "").match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(datum || ""))) return datum;
  return new Date().toISOString().slice(0, 10);
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

function redoviSerije(karakteristike, idDeo, sifraMerenja, pogonKod) {
  const id = String(idDeo || "").trim().toUpperCase();
  const ab = String(sifraMerenja || "").trim();
  const pogon = String(pogonKod || "").trim().toUpperCase();
  const normalized = propagirajMetaKarakteristika(karakteristike);
  const zaDeo = normalized.filter((k) => String(k.id_deo || "").toUpperCase() === id);
  const multiPogon = deoImaVisePogona(normalized, id);
  const imaPogonSpec = zaDeo.some((k) => pogonKodKarakteristike(k, { multiPogon: true }));

  return zaDeo
    .filter((k) => {
      if (!pogon) return true;
      const pk = pogonKodKarakteristike(k, { multiPogon });
      if (pk) return pk === pogon;
      return !imaPogonSpec && !multiPogon;
    })
    .filter(jeMerljivaKarakteristika)
    .filter((k) => String(k.sifra_merenja || "").trim() === ab)
    .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
}

/** Koliko komada dimenzionalno prekontrolisati (kom_za_kontrolu_n iz šifrarnika). */
export function komZaKontroluZaSeriju(karakteristike, idDeo, sifraMerenja, pogonKod) {
  for (const k of redoviSerije(karakteristike, idDeo, sifraMerenja, pogonKod)) {
    const n = Number(k.kom_za_kontrolu_n);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  return 0;
}

export function izracunajPlanUzorkovanja({ ciljKom, poTuri, uradjeneTure = 0 }) {
  const po = Math.max(1, Number(poTuri) || 5);
  const cilj = Math.max(0, Math.round(Number(ciljKom) || 0));
  const ture = Math.max(0, Math.round(Number(uradjeneTure) || 0));
  const brojTura = cilj > 0 ? Math.ceil(cilj / po) : 0;
  const uradjenoKom = cilj > 0 ? Math.min(cilj, ture * po) : ture * po;
  const turaBroj = brojTura > 0 ? Math.min(brojTura, ture + 1) : ture + 1;
  return {
    ciljKom: cilj,
    poTuri: po,
    brojTura,
    uradjeneTure: ture,
    uradjenoKom,
    turaBroj,
    zavrseno: cilj > 0 && uradjenoKom >= cilj,
  };
}

/** Broj sačuvanih tura danas — jedan KPI unos = jedna tura (kompletna ili prekid). */
export async function brojSacuvanihTura(supabase, {
  datum,
  smena,
  idDeo,
  serija,
  radniNalog,
}) {
  const iso = datumSrUIso(datum);
  let q = supabase
    .from("kpi_unos")
    .select("id", { count: "exact", head: true })
    .eq("modul", "merljive")
    .eq("datum", iso)
    .eq("id_deo", String(idDeo || "").trim().toUpperCase())
    .eq("smena", Number(smena) || 1)
    .eq("serija", String(serija || "").trim());
  if (radniNalog) q = q.eq("radni_nalog", radniNalog);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

export function ucestalostTekst(planRows, idDeo, pogonKod) {
  const id = String(idDeo || "").trim().toUpperCase();
  const pogon = String(pogonKod || "").trim().toUpperCase();
  const rows = (planRows || []).filter((r) => String(r.id_deo || "").toUpperCase() === id);
  if (!rows.length) return "";
  const saPogonom = pogon
    ? rows.filter((r) => !r.pogon_kod || String(r.pogon_kod).toUpperCase() === pogon)
    : rows;
  const pick = saPogonom.find((r) => r.ucestalost) || rows.find((r) => r.ucestalost);
  return String(pick?.ucestalost || "").trim();
}

/** Učitaj plan + brojač tura iz baze. */
export async function ucitajPlanUzorkovanja(supabase, {
  karakteristike,
  idDeo,
  serija,
  pogonKod,
  poTuri,
  datum,
  smena,
  radniNalog,
}) {
  if (!idDeo || !serija) {
    return { plan: null, ucestalost: "" };
  }

  const ciljKom = komZaKontroluZaSeriju(karakteristike, idDeo, serija, pogonKod);
  let uradjeneTure = 0;
  let ucestalost = "";

  try {
    const [ture, planRows] = await Promise.all([
      brojSacuvanihTura(supabase, { datum, smena, idDeo, serija, radniNalog }),
      ucitajKontrolniPlan(supabase, { idDeo }).catch(() => []),
    ]);
    uradjeneTure = ture;
    ucestalost = ucestalostTekst(planRows, idDeo, pogonKod);
  } catch {
    uradjeneTure = 0;
  }

  const plan = izracunajPlanUzorkovanja({
    ciljKom,
    poTuri,
    uradjeneTure,
  });

  return { plan, ucestalost };
}
