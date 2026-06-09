/** Provera da li su migracije primenjene (Admin panel). */

export const MIGRACIJE_LISTA = [
  { id: "notifikacije", naziv: "Obaveštenja (Teams, log)", fajl: "17_notifikacije.sql" },
  { id: "kar_revizija", naziv: "Revizija granica merljivih", fajl: "18_karakteristike_revizija.sql" },
  { id: "kpi_unos", naziv: "KPI (OEE, škart, dorada)", fajl: "14_kpi_skart_dorada_oee.sql" },
  { id: "planirano_kom", naziv: "OEE performansa (plan kom)", fajl: "16_kpi_planirano_kom.sql" },
  { id: "sesija_id", naziv: "ID sesije serije", fajl: "15_sesija_id.sql" },
  { id: "foto_mer", naziv: "Foto/komentar merenja", fajl: "13_merenja_varijabilna_foto.sql" },
  { id: "merenja", naziv: "Merljive merenja", fajl: "11_varijabilne_schema.sql" },
  { id: "gage", naziv: "Gage R&R", fajl: "12_gage_rr_schema.sql" },
  { id: "kontrolni_log", naziv: "Kontrolni log", fajl: "01_supabase_schema.sql" },
  { id: "spc_baseline", naziv: "SPC baseline (PPAP)", fajl: "22_spc_baseline_merljive.sql" },
];

const PROBES = [
  { id: "kontrolni_log", table: "kontrolni_log", select: "id,datum,smena" },
  { id: "merenja", table: "merenja_varijabilna", select: "id,datum,status" },
  { id: "kpi_unos", table: "kpi_unos", select: "id,modul,ukupno_kom" },
  { id: "planirano_kom", table: "kpi_unos", select: "id,planirano_kom" },
  { id: "foto_mer", table: "merenja_varijabilna", select: "id,foto,komentar" },
  { id: "sesija_id_log", table: "kontrolni_log", select: "id,sesija_id" },
  { id: "sesija_id_mer", table: "merenja_varijabilna", select: "id,sesija_id" },
  { id: "sesija_id_kpi", table: "kpi_unos", select: "id,sesija_id" },
  { id: "gage", table: "gage_rr_studije", select: "id" },
  { id: "notifikacije", table: "app_podesavanja", select: "kljuc,vrednost" },
  { id: "notif_log", table: "notifikacije_log", select: "id,kanal" },
  { id: "kar_revizija", table: "karakteristike_revizija", select: "id,id_deo,polje" },
  { id: "spc_baseline", table: "spc_baseline", select: "id,id_deo,tip_karte,pozicija" },
];

function greskaNedostaje(error) {
  const m = (error?.message || "").toLowerCase();
  return m.includes("does not exist")
    || m.includes("schema cache")
    || m.includes("could not find")
    || m.includes("column")
    || m.includes("relation");
}

export async function proveriStavku(supabase, probe) {
  const { error } = await supabase.from(probe.table).select(probe.select).limit(1);
  if (!error) return { id: probe.id, ok: true, poruka: "OK" };
  if (greskaNedostaje(error)) {
    return { id: probe.id, ok: false, poruka: error.message };
  }
  if (error.code === "PGRST116" || (error.message || "").includes("0 rows")) {
    return { id: probe.id, ok: true, poruka: "Tabela postoji (prazna)" };
  }
  return { id: probe.id, ok: true, poruka: "OK (RLS / prazan)" };
}

export async function proveriSemu(supabase) {
  const byId = {};
  for (const p of PROBES) {
    byId[p.id] = await proveriStavku(supabase, p);
  }

  const mapUser = {
    kpi_unos: byId.kpi_unos?.ok,
    planirano_kom: byId.planirano_kom?.ok,
    sesija_id: byId.sesija_id_log?.ok && byId.sesija_id_mer?.ok && byId.sesija_id_kpi?.ok,
    foto_mer: byId.foto_mer?.ok,
    merenja: byId.merenja?.ok,
    gage: byId.gage?.ok,
    kontrolni_log: byId.kontrolni_log?.ok,
    notifikacije: byId.notifikacije?.ok && byId.notif_log?.ok,
    kar_revizija: byId.kar_revizija?.ok,
    spc_baseline: byId.spc_baseline?.ok,
  };

  return MIGRACIJE_LISTA.map(m => ({
    ...m,
    ok: !!mapUser[m.id],
    detalji: [
      m.id === "sesija_id" && byId.sesija_id_log,
      m.id === "sesija_id" && byId.sesija_id_mer,
      m.id === "sesija_id" && byId.sesija_id_kpi,
      m.id === "foto_mer" && byId.foto_mer,
      m.id === "kpi_unos" && byId.kpi_unos,
      m.id === "planirano_kom" && byId.planirano_kom,
      m.id === "merenja" && byId.merenja,
      m.id === "gage" && byId.gage,
      m.id === "kontrolni_log" && byId.kontrolni_log,
      m.id === "notifikacije" && byId.notifikacije,
      m.id === "notifikacije" && byId.notif_log,
      m.id === "kar_revizija" && byId.kar_revizija,
    ].filter(Boolean),
  }));
}
