/** NCR Registar + Obrazac — polja po Excel šablonu NCR_KVALITET workflow. */

import { putanjaNcrObrazacExcel } from "./kvalitetFolderStruktura.js";
export const NCR_STATUS_EXCEL = [
  ["open", "OPEN"],
  ["containment", "CONTAINMENT"],
  ["disposition", "DISPOSITION"],
  ["osmd_progress", "8D IN PROGRESS"],
  ["verification", "VERIFICATION"],
  ["closed", "CLOSED"],
];

export const NCR_OZBILJNOST = ["Low", "Medium", "High", "Critical"];

export const NCR_KATEGORIJA_6M = [
  ["Man", "Man — čovek"],
  ["Machine", "Machine — mašina"],
  ["Method", "Method — metoda"],
  ["Material", "Material — materijal"],
  ["Measurement", "Measurement — merenje"],
  ["Environment", "Environment — okruženje"],
];

export const NCR_DA_NE = [["DA", "DA"], ["NE", "NE"]];

export const REGISTAR_KOLONE = [
  { key: "broj_ncr", label: "Broj NCR-a", w: 110 },
  { key: "datum_otvaranja", label: "Datum otvaranja", w: 100, tip: "date" },
  { key: "pogon", label: "Pogon", w: 90 },
  { key: "linija", label: "Linija", w: 80 },
  { key: "masina", label: "Mašina", w: 80 },
  { key: "radni_nalog", label: "Radni nalog", w: 90 },
  { key: "id_deo", label: "ID dela", w: 90 },
  { key: "naziv_dela", label: "Naziv dela", w: 120 },
  { key: "kupac", label: "Kupac", w: 90 },
  { key: "opis", label: "Opis neusaglašenosti", w: 180 },
  { key: "karakteristika", label: "Karakteristika", w: 100 },
  { key: "zahtev_spec", label: "Zahtev / spec.", w: 100 },
  { key: "izmerena_vrednost", label: "Izmerena vrednost", w: 100 },
  { key: "kolicina_proizvedena", label: "Kol. proizvedena", w: 80, tip: "number" },
  { key: "kolicina_sumnjiva", label: "Kol. sumnjiva", w: 80, tip: "number" },
  { key: "kolicina_neispravna", label: "Kol. neispravna", w: 80, tip: "number" },
  { key: "tip_greske", label: "Tip greške", w: 100 },
  { key: "kategorija_6m", label: "6M", w: 90 },
  { key: "ozbiljnost", label: "Ozbiljnost", w: 80 },
  { key: "ponavljanje", label: "Ponavljanje", w: 70 },
  { key: "prethodni_ncr", label: "Prethodni NCR", w: 100 },
  { key: "uticaj_kupca", label: "Uticaj kupca", w: 80 },
  { key: "detektovao", label: "Detektovao", w: 90 },
  { key: "metoda_detekcije", label: "Metoda detekcije", w: 110 },
  { key: "datum_containment", label: "Datum containment", w: 100, tip: "date" },
  { key: "containment_mere", label: "Containment", w: 140 },
  { key: "dispozicija", label: "Dispozicija", w: 90 },
  { key: "odobrio_dispoziciju", label: "Odobrio disp.", w: 90 },
  { key: "osmd_pokrenut", label: "8D", w: 50, tip: "bool" },
  { key: "osmd_broj", label: "8D broj", w: 90 },
  { key: "pfmea_revizija", label: "PFMEA rev.", w: 80 },
  { key: "cp_revizija", label: "CP rev.", w: 80 },
  { key: "odgovoran", label: "Odgovoran", w: 90 },
  { key: "rok", label: "Rok", w: 90, tip: "date" },
  { key: "status", label: "Status", w: 110 },
  { key: "verifikacija_efikasnost", label: "Verifikacija", w: 120 },
  { key: "datum_zatvaranja", label: "Datum zatvaranja", w: 100, tip: "date" },
  { key: "sra_zavrseno", label: "SRA", w: 60 },
  { key: "broj_reklamacije", label: "Br. reklamacije", w: 100 },
  { key: "link_obrazac", label: "Link ka fajlu", w: 140, virtual: true },
];

export const NCR_OBAVEZNA = new Set([
  "broj_ncr", "datum_otvaranja", "pogon", "id_deo", "opis", "ozbiljnost", "status",
]);

const REGISTAR_KEYS = REGISTAR_KOLONE.filter((k) => !k.virtual).map((k) => k.key);

