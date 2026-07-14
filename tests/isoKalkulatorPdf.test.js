import { describe, it, expect } from "vitest";
import {
  snapshotIso2859,
  snapshotIso3951,
  buildIso2859PrintHtml,
  buildIso3951PrintHtml,
} from "../src/lib/isoKalkulatorPdf.js";

describe("isoKalkulatorPdf", () => {
  it("snapshotIso2859 — plan po klasama", () => {
    const snap = snapshotIso2859({
      velicina: 5000,
      nivo: "II",
      tipInspekcije: "Normalna",
      slovo: "L",
      refN: 200,
      planovi: [{
        naziv: "Major",
        plan: { slovo: "L", n: 200, aql: "1.0", ac: 5, re: 6, fullInspection: false },
        nok: 2,
        odluka: { tekst: "PRIHVATI" },
      }],
      konacna: { tekst: "PRIHVATI LOT", razlog: "Sve klase OK" },
      ukNok: 2,
    });
    expect(snap.standard).toBe("ISO 2859-1");
    expect(snap.redovi[0].klasa).toBe("Major");
    expect(snap.redovi[0].odluka).toBe("PRIHVATI");
  });

  it("snapshotIso3951 — merenja i odluka", () => {
    const snap = snapshotIso3951({
      lot: 500,
      prefs: { nivo: "II", aql: "1.5", tipGranice: "dvostrano", lsl: "9.8", usl: "10.2", nominala: "10" },
      plan: { slovo: "H", n: 35, k: 1.435, pctLota: 7 },
      stat: { ok: true, mean: 10.01, s: 0.02, n: 5 },
      merenja: ["10.02", "10.01"],
      odluka: { tekst: "PRIHVATI LOT", razlog: "Qu i Ql ≥ k" },
    });
    expect(snap.standard).toBe("ISO 3951-1");
    expect(snap.kod).toBe("H");
    expect(snap.mean).toBe("10.0100");
    expect(snap.merenja).toHaveLength(2);
  });

  it("buildIso2859PrintHtml sadrži odluku", () => {
    const html = buildIso2859PrintHtml({
      velicina: 100,
      nivo: "II",
      tipInspekcije: "Normalna",
      slovo: "F",
      refN: 15,
      ukNok: 0,
      konacna: { tekst: "PRIHVATI LOT", razlog: "OK" },
      redovi: [{ klasa: "Major", aql: "1.0%", kod: "F", n: 15, ac: 0, re: 1, nok: 0, odluka: "PRIHVATI" }],
    });
    expect(html).toContain("ISO 2859-1");
    expect(html).toContain("PRIHVATI LOT");
    expect(html).toContain("Major");
  });

  it("buildIso3951PrintHtml sadrži statistiku", () => {
    const html = buildIso3951PrintHtml({
      lot: 100,
      nivo: "II",
      aql: "1.5",
      tipGranice: "Dvostrano",
      kod: "F",
      n_plan: 15,
      k: "1.435",
      mean: "10.0100",
      s: "0.0200",
      n_uneto: 5,
      merenja: ["10.02"],
      odluka: { tekst: "PRIHVATI LOT", razlog: "OK" },
    });
    expect(html).toContain("ISO 3951-1");
    expect(html).toContain("10.0100");
    expect(html).toContain("PRIHVATI LOT");
  });
});
