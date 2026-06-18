/** Zapis ERP uvoza u tabelu erp_uvoz_log (cron + UI). */

export async function upisiErpUvozLog(supabase, payload) {
  const row = {
    izvor: payload.izvor || "cron",
    fajl: payload.fajl || null,
    ukupno_redova: payload.ukupno ?? 0,
    validnih: payload.validnih ?? 0,
    upsertovano: payload.upsertovano ?? 0,
    aktivnih: payload.aktivnih ?? 0,
    upozorenja: payload.upozorenja ?? 0,
    uspeh: payload.uspeh !== false,
    greska: payload.greska || null,
    detalj: payload.detalj || null,
  };

  const { data, error } = await supabase
    .from("erp_uvoz_log")
    .insert(row)
    .select("id,created_at")
    .single();

  if (error) return { ok: false, error };
  return { ok: true, id: data?.id, created_at: data?.created_at };
}

export function formatErpUvozVreme(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("sr-RS", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
