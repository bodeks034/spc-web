#!/usr/bin/env node
/**
 * Upisuje listu hashovanih build asseta u dist/sw.js.
 *
 * Bez ovog koraka service worker keširao je JS/CSS tek kad ih uređaj jednom
 * uspešno povuče s mreže, pa posle svakog deploy-a prvi offline start pada.
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join, relative, posix, sep } from "node:path";
import { createHash } from "node:crypto";

const DIST = join(process.cwd(), "dist");
const SW = join(DIST, "sw.js");

/** Ekstenzije koje ima smisla imati u kešu pre prvog offline starta. */
const PRECACHE_EXT = new Set([".js", ".css", ".woff2", ".woff", ".ttf"]);
/** Preko ovoga ne idemo — precache mora stati u kvotu i ne sme dugo da traje. */
const MAX_FAJLOVA = 120;
const MAX_UKUPNO_MB = 25;

function sviFajlovi(dir) {
  const out = [];
  for (const ime of readdirSync(dir)) {
    const p = join(dir, ime);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...sviFajlovi(p));
    else out.push({ putanja: p, velicina: st.size });
  }
  return out;
}

function main() {
  if (!existsSync(SW)) {
    console.error("[sw-precache] dist/sw.js ne postoji — pokreni `vite build` prvo.");
    process.exit(1);
  }

  const url = (rel) => "/" + rel.split(sep).join(posix.sep);

  const kandidati = sviFajlovi(DIST)
    .map((f) => ({ ...f, rel: relative(DIST, f.putanja) }))
    .filter((f) => PRECACHE_EXT.has(f.rel.slice(f.rel.lastIndexOf(".")).toLowerCase()))
    .filter((f) => !f.rel.endsWith("sw.js"))
    .map((f) => ({ ...f, url: url(f.rel) }));

  // Sve što index.html referencira (entry + modulepreload + CSS) mora u keš —
  // bez toga aplikacija ne startuje offline, ma koliko sitnih chunkova ubacili.
  const html = readFileSync(join(DIST, "index.html"), "utf8");
  const izHtml = new Set(
    [...html.matchAll(/(?:href|src)="(\/assets\/[^"]+)"/g)].map((m) => m[1]),
  );

  const kriticni = kandidati.filter((f) => izHtml.has(f.url));
  const ostali = kandidati
    .filter((f) => !izHtml.has(f.url))
    .sort((a, b) => a.velicina - b.velicina);

  const izabrani = [];
  let ukupno = 0;
  for (const f of kriticni) {
    ukupno += f.velicina;
    izabrani.push(f.url);
  }
  for (const f of ostali) {
    if (izabrani.length >= MAX_FAJLOVA) break;
    if (ukupno + f.velicina > MAX_UKUPNO_MB * 1024 * 1024) break;
    ukupno += f.velicina;
    izabrani.push(f.url);
  }

  if (!kriticni.length) {
    console.error("[sw-precache] index.html ne referencira nijedan /assets/ fajl — provera obrasca?");
    process.exit(1);
  }

  // BUILD_ID iz sadržaja: menja se samo kad se assets promene, pa se stari keš briše tačno kad treba.
  const otisak = createHash("sha1")
    .update(izabrani.join("|"))
    .digest("hex")
    .slice(0, 12);

  const sw = readFileSync(SW, "utf8");
  // Regexi hvataju i već popunjen sw.js, da ponovno pokretanje nad istim dist-om bude ispravno.
  const buildRe = /const BUILD_ID = "[^"]*";/;
  const precacheRe = /const PRECACHE_BUILD = \[[\s\S]*?\];/;
  if (!buildRe.test(sw) || !precacheRe.test(sw)) {
    console.error("[sw-precache] Nisam našao BUILD_ID/PRECACHE_BUILD u sw.js — placeholderi su promenjeni?");
    process.exit(1);
  }

  const kod = sw
    .replace(buildRe, `const BUILD_ID = "${otisak}";`)
    .replace(precacheRe, `const PRECACHE_BUILD = ${JSON.stringify(izabrani, null, 2)};`);

  writeFileSync(SW, kod);
  const mb = (ukupno / 1024 / 1024).toFixed(2);
  console.log(`[sw-precache] ${izabrani.length} fajlova (${mb} MB), od toga ${kriticni.length} kritičnih, build ${otisak}`);
  if (izabrani.length < kandidati.length) {
    console.log(`[sw-precache] preskočeno ${kandidati.length - izabrani.length} zbog limita — keširaće se kroz fetch.`);
  }
}

main();
