#!/usr/bin/env node
/** ERP processed retention — dry-run po defaultu, brisanje samo uz --apply. */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { jeAutoPraviloUkljuceno, spojiAutoPodesavanja } from "../src/lib/autoPodesavanja.js";
import {
  analizirajProcessed,
  primeniProcessedCleanup,
} from "./lib/erpProcessedCleanup.mjs";
import { kreirajSkriptaLog } from "./lib/skriptaLog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skriptaLog = kreirajSkriptaLog(ROOT, "erp-processed-cleanup.log", {
  jobId: "erp-processed-cleanup",
});

function args(argv) {
  const out = {
    apply: false,
    retentionDays: 90,
    keepLatest: 1,
    removeEmptyDirs: false,
    processedDir: path.join(ROOT, "erp-drop", "processed"),
    json: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--apply") out.apply = true;
    else if (a === "--remove-empty-dirs") out.removeEmptyDirs = true;
    else if (a === "--json") out.json = true;
    else if (a === "--retention-days" && argv[i + 1]) {
      out.retentionDays = Number(argv[++i]);
    } else if (a === "--keep-latest" && argv[i + 1]) {
      out.keepLatest = Number(argv[++i]);
    } else if (a === "--processed-dir" && argv[i + 1]) {
      out.processedDir = path.resolve(argv[++i]);
    }
  }
  if (!Number.isFinite(out.retentionDays) || out.retentionDays < 1) {
    throw new Error("--retention-days mora biti broj >= 1");
  }
  if (!Number.isFinite(out.keepLatest) || out.keepLatest < 1) {
    throw new Error("--keep-latest mora biti broj >= 1");
  }
  return out;
}

function mb(bytes) {
  return `${(Number(bytes || 0) / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  await loadEnvZaSkripte(ROOT);
  const options = args(process.argv);
  if (options.apply && process.env.SUPABASE_URL) {
    try {
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
      if (key) {
        const supabase = createClient(process.env.SUPABASE_URL, key);
        const { data } = await supabase.from("app_podesavanja").select("kljuc,vrednost");
        let settings = spojiAutoPodesavanja({});
        (data || []).forEach((r) => { settings[r.kljuc] = r.vrednost ?? ""; });
        settings = spojiAutoPodesavanja(settings);
        if (!jeAutoPraviloUkljuceno(settings, "erp_cleanup")) {
          console.log("ERP processed cleanup je isključen u Auto pravilima.");
          await skriptaLog.info("ERP processed cleanup iskljucen u podesavanjima");
          return;
        }
      }
    } catch { /* cleanup ostaje dostupan i bez DB toggla */ }
  }
  return skriptaLog.run(
    `erp-processed-cleanup${options.apply ? "" : " (dry-run)"}`,
    async () => {
      const analiza = await analizirajProcessed(options);
      if (options.json) {
        console.log(JSON.stringify({
          ...analiza,
          kandidati: analiza.kandidati.map((f) => f.relativna),
          nepoznati: analiza.nepoznati.map((f) => f.relativna),
          zasticeni: analiza.zasticeni.map((f) => f.relativna),
        }, null, 2));
      } else {
        console.log(`ERP processed cleanup ${options.apply ? "(APPLY)" : "(DRY-RUN)"}`);
        console.log(`  Folder: ${analiza.root}`);
        console.log(`  Retention: ${analiza.retentionDays} dana · čuvaj poslednjih: ${analiza.keepLatest}`);
        console.log(`  Ukupno arhiva: ${analiza.ukupno}`);
        console.log(`  Zaštićeno/najnovije: ${analiza.zasticeni.length}`);
        console.log(`  Nepoznato (ne dira se): ${analiza.nepoznati.length}`);
        console.log(`  Kandidati: ${analiza.kandidati.length} · ${mb(analiza.bytesZaBrisanje)}`);
        analiza.kandidati.slice(0, 30).forEach((f) => console.log(`    - ${f.relativna}`));
      }

      if (!options.apply) {
        console.log("\nDry-run: ništa nije obrisano. Za primenu dodaj --apply.");
        return { kandidati: analiza.kandidati.length, obrisano: 0 };
      }
      const rezultat = await primeniProcessedCleanup(analiza, options);
      console.log(`\n✓ Obrisano: ${rezultat.obrisano} · ${mb(rezultat.bytes)} · preskočeno: ${rezultat.preskoceno}`);
      await skriptaLog.info(
        `Obrisano ${rezultat.obrisano}, ${rezultat.bytes} bytes, preskoceno ${rezultat.preskoceno}`,
      );
      return rezultat;
    },
  );
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});