export const PROSIRENJE_POLJA = {
  operacija: "",
  smena_obrazac: "",
  serija_batch: "",
  operater: "",
  materijal_lot: "",
  prvi_sumnjivi: "",
  poslednji_dobar: "",
  datum_vreme_detekcije: "",
  dobavljac: "",
  kontrolni_dokument: "",
  revizija_dokumenta: "",
  broj_crteza: "",
  merna_oprema: "",
  detekcija: "",
  lokacija_pozicija: "",
  dokaz_zapis: "",
  containment_mera_2: "",
  containment_odg_1: "",
  containment_odg_2: "",
  stop_production: "",
  vreme_zaustavljanja: "",
  izdvojena_kolicina: "",
  lokacija_karantina: "",
  sortiranje: "",
  obavesten_kupac: "",
  datum_obavestenja: "",
  datum_dispozicije: "",
  kolicina_dorada: "",
  kolicina_skart: "",
  dispozicija_odgovoran: "",
  prihvaceno_odstupanjem: "",
  odobrenje_broj: "",
  root_cause_potvrden: "",
  razlog_osmd: "",
  pfmea_azuriran: "",
  cp_azuriran: "",
  preventivna_akcija: "",
  povezani_ncr: "",
  sra_linije: "",
  sra_delovi: "",
  sra_rezultat: "",
  sra_akcije: "",
  sra_odgovoran: "",
  sra_datum: "",
  odgovorno_lice: "",
  odgovorno_datum: "",
  kontrola_kvaliteta: "",
  kontrola_kvaliteta_datum: "",
  verifikacija_datum: "",
  lekcije_naucene: "",
  odobrenje_zatvaranja: "",
  trosak_skarta: "",
  karakteristika_klasa: "",
};

export function labelStatusa(status) {
  return NCR_STATUS_EXCEL.find(([v]) => v === status)?.[1] || status || "OPEN";
}

export function danasIso() {
  return new Date().toISOString().slice(0, 10);
}

export function praznaNcrForma() {
  return {
    broj_ncr: "",
    datum_otvaranja: danasIso(),
    pogon: "",
    linija: "",
    masina: "",
    radni_nalog: "",
    id_deo: "",
    naziv_dela: "",
    kupac: "",
    opis: "",
    karakteristika: "",
    zahtev_spec: "",
    izmerena_vrednost: "",
    kolicina_proizvedena: "",
    kolicina_sumnjiva: "",
    kolicina_neispravna: "",
    tip_greske: "",
    kategorija_6m: "",
    ozbiljnost: "Medium",
    ponavljanje: "NE",
    prethodni_ncr: "",
    uticaj_kupca: "NE",
    detektovao: "",
    metoda_detekcije: "",
    datum_containment: "",
    containment_mere: "",
    dispozicija: "",
    odobrio_dispoziciju: "",
    osmd_pokrenut: false,
    osmd_broj: "",
    pfmea_revizija: "",
    cp_revizija: "",
    odgovoran: "",
    rok: "",
    status: "open",
    verifikacija_efikasnost: "",
    datum_zatvaranja: "",
    sra_zavrseno: "NE",
    broj_reklamacije: "",
    serija: "",
    vin: "",
    prioritet: "normalan",
    izvor: "rucno",
    ...PROSIRENJE_POLJA,
  };
}

export function ncrIzBaze(row) {
  if (!row) return praznaNcrForma();
  const pros = typeof row.ncr_prosirenje === "object" && row.ncr_prosirenje ? row.ncr_prosirenje : {};
  const forma = { ...praznaNcrForma(), ...pros, id: row.id, osmd_id: row.osmd_id || null };
  for (const k of REGISTAR_KEYS) {
    if (row[k] !== undefined && row[k] !== null) {
      if (k === "osmd_pokrenut") forma[k] = !!row[k];
      else if (["kolicina_proizvedena", "kolicina_sumnjiva", "kolicina_neispravna"].includes(k)) {
        forma[k] = row[k] ?? "";
      } else if (["datum_otvaranja", "datum_containment", "rok", "datum_zatvaranja"].includes(k)) {
        forma[k] = row[k] ? String(row[k]).slice(0, 10) : "";
      } else {
        forma[k] = row[k] ?? "";
      }
    }
  }
  if (!forma.datum_otvaranja && row.created_at) {
    forma.datum_otvaranja = String(row.created_at).slice(0, 10);
  }
  if (!forma.serija_batch && row.serija) forma.serija_batch = row.serija;
  if (row.uzrok && !forma.root_cause_potvrden) forma.root_cause_potvrden = row.uzrok;
  if (row.korektivna && !forma.containment_mere) forma.containment_mere = row.korektivna;
  if (row.verifikacija && !forma.verifikacija_efikasnost) forma.verifikacija_efikasnost = row.verifikacija;
  return forma;
}

