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
  { id: "spc_alarmi_reakcije", naziv: "SPC alarm reakcije (linija)", fajl: "33_spc_alarmi_reakcije.sql" },
  { id: "spc_karantin", naziv: "SPC karantin (HOLD lot/RN)", fajl: "34_spc_karantin.sql" },
  { id: "faza5_qms", naziv: "QMS Faza 5 (plan, MSA, FAI, SMTP)", fajl: "35_faza5_qms.sql" },
  { id: "pfmea_cp", naziv: "PFMEA / Control Plan (PPAP)", fajl: "48_pfmea_control_plan.sql" },
  { id: "pfmea_stavke_ext", naziv: "PFMEA nova ocena + odobrenje", fajl: "50_pfmea_stavke_prosirenje.sql" },
  { id: "pfmea_d_posle", naziv: "PFMEA D posle (nova ocena)", fajl: "53_pfmea_d_posle.sql" },
  { id: "fai_broj_merenja", naziv: "FAI broj merenja po dimenziji", fajl: "37_fai_broj_merenja.sql" },
  { id: "klasa_karakteristike", naziv: "AQL klasa dimenzije (Critical/Major/Minor)", fajl: "43_klasa_karakteristike.sql" },
  { id: "kar_unique_pogon", naziv: "Karakteristike UNIQUE po pogonu", fajl: "40_karakteristike_unique_pogon.sql" },
  { id: "erp_uvoz_log", naziv: "ERP automatski uvoz (log)", fajl: "38_erp_uvoz_log.sql" },
  { id: "sifrarnik_modul", naziv: "Šifrarnik modul (tipovi vozila, barkod)", fajl: "39_sifrarnik_modul.sql" },
  { id: "glavni_unos_app", naziv: "Glavni unos u aplikaciji", fajl: "40_glavni_unos_app.sql" },
  { id: "sifrarnik_liste", naziv: "Dropdown liste šifrarnika", fajl: "41_sifrarnik_liste.sql" },
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
  { id: "spc_alarmi_reakcije", table: "spc_alarmi", select: "id,komentar_operater,potvrdio_id" },
  { id: "spc_karantin", table: "karantin_lotovi", select: "id,id_deo,status,spc_alarm_id" },
  { id: "faza5_kplan", table: "kontrolni_plan", select: "id,id_deo,revizija" },
  { id: "pfmea_cp", table: "pfmea_cp_dokumenti", select: "id,naziv,id_deo" },
  { id: "pfmea_stavke_ext", table: "pfmea_stavke", select: "id,s_posle,odobrio" },
  { id: "pfmea_d_posle", table: "pfmea_stavke", select: "id,d_posle" },
  { id: "faza5_msa", table: "msa_kalendar", select: "id,merilo_id,sledeca_studija" },
  { id: "faza5_fai", table: "fai_unosi", select: "id,id_deo,status" },
  { id: "fai_broj_merenja", table: "karakteristike_merljive", select: "id,fai_broj_merenja" },
  { id: "klasa_karakteristike", table: "karakteristike_merljive", select: "id,klasa" },
  { id: "kar_unique_pogon", table: "karakteristike_merljive", select: "id,id_deo,pogon_kod,sifra_merenja,pozicija" },
  { id: "faza5_smtp", table: "app_podesavanja", select: "kljuc,vrednost" },
  { id: "erp_uvoz_log", table: "erp_uvoz_log", select: "id,izvor,uspeh,created_at" },
  { id: "sifrarnik_tipovi", table: "tipovi_vozila", select: "kod,naziv" },
  { id: "sifrarnik_barkod", table: "barkod_profili", select: "id_deo,format" },
  { id: "glavni_unos_redovi", table: "glavni_unos_redovi", select: "id,sheet_naziv,id_deo" },
  { id: "pogon_linija_mapa", table: "pogon_linija_mapa", select: "linija_faza,pogon_kod" },
  { id: "sifrarnik_liste", table: "sifrarnik_liste_vrednosti", select: "id,lista_kljuc,vrednost" },
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
    spc_alarmi_reakcije: byId.spc_alarmi_reakcije?.ok,
    spc_karantin: byId.spc_karantin?.ok,
    faza5_qms: byId.faza5_kplan?.ok && byId.faza5_msa?.ok && byId.faza5_fai?.ok,
    fai_broj_merenja: byId.fai_broj_merenja?.ok,
    kar_unique_pogon: byId.kar_unique_pogon?.ok,
    erp_uvoz_log: byId.erp_uvoz_log?.ok,
    sifrarnik_modul: byId.sifrarnik_tipovi?.ok && byId.sifrarnik_barkod?.ok,
    glavni_unos_app: byId.glavni_unos_redovi?.ok && byId.pogon_linija_mapa?.ok,
    sifrarnik_liste: byId.sifrarnik_liste?.ok,
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
      m.id === "spc_alarmi_reakcije" && byId.spc_alarmi_reakcije,
      m.id === "spc_karantin" && byId.spc_karantin,
      m.id === "faza5_qms" && byId.faza5_kplan,
      m.id === "faza5_qms" && byId.faza5_msa,
      m.id === "faza5_qms" && byId.faza5_fai,
      m.id === "fai_broj_merenja" && byId.fai_broj_merenja,
      m.id === "klasa_karakteristike" && byId.klasa_karakteristike,
      m.id === "kar_unique_pogon" && byId.kar_unique_pogon,
      m.id === "erp_uvoz_log" && byId.erp_uvoz_log,
      m.id === "sifrarnik_modul" && byId.sifrarnik_tipovi,
      m.id === "sifrarnik_modul" && byId.sifrarnik_barkod,
      m.id === "glavni_unos_app" && byId.glavni_unos_redovi,
      m.id === "glavni_unos_app" && byId.pogon_linija_mapa,
      m.id === "sifrarnik_liste" && byId.sifrarnik_liste,
    ].filter(Boolean),
  }));
}
