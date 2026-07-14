/**
 * Uvoz protokola zatezanja iz vendor fajla (moment-drop/izvoz ili file picker u UI).
 */
import { parsirajTekstMomentKljuca } from "./momentKljucUvoz.js";
import { ucitajMomentJobPaket } from "./momentKljucDb.js";
import { proveriMomentOk } from "./momentKljuc.js";
import { momentErrorKod } from "./momentKljucList.js";

function danasIso() {
  return new Date().toISOString().split("T")[0];
}

export async function uveziMomentProtokolIzTeksta(supabase, {
  text,
  jobId,
  idDeo = null,
  vendorProfil = "generic",
  smena = null,
  radniNalog = null,
  linija = null,
  datum = null,
  dryRun = false,
}) {
  const paket = await ucitajMomentJobPaket(supabase, jobId);
  if (!paket?.job) return { greska: "JOB nije pronađen", uvezeno: 0, greske: [] };

  const koraci = paket.koraci || [];
  if (!koraci.length) return { greska: "JOB nema korake u šifrarniku", uvezeno: 0, greske: [] };

  const id = String(idDeo || paket.job.id_deo || "").trim().toUpperCase();
  if (!id) return { greska: "Nedostaje id_deo", uvezeno: 0, greske: [] };

  const odcitavanja = parsirajTekstMomentKljuca(text, vendorProfil);
  if (!odcitavanja.length) return { greska: "Nema prepoznatih očitavanja u fajlu", uvezeno: 0, greske: [] };

  const d = datum || danasIso();
  const greske = [];
  let uvezeno = 0;

  for (let i = 0; i < odcitavanja.length; i += 1) {
    const o = odcitavanja[i];
    if (i >= koraci.length) {
      greske.push(`Očitavanje ${i + 1}: nema odgovarajućeg koraka u JOB-u`);
      continue;
    }
    const korak = koraci[i];
    const provera = proveriMomentOk(korak, o.nm, o.ugao);
    const status = o.status || (provera.ok ? "OK" : "NOK");
    const payload = {
      datum: d,
      smena: smena ?? null,
      id_deo: id,
      radni_nalog: radniNalog || null,
      job_id: paket.job.id,
      korak_id: korak.id,
      korak_redosled: korak.redosled,
      poz_br: korak.poz_br || null,
      ostvareno_nm: o.nm,
      ostvareno_ugao: o.ugao ?? null,
      status,
      linija: linija || paket.job.linija || null,
      izvor: "fajl",
      napomena: provera.ok ? null : provera.razlog,
      error_kod: status === "OK" ? null : momentErrorKod(provera),
      tool_kod: korak.tool_kod || null,
      program_kod: korak.program_kod || null,
      torque_id: korak.torque_id || null,
    };

    if (dryRun) {
      uvezeno += 1;
      continue;
    }
    const { error } = await supabase.from("moment_protokol").insert(payload);
    if (error) greske.push(`Korak ${korak.redosled}: ${error.message}`);
    else uvezeno += 1;
  }

  return {
    uvezeno,
    ukupno: odcitavanja.length,
    greske,
    idDeo: id,
    jobId: paket.job.id,
    kodJob: paket.job.kod_job,
  };
}

/** Učitaj jedan ili više fajlova iz browser file pickera. */
export async function uveziMomentProtokolFajlove(supabase, files, opts) {
  const lista = [...(files || [])];
  let uvezeno = 0;
  const greske = [];

  for (const f of lista) {
    try {
      const text = await f.text();
      const r = await uveziMomentProtokolIzTeksta(supabase, { ...opts, text });
      if (r.greska) greske.push(`${f.name}: ${r.greska}`);
      else {
        uvezeno += r.uvezeno;
        if (r.greske?.length) r.greske.forEach((g) => greske.push(`${f.name}: ${g}`));
      }
    } catch (e) {
      greske.push(`${f.name}: ${e.message}`);
    }
  }

  return { uvezeno, greske, fajlova: lista.length };
}
