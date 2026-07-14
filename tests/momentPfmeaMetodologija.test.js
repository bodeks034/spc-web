import { describe, it, expect } from "vitest";
import {
  izracunajMomentRpn,
  predloziMomentKlasifikaciju,
  uzorkovanjeZaKlasu,
} from "../src/lib/momentPfmeaMetodologija.js";

describe("izracunajMomentRpn", () => {
  it("računa S×O×D u opsegu", () => {
    expect(izracunajMomentRpn(9, 5, 4)).toBe(180);
    expect(izracunajMomentRpn(1, 1, 1)).toBe(1);
  });

  it("odbija van opsega", () => {
    expect(izracunajMomentRpn(0, 5, 4)).toBeNull();
    expect(izracunajMomentRpn(9, 11, 4)).toBeNull();
    expect(izracunajMomentRpn("x", 5, 4)).toBeNull();
  });
});

describe("predloziMomentKlasifikaciju", () => {
  it("VSK kad je S ≥ 9", () => {
    expect(predloziMomentKlasifikaciju(9, 1, 1)).toBe("VSK");
    expect(predloziMomentKlasifikaciju(10, 2, 2)).toBe("VSK");
  });

  it("KSK za visok RPN", () => {
    expect(predloziMomentKlasifikaciju(7, 8, 8)).toBe("KSK");
  });

  it("STD za nizak rizik", () => {
    expect(predloziMomentKlasifikaciju(4, 3, 3)).toBe("STD");
  });
});

describe("uzorkovanjeZaKlasu", () => {
  it("vraća pravilo uzorkovanja", () => {
    expect(uzorkovanjeZaKlasu("VSK")).toMatch(/100%/i);
    expect(uzorkovanjeZaKlasu("STD")).toBeTruthy();
  });
});
