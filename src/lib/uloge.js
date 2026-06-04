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

/** Operator: samo unos + log. Kontrolor: + karte, smena. Kvalitet/admin: sve. */
const TAB_MERLJIVE_OPERATOR = new Set(["unos", "log"]);
const TAB_MERLJIVE_KONTROLOR = new Set([
  "unos", "log", "karte", "smena", "oee", "heatmap",
]);
const TAB_ATRIB_OPERATOR = new Set(["unos"]);
const TAB_ATRIB_KONTROLOR = new Set([
  "unos", "log", "dashboard", "karte", "crtez", "foto", "oee",
]);

export function mozeTabMerljive(tab, uloga) {
  const t = String(tab || "").toLowerCase();
  if (jeAdmin(uloga) || jeKvalitetIliVise(uloga)) return true;
  const u = normalizujUlogu(uloga);
  if (u === "operator") return TAB_MERLJIVE_OPERATOR.has(t);
  return TAB_MERLJIVE_KONTROLOR.has(t);
}

export function mozeTabAtributivne(tab, uloga) {
  const t = String(tab || "").toLowerCase();
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

export function opisUloge(uloga) {
  const u = normalizujUlogu(uloga);
  if (u === "admin") return "Pun pristup + admin";
  if (u === "kvalitet" || u === "sef") return "Analitika, izveštaji, trasabilitet";
  if (u === "operator") return "Samo unos i log";
  return "Unos, karte, smena";
}
