/** Glavni unos — Supabase CRUD + propagacija u merljive/atributivne. */

import { supabase } from "./supabaseClient.js";
import {
  buildLookupsFromPogonRows,
  karakteristikeIzGlavniUnosRedova,
  mergeKarakteristike,
  excelRawToDbPayload,
  dbRedToExcelRaw,
  VOZILO_SHEET_RE,
  metaDeoIzGlavnogUnosa,
  kupacPoDeoIzGlavnogUnosa,
  pogonRedoviIzGlavnogUnosa,
} from "./glavniUnosCore.js";
import {
  stripKarakteristikeForDbUpsert,
  getKarakteristikeDbCols,
  KARAKTERISTIKE_UPSERT_CONFLICT,
} from "./karakteristikaMerljive.js";
import { syncDerivedSifrarnikForDelove, ensureDeloviMaster, upsertAtributivnePogone, syncMerljiviSifrarnikZaDeo } from "./importDerivedSifrarnik.js";
import { normalizujIdDeo } from "./idDeoUtil.js";
import { ucitajRedovePoIdDeo } from "./idDeoQuery.js";
import {
  pogonLinijaMapIzGlavnogUnosa,
  setPogonLinijaMap,
} from "./pogonLinijaLookup.js";
import * as XLSX from "xlsx";
import { uploadSlikaSifrarnik } from "./sifrarnikSlikeApi.js";

function greskaNedostaje(error) {
  const m = (error?.message || "").toLowerCase();
  return m.includes("does not exist") || m.includes("could not find") || error?.code === "42P01";
}

const GLAVNI_UNOS_FETCH_LIMIT = 20000;

/** Ukloni id i UI polja — BIGSERIAL dodeljuje id pri INSERT. */
export function ocistiRedZaInsertGlavniUnos(row, { sheetNaziv, redosled } = {}) {
  const { id: _id, _postojeci, ...rest } = row || {};
  return {
    ...rest,
    ...(sheetNaziv != null ? { sheet_naziv: sheetNaziv } : {}),
    ...(redosled != null ? { redosled } : {}),
    updated_at: new Date().toISOString(),
  };
}

export async function fetchPogonLinijaMapa() {
  const { data, error } = await supabase.from("pogon_linija_mapa").select("*").order("linija_faza");
  if (error) {
    if (greskaNedostaje(error)) return [];
    throw error;
  }
  return data || [];
}

export async function upsertPogonLinijaMapa(rows) {
  const payload = (rows || []).map((r) => ({
    linija_faza: String(r.linija_faza || "").trim(),
    linija_id: r.linija_id != null && r.linija_id !== "" ? Number(r.linija_id) : null,
    pogon_kod: String(r.pogon_kod || "").trim().toUpperCase(),
    updated_at: new Date().toISOString(),
  })).filter((r) => r.linija_faza);
  if (!payload.length) return [];
  const { data, error } = await supabase.from("pogon_linija_mapa")
    .upsert(payload, { onConflict: "linija_faza" })
    .select("*");
  if (error) throw error;
  return data || [];
}

export async function obrisiPogonLinijaMapa(linijaFaza) {
  const { error } = await supabase.from("pogon_linija_mapa")
    .delete()
    .eq("linija_faza", linijaFaza);
  if (error) throw error;
}

export async function fetchGlavniUnosSheetovi() {
  const { data, error } = await supabase.from("glavni_unos_redovi")
    .select("sheet_naziv")
    .limit(GLAVNI_UNOS_FETCH_LIMIT);
  if (error) {
    if (greskaNedostaje(error)) return ["vozilo1"];
    throw error;
  }
  const sheets = [...new Set((data || []).map((r) => r.sheet_naziv).filter(Boolean))].sort();
  return sheets.length ? sheets : ["vozilo1"];
}

/** Svi redovi glavnog unosa za jedan deo — direktan upit (ne zavisi od limita po sheet-u). */
export async function fetchGlavniUnosRedoviZaDeo(idDeo) {
  try {
    return await ucitajRedovePoIdDeo(supabase, "glavni_unos_redovi", idDeo, {
      order: [
        ["sheet_naziv", { ascending: true }],
        ["redosled", { ascending: true }],
        ["id", { ascending: true }],
      ],
      limit: 500,
    });
  } catch (error) {
    if (greskaNedostaje(error)) return [];
    throw error;
  }
}

export async function fetchGlavniUnosRedovi(sheetNaziv) {
  const { data, error } = await supabase.from("glavni_unos_redovi")
    .select("*")
    .eq("sheet_naziv", sheetNaziv)
    .order("redosled")
    .order("id")
    .limit(GLAVNI_UNOS_FETCH_LIMIT);
  if (error) {
    if (greskaNedostaje(error)) return [];
    throw error;
  }
  return data || [];
}

