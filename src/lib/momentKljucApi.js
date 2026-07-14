/** CRUD + uvoz kompletnog šifrarnika momentnog ključa. */

import kompletSeed from "../data/momentKljucKomplet.json" with { type: "json" };
import {
  momentBlokadaZaKlasu,
  momentUzorakObavezan,
  momentJobNeutralExport,
  MOMENT_DEO_ALIAS,
  tipVozilaIzIdDeo,
} from "./momentKljuc.js";
import { lokalnaPutanjaMomentDijagram } from "./crtezAssets.js";

function normId(s) {
  return String(s || "").trim().toUpperCase();
}

/** Katalog zone (MRAP1-FINAL-001) → stvarni id_deo u delovi (MRAP1-001). */
export { MOMENT_DEO_ALIAS } from "./momentKljuc.js";

const CELA_VOZILA_ZA_UVOZ = ["MRAP1-001", "MRAP-001", "NTV-001"];

export async function resolveMomentIdDeo(supabase, idDeo) {
  const norm = normId(idDeo);
  const kandidati = [norm, MOMENT_DEO_ALIAS[norm]].filter(Boolean);
  const jedinstveni = [...new Set(kandidati)];
  for (const k of jedinstveni) {
    const { data, error } = await supabase.from("delovi").select("id_deo").eq("id_deo", k).maybeSingle();
    if (error) throw error;
    if (data?.id_deo) return data.id_deo;
  }
  return null;
}

export async function tipVozilaZaDeo(supabase, idDeo) {
  const { data } = await supabase.from("delovi")
    .select("vozilo_katalog_id")
    .eq("id_deo", idDeo)
    .maybeSingle();
  return String(data?.vozilo_katalog_id || tipVozilaIzIdDeo(idDeo) || "").trim().toUpperCase() || null;
}

async function listaDelovaZaMomentUvoz(supabase, primarniDeo) {
  const out = [];
  for (const k of CELA_VOZILA_ZA_UVOZ) {
    const r = await resolveMomentIdDeo(supabase, k);
    if (r && !out.includes(r)) out.push(r);
  }
  if (primarniDeo && !out.includes(primarniDeo)) out.unshift(primarniDeo);
  return out.length ? out : [primarniDeo];
}

async function proveriMomentSema(supabase) {
  const { error } = await supabase.from("crtez_assets").select("id").limit(1);
  if (error) {
    if (/does not exist|schema cache/i.test(error.message)) {
      throw new Error("Tabele momentnog ključa nisu u bazi — pokrenite 54_crtez_assets_moment.sql u Supabase SQL Editoru.");
    }
    throw error;
  }
}

