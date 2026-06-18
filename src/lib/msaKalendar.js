/** MSA kalendar — podsetnik sledeće Gage R&R studije po merilu. */

export function daniDoStudije(sledecaStudija) {
  if (!sledecaStudija) return null;
  return Math.ceil((new Date(sledecaStudija) - new Date()) / 86400000);
}

export function statusMsaKalendara(sledecaStudija, C) {
  const d = daniDoStudije(sledecaStudija);
  if (d === null) return { label: "NEPLANIRANO", boja: C.sivi, d: null };
  if (d < 0) return { label: `KASNI ${Math.abs(d)}d`, boja: C.crvena, d };
  if (d <= 30) return { label: `USKORO ${d}d`, boja: C.zuta, d };
  return { label: `OK ${d}d`, boja: C.zelena, d };
}

export async function ucitajMsaKalendar(supabase) {
  const { data, error } = await supabase
    .from("msa_kalendar")
    .select("*,merilo:merila(id,naziv,serijski_broj,tip,lokacija)")
    .order("sledeca_studija", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data || [];
}

export async function sacuvajMsaKalendar(supabase, row) {
  const payload = {
    merilo_id: row.merilo_id,
    interval_meseci: Number(row.interval_meseci) || 12,
    sledeca_studija: row.sledeca_studija || null,
    karakteristika: row.karakteristika || null,
    napomena: row.napomena || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("msa_kalendar")
    .upsert(payload, { onConflict: "merilo_id" })
    .select("*,merilo:merila(id,naziv,serijski_broj)")
    .single();
  if (error) throw error;
  return data;
}

/** Posle snimljene Gage R&R studije — pomeri sledeći rok. */
export async function azurirajMsaPosleStudije(supabase, { meriloId, studijaId, datumStudije }) {
  if (!meriloId) return;
  const { data: postojeci } = await supabase.from("msa_kalendar")
    .select("*").eq("merilo_id", meriloId).maybeSingle();
  const interval = postojeci?.interval_meseci || 12;
  const baza = datumStudije ? new Date(datumStudije) : new Date();
  const sledeca = new Date(baza);
  sledeca.setMonth(sledeca.getMonth() + interval);
  const sledecaStr = sledeca.toISOString().split("T")[0];
  await supabase.from("msa_kalendar").upsert({
    merilo_id: meriloId,
    interval_meseci: interval,
    sledeca_studija: sledecaStr,
    poslednja_studija_id: studijaId || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "merilo_id" });
}

export function msaPodsetnici(rows, C) {
  return (rows || [])
    .map((r) => ({ ...r, st: statusMsaKalendara(r.sledeca_studija, C) }))
    .filter((r) => r.st.d !== null && r.st.d <= 30)
    .sort((a, b) => (a.st.d ?? 999) - (b.st.d ?? 999));
}
