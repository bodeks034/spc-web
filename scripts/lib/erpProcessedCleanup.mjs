/** Bezbedna retention analiza za erp-drop/processed. */

import fs from "node:fs/promises";
import path from "node:path";
import sapPreset from "../../config/erp/presets/sap.json" with { type: "json" };
import pantheonPreset from "../../config/erp/presets/pantheon.json" with { type: "json" };
import { fajlOdgovaraEntitetu } from "../../src/lib/erpUvozCore.js";
import { jeErpUlazniFajl } from "../../src/lib/erpCsvIo.js";

function datumLokalno(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function ukloniArhivskiTimestamp(ime) {
  return String(ime || "").replace(/_\d{13}(?=\.(csv|xlsx|xls)$)/i, "");
}

export function kanonskiErpEntitet(imeFajla) {
  const bezTs = ukloniArhivskiTimestamp(path.basename(String(imeFajla || "")));
  for (const preset of [sapPreset, pantheonPreset]) {
    for (const [entitet, cfg] of Object.entries(preset.entiteti || {})) {
      if (fajlOdgovaraEntitetu(bezTs, cfg)) return entitet;
    }
  }
  return null;
}

function vremeIzImena(ime, fallback) {
  const m = String(ime || "").match(/_(\d{13})(?=\.(csv|xlsx|xls)$)/i);
  return m ? Number(m[1]) : fallback;
}

function unutarKorena(root, target) {
  const rel = path.relative(root, target);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

export async function analizirajProcessed({
  processedDir,
  retentionDays = 90,
  keepLatest = 1,
  now = new Date(),
} = {}) {
  const root = path.resolve(processedDir);
  if (path.basename(root).toLowerCase() !== "processed") {
    throw new Error("Cleanup je dozvoljen samo nad folderom naziva processed.");
  }
  const rootReal = await fs.realpath(root);
  const cutoffMs = now.getTime() - Math.max(1, Number(retentionDays)) * 86400000;
  const keepN = Math.max(1, Number(keepLatest) || 1);
  const danas = new Set([datumLokalno(now), now.toISOString().slice(0, 10)]);
  const svi = [];

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (!unutarKorena(rootReal, full)) continue;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.isFile() || !jeErpUlazniFajl(entry.name)) continue;
      const stat = await fs.stat(full);
      const folderDatum = path.relative(rootReal, full).split(path.sep)[0] || "";
      const mtimeDatum = datumLokalno(stat.mtime);
      const entitet = kanonskiErpEntitet(entry.name);
      svi.push({
        putanja: full,
        relativna: path.relative(rootReal, full),
        ime: entry.name,
        entitet,
        folderDatum,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        sortMs: vremeIzImena(entry.name, stat.mtimeMs),
        danasZasticen: danas.has(folderDatum) || danas.has(mtimeDatum),
      });
    }
  }
  await walk(rootReal);

  const grupe = new Map();
  for (const f of svi.filter((x) => x.entitet)) {
    if (!grupe.has(f.entitet)) grupe.set(f.entitet, []);
    grupe.get(f.entitet).push(f);
  }
  const sacuvaj = new Set();
  for (const lista of grupe.values()) {
    lista.sort((a, b) => b.sortMs - a.sortMs || b.mtimeMs - a.mtimeMs);
    lista.slice(0, keepN).forEach((f) => sacuvaj.add(f.putanja));
  }

  const kandidati = svi.filter((f) => (
    f.entitet
    && !f.danasZasticen
    && !sacuvaj.has(f.putanja)
    && f.mtimeMs < cutoffMs
  ));
  const nepoznati = svi.filter((f) => !f.entitet);
  const zasticeni = svi.filter((f) => f.danasZasticen || sacuvaj.has(f.putanja));

  return {
    root: rootReal,
    retentionDays: Number(retentionDays),
    keepLatest: keepN,
    ukupno: svi.length,
    kandidati,
    nepoznati,
    zasticeni,
    bytesZaBrisanje: kandidati.reduce((sum, f) => sum + f.size, 0),
  };
}

export async function primeniProcessedCleanup(analiza, { removeEmptyDirs = false } = {}) {
  let obrisano = 0;
  let preskoceno = 0;
  let bytes = 0;
  const root = await fs.realpath(analiza.root);

  for (const f of analiza.kandidati || []) {
    const full = path.resolve(f.putanja);
    if (!unutarKorena(root, full)) {
      preskoceno += 1;
      continue;
    }
    try {
      const lst = await fs.lstat(full);
      if (!lst.isFile() || lst.isSymbolicLink()
        || lst.size !== f.size || Math.abs(lst.mtimeMs - f.mtimeMs) > 1) {
        preskoceno += 1;
        continue;
      }
      await fs.unlink(full);
      obrisano += 1;
      bytes += f.size;
    } catch {
      preskoceno += 1;
    }
  }

  if (removeEmptyDirs) {
    const dirs = await fs.readdir(root, { withFileTypes: true });
    for (const d of dirs) {
      if (!d.isDirectory() || d.isSymbolicLink()) continue;
      const full = path.join(root, d.name);
      try {
        const remain = await fs.readdir(full);
        if (!remain.length) await fs.rmdir(full);
      } catch { /* */ }
    }
  }
  return { obrisano, preskoceno, bytes };
}
