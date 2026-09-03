import { describe, expect, it } from "vitest";
import {
  SIFRARNIK_POGLED,
  ucitajSifrarnikPogled,
  sacuvajSifrarnikPogled,
} from "../src/lib/sifrarnikPogled.js";

describe("sifrarnikPogled", () => {
  it("podrazumevano je radni režim", () => {
    localStorage.clear();
    expect(ucitajSifrarnikPogled()).toBe(SIFRARNIK_POGLED.RADNI);
  });

  it("pamti hub", () => {
    sacuvajSifrarnikPogled(SIFRARNIK_POGLED.HUB);
    expect(ucitajSifrarnikPogled()).toBe(SIFRARNIK_POGLED.HUB);
    sacuvajSifrarnikPogled(SIFRARNIK_POGLED.RADNI);
    expect(ucitajSifrarnikPogled()).toBe(SIFRARNIK_POGLED.RADNI);
  });
});