export async function snimiGlavniUnosRed(row) {
  const { id, _postojeci, ...body } = row || {};
  const payload = { ...body, updated_at: new Date().toISOString() };
  if (id) {
    const { data, error } = await supabase.from("glavni_unos_redovi")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("glavni_unos_redovi")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function obrisiGlavniUnosRed(id) {
  const { error } = await supabase.from("glavni_unos_redovi").delete().eq("id", id);
  if (error) throw error;
}

export async function zameniSheetRedove(sheetNaziv, redovi) {
  const { error: delErr } = await supabase.from("glavni_unos_redovi").delete().eq("sheet_naziv", sheetNaziv);
  if (delErr && !greskaNedostaje(delErr)) throw delErr;

  const payload = (redovi || [])
    .filter((r) => r.id_deo && r.karakteristika)
    .map((r, i) => ocistiRedZaInsertGlavniUnos(r, {
      sheetNaziv,
      redosled: r.redosled ?? i,
    }));

  if (!payload.length) return [];

  const { data, error } = await supabase.from("glavni_unos_redovi").insert(payload).select("*");
  if (error) throw error;
  return data || [];
}

export async function ucitajWorkbookIzFajla(file) {
  const buf = await file.arrayBuffer();
  return XLSX.read(buf, { type: "array" });
}

export function parsirajWorkbookZaUvoz(wb) {
  const redovi = [];
  const pogonRows = [];

  if (wb.Sheets.pogon_kod) {
    XLSX.utils.sheet_to_json(wb.Sheets.pogon_kod, { defval: "" }).forEach((r) => {
      const linija_faza = String(r.linija_faza || r.Linija || "").trim();
      if (!linija_faza) return;
      pogonRows.push({
        linija_faza,
        linija_id: r.linija_id != null && r.linija_id !== "" ? Number(r.linija_id) : null,
        pogon_kod: String(r["pogon kod"] || r.pogon_kod || "").trim().toUpperCase(),
      });
    });
  }

  wb.SheetNames.forEach((name) => {
    if (!VOZILO_SHEET_RE.test(name)) return;
    XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" }).forEach((raw, i) => {
      const payload = excelRawToDbPayload(raw, name, i);
      if (payload.id_deo && payload.karakteristika) redovi.push(payload);
    });
  });

  return { redovi, pogonRows };
}

async function upsertKarakteristikeBatch(rows) {
  const dbCols = await getKarakteristikeDbCols(supabase);
  const prepared = rows.map((r) => stripKarakteristikeForDbUpsert(r, dbCols));
  const batchSize = 80;
  let total = 0;
  for (let i = 0; i < prepared.length; i += batchSize) {
    const batch = prepared.slice(i, i + batchSize);
    const { error } = await supabase.from("karakteristike_merljive")
      .upsert(batch, { onConflict: KARAKTERISTIKE_UPSERT_CONFLICT });
    if (error) throw new Error(`karakteristike_merljive: ${error.message}`);
    total += batch.length;
  }
  return total;
}

/**
 * Propagacija: glavni_unos_redovi → karakteristike_merljive → delovi, SOP, RN, pogoni.
 */
export async function propagirajGlavniUnos({ sheetNaziv = null, idDeo = null } = {}) {
  const pogonRows = await fetchPogonLinijaMapa();
  const lookups = buildLookupsFromPogonRows(pogonRows);
  setPogonLinijaMap(pogonLinijaMapIzGlavnogUnosa(lookups.pogonByLinija));

  let dbRedovi;
  if (idDeo) {
    const norm = normalizujIdDeo(idDeo);
    dbRedovi = await fetchGlavniUnosRedoviZaDeo(norm);
    if (!dbRedovi.length) {
      throw new Error(
        `Nema redova u glavnom unosu za ${norm} — dodaj deo u Osnovno pa sacuvaj.`,
      );
    }
  } else if (sheetNaziv) {
    dbRedovi = await fetchGlavniUnosRedovi(sheetNaziv);
  } else {
    const sheets = await fetchGlavniUnosSheetovi();
    dbRedovi = [];
    for (const s of sheets) {
      const part = await fetchGlavniUnosRedovi(s);
      dbRedovi.push(...part);
    }
  }

  if (!dbRedovi.length) {
    throw new Error("Nema redova u glavnom unosu — dodaj dimenzije (id_deo + Karakteristika).");
  }

  const izGlavnog = karakteristikeIzGlavniUnosRedova(dbRedovi, lookups);
  if (!izGlavnog.length) {
    throw new Error("Nijedan red nije mapiran u karakteristike — proveri pogon mapu i kolone.");
  }

  const touchedDeos = [...new Set(izGlavnog.map((r) => String(r.id_deo).toUpperCase()))];

  const { data: postojeci, error: loadErr } = await supabase
    .from("karakteristike_merljive")
    .select("*")
    .in("id_deo", touchedDeos);
  if (loadErr) throw loadErr;

  const merged = mergeKarakteristike(postojeci || [], izGlavnog);
  const deoMeta = metaDeoIzGlavnogUnosa(dbRedovi);
  const kupacPoDeo = kupacPoDeoIzGlavnogUnosa(dbRedovi);

  // FK: delovi mora postojati pre karakteristike_merljive
  await ensureDeloviMaster(supabase, merged, deoMeta);

  const pogonAtr = pogonRedoviIzGlavnogUnosa(dbRedovi, lookups);
  const atrCount = await upsertAtributivnePogone(supabase, pogonAtr);

  const karCount = await upsertKarakteristikeBatch(merged);
  const derived = await syncDerivedSifrarnikForDelove(supabase, touchedDeos, {
    karRows: merged,
    deoMeta,
    kupacPoDeo,
  });

  if (atrCount > 0) {
    derived.push({ sheet: "delovi_atributivni_pogon (glavni unos)", status: "ok", count: atrCount });
  }

  return {
    karakteristike: karCount,
    delovi: touchedDeos,
    derived,
    redova: dbRedovi.length,
  };
}

