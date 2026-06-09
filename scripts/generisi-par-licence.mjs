/**
 * Jednokratno: generiše Ed25519 par za potpis licence (Sloj A).
 * private.pem — čuvaj offline, nikad na server firme / git.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { generateKeyPairSync } from "node:crypto";

const DIR = path.resolve("license-keys");

await fs.mkdir(DIR, { recursive: true });

const privPath = path.join(DIR, "private.pem");
const pubPath = path.join(DIR, "public.pem");

try {
  await fs.access(privPath);
  console.log("Par već postoji:", DIR);
  console.log("Ne prepisujem. Obriši ručno ako želiš novi par.");
  process.exit(0);
} catch { /* novi par */ }

const { publicKey, privateKey } = generateKeyPairSync("ed25519");
await fs.writeFile(privPath, privateKey.export({ type: "pkcs8", format: "pem" }), { mode: 0o600 });
await fs.writeFile(pubPath, publicKey.export({ type: "spki", format: "pem" }), { mode: 0o644 });

console.log("Kreiran par ključeva:");
console.log("  private:", privPath, "(TAJNO)");
console.log("  public: ", pubPath);
console.log("");
const pubPem = await fs.readFile(pubPath, "utf8");
const jsOut = path.resolve("src/lib/licencaPublicKey.js");
const js = `/**
 * Javni Ed25519 ključ — automatski generisan (generisi-par-licence.mjs).
 * Ne menjaj ručno.
 */
export const LICENCA_PUBLIC_PEM = \`${pubPem.trim()}\`;
`;
await fs.writeFile(jsOut, js, "utf8");
console.log("Ažuriran:", jsOut);
console.log("");
console.log("Sledeće: node scripts/generisi-licencu.mjs --do 2026-12-31 --enable");
