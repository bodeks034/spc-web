#!/usr/bin/env node
/**
 * ISO audit export — CSV audit log + opciono trasabilitet PDF po lotu.
 *
 * npm run iso:audit
 * npm run iso:audit -- --od 2026-07-01 --do 2026-07-09
 * npm run iso:audit -- --lot LOT-A1 --id-deo 5502-A
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { isoAuditKombinovanoCsv, isoAuditPaketKombinovano } from "../src/lib/isoAuditPaket.js";
import { ucitajPoslednjeAkcije, ucitajPoslednjeRunove } from "../src/lib/autoRunLog.js";
import {
  ucitajTrasabilitetPoLotu,
  generisiTrasabilitetPdfBufferPoLotu,
} from "../src/lib/trasabilitetIzvestaj.js";
import { PODRAZUMEVANI_SPC_ALARM_PRAGOVI, spcAlarmPragoviIzPodesavanja } from "../src/lib/spcAlarmPragovi.js";
import { podrazumevanaAqlPodesavanja, DEFAULT_AQL_LOT_SIZE } from "../src/lib/aqlIso2859.js";
import { podrazumevanaIso3951Podesavanja } from "../src/lib/iso3951.js";
import { fetchPfmeaCpAuditSnapshot } from "../src/lib/pfmeaCpDb.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

async function main() {
  await loadEnvZaSkripte(ROOT);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("✗ SUPABASE_URL i ključ u .env.local");
    process.exit(1);
  }

  const danas = new Date().toISOString().slice(0, 10);
  const od = new Date();
  od.setDate(od.getDate() - 30);
  const datumOd = arg("--od") || od.toISOString().slice(0, 10);
  const datumDo = arg("--do") || danas;
  const lot = arg("--lot") || process.env.ISO_AUDIT_LOT || null;
  const idDeo = arg("--id-deo") || null;

  const outDir = path.join(ROOT, "audit-export", `${datumOd}_${datumDo}`);
  await fs.mkdir(outDir, { recursive: true });

  const supabase = createClient(url, key);
  const [akcije, runovi, pfmea] = await Promise.all([
    ucitajPoslednjeAkcije(supabase, { datumOd, datumDo }),
    ucitajPoslednjeRunove(supabase, { datumOd, datumDo }),
    fetchPfmeaCpAuditSnapshot(supabase).catch(() => []),
  ]);

  let pragovi = PODRAZUMEVANI_SPC_ALARM_PRAGOVI;
  try {
    const { data } = await supabase.from("app_podesavanja").select("kljuc,vrednost");
    const settings = {};
    (data || []).forEach((r) => { settings[r.kljuc] = r.vrednost ?? ""; });
    pragovi = spcAlarmPragoviIzPodesavanja(settings);
  } catch { /* */ }

  const csv = isoAuditPaketKombinovano({
    akcije,
    runovi,
    pragovi,
    iso3951: podrazumevanaIso3951Podesavanja(),
    aql: podrazumevanaAqlPodesavanja(),
    pfmea,
    lotVelicinaAql: DEFAULT_AQL_LOT_SIZE,
  });
  const csvPath = path.join(outDir, "ISO_audit_paket.csv");
  await fs.writeFile(csvPath, "\uFEFF" + csv, "utf8");
  console.log(`✓ Audit paket CSV: ${csvPath} (${akcije.length} akcija, ${runovi.length} runova, ${pfmea.length} PfMEA)`);

  const manifest = {
    generisano: new Date().toISOString(),
    period: { od: datumOd, do: datumDo },
    akcije: akcije.length,
    runovi: runovi.length,
    pfmea_dokumenata: pfmea.length,
    ukljuceno: ["audit_log", "spc_pragovi", "iso3951", "aql_iso2859", "pfmea_cp"],
    fajlovi: ["ISO_audit_paket.csv"],
  };

  if (lot) {
    const pod = await ucitajTrasabilitetPoLotu(supabase, { lot, idDeo });
    if (pod.greska) {
      console.warn(`⚠ Trasabilitet: ${pod.greska}`);
    } else {
      const { buffer, filename } = await generisiTrasabilitetPdfBufferPoLotu(pod, lot);
      const pdfPath = path.join(outDir, filename);
      await fs.writeFile(pdfPath, buffer);
      manifest.fajlovi.push(filename);
      manifest.lot = lot;
      manifest.id_deo = pod.idDeo;
      console.log(`✓ Trasabilitet PDF: ${pdfPath}`);
    }
  }

  const manifestPath = path.join(outDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`✓ Manifest: ${manifestPath}`);
  console.log(`\nFolder: ${outDir}`);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
