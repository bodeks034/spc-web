#!/usr/bin/env node
/**
 * Demo reset: obriši sve PFMEA/CP i sve 8D osim 8d-mrap-001-ATR-01.
 * Zahteva SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY u .env ili .env.local
 *
 *   node scripts/cleanup-demo-8d-pfmea.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CILJNI_8D = "8d-mrap-001-ATR-01";

async function loadEnvFile(name) {
  try {
    const raw = await fs.readFile(path.join(ROOT, name), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      }
    }
  } catch { /* optional */ }
}

async function main() {
  await loadEnvFile(".env");
  await loadEnvFile(".env.local");

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Nedostaje SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY u .env.local");
    console.error("Alternativa: pokrenite 52_demo_samo_mrap_8d.sql u Supabase SQL Editoru.");
    process.exit(1);
  }

  const sb = createClient(url, key);

  const { data: svi8d, error: eList } = await sb
    .from("osmd_izvestaji")
    .select("id,broj_8d,id_deo,created_at")
    .order("id");
  if (eList) throw eList;

  console.log("Trenutni 8D izveštaji:");
  for (const r of svi8d || []) {
    console.log(`  #${r.id}  ${r.broj_8d || "(bez broja)"}  ${r.id_deo || ""}`);
  }

  const { data: pfDocs, error: ePf } = await sb
    .from("pfmea_cp_dokumenti")
    .select("id,naziv,broj_8d");
  if (ePf) throw ePf;
  console.log(`\nPFMEA/CP dokumenata: ${pfDocs?.length || 0}`);

  const { error: eDelPf } = await sb.from("pfmea_cp_dokumenti").delete().neq("id", 0);
  if (eDelPf) throw eDelPf;
  console.log("✓ Obrisani svi PFMEA/CP dokumenti");

  const zaBrisanje = (svi8d || []).filter((r) => (r.broj_8d || "") !== CILJNI_8D);
  if (zaBrisanje.length) {
    const ids = zaBrisanje.map((r) => r.id);
    const { error: eDel8d } = await sb.from("osmd_izvestaji").delete().in("id", ids);
    if (eDel8d) throw eDel8d;
    console.log(`✓ Obrisano ${ids.length} 8D izveštaja (ostao samo ${CILJNI_8D})`);
  } else {
    console.log(`Nema drugih 8D za brisanje — ostaje ${CILJNI_8D}`);
  }

  const { data: ostalo } = await sb
    .from("osmd_izvestaji")
    .select("id,broj_8d,id_deo")
    .order("id");
  console.log("\nPreostali 8D:");
  for (const r of ostalo || []) {
    console.log(`  #${r.id}  ${r.broj_8d || "(bez broja)"}  ${r.id_deo || ""}`);
  }

  console.log("\nNapomena: lokalni PFMEA u browseru (localStorage ključ spc_pfmea_cp_local_v2)");
  console.log("obrišite ručno: DevTools → Application → Local Storage → obriši taj ključ, ili Incognito.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
