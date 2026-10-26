import { describe, it, expect } from "vitest";
import { analizirajProces } from "../src/lib/spcInteligencija.js";

describe("analizirajProces bez merenja", () => {
  it("ne pretvara prazan period u FPY/RTY 0% ni stabilan trend", () => {
    const izv = analizirajProces({
      attr: { ukN: 0, ukNOK: 0, fpy: null, rty: null },
      merljive: { merenja: 0, nok: 0, fpy: null, rty: null },
      rtyPogon: null,
    });

    expect(izv.ukupnoStanje).toBe("nedovoljno_podataka");
    expect(izv.sumarno.fpyAttr).toBeNull();
    expect(izv.sumarno.fpyMer).toBeNull();
    expect(izv.sumarno.rtyPogon).toBeNull();
    expect(izv.sumarno.pAttr).toBeNull();
    expect(izv.sumarno.pMer).toBeNull();
    expect(izv.predikcija.ukupnoNok).toBeNull();
    expect(izv.predikcija.ukupnoRty).toBeNull();
    expect(izv.predikcija.atributivne).toBeNull();
    expect(izv.predikcija.merljive).toBeNull();
  });

  it("zadržava stvarni FPY 0% kad uzorak postoji", () => {
    const izv = analizirajProces({
      attr: { ukN: 10, ukNOK: 10, fpy: 0, rty: 0 },
      merljive: { merenja: 0, nok: 0, fpy: null },
      rtyPogon: null,
    });

    expect(izv.sumarno.fpyAttr).toBe(0);
    expect(izv.sumarno.fpyMer).toBeNull();
    expect(izv.sumarno.rtyPogon).toBe(0);
    expect(izv.predikcija.ukupnoRty.trenutno).toBe(0);
    expect(izv.predikcija.ukupnoRty.snimak).toBe(true);
    expect(izv.predikcija.merljive).toBeNull();
  });
});
