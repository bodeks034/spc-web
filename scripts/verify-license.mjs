#!/usr/bin/env node
/** Test da potpis licence prolazi sa javnim ključem u licencaPublicKey.js */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createPublicKey, verify } from "node:crypto";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const licPath = path.join(ROOT, "deploy/license.cloud.json");
const { LICENCA_PUBLIC_PEM } = await import(pathToFileURL(path.join(ROOT, "src/lib/licencaPublicKey.js")));

const lic = JSON.parse(fs.readFileSync(licPath, "utf8"));
const { potpis, ...payload } = lic;
const ok = verify(
  null,
  Buffer.from(JSON.stringify(payload)),
  createPublicKey(LICENCA_PUBLIC_PEM),
  Buffer.from(potpis, "base64"),
);
if (!ok) {
  console.error("✗ Potpis licence ne prolazi");
  process.exit(1);
}
if (LICENCA_PUBLIC_PEM.includes("placeholder")) {
  console.error("✗ Javni ključ je još placeholder");
  process.exit(1);
}
console.log("✓ Licenca OK — tenant:", payload.tenant_id, "| do:", payload.vazi_do);
