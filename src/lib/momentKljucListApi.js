/** API — jedan list → baza; učitavanje liste iz baze. */

import {
  rasporediMomentListu,
  spljostiMomentUBazu,
  parseMomentListObjekti,
  toolMaster,
} from "./momentKljucList.js";
import { resolveMomentIdDeo, tipVozilaZaDeo } from "./momentKljucApi.js";
import { lokalnaPutanjaMomentDijagram } from "./crtezAssets.js";
import { momentBlokadaZaKlasu, momentUzorakObavezan } from "./momentKljuc.js";

async function osigurajCrtezAsset(supabase, { refId, naziv, dijagram }) {
  if (!dijagram) return null;
  const putanja = lokalnaPutanjaMomentDijagram(dijagram);
  const { data: postojeci } = await supabase.from("crtez_assets")
    .select("id")
    .eq("ref_tip", "moment_job")
    .eq("ref_id", refId.toUpperCase())
    .eq("revizija", "A")
    .maybeSingle();
  if (postojeci?.id) return postojeci.id;
  const { data, error } = await supabase.from("crtez_assets").insert({
    ref_tip: "moment_job",
    ref_id: refId.toUpperCase(),
    naziv,
    prikaz_format: "svg",
    prikaz_putanja: putanja,
    revizija: "A",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

function jobKeyUpper(idDeo, j) {
  return `${idDeo}|${j.kod_job}|${j.operacija || ""}|${j.revizija || "A"}`.toUpperCase();
}

/** Učitaj celu moment šemu kao jedan flat list. */
export async function ucitajMomentListuIzBaze(supabase, { idDeo = null } = {}) {
  let q = supabase.from("moment_job")
    .select(`
      *,
      moment_korak(*),
      moment_pozicija(*),
      crtez_assets(prikaz_putanja)
    `)
    .eq("aktivan", true)
    .order("id_deo")
    .order("kod_job");
  if (idDeo) q = q.eq("id_deo", String(idDeo).trim().toUpperCase());
  const { data, error } = await q;
  if (error) throw error;

  const redovi = [];
  for (const job of data || []) {
    redovi.push(...spljostiMomentUBazu(
      job,
      job.moment_korak,
      job.moment_pozicija,
      job.crtez_assets,
    ));
  }
  return redovi;
}

/** Snimi flat listu — automatski raspoređuje u job/poz/korak. */
export async function snimiMomentListu(supabase, redovi, {
  zameniPostojece = false,
  idDeoFilter = null,
} = {}) {
  const norm = parseMomentListObjekti(redovi);
  const { jobovi, pozicije, koraci, greske } = rasporediMomentListu(norm);
  const rez = { jobovi: 0, pozicije: 0, koraci: 0, greske: [...greske], preskoceno: [] };

  const jobIdMap = new Map();
  const deoCache = new Map();

  const resolveDeo = async (raw) => {
    if (deoCache.has(raw)) return deoCache.get(raw);
    const r = await resolveMomentIdDeo(supabase, raw) || raw;
    deoCache.set(raw, r);
    return r;
  };

  const targetDeos = new Set();
  for (const j of jobovi) {
    const d = await resolveDeo(j.id_deo);
    if (idDeoFilter && d !== String(idDeoFilter).trim().toUpperCase()) continue;
    targetDeos.add(d);
  }

  if (zameniPostojece) {
    for (const d of targetDeos) {
      const { data: stari } = await supabase.from("moment_job").select("id").eq("id_deo", d);
      for (const row of stari || []) {
        await supabase.from("moment_korak").delete().eq("job_id", row.id);
        await supabase.from("moment_pozicija").delete().eq("job_id", row.id);
        await supabase.from("moment_job").delete().eq("id", row.id);
      }
    }
  }

  for (const j of jobovi) {
    const idDeo = await resolveDeo(j.id_deo);
    if (idDeoFilter && idDeo !== String(idDeoFilter).trim().toUpperCase()) continue;

    const tipVozila = j.tip_vozila || (await tipVozilaZaDeo(supabase, idDeo));
    const refCrtez = j.kod_job.toUpperCase();
    let crtezId = null;
    try {
      crtezId = await osigurajCrtezAsset(supabase, {
        refId: refCrtez,
        naziv: j.naziv,
        dijagram: j.dijagram_fajl,
      });
    } catch (e) {
      rez.greske.push(`${idDeo}/${j.kod_job} crtež: ${e.message}`);
    }

    const { data: postojeci } = await supabase.from("moment_job")
      .select("id")
      .eq("id_deo", idDeo)
      .eq("kod_job", j.kod_job)
      .eq("revizija", j.revizija || "A")
      .maybeSingle();

    let jobId = postojeci?.id;
    const jk = jobKeyUpper(idDeo, j);

    if (!jobId) {
      const { data: novi, error } = await supabase.from("moment_job").insert({
        id_deo: idDeo,
        kod_job: j.kod_job,
        naziv: j.naziv,
        tip_vozila: tipVozila,
        operacija: j.operacija,
        vendor_profil: j.vendor_profil,
        revizija: j.revizija || "A",
        crtez_asset_id: crtezId,
        dijagram_fajl: j.dijagram_fajl,
        sekvenca_sablon: j.sekvenca_sablon,
        napomena: j.napomena,
      }).select("id").single();
      if (error) {
        rez.greske.push(`${jk}: ${error.message}`);
        continue;
      }
      jobId = novi.id;
      rez.jobovi += 1;
    } else if (zameniPostojece) {
      await supabase.from("moment_korak").delete().eq("job_id", jobId);
      await supabase.from("moment_pozicija").delete().eq("job_id", jobId);
      await supabase.from("moment_job").update({
        naziv: j.naziv,
        tip_vozila: tipVozila,
        operacija: j.operacija,
        vendor_profil: j.vendor_profil,
        crtez_asset_id: crtezId,
        dijagram_fajl: j.dijagram_fajl,
        sekvenca_sablon: j.sekvenca_sablon,
        napomena: j.napomena,
        updated_at: new Date().toISOString(),
      }).eq("id", jobId);
    } else {
      rez.preskoceno.push(jk);
    }
    jobIdMap.set(jk, jobId);
    jobIdMap.set(`${j.id_deo}|${j.kod_job}|${j.operacija || ""}|${j.revizija || "A"}`.toUpperCase(), jobId);
  }

  for (const p of pozicije) {
    const jobId = jobIdMap.get(p.jobKey);
    if (!jobId) continue;
    const { error } = await supabase.from("moment_pozicija").upsert({
      job_id: jobId,
      poz_br: p.poz_br,
      opis: p.opis,
      klasifikacija: p.klasifikacija,
    }, { onConflict: "job_id,poz_br" });
    if (error) rez.greske.push(`poz ${p.poz_br}: ${error.message}`);
    else rez.pozicije += 1;
  }

  for (const k of koraci) {
    const jobId = jobIdMap.get(k.jobKey);
    if (!jobId) continue;
    const { error } = await supabase.from("moment_korak").upsert({
      job_id: jobId,
      redosled: k.redosled,
      poz_br: k.poz_br,
      prolaz: k.prolaz,
      tip: k.tip,
      cilj_nm: k.cilj_nm,
      tol_min: k.tol_min,
      tol_max: k.tol_max,
      tol_pct: k.tol_pct,
      ugao_cilj: k.ugao_cilj,
      ugao_tol: k.ugao_tol,
      klasifikacija: k.klasifikacija,
      varijanta: k.varijanta,
      torque_id: k.torque_id,
      pfmea_veza: k.pfmea_veza,
      pfmea_stavka_id: k.pfmea_stavka_id,
      control_plan_stavka_id: k.control_plan_stavka_id,
      tool_kod: k.tool_kod,
      program_kod: k.program_kod,
      vijak: k.vijak,
      klasa_vijka: k.klasa_vijka,
      sklop: k.sklop,
      blokiraj_na_nok: momentBlokadaZaKlasu(k.klasifikacija, k.blokiraj_na_nok),
      uzorak_obavezan: k.uzorak_obavezan,
      napomena: k.napomena,
    }, { onConflict: "job_id,redosled" });
    if (error) rez.greske.push(`korak ${k.redosled}: ${error.message}`);
    else rez.koraci += 1;
  }

  return rez;
}

/** Seed TK001–TK005 u merila ako ne postoje. */
export async function osigurajMomentToolMaster(supabase) {
  let dodato = 0;
  for (const t of toolMaster.alati) {
    const { data: ex } = await supabase.from("merila")
      .select("id")
      .eq("tool_kod", t.tool_kod)
      .maybeSingle();
    if (ex) {
      await supabase.from("merila").update({
        nm_min: t.nm_min,
        nm_max: t.nm_max,
        program_kod: t.program_kod,
        kategorija: "momentni_kljuc",
      }).eq("id", ex.id);
      continue;
    }
    const { error } = await supabase.from("merila").insert({
      naziv: t.naziv,
      serijski_broj: t.tool_kod,
      tip: "Digitalni momentni ključ",
      kategorija: "momentni_kljuc",
      tool_kod: t.tool_kod,
      nm_min: t.nm_min,
      nm_max: t.nm_max,
      program_kod: t.program_kod,
      aktivno: true,
    });
    if (!error) dodato += 1;
  }
  return dodato;
}

export function filtrirajKlucevePoNm(kljucevi, ciljNm) {
  const n = Number(ciljNm);
  if (!Number.isFinite(n)) return kljucevi || [];
  const pogodni = (kljucevi || []).filter((m) => {
    if (m.nm_min != null && m.nm_max != null) {
      return n >= Number(m.nm_min) && n <= Number(m.nm_max);
    }
    return true;
  });
  return pogodni.length ? pogodni : (kljucevi || []);
}
