import { describe, it, expect } from "vitest";
import {
  statIzPredajaPodataka,
  spojiSmenaPogonaStat,
} from "../src/lib/smenaPogonaPregled.js";

describe("statIzPredajaPodataka", () => {
  it("mapira merenja iz predaja podataka", () => {
    const s = statIzPredajaPodataka({
      merenja: { n: 100, ok: 95, nok: 5, rty: 95, dpmo: 50000 },
      topNok: [["greška", 3]],
    });
    expect(s.n).toBe(100);
    expect(s.fpy).toBe(95);
    expect(s.topNok).toHaveLength(1);
  });

  it("vraća nule za prazan ulaz", () => {
    const s = statIzPredajaPodataka(null);
    expect(s.n).toBe(0);
    expect(s.fpy).toBeNull();
  });
});

describe("spojiSmenaPogonaStat", () => {
  it("kombinuje atributivne i merljive", () => {
    const uk = spojiSmenaPogonaStat(
      { n: 100, ok: 90, nok: 10 },
      { n: 50, ok: 48, nok: 2 },
    );
    expect(uk.n).toBe(150);
    expect(uk.ok).toBe(138);
    expect(uk.nok).toBe(12);
    expect(uk.fpy).toBe(92);
    expect(uk.dpmo).toBe(80000);
  });

  it("vraća nule bez uzoraka", () => {
    const uk = spojiSmenaPogonaStat({}, {});
    expect(uk.n).toBe(0);
    expect(uk.fpy).toBeNull();
  });
});
