/** Uloge i pristup ekranima (operator / kontrolor / admin). */

export function normalizujUlogu(uloga) {
  const u = String(uloga || "kontrolor").toLowerCase().trim();
  if (["admin", "kontrolor", "operator", "kvalitet", "sef"].includes(u)) return u;
  return "kontrolor";
}

/** Ko može odobriti FAI (NOK zahteva kvalitet / admin / šef). */
export function mozeOdobritiFai(uloga, { imaNok = false } = {}) {
  if (jeKvalitetIliVise(uloga) || jeAdmin(uloga)) return true;
  const u = normalizujUlogu(uloga);
  if (u === "kontrolor" && !imaNok) return true;
  return false;
}

/** Tab / panel FAI odobrenja. */
export function mozePregledFaiOdobrenja(uloga) {
  return mozeOdobritiFai(uloga) || normalizujUlogu(uloga) === "kontrolor";
}

export function jeAdmin(uloga) {
  return normalizujUlogu(uloga) === "admin";
}

export function jeKvalitetIliVise(uloga) {
  const u = normalizujUlogu(uloga);
  return u === "admin" || u === "kvalitet" || u === "sef";
}

/** Tabovi samo za Modul 1 — ne prikazivati u Modulu 2 (analitika). */
const TAB_BLOKIRANI_ANALITIKA = new Set(["unos", "crtez", "foto", "log"]);

export function jeTabBlokiranAnalitika(tab) {
  return TAB_BLOKIRANI_ANALITIKA.has(String(tab || "").toLowerCase());
}

/** Operator ili kontrolor na liniji */
export function jeLinijaUloga(uloga) {
  const u = normalizujUlogu(uloga);
  return u === "operator" || u === "kontrolor";
}

/** Inženjer / menadžment / admin — pun pristup analitici */
export function mozeAnalitika(uloga) {
  return jeKvalitetIliVise(uloga) || jeAdmin(uloga);
}

/** Početni ekran — pregled proizvodnje i KPI dorada (kvalitet / šef / admin). */
export function mozePocetniPregledProizvodnje(uloga) {
  return mozeAnalitika(uloga);
}

/** Upozorenje o nedostajućim migracijama — kvalitet / šef / admin. */
export function mozePregledSemeAlarm(uloga) {
  return jeKvalitetIliVise(uloga);
}

/** Kontrolor — samo operativni alarmi na početku (bez KPI dashboarda). */
export function mozeLinijaAlarmiPocetna(uloga) {
  return normalizujUlogu(uloga) === "kontrolor";
}

/** Podrazumevani režim po ulozi — Modul 1 (linija); Modul 2 biraju na početnom ekranu. */
export function podrazumevaniRezim(uloga) {
  return "linija";
}

/** Ko može da bira Modul 1 ↔ Modul 2 (inženjer / menadžment / admin) — samo na početnom ekranu. */
export function mozePrebacivanjeRezima(uloga) {
  return mozeAnalitika(uloga);
}

/** Prebacivanje režima iz trake modula (atributivne/merljive) — isključeno; samo početni ekran. */
export function mozePrebacivanjeRezimaUTacci(uloga) {
  return false;
}

/** Stanje · predikcija · korektivne mere · eskalacija iz predloga — samo inženjer / šef / admin */
export function mozeInteligencijaProcesa(uloga) {
  return mozeAnalitika(uloga);
}

/** Šifrarnik modul — samostalan (inženjer / kvalitet / šef / admin). */
export function mozeSifrarnik(uloga) {
  return jeKvalitetIliVise(uloga) || jeAdmin(uloga);
}

/** Modul 2 — NCR/CAPA — kvalitet / šef / admin. */
export function mozeNcrCapa(uloga) {
  return jeKvalitetIliVise(uloga);
}

/** Modul 2 — tab Odobrenja QA (SPC alarmi, prekidi, kalibracija) — kvalitet / šef / admin. */
export function mozeOdobrenjaQA(uloga) {
  return jeKvalitetIliVise(uloga);
}

/** Modul 2 — Excel izvoz za inženjera / šefa (bez admin panela). */
export function mozeInzenjerExcel(uloga, rezimRada = "analitika") {
  if (rezimRada === "linija") return false;
  const u = normalizujUlogu(uloga);
  return u === "kvalitet" || u === "sef";
}

/** Ograničen uvoz — samo karakteristike_merljive, samo inženjer (kvalitet). */
export function mozeInzenjerExcelUvoz(uloga, rezimRada = "analitika") {
  if (!mozeInzenjerExcel(uloga, rezimRada)) return false;
  return normalizujUlogu(uloga) === "kvalitet";
}

/** Kontrolor na liniji — prošireni tok pre poka-yoke */
export function jeKontrolorLinija(uloga, rezimRada) {
  return rezimRada === "linija" && normalizujUlogu(uloga) === "kontrolor";
}

export function pocetniKorakUnosAtr(_uloga, _rezimRada, _opts = {}) {
  return "poka";
}

export function pocetniKorakUnosMer() {
  return "poka";
}

