/** Delovi pregled i statistika preko MV (10k+), sa fallback na legacy. */
import { supabase } from "./supabaseClient.js";
import { fetchDelovi, countDelovi } from "./sifrarnikApi.js";
import { statusDeoUSifrarniku, nedostajeZaDeo, koraciNavigacijeIzStatusDeo } from "./sifrarnikOdrzavanje.js";

function rpcNedostaje(err) {
  return err && /function.*does not exist|could not find|mv_delovi_sifrarnik/i.test(err.message || "");
}

export function optsIzMvReda(row) {
  return {
    guBroj: row?.gu_broj ?? 0,
    greskeBroj: row?.gr_broj ?? 0,
    imaBarkod: !!row?.ima_barkod,
  };
}

export function statusIzMvReda(row) {
  if (row?.status_sifrarnik) return row.status_sifrarnik;
  return statusDeoUSifrarniku(row, optsIzMvReda(row));
}

function mapDeoRed(r) {
  const { status_sifrarnik, gu_broj, gr_broj, ima_barkod, ...deo } = r;
  return {
    ...deo,
    _mv: { status_sifrarnik, gu_broj, gr_broj, ima_barkod },
  };
}

export async function fetchDeloviSaMv({ tipKontrole = null, limit = 100, offset = 0 } = {}) {
  const { data, error } = await supabase.rpc("sifrarnik_lista_delovi", {
    p_tip_kontrole: tipKontrole,
    p_limit: limit,
    p_offset: offset,
  });
  if (!error) {
    const delovi = (data || []).map(mapDeoRed);
    return { delovi, viaMv: true, hasMore: delovi.length >= limit };
  }
  if (!rpcNedostaje(error)) throw error;
  const delovi = await fetchDelovi({ tipKontrole, limit, offset });
  return { delovi, viaMv: false, hasMore: delovi.length >= limit };
}

export async function pretraziDeloviSaMv({ q, tipKontrole = null, limit = 100, offset = 0 } = {}) {
  const tekst = String(q || "").trim();
  if (!tekst) return fetchDeloviSaMv({ tipKontrole, limit, offset });

  const { data, error } = await supabase.rpc("sifrarnik_pretrazi_delovi", {
    p_q: tekst,
    p_tip_kontrole: tipKontrole,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    if (rpcNedostaje(error)) return { delovi: [], viaMv: false, hasMore: false };
    throw error;
  }
  const delovi = (data || []).map(mapDeoRed);
  return { delovi, viaMv: true, hasMore: delovi.length >= limit };
}

export async function countDeloviSaMv({ tipKontrole = null } = {}) {
  let q = supabase.from("delovi").select("*", { count: "exact", head: true }).eq("aktivan", true);
  if (tipKontrole) q = q.eq("tip_kontrole", tipKontrole);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

export async function fetchKompletnostIzMv() {
  const { data, error } = await supabase.rpc("sifrarnik_kompletnost_stat");
  if (!error && data?.[0]) {
    const r = data[0];
    return {
      ukupno: Number(r.ukupno) || 0,
      kompletno: Number(r.kompletno) || 0,
      delimicno: Number(r.delimicno) || 0,
      samoMaster: Number(r.samo_master) || 0,
      procenat: Number(r.procenat) || 0,
      skenirano: Number(r.ukupno) || 0,
      ukupnoAktivnih: Number(r.ukupno) || 0,
      truncated: false,
      viaMv: true,
    };
  }
  if (error && !rpcNedostaje(error)) throw error;
  return null;
}

export async function fetchDuplikatiIzMv({ limit = 100 } = {}) {
  const { data, error } = await supabase.rpc("sifrarnik_duplikati_dimenzija", { p_limit: limit });
  if (error) {
    if (rpcNedostaje(error)) return null;
    throw error;
  }
  return (data || []).map((d) => ({
    idDeo: d.id_deo,
    pogon: d.pogon,
    pozicija: d.pozicija,
    broj: d.broj,
    ids: d.ids || [],
  }));
}

export async function fetchSpremniBatchIzMv() {
  const ids = [];
  let offset = 0;
  const limit = 2000;
  for (;;) {
    const { data, error } = await supabase.rpc("sifrarnik_spremni_batch", { p_limit: limit, p_offset: offset });
    if (error) {
      if (rpcNedostaje(error)) return null;
      throw error;
    }
    const batch = data || [];
    for (const r of batch) {
      const id = String(r.id_deo || "").trim().toUpperCase();
      if (id) ids.push(id);
    }
    if (batch.length < limit) break;
    offset += limit;
  }
  return ids;
}

/** Stavke sa statusom iz MV (bez 2k limita na ukupan broj u statistici). */
export async function fetchDelimicniIzMv({ limit = 500, offset = 0 } = {}) {
  const { data, error } = await supabase.rpc("sifrarnik_filter_delovi", {
    p_nedostaje: null,
    p_samo_delimicni: true,
    p_samo_demo: false,
    p_tip_kontrole: null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    if (rpcNedostaje(error)) return null;
    throw error;
  }
  return (data || []).map((row) => {
    const deo = mapDeoRed(row);
    const opts = optsIzMvReda(row);
    const status = statusIzMvReda(row);
    return {
      deo,
      status,
      opts,
      nedostaje: nedostajeZaDeo(deo, opts),
      koraci: koraciNavigacijeIzStatusDeo(deo, opts),
    };
  });
}

export async function fetchDeloviSaStatusomPaginirano({ limit = 500, offset = 0 } = {}) {
  const { data, error } = await supabase.rpc("sifrarnik_lista_delovi", {
    p_tip_kontrole: null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) {
    if (rpcNedostaje(error)) return null;
    throw error;
  }
  return (data || []).map((row) => {
    const deo = mapDeoRed(row);
    const opts = optsIzMvReda(row);
    const status = statusIzMvReda(row);
    return {
      deo,
      status,
      opts,
      nedostaje: nedostajeZaDeo(deo, opts),
      koraci: koraciNavigacijeIzStatusDeo(deo, opts),
    };
  });
}
