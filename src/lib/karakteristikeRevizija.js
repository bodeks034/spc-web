/** Log revizija LSL/USL/nominala za karakteristike_merljive. */

const POLJA = ["lsl", "usl", "nominala", "lsl_text", "usl_text", "jedinica", "naziv_mere"];

export async function ucitajRevizije(supabase, { idDeo, limit = 50 } = {}) {
  let q = supabase.from("karakteristike_revizija")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (idDeo) q = q.eq("id_deo", String(idDeo).toUpperCase());
  const { data, error } = await q;
  return { data: data || [], error };
}

export async function evidentirajReviziju(supabase, {
  karakteristikaId,
  idDeo,
  pozicija,
  polje,
  stara,
  nova,
  radnikId,
  radnikIme,
  napomena,
}) {
  const st = stara == null ? "" : String(stara);
  const nv = nova == null ? "" : String(nova);
  if (st === nv) return { ok: true, preskoceno: true };
  const { error } = await supabase.from("karakteristike_revizija").insert({
    karakteristika_id: karakteristikaId || null,
    id_deo: String(idDeo || "").toUpperCase(),
    pozicija: pozicija || null,
    polje,
    stara_vrednost: st,
    nova_vrednost: nv,
    radnik_id: radnikId || null,
    radnik_ime: radnikIme || null,
    napomena: napomena || null,
  });
  return { ok: !error, error };
}

export async function azurirajKarakteristikuSaRevizijom(supabase, stariRed, izmene, korisnik) {
  const rows = [];
  for (const polje of POLJA) {
    if (!(polje in izmene)) continue;
    rows.push(evidentirajReviziju(supabase, {
      karakteristikaId: stariRed.id,
      idDeo: stariRed.id_deo,
      pozicija: stariRed.pozicija,
      polje,
      stara: stariRed[polje],
      nova: izmene[polje],
      radnikId: korisnik?.radnikId,
      radnikIme: korisnik?.ime,
    }));
  }
  await Promise.all(rows);

  const { error } = await supabase.from("karakteristike_merljive")
    .update(izmene)
    .eq("id", stariRed.id);
  return { ok: !error, error };
}
