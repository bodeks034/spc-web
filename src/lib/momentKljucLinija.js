const danasIso = () => new Date().toISOString().split("T")[0];

function bazaUpitProtokola(supabase, { jobId, idDeo, radniNalog, smena, vin }, kolone = "*") {
  let q = supabase.from("moment_protokol")
    .select(kolone)
    .eq("job_id", jobId)
    .eq("datum", danasIso());
  if (idDeo) q = q.eq("id_deo", String(idDeo).trim().toUpperCase());
  if (radniNalog) q = q.eq("radni_nalog", String(radniNalog).trim().toUpperCase());
  if (smena) q = q.eq("smena", Number(smena));
  const vinNorm = String(vin || "").trim().toUpperCase();
  if (vinNorm) q = q.eq("vin", vinNorm);
  else q = q.is("vin", null);
  return q;
}

/** Napredak u tekućem komadu — posle punog ciklusa maxOk se resetuje na 0. */
export function izracunajMomentNapredak(okZapisi, ukupnoKoraka = 0) {
  const sorted = [...(okZapisi || [])]
    .filter((r) => r.status === "OK" || r.korak_redosled != null)
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

  let maxOk = 0;
  let zavrseniCiklusi = 0;
  for (const r of sorted) {
    maxOk = Math.max(maxOk, r.korak_redosled || 0);
    if (ukupnoKoraka > 0 && maxOk >= ukupnoKoraka) {
      zavrseniCiklusi += 1;
      maxOk = 0;
    }
  }
  return { maxOk, zavrseniCiklusi };
}

/** Poslednji završeni koraci danas za job (OK) — za nastavak sekvence po komadu. */
export async function ucitajZavrseneMomentKorake(supabase, {
  jobId, idDeo, radniNalog, smena, ukupnoKoraka = 0, vin,
}) {
  const { data, error } = await bazaUpitProtokola(
    supabase, { jobId, idDeo, radniNalog, smena, vin }, "korak_redosled, status, created_at",
  )
    .eq("status", "OK")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const zapisi = data || [];
  const { maxOk, zavrseniCiklusi } = izracunajMomentNapredak(zapisi, ukupnoKoraka);
  return { maxOk, zapisi, zavrseniCiklusi };
}

/** Broj OK / NOK merenja danas za job (smena, deo, RN). */
export async function ucitajMomentStatistiku(supabase, { jobId, idDeo, radniNalog, smena }) {
  const kpi = await ucitajMomentKpiLinija(supabase, { jobId, idDeo, radniNalog, smena });
  return { ok: kpi.ok, nok: kpi.nok, ukupno: kpi.ukupno };
}

/** KPI snapshot za operatora na liniji — statistika, napredak, poslednji NOK, trend. */
export async function ucitajMomentKpiLinija(supabase, {
  jobId, idDeo, radniNalog, smena, ukupnoKoraka = 0, vin,
}) {
  const { data, error } = await bazaUpitProtokola(
    supabase,
    { jobId, idDeo, radniNalog, smena, vin },    "id, status, korak_redosled, poz_br, ostvareno_nm, ostvareno_ugao, created_at, error_kod",
  ).order("created_at", { ascending: false });
  if (error) throw error;

  const redovi = data || [];
  let ok = 0;
  let nok = 0;
  let poslednjiNok = null;

  for (const r of redovi) {
    if (r.status === "OK") ok += 1;
    else if (r.status === "NOK") {
      nok += 1;
      if (!poslednjiNok) poslednjiNok = r;
    }
  }

  const okRedovi = redovi.filter((r) => r.status === "OK");
  const { maxOk, zavrseniCiklusi } = izracunajMomentNapredak(
    [...okRedovi].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    ukupnoKoraka,
  );

  const ukupno = ok + nok;
  const fpy = ukupno > 0 ? Math.round((ok / ukupno) * 1000) / 10 : null;

  return {
    ok,
    nok,
    ukupno,
    maxOk,
    zavrseniCiklusi,
    fpy,
    poslednjiNok,
    nedavna: redovi.slice(0, 10),
  };
}

export function sledeciMomentKorak(koraci, maxOkRedosled) {
  const sort = [...(koraci || [])].sort((a, b) => a.redosled - b.redosled);
  return sort.find((k) => k.redosled > maxOkRedosled) ?? null;
}
