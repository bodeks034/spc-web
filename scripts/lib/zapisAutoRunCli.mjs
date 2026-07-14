#!/usr/bin/env node
/** CLI zapis u auto_run_log (PowerShell / wrapper skripte). */
import { zapisAutoRun } from "./autoRunLogDb.mjs";

const [, , jobId, status = "ok", ...rest] = process.argv;
if (!jobId) {
  console.error("Upotreba: node zapisAutoRunCli.mjs <job_id> [ok|fail] [poruka]");
  process.exit(1);
}

const poruka = rest.join(" ").trim() || null;
const rez = await zapisAutoRun({
  jobId,
  status: status === "fail" ? "fail" : "ok",
  poruka,
});
if (!rez) process.exit(2);
