/** Veza dimenzija šifrarnika ↔ PFMEA / Control Plan dokumenti. */
import { supabase } from "./supabaseClient.js";
import { normalizujIdDeo } from "./idDeoUtil.js";

export async function fetchPfmeaCpZaDeo(idDeo) {
  const id = normalizujIdDeo(idDeo);
  if (!id) return { pfmea: [], cp: [] };

  const like = `%${id}%`;
  const [pfRes, cpRes, stavPf, stavCp] = await Promise.all([
    supabase.from("pfmea_cp_dokumenti").select("id,tip,naziv,broj_pfmea,broj_control_plan,status").ilike("naziv", like).limit(10),
    supabase.from("pfmea_cp_dokumenti").select("id,tip,naziv,broj_pfmea,broj_control_plan,status").eq("tip", "control_plan").ilike("naziv", like).limit(10),
    supabase.from("pfmea_stavke").select("id,dokument_id,br_dela,mod_greske,proces").ilike("br_dela", like).limit(20),
    supabase.from("control_plan_stavke").select("id,dokument_id,br_dela,karakteristika,proces").ilike("br_dela", like).limit(20),
  ]);

  const docs = new Map();
  for (const r of [...(pfRes.data || []), ...(cpRes.data || [])]) {
    docs.set(r.id, r);
  }

  return {
    pfmea: stavPf.data || [],
    cp: stavCp.data || [],
    dokumenti: [...docs.values()],
    greska: pfRes.error?.message || cpRes.error?.message,
  };
}
