#!/usr/bin/env node
/**
 * Podsetnik za delimične delove u šifrarniku duže od N dana.
 * npm run auto:sifrarnik-zaglavljeni
 * npm run auto:sifrarnik-zaglavljeni -- --dry-run
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { kreirajSkriptaLog } from "./lib/skriptaLog.mjs";
import { posaljiEmailIzEnv } from "./lib/posaljiEmailEnv.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skriptaLog = kreirajSkriptaLog(ROOT, "auto-sifrarnik-zaglavljeni.log", { jobId: "auto-sifrarnik-zaglavljeni" });
const dryRun = process.argv.includes("--dry-run");
const dana = Number(process.argv.find((a, i) => process.argv[i - 1] === "--dana") || 7);

async function main() {
  await loadEnvZaSkripte(ROOT);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Postavi SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY");

  await skriptaLog.run(`zaglavljeni šifrarnik (${dana}d)${dryRun ? " dry-run" : ""}`, async () => {
    const supabase = createClient(url, key);
    const cutoff = new Date(Date.now() - dana * 86400000).toISOString();

    const { data: delimicni } = await supabase
      .from("delovi")
      .select("id_deo,naziv_dela,slika_naziv")
      .eq("aktivan", true)
      .limit(5000);

    const { data: audit } = await supabase
      .from("sifrarnik_audit")
      .select("id_deo,created_at")
      .order("created_at", { ascending: false })
      .limit(5000);

    const poslednji = new Map();
    for (const r of audit || []) {
      const id = String(r.id_deo || "").toUpperCase();
      if (id && !poslednji.has(id)) poslednji.set(id, r.created_at);
    }

    const zaglavljeni = (delimicni || []).filter((d) => {
      const id = String(d.id_deo || "").toUpperCase();
      const ts = poslednji.get(id);
      return !ts || ts < cutoff;
    }).slice(0, 30);

    await skriptaLog.info(`Pronađeno ${zaglavljeni.length} delova bez aktivnosti ${dana}+ dana`);

    if (!zaglavljeni.length) return;

    const body = [
      `Delimični delovi bez izmena ${dana}+ dana (${zaglavljeni.length}):`,
      ...zaglavljeni.map((d) => `• ${d.id_deo} — ${d.naziv_dela || ""}`),
      "",
      "Modul 0 → Održavanje → Nastavi checklist",
    ].join("\n");

    const to = process.env.SMTP_TO;
    if (to && !dryRun) {
      await posaljiEmailIzEnv(process.env, {
        to,
        subject: `[SPC] Šifrarnik — ${zaglavljeni.length} zaglavljenih delova`,
        text: body,
      });
      await skriptaLog.info(`Email poslat na ${to}`);
    } else if (dryRun) {
      await skriptaLog.info(body);
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
