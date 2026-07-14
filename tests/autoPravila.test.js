import { describe, it, expect } from "vitest";
import { AUTO_PRAVILA, brojAutoPravila } from "../src/lib/autoPravila.js";
import { mozePregledSemeAlarm } from "../src/lib/uloge.js";

describe("AUTO_PRAVILA", () => {
  it("ima definisana pravila", () => {
    expect(brojAutoPravila()).toBeGreaterThanOrEqual(12);
    expect(AUTO_PRAVILA.every((p) => p.id && p.naslov && p.opis)).toBe(true);
  });

  it("uključuje ključna pravila", () => {
    const ids = AUTO_PRAVILA.map((p) => p.id);
    expect(ids).toContain("nok3");
    expect(ids).toContain("ncr_zatvori");
    expect(ids).toContain("digest");
  });
});

describe("mozePregledSemeAlarm", () => {
  it("dozvoljava kvalitet i šefa", () => {
    expect(mozePregledSemeAlarm("kvalitet")).toBe(true);
    expect(mozePregledSemeAlarm("sef")).toBe(true);
    expect(mozePregledSemeAlarm("admin")).toBe(true);
    expect(mozePregledSemeAlarm("kontrolor")).toBe(false);
  });
});
