import { describe, it, expect } from "vitest";
import { citajModulIzHasha, MODULI } from "../src/lib/appRuta.js";

describe("appRuta — modul iz hash-a", () => {
  it("prazan hash znači početni ekran", () => {
    expect(citajModulIzHasha("")).toBe(null);
    expect(citajModulIzHasha("#")).toBe(null);
  });

  it("prepoznaje sve podržane module", () => {
    for (const m of MODULI) {
      const hash = m === "sifrarnik" ? "#sifrarnik" : `#/${m}`;
      expect(citajModulIzHasha(hash)).toBe(m);
    }
  });

  it("Modul 0 zadržava svoj deep-link oblik", () => {
    expect(citajModulIzHasha("#sifrarnik?tab=delovi&deo=5501-A")).toBe("sifrarnik");
  });

  it("nepoznat modul se ignoriše", () => {
    expect(citajModulIzHasha("#/nepostojeci")).toBe(null);
    expect(citajModulIzHasha("#/../etc")).toBe(null);
  });
});