/**
 * Propagacija jednog dela: prvo Osnovno → dimenzije/SOP;
 * ako nema u Osnovnom, a dimenzije već postoje — sinhronizuj SOP/RN/delovi.
 */
export async function propagirajMerljiviDeo(idDeo) {
  const norm = normalizujIdDeo(idDeo);
  if (!norm) throw new Error("ID dela je obavezan");

  const glavni = await fetchGlavniUnosRedoviZaDeo(norm);
  if (glavni.length) {
    return propagirajGlavniUnos({ idDeo: norm });
  }

  const kar = await ucitajRedovePoIdDeo(supabase, "karakteristike_merljive", norm, {
    select: "id",
    limit: 500,
  });

  if (kar.length) {
    const derived = await syncMerljiviSifrarnikZaDeo(supabase, norm);
    return {
      karakteristike: kar.length,
      delovi: [norm],
      derived,
      redova: 0,
      izKarakteristika: true,
    };
  }

  const sop = await ucitajRedovePoIdDeo(supabase, "sop_deo_varijabilni", norm, {
    select: "id_deo",
    limit: 20,
  });
  if (sop.length) {
    return {
      karakteristike: 0,
      delovi: [norm],
      derived: [],
      redova: 0,
      izSop: true,
    };
  }

  throw new Error(
    `${norm}: nije pronadjen u bazi. Proveri da li je ID tacno DEMO-NM-001 (crtica -, ne iz Excela). `
    + "Osnovno → Sačuvaj i propagiraj.",
  );
}

/**
 * Jednokratna popravka: Excel cesto sacuva id_deo sa pogresnom crticom (– umesto -).
 * Novi delovi se automatski normalizuju pri cuvanju — ovo je samo za stare redove.
 */
export async function popraviIdDeoFormatUBazi() {
  const izvestaj = { glavni: 0, karakteristike: 0, sop: 0 };

  const { data: gu, error: guErr } = await supabase
    .from("glavni_unos_redovi").select("id, id_deo").limit(20000);
  if (guErr) throw guErr;
  for (const r of gu || []) {
    const novi = normalizujIdDeo(r.id_deo);
    if (!r.id_deo || r.id_deo === novi) continue;
    const { error } = await supabase.from("glavni_unos_redovi")
      .update({ id_deo: novi }).eq("id", r.id);
    if (!error) izvestaj.glavni += 1;
  }

  const { data: kar, error: karErr } = await supabase
    .from("karakteristike_merljive").select("id, id_deo").limit(20000);
  if (karErr) throw karErr;
  for (const r of kar || []) {
    const novi = normalizujIdDeo(r.id_deo);
    if (!r.id_deo || r.id_deo === novi) continue;
    const { error } = await supabase.from("karakteristike_merljive")
      .update({ id_deo: novi }).eq("id", r.id);
    if (!error) izvestaj.karakteristike += 1;
  }

  const { data: sopRows, error: sopErr } = await supabase
    .from("sop_deo_varijabilni").select("*").limit(20000);
  if (sopErr) throw sopErr;
  for (const r of sopRows || []) {
    const novi = normalizujIdDeo(r.id_deo);
    if (!r.id_deo || r.id_deo === novi) continue;
    const stariDeo = r.id_deo;
    const pogon = r.pogon_kod;
    const { error: delErr } = await supabase.from("sop_deo_varijabilni")
      .delete().eq("id_deo", stariDeo).eq("pogon_kod", pogon);
    if (delErr) continue;
    const { error: insErr } = await supabase.from("sop_deo_varijabilni")
      .upsert({ ...r, id_deo: novi }, { onConflict: "id_deo,pogon_kod" });
    if (!insErr) izvestaj.sop += 1;
  }

  return izvestaj;
}

export { dbRedToExcelRaw, excelRawToDbPayload };

export async function uploadSlikaGlavnogUnosa(file, idDeo) {
  return uploadSlikaSifrarnik(file, { modul: "merljive", id: idDeo });
}