/** Kontrolor/operator uvek linija; ostali po izboru */
export function efektivniRezimRada(uloga, izabraniRezim = "linija") {
  if (jeLinijaUloga(uloga)) return "linija";
  return izabraniRezim === "analitika" ? "analitika" : "linija";
}

const TAB_LINIJA_ATRIB_OPERATOR = new Set(["unos"]);
const TAB_LINIJA_ATRIB_KONTROLOR = new Set(["unos", "log"]);
const TAB_LINIJA_MERLJIVE_OPERATOR = new Set(["unos", "moment"]);
const TAB_LINIJA_MERLJIVE_KONTROLOR = new Set(["unos", "moment", "log", "fai"]);

/** Operator: samo unos + log. Kontrolor: + karte, smena. Kvalitet/admin: sve. */
const TAB_MERLJIVE_OPERATOR = new Set(["unos", "log"]);
const TAB_MERLJIVE_KONTROLOR = new Set([
  "unos", "log", "karte", "smena", "oee", "heatmap", "msa", "kplan", "fai",
]);
const TAB_ATRIB_OPERATOR = new Set(["unos"]);
const TAB_ATRIB_KONTROLOR = new Set([
  "unos", "log", "dashboard", "karte", "crtez", "foto", "oee", "msa", "kplan",
]);

export function mozeTabMerljive(tab, uloga, rezimRada = "analitika") {
  const t = String(tab || "").toLowerCase();
  if (rezimRada === "analitika" && jeTabBlokiranAnalitika(t)) return false;
  if (rezimRada === "analitika" && t === "admin") return false;
  if (t === "pregled" && rezimRada === "analitika") return mozeAnalitika(uloga);
  if (t === "odobrenja") return mozeOdobrenjaQA(uloga) && rezimRada === "analitika";
  if (t === "ncr") return mozeNcrCapa(uloga) && rezimRada === "analitika";
  if (t === "fai" && !mozePregledFaiOdobrenja(uloga)) return false;
  if (t === "excel") return mozeInzenjerExcel(uloga, rezimRada);
  if (t === "stanje" && !mozeInteligencijaProcesa(uloga)) return false;
  if (rezimRada !== "linija" && (jeAdmin(uloga) || jeKvalitetIliVise(uloga))) return true;
  if (rezimRada === "linija") {
    const u = normalizujUlogu(uloga);
    if (u === "operator") return TAB_LINIJA_MERLJIVE_OPERATOR.has(t);
    return TAB_LINIJA_MERLJIVE_KONTROLOR.has(t);
  }
  const u = normalizujUlogu(uloga);
  if (u === "operator") return TAB_MERLJIVE_OPERATOR.has(t);
  return TAB_MERLJIVE_KONTROLOR.has(t);
}

export function mozeTabAtributivne(tab, uloga, rezimRada = "analitika") {
  const t = String(tab || "").toLowerCase();
  if (rezimRada === "analitika" && jeTabBlokiranAnalitika(t)) return false;
  if (rezimRada === "analitika" && t === "admin") return false;
  if (t === "pregled" && rezimRada === "analitika") return mozeAnalitika(uloga);
  if (t === "odobrenja") return mozeOdobrenjaQA(uloga) && rezimRada === "analitika";
  if (t === "ncr") return mozeNcrCapa(uloga) && rezimRada === "analitika";
  if (t === "fai" && !mozePregledFaiOdobrenja(uloga)) return false;
  if (t === "excel") return mozeInzenjerExcel(uloga, rezimRada);
  if (t === "stanje" && !mozeInteligencijaProcesa(uloga)) return false;
  if (rezimRada !== "linija" && jeAdmin(uloga)) return true;
  if (rezimRada !== "linija" && jeKvalitetIliVise(uloga)) return t !== "admin";
  if (rezimRada === "linija") {
    const u = normalizujUlogu(uloga);
    if (u === "operator") return TAB_LINIJA_ATRIB_OPERATOR.has(t);
    return TAB_LINIJA_ATRIB_KONTROLOR.has(t);
  }
  const u = normalizujUlogu(uloga);
  if (u === "operator") return TAB_ATRIB_OPERATOR.has(t);
  return TAB_ATRIB_KONTROLOR.has(t);
}

export function podrazumevaniTabMerljive(uloga, rezimRada = "linija") {
  if (rezimRada === "analitika" && mozeAnalitika(uloga)) return "pregled";
  return "unos";
}

export function podrazumevaniTabAtributivne(uloga, rezimRada = "linija") {
  if (rezimRada === "analitika" && mozeAnalitika(uloga)) return "pregled";
  return "unos";
}

export function opisUloge(uloga, rezimRada) {
  const u = normalizujUlogu(uloga);
  if (rezimRada === "linija") {
    if (u === "operator") return "Modul linija — unos merenja";
    return "Modul linija — unos i log";
  }
  if (u === "admin") return rezimRada === "linija" ? "Modul linija — unos i log" : "Pun pristup + admin";
  if (u === "kvalitet" || u === "sef") {
    return rezimRada === "linija" ? "Modul linija — unos i log" : "Analitika, izveštaji, trasabilitet";
  }
  if (u === "operator") return "Samo unos i log";
  return "Unos, karte, smena";
}
