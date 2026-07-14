/** Mapa pogon / linija / deo — jedan izvor za šifrarnik i tablet. */



import { supabase } from "./supabaseClient.js";



/** Delovi za dati pogon iz atributivnih redova. */

export function deloviPoPogonu(atributivniPogoni = [], pogonKod) {

  const pk = String(pogonKod || "").trim().toUpperCase();

  if (!pk) return [];

  const mapa = new Map();

  for (const r of atributivniPogoni) {

    if (String(r.pogon_kod || "").toUpperCase() !== pk || !r.id_deo) continue;

    if (!mapa.has(r.id_deo)) {

      mapa.set(r.id_deo, {

        id_deo: r.id_deo,

        naziv_dela: r.naziv_dela || r.id_deo,

        pogon_kod: pk,

        linija_id: r.linija_id ?? null,

      });

    }

  }

  return [...mapa.values()].sort((a, b) => String(a.id_deo).localeCompare(String(b.id_deo)));

}



/** Delovi za liniju_id (master delovi tabela). */

export function deloviPoLinijiId(sviDelovi = [], linijaId) {

  const lid = Number(linijaId);

  if (!Number.isFinite(lid)) return [];

  return (sviDelovi || [])

    .filter((d) => Number(d.linija_id) === lid && d.aktivan !== false)

    .map((d) => ({ id_deo: d.id_deo, naziv_dela: d.naziv_dela || d.id_deo, linija_id: lid }));

}



const POGON_STORAGE_KEY = "spc_tablet_pogon";



export function sacuvajTabletPogon(pogonKod) {

  const pk = String(pogonKod || "").trim().toUpperCase();

  if (!pk) return;

  try {

    sessionStorage.setItem(POGON_STORAGE_KEY, pk);

  } catch { /* */ }

}



export function procitajTabletPogon() {

  try {

    return sessionStorage.getItem(POGON_STORAGE_KEY) || "";

  } catch {

    return "";

  }

}



/** Učitaj celu mapu pogon ↔ linija ↔ delovi za šifrarnik pregled. */

export async function fetchLinijaDeoMapa(sb = supabase) {

  const [mapaRes, pogonRes, deloviRes, linijeRes] = await Promise.all([

    sb.from("pogon_linija_mapa").select("linija_faza,linija_id,pogon_kod").order("pogon_kod"),

    sb.from("delovi_atributivni_pogon").select("id_deo,naziv_dela,pogon_kod,linija_id,aktivan").eq("aktivan", true),

    sb.from("delovi").select("id_deo,naziv_dela,linija_id,aktivan").eq("aktivan", true),

    sb.from("linije").select("id,linija"),

  ]);



  const linijePoId = new Map((linijeRes.data || []).map((l) => [l.id, l.linija]));

  const deloviPoPogonuMap = new Map();



  for (const r of pogonRes.data || []) {

    const pk = String(r.pogon_kod || "").toUpperCase();

    if (!pk) continue;

    if (!deloviPoPogonuMap.has(pk)) deloviPoPogonuMap.set(pk, new Set());

    deloviPoPogonuMap.get(pk).add(r.id_deo);

  }



  const redovi = (mapaRes.data || []).map((m) => {

    const pk = String(m.pogon_kod || "").toUpperCase();

    const dela = deloviPoPogonuMap.get(pk) || new Set();

    const primer = [...dela].slice(0, 3).join(", ");

    return {

      linija_faza: m.linija_faza,

      linija_id: m.linija_id,

      pogon_kod: pk,

      linija_naziv: m.linija_id != null ? (linijePoId.get(m.linija_id) || "—") : "—",

      broj_delova: dela.size,

      primer_delova: primer || "—",

    };

  });



  const nepovezani = [];

  for (const [pk, set] of deloviPoPogonuMap) {

    if (!redovi.some((r) => r.pogon_kod === pk)) {

      nepovezani.push({

        linija_faza: "—",

        linija_id: null,

        pogon_kod: pk,

        linija_naziv: "—",

        broj_delova: set.size,

        primer_delova: [...set].slice(0, 3).join(", ") || "—",

        upozorenje: "Nema reda u pogon_linija_mapa",

      });

    }

  }



  return {

    redovi: [...redovi, ...nepovezani].sort((a, b) => a.pogon_kod.localeCompare(b.pogon_kod)),

    ukupnoPogona: redovi.length + nepovezani.length,

    ukupnoDelova: (deloviRes.data || []).length,

  };

}



/** Predlozi delova za tablet — prioritet: izabrani pogon, pa poslednji pogon, pa svi za pogon. */

export function predloziDelovaZaTablet({

  atributivniPogoni = [],

  pogonKod = "",

  limit = 40,

} = {}) {

  const pk = String(pogonKod || procitajTabletPogon() || "").trim().toUpperCase();

  const lista = pk ? deloviPoPogonu(atributivniPogoni, pk) : [];

  return lista.slice(0, limit);

}


