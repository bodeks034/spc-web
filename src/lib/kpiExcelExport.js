/** KPI kolone za Excel izvoz — spajanje sa kpi_unos (merljive + atributivne). */

export const KPI_EXPORT_COLS = [
  ["ukupno_kom", "Ukupno kom"],
  ["ispravno_iz_prve", "Ispravno iz prve"],
  ["neusaglaseno", "Neusaglaseno"],
  ["dorada", "Dorada"],
  ["skart", "Skart"],
  ["ok_nakon_dorade", "OK nakon dorade"],
  ["planirano_kom", "Planirano kom"],
  ["planirano_min", "Planirano min"],
  ["zastoj_min", "Zastoj min"],
];

export const MERENJA_VARIJABILNA_EXPORT_COLS = [
  ["id", "id"],
  ["datum", "datum"],
  ["smena", "smena"],
  ["radni_nalog", "radni_nalog"],
  ["id_deo", "id_deo"],
  ["naziv_dela", "naziv_dela"],
  ["sifra_merenja", "sifra_merenja"],
  ["pozicija", "pozicija"],
  ["izmereno", "izmereno"],
  ["status", "status"],
  ["linija", "linija"],
  ["kontrolor", "kontrolor"],
  ["merni_instrument", "merni_instrument"],
  ["masina", "masina"],
  ["sesija_id", "sesija_id"],
  ...KPI_EXPORT_COLS,
];

export const KONTROLNI_LOG_EXPORT_COLS = [
  ["datum", "datum"],
  ["smena", "smena"],
  ["radni_nalog", "radni_nalog"],
  ["id_deo", "id_deo"],
  ["naziv_dela", "naziv_dela"],
  ["pogon_kod", "pogon_kod"],
  ["status", "status"],
  ["greska_naziv", "greska_naziv"],
  ["podkategorija", "podkategorija"],
  ["defekt", "defekt"],
  ["ok_kolicina", "OK kol."],
  ["nok_kolicina", "NOK kol."],
  ["ukupno_merenja", "Ukupno N"],
  ["komentar", "komentar"],
  ["sesija_id", "sesija_id"],
  ["created_at", "created_at"],
  ...KPI_EXPORT_COLS,
];

function kpiKeyFallback(row) {
  const d = row?.datum ?? "";
  const sm = row?.smena ?? "";
  const id = String(row?.id_deo || "").trim().toUpperCase();
  const rn = row?.radni_nalog || "";
  const ser = row?.serija ?? row?.sifra_merenja ?? "";
  return `${d}|${sm}|${id}|${rn}|${ser}`;
}

/** Mapa sesija_id / fallback ključ → KPI red. */
export function buildKpiLookup(kpiRows) {
  const map = new Map();
  for (const r of kpiRows || []) {
    if (r.sesija_id) map.set(`s:${r.sesija_id}`, r);
    map.set(`k:${kpiKeyFallback(r)}`, r);
  }
  return map;
}

export function kpiZaRed(red, lookup) {
  if (!lookup || !red) return {};
  if (red.sesija_id && lookup.has(`s:${red.sesija_id}`)) {
    return lookup.get(`s:${red.sesija_id}`);
  }
  return lookup.get(`k:${kpiKeyFallback(red)}`) || {};
}

export function kpiPoljaZaIzvoz(kpiRed) {
  const out = {};
  for (const [key] of KPI_EXPORT_COLS) {
    out[key] = kpiRed?.[key] ?? "";
  }
  return out;
}

export async function fetchKpiUnosZaIzvoz(supabase, {
  modul,
  idDeo,
  datumOd,
  datumDo,
}) {
  let q = supabase.from("kpi_unos").select("*").eq("modul", modul);
  if (idDeo) q = q.eq("id_deo", String(idDeo).trim().toUpperCase());
  if (datumOd) q = q.gte("datum", datumOd);
  if (datumDo) q = q.lte("datum", datumDo);
  const { data, error } = await q.order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchNaziviDelaMap(supabase, idDeo) {
  let q = supabase.from("delovi").select("id_deo,naziv_dela");
  if (idDeo) q = q.eq("id_deo", String(idDeo).trim().toUpperCase());
  const { data, error } = await q;
  if (error) return {};
  const map = {};
  for (const r of data || []) {
    const id = String(r.id_deo || "").trim().toUpperCase();
    if (id) map[id] = r.naziv_dela || "";
  }
  return map;
}

export function mapMerenjeVarijabilnoZaIzvoz(r, { nazivDelaMap, kpiLookup }) {
  const id = String(r.id_deo || "").trim().toUpperCase();
  const kpi = kpiPoljaZaIzvoz(kpiZaRed(r, kpiLookup));
  return {
    id: r.id ?? "",
    datum: r.datum ?? "",
    smena: r.smena ?? "",
    radni_nalog: r.radni_nalog ?? "",
    id_deo: id,
    naziv_dela: nazivDelaMap[id] ?? "",
    sifra_merenja: r.sifra_merenja ?? "",
    pozicija: r.pozicija ?? "",
    izmereno: r.vrednost_raw ?? r.vrednost_dec ?? "",
    status: r.status ?? "",
    linija: r.linija ?? "",
    kontrolor: r.kontrolor ?? "",
    merni_instrument: r.merni_instrument ?? "",
    masina: r.masina ?? "",
    sesija_id: r.sesija_id ?? "",
    ...kpi,
  };
}

export function mapKontrolniLogZaIzvoz(r, { kpiLookup }) {
  const kpi = kpiPoljaZaIzvoz(kpiZaRed(r, kpiLookup));
  return {
    datum: r.datum ?? "",
    smena: r.smena ?? "",
    radni_nalog: r.radni_nalog ?? "",
    id_deo: r.id_deo ?? "",
    naziv_dela: r.naziv_dela ?? "",
    pogon_kod: r.pogon_kod ?? "",
    status: r.status ?? "",
    greska_naziv: r.greska_naziv ?? "",
    podkategorija: r.podkategorija ?? "",
    defekt: r.defekt ?? "",
    ok_kolicina: r.ok_kolicina ?? "",
    nok_kolicina: r.nok_kolicina ?? "",
    ukupno_merenja: r.ukupno_merenja ?? "",
    komentar: r.komentar ?? "",
    sesija_id: r.sesija_id ?? "",
    created_at: r.created_at ?? "",
    ...kpi,
  };
}

export function kpiPoljaIzForme(kpi = {}) {
  return kpiPoljaZaIzvoz(kpi);
}
