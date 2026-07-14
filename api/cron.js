/**
 * Vercel Cron — cloud alternativa za Task Scheduler (on-prem).
 * Zahteva CRON_SECRET + Supabase env u Vercel projektu.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const JOBS = {
  health: ["scripts/auto-health-check.mjs", "--email"],
  podsetnici: ["scripts/auto-podsetnici.mjs"],
  digest: ["scripts/smenski-digest.mjs", "--pdf"],
  weekly: ["scripts/nedeljni-rollup.mjs"],
};

function runScript(relArgs) {
  const fullArgs = [path.join(ROOT, relArgs[0]), ...relArgs.slice(1)];
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, fullArgs, { cwd: ROOT, env: process.env });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(out.trim() || `exit ${code}`));
    });
  });
}

export default async function handler(request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const job = url.searchParams.get("job") || "health";
  const scriptArgs = JOBS[job];
  if (!scriptArgs) {
    return Response.json({ ok: false, error: `Nepoznat job: ${job}` }, { status: 400 });
  }

  try {
    const output = await runScript(scriptArgs);
    return Response.json({ ok: true, job, output: output.slice(-2000) });
  } catch (e) {
    return Response.json({ ok: false, job, error: e.message }, { status: 500 });
  }
}

export const config = {
  maxDuration: 120,
};
