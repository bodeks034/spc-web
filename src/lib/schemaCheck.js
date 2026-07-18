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
  { id: "moment_crtez", naziv: "Moment ključ + crteži (JOB/korak/protokol)", fajl: "54_crtez_assets_moment.sql" },
  { id: "moment_unapredjenje", naziv: "Moment tool master / error kodovi", fajl: "57_moment_unapredjenje.sql" },
  { id: "moment_pfmea_link", naziv: "Moment PFMEA veza", fajl: "58_moment_pfmea_link.sql" },
  { id: "ncr_capa", naziv: "NCR / CAPA modul", fajl: "59_ncr_capa.sql" },
  { id: "fai_broj_merenja", naziv: "FAI broj merenja po dimenziji", fajl: "37_fai_broj_merenja.sql" },
  { id: "klasa_karakteristike", naziv: "AQL klasa dimenzije (Critical/Major/Minor)", fajl: "43_klasa_karakteristike.sql" },
  { id: "kar_unique_pogon", naziv: "Karakteristike UNIQUE po pogonu", fajl: "40_karakteristike_unique_pogon.sql" },
  { id: "erp_uvoz_log", naziv: "ERP automatski uvoz (log)", fajl: "38_erp_uvoz_log.sql" },
  { id: "sifrarnik_modul", naziv: "Šifrarnik modul (tipovi vozila, barkod)", fajl: "39_sifrarnik_modul.sql" },
  { id: "glavni_unos_app", naziv: "Glavni unos u aplikaciji", fajl: "40_glavni_unos_app.sql" },
  { id: "sifrarnik_liste", naziv: "Dropdown liste šifrarnika", fajl: "41_sifrarnik_liste.sql" },
  { id: "licenca_moduli", naziv: "Licenca moduli (tenant, deployment)", fajl: "23_licenca_moduli.sql" },
  { id: "karakteristike_serija", naziv: "Serija merenja po fazi (broj_merenja)", fajl: "28_karakteristike_serija_merljive.sql" },
  { id: "sop_pogon_kod", naziv: "SOP / pogon A–H", fajl: "29_sop_pogon_kod.sql" },
  { id: "karakteristike_layout", naziv: "Karakteristike puni layout (nivo_kontrole)", fajl: "32_karakteristike_novi_layout.sql" },
  { id: "glavni_unos_kupac", naziv: "Kupac u glavnom unosu", fajl: "45_glavni_unos_kupac.sql" },
  { id: "osmd_zaglavlje", naziv: "8D zaglavlje (reklamacija, lot)", fajl: "46_osmd_zaglavlje.sql" },
  { id: "pfmea_osmd_veza", naziv: "PFMEA veza sa 8D", fajl: "51_pfmea_osmd_veza.sql" },
  { id: "moment_pilot_tockovi", naziv: "Moment pilot — točkovi JOB", fajl: "55_moment_pilot_tockovi.sql" },
  { id: "auto_telemetrija", naziv: "Auto telemetrija (run log + audit)", fajl: "61_auto_telemetrija.sql" },
  { id: "erp_uvoz_constraints", naziv: "ERP uvoz UNIQUE (mašine, kupci, RN)", fajl: "62_erp_uvoz_constraints.sql" },
  { id: "greske_katalog_erp", naziv: "ERP greške katalog upsert", fajl: "64_greske_katalog_erp_upsert.sql" },
  { id: "licenca_uredjaji", naziv: "Licenca po uređaju (max_uredjaja)", fajl: "65_licenca_uredjaji.sql" },
  { id: "linija_pouzdanost", naziv: "Linija: foto NOK, client_id, PIN", fajl: "66_linija_pouzdanost.sql" },
  { id: "erp_master_v2", naziv: "ERP master podaci v2 (BOM, operacije, lot/serial, QMS)", fajl: "67_erp_master_podaci.sql" },
  { id: "erp_glavni_sheetovi", naziv: "ERP raspored delova po sheetovima vozila", fajl: "68_erp_glavni_unos_sheetovi.sql" },
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
  { id: "erp_master_v2", table: "erp_uvoz_batch", select: "id,preset,status,started_at" },
  { id: "erp_master_v2_bom", table: "sastavnica", select: "nadredjeni_deo,podredjeni_deo,revizija" },
  { id: "erp_master_v2_serial", table: "serijski_brojevi", select: "serijski_broj,id_deo" },
  { id: "erp_glavni_sheetovi", table: "glavni_unos_sheetovi", select: "naziv,sifra_vozila,aktivan" },
  { id: "sifrarnik_tipovi", table: "tipovi_vozila", select: "kod,naziv" },
  { id: "sifrarnik_barkod", table: "barkod_profili", select: "id_deo,format" },
  { id: "glavni_unos_redovi", table: "glavni_unos_redovi", select: "id,sheet_naziv,id_deo" },
  { id: "pogon_linija_mapa", table: "pogon_linija_mapa", select: "linija_faza,pogon_kod" },
  { id: "sifrarnik_liste", table: "sifrarnik_liste_vrednosti", select: "id,lista_kljuc,vrednost" },
  { id: "moment_crtez_job", table: "moment_job", select: "id,kod_job,id_deo" },
  { id: "moment_crtez_korak", table: "moment_korak", select: "id,job_id,redosled" },
  { id: "moment_crtez_poz", table: "moment_pozicija", select: "id,job_id,poz_br" },
  { id: "moment_crtez_prot", table: "moment_protokol", select: "id,datum,status" },
  { id: "moment_crtez_asset", table: "crtez_assets", select: "id,ref_tip,ref_id" },
  { id: "moment_unapredjenje_prot", table: "moment_protokol", select: "id,error_kod,tool_kod" },
  { id: "moment_unapredjenje_job", table: "moment_job", select: "id,dijagram_fajl" },
  { id: "moment_pfmea_link", table: "moment_korak", select: "id,pfmea_veza,pfmea_stavka_id" },
  { id: "ncr_capa", table: "ncr_capa", select: "id,broj_ncr,status" },
  { id: "licenca_moduli", table: "app_licenca", select: "id,tenant_id,moduli_json,deployment" },
  { id: "karakteristike_serija", table: "karakteristike_merljive", select: "id,broj_merenja,faza_naziv,linija_faza" },
  { id: "sop_pogon_kod", table: "sop_deo_varijabilni", select: "id_deo,pogon_kod" },
  { id: "merenja_pogon", table: "merenja_varijabilna", select: "id,pogon_kod" },
  { id: "karakteristike_layout", table: "karakteristike_merljive", select: "id,nivo_kontrole,ukupno_kom" },
  { id: "glavni_unos_kupac", table: "glavni_unos_redovi", select: "id,kupac" },
  { id: "osmd_zaglavlje", table: "osmd_izvestaji", select: "id,broj_8d,lot_serijski" },
  { id: "pfmea_osmd_veza", table: "pfmea_cp_dokumenti", select: "id,osmd_izvestaj_id,broj_8d" },
  { id: "moment_pilot_tockovi", table: "moment_job", select: "id,kod_job,operacija" },
  { id: "auto_run_log", table: "auto_run_log", select: "id,job_id,status" },
  { id: "auto_akcije_log", table: "auto_akcije_log", select: "id,tip,opis" },
  { id: "greske_katalog_defekt", table: "greske_katalog", select: "id,kategorija,podkategorija,defekt" },
  { id: "licenca_uredjaji_tbl", table: "licenca_uredjaji", select: "id,uredjaj_id,poslednji_login" },
  { id: "licenca_max_uredjaja", table: "app_licenca", select: "id,max_uredjaja" },
  { id: "foto_atr", table: "kontrolni_log", select: "id,foto,client_id" },
  { id: "client_id_mer", table: "merenja_varijabilna", select: "id,client_id" },
  { id: "radnici_pin", table: "radnici", select: "id,pin_hash" },
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

