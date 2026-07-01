/**
 * Povezivanje 8D izveštaja sa PFMEA/CP dokumentom.
 */

import {
  listaPfmeaCpDokumenata,
  ucitajPfmeaCpDokument,
  proveriPfmeaCpTabele,
} from "./pfmeaCpDb.js";
import {
  localListaDokumenata,
  localUcitajDokument,
} from "./pfmeaCpLocal.js";
import { izvuciBroj8dIzNapomene, izvuciOsmdIdIzNapomene } from "./osmdPfmeaCpBridge.js";

function trim(s) {
  return String(s ?? "").trim();
}

export function metaOdgovara8d(meta, { osmdId, broj8d, idDeo }) {
  if (!meta) return false;
  const oid = meta.osmd_izvestaj_id ?? meta.osmdIzvestajId;
  if (osmdId && oid && Number(oid) === Number(osmdId)) return true;
  const b8 = trim(meta.broj_8d ?? meta.broj8d);
  if (broj8d && b8 && b8.toUpperCase() === trim(broj8d).toUpperCase()) return true;
  const nap = meta.napomena || "";
  if (osmdId && izvuciOsmdIdIzNapomene(nap) === Number(osmdId)) return true;
  if (broj8d && izvuciBroj8dIzNapomene(nap).toUpperCase() === trim(broj8d).toUpperCase()) return true;
  if (broj8d && trim(meta.naziv).includes(broj8d)) return true;
  if (idDeo && trim(meta.id_deo ?? meta.idDeo).toUpperCase() === trim(idDeo).toUpperCase()
    && broj8d && trim(meta.naziv).includes("PFMEA/CP")) return false;
  return false;
}

export function pronadjiPfmeaCpMetaZa8d(lista, { osmdId, broj8d, idDeo }) {
  if (!lista?.length) return null;
  const hit = lista.find((m) => metaOdgovara8d(m, { osmdId, broj8d, idDeo }));
  if (hit) return hit;
  if (broj8d) {
    const poNazivu = lista.find((m) => trim(m.naziv).includes(broj8d));
    if (poNazivu) return poNazivu;
  }
  if (idDeo) {
    const poDelu = lista.filter((m) =>
      trim(m.id_deo ?? m.idDeo).toUpperCase() === trim(idDeo).toUpperCase(),
    );
    if (poDelu.length === 1) return poDelu[0];
  }
  return null;
}

export async function ucitajPfmeaCpPaketZa8d(supabase, { osmdId, broj8d, idDeo } = {}) {
  const ctx = { osmdId: osmdId || null, broj8d: trim(broj8d), idDeo: trim(idDeo) };
  if (!ctx.osmdId && !ctx.broj8d && !ctx.idDeo) {
    return { dokument: null, meta: null, storageMode: null };
  }

  const supabaseOk = supabase ? await proveriPfmeaCpTabele(supabase) : false;
  if (supabaseOk) {
    const lista = await listaPfmeaCpDokumenata(supabase);
    const meta = pronadjiPfmeaCpMetaZa8d(lista, ctx);
    if (!meta) return { dokument: null, meta: null, storageMode: "supabase" };
    const dokument = await ucitajPfmeaCpDokument(supabase, meta.id);
    return { dokument, meta, storageMode: "supabase" };
  }

  const lista = localListaDokumenata();
  const meta = pronadjiPfmeaCpMetaZa8d(lista, ctx);
  if (!meta) return { dokument: null, meta: null, storageMode: "local" };
  const dokument = localUcitajDokument(meta.id);
  return { dokument, meta, storageMode: "local" };
}

export function sazetakPfmeaCpPaketa(dokument) {
  if (!dokument) {
    return {
      imaDokument: false,
      pfmeaBroj: 0,
      cpBroj: 0,
      rpnBroj: 0,
      naziv: "",
      revizija: "",
    };
  }
  const pf = dokument.pfmea?.redovi || [];
  const cp = dokument.controlPlan?.redovi || [];
  const rpn = dokument.rpnSummary?.length || pf.length;
  return {
    imaDokument: true,
    pfmeaBroj: pf.length,
    cpBroj: cp.length,
    rpnBroj: rpn,
    naziv: dokument.naziv || "",
    revizija: dokument.revizija || "",
    idDeo: dokument.idDeo || "",
    pfmeaRedovi: pf,
    cpRedovi: cp,
    rpnSummary: dokument.rpnSummary || [],
  };
}
