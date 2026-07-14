import { describe, it, expect } from "vitest";
import { primeniLinijaFilter } from "../src/lib/digestLinija.js";

describe("primeniLinijaFilter", () => {
  function mockQuery() {
    const calls = [];
    const q = {
      eq(col, val) { calls.push(["eq", col, val]); return q; },
      or(expr) { calls.push(["or", expr]); return q; },
      _calls: calls,
    };
    return q;
  }

  it("bez linije ne menja upit", () => {
    const q = mockQuery();
    expect(primeniLinijaFilter(q, null)).toBe(q);
    expect(q._calls).toHaveLength(0);
  });

  it("filtrira konkretnu liniju", () => {
    const q = mockQuery();
    primeniLinijaFilter(q, "Ulazna kontrola");
    expect(q._calls).toEqual([["eq", "linija", "Ulazna kontrola"]]);
  });

  it("bez linije koristi or null/prazno", () => {
    const q = mockQuery();
    primeniLinijaFilter(q, "(bez linije)");
    expect(q._calls[0][0]).toBe("or");
    expect(q._calls[0][1]).toContain("linija.is.null");
  });
});