/** Provera da li postoje UNIQUE indeksi iz 62_erp_uvoz_constraints.sql (upsert onConflict). */
export async function proveriErpUvozConstraints(supabase) {
  const probeNaziv = "__spc_erp_constraints_probe__";
  try {
    const { error } = await supabase
      .from("masine")
      .upsert({ naziv: probeNaziv }, { onConflict: "naziv" });
    if (error) {
      if (/no unique or exclusion constraint/i.test(error.message || "")) {
        return {
          id: "erp_uvoz_constraints",
          ok: false,
          poruka: "Nedostaje idx_masine_naziv_unique — pokreni 62_erp_uvoz_constraints.sql",
        };
      }
      return { id: "erp_uvoz_constraints", ok: false, poruka: error.message };
    }
    await supabase.from("masine").delete().eq("naziv", probeNaziv);
    return { id: "erp_uvoz_constraints", ok: true, poruka: "OK" };
  } catch (e) {
    return { id: "erp_uvoz_constraints", ok: false, poruka: e.message || String(e) };
  }
}

/** Provera UNIQUE indeksa za ERP upsert grešaka (64_greske_katalog_erp_upsert.sql). */
export async function proveriGreskeKatalogUpsert(supabase) {
  const probe = "__spc_greske_upsert_probe__";
  try {
    const { error } = await supabase
      .from("greske_katalog")
      .upsert(
        { kategorija: probe, podkategorija: probe, defekt: probe, opis: probe },
        { onConflict: "kategorija,podkategorija,defekt" },
      );
    if (error) {
      if (/no unique or exclusion constraint/i.test(error.message || "")) {
        return {
          id: "greske_katalog_erp",
          ok: false,
          poruka: "Nedostaje uq_greske_katalog_kat_pod_defekt — pokreni 64_greske_katalog_erp_upsert.sql",
        };
      }
      if (/column.*defekt/i.test(error.message || "")) {
        return {
          id: "greske_katalog_erp",
          ok: false,
          poruka: "Kolona defekt nedostaje — pokreni 64_greske_katalog_erp_upsert.sql",
        };
      }
      return { id: "greske_katalog_erp", ok: false, poruka: error.message };
    }
    await supabase.from("greske_katalog").delete()
      .eq("kategorija", probe)
      .eq("podkategorija", probe)
      .eq("defekt", probe);
    return { id: "greske_katalog_erp", ok: true, poruka: "OK" };
  } catch (e) {
    return { id: "greske_katalog_erp", ok: false, poruka: e.message || String(e) };
  }
}

