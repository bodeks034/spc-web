import { describe, expect, it } from "vitest";
import {
  graniceIzKarakteristike,
  tekstNominalaOznaka,
} from "../src/lib/varijabilneUtils.js";
import { mapGlavniUnosVoziloRed } from "../src/lib/glavniUnosCore.js";

describe("Nominala / oznaka prikaz", () => {
  it("ne prikazuje naziv mere kad je isti kao šta se meri", () => {
    const g = graniceIzKarakteristike({
      pozicija: "K1 Ukupna duzina",
      naziv_mere: "K1 Ukupna duzina",
      nominala: 180,
      lsl: 179.5,
      usl: 180.5,
      jedinica: "mm",
    });
    expect(tekstNominalaOznaka({
      naziv: "K1 Ukupna duzina",
      nazivMere: "K1 Ukupna duzina",
      nominalText: g.nominalText,
    })).toBe("180");
  });

  it("zadržava poseban naziv mere kad nije duplikat", () => {
    expect(tekstNominalaOznaka({
      naziv: "K4",
      nazivMere: "Ø10.5",
      nominalText: "",
    })).toBe("Ø10.5");
  });

  it("propagacija iz Glavnog unosa ne duplira karakteristiku u naziv_mere", () => {
    const mapped = mapGlavniUnosVoziloRed({
      id_deo: "HAM-NM-001",
      Linija: "Preseraj",
      Karakteristika: "K1 Ukupna duzina",
      Tip: "Merljiva",
      Nominal: 180,
      LSL: 179.5,
      USL: 180.5,
      Jedinica: "mm",
    }, {
      pogonByLinija: new Map([["preseraj", { pogon: "B", linija_id: 2 }]]),
      linijaByName: new Map(),
      masinaByLinijaOperacija: new Map(),
    });
    expect(mapped.pozicija).toBe("K1 Ukupna duzina");
    expect(mapped.naziv_mere).toBeNull();
    expect(mapped.nominala).toBe(180);
  });
});
