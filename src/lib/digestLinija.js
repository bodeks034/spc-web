/** Filter i ucitavanje linija za smenski digest. */

export function primeniLinijaFilter(query, linija, kolona = "linija") {
  if (!linija) return query;
  if (linija === "(bez linije)") {
    return query.or(`${kolona}.is.null,${kolona}.eq.`);
  }
  return query.eq(kolona, linija);
}

export function primeniPogonFilter(query, pogonKod, kolona = "pogon_kod") {
  const k = String(pogonKod || "").trim().toUpperCase();
  if (!k) return query;
  return query.eq(kolona, k);
}

export async function ucitajLinijeZaDigest(supabase, { datum, smena }) {
  const sm = Number(smena) || 1;
  const set = new Set();
  const [{ data: mer }, { data: atr }] = await Promise.all([
    supabase.from("merenja_varijabilna").select("linija").eq("datum", datum).eq("smena", sm),
    supabase.from("kontrolni_log").select("linija").eq("datum", datum).eq("smena", sm),
  ]);
  for (const r of [...(mer || []), ...(atr || [])]) {
    const l = String(r.linija ?? "").trim();
    set.add(l || "(bez linije)");
  }
  return [...set].sort((a, b) => a.localeCompare(b, "sr"));
}
