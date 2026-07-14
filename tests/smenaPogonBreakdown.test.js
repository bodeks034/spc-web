import { describe, it, expect } from "vitest";
import { spojiStatModula, formatPoPogonimaTekst } from "../src/lib/smenaPogonBreakdown.js";

describe("spojiStatModula", () => {
  it("kombinuje atributivne i merljive po pogonu", () => {
    const uk = spojiStatModula(
      { n: 80, ok: 76, nok: 4 },
      { n: 20, ok: 19, nok: 1 },
    );
    expect(uk.n).toBe(100);
    expect(uk.fpy).toBe(95);
  });
});

describe("formatPoPogonimaTekst", () => {
  it("formatira redove za digest", () => {
    const txt = formatPoPogonimaTekst([
      {
        label: "A — Ulazna kontrola",
        attr: { n: 50, fpy: 98 },
        merljive: { n: 10, fpy: 100 },
        ukupno: { fpy: 98.3 },
      },
    ]);
    expect(txt).toContain("Po pogonima:");
    expect(txt).toContain("Ulazna kontrola");
    expect(txt).toContain("atr 50");
  });

  it("vraća prazan string bez podataka", () => {
    expect(formatPoPogonimaTekst([])).toBe("");
  });
});
