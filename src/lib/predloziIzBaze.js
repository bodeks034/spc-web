/**
 * Live učitavanje 8D i PFMEA/CP primera iz Supabase za SPC Asistent.
 * Keš 5 min — popunjeno u aplikaciji odmah utiče na sledeće predloge.
 */

import { supabase } from "./supabaseClient.js";
import { osmdD4uPrimer8d, validirajPrimer8d } from "./troubleshootingPrimeri.js";
import { normalizujPfmeaCpRed } from "./pfmeaControlPlan.js";

const CACHE_TTL_MS = 5 * 60 * 1000;

const PFMEA_DB_KEYS = [
  "br_dela", "proces", "mod_greske", "uzrok_greske", "efekat_greske",
  "s", "uzrok_mehanizam", "o", "postojece_kontrole", "d",
  "rpn_before", "akcija", "odgovorni", "rok", "status", "rpn_after",
  "s_posle", "o_posle", "d_posle", "odobrio", "datum",
  "pfmea_veza", "control_plan_ref",
];

const CP_DB_KEYS = [
  "br_dela", "proces", "karakteristika", "klasifikacija", "nominalna", "tolerancija",
  "metoda", "oprema", "msa", "ucestalost", "velicina_uzoraka",
  "reakcija_nekontrolisano", "reakcija_na_nepravilan_deo", "zapis_forma",
  "pfmea_referenca", "mod_greske_pfmea", "status_cp", "odgovorni",
];

let cache8d = { at: 0, data: [] };
let cachePfmea = { at: 0, pfmea: [], cp: [] };

function stavkaIzDb(row, keys) {
  const out = {};
  for (const k of keys) out[k] = row[k] ?? "";
  return normalizujPfmeaCpRed(out);
}

function istekao(cache) {
  return Date.now() - cache.at >= CACHE_TTL_MS;
}

/** Završeni 8D iz osmd_izvestaji → šabloni za match po defektu. */
export async function ucitajPrimere8dIzBaze(force = false) {
  if (!force && !istekao(cache8d)) return cache8d.data;

  try {
    const { data, error } = await supabase
      .from("osmd_izvestaji")
      .select("id,id_deo,d2_opis_problema,d3_privremena_akcija,d4_uzrok,d5_korektivna,d7_prevencija,status,created_at")
      .not("d4_uzrok", "is", null)
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      console.warn("[predloziIzBaze] 8D:", error.message);
      return cache8d.data;
    }

    const primeri = [];
    const ids = new Set();

    for (const row of data || []) {
      const p = osmdD4uPrimer8d(row);
      if (!p) continue;
      const v = validirajPrimer8d(p, primeri.length);
      if (!v.ok || !v.primer) continue;
      if (ids.has(v.primer.id)) continue;
      ids.add(v.primer.id);
      primeri.push({
        ...v.primer,
        izUvoznogJson: true,
        izBaze: true,
      });
    }

    cache8d = { at: Date.now(), data: primeri };
    return primeri;
  } catch (e) {
    console.warn("[predloziIzBaze] 8D:", e?.message || e);
    return cache8d.data;
  }
}

/** PFMEA i CP redovi iz aktivnih dokumenata u bazi. */
export async function ucitajPfmeaCpRedoveIzBaze(force = false) {
  if (!force && !istekao(cachePfmea)) {
    return { pfmea: cachePfmea.pfmea, cp: cachePfmea.cp };
  }

  try {
    const { data: docs, error: eDoc } = await supabase
      .from("pfmea_cp_dokumenti")
      .select("id")
      .eq("aktivan", true);

    if (eDoc) {
      console.warn("[predloziIzBaze] PFMEA docs:", eDoc.message);
      return { pfmea: cachePfmea.pfmea, cp: cachePfmea.cp };
    }

    const docIds = (docs || []).map((d) => d.id).filter(Boolean);
    if (!docIds.length) {
      cachePfmea = { at: Date.now(), pfmea: [], cp: [] };
      return { pfmea: [], cp: [] };
    }

    const [{ data: pfmea }, { data: cp }] = await Promise.all([
      supabase.from("pfmea_stavke").select("*").in("dokument_id", docIds).order("red_broj").order("id"),
      supabase.from("control_plan_stavke").select("*").in("dokument_id", docIds).order("red_broj").order("id"),
    ]);

    const pfmeaRedovi = (pfmea || []).map((r) => stavkaIzDb(r, PFMEA_DB_KEYS));
    const cpRedovi = (cp || []).map((r) => stavkaIzDb(r, CP_DB_KEYS));

    cachePfmea = { at: Date.now(), pfmea: pfmeaRedovi, cp: cpRedovi };
    return { pfmea: pfmeaRedovi, cp: cpRedovi };
  } catch (e) {
    console.warn("[predloziIzBaze] PFMEA/CP:", e?.message || e);
    return { pfmea: cachePfmea.pfmea, cp: cachePfmea.cp };
  }
}

/** Učitava oba izvora paralelno za asistent. */
export async function ucitajLivePredloge(force = false) {
  const [primere8d, pfmeaCp] = await Promise.all([
    ucitajPrimere8dIzBaze(force),
    ucitajPfmeaCpRedoveIzBaze(force),
  ]);
  return { primere8d, ...pfmeaCp };
}

/** Reset keša posle snimanja 8D ili PFMEA (opciono iz UI). */
export function resetujKešPredloga() {
  cache8d = { at: 0, data: [] };
  cachePfmea = { at: 0, pfmea: [], cp: [] };
}
