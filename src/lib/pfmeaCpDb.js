/**
 * PFMEA / Control Plan — Supabase CRUD.
 */

import { izracunajRpnSummary, normalizujPfmeaCpRed } from "./pfmeaControlPlan.js";

const PFMEA_DB_KEYS = [
  "br_dela", "proces", "mod_greske", "uzrok_greske", "efekat_greske",
  "s", "uzrok_mehanizam", "o", "postojece_kontrole", "d",
  "rpn_before", "akcija", "odgovorni", "rok", "status", "rpn_after",
  "s_posle", "o_posle", "d_posle", "odobrio", "datum",
  "pfmea_veza", "control_plan_ref",
];

const CP_DB_KEYS = [
  "br_dela", "proces", "karakteristika", "klasifikacija", "nominalna", "tolerancija",
  "metoda", "oprema", "msa", "ucestalost", "velicina_uzoraka",
  "reakcija_nekontrolisano", "reakcija_na_nepravilan_deo", "zapis_forma",
  "pfmea_referenca", "mod_greske_pfmea", "status_cp", "odgovorni",
];

function mapStavka(keys, row) {
  const o = normalizujPfmeaCpRed(row);
  const out = {};
  for (const k of keys) out[k] = o[k] ?? null;
  return out;
}

function stavkaIzDb(row, keys) {
  const out = {};
  for (const k of keys) out[k] = row[k] ?? "";
  return normalizujPfmeaCpRed(out);
}

export async function listaPfmeaCpDokumenata(supabase, { idDeo } = {}) {
  let q = supabase.from("pfmea_cp_dokumenti")
    .select("id,naziv,id_deo,revizija,updated_at,created_at,osmd_izvestaj_id,broj_8d,napomena")
    .eq("aktivan", true)
    .order("updated_at", { ascending: false });
  if (idDeo) q = q.eq("id_deo", String(idDeo).trim().toUpperCase());
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function ucitajPfmeaCpDokument(supabase, id) {
  const { data: dok, error: e1 } = await supabase.from("pfmea_cp_dokumenti")
    .select("*")
    .eq("id", id)
    .single();
  if (e1) throw e1;

  const [{ data: pfmea }, { data: cp }] = await Promise.all([
    supabase.from("pfmea_stavke").select("*").eq("dokument_id", id).order("red_broj").order("id"),
    supabase.from("control_plan_stavke").select("*").eq("dokument_id", id).order("red_broj").order("id"),
  ]);

  return {
    id: dok.id,
    naziv: dok.naziv,
    idDeo: dok.id_deo || "",
    revizija: dok.revizija || "A",
    napomena: dok.napomena || "",
    osmdIzvestajId: dok.osmd_izvestaj_id || null,
    broj8d: dok.broj_8d || "",
    azurirano: dok.updated_at,
    kreirano: dok.created_at,
    pfmea: { redovi: (pfmea || []).map((r) => stavkaIzDb(r, PFMEA_DB_KEYS)) },
    controlPlan: { redovi: (cp || []).map((r) => stavkaIzDb(r, CP_DB_KEYS)) },
    rpnSummary: izracunajRpnSummary((pfmea || []).map((r) => stavkaIzDb(r, PFMEA_DB_KEYS))),
  };
}

export async function kreirajPfmeaCpDokument(supabase, {
  naziv, idDeo, revizija, korisnik, osmdIzvestajId, broj8d, napomena,
} = {}) {
  const row = {
    naziv: naziv || "PFMEA / Control Plan",
    id_deo: idDeo ? String(idDeo).trim().toUpperCase() : null,
    revizija: revizija || "A",
    kreirao_id: korisnik?.radnikId || null,
    kreirao_ime: korisnik?.ime || null,
  };
  if (osmdIzvestajId) row.osmd_izvestaj_id = osmdIzvestajId;
  if (broj8d) row.broj_8d = broj8d;
  if (napomena) row.napomena = napomena;
  const { data, error } = await supabase.from("pfmea_cp_dokumenti").insert(row).select("*").single();
  if (error) throw error;
  return ucitajPfmeaCpDokument(supabase, data.id);
}

export async function sacuvajPfmeaCpDokument(supabase, doc, korisnik) {
  if (!doc?.id) throw new Error("Dokument nema ID — kreirajte novi.");

  const head = {
    naziv: doc.naziv || "PFMEA / Control Plan",
    id_deo: doc.idDeo ? String(doc.idDeo).trim().toUpperCase() : null,
    revizija: doc.revizija || "A",
    napomena: doc.napomena || null,
    updated_at: new Date().toISOString(),
  };
  if (doc.osmdIzvestajId != null) head.osmd_izvestaj_id = doc.osmdIzvestajId;
  if (doc.broj8d != null) head.broj_8d = doc.broj8d || null;
  const { error: eHead } = await supabase.from("pfmea_cp_dokumenti").update(head).eq("id", doc.id);
  if (eHead) throw eHead;

  const pfRows = doc.pfmea?.redovi || [];
  const cpRows = doc.controlPlan?.redovi || [];

  await supabase.from("pfmea_stavke").delete().eq("dokument_id", doc.id);
  await supabase.from("control_plan_stavke").delete().eq("dokument_id", doc.id);

  if (pfRows.length) {
    const ins = pfRows.map((r, i) => ({
      dokument_id: doc.id,
      red_broj: i,
      ...mapStavka(PFMEA_DB_KEYS, r),
    }));
    const { error } = await supabase.from("pfmea_stavke").insert(ins);
    if (error) throw error;
  }

  if (cpRows.length) {
    const ins = cpRows.map((r, i) => ({
      dokument_id: doc.id,
      red_broj: i,
      ...mapStavka(CP_DB_KEYS, r),
    }));
    const { error } = await supabase.from("control_plan_stavke").insert(ins);
    if (error) throw error;
  }

  return ucitajPfmeaCpDokument(supabase, doc.id);
}

export async function obrisiPfmeaCpDokument(supabase, id) {
  const { error } = await supabase.from("pfmea_cp_dokumenti")
    .update({ aktivan: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function duplirajPfmeaCpDokument(supabase, id, korisnik) {
  const src = await ucitajPfmeaCpDokument(supabase, id);
  const novi = await kreirajPfmeaCpDokument(supabase, {
    naziv: `${src.naziv} (kopija)`,
    idDeo: src.idDeo,
    revizija: src.revizija,
    korisnik,
  });
  return sacuvajPfmeaCpDokument(supabase, {
    ...novi,
    pfmea: src.pfmea,
    controlPlan: src.controlPlan,
  }, korisnik);
}

export async function proveriPfmeaCpTabele(supabase) {
  const { error } = await supabase.from("pfmea_cp_dokumenti").select("id").limit(1);
  return !error;
}
