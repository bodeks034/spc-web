/** NCR — CRUD, validacija, veza sa alarmima i 8D. */

import { opisSpcAlarma } from "./spcAlarmWorkflow.js";
import { posleZatvaranjaNcr } from "./eskalacijeHelper.js";
import {
  ncrIzBaze,
  ncrPayloadZaSnimanje,
  validirajNcrObrazac,
  prefill8dIzObrazca,
  prefill8dIzNcr,
  NCR_STATUS_EXCEL,
  labelStatusa,
} from "./ncrObrazacPolja.js";

export const OTVORENI_NCR = new Set(["open", "containment", "disposition", "osmd_progress", "verification"]);

export const NCR_STATUS_REDO = NCR_STATUS_EXCEL.map(([v]) => v);

export const NCR_STATUSI = NCR_STATUS_EXCEL;

export const NCR_PRIORITETI = [
  ["nizak", "Nizak"],
  ["normalan", "Normalan"],
  ["visok", "Visok"],
  ["kriticno", "Kritično"],
];

export { labelStatusa, ncrIzBaze, validirajNcrObrazac };

export function validirajNcrPayload(payload) {
  return validirajNcrObrazac(payload);
}

export function dozvoljeniNcrStatusi(trenutni) {
  const idx = NCR_STATUS_REDO.indexOf(trenutni);
  const out = [];
  if (idx > 0) out.push(NCR_STATUS_REDO[idx - 1]);
  if (idx >= 0 && idx < NCR_STATUS_REDO.length - 1) out.push(NCR_STATUS_REDO[idx + 1]);
  if (trenutni !== "closed") out.push("closed");
  else out.push("open");
  return [...new Set(out)];
}

export { prefill8dIzNcr };

export async function generisiBrojNcr(supabase) {
  const god = new Date().getFullYear();
  const prefiks = `NCR-${god}-`;
  const { data } = await supabase.from("ncr_capa")
    .select("broj_ncr")
    .like("broj_ncr", `${prefiks}%`)
    .order("broj_ncr", { ascending: false })
    .limit(1);
  const poslednji = data?.[0]?.broj_ncr;
  let seq = 1;
  if (poslednji) {
    const m = poslednji.match(/-(\d+)$/);
    if (m) seq = Number(m[1]) + 1;
  }
  return `${prefiks}${String(seq).padStart(4, "0")}`;
}

