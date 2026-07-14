#!/usr/bin/env node
/** Kopira deploy/license.cloud.json → public/license.json pre build-a (Vercel / pilot). */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(ROOT, "deploy/license.cloud.json");
const dest = path.join(ROOT, "public/license.json");

if (fs.existsSync(dest)) {
  console.log("license.json već postoji u public/");
  process.exit(0);
}
if (!fs.existsSync(src)) {
  console.warn("⚠ deploy/license.cloud.json nedostaje — sloj A licence preskočen u build-u");
  process.exit(0);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log("✓ Kopiran deploy/license.cloud.json → public/license.json");
