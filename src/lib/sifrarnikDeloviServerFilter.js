/** Server-side filter delova — RPC (82) ili JS fallback sken. */
import { supabase } from "./supabaseClient.js";
import { fetchGlavniUnosBrojeviPoDeo } from "./glavniUnosApi.js";
import {
  fetchGreskeBrojeviPoDeo,
  fetchBarkodProfiliSet,
  statusDeoUSifrarniku,
  deoOdgovaraNedostajeFilter,
  jeDemoIdDeo,
} from "./sifrarnikOdrzavanje.js";

const SKEN_BATCH = 200;

async function fetchDeloviPoRpcFilteru(opts) {
  const args = {
    p_nedostaje: opts.nedostajeFilter || null,
    p_samo_delimicni: !!opts.samoDelimicni,
    p_samo_demo: !!opts.samoDemo,
    p_tip_kontrole: opts.tipKontrole || null,
    p_limit: opts.limit,
    p_offset: opts.offset,
  };
  let { data, error } = await supabase.rpc("sifrarnik_filter_delovi", {
    ...args,
    p_linija: opts.linija || null,
  });
  // Migracija 89 uvodi p_linija; na starijoj bazi probaj bez njega.
  if (error && /p_linija|no function matches/i.test(error.message || "") && !opts.linija) {
    ({ data, error } = await supabase.rpc("sifrarnik_filter_delovi", args));
  }
  if (error) {
    if (/function.*does not exist|could not find|p_linija|no function matches/i.test(error.message)) return null;
    throw error;
  }
  const delovi = (data || []).map((row) => {
    const { status_sifrarnik, gu_broj, gr_broj, ima_barkod, ...d } = row;
    return { ...d, _mv: { status_sifrarnik, gu_broj, gr_broj, ima_barkod } };
  });
  return {
    delovi,
    hasMore: delovi.length >= opts.limit,
    serverFiltered: true,
    viaRpc: true,
  };
}

export async function fetchDeloviPoServerFilteru({
  nedostajeFilter = "",
  samoDemo = false,
  samoDelimicni = false,
  tipKontrole = null,
  linijaKod = null,
  limit = 100,
  offset = 0,
} = {}) {
  const key = String(nedostajeFilter || "").trim();
  const linija = String(linijaKod || "").trim().toUpperCase();
  const trebaFilter = key || samoDemo || samoDelimicni;
  if (!trebaFilter && !linija) return null;

  const rpcRes = await fetchDeloviPoRpcFilteru({
    nedostajeFilter: key,
    samoDemo,
    samoDelimicni,
    tipKontrole,
    linija,
    limit,
    offset,
  });
  if (rpcRes) return rpcRes;

  const [gu, gr, bk] = await Promise.all([
    fetchGlavniUnosBrojeviPoDeo(),
    fetchGreskeBrojeviPoDeo(),
    fetchBarkodProfiliSet(),
  ]);

  const rezultat = [];
  let preskoceno = 0;
  let dbOffset = 0;
  let hasMoreDb = true;

  while (hasMoreDb && rezultat.length < limit) {
    let q = supabase
      .from("delovi")
      .select("id,id_deo,naziv_dela,karakteristika,tip_kontrole,vozilo_katalog_id,sifra_vozila,broj_crteza,revizija,slika_naziv,aktivan,napomena,kom_za_kontrolu,greska_katalog_id,linija_id,masina_id")
      .order("id_deo")
      .range(dbOffset, dbOffset + SKEN_BATCH - 1);
    if (tipKontrole) q = q.eq("tip_kontrole", tipKontrole);
    if (linija) {
      const esc = linija.replace(/,/g, "");
      q = q.or(`vozilo_katalog_id.eq.${esc},sifra_vozila.eq.${esc},id_deo.ilike.${esc}-%`);
    }

    const { data, error } = await q;
    if (error) throw error;
    const batch = data || [];
    if (!batch.length) {
      hasMoreDb = false;
      break;
    }

    for (const d of batch) {
      const id = String(d.id_deo || "").trim().toUpperCase();
      const rowOpts = {
        guBroj: gu[id] || 0,
        greskeBroj: gr[id] || 0,
        imaBarkod: bk.has(id),
      };
      if (samoDemo && !jeDemoIdDeo(d.id_deo)) continue;
      if (samoDelimicni && statusDeoUSifrarniku(d, rowOpts) === "kompletan") continue;
      if (key && !deoOdgovaraNedostajeFilter(d, rowOpts, key)) continue;

      if (preskoceno < offset) {
        preskoceno += 1;
        continue;
      }
      rezultat.push(d);
      if (rezultat.length >= limit) break;
    }

    dbOffset += batch.length;
    if (batch.length < SKEN_BATCH) hasMoreDb = false;
  }

  return {
    delovi: rezultat,
    hasMore: hasMoreDb || rezultat.length >= limit,
    serverFiltered: true,
    viaRpc: false,
  };
}
