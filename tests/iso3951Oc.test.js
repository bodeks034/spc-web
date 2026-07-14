import { describe, it, expect } from "vitest";
import {
  normInv,
  muZaUdeoNeispravnih,
  verovatnoaPrihvatanjaIso3951,
  izracunajOcKrivuIso3951,
  procenatNeispravnihUZorku,
  paNaKriviZaP,
} from "../src/lib/iso3951Oc.js";

describe("iso3951Oc", () => {
  it("normInv(0.975) ≈ 1.96", () => {
    expect(normInv(0.975)).toBeCloseTo(1.96, 1);
  });

  it("muZaUdeoNeispravnih — gornja granica, viši p → viši μ (bliže USL)", () => {
    const m1 = muZaUdeoNeispravnih(1, { tipGranice: "gornja", usl: 10 });
    const m5 = muZaUdeoNeispravnih(5, { tipGranice: "gornja", usl: 10 });
    expect(m5).toBeGreaterThan(m1);
  });

  it("Pa opada kada raste % neispravnih", () => {
    const pa1 = verovatnoaPrihvatanjaIso3951(1, { n: 15, k: 1.463, tipGranice: "gornja", usl: 10, iteracije: 3000, seed: 11 });
    const pa15 = verovatnoaPrihvatanjaIso3951(15, { n: 15, k: 1.463, tipGranice: "gornja", usl: 10, iteracije: 3000, seed: 11 });
    expect(pa1).toBeGreaterThan(pa15);
  });

  it("izracunajOcKrivuIso3951 vraća tačke i plan", () => {
    const { plan, tacke, greska } = izracunajOcKrivuIso3951({
      lotSize: 500,
      nivo: "II",
      aql: "1.5",
      tipGranice: "gornja",
      usl: 10,
      iteracije: 2000,
      pRozsah: [0, 5, 10, 20],
    });
    expect(greska).toBeNull();
    expect(plan.n).toBe(35);
    expect(plan.k).toBeCloseTo(1.385, 2);
    expect(tacke).toHaveLength(4);
    expect(tacke[0].pa).toBeGreaterThan(tacke[3].pa);
  });

  it("procenatNeispravnihUZorku — broji van USL", () => {
    const p = procenatNeispravnihUZorku([9.9, 10.0, 10.1, 10.5], {
      tipGranice: "gornja",
      usl: "10.2",
    });
    expect(p).toBe(25);
  });

  it("paNaKriviZaP interpolira Pa", () => {
    const tacke = [{ p: 0, pa: 100 }, { p: 10, pa: 50 }];
    expect(paNaKriviZaP(tacke, 5)).toBe(75);
  });
});
