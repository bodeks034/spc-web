/**
 * Generiše potpisani public/license.json (Sloj A).
 * Zahteva license-keys/private.pem (generisi-par-licence.mjs).
 *
 * Primeri:
 *   node scripts/generisi-licencu.mjs --do 2026-12-31 --enable
 *   node scripts/generisi-licencu.mjs --disable
 */
import fs from "node:fs/promises";
import path from "node:path";
import { sign, createPrivateKey } from "node:crypto";

const args = process.argv.slice(2);
function arg(name, def = null) {
  const i = args.indexOf(name);
  if (i === -1) return def;
  return args[i + 1] ?? true;
}

const enable = args.includes("--disable") ? false : args.includes("--enable") || !args.includes("--disable");
let doDat = arg("--do", null);

if (enable && !doDat) {
  console.error("Za --enable obavezno: --do YYYY-MM-DD");
  process.exit(1);
}

if (!enable) {
  doDat = doDat || "2000-01-01";
}

const vaziDo = enable
  ? new Date(`${doDat}T23:59:59`).toISOString()
  : new Date(`${doDat}T00:00:00`).toISOString();

const payload = {
  verzija: 1,
  aktivna: enable,
  vazi_do: vaziDo,
  izdato: new Date().toISOString(),
  tenant_id: arg("--tenant", "default"),
  deployment: arg("--deployment", "cloud"),
  moduli: {
    atributivne: !args.includes("--bez-atributivne"),
    varijabilne: !args.includes("--bez-merljive"),
    admin: !args.includes("--bez-admin"),
    sifrarnik: !args.includes("--bez-sifrarnik"),
  },
  max_korisnika: arg("--max-korisnika", null) ? Number(arg("--max-korisnika")) : null,
  max_uredjaja: arg("--max-uredjaja", null) ? Number(arg("--max-uredjaja")) : null,
};

const privPem = await fs.readFile(path.resolve("license-keys/private.pem"), "utf8");
const key = createPrivateKey(privPem);
const data = Buffer.from(JSON.stringify(payload));
const potpis = sign(null, data, key).toString("base64");

const license = { ...payload, potpis };
const outArg = arg("--out", null);
const out = outArg
  ? path.resolve(outArg)
  : path.resolve("public/license.json");
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, JSON.stringify(license, null, 2), "utf8");

console.log("Sačuvano:", out);
console.log("aktivna:", enable, "| vazi_do:", vaziDo);
console.log("Posle: npm run build (license.json ide u dist/)");
