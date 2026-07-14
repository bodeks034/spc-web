/**
 * ISO audit paket — CSV export audit loga + trasabilitet po lotu.
 */

export function escCsv(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export function akcijeUcsvProsireno(akcije = []) {
  const head = "sekcija,vreme,tip,entitet,entitet_id,id_deo,opis,meta";
  const redovi = (akcije || []).map((a) => [
    "auto_akcija",
    a.created_at || "",
    a.tip || "",
    a.entitet || "",
    a.entitet_id ?? "",
    a.id_deo || "",
    escCsv(a.opis),
    escCsv(a.meta ? JSON.stringify(a.meta) : ""),
  ].join(","));
  return [head, ...redovi].join("\n");
}

export function runoviUcsv(runovi = []) {
  const head = "sekcija,vreme,job_id,status,trajanje_ms,poruka";
  const redovi = (runovi || []).map((r) => [
    "auto_run",
    r.created_at || "",
    r.job_id || "",
    r.status || "",
    r.trajanje_ms ?? "",
    escCsv(r.poruka),
  ].join(","));
  return [head, ...redovi].join("\n");
}

/** Jedan CSV fajl za ISO audit (akcije + cron runovi). */
export function isoAuditKombinovanoCsv({ akcije = [], runovi = [] } = {}) {
  const head = "sekcija,vreme,kol1,kol2,kol3,kol4,kol5,detalj";
  const redovi = [];

  for (const a of akcije) {
    redovi.push([
      "auto_akcija",
      a.created_at || "",
      a.tip || "",
      a.entitet || "",
      a.id_deo || "",
      a.entitet_id ?? "",
      "",
      escCsv(a.opis),
    ].join(","));
  }
  for (const r of runovi) {
    redovi.push([
      "auto_run",
      r.created_at || "",
      r.job_id || "",
      r.status || "",
      r.trajanje_ms ?? "",
      "",
      "",
      escCsv(r.poruka),
    ].join(","));
  }
  return [head, ...redovi].join("\n");
}

export function preuzmiCsvBrowser(sadrzaj, imeFajla) {
  const blob = new Blob(["\uFEFF" + sadrzaj], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = imeFajla;
  a.click();
  URL.revokeObjectURL(url);
}

export function safeImeFajla(s) {
  return String(s || "nepoznato").replace(/[^\w.-]+/g, "_").slice(0, 60);
}

/** SPC alarm pragovi (% po AQL klasi) — za ISO audit paket. */
export function spcPragoviAuditCsv(pragovi = {}) {
  const head = "sekcija,klasa,procenat,napomena";
  const redovi = [
    ["spc_alarm_prag", "default", pragovi.default ?? "", "Linijski NOK alarm — podrazumevano"],
    ["spc_alarm_prag", "critical", pragovi.critical ?? "", "AQL Critical klasa"],
    ["spc_alarm_prag", "major", pragovi.major ?? "", "AQL Major klasa"],
    ["spc_alarm_prag", "minor", pragovi.minor ?? "", "AQL Minor klasa"],
  ].map((r) => r.join(","));
  return [head, ...redovi].join("\n");
}

/** ISO 3951 prefs (varijabilno uzorkovanje) — nezavisno od AQL taba. */
export function iso3951AuditCsv(prefs = {}, lotSize = null) {
  const head = "sekcija,parametar,vrednost";
  const redovi = [
    ["iso3951", "nivo", prefs.nivo ?? ""],
    ["iso3951", "aql", prefs.aql ?? ""],
    ["iso3951", "tip_granice", prefs.tipGranice ?? ""],
    ["iso3951", "lsl", prefs.lsl ?? ""],
    ["iso3951", "usl", prefs.usl ?? ""],
    ["iso3951", "nominala", prefs.nominala ?? ""],
    ["iso3951", "lot_velicina", lotSize ?? ""],
    ["iso3951", "napomena", escCsv("Nezavisno od ISO 2859 AQL — varijabilno uzorkovanje")],
  ].map((r) => [r[0], r[1], escCsv(r[2])].join(","));
  return [head, ...redovi].join("\n");
}

/** ISO 2859 AQL prefs (atributivno uzorkovanje). */
export function aqlAuditCsv(prefs = {}, lotSize = null) {
  const head = "sekcija,parametar,vrednost";
  const redovi = [
    ["aql_iso2859", "nivo", prefs.nivo ?? ""],
    ["aql_iso2859", "tip_inspekcije", prefs.tipInspekcije ?? ""],
    ["aql_iso2859", "lot_velicina", lotSize ?? ""],
  ];
  const aqlPoKlasi = prefs.aqlPoKlasi || {};
  for (const [klasa, aql] of Object.entries(aqlPoKlasi)) {
    redovi.push(["aql_iso2859", `aql_${klasa}`, aql ?? ""]);
  }
  redovi.push(["aql_iso2859", "napomena", escCsv("Nezavisno od ISO 3951 — atributivno uzorkovanje")]);
  return [head, ...redovi.map((r) => [r[0], r[1], escCsv(r[2])].join(","))].join("\n");
}

/** PfMEA / Control Plan sažetak za reviziju. */
export function pfmeaCpAuditCsv(dokumenti = []) {
  const head = "sekcija,id_deo,naziv,revizija,broj_8d,pfmea_stavki,cp_stavki,updated_at";
  const redovi = (dokumenti || []).map((d) => [
    "pfmea_cp",
    d.id_deo || "",
    escCsv(d.naziv),
    d.revizija ?? "",
    d.broj_8d || "",
    d.pfmea_stavki ?? 0,
    d.cp_stavki ?? 0,
    d.updated_at || "",
  ].join(","));
  return [head, ...redovi].join("\n");
}

/**
 * Kombinovani ISO audit paket — audit log + pragovi + ISO3951 + AQL + PfMEA.
 * Analitika ostaje nezavisna; ovde su snapshot podešavanja za reviziju.
 */
export function isoAuditPaketKombinovano({
  akcije = [],
  runovi = [],
  pragovi = null,
  iso3951 = null,
  aql = null,
  pfmea = null,
  lotVelicinaAql = null,
  lotVelicinaIso3951 = null,
} = {}) {
  const delovi = [isoAuditKombinovanoCsv({ akcije, runovi })];
  if (pragovi) delovi.push("", spcPragoviAuditCsv(pragovi));
  if (iso3951) delovi.push("", iso3951AuditCsv(iso3951, lotVelicinaIso3951));
  if (aql) delovi.push("", aqlAuditCsv(aql, lotVelicinaAql));
  if (pfmea?.length) delovi.push("", pfmeaCpAuditCsv(pfmea));
  return delovi.join("\n");
}