export async function fetchNcrCapaLista(supabase, {
  status = null,
  idDeo = null,
  pogon = null,
  prioritet = null,
  smena = null,
  samoRokProsao = false,
  limit = 200,
} = {}) {
  let q = supabase.from("ncr_capa")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status === "otvoreni") q = q.in("status", [...OTVORENI_NCR]);
  else if (status) q = q.eq("status", status);
  if (idDeo) q = q.eq("id_deo", String(idDeo).trim().toUpperCase());
  if (pogon) q = q.eq("pogon", String(pogon).trim());
  if (prioritet) q = q.eq("prioritet", prioritet);
  if (smena != null && smena !== "") q = q.eq("smena", Number(smena));
  if (samoRokProsao) {
    const danas = new Date().toISOString().slice(0, 10);
    q = q.not("rok", "is", null).lt("rok", danas);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/** Svi NCR za firmu — jedan Excel registar. */
export async function fetchNcrSviZaExcel(supabase, { limit = 500 } = {}) {
  const { data, error } = await supabase.from("ncr_capa")
    .select("*")
    .order("pogon", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/** Svi NCR za pogon — za filter u UI. */
export async function fetchNcrZaPogonExcel(supabase, pogon, { limit = 500 } = {}) {
  if (!pogon) return [];
  const { data, error } = await supabase.from("ncr_capa")
    .select("*")
    .eq("pogon", String(pogon).trim())
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchNcrPogoni(supabase, { limit = 300 } = {}) {
  const { data, error } = await supabase.from("ncr_capa")
    .select("pogon")
    .not("pogon", "is", null)
    .neq("pogon", "")
    .order("pogon")
    .limit(limit);
  if (error) return [];
  return [...new Set((data || []).map((r) => String(r.pogon).trim()).filter(Boolean))].sort();
}

export async function fetchPrethodniNcrZaOkidac(supabase, forma, { dana = 45, limit = 20 } = {}) {
  const idDeo = String(forma?.id_deo || "").trim().toUpperCase();
  if (!idDeo) return [];

  const referenca = forma.datum_otvaranja || new Date().toISOString().slice(0, 10);
  const cutoff = new Date(`${referenca}T12:00:00`);
  cutoff.setDate(cutoff.getDate() - dana);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  let q = supabase.from("ncr_capa")
    .select("id,broj_ncr,datum_otvaranja,opis,id_deo,linija,status")
    .eq("id_deo", idDeo)
    .gte("datum_otvaranja", cutoffIso)
    .order("datum_otvaranja", { ascending: false })
    .limit(limit);

  if (forma.id) q = q.neq("id", forma.id);

  const { data, error } = await q;
  if (error) return [];
  return data || [];
}

export async function fetchNcrPoAlarmu(supabase, spcAlarmId) {
  if (!spcAlarmId) return null;
  const { data, error } = await supabase.from("ncr_capa")
    .select("*")
    .eq("spc_alarm_id", spcAlarmId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function brojOtvorenihNcr(supabase, { idDeo = null } = {}) {
  let q = supabase.from("ncr_capa")
    .select("id", { count: "exact", head: true })
    .in("status", [...OTVORENI_NCR]);
  if (idDeo) q = q.eq("id_deo", String(idDeo).trim().toUpperCase());
  const { count, error } = await q;
  if (error) return 0;
  return count || 0;
}

export async function snimiNcrCapa(supabase, payload, { id = null, kreiraoId = null } = {}) {
  const v = validirajNcrObrazac(payload);
  if (!v.ok) {
    throw new Error(Object.values(v.greske).join(" · "));
  }

  const row = ncrPayloadZaSnimanje({
    ...payload,
    id_deo: v.id_deo,
    opis: v.opis,
  });

  if (id) {
    const { data, error } = await supabase.from("ncr_capa")
      .update(row).eq("id", id).select().single();
    if (error) throw error;
    if (row.status === "closed") {
      const { eskalacije, spcAlarmi } = await posleZatvaranjaNcr(supabase, data);
      if (eskalacije.length) data._eskalacijeZatvorene = eskalacije;
      if (spcAlarmi.length) data._spcAlarmiZatvoreni = spcAlarmi;
    }
    return data;
  }

  if (!row.broj_ncr) row.broj_ncr = await generisiBrojNcr(supabase);
  row.kreirao_id = kreiraoId ?? null;
  if (!row.status) row.status = "open";
  if (!row.datum_otvaranja) row.datum_otvaranja = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase.from("ncr_capa")
    .insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function azurirajNcrStatus(supabase, id, status, extra = {}) {
  const patch = {
    status,
    updated_at: new Date().toISOString(),
    ...extra,
  };
  if (status === "closed") {
    patch.zatvoreno_at = new Date().toISOString();
    patch.datum_zatvaranja = patch.datum_zatvaranja || new Date().toISOString().slice(0, 10);
  } else {
    patch.zatvoreno_at = null;
  }
  const { data, error } = await supabase.from("ncr_capa")
    .update(patch).eq("id", id).select().single();
  if (error) throw error;
  if (status === "closed") {
    const { eskalacije, spcAlarmi } = await posleZatvaranjaNcr(supabase, data);
    if (eskalacije.length) data._eskalacijeZatvorene = eskalacije;
    if (spcAlarmi.length) data._spcAlarmiZatvoreni = spcAlarmi;
  }
  return data;
}

export async function poveziOsmd(supabase, ncrId, osmdId, osmdBroj = null) {
  if (!ncrId || !osmdId) return null;
  const patch = {
    osmd_id: osmdId,
    osmd_pokrenut: true,
    updated_at: new Date().toISOString(),
  };
  if (osmdBroj) patch.osmd_broj = osmdBroj;
  const { data, error } = await supabase.from("ncr_capa")
    .update(patch)
    .eq("id", ncrId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function kreirajOsmdDraftIzNcr(supabase, ncr) {
  if (!ncr?.id || ncr.osmd_id) return null;
  const { osmdPayloadIzForme } = await import("./osmdIzvestajPdf.js");
  const { osigurajBrojevePaketa8d } = await import("./osmdBrojevi.js");
  const saBrojevima = await osigurajBrojevePaketa8d(supabase, {
    ...prefill8dIzNcr(ncr),
    id_deo: ncr.id_deo,
    status: "u_izradi",
    datum_otvaranja_8d: new Date().toISOString().slice(0, 10),
    d2_opis_problema: `[AUTO-DRAFT] ${ncr.opis || ""}`,
  });
  const payload = osmdPayloadIzForme(saBrojevima);
  const { data, error } = await supabase.from("osmd_izvestaji").insert(payload).select("id, broj_8d, broj_pfmea, broj_control_plan").single();
  if (error) throw error;
  await poveziOsmd(supabase, ncr.id, data.id, data.broj_8d);
  return { ...data, id_deo: ncr.id_deo, broj_ncr: ncr.broj_ncr };
}

export async function kreirajNcrIzAlarma(supabase, alarm, { kreiraoId = null } = {}) {
  if (!alarm?.id || !alarm?.id_deo) throw new Error("Alarm nije validan.");

  const postojeci = await fetchNcrPoAlarmu(supabase, alarm.id);
  if (postojeci) return { row: postojeci, vecPostojao: true };

  const opis = `SPC alarm: ${opisSpcAlarma(alarm)}`;
  const ozbiljnost = alarm.status === "karantin" ? "Critical" : "High";

  const row = await snimiNcrCapa(supabase, {
    id_deo: alarm.id_deo,
    opis,
    ozbiljnost,
    status: "open",
    izvor: "spc_alarm",
    spc_alarm_id: alarm.id,
    eskalacija_id: alarm.eskalacija_id || null,
    linija: alarm.linija || null,
    pogon: alarm.pogon || alarm.pogon_kod || "",
    karakteristika: alarm.pozicija || null,
    metoda_detekcije: "SPC alarm",
  }, { kreiraoId });

  return { row, vecPostojao: false };
}
