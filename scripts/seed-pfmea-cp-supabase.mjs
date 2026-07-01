#!/usr/bin/env node
/**
 * Jednokratni seed: JSON arhiva → Supabase pfmea_cp_dokumenti + stavke.
 * Zahteva: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY u .env
 * node scripts/seed-pfmea-cp-supabase.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = path.join(ROOT, "src/data/pfmea-control-plan-industrijski.json");

async function loadEnv() {
  try {
    const raw = await fs.readFile(path.join(ROOT, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* optional */ }
}

function mapPfmea(r, i) {
  return {
    red_broj: i,
    br_dela: r.br_dela || null,
    proces: r.proces || null,
    mod_greske: r.mod_greske || null,
    uzrok_greske: r.uzrok_greske || null,
    efekat_greske: r.efekat_greske || null,
    s: r.s || null,
    uzrok_mehanizam: r.uzrok_mehanizam || null,
    o: r.o || null,
    postojece_kontrole: r.postojece_kontrole || null,
    d: r.d || null,
    rpn_before: r.rpn_before || null,
    akcija: r.akcija || null,
    odgovorni: r.odgovorni || null,
    rok: r.rok || null,
    status: r.status || null,
    rpn_after: r.rpn_after || null,
    pfmea_veza: r.pfmea_veza || null,
    control_plan_ref: r.control_plan_ref || null,
  };
}

function mapCp(r, i) {
  return {
    red_broj: i,
    br_dela: r.br_dela || null,
    proces: r.proces || null,
    karakteristika: r.karakteristika || null,
    klasifikacija: r.klasifikacija || null,
    nominalna: r.nominalna || null,
    tolerancija: r.tolerancija || null,
    metoda: r.metoda || null,
    oprema: r.oprema || null,
    msa: r.msa || null,
    ucestalost: r.ucestalost || null,
    velicina_uzoraka: r.velicina_uzoraka || null,
    reakcija_nekontrolisano: r.reakcija_nekontrolisano || null,
    reakcija_na_nepravilan_deo: r.reakcija_na_nepravilan_deo || r.reakcija_neispravno || null,
    zapis_forma: r.zapis_forma || null,
    pfmea_referenca: r.pfmea_referenca || null,
    mod_greske_pfmea: r.mod_greske_pfmea || r["mod_greške_pfmea"] || null,
    status_cp: r.status_cp || null,
    odgovorni: r.odgovorni || null,
  };
}

async function main() {
  await loadEnv();
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Postavite SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY u .env");
    process.exit(1);
  }

  const arh = JSON.parse(await fs.readFile(JSON_PATH, "utf8"));
  const supabase = createClient(url, key);

  const { data: dok, error: e1 } = await supabase.from("pfmea_cp_dokumenti").insert({
    naziv: arh.izvor || "Industrijski delovi (seed)",
    revizija: "A",
    napomena: "Seed iz pfmea-control-plan-industrijski.json",
  }).select("id").single();
  if (e1) throw e1;

  const pfRows = (arh.pfmea?.redovi || []).map(mapPfmea);
  const cpRows = (arh.controlPlan?.redovi || []).map(mapCp);

  if (pfRows.length) {
    const { error } = await supabase.from("pfmea_stavke").insert(
      pfRows.map((r) => ({ ...r, dokument_id: dok.id })),
    );
    if (error) throw error;
  }
  if (cpRows.length) {
    const { error } = await supabase.from("control_plan_stavke").insert(
      cpRows.map((r) => ({ ...r, dokument_id: dok.id })),
    );
    if (error) throw error;
  }

  console.log(`✓ Seed dokument id=${dok.id}: ${pfRows.length} PFMEA + ${cpRows.length} CP stavki`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
