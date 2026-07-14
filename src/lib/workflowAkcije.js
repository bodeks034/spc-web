/** Workflow navigacija — jedan klik iz alarma / vodiča u pravi modul / tab. */

import { sacuvajNavigacijuNcr, sacuvajNavigaciju8d } from "./eskalacijeHelper.js";
import { prefill8dIzNcr } from "./ncrCapa.js";
import { modulZaRouting } from "./deoModul.js";

function tabStorageKey(modul) {
  return modulZaRouting(modul) === "varijabilne" ? "spc_tab_mer" : "spc_tab_atr";
}

function sacuvajCiljniModul(modul) {
  sessionStorage.setItem("spc_workflow_modul", modulZaRouting(modul));
}

/** Očisti stare workflow ključeve pre nove navigacije. */
export function ocistiPendingWorkflowNav() {
  sessionStorage.removeItem("spc_tab_atr");
  sessionStorage.removeItem("spc_tab_mer");
  sessionStorage.removeItem("spc_ncr_prefill");
  sessionStorage.removeItem("spc_8d_prefill");
  sessionStorage.removeItem("spc_workflow_modul");
}

/** Pročitaj pending tab bez brisanja (za inicijalni state). */
export function peekPendingWorkflowTab(modul = "atributivne") {
  const wanted = sessionStorage.getItem("spc_workflow_modul");
  const routing = modulZaRouting(modul);
  if (wanted && wanted !== routing) return null;
  const key = tabStorageKey(modul);
  return sessionStorage.getItem(key) || null;
}

export const WORKFLOW_TIP = {
  NCR: "ncr",
  NCR_IZ_ALARMA: "ncr_alarm",
  KPI_DORADA: "kpi_dorada",
  ODOBRENJA: "odobrenja",
  ESKALACIJE: "eskalacije",
  OSMD_8D: "8d",
  TRASABILITET: "trasabilitet",
  KALIBRACIJA: "kalibracija",
};

const MERILA_PODTAB_KEY = "spc_merila_msa_podtab";

/** Tab za merila/kalibraciju — Modul 2 koristi MSA hub (oba modula). */
export function tabZaMerilaKalibraciju(modul = "atributivne") {
  void modul;
  return "msa";
}

export function sacuvajMerilaMsaPodtab(podtab) {
  if (!podtab) return;
  try {
    sessionStorage.setItem(MERILA_PODTAB_KEY, String(podtab));
  } catch { /* ignore */ }
}

export function procitajMerilaMsaPodtab() {
  try {
    const v = sessionStorage.getItem(MERILA_PODTAB_KEY);
    if (v) sessionStorage.removeItem(MERILA_PODTAB_KEY);
    return v;
  } catch {
    return null;
  }
}

const KPI_HUB_KEY = "spc_kpi_hub";
const SCROLL_KPI_KEY = "spc_scroll_kpi";
const TRASABILITET_KEY = "spc_trasabilitet_filter";
const ESKALACIJE_NAV_KEY = "spc_eskalacije_filter";

export function sacuvajNavigacijuEskalacije({ idDeo = "", statusFilter = "otvoren" } = {}) {
  sessionStorage.setItem(ESKALACIJE_NAV_KEY, JSON.stringify({
    idDeo: String(idDeo || "").trim().toUpperCase(),
    statusFilter: statusFilter || "otvoren",
  }));
}

export function procitajNavigacijuEskalacije() {
  const raw = sessionStorage.getItem(ESKALACIJE_NAV_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    sessionStorage.removeItem(ESKALACIJE_NAV_KEY);
    return data;
  } catch {
    sessionStorage.removeItem(ESKALACIJE_NAV_KEY);
    return null;
  }
}

function priloziKontekstDeo(payload = {}, kontekst = {}) {
  const idDeo = String(
    kontekst.idDeo || payload.idDeo || payload.id_deo || "",
  ).trim().toUpperCase();
  const out = { ...payload };
  if (idDeo) {
    out.idDeo = idDeo;
    out.id_deo = idDeo;
  }
  if (payload.modul) out.modul = payload.modul;
  else if (kontekst.modul) out.modul = kontekst.modul;
  if (kontekst.smena != null && kontekst.smena !== "") out.smena = kontekst.smena;
  if (kontekst.radniNalog) out.radniNalog = kontekst.radniNalog;
  return out;
}

export function sacuvajNavigacijuKpi({
  idDeo,
  datum = "",
  smena = "",
  radniNalog = "",
  modul = "merljive",
} = {}) {
  sessionStorage.setItem(KPI_HUB_KEY, JSON.stringify({
    idDeo: String(idDeo || "").trim().toUpperCase(),
    datum,
    smena: smena != null ? String(smena) : "",
    radniNalog: String(radniNalog || "").trim().toUpperCase(),
    modul,
    ts: Date.now(),
  }));
  sessionStorage.setItem(SCROLL_KPI_KEY, "1");
}

