const FILTER_KEY = "spc_analitika_filter_v1";

export function ucitajAnalitikaFilterSesija() {
  try {
    const raw = sessionStorage.getItem(FILTER_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return null;
    return {
      period: o.period ?? "7",
      smena: o.smena ?? "",
      idDeo: o.idDeo ?? "",
      linija: o.linija ?? "",
      pozicija: o.pozicija ?? "",
    };
  } catch {
    return null;
  }
}

export function snimiAnalitikaFilterSesija(filter) {
  if (!filter) return;
  try {
    sessionStorage.setItem(FILTER_KEY, JSON.stringify({
      period: filter.period ?? "7",
      smena: filter.smena ?? "",
      idDeo: filter.idDeo ?? "",
      linija: filter.linija ?? "",
      pozicija: filter.pozicija ?? "",
    }));
  } catch { /* ignore */ }
}

export function tabSesijaKey(modul) {
  return `spc_analitika_tab_${modul || "atributivne"}`;
}

export function ucitajAnalitikaTab(modul) {
  try {
    return sessionStorage.getItem(tabSesijaKey(modul)) || "";
  } catch {
    return "";
  }
}

export function snimiAnalitikaTab(modul, tab) {
  if (!tab) return;
  try {
    sessionStorage.setItem(tabSesijaKey(modul), String(tab));
  } catch { /* ignore */ }
}
