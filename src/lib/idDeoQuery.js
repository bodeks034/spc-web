/**
 * Robustno učitavanje redova po id_deo (Excel često unese „–“ umesto „-“).
 */
import { normalizujIdDeo, idDeoPoklapaSe } from "./idDeoUtil.js";

function primeniOrder(q, order = []) {
  let out = q;
  for (const item of order) {
    if (Array.isArray(item)) {
      const [col, opts] = item;
      out = out.order(col, opts);
    } else {
      out = out.order(item);
    }
  }
  return out;
}

/**
 * Pronađi redove u tabeli za ID dela — eq, pa ilike, pa fuzzy po sufiksu.
 */
export async function ucitajRedovePoIdDeo(
  supabase,
  table,
  idDeo,
  { select = "*", order = [], limit = 500 } = {},
) {
  const norm = normalizujIdDeo(idDeo);
  if (!norm || !table) return [];

  const run = async (build) => {
    let q = supabase.from(table).select(select);
    q = build(q);
    q = primeniOrder(q, order);
    const { data, error } = await q.limit(limit);
    if (error) throw error;
    return data || [];
  };

  let rows = await run((q) => q.eq("id_deo", norm));
  if (rows.length) return rows;

  rows = await run((q) => q.ilike("id_deo", norm));
  const poNorm = rows.filter((r) => idDeoPoklapaSe(r.id_deo, norm));
  if (poNorm.length) return poNorm;

  rows = await run((q) => q.ilike("id_deo", `%${norm}%`));
  const poPunom = rows.filter((r) => idDeoPoklapaSe(r.id_deo, norm));
  if (poPunom.length) return poPunom;

  const suf = norm.split("-").filter(Boolean).pop();
  if (suf && suf.length >= 1) {
    rows = await run((q) => q.ilike("id_deo", `%${suf}%`));
    const fuzzy = rows.filter((r) => idDeoPoklapaSe(r.id_deo, norm));
    if (fuzzy.length) return fuzzy;
  }

  return [];
}
