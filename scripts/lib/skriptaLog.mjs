/** Fajl log za cron / Task Scheduler skripte — logs/*.log + opciono DB telemetrija */

import fs from "node:fs/promises";
import path from "node:path";

export function kreirajSkriptaLog(root, fileName, { jobId = null } = {}) {
  const logPath = path.join(root, "logs", fileName);

  async function append(level, line) {
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    const stamp = new Date().toISOString();
    await fs.appendFile(logPath, `[${stamp}] [${level}] ${line}\n`, "utf8");
  }

  async function zapisDb(status, poruka, trajanjeMs) {
    if (!jobId) return;
    try {
      const { zapisAutoRun } = await import("./autoRunLogDb.mjs");
      await zapisAutoRun({ jobId, status, poruka, trajanjeMs });
    } catch { /* */ }
  }

  return {
    logPath,
    jobId,
    info: (line) => append("INFO", line),
    warn: (line) => append("WARN", line),
    error: (line) => append("ERROR", line),
    async run(jobName, fn) {
      const t0 = Date.now();
      await append("INFO", `START ${jobName}`);
      try {
        const rez = await fn();
        const trajanje = Date.now() - t0;
        await append("INFO", `OK ${jobName}`);
        await zapisDb("ok", jobName, trajanje);
        return rez;
      } catch (e) {
        const msg = e?.message || String(e);
        const trajanje = Date.now() - t0;
        await append("ERROR", `FAIL ${jobName}: ${msg}`);
        await zapisDb("fail", `${jobName}: ${msg}`, trajanje);
        throw e;
      }
    },
  };
}

export const AUTO_LOG_FAJLOVI = [
  "erp-uvoz.log",
  "smenski-digest.log",
  "auto-podsetnici.log",
  "auto-health.log",
  "nedeljni-rollup.log",
  "moment-drop.log",
  "pg-backup.log",
];

export async function procitajPoslednjeLinije(root, fileName, limit = 40) {
  const logPath = path.join(root, "logs", fileName);
  try {
    const raw = await fs.readFile(logPath, "utf8");
    const linije = raw.trim().split(/\r?\n/).filter(Boolean);
    return { logPath, linije: linije.slice(-limit), postoji: true };
  } catch {
    return { logPath, linije: [], postoji: false };
  }
}

export async function sumirajLogove(root) {
  const out = [];
  for (const f of AUTO_LOG_FAJLOVI) {
    const { linije, postoji } = await procitajPoslednjeLinije(root, f, 3);
    const poslednja = linije[linije.length - 1] || "";
    let status = "nepoznato";
    if (!postoji) status = "nema_loga";
    else if (poslednja.includes("[ERROR]") || poslednja.includes("FAIL")) status = "fail";
    else if (poslednja.includes("OK")) status = "ok";
    out.push({ fajl: f, status, poslednja });
  }
  return out;
}