export async function proveriSemu(supabase) {
  const byId = {};
  for (const p of PROBES) {
    byId[p.id] = await proveriStavku(supabase, p);
  }
  byId.erp_uvoz_constraints = await proveriErpUvozConstraints(supabase);
  byId.greske_katalog_erp = await proveriGreskeKatalogUpsert(supabase);

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
    pfmea_cp: byId.pfmea_cp?.ok,
    pfmea_stavke_ext: byId.pfmea_stavke_ext?.ok,
    pfmea_d_posle: byId.pfmea_d_posle?.ok,
    fai_broj_merenja: byId.fai_broj_merenja?.ok,
    klasa_karakteristike: byId.klasa_karakteristike?.ok,
    kar_unique_pogon: byId.kar_unique_pogon?.ok,
    erp_uvoz_log: byId.erp_uvoz_log?.ok,
    erp_master_v2: byId.erp_master_v2?.ok && byId.erp_master_v2_bom?.ok && byId.erp_master_v2_serial?.ok,
    erp_uvoz_constraints: byId.erp_uvoz_constraints?.ok,
    greske_katalog_erp: byId.greske_katalog_erp?.ok,
    licenca_uredjaji: byId.licenca_uredjaji_tbl?.ok && byId.licenca_max_uredjaja?.ok,
    linija_pouzdanost: byId.foto_atr?.ok && byId.client_id_mer?.ok && byId.radnici_pin?.ok,
    sifrarnik_modul: byId.sifrarnik_tipovi?.ok && byId.sifrarnik_barkod?.ok,
    glavni_unos_app: byId.glavni_unos_redovi?.ok && byId.pogon_linija_mapa?.ok,
    sifrarnik_liste: byId.sifrarnik_liste?.ok,
    moment_crtez: byId.moment_crtez_job?.ok
      && byId.moment_crtez_korak?.ok
      && byId.moment_crtez_prot?.ok
      && byId.moment_crtez_asset?.ok,
    moment_unapredjenje: byId.moment_unapredjenje_prot?.ok && byId.moment_unapredjenje_job?.ok,
    moment_pfmea_link: byId.moment_pfmea_link?.ok,
    ncr_capa: byId.ncr_capa?.ok,
    licenca_moduli: byId.licenca_moduli?.ok,
    karakteristike_serija: byId.karakteristike_serija?.ok,
    sop_pogon_kod: byId.sop_pogon_kod?.ok && byId.merenja_pogon?.ok,
    karakteristike_layout: byId.karakteristike_layout?.ok,
    glavni_unos_kupac: byId.glavni_unos_kupac?.ok,
    osmd_zaglavlje: byId.osmd_zaglavlje?.ok,
    pfmea_osmd_veza: byId.pfmea_osmd_veza?.ok,
    moment_pilot_tockovi: byId.moment_pilot_tockovi?.ok,
    auto_telemetrija: byId.auto_run_log?.ok && byId.auto_akcije_log?.ok,
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
      m.id === "pfmea_cp" && byId.pfmea_cp,
      m.id === "pfmea_stavke_ext" && byId.pfmea_stavke_ext,
      m.id === "pfmea_d_posle" && byId.pfmea_d_posle,
      m.id === "fai_broj_merenja" && byId.fai_broj_merenja,
      m.id === "klasa_karakteristike" && byId.klasa_karakteristike,
      m.id === "kar_unique_pogon" && byId.kar_unique_pogon,
      m.id === "erp_uvoz_log" && byId.erp_uvoz_log,
      m.id === "erp_master_v2" && byId.erp_master_v2,
      m.id === "erp_master_v2" && byId.erp_master_v2_bom,
      m.id === "erp_master_v2" && byId.erp_master_v2_serial,
      m.id === "erp_uvoz_constraints" && byId.erp_uvoz_constraints,
      m.id === "greske_katalog_erp" && byId.greske_katalog_defekt,
      m.id === "greske_katalog_erp" && byId.greske_katalog_erp,
      m.id === "licenca_uredjaji" && byId.licenca_uredjaji_tbl,
      m.id === "licenca_uredjaji" && byId.licenca_max_uredjaja,
      m.id === "sifrarnik_modul" && byId.sifrarnik_tipovi,
      m.id === "sifrarnik_modul" && byId.sifrarnik_barkod,
      m.id === "glavni_unos_app" && byId.glavni_unos_redovi,
      m.id === "glavni_unos_app" && byId.pogon_linija_mapa,
      m.id === "sifrarnik_liste" && byId.sifrarnik_liste,
      m.id === "moment_crtez" && byId.moment_crtez_job,
      m.id === "moment_crtez" && byId.moment_crtez_korak,
      m.id === "moment_crtez" && byId.moment_crtez_prot,
      m.id === "moment_crtez" && byId.moment_crtez_asset,
      m.id === "moment_unapredjenje" && byId.moment_unapredjenje_prot,
      m.id === "moment_unapredjenje" && byId.moment_unapredjenje_job,
      m.id === "moment_pfmea_link" && byId.moment_pfmea_link,
      m.id === "ncr_capa" && byId.ncr_capa,
      m.id === "licenca_moduli" && byId.licenca_moduli,
      m.id === "karakteristike_serija" && byId.karakteristike_serija,
      m.id === "sop_pogon_kod" && byId.sop_pogon_kod,
      m.id === "sop_pogon_kod" && byId.merenja_pogon,
      m.id === "karakteristike_layout" && byId.karakteristike_layout,
      m.id === "glavni_unos_kupac" && byId.glavni_unos_kupac,
      m.id === "osmd_zaglavlje" && byId.osmd_zaglavlje,
      m.id === "pfmea_osmd_veza" && byId.pfmea_osmd_veza,
      m.id === "moment_pilot_tockovi" && byId.moment_pilot_tockovi,
      m.id === "auto_telemetrija" && byId.auto_run_log,
      m.id === "auto_telemetrija" && byId.auto_akcije_log,
    ].filter(Boolean),
  }));
}

/** Sažetak provere šeme za banner / health. */
export function sumirajProveruSeme(stavke = []) {
  const nedostaje = stavke.filter((s) => !s.ok);
  return {
    ok: stavke.length > 0 && nedostaje.length === 0,
    ukupno: stavke.length,
    primenjeno: stavke.filter((s) => s.ok).length,
    nedostaje: nedostaje.map((s) => ({ id: s.id, naziv: s.naziv, fajl: s.fajl })),
  };
}
