import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { predlogZadrziRed } from "../src/lib/sifrarnikDuplikatiPredlog.js";
import { auditLogUCsv } from "../src/lib/sifrarnikAudit.js";
import {
  sacuvajGuUndoSnapshot,
  ucitajGuUndoSnapshot,
  obrisiGuUndoSnapshot,
  GU_UNDO_TTL_MS,
  preostaloUndoMs,
} from "../src/lib/guXlsxUndo.js";
import * as propagacija from "../src/lib/sifrarnikPropagacijaPreview.js";
import { procitajPfmeaNavIdDeo, sacuvajPfmeaNav, PFMEA_ID_DEO_KEY } from "../src/lib/workflowAkcije.js";
import { setSifrarnikAuditKorisnik, getSifrarnikAuditKorisnik } from "../src/lib/sifrarnikAuditKorisnik.js";

describe("predlogZadrziRed", () => {
  it("zadržava red sa više popunjenih granica", () => {
    const predlog = predlogZadrziRed([
      { id: 10, pozicija: "D1", nominala: "10", lsl: "9", usl: "11" },
      { id: 5, pozicija: "D1", nominala: "", lsl: "", usl: "" },
    ]);
    expect(predlog.zadrziId).toBe(10);
    expect(predlog.obrisiIds).toEqual([5]);
  });
});

describe("auditLogUCsv", () => {
  it("generiše CSV sa korisnikom", () => {
    const csv = auditLogUCsv([{
      created_at: "2026-01-01T10:00:00Z",
      id_deo: "A-1",
      akcija: "propagiraj",
      izvor: "gu",
      korisnik: "eng@test.com",
      detalji: { ok: true },
    }]);
    expect(csv).toContain("eng@test.com");
    expect(csv).toContain("A-1");
  });
});

describe("guXlsxUndo TTL", () => {
  beforeEach(() => {
    obrisiGuUndoSnapshot();
    sessionStorage.clear();
  });

  it("vraća snapshot unutar TTL", () => {
    sacuvajGuUndoSnapshot({ poSheetu: { S1: [] }, imeFajla: "t.xlsx" });
    expect(ucitajGuUndoSnapshot()?.imeFajla).toBe("t.xlsx");
    expect(preostaloUndoMs(ucitajGuUndoSnapshot())).toBeGreaterThan(0);
  });

  it("briše istekli snapshot", () => {
    sacuvajGuUndoSnapshot({ poSheetu: { S1: [] }, imeFajla: "old.xlsx" });
    const raw = sessionStorage.getItem("spc_gu_xlsx_undo");
    const parsed = JSON.parse(raw);
    parsed.ts = Date.now() - GU_UNDO_TTL_MS - 1000;
    sessionStorage.setItem("spc_gu_xlsx_undo", JSON.stringify(parsed));
    expect(ucitajGuUndoSnapshot()).toBeNull();
  });
});

describe("previewBatchPropagacije", () => {
  it("vraća prazan rezultat bez id-jeva", async () => {
    const rez = await propagacija.previewBatchPropagacije([]);
    expect(rez.delovi).toBe(0);
    expect(rez.poruka).toMatch(/Nema delova/);
  });
});

describe("sifrarnikAuditKorisnik", () => {
  it("čuva email korisnika", () => {
    setSifrarnikAuditKorisnik({ email: "kvalitet@test.com" });
    expect(getSifrarnikAuditKorisnik()).toBe("kvalitet@test.com");
    setSifrarnikAuditKorisnik(null);
  });
});

describe("sacuvajPfmeaNav", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("postavlja id_deo za PFMEA tab", () => {
    sacuvajPfmeaNav("HAM-001");
    expect(sessionStorage.getItem(PFMEA_ID_DEO_KEY)).toBe("HAM-001");
    expect(procitajPfmeaNavIdDeo()).toBe("HAM-001");
    expect(sessionStorage.getItem(PFMEA_ID_DEO_KEY)).toBeNull();
  });
});
