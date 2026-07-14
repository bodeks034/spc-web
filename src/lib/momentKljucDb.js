/** Supabase upiti — digitalni momentni ključ. */

import {
  izaberiMomentJobove,
  momentJobNeutralExport,
  proveriMomentOk,
  tipVozilaIzIdDeo,
  tipoviZaMomentPretragu,
} from "./momentKljuc.js";
import { resolveMomentIdDeo } from "./momentKljucApi.js";
import { momentErrorKod } from "./momentKljucList.js";

export async function ucitajMomentJoboveZaDeo(supabase, {
  idDeo,
  operacija = null,
  pogonKod = null,
  linija = null,
  tipVozila = null,
} = {}) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return [];

  const resolved = (await resolveMomentIdDeo(supabase, id)) || id;
  let tip = tipVozila ? String(tipVozila).trim().toUpperCase() : null;
  if (!tip) {
    const { data: deoRow } = await supabase.from("delovi")
      .select("vozilo_katalog_id")
      .eq("id_deo", resolved)
      .maybeSingle();
    tip = String(deoRow?.vozilo_katalog_id || tipVozilaIzIdDeo(resolved) || "").trim().toUpperCase() || null;
  }

  const tipovi = tipoviZaMomentPretragu(tip);
  const idDeoLista = [...new Set([resolved, id])];

  const [{ data: poDeu, error: e1 }, { data: poTipu, error: e2 }] = await Promise.all([
    supabase.from("moment_job")
      .select("*")
      .in("id_deo", idDeoLista)
      .eq("aktivan", true)
      .order("kod_job"),
    tipovi.length
      ? supabase.from("moment_job")
        .select("*")
        .in("tip_vozila", tipovi)
        .eq("aktivan", true)
        .order("kod_job")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const spojeno = new Map();
  for (const j of [...(poDeu || []), ...(poTipu || [])]) {
    spojeno.set(j.id, j);
  }

  return izaberiMomentJobove([...spojeno.values()], {
    idDeo: resolved,
    operacija,
    pogonKod,
    linija,
    tipVozila: tip,
  });
}

export async function ucitajMomentJobPaket(supabase, jobId) {
  const id = Number(jobId);
  if (!Number.isFinite(id)) return null;

  const [{ data: job, error: eJob }, { data: koraci, error: eK }, { data: pozicije, error: eP }] = await Promise.all([
    supabase.from("moment_job").select("*").eq("id", id).maybeSingle(),
    supabase.from("moment_korak").select("*").eq("job_id", id).order("redosled"),
    supabase.from("moment_pozicija").select("*").eq("job_id", id).order("poz_br"),
  ]);
  if (eJob) throw eJob;
  if (eK) throw eK;
  if (eP) throw eP;
  if (!job) return null;

  let crtez = null;
  if (job.crtez_asset_id) {
    const { data } = await supabase.from("crtez_assets").select("*").eq("id", job.crtez_asset_id).maybeSingle();
    crtez = data;
  }

  return { job, koraci: koraci || [], pozicije: pozicije || [], crtez };
}

export async function snimiMomentProtokol(supabase, {
  datum,
  smena,
  idDeo,
  radniNalog,
  jobId,
  korak,
  ostvarenoNm,
  ostvarenoUgao = null,
  meriloId = null,
  radnikId = null,
  operater = null,
  linija = null,
  izvor = "rucno",
  napomena = null,
  toolKod = null,
  programKod = null,
  torqueId = null,
  errorKod = null,
  vin = null,
}) {
  const provera = proveriMomentOk(korak, ostvarenoNm, ostvarenoUgao);
  const payload = {
    datum: datum || new Date().toISOString().split("T")[0],
    smena: smena ?? null,
    id_deo: String(idDeo || "").trim().toUpperCase(),
    radni_nalog: radniNalog || null,
    job_id: jobId,
    korak_id: korak.id,
    korak_redosled: korak.redosled,
    poz_br: korak.poz_br || null,
    ostvareno_nm: ostvarenoNm,
    ostvareno_ugao: ostvarenoUgao,
    status: provera.ok ? "OK" : "NOK",
    merilo_id: meriloId,
    radnik_id: radnikId,
    operater,
    linija,
    izvor,
    napomena: napomena || (provera.ok ? null : provera.razlog),
    tool_kod: toolKod || korak.tool_kod || null,
    program_kod: programKod || korak.program_kod || null,
    torque_id: torqueId || korak.torque_id || null,
    error_kod: provera.ok ? null : (errorKod || momentErrorKod(provera)),
    vin: vin || null,
  };

  const { data, error } = await supabase.from("moment_protokol")
    .insert(payload).select().single();
  if (error) throw error;
  return { zapis: data, provera };
}

export async function izveziMomentJobNeutral(supabase, jobId, vendorProfil = null) {
  const paket = await ucitajMomentJobPaket(supabase, jobId);
  if (!paket?.job) throw new Error("JOB nije pronađen");
  return momentJobNeutralExport(paket.job, paket.koraci, { vendorProfil });
}

export async function ucitajMomentnaMerila(supabase, { linija = null } = {}) {
  let q = supabase.from("merila")
    .select("id, naziv, serijski_broj, tip, lokacija, kategorija, vendor_profil, linija_stanica, aktivno, tool_kod, nm_min, nm_max, program_kod")
    .eq("aktivno", true)
    .eq("kategorija", "momentni_kljuc")
    .order("naziv");
  if (linija) q = q.eq("linija_stanica", linija);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
