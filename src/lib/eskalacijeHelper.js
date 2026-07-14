/** Pomoćne funkcije za eskalacije, dodelu inženjera i prefill 8D. */

import { nacrtU8dEditorPrefill } from "./osmdWordPrimeri.js";
import { prefill8dIzNcr } from "./ncrCapa.js";

const ULOGE_INZENJER = new Set(["kvalitet", "sef", "admin"]);
const OTVORENE_STATUS = new Set(["otvoren", "u_toku", "aktivan", "open"]);

export function prefill8dIzEskalacije(e) {
  if (!e) return {};
  const opis = String(e.opis || "")
    .replace(/^INTEL:\s*/i, "")
    .replace(/^AUTO[^:]*:\s*/i, "")
    .trim();
  const korektivna = e.korektivna_akcija || "";
  return {
    id_deo: e.id_deo || "",
    opis: opis || e.opis || "",
    d3_privremena_akcija: korektivna,
    d5_korektivna: korektivna,
  };
}

/** Eskalacija (kratak prefill) ili pun nacrt iz SPC asistenta / NCR. */
export function normalizujPrefill8d(e) {
  if (!e) return {};
  if (e.ncr_id || e.broj_reklamacije?.startsWith?.("NCR-")) {
    return {
      ...prefill8dIzNcr(e),
      ncr_id: e.ncr_id || e.id || null,
    };
  }
  if (e._asistent || e.d4_uzrok || e.d6_implementacija || e.d7_prevencija || e.lesson_learned) {
    return nacrtU8dEditorPrefill(e);
  }
  if (e.pfmea_ref || e.control_plan_ref) {
    return {
      id_deo: e.id_deo || "",
      defekt_nedostatak: e.defekt_nedostatak || "",
      pfmea_ref: e.pfmea_ref || "",
      control_plan_ref: e.control_plan_ref || "",
      opis: e.opis || e.defekt_nedostatak || "",
    };
  }
  return prefill8dIzEskalacije(e);
}

export function sacuvajNavigacijuNcr(prefill = {}, modul = "atributivne") {
  sessionStorage.removeItem("spc_tab_atr");
  sessionStorage.removeItem("spc_tab_mer");
  sessionStorage.removeItem("spc_8d_prefill");
  sessionStorage.removeItem("spc_workflow_modul");
  sessionStorage.setItem("spc_ncr_prefill", JSON.stringify(prefill));
  const key = modul === "varijabilne" ? "spc_tab_mer" : "spc_tab_atr";
  sessionStorage.setItem(key, "ncr");
  sessionStorage.setItem("spc_workflow_modul", modul === "varijabilne" ? "varijabilne" : "atributivne");
}

export function procitajNavigacijuNcr(modul = "atributivne") {
  const key = modul === "varijabilne" ? "spc_tab_mer" : "spc_tab_atr";
  const tab = sessionStorage.getItem(key);
  if (tab !== "ncr") return { tab: null, prefill: null };
  sessionStorage.removeItem(key);
  const raw = sessionStorage.getItem("spc_ncr_prefill");
  if (raw) sessionStorage.removeItem("spc_ncr_prefill");
  let prefill = null;
  if (raw) {
    try { prefill = JSON.parse(raw); } catch { prefill = null; }
  }
  sessionStorage.removeItem("spc_workflow_modul");
  return { tab, prefill };
}

export function sacuvajNavigaciju8d(prefill, modul = "atributivne") {
  sessionStorage.setItem("spc_8d_prefill", JSON.stringify(prefill8dIzEskalacije(prefill)));
  const key = modul === "varijabilne" ? "spc_tab_mer" : "spc_tab_atr";
  sessionStorage.setItem(key, "8d");
  sessionStorage.setItem("spc_workflow_modul", modul === "varijabilne" ? "varijabilne" : "atributivne");
}

export function procitajNavigaciju8d(modul = "atributivne") {
  const key = modul === "varijabilne" ? "spc_tab_mer" : "spc_tab_atr";
  const tab = sessionStorage.getItem(key);
  if (tab !== "8d") return { tab: null, prefill: null };
  sessionStorage.removeItem(key);
  const raw = sessionStorage.getItem("spc_8d_prefill");
  if (raw) sessionStorage.removeItem("spc_8d_prefill");
  let prefill = null;
  if (raw) {
    try { prefill = JSON.parse(raw); } catch { prefill = null; }
  }
  sessionStorage.removeItem("spc_workflow_modul");
  return { tab, prefill };
}

