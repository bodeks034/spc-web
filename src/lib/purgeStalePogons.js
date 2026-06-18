/**
 * Briše SOP / karakteristike / atributivni pogon za pogone koji više nisu u uvozu.
 * Upsert samo dodaje/menja — bez ovoga ostaju fantomi (npr. Preseraj B za 5502-A).
 */
import { resolvePogonKod } from "./syncSifrarnikIzMerljivih.js";

function normId(v) {
  return String(v ?? "").trim().toUpperCase();
}

function normPogon(v) {
  return String(v ?? "").trim().toUpperCase() || "A";
}

/** id_deo → Set validnih pogona iz redova karakteristika (posle resolvePogonKod). */
export function pogoniValidniPoDeluIzKarRows(karRows) {
  const map = new Map();
  for (const r of karRows || []) {
    const id = normId(r.id_deo);
    if (!id) continue;
    const pk = resolvePogonKod(r);
    if (!pk) continue;
    if (!map.has(id)) map.set(id, new Set());
    map.get(id).add(pk);
  }
  return map;
}

async function pogoniUTabeli(supabase, table, idDeo) {
  const { data, error } = await supabase
    .from(table)
    .select("pogon_kod")
    .eq("id_deo", idDeo);
  if (error) throw new Error(`${table}: ${error.message}`);
  return [...new Set((data || []).map((r) => normPogon(r.pogon_kod)))];
}

async function obrisiPogon(supabase, table, idDeo, pogon) {
  const { error, count } = await supabase
    .from(table)
    .delete({ count: "exact" })
    .eq("id_deo", idDeo)
    .eq("pogon_kod", pogon);
  if (error) throw new Error(`${table} delete ${idDeo}/${pogon}: ${error.message}`);
  return count || 0;
}

const TABELE_ZA_CISCENJE = [
  "karakteristike_merljive",
  "sop_deo_varijabilni",
  "delovi_atributivni_pogon",
];

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} idDeos
 * @param {object[]} karRows — novi uvoz (izvor istine)
 */
export async function purgeStalePogonsForDelove(supabase, idDeos, karRows) {
  const ids = [...new Set((idDeos || []).map(normId).filter(Boolean))];
  const validPoDelu = pogoniValidniPoDeluIzKarRows(karRows);
  const detail = [];
  let total = 0;

  for (const id of ids) {
    const valid = validPoDelu.get(id);
    if (!valid?.size) continue;

    for (const table of TABELE_ZA_CISCENJE) {
      const uBazi = await pogoniUTabeli(supabase, table, id);
      for (const pogon of uBazi) {
        if (valid.has(pogon)) continue;
        const n = await obrisiPogon(supabase, table, id, pogon);
        if (n > 0) {
          total += n;
          detail.push({ id_deo: id, table, pogon_kod: pogon, deleted: n });
        }
      }
    }
  }

  return { total, detail };
}
