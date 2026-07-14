/** Pogon ↔ linija mapa — bez xlsx zavisnosti (brži učitavanje modula). */

import { supabase } from "./supabaseClient.js";

function greskaNedostaje(error) {
  const m = (error?.message || "").toLowerCase();
  return m.includes("does not exist") || m.includes("could not find") || error?.code === "42P01";
}

export async function fetchPogonLinijaMapa() {
  const { data, error } = await supabase.from("pogon_linija_mapa").select("*").order("linija_faza");
  if (error) {
    if (greskaNedostaje(error)) return [];
    throw error;
  }
  return data || [];
}

export async function upsertPogonLinijaMapa(rows) {
  const payload = (rows || []).map((r) => ({
    linija_faza: String(r.linija_faza || "").trim(),
    linija_id: r.linija_id != null && r.linija_id !== "" ? Number(r.linija_id) : null,
    pogon_kod: String(r.pogon_kod || "").trim().toUpperCase(),
    updated_at: new Date().toISOString(),
  })).filter((r) => r.linija_faza);
  if (!payload.length) return [];
  const { data, error } = await supabase.from("pogon_linija_mapa")
    .upsert(payload, { onConflict: "linija_faza" })
    .select("*");
  if (error) throw error;
  return data || [];
}

export async function obrisiPogonLinijaMapa(linijaFaza) {
  const { error } = await supabase.from("pogon_linija_mapa")
    .delete()
    .eq("linija_faza", linijaFaza);
  if (error) throw error;
}
