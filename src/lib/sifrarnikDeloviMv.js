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

/** Stariji RPC (migracija 86) ne poznaje p_linija — prepoznaj to i probaj bez njega. */
function nemaParametarLinija(err) {
  return err && /p_linija|without parameters|no function matches/i.test(err.message || "");
}

export async function fetchDeloviSaMv({ tipKontrole = null, linijaKod = null, limit = 100, offset = 0 } = {}) {
  const linija = String(linijaKod || "").trim().toUpperCase() || null;
  const args = { p_tip_kontrole: tipKontrole, p_limit: limit, p_offset: offset };

  let { data, error } = await supabase.rpc("sifrarnik_lista_delovi", { ...args, p_linija: linija });
  if (error && nemaParametarLinija(error) && !linija) {
    ({ data, error } = await supabase.rpc("sifrarnik_lista_delovi", args));
  }
  if (!error) {
    const delovi = (data || []).map(mapDeoRed);
    return { delovi, viaMv: true, hasMore: delovi.length >= limit };
  }
  if (!rpcNedostaje(error) && !nemaParametarLinija(error)) throw error;

  const delovi = await fetchDelovi({ tipKontrole, linijaKod: linija, limit, offset });
  return { delovi, viaMv: false, hasMore: delovi.length >= limit };
}

export async function pretraziDeloviSaMv({ q, tipKontrole = null, linijaKod = null, limit = 100, offset = 0 } = {}) {
  const tekst = String(q || "").trim();
  const linija = String(linijaKod || "").trim().toUpperCase() || null;
  if (!tekst) return fetchDeloviSaMv({ tipKontrole, linijaKod: linija, limit, offset });

  const args = { p_q: tekst, p_tip_kontrole: tipKontrole, p_limit: limit, p_offset: offset };

  let { data, error } = await supabase.rpc("sifrarnik_pretrazi_delovi", { ...args, p_linija: linija });
  if (error && nemaParametarLinija(error) && !linija) {
    ({ data, error } = await supabase.rpc("sifrarnik_pretrazi_delovi", args));
  }
  if (!error) {
    const delovi = (data || []).map(mapDeoRed);
    return { delovi, viaMv: true, hasMore: delovi.length >= limit };
  }
  if (!rpcNedostaje(error) && !nemaParametarLinija(error)) throw error;

  // Fallback bez MV-a: pretraga u okviru linije se radi na klijentu.
  const delovi = await fetchDelovi({ tipKontrole, linijaKod: linija, limit: Math.max(limit * 3, 300), offset: 0 });
  const qLower = tekst.toLowerCase();
  const filtrirani = delovi.filter((d) =>
    [d.id_deo, d.naziv_dela, d.karakteristika, d.vozilo_katalog_id, d.sifra_vozila, d.broj_crteza]
      .some((s) => String(s || "").toLowerCase().includes(qLower)),
  );
  const page = filtrirani.slice(offset, offset + limit);
  return { delovi: page, viaMv: false, hasMore: offset + page.length < filtrirani.length };
}

export async function countDeloviSaMv({ tipKontrole = null, linijaKod = null, q = null } = {}) {
  const { data, error } = await supabase.rpc("sifrarnik_broj_delovi", {
    p_tip_kontrole: tipKontrole,
    p_linija: String(linijaKod || "").trim().toUpperCase() || null,
    p_q: String(q || "").trim() || null,
  });
  if (!error && data != null) return Number(data) || 0;
  if (error && !rpcNedostaje(error)) throw error;
  return countDelovi({ tipKontrole, linijaKod, samoAktivni: true });
}

/** Osvežava MV ako je triger (migracija 89) označio promenu. Tiho ako RPC ne postoji. */
export async function osveziMvAkoTreba() {
  const { data, error } = await supabase.rpc("osvezi_sifrarnik_mv_ako_treba", { p_min_sekundi: 20 });
  if (error) {
    if (rpcNedostaje(error)) return null;
    throw error;
  }
  return data || null;
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
