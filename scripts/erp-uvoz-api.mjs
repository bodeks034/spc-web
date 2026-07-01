#!/usr/bin/env node
/**
 * Lokalni HTTP API za ERP uvoz iz drop foldera (server trigger iz UI).
 *
 * Upotreba:
 *   node scripts/erp-uvoz-api.mjs
 *   npm run erp:api
 *
 * Env (.env.erp):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   ERP_API_PORT=3921
 *   ERP_API_KEY=<tajni_kljuc>   (opciono — preporučeno u produkciji)
 *   ERP_DROP_DIR, ERP_PRESET, ERP_MIN_AGE_MIN
 */
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../src/lib/loadEnvFile.js";
import { upisiErpUvozLog } from "../src/lib/erpUvozLog.js";
import { ucitajErpConfig, pokreniErpUvoz } from "../src/lib/erpUvozEngine.js";
import { formatErpUvozRezultat, sumErpRezultati } from "../src/lib/erpUvozCore.js";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-ERP-API-Key, Authorization",
};

function json(res, status, body) {
  res.writeHead(status, { ...CORS, "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function authOk(req, expectedKey) {
  if (!expectedKey) return true;
  const hdr = req.headers["x-erp-api-key"] || req.headers["authorization"] || "";
  const key = String(hdr).replace(/^Bearer\s+/i, "").trim();
  return key === expectedKey;
}

async function arhiviraj(csvPath, processedRoot) {
  const stamp = new Date().toISOString().slice(0, 10);
  const destDir = path.join(processedRoot, stamp);
  await fs.mkdir(destDir, { recursive: true });
  const base = path.basename(csvPath);
  let dest = path.join(destDir, base);
  try {
    await fs.access(dest);
    const ext = path.extname(base);
    const name = path.basename(base, ext);
    dest = path.join(destDir, `${name}_${Date.now()}${ext}`);
  } catch { /* nov fajl */ }
  await fs.rename(csvPath, dest);
  return dest;
}

async function handleTrigger(req, res, ctx) {
  let body = {};
  try {
    body = await readBody(req);
  } catch {
    return json(res, 400, { ok: false, error: "Neispravan JSON body" });
  }

  const dryRun = Boolean(body.dryRun);
  const preset = body.preset || null;
  const minAgeOverride = body.minAgeMin != null ? Number(body.minAgeMin) : undefined;

  try {
    const config = await ucitajErpConfig(ROOT, { preset });
    if (minAgeOverride != null) config.min_age_min = minAgeOverride;

    const dropRel = config.drop_dir || process.env.ERP_DROP_DIR || "erp-drop/incoming";
    const dropDir = path.isAbsolute(dropRel) ? dropRel : path.join(ROOT, dropRel);
    const processedRoot = path.join(path.dirname(dropDir), "processed");

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!dryRun && (!url || !key)) {
      return json(res, 500, { ok: false, error: "SUPABASE_URL / SERVICE_ROLE_KEY nisu podešeni" });
    }

    const supabase = dryRun
      ? null
      : createClient(url, key, { auth: { persistSession: false } });

    const rez = await pokreniErpUvoz(supabase, config, {
      incomingDir: dropDir,
      dryRun,
      minAgeMin: dryRun ? 0 : config.min_age_min,
      arhivirajFn: dryRun ? null : (p) => arhiviraj(p, processedRoot),
    });

    if (!dryRun && supabase) {
      const sum = sumErpRezultati(rez.rezultati);
      const fajlovi = rez.rezultati.filter((r) => r.fajl).map((r) => r.fajl).join(", ");
      await upisiErpUvozLog(supabase, {
        izvor: "ui-server",
        fajl: fajlovi || null,
        ukupno: sum.ukupno,
        validnih: sum.validnih,
        upsertovano: sum.upsertovano,
        aktivnih: 0,
        upozorenja: sum.upozorenja,
        uspeh: rez.ok,
        greska: rez.ok ? null : rez.rezultati.find((r) => r.greska)?.greska,
        detalj: formatErpUvozRezultat(rez),
      }).catch(() => {});
    }

    return json(res, 200, {
      ok: rez.ok,
      ...rez,
      detaljTekst: formatErpUvozRezultat(rez),
    });
  } catch (e) {
    return json(res, 500, { ok: false, error: e.message || String(e) });
  }
}

async function main() {
  await loadEnvZaSkripte(ROOT);

  const port = Number(process.env.ERP_API_PORT || 3921);
  const apiKey = process.env.ERP_API_KEY || "";

  const server = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS);
      res.end();
      return;
    }

    if (!authOk(req, apiKey)) {
      return json(res, 401, { ok: false, error: "Neispravan ERP API ključ" });
    }

    const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);

    if (req.method === "GET" && url.pathname === "/api/erp-uvoz/health") {
      return json(res, 200, {
        ok: true,
        servis: "spc-erp-uvoz-api",
        verzija: 1,
        drop_dir: process.env.ERP_DROP_DIR || "erp-drop/incoming",
        auth: apiKey ? "required" : "open",
      });
    }

    if (req.method === "POST" && url.pathname === "/api/erp-uvoz/trigger") {
      return handleTrigger(req, res);
    }

    return json(res, 404, { ok: false, error: "Not found" });
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`ERP uvoz API: http://127.0.0.1:${port}`);
    console.log(`  GET  /api/erp-uvoz/health`);
    console.log(`  POST /api/erp-uvoz/trigger`);
    if (apiKey) console.log("  Auth: X-ERP-API-Key");
    else console.log("  Auth: isključena (postavi ERP_API_KEY u produkciji)");
  });
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
