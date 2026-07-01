/** Pomoćne funkcije za eskalacije, dodelu inženjera i prefill 8D. */

import { nacrtU8dEditorPrefill } from "./osmdWordPrimeri.js";

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

/** Eskalacija (kratak prefill) ili pun nacrt iz SPC asistenta. */
export function normalizujPrefill8d(e) {
  if (!e) return {};
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

export function sacuvajNavigaciju8d(prefill) {
  sessionStorage.setItem("spc_8d_prefill", JSON.stringify(prefill8dIzEskalacije(prefill)));
  sessionStorage.setItem("spc_tab_atr", "8d");
}

export function procitajNavigaciju8d() {
  const tab = sessionStorage.getItem("spc_tab_atr");
  const raw = sessionStorage.getItem("spc_8d_prefill");
  if (tab) sessionStorage.removeItem("spc_tab_atr");
  if (raw) sessionStorage.removeItem("spc_8d_prefill");
  let prefill = null;
  if (raw) {
    try { prefill = JSON.parse(raw); } catch { prefill = null; }
  }
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