/** Predlog NCR iz konteksta Modula 1 (unos na liniji). */
export function prefillNcrIzUnosaLinije(ctx = {}) {
  const pogon = String(ctx.pogon || ctx.pogonKod || "").trim();
  const opisDelovi = [ctx.opis, ctx.defekt, ctx.kategorija, ctx.podkat].filter(Boolean);
  return {
    ...praznaNcrForma(),
    id_deo: String(ctx.id_deo || "").trim().toUpperCase(),
    naziv_dela: ctx.naziv_dela || "",
    pogon,
    linija: "",
    masina: ctx.masina || "",
    radni_nalog: ctx.radni_nalog || "",
    detektovao: ctx.detektovao || ctx.kontrolor || "",
    opis: opisDelovi.join(" — ") || "",
    kolicina_neispravna: ctx.kolicina_neispravna ?? ctx.nok_kolicina ?? "",
    kolicina_proizvedena: ctx.kolicina_proizvedena ?? "",
    karakteristika: ctx.karakteristika || "",
    izmerena_vrednost: ctx.izmerena_vrednost != null ? String(ctx.izmerena_vrednost) : "",
    metoda_detekcije: ctx.modul === "atributivne" ? "Atributivna kontrola na liniji" : "Merljiva kontrola na liniji",
    izvor: "unos_linija",
    prioritet: ctx.prioritet || (ctx.status === "NOK" ? "visok" : "normalan"),
  };
}

export function ncrPayloadZaSnimanje(forma) {
  const pros = { ...PROSIRENJE_POLJA };
  for (const k of Object.keys(PROSIRENJE_POLJA)) {
    if (forma[k] !== undefined) pros[k] = forma[k] ?? "";
  }

  const row = { ncr_prosirenje: pros, updated_at: new Date().toISOString() };
  for (const k of REGISTAR_KEYS) {
    if (forma[k] === undefined) continue;
    if (k === "osmd_pokrenut") {
      row[k] = !!forma[k];
      continue;
    }
    if (["kolicina_proizvedena", "kolicina_sumnjiva", "kolicina_neispravna"].includes(k)) {
      const v = forma[k];
      row[k] = v === "" || v == null ? null : Number(v);
      continue;
    }
    row[k] = forma[k] === "" ? null : forma[k];
  }

  row.serija = forma.serija_batch || forma.serija || null;
  row.vin = forma.vin || null;
  row.smena = forma.smena_obrazac ? Number(forma.smena_obrazac) : null;
  row.prioritet = { Low: "nizak", Medium: "normalan", High: "visok", Critical: "kriticno" }[forma.ozbiljnost] || "normalan";
  row.korektivna = forma.containment_mere || null;
  row.verifikacija = forma.verifikacija_efikasnost || null;
  row.uzrok = forma.root_cause_potvrden || null;

  if (forma.status === "closed") {
    row.zatvoreno_at = new Date().toISOString();
    if (!row.datum_zatvaranja) row.datum_zatvaranja = danasIso();
  }

  return row;
}

export function validirajNcrObrazac(forma) {
  const greske = {};
  if (!String(forma.id_deo || "").trim()) greske.id_deo = "ID dela je obavezan";
  if (!String(forma.opis || "").trim()) greske.opis = "Opis neusaglašenosti je obavezan";
  if (!String(forma.pogon || "").trim()) greske.pogon = "Pogon je obavezan";
  if (!String(forma.ozbiljnost || "").trim()) greske.ozbiljnost = "Ozbiljnost je obavezna";
  if (!String(forma.datum_otvaranja || "").trim()) greske.datum_otvaranja = "Datum otvaranja je obavezan";
  return { ok: Object.keys(greske).length === 0, greske, id_deo: String(forma.id_deo || "").trim().toUpperCase(), opis: String(forma.opis || "").trim() };
}

export function vrednostRegistra(row, key) {
  if (!row) return "—";
  if (key === "link_obrazac") {
    return row.broj_ncr ? putanjaNcrObrazacExcel(row.broj_ncr) : "—";
  }
  if (key === "status") return labelStatusa(row.status);
  if (key === "osmd_pokrenut") return row.osmd_pokrenut || row.osmd_id ? "DA" : "NE";
  const v = row[key];
  if (v == null || v === "") return "—";
  return String(v);
}

