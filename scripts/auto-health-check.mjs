#!/usr/bin/env node
/**
 * Health check automatizacije — DB, env, logovi.
 *
 * npm run auto:health
 * npm run auto:health -- --email   (šalje samo ako ima problema)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { proveriSemu } from "../src/lib/schemaCheck.js";
import { kreirajSkriptaLog, procitajPoslednjeLinije } from "./lib/skriptaLog.mjs";
import { posaljiEmailIzEnv } from "./lib/posaljiEmailEnv.mjs";
import { jeAutoPraviloUkljuceno, spojiAutoPodesavanja } from "../src/lib/autoPodesavanja.js";
import { pronadjiUzastopneFailove } from "../src/lib/autoRunLog.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skriptaLog = kreirajSkriptaLog(ROOT, "auto-health.log", { jobId: "auto-health" });

const args = process.argv.slice(2);
const emailAkoProblem = args.includes("--email");

async function proveriLogove(erpUkljucen = true, erpIzvozUkljucen = true) {
  const upozorenja = [];
  const fajlovi = ["smenski-digest.log", "auto-podsetnici.log"];
  if (erpUkljucen) fajlovi.unshift("erp-uvoz.log");
  if (erpIzvozUkljucen) fajlovi.unshift("erp-izvoz-kvalitet.log");
  for (const f of fajlovi) {
    const { linije } = await procitajPoslednjeLinije(ROOT, f, 5);
    const poslednja = linije[linije.length - 1] || "";
    if (poslednja.includes("[ERROR]") || poslednja.includes("FAIL")) {
      upozorenja.push(`${f}: ${poslednja}`);
    }
  }
  return upozorenja;
}

async function proveriUzastopneFailove(supabase) {
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from("auto_run_log")
      .select("job_id,status,poruka,created_at")
      .order("created_at", { ascending: false })
      .limit(120);
    return pronadjiUzastopneFailove(data || [], 2);
  } catch {
    return [];
  }
}

/** Jedan FAIL na ključnim operativnim jobovima — odmah upozorenje. */
async function proveriOperativneJobFailove(supabase) {
  if (!supabase) return [];
  const kriticki = ["pg-backup", "nedeljni-rollup", "erp-quality-izvoz"];
  try {
    const { data } = await supabase
      .from("auto_run_log")
      .select("job_id,status,poruka,created_at")
      .in("job_id", kriticki)
      .order("created_at", { ascending: false })
      .limit(20);
    const poslednji = {};
    for (const r of data || []) {
      if (!poslednji[r.job_id]) poslednji[r.job_id] = r;
    }
    const upozorenja = [];
    for (const jobId of kriticki) {
      const row = poslednji[jobId];
      if (row?.status === "fail") {
        const vreme = row.created_at
          ? new Date(row.created_at).toLocaleString("sr-RS")
          : "—";
        upozorenja.push(
          `Operativni FAIL: ${jobId} (${vreme}) — ${row.poruka || "bez poruke"}`,
        );
      }
    }
    return upozorenja;
  } catch {
    return [];
  }
}

async function ucitajAutoPodesavanja(supabase) {
  let settings = spojiAutoPodesavanja({});
  if (!supabase) return settings;
  try {
    const { data } = await supabase.from("app_podesavanja").select("kljuc,vrednost");
    (data || []).forEach((r) => { settings[r.kljuc] = r.vrednost ?? ""; });
    settings = spojiAutoPodesavanja(settings);
  } catch { /* */ }
  return settings;
}

async function main() {
  await loadEnvZaSkripte(ROOT);

  await skriptaLog.run("health-check", async () => {
    const problemi = [];
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    let supabase = null;
    let erpUkljucen = true;
    let erpIzvozUkljucen = true;

    if (!url || !key) {
      problemi.push("Nedostaje SUPABASE_URL ili SUPABASE_SERVICE_ROLE_KEY");
    } else {
      supabase = createClient(url, key);
      const settings = await ucitajAutoPodesavanja(supabase);
      erpUkljucen = jeAutoPraviloUkljuceno(settings, "erp");
      erpIzvozUkljucen = jeAutoPraviloUkljuceno(settings, "erp_izvoz");
      if (!jeAutoPraviloUkljuceno(settings, "health")) {
        await skriptaLog.info("Health check iskljucen u podesavanjima");
        return;
      }
      const tabele = ["kpi_unos", "merenja_varijabilna", "ncr_capa", "spc_alarmi"];
      for (const t of tabele) {
        const { error } = await supabase.from(t).select("id", { count: "exact", head: true }).limit(1);
        if (error) problemi.push(`Tabela ${t}: ${error.message}`);
      }

      try {
        const migracije = await proveriSemu(supabase);
        const nedostaje = (migracije || []).filter((m) => !m.ok);
        if (nedostaje.length) {
          problemi.push(`Nedostaju migracije (${nedostaje.length}): ${nedostaje.map((m) => m.id).join(", ")}`);
        }
      } catch (e) {
        problemi.push(`Provera šeme: ${e.message}`);
      }
    }

    if (!process.env.SMTP_TO?.trim()) {
      problemi.push("SMTP_TO nije podešen (digest/podsetnici neće slati email)");
    }

    const logUpoz = await proveriLogove(erpUkljucen, erpIzvozUkljucen);
    problemi.push(...logUpoz);

    const dupleFail = await proveriUzastopneFailove(supabase);
    for (const f of dupleFail) {
      if (f.jobId === "auto-health") continue;
      problemi.push(`Cron 2x FAIL: ${f.jobId} — ${f.poslednji?.poruka || "bez poruke"}`);
    }

    const operativniFail = await proveriOperativneJobFailove(supabase);
    problemi.push(...operativniFail);

    if (!problemi.length) {
      const msg = "Sve provere OK";
      console.log(`✓ ${msg}`);
      await skriptaLog.info(msg);
      return;
    }

    const tekst = problemi.map((p) => `• ${p}`).join("\n");
    console.warn("⚠ Problemi:\n" + tekst);
    await skriptaLog.warn(tekst.replace(/\n/g, " | "));

    if (emailAkoProblem && process.env.SMTP_TO) {
      await posaljiEmailIzEnv(process.env, {
        to: process.env.SMTP_TO,
        subject: "SPC health check — upozorenja",
        text: `Automatska provera na ${new Date().toLocaleString("sr-RS")}:\n\n${tekst}`,
      });
      await skriptaLog.info("Email upozorenje poslat");
    }

    throw new Error(`${problemi.length} problema`);
  });
}

main().catch(async (e) => {
  console.error("✗", e.message);
  try { await skriptaLog.error(e.message); } catch { /* */ }
  process.exit(1);
});
