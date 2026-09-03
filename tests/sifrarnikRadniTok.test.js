import { describe, expect, it, beforeEach } from "vitest";
import {
  sacuvajPoslednjiDeo,
  ucitajPoslednjiDeo,
  beleziZatvorenDeo,
  ucitajDanasnjiBrojac,
  tourZavrsen,
  zavrsiTour,
  resetujTour,
  postaviGotovoSledeci,
  ucitajGotovoSledeci,
  obrisiGotovoSledeci,
  postaviGotovoRed,
  ucitajGotovoRed,
  obrisiGotovoRed,
  podeliGotovoRed,
  stavkaOdgovaraRadniFilter,
  idDeoviIzKonteksta,
} from "../src/lib/sifrarnikRadniTok.js";

describe("sifrarnikRadniTok", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("pamti poslednji deo", () => {
    sacuvajPoslednjiDeo({ idDeo: "abc-1", tab: "greske", linija: "voz-mrap" });
    const p = ucitajPoslednjiDeo();
    expect(p.idDeo).toBe("ABC-1");
    expect(p.tab).toBe("greske");
    expect(p.linija).toBe("VOZ-MRAP");
  });

  it("broji zatvorene delove jednom po danu", () => {
    expect(ucitajDanasnjiBrojac().broj).toBe(0);
    expect(beleziZatvorenDeo("A1").broj).toBe(1);
    expect(beleziZatvorenDeo("A1").broj).toBe(1);
    expect(beleziZatvorenDeo("B2").broj).toBe(2);
  });

  it("tour flag i reset", () => {
    expect(tourZavrsen()).toBe(false);
    zavrsiTour();
    expect(tourZavrsen()).toBe(true);
    resetujTour();
    expect(tourZavrsen()).toBe(false);
  });

  it("gotovo → sledeći session sa više ID", () => {
    postaviGotovoSledeci({ idDeovi: ["a", "b"], akcija: "snimi" });
    const g = ucitajGotovoSledeci();
    expect(g.idDeo).toBe("A");
    expect(g.idDeovi).toEqual(["A", "B"]);
    expect(g.akcija).toBe("snimi");
    obrisiGotovoSledeci();
    expect(ucitajGotovoSledeci()).toBeNull();
  });

  it("gotovo red kroz više ID-eva", () => {
    postaviGotovoRed(["x1", "x2", "x1"]);
    expect(ucitajGotovoRed()).toEqual(["X1", "X2"]);
    obrisiGotovoRed();
    expect(ucitajGotovoRed()).toEqual([]);
  });

  it("podeliGotovoRed odvaja kompletirane i pending", () => {
    const { kompletirani, pending } = podeliGotovoRed([
      { id: "a", status: "kompletan" },
      { id: "b", status: "delimicno", koraci: [{ tab: "greske", ctx: { idDeo: "B" } }] },
      { id: "c", status: "delimicno", koraci: [] },
    ]);
    expect(kompletirani).toEqual(["A"]);
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe("B");
    expect(pending[0].korak.tab).toBe("greske");
  });

  it("filter delimičnih po nedostaje", () => {
    const s = { nedostaje: ["Glavni unos", "Crtež"] };
    expect(stavkaOdgovaraRadniFilter(s, "")).toBe(true);
    expect(stavkaOdgovaraRadniFilter(s, "gu")).toBe(true);
    expect(stavkaOdgovaraRadniFilter(s, "greske")).toBe(false);
    expect(stavkaOdgovaraRadniFilter(s, "crtez")).toBe(true);
  });

  it("idDeoviIzKonteksta iz sheeta i filtera", () => {
    expect(idDeoviIzKonteksta([{ id_deo: "x-1" }, { id_deo: "x-1" }, { id_deo: "y-2" }], "")).toEqual([
      "X-1",
      "Y-2",
    ]);
    expect(idDeoviIzKonteksta([{ id_deo: "x-1" }], "solo")).toEqual(["SOLO"]);
  });
});