/** Sekcije koje se popunjavaju na liniji (Modul 1). E–H zatvara inženjer u Modulu 2. */
export const NCR_SEKCIJE_LINija = new Set(["A", "B", "C", "D"]);

/** Status pri unosu sa linije — uvek OPEN dok inženjer ne zatvori u Modulu 2. */
export const NCR_STATUS_LINija = "open";

export function ncrPoljeOptsLinija(sekcijaId, opts = {}) {
  if (sekcijaId === "A" && opts.tip === "status") {
    return { ...opts, readOnly: true };
  }
  if (!NCR_SEKCIJE_LINija.has(sekcijaId)) {
    return { ...opts, readOnly: true };
  }
  return opts;
}

export const OBRAZAC_SEKCIJE = [
  {
    id: "A", naslov: "A. OSNOVNI PODACI",
    redovi: [
      [["broj_ncr", "Broj NCR-a", { readOnly: true }], ["datum_otvaranja", "Datum otvaranja", { tip: "date", obavezno: true }], ["status", "Status", { tip: "status", obavezno: true }]],
      [["pogon", "Pogon", { obavezno: true }], ["linija", "Linija"], ["masina", "Mašina"]],
      [["operacija", "Operacija"], ["radni_nalog", "Radni nalog"], ["smena_obrazac", "Smena"]],
      [["id_deo", "ID dela", { obavezno: true }], ["naziv_dela", "Naziv dela"], ["kupac", "Kupac"]],
      [["detektovao", "Detektovao"], ["metoda_detekcije", "Metoda detekcije"], ["ozbiljnost", "Ozbiljnost", { tip: "ozbiljnost", obavezno: true }]],
      [["tip_greske", "Tip greške"], ["kategorija_6m", "Kategorija uzroka (6M)", { tip: "6m" }], ["ponavljanje", "Ponavljanje", { tip: "dane" }]],
      [["prethodni_ncr", "Prethodni NCR"], ["uticaj_kupca", "Uticaj na kupca", { tip: "dane" }], ["broj_reklamacije", "Broj reklamacije"]],
    ],
  },
  {
    id: "B", naslov: "B. SLEDLJIVOST I OBUHVAT",
    redovi: [
      [["serija_batch", "Serija / Batch"], ["operater", "Operater"], ["materijal_lot", "Materijal / lot"]],
      [["kolicina_proizvedena", "Količina proizvedena", { tip: "number" }], ["kolicina_sumnjiva", "Količina sumnjiva", { tip: "number" }], ["kolicina_neispravna", "Količina neispravna", { tip: "number" }]],
      [["prvi_sumnjivi", "Prvi sumnjivi komad"], ["poslednji_dobar", "Poslednji dobar komad"], ["datum_vreme_detekcije", "Datum/vreme detekcije"]],
      [["dobavljac", "Dobavljač"], ["kontrolni_dokument", "Kontrolni dokument"], ["revizija_dokumenta", "Revizija dokumenta"]],
      [["broj_crteza", "Broj crteža / rev."], ["merna_oprema", "Merna oprema / kalibracija"], ["detekcija", "Detekcija"]],
    ],
  },
  {
    id: "C", naslov: "C. OPIS NEUSAGLAŠENOSTI",
    redovi: [
      [["opis", "Opis neusaglašenosti", { tip: "textarea", span: 3, obavezno: true }]],
      [["karakteristika", "Karakteristika"], ["karakteristika_klasa", "Klasa karakteristike (SC/CC)", { tip: "klasa_sc" }], ["zahtev_spec", "Zahtev / specifikacija"]],
      [["izmerena_vrednost", "Izmerena vrednost"], ["lokacija_pozicija", "Lokacija / pozicija"], ["dokaz_zapis", "Dokaz / zapis"]],
    ],
  },
  {
    id: "D", naslov: "D. CONTAINMENT / HITNE MERE",
    redovi: [
      [["containment_mere", "Containment mera 1", { tip: "textarea", span: 2 }], ["containment_odg_1", "Odgovoran"]],
      [["containment_mera_2", "Containment mera 2", { tip: "textarea", span: 2 }], ["containment_odg_2", "Odgovoran"]],
      [["stop_production", "Stop production"], ["vreme_zaustavljanja", "Vreme zaustavljanja"], ["datum_containment", "Datum containment-a", { tip: "date" }]],
      [["izdvojena_kolicina", "Izdvojena količina"], ["lokacija_karantina", "Lokacija karantina"], ["sortiranje", "Sortiranje (ko/rezultat)"]],
      [["obavesten_kupac", "Obavešten kupac / interna f."], ["datum_obavestenja", "Datum obaveštenja", { tip: "date" }], ["", ""]],
    ],
  },
  {
    id: "E", naslov: "E. DISPOZICIJA",
    redovi: [
      [["dispozicija", "Dispozicija"], ["odobrio_dispoziciju", "Odobrio dispoziciju"], ["datum_dispozicije", "Datum dispozicije", { tip: "date" }]],
      [["kolicina_dorada", "Količina za doradu"], ["kolicina_skart", "Količina za škart"], ["trosak_skarta", "Trošak škarta (€)", { tip: "number" }]],
      [["dispozicija_odgovoran", "Odgovoran"], ["prihvaceno_odstupanjem", "Prihvaćeno sa odstupanjem", { tip: "dane" }], ["odobrenje_broj", "Odobrenje / broj"]],
    ],
  },
  {
    id: "F", naslov: "F. ODLUKA O 8D I VEZE SA SISTEMOM",
    redovi: [
      [["osmd_pokrenut", "8D pokrenut (DA = okidač ispunjen)", { tip: "bool" }], ["osmd_broj", "8D broj"], ["root_cause_potvrden", "Root cause potvrđen"]],
      [["razlog_osmd", "Razlog pokretanja 8D", { tip: "textarea", span: 3 }]],
      [["pfmea_azuriran", "PFMEA ažuriranje", { tip: "dane" }], ["pfmea_revizija", "PFMEA revizija"], ["cp_azuriran", "Control Plan ažuriranje", { tip: "dane" }]],
      [["cp_revizija", "CP revizija"], ["povezani_ncr", "Povezani NCR / reklamacija"], ["preventivna_akcija", "Preventive action (kratko)"]],
    ],
  },
  {
    id: "G", naslov: "G. HORIZONTALNO PROŠIRENJE (SRA)",
    redovi: [
      [["sra_linije", "Proverene linije / mašine", { span: 2 }], ["sra_delovi", "Provereni delovi"]],
      [["sra_rezultat", "Rezultat provere", { tip: "textarea", span: 2 }], ["sra_akcije", "Akcije na drugim mestima"]],
      [["sra_zavrseno", "SRA završen", { tip: "dane" }], ["sra_odgovoran", "Odgovoran za SRA"], ["sra_datum", "Datum SRA", { tip: "date" }]],
    ],
  },
  {
    id: "H", naslov: "H. ODOBRENJE I ZATVARANJE",
    redovi: [
      [["odgovoran", "Odgovorno lice"], ["odgovorno_datum", "Datum", { tip: "date" }], ["", ""]],
      [["kontrola_kvaliteta", "Kontrola kvaliteta"], ["kontrola_kvaliteta_datum", "Datum", { tip: "date" }], ["", ""]],
      [["verifikacija_efikasnost", "Verifikacija efektivnosti", { tip: "textarea", span: 2 }], ["verifikacija_datum", "Datum verifikacije", { tip: "date" }]],
      [["lekcije_naucene", "Lekcije naučene", { tip: "textarea", span: 3 }]],
      [["odobrenje_zatvaranja", "Odobrenje zatvaranja"], ["datum_zatvaranja", "Datum zatvaranja", { tip: "date" }], ["rok", "Rok", { tip: "date" }]],
    ],
  },
];

export function prefill8dIzObrazca(forma) {
  return {
    id_deo: forma.id_deo || "",
    d2_opis_problema: [forma.opis, forma.razlog_osmd ? `\n\nRazlog 8D:\n${forma.razlog_osmd}` : ""].filter(Boolean).join(""),
    d3_privremena: [forma.containment_mere, forma.containment_mera_2].filter(Boolean).join("\n"),
    d4_uzrok: forma.root_cause_potvrden || "",
    d5_korektivna: forma.preventivna_akcija || forma.dispozicija || "",
    d6_implementacija: forma.dispozicija || "",
    d7_prevencija: forma.lekcije_naucene || forma.verifikacija_efikasnost || "",
    broj_reklamacije: forma.broj_reklamacije || forma.broj_ncr || "",
    kupac_ime_id: forma.kupac || "",
    ncr_id: forma.id || null,
  };
}
