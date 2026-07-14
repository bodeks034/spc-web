import { describe, it, expect } from "vitest";
import { pripremiOeeRedove } from "../src/lib/oeeIzvestajPdf.js";
import { izracunajOeeKpi } from "../src/lib/oeeKpi.js";

describe("oeeIzvestajPdf", () => {
  it("pripremiOeeRedove — merljive grupise po seriji", () => {
    const podaci = [
      { id_deo: "X", datum: "2026-07-01", smena: 1, serija: "A", radni_nalog: "RN1", ukupno_kom: 10, ispravno_iz_prve: 9, skart: 1, dorada: 0, ok_nakon_dorade: 0 },
      { id_deo: "X", datum: "2026-07-01", smena: 1, serija: "B", radni_nalog: "RN1", ukupno_kom: 5, ispravno_iz_prve: 4, skart: 0, dorada: 1, ok_nakon_dorade: 1 },
    ];
    const redovi = pripremiOeeRedove(podaci, "merljive");
    expect(redovi).toHaveLength(2);
    expect(redovi[0].serija).toBe("A");
    expect(redovi[1].ok_nakon_dorade).toBe(1);
    expect(redovi[0]._oznaka).toContain("serija");
  });

  it("izracunajOeeKpi za PDF red", () => {
    const k = izracunajOeeKpi({
      planirano_min: 480,
      zastoj_min: 48,
      planirano_kom: 100,
      ukupno_kom: 90,
      ispravno_iz_prve: 85,
      skart: 3,
      dorada: 2,
    });
    expect(k.oee).toBeGreaterThan(0);
    expect(k.availability).toBe(90);
  });
});
