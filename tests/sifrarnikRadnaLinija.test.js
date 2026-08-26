import { describe, expect, it } from "vitest";
import {
  kljucRadneLinije,
  sheetRadneLinije,
} from "../src/lib/sifrarnikRadnaLinija.js";

describe("sifrarnikRadnaLinija", () => {
  it("kljuc i sheet za VOZ/PRO", () => {
    expect(kljucRadneLinije("VOZ-03")).toBe("voz:VOZ-03");
    expect(kljucRadneLinije("pro-02")).toBe("pro:PRO-02");
    expect(sheetRadneLinije("VOZ-01")).toBe("voz-01_delovi");
    expect(sheetRadneLinije("PRO-05", "final")).toBe("pro-05_final");
  });
});