export function procitajNavigacijuKpi() {
  const raw = sessionStorage.getItem(KPI_HUB_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    sessionStorage.removeItem(KPI_HUB_KEY);
    return data;
  } catch {
    sessionStorage.removeItem(KPI_HUB_KEY);
    return null;
  }
}

export function trebaSkrolKpiHub() {
  const v = sessionStorage.getItem(SCROLL_KPI_KEY) === "1";
  if (v) sessionStorage.removeItem(SCROLL_KPI_KEY);
  return v;
}

export function sacuvajNavigacijuTrasabilitet({ idDeo, vinLot = "", datumOd = "", datumDo = "", modul = "atributivne" } = {}) {
  sessionStorage.setItem(TRASABILITET_KEY, JSON.stringify({
    idDeo: String(idDeo || "").trim().toUpperCase(),
    vinLot: String(vinLot || "").trim(),
    datumOd,
    datumDo,
  }));
  const key = tabStorageKey(modul);
  sessionStorage.setItem(key, "trasabilitet");
  sacuvajCiljniModul(modul);
}

export function procitajNavigacijuTrasabilitet() {
  const raw = sessionStorage.getItem(TRASABILITET_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    sessionStorage.removeItem(TRASABILITET_KEY);
    return data;
  } catch {
    sessionStorage.removeItem(TRASABILITET_KEY);
    return null;
  }
}

/** Mapiranje operativnog alarma → workflow akcija (deterministički po id). */
export function akcijaZaOperativniAlarm(alarm, kontekst = {}) {
  const id = String(alarm?.id || "").toLowerCase();
  const ctx = {
    modul: kontekst.modul || "atributivne",
    idDeo: kontekst.idDeo || "",
    smena: kontekst.smena,
    radniNalog: kontekst.radniNalog,
  };

  if (id.startsWith("eskalacije")) {
    return {
      akcija: WORKFLOW_TIP.ESKALACIJE,
      label: "Eskalacije",
      payload: priloziKontekstDeo({
        modul: ctx.modul,
        statusFilter: "otvoren",
      }, ctx),
    };
  }
  if (id.startsWith("msa_")) {
    return {
      akcija: WORKFLOW_TIP.KALIBRACIJA,
      label: "MSA / merila",
      payload: priloziKontekstDeo({ modul: "merljive", merilaPodtab: "msa" }, ctx),
    };
  }
  if (id.startsWith("kal_")) {
    return {
      akcija: WORKFLOW_TIP.KALIBRACIJA,
      label: "Merila / kalibracija",
      payload: priloziKontekstDeo({ merilaPodtab: "kalibracija" }, ctx),
    };
  }
  if (id === "oee_nizak") {
    return {
      akcija: WORKFLOW_TIP.KPI_DORADA,
      label: "KPI / OEE",
      payload: priloziKontekstDeo({ modul: "merljive" }, ctx),
    };
  }
  if (id.startsWith("deo_nok_")) {
    const deoId = id.replace("deo_nok_", "").toUpperCase();
    const modulDeo = String(alarm.opis || "").toLowerCase().includes("merljive")
      ? "merljive" : "atributivne";
    return {
      akcija: WORKFLOW_TIP.NCR_IZ_ALARMA,
      label: "Otvori NCR",
      payload: priloziKontekstDeo({
        ...prefillNcrIzOperativnogAlarma({ ...alarm, id_deo: deoId }),
        modul: modulDeo,
      }, { ...ctx, idDeo: ctx.idDeo || deoId }),
    };
  }
  if (id === "nok_danas" || id.includes("spc") || id.includes("karantin")) {
    return {
      akcija: WORKFLOW_TIP.NCR_IZ_ALARMA,
      label: "Otvori NCR",
      payload: priloziKontekstDeo(prefillNcrIzOperativnogAlarma(alarm), ctx),
    };
  }
  if (id.includes("kpi") || id.includes("dorada") || id.includes("neus")) {
    return {
      akcija: WORKFLOW_TIP.KPI_DORADA,
      label: "KPI dorada",
      payload: priloziKontekstDeo({
        idDeo: alarm.id_deo || alarm.meta?.id_deo,
        smena: alarm.smena || alarm.meta?.smena,
        radniNalog: alarm.radni_nalog || alarm.meta?.radni_nalog,
        modul: alarm.modul || "merljive",
      }, ctx),
    };
  }
  if (id === "offline") {
    return {
      akcija: WORKFLOW_TIP.ODOBRENJA,
      label: "Odobrenja QA",
      payload: priloziKontekstDeo({}, ctx),
    };
  }
  if (alarm.nivo === "kriticno" || alarm.nivo === "visok") {
    return {
      akcija: WORKFLOW_TIP.NCR_IZ_ALARMA,
      label: "Otvori NCR",
      payload: priloziKontekstDeo(prefillNcrIzOperativnogAlarma(alarm), ctx),
    };
  }
  return {
    akcija: WORKFLOW_TIP.ODOBRENJA,
    label: "Odobrenja QA",
    payload: priloziKontekstDeo({}, ctx),
  };
}