/** Preferira kvalitet → sef → admin; balansira otvorene eskalacije. */
export function izaberiDodeljenogInzenjera(radnici, otvoreneEskalacije = []) {
  const kandidati = (radnici || []).filter(r =>
    r.aktivan !== false && ULOGE_INZENJER.has(String(r.uloga || "").toLowerCase()),
  );
  if (!kandidati.length) return null;

  const opterecenje = {};
  kandidati.forEach(r => { opterecenje[r.id] = 0; });
  (otvoreneEskalacije || []).forEach(e => {
    if (!OTVORENE_STATUS.has(String(e.status || "").toLowerCase())) return;
    if (e.dodeljen_id != null && opterecenje[e.dodeljen_id] != null) {
      opterecenje[e.dodeljen_id]++;
    }
  });

  const priorUloga = { kvalitet: 0, sef: 1, admin: 2 };
  const sortiran = [...kandidati].sort((a, b) => {
    const loadDiff = (opterecenje[a.id] || 0) - (opterecenje[b.id] || 0);
    if (loadDiff !== 0) return loadDiff;
    const ua = priorUloga[String(a.uloga || "").toLowerCase()] ?? 9;
    const ub = priorUloga[String(b.uloga || "").toLowerCase()] ?? 9;
    return ua - ub;
  });

  return sortiran[0]?.id ?? null;
}

export async function ucitajInzenjereZaDodelu(supabase) {
  const { data, error } = await supabase.from("radnici")
    .select("id,ime,uloga,aktivan")
    .in("uloga", ["kvalitet", "sef", "admin"])
    .order("ime");
  if (error) throw error;
  return (data || []).filter(r => r.aktivan !== false);
}

export async function ucitajOtvoreneEskalacije(supabase) {
  const { data, error } = await supabase.from("eskalacije")
    .select("id,dodeljen_id,status")
    .in("status", ["otvoren", "u_toku"]);
  if (error) throw error;
  return data || [];
}

export async function predloziDodeljenogInzenjera(supabase) {
  const [radnici, otvorene] = await Promise.all([
    ucitajInzenjereZaDodelu(supabase),
    ucitajOtvoreneEskalacije(supabase),
  ]);
  const id = izaberiDodeljenogInzenjera(radnici, otvorene);
  const radnik = radnici.find(r => r.id === id);
  return { dodeljen_id: id, dodeljen_ime: radnik?.ime || null };
}

/** Zatvori eskalacije povezane sa NCR-om (eskalacija_id, SPC alarm). */
export async function zatvoriEskalacijeZaNcr(supabase, ncr) {
  if (!ncr?.id || ncr.status !== "zatvoren") return { zatvoreno: [] };

  const ids = new Set();
  if (ncr.eskalacija_id) ids.add(ncr.eskalacija_id);

  if (ncr.spc_alarm_id) {
    const { data: al } = await supabase.from("spc_alarmi")
      .select("eskalacija_id")
      .eq("id", ncr.spc_alarm_id)
      .maybeSingle();
    if (al?.eskalacija_id) ids.add(al.eskalacija_id);
  }

  const zatvoreno = [];
  for (const eid of ids) {
    const { data, error } = await supabase.from("eskalacije")
      .update({
        status: "zatvoren",
        zatvoreno_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", eid)
      .in("status", ["otvoren", "u_toku"])
      .select("id,opis")
      .maybeSingle();
    if (!error && data) zatvoreno.push(data.id);
  }

  return { zatvoreno };
}

/** Zatvori SPC alarme povezane sa zatvorenim NCR-om. */
export async function zatvoriSpcAlarmeZaNcr(supabase, ncr, { zatvoreneEskalacije = [] } = {}) {
  if (!ncr?.id || ncr.status !== "zatvoren") return { zatvoreno: [] };

  const { zatvoriSpcAlarmSistemski } = await import("./spcAlarmWorkflow.js");
  const razlog = `Auto: NCR ${ncr.broj_ncr || ncr.id} zatvoren`;
  const alarmIds = new Set();
  if (ncr.spc_alarm_id) alarmIds.add(ncr.spc_alarm_id);

  for (const eid of zatvoreneEskalacije) {
    const { data: rows } = await supabase.from("spc_alarmi")
      .select("id")
      .eq("eskalacija_id", eid)
      .in("status", ["otvoren", "potvrden", "karantin"]);
    for (const r of rows || []) alarmIds.add(r.id);
  }

  const zatvoreno = [];
  for (const aid of alarmIds) {
    try {
      const data = await zatvoriSpcAlarmSistemski(supabase, aid, { razlog });
      if (data?.id) zatvoreno.push(data.id);
    } catch { /* već zatvoren ili promenjen */ }
  }
  return { zatvoreno };
}

/** Posle zatvaranja NCR — eskalacije + SPC alarmi + obaveštenje. */
export async function posleZatvaranjaNcr(supabase, ncr) {
  const { zatvoreno } = await zatvoriEskalacijeZaNcr(supabase, ncr);
  const { zatvoreno: spcAlarmi } = await zatvoriSpcAlarmeZaNcr(supabase, ncr, {
    zatvoreneEskalacije: zatvoreno,
  });
  try {
    const { obavestiNcrZatvoren } = await import("./autoAkcije.js");
    await obavestiNcrZatvoren(supabase, ncr, { eskalacije: zatvoreno, spcAlarmi });
  } catch { /* */ }
  return { eskalacije: zatvoreno, spcAlarmi };
}
