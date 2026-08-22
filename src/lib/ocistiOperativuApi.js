/** Admin poziv RPC za čišćenje operativnih podataka (šifrarnik ostaje). */
import { supabase } from "./supabaseClient.js";

const POTVRDA = "OCISTI_OPERATIVU";

export async function ocistiOperativuPreGoLive({ zadrziQms = false } = {}) {
  const { data, error } = await supabase.rpc("ocisti_operativu_pre_go_live", {
    p_zadrzi_qms: !!zadrziQms,
    p_potvrdi: POTVRDA,
  });
  if (error) throw error;
  if (data && data.ok === false) {
    throw new Error(data.poruka || "Čišćenje nije uspelo.");
  }
  return data || { ok: true };
}

export async function pregledOperativnihBrojeva() {
  const tabele = [
    "merenja_varijabilna",
    "kontrolni_log",
    "kpi_unos",
    "fai_unosi",
    "ncr_capa",
    "spc_alarmi",
  ];
  const brojevi = {};
  await Promise.all(tabele.map(async (t) => {
    try {
      const { count, error } = await supabase.from(t).select("*", { count: "exact", head: true });
      if (!error) brojevi[t] = count || 0;
    } catch {
      brojevi[t] = null;
    }
  }));
  return brojevi;
}

export { POTVRDA };
