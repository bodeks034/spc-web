import { describe, it, expect } from "vitest";
import { izracunajKpiSerije, izracunajKpiPogon } from "../src/lib/kpiKvalitet.js";

describe("kpiKvalitet", () => {
  it("izracunajKpiSerije — FPY i stope škarta/dorade", () => {
    const k = izracunajKpiSerije({
      ukupno_kom: 100,
      ispravno_iz_prve: 95,
      skart: 3,
      dorada: 2,
    });
    expect(k.fpy).toBe(95);
    expect(k.skartStopa).toBe(3);
    expect(k.doradaStopa).toBe(2);
  });

  it("izracunajKpiPogon — RTY iz faza", () => {
    const k = izracunajKpiPogon({
      ukupno_kom: 100,
      attr: { ukupno: 50, ispravnoIzPrve: 48, fpy: 96 },
      merljive: { ukupno: 50, ispravnoIzPrve: 49, fpy: 98 },
    });
    expect(k.rty).toBeGreaterThan(90);
    expect(k.faze?.length).toBe(2);
  });
});
