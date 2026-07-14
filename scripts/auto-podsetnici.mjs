#!/usr/bin/env node
/**
 * Proaktivni podsetnici — oba modula, opciono 8D draft i licenca.
 *
 * npm run auto:podsetnici
 * npm run auto:podsetnici -- --modul merljive
 * npm run auto:podsetnici -- --dry-run
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import {
  proveriProaktivneDogadjaje,
  obradiProaktivneNotifikacije,
  obradiNcr8dDrafte,
  proaktivniLicencaDogadjaji,
} from "../src/lib/proaktivneNotifikacije.js";
import { DEFAULTS } from "../src/lib/notifikacijeServer.js";
import { AUTO_NOTIF_DEFAULTS } from "../src/lib/autoObavestenja.js";
import { jeAutoPraviloUkljuceno, spojiAutoPodesavanja } from "../src/lib/autoPodesavanja.js";
import { createFileDedupeStore } from "./lib/autoDedupeFile.mjs";
import { kreirajSkriptaLog } from "./lib/skriptaLog.mjs";
import { zapisAutoAkciju } from "./lib/autoRunLogDb.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skriptaLog = kreirajSkriptaLog(ROOT, "auto-podsetnici.log", { jobId: "auto-podsetnici" });

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
}

const modulArg = arg("--modul");
const moduli = modulArg ? [modulArg] : ["merljive", "atributivne"];
const smena = arg("--smena") ? Number(arg("--smena")) : undefined;
const dryRun = args.includes("--dry-run");

async function ucitajSettings(supabase) {
  const out = { ...DEFAULTS, ...spojiAutoPodesavanja({}) };
  try {
    const { data } = await supabase.from("app_podesavanja").select("kljuc,vrednost");
    (data || []).forEach((r) => { out[r.kljuc] = r.vrednost ?? ""; });
  } catch { /* */ }
  Object.assign(out, spojiAutoPodesavanja(out));
  if (process.env.SMTP_TO) out.smtp_to = process.env.SMTP_TO;
  if (process.env.TEAMS_WEBHOOK_AUTO) out.teams_webhook_auto = process.env.TEAMS_WEBHOOK_AUTO;
  out.notif_email = "1";
  out.notif_teams_auto = process.env.NOTIF_TEAMS_AUTO ?? AUTO_NOTIF_DEFAULTS.notif_teams_auto;
  return out;
}

async function main() {
  await loadEnvZaSkripte(ROOT);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY");
  }

  const jobLabel = `podsetnici [${moduli.join("+")}]${smena ? ` smena=${smena}` : ""}${dryRun ? " dry-run" : ""}`;

  await skriptaLog.run(jobLabel, async () => {
    const supabase = createClient(url, key);
    const settings = await ucitajSettings(supabase);

    if (!jeAutoPraviloUkljuceno(settings, "podsetnici")) {
      await skriptaLog.info("Podsetnici isključeni u podešavanjima");
      return;
    }

    const dedupePath = path.join(ROOT, ".cache", "auto-podsetnici-dedupe.json");
    const dedupe = createFileDedupeStore({ putanjaFajla: dedupePath });

    let sviDogadjaji = [];
    for (const modul of moduli) {
      const d = await proveriProaktivneDogadjaje(supabase, { modul, smena, alarmi: [] });
      sviDogadjaji.push(...d);
      await skriptaLog.info(`${modul}: ${d.length} događaja`);
    }

    const lic = await proaktivniLicencaDogadjaji({ envDo: process.env.LICENSE_VAZI_DO, supabase });
    sviDogadjaji.push(...lic);

    const uniq = [...new Map(sviDogadjaji.map((d) => [d.id, d])).values()];
    console.log(`Pronađeno ${uniq.length} proaktivnih događaja`);
    for (const d of uniq) {
      console.log(`  · [${d.nivo}] ${d.naslov}`);
    }

    if (dryRun) {
      console.log("Dry-run — bez slanja");
      return;
    }

    if (jeAutoPraviloUkljuceno(settings, "ncr_8d_draft")) {
      const draftovi = await obradiNcr8dDrafte(supabase);
      for (const dr of draftovi) {
        if (dr.id) {
          await zapisAutoAkciju({
            tip: "ncr_8d_draft",
            entitet: "osmd_izvestaji",
            entitetId: dr.id,
            idDeo: dr.id_deo,
            opis: `Auto 8D draft za NCR ${dr.broj_ncr}`,
          });
        }
      }
      if (draftovi.length) await skriptaLog.info(`8D draftova: ${draftovi.length}`);
    }

    const poslato = await obradiProaktivneNotifikacije(supabase, settings, uniq, { dedupe });
    const uspesno = poslato.filter((p) => p.rez?.rezultati?.some((r) => r.uspeh));
    const msg = `Poslato ${uspesno.length} / ${uniq.length}`;
    console.log(`✓ ${msg}`);
    await skriptaLog.info(msg);
  });
}

main().catch(async (e) => {
  const msg = e.message || String(e);
  console.error("✗", msg);
  try { await skriptaLog.error(msg); } catch { /* */ }
  process.exit(1);
});
