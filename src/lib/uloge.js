/** Uloge i pristup ekranima (operator / kontrolor / admin). */

export function normalizujUlogu(uloga) {
  const u = String(uloga || "kontrolor").toLowerCase().trim();
  if (["admin", "kontrolor", "operator", "kvalitet", "sef"].includes(u)) return u;
  return "kontrolor";
}

export function jeAdmin(uloga) {
  return normalizujUlogu(uloga) === "admin";
}

export function jeKvalitetIliVise(uloga) {
  const u = normalizujUlogu(uloga);
  return u === "admin" || u === "kvalitet" || u === "sef";
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

export function pocetniKorakUnosAtr(uloga, rezimRada, { voziloMode = false } = {}) {
  if (voziloMode) return "forma";
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
const TAB_LINIJA_MERLJIVE_OPERATOR = new Set(["unos"]);
const TAB_LINIJA_MERLJIVE_KONTROLOR = new Set(["unos", "log"]);

/** Operator: samo unos + log. Kontrolor: + karte, smena. Kvalitet/admin: sve. */
const TAB_MERLJIVE_OPERATOR = new Set(["unos", "log"]);
const TAB_MERLJIVE_KONTROLOR = new Set([
  "unos", "log", "karte", "smena", "oee", "heatmap", "msa", "kplan",
]);
const TAB_ATRIB_OPERATOR = new Set(["unos"]);
const TAB_ATRIB_KONTROLOR = new Set([
  "unos", "log", "dashboard", "karte", "crtez", "foto", "oee",
]);

export function mozeTabMerljive(tab, uloga, rezimRada = "analitika") {
  const t = String(tab || "").toLowerCase();
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

export function podrazumevaniTabMerljive(uloga) {
  return "unos";
}

export function podrazumevaniTabAtributivne(uloga) {
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
