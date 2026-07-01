/**
 * ERP uvoz — Node (fs, cron, API server).
 * Zajednička logika: erpUvozCore.js
 */
import fs from "node:fs/promises";
import path from "node:path";
import {
  deepMerge,
  pokreniErpUvozIzIzvora,
  fajlOdgovaraEntitetu,
} from "./erpUvozCore.js";

export {
  deepMerge,
  parsirajEntitetCsv,
  upsertEntitet,
  formatErpUvozRezultat,
  transformVrednost,
  mapCsvRed,
  fajlOdgovaraEntitetu,
} from "./erpUvozCore.js";

export function configPutanja(root) {
  return path.join(root, "config", "erp", "erp-uvoz.config.json");
}

export function presetPutanja(root, ime) {
  return path.join(root, "config", "erp", "presets", `${ime}.json`);
}

export async function ucitajErpConfig(root, { configPath, preset: presetOverride } = {}) {
  const cfgFile = configPath || configPutanja(root);
  let userCfg = {};
  try {
    userCfg = JSON.parse(await fs.readFile(cfgFile, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }

  const presetName = presetOverride || userCfg.preset || process.env.ERP_PRESET || "sap";
  let preset = {};
  try {
    preset = JSON.parse(await fs.readFile(presetPutanja(root, presetName), "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") {
      throw new Error(`ERP preset "${presetName}" ne postoji: ${presetPutanja(root, presetName)}`);
    }
    throw e;
  }

  const merged = deepMerge(preset, userCfg);
  merged.preset = presetName;
  merged.drop_dir = merged.drop_dir || process.env.ERP_DROP_DIR || "erp-drop/incoming";
  merged.min_age_min = Number(merged.min_age_min ?? process.env.ERP_MIN_AGE_MIN ?? 2);
  return merged;
}

export async function nadjiCsvZaEntitet(incomingDir, entityCfg) {
  const names = [entityCfg.fajl, ...(entityCfg.fajl_alternativni || [])].filter(Boolean);

  let entries;
  try {
    entries = await fs.readdir(incomingDir, { withFileTypes: true });
  } catch {
    return null;
  }

  const byName = new Map(
    entries
      .filter((e) => e.isFile() && /\.csv$/i.test(e.name))
      .map((e) => [e.name.toLowerCase(), path.join(incomingDir, e.name)]),
  );

  for (const name of names) {
    const hit = byName.get(name.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

async function fajlDovoljnoStar(csvPath, minAgeMin) {
  if (!minAgeMin || minAgeMin <= 0) return true;
  const st = await fs.stat(csvPath);
  return Date.now() - st.mtimeMs >= minAgeMin * 60 * 1000;
}

/** Uvoz iz drop foldera (cron / API server). */
export async function pokreniErpUvoz(supabase, config, options = {}) {
  const {
    incomingDir,
    dryRun = false,
    entitetFilter = null,
    arhivirajFn = null,
    minAgeMin = config.min_age_min,
  } = options;

  const redosled = config.redosled_uvoza || Object.keys(config.entiteti || {});
  const entiteti = config.entiteti || {};
  const csvPoEntitetu = {};
  const premladEntiteti = {};

  for (const entId of redosled) {
    if (entitetFilter && entId !== entitetFilter) continue;
    const entityCfg = entiteti[entId];
    if (!entityCfg || entityCfg.ukljuceno === false) continue;

    const csvPath = await nadjiCsvZaEntitet(incomingDir, entityCfg);
    if (!csvPath) continue;

    if (!(await fajlDovoljnoStar(csvPath, minAgeMin))) {
      premladEntiteti[entId] = path.basename(csvPath);
      continue;
    }

    const txt = await fs.readFile(csvPath, "utf8");
    csvPoEntitetu[entId] = { text: txt, fajl: path.basename(csvPath), putanja: csvPath };
  }

  const res = await pokreniErpUvozIzIzvora(supabase, config, {
    csvPoEntitetu,
    dryRun,
    entitetFilter,
  });

  for (const [entId, fajl] of Object.entries(premladEntiteti)) {
    const idx = res.rezultati.findIndex((r) => r.entitet === entId);
    const entry = { entitet: entId, status: "premlad", fajl };
    if (idx >= 0) res.rezultati[idx] = entry;
    else res.rezultati.push(entry);
  }

  if (!dryRun && arhivirajFn) {
    for (const r of res.rezultati) {
      if (r.status !== "ok") continue;
      const src = csvPoEntitetu[r.entitet]?.putanja;
      if (!src) continue;
      try {
        r.arhiva = await arhivirajFn(src);
      } catch (e) {
        r.arhiva_greska = e.message;
      }
    }
  }

  return res;
}
