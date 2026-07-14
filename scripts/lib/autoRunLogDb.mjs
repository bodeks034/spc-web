/** Zapis auto run / akcija u Supabase (service role u skriptama). */

import { createClient } from "@supabase/supabase-js";
import { loadEnvZaSkripte } from "../../src/lib/loadEnvFile.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let _client = null;

async function getClient() {
  if (_client) return _client;
  await loadEnvZaSkripte(ROOT);
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
}

export async function zapisAutoRun({ jobId, status = "ok", poruka = null, trajanjeMs = null }) {
  try {
    const supabase = await getClient();
    if (!supabase || !jobId) return null;
    const { data, error } = await supabase.from("auto_run_log").insert({
      job_id: jobId,
      status,
      poruka,
      trajanje_ms: trajanjeMs,
    }).select("id").single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function zapisAutoAkciju({
  tip,
  entitet = null,
  entitetId = null,
  idDeo = null,
  opis,
  meta = null,
}) {
  try {
    const supabase = await getClient();
    if (!supabase || !tip || !opis) return null;
    const { data, error } = await supabase.from("auto_akcije_log").insert({
      tip,
      entitet,
      entitet_id: entitetId,
      id_deo: idDeo,
      opis,
      meta,
    }).select("id").single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}
