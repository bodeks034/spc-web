import { describe, it, expect } from "vitest";
import {
  planIso3951,
  statistikaUzorka,
  odlukaIso3951,
  kFaktor,
  parseMerenjaTxt,
} from "../src/lib/iso3951.js";

describe("iso3951", () => {
  it("plan za lot 100 nivo II daje kod F n=15", () => {
    const p = planIso3951(100, "II", "1.5");
    expect(p.slovo).toBe("F");
    expect(p.n).toBe(15);
    expect(p.k).toBeCloseTo(1.463, 2);
  });

  it("plan za lot 500 nivo II daje kod H n=35", () => {
    const p = planIso3951(500, "II", "1.5");
    expect(p.slovo).toBe("H");
    expect(p.n).toBe(35);
    expect(p.k).toBeCloseTo(1.385, 2);
  });

  it("k faktor za n=15 AQL 1.5", () => {
    const k = kFaktor(15, "1.5");
    expect(k).toBeCloseTo(1.463, 2);
  });

  it("parsira srpski zarez kao decimalu", () => {
    const m = parseMerenjaTxt("10,02 10,01 9,99");
    expect(m).toEqual(["10.02", "10.01", "9.99"]);
    const stat = statistikaUzorka(m);
    expect(stat.ok).toBe(true);
    expect(stat.s).toBeGreaterThan(0);
  });

  it("prihvata lot kada su sva merenja ista ali x̄ unutar granica", () => {
    const stat = statistikaUzorka(parseMerenjaTxt("10,00 10,00 10,00"));
    expect(stat.s).toBe(0);
    const k = kFaktor(15, "1.5");
    const od = odlukaIso3951({
      mean: stat.mean,
      s: stat.s,
      k,
      lsl: 9.8,
      usl: 10.2,
      tipGranice: "dvostrano",
    });
    expect(od.boja).toBe("zelena");
    expect(od.tekst).toBe("PRIHVATI LOT");
  });

  it("prihvata lot kada je Qu >= k", () => {
    const stat = statistikaUzorka([10.0, 10.01, 9.99, 10.02, 10.0, 9.98, 10.01, 10.0, 9.99, 10.0, 10.01, 9.99, 10.0, 10.02, 10.0]);
    const k = kFaktor(15, "1.5");
    const od = odlukaIso3951({
      mean: stat.mean,
      s: stat.s,
      k,
      lsl: 9.8,
      usl: 10.2,
      tipGranice: "dvostrano",
    });
    expect(od.boja).toBe("zelena");
    expect(od.qu).toBeGreaterThan(k);
  });

  it("odbija lot kada je van granice", () => {
    const stat = statistikaUzorka([10.5, 10.6, 10.55, 10.52, 10.48, 10.51, 10.49, 10.53, 10.5, 10.54]);
    const k = kFaktor(10, "1.5");
    const od = odlukaIso3951({
      mean: stat.mean,
      s: stat.s,
      k,
      usl: 10.2,
      tipGranice: "gornja",
    });
    expect(od.boja).toBe("crvena");
  });
});
