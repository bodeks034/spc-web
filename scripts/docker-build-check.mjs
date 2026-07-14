#!/usr/bin/env node
/**
 * Provera da Docker image za frontend može da se izgradi.
 * npm run deploy:docker:build
 *
 * Preskače se ako docker nije instaliran (exit 0 + upozorenje).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docker = process.platform === "win32" ? "docker.exe" : "docker";

function dockerOk() {
  const r = spawnSync(docker, ["version", "--format", "{{.Server.Version}}"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return r.status === 0;
}

if (!dockerOk()) {
  console.warn("⚠ Docker nije dostupan — preskačem docker build proveru");
  console.warn("  Na serveru: cd deploy && docker compose -f docker-compose.spc.yml --env-file .env.docker up -d --build");
  process.exit(0);
}

const anonKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.docker-build-check";
const supabaseUrl = process.env.VITE_SUPABASE_URL || "http://localhost:8080";

console.log("Docker build check → spc-web:test");
const r = spawnSync(
  docker,
  [
    "build",
    "-f", "deploy/Dockerfile.spc",
    "--build-arg", `VITE_SUPABASE_URL=${supabaseUrl}`,
    "--build-arg", `VITE_SUPABASE_ANON_KEY=${anonKey}`,
    "-t", "spc-web:test",
    ".",
  ],
  { cwd: ROOT, stdio: "inherit" },
);

if (r.status !== 0) {
  console.error("\n✗ Docker build nije uspeo");
  process.exit(r.status || 1);
}

console.log("\n✓ Docker image spc-web:test izgrađen");
console.log("  Pokretanje: cd deploy && docker compose -f docker-compose.spc.yml --env-file .env.docker up -d");
