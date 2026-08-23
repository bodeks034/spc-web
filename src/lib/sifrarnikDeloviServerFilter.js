/** Server-side sken delova po filteru „nedostaje“ — puni stranice bez učitavanja cele baze u memoriju. */
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

export async function fetchDeloviPoServerFilteru({
  nedostajeFilter = "",
  samoDemo = false,
  samoDelimicni = false,
  tipKontrole = null,
  limit = 100,
  offset = 0,
} = {}) {
  const key = String(nedostajeFilter || "").trim();
  const trebaFilter = key || samoDemo || samoDelimicni;
  if (!trebaFilter) return null;

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

    const { data, error } = await q;
    if (error) throw error;
    const batch = data || [];
    if (!batch.length) {
      hasMoreDb = false;
      break;
    }

    for (const d of batch) {
      const id = String(d.id_deo || "").trim().toUpperCase();
      const opts = {
        guBroj: gu[id] || 0,
        greskeBroj: gr[id] || 0,
        imaBarkod: bk.has(id),
      };
      if (samoDemo && !jeDemoIdDeo(d.id_deo)) continue;
      if (samoDelimicni && statusDeoUSifrarniku(d, opts) === "kompletan") continue;
      if (!deoOdgovaraNedostajeFilter(d, opts, key)) continue;

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
  };
}
