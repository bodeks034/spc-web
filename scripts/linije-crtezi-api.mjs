#!/usr/bin/env node
/**
 * Lokalni HTTP API — kreiranje foldera public/sifrarnik/linije/…
 *
 *   node scripts/linije-crtezi-api.mjs
 *   npm run linije-crtezi:api
 *
 * Env: LINIJE_CRTEZI_API_PORT=3922, LINIJE_CRTEZI_API_KEY (opciono)
 */
import http from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.LINIJE_CRTEZI_API_PORT || 3922);
const API_KEY = String(process.env.LINIJE_CRTEZI_API_KEY || "").trim();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Linije-API-Key, Authorization",
};

function json(res, status, body) {
  res.writeHead(status, { ...CORS, "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function authOk(req) {
  if (!API_KEY) return true;
  const hdr = req.headers["x-linije-api-key"] || req.headers["authorization"] || "";
  const key = String(hdr).replace(/^Bearer\s+/i, "").trim();
  return key === API_KEY;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function pokreniSync(kod) {
  return new Promise((resolve, reject) => {
    const args = [path.join(ROOT, "scripts", "sync-linije-crtezi.mjs")];
    if (kod) args.push("--kod", kod);
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    child.on("close", (code) => {
      if (code === 0) resolve({ ok: true, output: out.trim(), kod: kod || null });
      else reject(new Error(err.trim() || out.trim() || `sync exit ${code}`));
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    return json(res, 200, { ok: true, service: "linije-crtezi-api" });
  }

  if (req.method === "POST" && req.url === "/sync") {
    if (!authOk(req)) return json(res, 401, { ok: false, error: "Neispravan API ključ" });
    let body = {};
    try {
      body = await readBody(req);
    } catch {
      return json(res, 400, { ok: false, error: "Neispravan JSON" });
    }
    try {
      const rez = await pokreniSync(body.kod || null);
      return json(res, 200, rez);
    } catch (e) {
      return json(res, 500, { ok: false, error: e.message });
    }
  }

  json(res, 404, { ok: false, error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`Linije crteži API → http://localhost:${PORT}  (POST /sync, GET /health)`);
});
