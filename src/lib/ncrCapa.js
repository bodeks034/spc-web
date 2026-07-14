/** NCR / CAPA — CRUD, validacija, veza sa alarmima i 8D. */

import { opisSpcAlarma } from "./spcAlarmWorkflow.js";

const OTVORENI = new Set(["otvoren", "analiza", "akcija", "verifikacija"]);

export const NCR_STATUS_REDO = ["otvoren", "analiza", "akcija", "verifikacija", "zatvoren"];

export const NCR_STATUSI = [
  ["otvoren", "Otvoren"],
  ["analiza", "Analiza uzroka"],
  ["akcija", "Korektivna akcija"],
  ["verifikacija", "Verifikacija"],
  ["zatvoren", "Zatvoren"],
];

export const NCR_PRIORITETI = [
  ["nizak", "Nizak"],
  ["normalan", "Normalan"],
  ["visok", "Visok"],
  ["kriticno", "Kritično"],
];

const NCR_POLJA = [
  "broj_ncr", "id_deo", "radni_nalog", "serija", "vin", "smena", "linija",
  "opis", "uzrok", "korektivna", "verifikacija", "status", "prioritet", "rok",
  "izvor", "eskalacija_id", "osmd_id", "spc_alarm_id", "pfmea_stavka_id",
];

export function validirajNcrPayload(payload) {
  const greske = {};
  const id_deo = String(payload?.id_deo || "").trim().toUpperCase();
  const opis = String(payload?.opis || "").trim();
  if (!id_deo) greske.id_deo = "ID dela je obavezan";
  if (!opis) greske.opis = "Opis neusaglašenosti je obavezan";
  return { ok: Object.keys(greske).length === 0, greske, id_deo, opis };
}

export function dozvoljeniNcrStatusi(trenutni) {
  const idx = NCR_STATUS_REDO.indexOf(trenutni);
  const out = [];
  if (idx > 0) out.push(NCR_STATUS_REDO[idx - 1]);
  if (idx >= 0 && idx < NCR_STATUS_REDO.length - 1) out.push(NCR_STATUS_REDO[idx + 1]);
  if (trenutni !== "zatvoren") out.push("zatvoren");
  else out.push("otvoren");
  return [...new Set(out)];
}

function sanitizeNcrRow(payload) {
  const out = {};
  for (const k of NCR_POLJA) {
    if (payload[k] !== undefined && payload[k] !== null && payload[k] !== "") {
      out[k] = payload[k];
    }
  }
  return out;
}

export function prefill8dIzNcr(ncr) {
  if (!ncr) return {};
  return {
    id_deo: ncr.id_deo || "",
    opis: ncr.opis || "",
    d2_opis_problema: ncr.opis || "",
    d4_uzrok: ncr.uzrok || "",
    d5_korektivna: ncr.korektivna || "",
    d6_implementacija: ncr.korektivna || "",
    d7_prevencija: ncr.verifikacija || "",
    broj_reklamacije: ncr.broj_ncr || "",
    ncr_id: ncr.id || null,
  };
}

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
  prioritet = null,
  smena = null,
  samoRokProsao = false,
  limit = 80,
} = {}) {
  let q = supabase.from("ncr_capa")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status === "otvoreni") q = q.in("status", [...OTVORENI]);
  else if (status) q = q.eq("status", status);
  if (idDeo) q = q.eq("id_deo", String(idDeo).trim().toUpperCase());
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
    .in("status", [...OTVORENI]);
  if (idDeo) q = q.eq("id_deo", String(idDeo).trim().toUpperCase());
  const { count, error } = await q;
  if (error) return 0;
  return count || 0;
}

