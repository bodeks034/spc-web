/** FAI — prvo parče pre puštanja serije (samo gde je obavezno u šifrarniku). */

function dISO() {
  return new Date().toISOString().split("T")[0];
}

/** Da li karakteristika zahteva FAI — samo kolona nivo_kontrole (glavni unos kol. V). */
export function faiObaveznoIzReda(k) {
  const n = String(k?.nivo_kontrole ?? "").trim().toUpperCase();
  return ["DA", "1", "TRUE", "FAI", "YES"].includes(n);
}

export function faiObaveznoIzKolone(k) {
  return !!k?.faiObavezno;
}

export function faiBrojMerenjaIzKolone(k) {
  const n = Number(k?.faiBrojMerenja ?? k?.fai_broj_merenja);
  if (Number.isFinite(n) && n > 0) return Math.min(Math.max(Math.round(n), 1), 10);
  return 1;
}

/** Kolone merljivog unosa koje ulaze u FAI (prvo parče). */
export function koloneZaFai(kolone) {
  return (kolone || []).filter((k) => {
    if (!k?.naziv || k.naziv === "-") return false;
    if (!faiObaveznoIzKolone(k)) return false;
    return Number.isFinite(k.lslDec) && Number.isFinite(k.uslDec);
  });
}

export function faiLinijaPotreban(kolone) {
  return koloneZaFai(kolone).length > 0;
}

/** Poslednji FAI zapis (odobren ili čeka) za smenu / RN. */
export async function ucitajPoslednjiFai(supabase, { idDeo, pogonKod, radniNalog, smena, datum }) {
  const deo = String(idDeo || "").trim().toUpperCase();
  if (deo.length < 3) return null;
  let q = supabase.from("fai_unosi")
    .select("*")
    .eq("id_deo", deo)
    .eq("datum", datum || dISO())
    .eq("smena", Number(smena) || 1)
    .order("created_at", { ascending: false })
    .limit(1);
  const rn = String(radniNalog || "").trim().toUpperCase();
  if (rn) q = q.eq("radni_nalog", rn);
  const pg = String(pogonKod || "").trim().toUpperCase();
  if (pg) q = q.eq("pogon_kod", pg);
  const { data, error } = await q.maybeSingle();
  if (error && !String(error.message || "").includes("does not exist")) throw error;
  return data;
}

export async function ucitajOdobrenFai(supabase, { idDeo, pogonKod, radniNalog, smena, datum }) {
  const deo = String(idDeo || "").trim().toUpperCase();
  if (deo.length < 3) return null;
  let q = supabase.from("fai_unosi")
    .select("*")
    .eq("id_deo", deo)
    .eq("datum", datum || dISO())
    .eq("smena", Number(smena) || 1)
    .eq("status", "odobren")
    .order("created_at", { ascending: false })
    .limit(1);
  const rn = String(radniNalog || "").trim().toUpperCase();
  if (rn) q = q.eq("radni_nalog", rn);
  const pg = String(pogonKod || "").trim().toUpperCase();
  if (pg) q = q.eq("pogon_kod", pg);
  const { data, error } = await q.maybeSingle();
  if (error && !String(error.message || "").includes("does not exist")) throw error;
  return data;
}

export async function snimiFaiUnos(supabase, {
  idDeo, pogonKod, radniNalog, smena, merenja, komentar, korisnik, odobri = false,
}) {
  const deo = String(idDeo || "").trim().toUpperCase();
  const status = odobri ? "odobren" : "ceka";
  const payload = {
    id_deo: deo,
    pogon_kod: pogonKod || null,
    radni_nalog: radniNalog || null,
    smena: Number(smena) || 1,
    datum: dISO(),
    status,
    merenja_json: merenja || [],
    komentar: komentar || null,
    kreirao_id: korisnik?.radnikId || null,
    odobrio_id: odobri ? korisnik?.radnikId : null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("fai_unosi").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function odobriFai(supabase, faiId, korisnik) {
  const { data, error } = await supabase.from("fai_unosi").update({
    status: "odobren",
    odobrio_id: korisnik?.radnikId || null,
    updated_at: new Date().toISOString(),
  }).eq("id", faiId).select("*").single();
  if (error) throw error;
  return data;
}

export function faiBlokiraSeriju(faiRecord) {
  return !faiRecord || faiRecord.status !== "odobren";
}

/** FAI zapisi koji čekaju odobrenje (lista za kvalitet). */
export async function ucitajFaiCekaju(supabase, { datum, smena, pogonKod, idDeo } = {}) {
  let q = supabase.from("fai_unosi")
    .select("*, kreirao:kreirao_id(ime), odobrio:odobrio_id(ime)")
    .eq("status", "ceka")
    .eq("datum", datum || dISO())
    .order("created_at", { ascending: false });
  if (smena != null && smena !== "") q = q.eq("smena", Number(smena) || 1);
  const pg = String(pogonKod || "").trim().toUpperCase();
  if (pg) q = q.eq("pogon_kod", pg);
  const deo = String(idDeo || "").trim().toUpperCase();
  if (deo.length >= 3) q = q.eq("id_deo", deo);
  const { data, error } = await q;
  if (error && !String(error.message || "").includes("does not exist")) throw error;
  return data || [];
}

export async function ucitajFaiPoId(supabase, faiId) {
  if (!faiId) return null;
  const { data, error } = await supabase.from("fai_unosi")
    .select("*, kreirao:kreirao_id(ime), odobrio:odobrio_id(ime)")
    .eq("id", faiId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function faiImaNok(merenjaJson) {
  return (merenjaJson || []).some((m) => String(m?.status || "").toUpperCase() === "NOK");
}

export function formatFaiKreirao(rec) {
  const k = rec?.kreirao;
  if (!k) return "—";
  return k.ime || "—";
}
