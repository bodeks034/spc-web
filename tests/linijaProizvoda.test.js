import { describe, expect, it } from "vitest";
import {
  grupisiLinije,
  jeLinijaProizvod,
  jeLinijaVozila,
  predlogSheetaZaLiniju,
} from "../src/lib/linijaProizvoda.js";

describe("linijaProizvoda", () => {
  it("prepoznaje VOZ i PRO prefikse", () => {
    expect(jeLinijaVozila("VOZ-01")).toBe(true);
    expect(jeLinijaVozila("voz-10")).toBe(true);
    expect(jeLinijaProizvod("PRO-01")).toBe(true);
    expect(jeLinijaProizvod("HAM")).toBe(false);
  });

  it("grupiše linije po tipu", () => {
    const g = grupisiLinije([
      { kod: "PRO-02", naziv: "P2", aktivan: true },
      { kod: "VOZ-01", naziv: "V1", aktivan: true },
      { kod: "MRAP", naziv: "M", aktivan: true },
      { kod: "VOZ-02", naziv: "V2", aktivan: false },
    ]);
    expect(g.vozila.map((x) => x.kod)).toEqual(["VOZ-01"]);
    expect(g.proizvodi.map((x) => x.kod)).toEqual(["PRO-02"]);
    expect(g.ostalo.map((x) => x.kod)).toEqual(["MRAP"]);
  });

  it("predlaže sheet nazive iz koda linije", () => {
    expect(predlogSheetaZaLiniju("VOZ-01", "delovi")).toBe("voz-01_delovi");
    expect(predlogSheetaZaLiniju("PRO-03", "final")).toBe("pro-03_final");
  });
});
