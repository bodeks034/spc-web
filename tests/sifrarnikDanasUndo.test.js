import { describe, expect, it } from "vitest";
import { agregirajDanasZatvoreno } from "../src/lib/sifrarnikAudit.js";
import { labelGuUndo, sacuvajGuUndoSnapshot, ucitajGuUndoSnapshot, obrisiGuUndoSnapshot } from "../src/lib/guXlsxUndo.js";

describe("agregirajDanasZatvoreno", () => {
  it("grupiše po korisniku i distinct ID", () => {
    const r = agregirajDanasZatvoreno([
      { id_deo: "a1", korisnik: "Ana", created_at: "2026-08-27T10:00:00Z" },
      { id_deo: "a1", korisnik: "Ana", created_at: "2026-08-27T11:00:00Z" },
      { id_deo: "b2", korisnik: "Marko", created_at: "2026-08-27T12:00:00Z" },
      { id_deo: "c3", korisnik: null, created_at: "2026-08-27T13:00:00Z" },
    ], { dan: "2026-08-27" });
    expect(r.broj).toBe(3);
    expect(r.ids.sort()).toEqual(["A1", "B2", "C3"]);
    expect(r.poKorisniku.find((p) => p.korisnik === "Ana")?.broj).toBe(1);
    expect(r.poKorisniku.find((p) => p.korisnik === "Marko")?.broj).toBe(1);
    expect(r.poKorisniku.find((p) => p.korisnik === "(nepoznat)")?.broj).toBe(1);
  });
});

describe("guXlsxUndo label", () => {
  it("razlikuje snimanje i import", () => {
    sessionStorage.clear();
    sacuvajGuUndoSnapshot({ poSheetu: { s: [] }, razlog: "snimanje", imeFajla: "s" });
    expect(labelGuUndo(ucitajGuUndoSnapshot())).toMatch(/snimanje/i);
    obrisiGuUndoSnapshot();
    sacuvajGuUndoSnapshot({ poSheetu: { s: [] }, razlog: "xlsx", imeFajla: "f.xlsx" });
    expect(labelGuUndo(ucitajGuUndoSnapshot())).toMatch(/import/i);
  });
});
