import { describe, it, expect } from "vitest";
import { jeKontrolaCelogVozila } from "../src/lib/spcPredlogKarti.js";
import { dijagramSrcZaDeo } from "../src/lib/voziloDijagramConfig.js";

describe("jeKontrolaCelogVozila", () => {
  it("prepoznaje tip_kontrole vozilo", () => {
    expect(jeKontrolaCelogVozila({ tip_kontrole: "vozilo", id_deo: "X" })).toBe(true);
  });

  it("prepoznaje HAM i HAM-001", () => {
    expect(jeKontrolaCelogVozila({ id_deo: "HAM-001" })).toBe(true);
    expect(jeKontrolaCelogVozila({ id_deo: "HAM" })).toBe(true);
    expect(jeKontrolaCelogVozila({ vozilo_katalog_id: "HAM", id_deo: "NESTO" })).toBe(true);
  });

  it("ne tretira običan deo kao vozilo", () => {
    expect(jeKontrolaCelogVozila({
      id_deo: "5501-A",
      karakteristika: "Ulazna kontrola",
      tip_kontrole: "atributivna",
    })).toBe(false);
  });
});

describe("dijagramSrcZaDeo HAM", () => {
  it("vraća ham.png za HAM-001", () => {
    expect(dijagramSrcZaDeo({ id_deo: "HAM-001" })).toBe("/vozilo/dijagrami/ham.png");
  });
});
