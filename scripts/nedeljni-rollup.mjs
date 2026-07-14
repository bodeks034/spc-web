#!/usr/bin/env node
/**
 * Nedeljni rollup — KPI, NCR, alarmi za 7 dana.
 *
 * npm run digest:nedelja
 * Log: logs/nedeljni-rollup.log
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { fetchZajednickiDashboard } from "../src/lib/zajednickiDashboard.js";
import { fetchPrioritetSmene } from "../src/lib/kontekstualniVodic.js";
import { posaljiEmailIzEnv } from "./lib/posaljiEmailEnv.mjs";
import { kreirajSkriptaLog } from "./lib/skriptaLog.mjs";
import { jeAutoPraviloUkljuceno, spojiAutoPodesavanja } from "../src/lib/autoPodesavanja.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skriptaLog = kreirajSkriptaLog(ROOT, "nedeljni-rollup.log", { jobId: "nedeljni-rollup" });

async function ucitajSettings(supabase) {
  const out = spojiAutoPodesavanja({});
  try {
    const { data } = await supabase.from("app_podesavanja").select("kljuc,vrednost");
    (data || []).forEach((r) => { out[r.kljuc] = r.vrednost ?? ""; });
  } catch { /* */ }
  return spojiAutoPodesavanja(out);
}

async function main() {
  await loadEnvZaSkripte(ROOT);
  const to = process.env.SMTP_TO || process.env.DIGEST_TO;
  if (!to) throw new Error("Postavi SMTP_TO");

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY");

  await skriptaLog.run("nedeljni-rollup", async () => {
    const supabase = createClient(url, key);
    const settings = await ucitajSettings(supabase);
    if (!jeAutoPraviloUkljuceno(settings, "weekly")) {
      await skriptaLog.info("Nedeljni rollup isključen u podešavanjima");
      return;
    }

    const dash = await fetchZajednickiDashboard(supabase, { period: 7 });
    const prioMer = await fetchPrioritetSmene(supabase, { modul: "merljive", limit: 5 });
    const prioAtr = await fetchPrioritetSmene(supabase, { modul: "atributivne", limit: 5 });

    const danas = new Date().toISOString().slice(0, 10);
    const linije = [
      "SPC — Nedeljni rollup (7 dana)",
      `Generisano: ${danas}`,
      "",
      `Alarmi (aktivni pregled): ${dash?.alarmi?.length || 0}`,
      `Top delovi (rizik): ${(dash?.topDelovi || []).slice(0, 5).map((d) => d.id_deo).join(", ") || "—"}`,
      "",
      "Top prioritet — merljive:",
      ...(prioMer.length ? prioMer.map((p, i) => `  ${i + 1}. ${p.idDeo} (skor ${p.skor})`) : ["  —"]),
      "",
      "Top prioritet — atributivne:",
      ...(prioAtr.length ? prioAtr.map((p, i) => `  ${i + 1}. ${p.idDeo} (skor ${p.skor})`) : ["  —"]),
    ];

    const tekst = linije.join("\n");
    console.log(tekst);
    await posaljiEmailIzEnv(process.env, {
      to,
      subject: `SPC nedeljni rollup — ${danas}`,
      text: tekst,
    });
    await skriptaLog.info(`Email → ${to}`);
  });
}

main().catch(async (e) => {
  console.error("✗", e.message);
  try { await skriptaLog.error(e.message); } catch { /* */ }
  process.exit(1);
});
