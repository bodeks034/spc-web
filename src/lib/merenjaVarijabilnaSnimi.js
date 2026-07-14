/** Pojedinačno snimanje digitalnog merenja u merenja_varijabilna. */

export function buildMerenjeVarijabilnaRow({
  datum,
  smena,
  radniNalog,
  idDeo,
  pogonKod,
  grupaAB,
  kolona,
  merenje,
  status,
  linija,
  kontrolor,
  operater,
  masina,
  radnikId,
  sesijaId,
  foto = null,
  komentar = null,
}) {
  return {
    datum,
    smena: Number(smena) || 1,
    radni_nalog: radniNalog || null,
    id_deo: String(idDeo || "").trim().toUpperCase(),
    pogon_kod: pogonKod || null,
    karakteristika_id: kolona.id,
    sifra_merenja: grupaAB,
    pozicija: kolona.naziv,
    vrednost_raw: merenje.raw,
    vrednost_dec: merenje.dec,
    status,
    linija: linija || null,
    kontrolor: kontrolor || null,
    operater: operater || "",
    merni_instrument: kolona.instrument || null,
    masina: masina || null,
    radnik_id: radnikId || null,
    foto: status === "NOK" ? foto : null,
    komentar: status === "NOK" ? komentar : null,
    sesija_id: sesijaId,
  };
}

export async function snimiJednoMerenjeVarijabilno(supabase, row) {
  const { data, error } = await supabase
    .from("merenja_varijabilna")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}
