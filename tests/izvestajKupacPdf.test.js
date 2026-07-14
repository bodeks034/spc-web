import { describe, it, expect } from "vitest";
import { agregirajPoDelu, paretoDefekata, ocenaIsporuke } from "../src/lib/izvestajKupacPdf.js";
import {
  trendKvalitetaAtrPoDanu,
  uporediCiljeve,
  izracunajSpcSazetak,
} from "../src/lib/izvestajKupacData.js";

describe("izvestajKupacPdf", () => {
  it("agregira po delu — atributivne (inspekcija, bez duplog NOK)", () => {
    const log = [
      { id_deo: "A1", naziv_dela: "Deo A", ukupno_merenja: 10, ok_kolicina: 9, nok_kolicina: 0 },
      { id_deo: "A1", inspekcija_id: "insp-1", ukupno_merenja: 0, ok_kolicina: 0, nok_kolicina: 1, greska_naziv: "Ogrebina" },
      { id_deo: "A1", inspekcija_id: "insp-1", ukupno_merenja: 0, ok_kolicina: 0, nok_kolicina: 1, greska_naziv: "Pukotina" },
      { id_deo: "B2", naziv_dela: "Deo B", ukupno_merenja: 20, ok_kolicina: 18, nok_kolicina: 2 },
    ];
    const po = agregirajPoDelu(log);
    expect(po).toHaveLength(2);
    const a1 = po.find((d) => d.id_deo === "A1");
    expect(a1.mereno).toBe(10);
    expect(a1.ok).toBe(9);
    expect(a1.nok).toBe(1);
    expect(a1.rty).toBe("90.0");
  });

  it("agregira po delu — merljive", () => {
    const log = [
      { id_deo: "X", status: "OK" },
      { id_deo: "X", status: "NOK" },
      { id_deo: "X", status: "OK" },
    ];
    const po = agregirajPoDelu(log, { merljive: true });
    expect(po[0].mereno).toBe(3);
    expect(po[0].nok).toBe(1);
  });

  it("pareto defekata", () => {
    const log = [
      { greska_naziv: "Ogrebina", nok_kolicina: 3 },
      { greska_naziv: "Pukotina", nok_kolicina: 5 },
    ];
    const p = paretoDefekata(log);
    expect(p[0].defekt).toBe("Pukotina");
    expect(p[0].kolicina).toBe(5);
  });

  it("ocena isporuke po DPMO", () => {
    expect(ocenaIsporuke({ dpmo: 100 })).toBe("ODOBRENO");
    expect(ocenaIsporuke({ dpmo: 1000 })).toBe("USLOVNO ODOBRENO");
    expect(ocenaIsporuke({ dpmo: 5000 })).toBe("ZAHTEVA AKCIJU");
  });
});

describe("izvestajKupacData", () => {
  it("trend atributivni po danu", () => {
    const log = [
      { datum: "2026-07-01", ukupno_merenja: 10, ok_kolicina: 9, nok_kolicina: 0 },
      { datum: "2026-07-01", inspekcija_id: "x", ukupno_merenja: 0, ok_kolicina: 0, nok_kolicina: 1 },
      { datum: "2026-07-02", ukupno_merenja: 8, ok_kolicina: 6, nok_kolicina: 2 },
    ];
    const t = trendKvalitetaAtrPoDanu(log);
    expect(t).toHaveLength(2);
    expect(t[0].n).toBe(10);
    expect(t[1].dpmo).toBe(250000);
  });

  it("upoređuje ciljeve sa stvarnim", () => {
    const poDeo = [{ id_deo: "A1", naziv: "Deo", rty: "98.0", ppm: 20000 }];
    const ciljevi = { A1: { rty_cilj: 95, dpmo_cilj: 50000 } };
    const u = uporediCiljeve(poDeo, ciljevi);
    expect(u[0].status).toBe("ISPUNJENO");
  });

  it("SPC sažetak — prazan bez merenja", () => {
    expect(izracunajSpcSazetak({ merenja: [], karakteristike: [], sopRows: [], idDeoList: ["X"] })).toEqual([]);
  });
});
