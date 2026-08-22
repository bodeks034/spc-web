/** Pregled i audit šifrarnika — duplikati, status dela. */
import { supabase } from "./supabaseClient.js";

export async function fetchDuplikatiKarakteristike({ limit = 5000 } = {}) {
  const { data, error } = await supabase
    .from("karakteristike_merljive")
    .select("id, id_deo, pogon_kod, pozicija, sifra_merenja, naziv_mere")
    .limit(limit);
  if (error) throw error;

  const grupe = new Map();
  for (const r of data || []) {
    const idDeo = String(r.id_deo || "").trim().toUpperCase();
    const pogon = String(r.pogon_kod || "").trim().toUpperCase();
    const poz = String(r.pozicija || r.sifra_merenja || "").trim().toUpperCase();
    if (!idDeo || !pogon || !poz) continue;
    const kljuc = `${idDeo}|${pogon}|${poz}`;
    if (!grupe.has(kljuc)) grupe.set(kljuc, []);
    grupe.get(kljuc).push(r);
  }

  return [...grupe.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([kljuc, rows]) => {
      const [idDeo, pogon, poz] = kljuc.split("|");
      return { idDeo, pogon, pozicija: poz, broj: rows.length, ids: rows.map((x) => x.id) };
    })
    .sort((a, b) => b.broj - a.broj || a.idDeo.localeCompare(b.idDeo));
}

export async function fetchGreskeBrojeviPoDeo() {
  const { data, error } = await supabase.from("greske_katalog").select("id_deo").limit(20000);
  if (error) throw error;
  const map = {};
  for (const r of data || []) {
    const id = String(r.id_deo || "").trim().toUpperCase();
    if (!id) continue;
    map[id] = (map[id] || 0) + 1;
  }
  return map;
}

export async function fetchBarkodProfiliSet() {
  const { data, error } = await supabase.from("barkod_profili").select("id_deo").limit(10000);
  if (error) {
    if (/does not exist|relation/i.test(error.message)) return new Set();
    throw error;
  }
  return new Set((data || []).map((r) => String(r.id_deo || "").trim().toUpperCase()).filter(Boolean));
}

/** @returns {'kompletan'|'delimicno'|'samo_master'} */
export function statusDeoUSifrarniku(deo, { guBroj = 0, greskeBroj = 0, imaBarkod = false } = {}) {
  const id = String(deo?.id_deo || "").trim();
  if (!id) return "samo_master";
  const imaCrtez = !!String(deo?.slika_naziv || "").trim();
  const imaGu = guBroj > 0;
  const imaGreske = greskeBroj > 0;
  const atrOk = imaGreske && imaCrtez;
  const barkodOk = imaBarkod;
  if (atrOk && (imaGu || barkodOk)) return "kompletan";
  if (imaGu || imaGreske || imaCrtez) return "delimicno";
  return "samo_master";
}

export const STATUS_DEO_LABEL = {
  kompletan: { label: "Kompletan", boja: "zelena" },
  delimicno: { label: "Delimično", boja: "narandzasta" },
  samo_master: { label: "Samo master", boja: "sivi" },
};
