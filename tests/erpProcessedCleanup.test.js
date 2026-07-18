import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  analizirajProcessed,
  kanonskiErpEntitet,
  primeniProcessedCleanup,
  ukloniArhivskiTimestamp,
} from "../scripts/lib/erpProcessedCleanup.mjs";

const tmpRoots = [];

async function napraviProcessed() {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "erp-cleanup-"));
  tmpRoots.push(tmp);
  const processed = path.join(tmp, "erp-drop", "processed");
  await fs.mkdir(processed, { recursive: true });
  return processed;
}

async function writeOld(file, content, date = new Date("2025-01-01T10:00:00Z")) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
  await fs.utimes(file, date, date);
}

afterEach(async () => {
  await Promise.all(tmpRoots.splice(0).map((p) => fs.rm(p, { recursive: true, force: true })));
});

describe("ERP processed cleanup", () => {
  it("kanonizuje timestamp i Pantheon/SAP nazive", () => {
    expect(ukloniArhivskiTimestamp("delovi_1784380253137.csv")).toBe("delovi.csv");
    expect(ukloniArhivskiTimestamp("delovi_123.csv")).toBe("delovi_123.csv");
    expect(kanonskiErpEntitet("04_Delovi.xlsx")).toBe("delovi");
    expect(kanonskiErpEntitet("sap_delovi.csv")).toBe("delovi");
    expect(kanonskiErpEntitet("nepoznato.csv")).toBeNull();
  });

  it("čuva najnoviju kopiju i nepoznate fajlove", async () => {
    const processed = await napraviProcessed();
    await writeOld(path.join(processed, "2025-01-01", "delovi.csv"), "staro");
    await writeOld(path.join(processed, "2025-01-02", "delovi_1735812000000.csv"), "novo");
    await writeOld(path.join(processed, "2025-01-01", "custom.csv"), "nepoznato");

    const analiza = await analizirajProcessed({
      processedDir: processed,
      retentionDays: 30,
      keepLatest: 1,
      now: new Date("2026-07-18T12:00:00Z"),
    });
    expect(analiza.ukupno).toBe(3);
    expect(analiza.kandidati.map((f) => f.ime)).toEqual(["delovi.csv"]);
    expect(analiza.nepoznati.map((f) => f.ime)).toEqual(["custom.csv"]);
  });

  it("ne dira današnji folder i apply briše samo kandidata", async () => {
    const processed = await napraviProcessed();
    const old = path.join(processed, "2025-01-01", "merila.csv");
    const latest = path.join(processed, "2025-01-02", "merila_1735812000000.csv");
    const today = path.join(processed, "2026-07-18", "merila_1784370000000.csv");
    await writeOld(old, "old");
    await writeOld(latest, "latest");
    await writeOld(today, "today", new Date("2026-07-18T08:00:00Z"));

    const analiza = await analizirajProcessed({
      processedDir: processed,
      retentionDays: 30,
      now: new Date("2026-07-18T12:00:00Z"),
    });
    expect(analiza.kandidati.map((f) => f.ime).sort()).toEqual([
      "merila.csv",
      "merila_1735812000000.csv",
    ]);
    expect(analiza.zasticeni.some((f) => f.putanja === today)).toBe(true);

    const result = await primeniProcessedCleanup(analiza);
    expect(result.obrisano).toBe(2);
    await expect(fs.stat(old)).rejects.toThrow();
    await expect(fs.stat(latest)).rejects.toThrow();
    await expect(fs.stat(today)).resolves.toBeTruthy();
  });

  it("odbija folder koji nije processed", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "erp-cleanup-bad-"));
    tmpRoots.push(tmp);
    await expect(analizirajProcessed({ processedDir: tmp })).rejects.toThrow(/processed/);
  });
});
