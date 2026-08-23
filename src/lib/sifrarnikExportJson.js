/** JSON export kompletnog dela iz šifrarnika. */
import { supabase } from "./supabaseClient.js";
import { normalizujIdDeo } from "./idDeoUtil.js";
import { fetchGlavniUnosRedoviZaDeo } from "./glavniUnosApi.js";

export async function exportujDeoJson(idDeo) {
  const id = normalizujIdDeo(idDeo);
  if (!id) throw new Error("ID dela je obavezan");

  const [deoRes, gu, dim, gr, bk] = await Promise.all([
    supabase.from("delovi").select("*").eq("id_deo", id).maybeSingle(),
    fetchGlavniUnosRedoviZaDeo(id),
    supabase.from("karakteristike_merljive").select("*").eq("id_deo", id).limit(2000),
    supabase.from("greske_katalog").select("*").eq("id_deo", id).limit(500),
    supabase.from("barkod_profili").select("*").eq("id_deo", id).maybeSingle(),
  ]);

  if (deoRes.error) throw deoRes.error;
  if (dim.error) throw dim.error;
  if (gr.error) throw gr.error;
  if (bk.error) throw bk.error;

  return {
    exported_at: new Date().toISOString(),
    id_deo: id,
    deo: deoRes.data,
    glavni_unos: gu || [],
    karakteristike_merljive: dim.data || [],
    greske_katalog: gr.data || [],
    barkod_profil: bk.data || null,
  };
}

export function preuzmiDeoJson(payload, idDeo) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sifrarnik_${idDeo}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
