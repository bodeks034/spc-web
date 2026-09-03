import { describe, it, expect } from "vitest";
import {
  calcFPY,
  calcRTYIzFaza,
  fazeKvalitetaPogona,
  najslabijaFaza,
  kvalitetFaktorIzRty,
  izracunajOeeSaKvalitetom,
} from "../src/lib/rtyFpy.js";

describe("calcFPY", () => {
  it("računa procenat na jednu decimalu", () => {
    expect(calcFPY(95, 100)).toBe(95);
    expect(calcFPY(1, 3)).toBe(33.3);
  });

  it("deljenje nulom daje 0, ne NaN", () => {
    expect(calcFPY(5, 0)).toBe(0);
    expect(calcFPY(null, null)).toBe(0);
  });
});

describe("calcRTYIzFaza", () => {
  it("jedna faza je sam FPY, ne proizvod", () => {
    expect(calcRTYIzFaza(96)).toBe(96);
  });

  it("više faza se množi", () => {
    expect(calcRTYIzFaza(90, 90)).toBe(81);
    expect(calcRTYIzFaza(100, 50, 50)).toBe(25);
  });

  it("preskače faze bez merenja", () => {
    expect(calcRTYIzFaza({ fpy: 90, ukupno: 10 }, { fpy: 50, ukupno: 0 })).toBe(90);
  });

  it("bez ijedne upotrebljive faze vraća null", () => {
    expect(calcRTYIzFaza(null, undefined)).toBeNull();
    expect(calcRTYIzFaza()).toBeNull();
  });
});

describe("fazeKvalitetaPogona", () => {
  it("spaja atributivne i merljive u RTY", () => {
    const { faze, rty } = fazeKvalitetaPogona({
      attr: { fpy: 90, ukupno: 100, neusaglaseno: 10 },
      merljive: { fpy: 80, ukupno: 50, neusaglaseno: 10 },
    });
    expect(faze.map((f) => f.id)).toEqual(["atributivne", "merljive"]);
    expect(rty).toBe(72);
  });

  it("faza bez merenja se ne broji", () => {
    const { faze, rty } = fazeKvalitetaPogona({
      attr: { fpy: 90, ukupno: 100 },
      merljive: { fpy: 10, ukupno: 0 },
    });
    expect(faze).toHaveLength(1);
    expect(rty).toBe(90);
  });

  it("bez podataka nema RTY", () => {
    expect(fazeKvalitetaPogona({}).rty).toBeNull();
  });
});

describe("najslabijaFaza", () => {
  it("vraća fazu sa najnižim FPY", () => {
    const faze = [{ id: "a", fpy: 92 }, { id: "b", fpy: 71 }, { id: "c", fpy: 88 }];
    expect(najslabijaFaza(faze).id).toBe("b");
  });

  it("ne menja ulazni niz", () => {
    const faze = [{ id: "a", fpy: 92 }, { id: "b", fpy: 71 }];
    najslabijaFaza(faze);
    expect(faze[0].id).toBe("a");
  });

  it("prazna lista daje null", () => {
    expect(najslabijaFaza([])).toBeNull();
  });
});

describe("kvalitetFaktorIzRty", () => {
  it("procenat prevodi u faktor 0–1 i seče van opsega", () => {
    expect(kvalitetFaktorIzRty(85)).toBeCloseTo(0.85);
    expect(kvalitetFaktorIzRty(140)).toBe(1);
    expect(kvalitetFaktorIzRty(-5)).toBeNull();
    expect(kvalitetFaktorIzRty("x")).toBeNull();
  });
});

describe("izracunajOeeSaKvalitetom", () => {
  it("množi dostupnost, učinak i kvalitet", () => {
    expect(izracunajOeeSaKvalitetom({ availability: 0.9, performance: 0.95, rty: 100 })).toBe(85.5);
  });

  it("bez dostupnosti računa samo učinak × kvalitet", () => {
    expect(izracunajOeeSaKvalitetom({ performance: 0.5, rty: 80 })).toBe(40);
  });

  it("pada na FPY kad RTY nije zadat", () => {
    expect(izracunajOeeSaKvalitetom({ availability: 1, fpy: 90 })).toBe(90);
  });

  it("bez kvaliteta nema OEE", () => {
    expect(izracunajOeeSaKvalitetom({ availability: 0.9 })).toBeNull();
  });
});