/** Sačuvaj tab za otvaranje posle ulaska u modul. */
export function sacuvajSpoljnuNavigacijuTab(tab, { prefillNcr, modul = "atributivne" } = {}) {
  ocistiPendingWorkflowNav();
  const key = tabStorageKey(modul);
  sessionStorage.setItem(key, tab);
  sacuvajCiljniModul(modul);
  if (prefillNcr && tab === "ncr") {
    sessionStorage.setItem("spc_ncr_prefill", JSON.stringify(prefillNcr));
  }
}

/** Učitaj sačuvani tab za dati modul. */
export function procitajSpoljnuNavigacijuTab(modul = "atributivne") {
  const wanted = sessionStorage.getItem("spc_workflow_modul");
  const routing = modulZaRouting(modul);
  if (wanted && wanted !== routing) return { tab: null, prefillNcr: null };

  const key = tabStorageKey(modul);
  const tab = sessionStorage.getItem(key);
  if (tab) sessionStorage.removeItem(key);
  sessionStorage.removeItem("spc_workflow_modul");

  let prefillNcr = null;
  if (tab === "ncr") {
    const raw = sessionStorage.getItem("spc_ncr_prefill");
    if (raw) {
      sessionStorage.removeItem("spc_ncr_prefill");
      try { prefillNcr = JSON.parse(raw); } catch { prefillNcr = null; }
    }
  } else {
    sessionStorage.removeItem("spc_ncr_prefill");
  }
  return { tab, prefillNcr };
}

/** Predlog NCR iz operativnog / SPC alarma. */
export function prefillNcrIzOperativnogAlarma(alarm) {
  if (!alarm) return {};
  return {
    id_deo: alarm.id_deo || alarm.meta?.id_deo || "",
    radni_nalog: alarm.radni_nalog || alarm.meta?.radni_nalog || "",
    opis: alarm.opis || alarm.naslov || "",
    prioritet: alarm.nivo === "kriticno" || alarm.nivo === "visok" ? "visok" : "normalan",
    izvor: "operativni_alarm",
  };
}

/** Izvrši workflow akciju (sa početnog ekrana ili dashboarda). */
export function izvrsiWorkflowAkciju(tip, payload = {}, handlers = {}) {
  const {
    onOtvoriNcr,
    onOtvori8D,
    onOtvoriModul,
    onNavigacija,
    onSkrolKpi,
    onKpiDorada,
  } = handlers;

  const ciljniModul = modulZaRouting(payload.modul || "atributivne");

  const navigirajTab = (tab, extra = {}) => {
    if (onNavigacija) {
      onNavigacija({ tab, modul: ciljniModul, ...extra });
      return true;
    }
    return false;
  };

  switch (tip) {
    case WORKFLOW_TIP.NCR:
    case WORKFLOW_TIP.NCR_IZ_ALARMA:
      sacuvajNavigacijuNcr(payload, ciljniModul);
      if (onOtvoriNcr) {
        onOtvoriNcr(payload, { modul: ciljniModul });
      } else if (!navigirajTab("ncr", { prefillNcr: payload })) {
        onOtvoriModul?.(ciljniModul);
      }
      break;
    case WORKFLOW_TIP.KPI_DORADA:
      sacuvajNavigacijuKpi(payload);
      if (onKpiDorada) onKpiDorada(payload);
      else onSkrolKpi?.();
      break;
    case WORKFLOW_TIP.OSMD_8D:
      sacuvajNavigaciju8d(payload.ncr ? prefill8dIzNcr(payload.ncr) : payload, ciljniModul);
      if (onOtvori8D) onOtvori8D(payload, { modul: ciljniModul });
      else onOtvoriModul?.(ciljniModul);
      break;
    case WORKFLOW_TIP.TRASABILITET:
      sacuvajNavigacijuTrasabilitet({ ...payload, modul: ciljniModul });
      if (!navigirajTab("trasabilitet")) onOtvoriModul?.(ciljniModul);
      break;
    case WORKFLOW_TIP.ESKALACIJE:
      sacuvajNavigacijuEskalacije({
        idDeo: payload.idDeo || payload.id_deo,
        statusFilter: payload.statusFilter || "otvoren",
      });
      sacuvajSpoljnuNavigacijuTab("eskalacije", { modul: ciljniModul });
      if (!navigirajTab("eskalacije")) onOtvoriModul?.(ciljniModul);
      break;
    case WORKFLOW_TIP.ODOBRENJA:
      sacuvajSpoljnuNavigacijuTab("odobrenja", { modul: ciljniModul });
      if (!navigirajTab("odobrenja")) onOtvoriModul?.(ciljniModul);
      break;
    case WORKFLOW_TIP.KALIBRACIJA: {
      const kalTab = tabZaMerilaKalibraciju(ciljniModul);
      if (payload.merilaPodtab) sacuvajMerilaMsaPodtab(payload.merilaPodtab);
      sacuvajSpoljnuNavigacijuTab(kalTab, { modul: ciljniModul });
      if (!navigirajTab(kalTab)) onOtvoriModul?.(ciljniModul);
      break;
    }
    default:
      break;
  }
}
