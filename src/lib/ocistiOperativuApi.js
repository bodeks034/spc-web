/** Admin poziv za čišćenje operativnih podataka (šifrarnik ostaje). */
import { supabase } from "./supabaseClient.js";

const POTVRDA = "OCISTI_OPERATIVU";

async function ocistiPrekoApi({ zadrziQms, accessToken }) {
  const res = await fetch("/api/admin-ocisti-operativu", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ potvrdi: "OCISTI", zadrziQms: !!zadrziQms }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.ok !== false) return data;
  const err = data.error || data.poruka || `HTTP ${res.status}`;
  throw new Error(err);
}

async function ocistiPrekoRpc({ zadrziQms }) {
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

export async function ocistiOperativuPreGoLive({ zadrziQms = false, accessToken } = {}) {
  let token = accessToken;
  if (!token) {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  }

  if (token) {
    try {
      return await ocistiPrekoApi({ zadrziQms, accessToken: token });
    } catch (e) {
      const msg = e.message || "";
      if (!/Unauthorized|404|Failed to fetch|NetworkError|DATABASE_URL|SUPABASE_DB_URL/i.test(msg)) {
        throw e;
      }
    }
  }

  return ocistiPrekoRpc({ zadrziQms });
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
