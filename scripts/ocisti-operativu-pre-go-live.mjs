#!/usr/bin/env node
/**
 * Pokretanje skripti za čišćenje operativnih podataka pre go-live.
 *
 * Puni režim (briše i 8D/PFMEA):
 *   npm run backup:db
 *   npm run db:ocisti-operativu -- --potvrdi
 *
 * Zadrži PFMEA/8D šablone:
 *   npm run db:ocisti-operativu:qms -- --potvrdi
 *
 * Bez --potvrdi samo ispiše uputstvo (dry-run).
 * Zahteva DATABASE_URL ili SUPABASE_DB_URL u .env.local
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { REZIMI_OCISTI, runOcistiOperativu } from "./ocistiOperativuLib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const REZIMI = {
  pun: {
    ...REZIMI_OCISTI.pun,
    brise: "merenja, log, NCR, 8D, PFMEA, alarme, …",
    komanda: "npm run db:ocisti-operativu -- --potvrdi",
    alternativa: "npm run db:ocisti-operativu:qms -- --potvrdi",
    alternativaOpis: "zadrži PFMEA/8D šablone",
  },
  qms: {
    ...REZIMI_OCISTI.qms,
    brise: "merenja, log, NCR, alarme, … (8D/PFMEA dokumenti ostaju)",
    komanda: "npm run db:ocisti-operativu:qms -- --potvrdi",
    alternativa: "npm run db:ocisti-operativu -- --potvrdi",
    alternativaOpis: "obriši i 8D/PFMEA",
  },
};

async function main() {
  await loadEnvZaSkripte(ROOT);
  const potvrdi = process.argv.includes("--potvrdi");
  const rezim = process.argv.includes("--zadrzi-qms") ? "qms" : "pun";
  const cfg = REZIMI[rezim];
  console.log("SPC — čišćenje operativnih podataka (šifrarnik ostaje)\n");
  console.log(`Režim: ${cfg.naziv}`);
  console.log(`SQL: scripts/${cfg.fajl}\n`);

  if (!potvrdi) {
    console.log(`⚠  Briše: ${cfg.brise}`);
    console.log("   Šifrarnik (delovi, dimenzije, radnici, …) NE dira.\n");
    console.log("Pre pokretanja:");
    console.log("  npm run backup:db");
    console.log("  npm run backup:storage\n");
    console.log("Pokreni sa potvrdom:");
    console.log(`  ${cfg.komanda}\n`);
    console.log(`Alternativa (${cfg.alternativaOpis}):`);
    console.log(`  ${cfg.alternativa}\n`);
    console.log("Ili ručno u SQL Editoru (blok BEGIN…COMMIT).\n");
    console.log("Posle SQL-a:");
    console.log("  • Storage spc-excel-sync — obriši mirror Excel");
    console.log("  • Tableti — isprazni offline red, Ctrl+F5");
    console.log("  • Modul 0 — ručno obriši demo delove koji ne trebaju");
    return;
  }

  try {
    console.log("Primena SQL…\n");
    await runOcistiOperativu({ zadrziQms: rezim === "qms" });
    console.log("✓ Operativni podaci očišćeni.\n");
    if (rezim === "qms") {
      console.log("8D i PFMEA/CP dokumenti su zadržani.");
    }
    console.log("\nSledeći koraci:");
    console.log("  1) obriši spc-excel-sync na serveru (Storage)");
    console.log("  2) Modul 0 — obriši demo delove (Delovi → DEMO bulk)");
    console.log("  3) npm run db:verify");
    console.log("  4) Tableti — offline red + Ctrl+F5");
  } catch (e) {
    console.error(`\n✗ Greška: ${e.message}`);
    if (/DATABASE_URL|SUPABASE_DB_URL/.test(e.message)) {
      console.error("\nAlternativa: Supabase SQL Editor → scripts/" + cfg.fajl);
    }
    console.error("\nAko je transakcija pala na sredini, pokreni ponovo posle backup-a.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
