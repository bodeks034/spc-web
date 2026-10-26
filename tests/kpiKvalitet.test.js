import { describe, it, expect } from "vitest";
import { izracunajKpiSerije, izracunajKpiPogon, podrazumevaniKpiIzListeP } from "../src/lib/kpiKvalitet.js";
import { mergeSmenaStat } from "../src/lib/spcStats.js";

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

describe("podrazumevaniKpiIzListeP", () => {
  it("prazna lista ne izmišlja komad", () => {
    const kpi = podrazumevaniKpiIzListeP([]);
    expect(kpi.ukupno_kom).toBe(0);
    expect(kpi.neusaglaseno).toBe(0);
    const stat = mergeSmenaStat({ ok: 0, nok: 0 }, { ok: 0, nok: 0 }, kpi);
    expect(stat.merenja).toBe(0);
    expect(stat.ok).toBe(0);
    expect(stat.nok).toBe(0);
    expect(stat.dpmo).toBe(0);
  });

  it("jedan NOK ostaje 0% FPY i DPMO 1.000.000", () => {
    const kpi = podrazumevaniKpiIzListeP([{ status: "NOK", kolicina: 1 }]);
    const stat = mergeSmenaStat({ ok: 0, nok: 0 }, { ok: 0, nok: 0 }, kpi);
    expect(stat.merenja).toBe(1);
    expect(stat.nok).toBe(1);
    expect(stat.rty).toBe(0);
    expect(stat.dpmo).toBe(1000000);
  });
});
