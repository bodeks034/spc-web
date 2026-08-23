/** Procena delova bez GU posle ERP uvoza (dry-run / preview). */
import { supabase } from "./supabaseClient.js";
import { fetchGlavniUnosBrojeviPoDeo } from "./glavniUnosApi.js";
import { SIFRARNIK_STATUS_SCAN_LIMIT, metaSkenaStatusa } from "./sifrarnikOdrzavanje.js";

function normId(id) {
  return String(id || "").trim().toUpperCase();
}

/** @param {string[]} noviIdDeoLista — ID delova iz ERP CSV preview-a */
export async function proceniDeloviBezGuPosleErp(noviIdDeoLista = []) {
  const gu = await fetchGlavniUnosBrojeviPoDeo();

  const [countRes, deloviRes] = await Promise.all([
    supabase.from("delovi").select("*", { count: "exact", head: true }).eq("aktivan", true),
    supabase.from("delovi").select("id_deo").eq("aktivan", true).limit(SIFRARNIK_STATUS_SCAN_LIMIT),
  ]);
  if (deloviRes.error) throw deloviRes.error;
  const ukupnoAktivnih = countRes.count || 0;

  const svi = new Set([
    ...(deloviRes.data || []).map((d) => normId(d.id_deo)).filter(Boolean),
    ...(noviIdDeoLista || []).map(normId).filter(Boolean),
  ]);

  const bezGu = [...svi].filter((id) => !(gu[id] > 0)).sort();
  return {
    broj: bezGu.length,
    primer: bezGu.slice(0, 10),
    ids: bezGu,
    ...metaSkenaStatusa(Math.min(ukupnoAktivnih, SIFRARNIK_STATUS_SCAN_LIMIT), ukupnoAktivnih),
  };
}

/** Izvuci id_deo iz ERP preview stavke (delovi entitet). */
export function idDeoIzErpPreviewStavke(stavka) {
  if (!stavka || stavka.entitet !== "delovi") return [];
  const ids = new Set();
  for (const row of stavka.primer || []) {
    const id = normId(row.id_deo || row.ID_DEO || row.matnr || row.MATNR);
    if (id) ids.add(id);
  }
  if (!ids.size && stavka.validnih > 0 && stavka.text) {
    const lines = String(stavka.text).split(/\r?\n/).slice(1, 200);
    for (const line of lines) {
      const col = line.split(/[;,|\t]/)[0]?.trim();
      const id = normId(col);
      if (id && id.length >= 3) ids.add(id);
    }
  }
  return [...ids];
}
