#!/usr/bin/env node
/**
 * Validacija src/data/primeri-8d.json
 * node scripts/validiraj-primeri-8d.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const JSON_PATH = path.join(ROOT, "src/data/primeri-8d.json");

const { validirajPrimer8d } = await import(
  pathToFileURL(path.join(ROOT, "src/lib/troubleshootingPrimeri.js")).href
);

const raw = JSON.parse(await fs.readFile(JSON_PATH, "utf8"));
const primeri = raw.primeri || [];

console.log(`\n📋 Validacija: ${JSON_PATH}\n`);
console.log(`   Verzija: ${raw.verzija ?? "?"}`);
console.log(`   Unosa: ${primeri.length}\n`);

let ok = 0;
let fail = 0;
const greske = [];

primeri.forEach((p, i) => {
  const r = validirajPrimer8d(p, i);
  if (r.ok) {
    ok++;
    const demo = p.kljucevi?.includes("_primer") ? " (DEMO)" : "";
    console.log(`   ✓ ${p.id}${demo}`);
  } else {
    fail++;
    greske.push(...r.greske);
    console.log(`   ✗ ${p.id || `#${i + 1}`}`);
  }
});

if (greske.length) {
  console.log("\nGreške:");
  greske.forEach((g) => console.log(`   - ${g}`));
}

const produkcija = primeri.filter((p) => !p.kljucevi?.includes("_primer")).length;
console.log(`\nProdukcijskih primera (bez demo): ${produkcija}/10 preporučeno\n`);

if (fail > 0) {
  process.exit(1);
}

console.log("✓ JSON je validan.\n");