export async function fetchMomentJobovi(supabase, { idDeo = null, samoAktivni = true } = {}) {
  let q = supabase.from("moment_job").select("*").order("id_deo").order("kod_job");
  if (samoAktivni) q = q.eq("aktivan", true);
  if (idDeo) q = q.eq("id_deo", normId(idDeo));
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function fetchMomentJobDetalj(supabase, jobId) {
  const id = Number(jobId);
  if (!Number.isFinite(id)) return null;
  const [{ data: job, error: e1 }, { data: koraci, error: e2 }, { data: pozicije, error: e3 }] = await Promise.all([
    supabase.from("moment_job").select("*").eq("id", id).maybeSingle(),
    supabase.from("moment_korak").select("*").eq("job_id", id).order("redosled"),
    supabase.from("moment_pozicija").select("*").eq("job_id", id).order("poz_br"),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;
  if (!job) return null;

  let crtez = null;
  if (job.crtez_asset_id) {
    const { data } = await supabase.from("crtez_assets").select("*").eq("id", job.crtez_asset_id).maybeSingle();
    crtez = data;
  }
  return { job, koraci: koraci || [], pozicije: pozicije || [], crtez };
}

export async function upsertMomentJob(supabase, row) {
  const payload = {
    id_deo: normId(row.id_deo),
    kod_job: String(row.kod_job || "").trim(),
    naziv: String(row.naziv || "").trim(),
    tip_vozila: row.tip_vozila ? String(row.tip_vozila).trim().toUpperCase() : null,
    operacija: row.operacija ? String(row.operacija).trim() : null,
    pogon_kod: row.pogon_kod ? normId(row.pogon_kod) : null,
    linija: row.linija ? String(row.linija).trim() : null,
    crtez_asset_id: row.crtez_asset_id || null,
    vendor_profil: row.vendor_profil || null,
    revizija: row.revizija || "A",
    aktivan: row.aktivan !== false,
    pfmea_cp_dokument_id: row.pfmea_cp_dokument_id || null,
    napomena: row.napomena || null,
    updated_at: new Date().toISOString(),
  };
  if (!payload.id_deo || !payload.kod_job || !payload.naziv) {
    throw new Error("ID deo, kod job-a i naziv su obavezni");
  }

  if (row.id) {
    const { data, error } = await supabase.from("moment_job").update(payload).eq("id", row.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("moment_job").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteMomentJob(supabase, jobId) {
  const { error } = await supabase.from("moment_job").delete().eq("id", jobId);
  if (error) throw error;
}

export async function upsertMomentPozicija(supabase, row) {
  const payload = {
    job_id: row.job_id,
    poz_br: String(row.poz_br || "").trim(),
    opis: row.opis || null,
    klasifikacija: row.klasifikacija || null,
    koord_x: row.koord_x ?? null,
    koord_y: row.koord_y ?? null,
    napomena: row.napomena || null,
  };
  if (!payload.job_id || !payload.poz_br) throw new Error("job_id i poz_br su obavezni");

  if (row.id) {
    const { data, error } = await supabase.from("moment_pozicija").update(payload).eq("id", row.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("moment_pozicija").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteMomentPozicija(supabase, id) {
  const { error } = await supabase.from("moment_pozicija").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertMomentKorak(supabase, row) {
  const kl = row.klasifikacija || null;
  const payload = {
    job_id: row.job_id,
    redosled: Number(row.redosled),
    poz_br: row.poz_br ? String(row.poz_br).trim() : null,
    prolaz: Number(row.prolaz) || 1,
    tip: row.tip || "NM",
    cilj_nm: row.cilj_nm != null && row.cilj_nm !== "" ? Number(row.cilj_nm) : null,
    tol_min: row.tol_min != null && row.tol_min !== "" ? Number(row.tol_min) : null,
    tol_max: row.tol_max != null && row.tol_max !== "" ? Number(row.tol_max) : null,
    tol_pct: row.tol_pct != null && row.tol_pct !== "" ? Number(row.tol_pct) : null,
    ugao_cilj: row.ugao_cilj != null && row.ugao_cilj !== "" ? Number(row.ugao_cilj) : null,
    ugao_tol: row.ugao_tol != null && row.ugao_tol !== "" ? Number(row.ugao_tol) : null,
    klasifikacija: kl,
    varijanta: row.varijanta || null,
    merilo_id: row.merilo_id || null,
    control_plan_stavka_id: row.control_plan_stavka_id || null,
    torque_id: row.torque_id || null,
    pfmea_veza: row.pfmea_veza || null,
    pfmea_stavka_id: row.pfmea_stavka_id || null,
    tool_kod: row.tool_kod || null,
    program_kod: row.program_kod || null,
    vijak: row.vijak || null,
    klasa_vijka: row.klasa_vijka || null,
    sklop: row.sklop || null,
    blokiraj_na_nok: momentBlokadaZaKlasu(kl, row.blokiraj_na_nok),
    uzorak_obavezan: row.uzorak_obavezan != null ? !!row.uzorak_obavezan : momentUzorakObavezan(kl),
    napomena: row.napomena || null,
  };
  if (!payload.job_id || !Number.isFinite(payload.redosled)) {
    throw new Error("job_id i redosled su obavezni");
  }

  if (row.id) {
    const { data, error } = await supabase.from("moment_korak").update(payload).eq("id", row.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("moment_korak").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteMomentKorak(supabase, id) {
  const { error } = await supabase.from("moment_korak").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchMomentKlucevi(supabase) {
  const { data, error } = await supabase.from("merila")
    .select("*, kalibracije(datum_kal, sledeca_kal, rezultat)")
    .eq("kategorija", "momentni_kljuc")
    .eq("aktivno", true)
    .order("naziv");
  if (error) throw error;
  return (data || []).map((m) => ({
    ...m,
    nm_min: m.nm_min != null ? Number(m.nm_min) : null,
    nm_max: m.nm_max != null ? Number(m.nm_max) : null,
  }));
}

export async function upsertMomentKljuc(supabase, row) {
  const payload = {
    naziv: String(row.naziv || "").trim(),
    serijski_broj: row.serijski_broj || null,
    tip: row.tip || "Digitalni momentni ključ",
    lokacija: row.lokacija || null,
    kategorija: "momentni_kljuc",
    vendor_profil: row.vendor_profil || null,
    linija_stanica: row.linija_stanica || null,
    aktivno: row.aktivno !== false,
  };
  if (!payload.naziv) throw new Error("Naziv ključa je obavezan");

  if (row.id) {
    const { data, error } = await supabase.from("merila").update(payload).eq("id", row.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("merila").insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function osigurajCrtezAsset(supabase, { refId, naziv, dijagram }) {
  const putanja = lokalnaPutanjaMomentDijagram(dijagram);
  const { data: postojeci } = await supabase.from("crtez_assets")
    .select("id")
    .eq("ref_tip", "moment_job")
    .eq("ref_id", refId)
    .eq("revizija", "A")
    .maybeSingle();

  if (postojeci?.id) return postojeci.id;

  const { data, error } = await supabase.from("crtez_assets").insert({
    ref_tip: "moment_job",
    ref_id: refId,
    naziv,
    prikaz_format: "svg",
    prikaz_putanja: putanja,
    revizija: "A",
    napomena: "Automatski iz kompletnog šifrarnika",
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

/** Učitaj kompletan šifrarnik iz momentKljucKomplet.json */
export async function uvoziKompletanSifrarnik(supabase, {
  idDeo = kompletSeed.meta.id_deo,
  zameniPostojece = false,
} = {}) {
  await proveriMomentSema(supabase);

  const deo = await resolveMomentIdDeo(supabase, idDeo);
  if (!deo) {
    const trazeno = normId(idDeo);
    const predlog = MOMENT_DEO_ALIAS[trazeno] || "MRAP1-001";
    throw new Error(
      `Deo ${trazeno} nije u tabeli delovi. Za MRAP1 komplet koristite ${predlog} `
      + "(Šifrarnik → Delovi ili migracija 43_fix_vozilo_dijagram.sql).",
    );
  }

  const meta = kompletSeed.meta;
  const deloviZaUvoz = await listaDelovaZaMomentUvoz(supabase, deo);
  const rezultat = {
    jobovi: 0, pozicije: 0, koraci: 0, kljucevi: 0,
    preskoceno: [], greske: [], id_deo: deo, delovi: deloviZaUvoz,
  };

  if (zameniPostojece) {
    for (const d of deloviZaUvoz) {
      const { data: stari } = await supabase.from("moment_job").select("id").eq("id_deo", d);
      for (const j of stari || []) {
        await supabase.from("moment_korak").delete().eq("job_id", j.id);
        await supabase.from("moment_pozicija").delete().eq("job_id", j.id);
        await supabase.from("moment_job").delete().eq("id", j.id);
      }
    }
  }

  for (const targetDeo of deloviZaUvoz) {
    const tipVozila = (await tipVozilaZaDeo(supabase, targetDeo)) || meta.tip_vozila;

    for (const jobDef of kompletSeed.jobs) {
      try {
        const refCrtez = jobDef.kod_job.toUpperCase();
        const crtezId = await osigurajCrtezAsset(supabase, {
          refId: refCrtez,
          naziv: jobDef.naziv,
          dijagram: jobDef.dijagram,
        });

        const { data: postojeci } = await supabase.from("moment_job")
          .select("id")
          .eq("id_deo", targetDeo)
          .eq("kod_job", jobDef.kod_job)
          .eq("revizija", "A")
          .maybeSingle();

        let jobId = postojeci?.id;
        if (!jobId) {
          const { data: novi, error } = await supabase.from("moment_job").insert({
            id_deo: targetDeo,
            kod_job: jobDef.kod_job,
            naziv: jobDef.naziv,
            tip_vozila: tipVozila,
            operacija: meta.operacija,
            crtez_asset_id: crtezId,
            vendor_profil: jobDef.vendor_profil,
            revizija: "A",
            napomena: `Kompletan šifrarnik v1 · ${targetDeo}`,
          }).select("id").single();
          if (error) throw error;
          jobId = novi.id;
          rezultat.jobovi += 1;
        } else if (zameniPostojece) {
          await supabase.from("moment_korak").delete().eq("job_id", jobId);
          await supabase.from("moment_pozicija").delete().eq("job_id", jobId);
        } else {
          rezultat.preskoceno.push(`${targetDeo}/${jobDef.kod_job} već postoji`);
          continue;
        }

        for (const p of jobDef.pozicije || []) {
          const { error } = await supabase.from("moment_pozicija").upsert({
            job_id: jobId,
            poz_br: p.poz_br,
            opis: p.opis,
            klasifikacija: p.klasifikacija,
          }, { onConflict: "job_id,poz_br" });
          if (error) throw error;
          rezultat.pozicije += 1;
        }

        for (const k of jobDef.koraci || []) {
          const { error } = await supabase.from("moment_korak").upsert({
            job_id: jobId,
            redosled: k.redosled,
            poz_br: k.poz_br,
            prolaz: k.prolaz || 1,
            tip: k.tip || "NM",
            cilj_nm: k.cilj_nm,
            tol_min: k.tol_min,
            tol_max: k.tol_max,
            tol_pct: k.tol_pct,
            ugao_cilj: k.ugao_cilj,
            ugao_tol: k.ugao_tol,
            klasifikacija: k.klasifikacija,
            varijanta: k.varijanta,
            blokiraj_na_nok: momentBlokadaZaKlasu(k.klasifikacija, k.blokiraj_na_nok),
            uzorak_obavezan: k.uzorak_obavezan != null ? k.uzorak_obavezan : momentUzorakObavezan(k.klasifikacija),
            napomena: k.napomena,
          }, { onConflict: "job_id,redosled" });
          if (error) throw error;
          rezultat.koraci += 1;
        }
      } catch (e) {
        rezultat.greske.push(`${targetDeo}/${jobDef.kod_job}: ${e.message}`);
      }
    }
  }

  for (const m of kompletSeed.merila_demo || []) {
    const { data: ex } = await supabase.from("merila")
      .select("id")
      .eq("serijski_broj", m.serijski_broj)
      .maybeSingle();
    if (ex) continue;
    const { error } = await supabase.from("merila").insert({
      naziv: m.naziv,
      serijski_broj: m.serijski_broj,
      tip: "Digitalni momentni ključ",
      lokacija: m.lokacija,
      kategorija: "momentni_kljuc",
      vendor_profil: m.vendor_profil,
      linija_stanica: m.linija_stanica,
      aktivno: true,
    });
    if (!error) rezultat.kljucevi += 1;
  }

  return rezultat;
}

export async function izveziMomentJobJson(supabase, jobId) {
  const paket = await fetchMomentJobDetalj(supabase, jobId);
  if (!paket?.job) throw new Error("JOB nije pronađen");
  return momentJobNeutralExport(paket.job, paket.koraci);
}

export { kompletSeed };
