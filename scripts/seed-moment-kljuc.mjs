#!/usr/bin/env node
/**
 * Seed kompletnog šifrarnika momentnog ključa u Supabase.
 * Zahteva: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY u .env
 * node scripts/seed-moment-kljuc.mjs [--zameni]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = path.join(ROOT, "src/data/momentKljucKomplet.json");
const zameni = process.argv.includes("--zameni");

async function loadEnv() {
  try {
    const raw = await fs.readFile(path.join(ROOT, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* optional */ }
}

function blokiraj(kl, eksplicitno) {
  if (eksplicitno != null) return !!eksplicitno;
  return kl === "VSK" || kl === "KSK";
}

async function main() {
  await loadEnv();
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Nedostaje SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY u .env");
    process.exit(1);
  }

  const seed = JSON.parse(await fs.readFile(JSON_PATH, "utf8"));
  const supabase = createClient(url, key);
  const deo = String(seed.meta.id_deo).trim().toUpperCase();
  const alias = { "MRAP1-FINAL-001": "MRAP1-001", "MRAP-FINAL-001": "MRAP-001", "NTV-FINAL-001": "NTV-001" };
  let idDeo = deo;
  const { data: deoRow } = await supabase.from("delovi").select("id_deo").eq("id_deo", deo).maybeSingle();
  if (!deoRow && alias[deo]) {
    const { data: alt } = await supabase.from("delovi").select("id_deo").eq("id_deo", alias[deo]).maybeSingle();
    if (alt) idDeo = alt.id_deo;
  } else if (deoRow) {
    idDeo = deoRow.id_deo;
  } else {
    console.error(`Deo ${deo} nije u tabeli delovi — pokrenite 43_fix_vozilo_dijagram.sql`);
    process.exit(1);
  }

  if (zameni) {
    const { data: stari } = await supabase.from("moment_job").select("id").eq("id_deo", idDeo);
    for (const j of stari || []) {
      await supabase.from("moment_korak").delete().eq("job_id", j.id);
      await supabase.from("moment_pozicija").delete().eq("job_id", j.id);
      await supabase.from("moment_job").delete().eq("id", j.id);
    }
    console.log("Obrisani postojeći job-ovi za", idDeo);
  }

  let jobovi = 0;
  let koraci = 0;
  let pozicije = 0;
  let kljucevi = 0;

  for (const jobDef of seed.jobs) {
    const putanja = `/moment/dijagrami/${jobDef.dijagram}`;
    const refCrtez = jobDef.kod_job.toUpperCase();

    let { data: asset } = await supabase.from("crtez_assets")
      .select("id").eq("ref_tip", "moment_job").eq("ref_id", refCrtez).eq("revizija", "A").maybeSingle();
    if (!asset) {
      const { data: novi } = await supabase.from("crtez_assets").insert({
        ref_tip: "moment_job", ref_id: refCrtez, naziv: jobDef.naziv,
        prikaz_format: "svg", prikaz_putanja: putanja, revizija: "A",
      }).select("id").single();
      asset = novi;
    }

    let { data: job } = await supabase.from("moment_job")
      .select("id").eq("id_deo", idDeo).eq("kod_job", jobDef.kod_job).eq("revizija", "A").maybeSingle();

    if (!job) {
      const { data: novi } = await supabase.from("moment_job").insert({
        id_deo: idDeo,
        kod_job: jobDef.kod_job,
        naziv: jobDef.naziv,
        tip_vozila: seed.meta.tip_vozila,
        operacija: seed.meta.operacija,
        crtez_asset_id: asset.id,
        vendor_profil: jobDef.vendor_profil,
        revizija: "A",
      }).select("id").single();
      job = novi;
      jobovi += 1;
    } else if (zameni) {
      await supabase.from("moment_korak").delete().eq("job_id", job.id);
      await supabase.from("moment_pozicija").delete().eq("job_id", job.id);
    } else {
      console.log("Preskačem postojeći JOB:", jobDef.kod_job);
      continue;
    }

    for (const p of jobDef.pozicije || []) {
      await supabase.from("moment_pozicija").upsert({
        job_id: job.id, poz_br: p.poz_br, opis: p.opis, klasifikacija: p.klasifikacija,
      }, { onConflict: "job_id,poz_br" });
      pozicije += 1;
    }

    for (const k of jobDef.koraci || []) {
      await supabase.from("moment_korak").upsert({
        job_id: job.id,
        redosled: k.redosled,
        poz_br: k.poz_br,
        prolaz: k.prolaz || 1,
        tip: k.tip || "NM",
        cilj_nm: k.cilj_nm,
        tol_min: k.tol_min,
        tol_max: k.tol_max,
        klasifikacija: k.klasifikacija,
        varijanta: k.varijanta,
        blokiraj_na_nok: blokiraj(k.klasifikacija, k.blokiraj_na_nok),
        napomena: k.napomena,
      }, { onConflict: "job_id,redosled" });
      koraci += 1;
    }
  }

  for (const m of seed.merila_demo || []) {
    const { data: ex } = await supabase.from("merila").select("id").eq("serijski_broj", m.serijski_broj).maybeSingle();
    if (ex) continue;
    await supabase.from("merila").insert({
      naziv: m.naziv,
      serijski_broj: m.serijski_broj,
      tip: "Digitalni momentni ključ",
      lokacija: m.lokacija,
      kategorija: "momentni_kljuc",
      vendor_profil: m.vendor_profil,
      linija_stanica: m.linija_stanica,
      aktivno: true,
    });
    kljucevi += 1;
  }

  console.log(`Gotovo: ${jobovi} job · ${pozicije} poz · ${koraci} kor · ${kljucevi} ključeva`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