export async function snimiNcrCapa(supabase, payload, { id = null, kreiraoId = null } = {}) {
  const v = validirajNcrPayload(payload);
  if (!v.ok) {
    const msg = Object.values(v.greske).join(" · ");
    throw new Error(msg);
  }

  const row = sanitizeNcrRow({
    ...payload,
    id_deo: v.id_deo,
    opis: v.opis,
    updated_at: new Date().toISOString(),
  });

  if (id) {
    const { data, error } = await supabase.from("ncr_capa")
      .update(row).eq("id", id).select().single();
    if (error) throw error;
    if (row.status === "zatvoren") {
      const { posleZatvaranjaNcr } = await import("./eskalacijeHelper.js");
      const { eskalacije, spcAlarmi } = await posleZatvaranjaNcr(supabase, data);
      if (eskalacije.length) data._eskalacijeZatvorene = eskalacije;
      if (spcAlarmi.length) data._spcAlarmiZatvoreni = spcAlarmi;
    }
    return data;
  }

  if (!row.broj_ncr) row.broj_ncr = await generisiBrojNcr(supabase);
  row.kreirao_id = kreiraoId ?? row.kreirao_id ?? null;
  if (!row.status) row.status = "otvoren";

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
  if (status === "zatvoren") {
    patch.zatvoreno_at = new Date().toISOString();
  } else {
    patch.zatvoreno_at = null;
  }
  const { data, error } = await supabase.from("ncr_capa")
    .update(patch).eq("id", id).select().single();
  if (error) throw error;
  if (status === "zatvoren") {
    const { posleZatvaranjaNcr } = await import("./eskalacijeHelper.js");
    const { eskalacije, spcAlarmi } = await posleZatvaranjaNcr(supabase, data);
    if (eskalacije.length) data._eskalacijeZatvorene = eskalacije;
    if (spcAlarmi.length) data._spcAlarmiZatvoreni = spcAlarmi;
  }
  return data;
}

export async function poveziOsmd(supabase, ncrId, osmdId) {
  if (!ncrId || !osmdId) return null;
  const { data, error } = await supabase.from("ncr_capa")
    .update({ osmd_id: osmdId, updated_at: new Date().toISOString() })
    .eq("id", ncrId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Auto-draft 8D iz NCR-a (cron / podsetnici). */
export async function kreirajOsmdDraftIzNcr(supabase, ncr) {
  if (!ncr?.id || ncr.osmd_id) return null;
  const { osmdPayloadIzForme } = await import("./osmdIzvestajPdf.js");
  const payload = osmdPayloadIzForme({
    ...prefill8dIzNcr(ncr),
    status: "u_izradi",
    datum_otvaranja_8d: new Date().toISOString().slice(0, 10),
    d2_opis_problema: `[AUTO-DRAFT] ${ncr.opis || ""}`,
  });
  const { data, error } = await supabase.from("osmd_izvestaji").insert(payload).select("id").single();
  if (error) throw error;
  await poveziOsmd(supabase, ncr.id, data.id);
  return { ...data, id_deo: ncr.id_deo, broj_ncr: ncr.broj_ncr };
}

export async function kreirajNcrIzAlarma(supabase, alarm, { kreiraoId = null } = {}) {
  if (!alarm?.id || !alarm?.id_deo) throw new Error("Alarm nije validan.");

  const postojeci = await fetchNcrPoAlarmu(supabase, alarm.id);
  if (postojeci) return { row: postojeci, vecPostojao: true };

  const opis = `SPC alarm: ${opisSpcAlarma(alarm)}`;
  const prioritet = alarm.status === "karantin" ? "kriticno" : "visok";

  const row = await snimiNcrCapa(supabase, {
    id_deo: alarm.id_deo,
    opis,
    uzrok: "",
    korektivna: "",
    verifikacija: "",
    status: "otvoren",
    prioritet,
    izvor: "spc_alarm",
    spc_alarm_id: alarm.id,
    eskalacija_id: alarm.eskalacija_id || null,
    linija: alarm.pozicija || alarm.linija || null,
  }, { kreiraoId });

  return { row, vecPostojao: false };
}
