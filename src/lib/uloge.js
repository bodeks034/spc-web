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

/** Podrazumevani režim po ulozi */
export function podrazumevaniRezim(uloga) {
  return jeLinijaUloga(uloga) ? "linija" : "analitika";
}

/** Ko može da bira Modul 1 ↔ Modul 2 (inženjer / menadžment / admin) */
export function mozePrebacivanjeRezima(uloga) {
  return mozeAnalitika(uloga);
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
  "unos", "log", "karte", "smena", "oee", "heatmap",
]);
const TAB_ATRIB_OPERATOR = new Set(["unos"]);
const TAB_ATRIB_KONTROLOR = new Set([
  "unos", "log", "dashboard", "karte", "crtez", "foto", "oee",
]);

export function mozeTabMerljive(tab, uloga, rezimRada = "analitika") {
  const t = String(tab || "").toLowerCase();
  if (rezimRada === "linija") {
    const u = normalizujUlogu(uloga);
    if (u === "operator") return TAB_LINIJA_MERLJIVE_OPERATOR.has(t);
    return TAB_LINIJA_MERLJIVE_KONTROLOR.has(t);
  }
  if (jeAdmin(uloga) || jeKvalitetIliVise(uloga)) return true;
  const u = normalizujUlogu(uloga);
  if (u === "operator") return TAB_MERLJIVE_OPERATOR.has(t);
  return TAB_MERLJIVE_KONTROLOR.has(t);
}

export function mozeTabAtributivne(tab, uloga, rezimRada = "analitika") {
  const t = String(tab || "").toLowerCase();
  if (rezimRada === "linija") {
    const u = normalizujUlogu(uloga);
    if (u === "operator") return TAB_LINIJA_ATRIB_OPERATOR.has(t);
    return TAB_LINIJA_ATRIB_KONTROLOR.has(t);
  }
  if (jeAdmin(uloga)) return true;
  if (jeKvalitetIliVise(uloga)) return t !== "admin";
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
  if (u === "admin") return "Pun pristup + admin";
  if (u === "kvalitet" || u === "sef") return "Analitika, izveštaji, trasabilitet";
  if (u === "operator") return "Samo unos i log";
  return "Unos, karte, smena";
}
