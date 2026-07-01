/** CRUD za sifrarnik_liste_vrednosti (dropdown liste). */

import { supabase } from "./supabaseClient.js";

function greskaNedostaje(error) {
  const m = (error?.message || "").toLowerCase();
  return m.includes("does not exist") || m.includes("could not find") || error?.code === "42P01";
}

export const LISTE_KLJUCEVI = [
  { id: "karakteristika", naziv: "Karakteristike (dimenzije)", uputstvo: "Nazivi dimenzija u glavnom unosu. Dodaj nove pre unosa dela ili uvezi iz glavni unos.xlsx." },
  { id: "reakcioni_plan", naziv: "Reakcioni plan (legacy)", uputstvo: "Stare akcije iz Excela. Novi matrični plan: Merljive → SPC Karte → tab Reakcioni plan." },
  { id: "instrument", naziv: "Instrument / metoda", uputstvo: "Merni instrument ili vizuelna metoda." },
  { id: "jedinica", naziv: "Jedinica mere", uputstvo: "mm, µm, deg, % …" },
];

/** Fiksne liste — ne idu u bazu. */
export const KLASE_FIKSNE = ["Critical", "Major", "Minor"];
export const TIPOVI_FIKSNI = ["Merljiva", "Atributivna"];

export async function fetchListeVrednosti(kljuc = null) {
  let q = supabase.from("sifrarnik_liste_vrednosti")
    .select("*")
    .eq("aktivna", true)
    .order("redosled")
    .order("vrednost");
  if (kljuc) q = q.eq("lista_kljuc", kljuc);
  const { data, error } = await q;
  if (error) {
    if (greskaNedostaje(error)) return [];
    throw error;
  }
  return data || [];
}

export async function dodajListuVrednost({ lista_kljuc, vrednost, redosled = 0 }) {
  const payload = {
    lista_kljuc: String(lista_kljuc || "").trim(),
    vrednost: String(vrednost || "").trim(),
    redosled: Number(redosled) || 0,
    aktivna: true,
    updated_at: new Date().toISOString(),
  };
  if (!payload.lista_kljuc || !payload.vrednost) {
    throw new Error("Lista i vrednost su obavezni");
  }
  const { data, error } = await supabase.from("sifrarnik_liste_vrednosti")
    .upsert(payload, { onConflict: "lista_kljuc,vrednost" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function obrisiListuVrednost(id) {
  const { error } = await supabase.from("sifrarnik_liste_vrednosti").delete().eq("id", id);
  if (error) throw error;
}

export async function deaktivirajListuVrednost(id) {
  const { error } = await supabase.from("sifrarnik_liste_vrednosti")
    .update({ aktivna: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Grupisano po ključu → niz stringova. */
export function grupisiListePoKljucu(rows) {
  const out = {};
  for (const r of rows || []) {
    if (!out[r.lista_kljuc]) out[r.lista_kljuc] = [];
    out[r.lista_kljuc].push(r.vrednost);
  }
  return out;
}
