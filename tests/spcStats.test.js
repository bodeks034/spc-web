import { describe, it, expect } from "vitest";
import {
  calcDPMO,
  calcP,
  calcPPM,
  kvalitetIzPrveLoga,
  vanKontrolnihGranica,
  granicePProcenat,
  graniceNp,
} from "../src/lib/spcStats.js";

describe("calcDPMO", () => {
  it("računa defekte po milionu prilika", () => {
    expect(calcDPMO(10, 1000)).toBe(10000);
    expect(calcDPMO(0, 100)).toBe(0);
  });

  it("vraća 0 za prazan uzorak", () => {
    expect(calcDPMO(5, 0)).toBe(0);
  });
});

describe("calcP / calcPPM", () => {
  it("udeli neusaglašenost", () => {
    expect(calcP(25, 100)).toBe(25);
    expect(calcPPM(25, 100)).toBe(250000);
  });
});

describe("kvalitetIzPrveLoga", () => {
  it("računa FPY i DPMO iz OK/NOK", () => {
    const r = kvalitetIzPrveLoga({ ok: 95, nok: 5, n: 100 });
    expect(r.fpy).toBe(95);
    expect(r.dpmo).toBe(50000);
  });
});

describe("granice p i np karte", () => {
  it("ne pušta UCL p-karte preko 100%", () => {
    const g = granicePProcenat(0.5, 2);
    expect(g.cl).toBe(50);
    expect(g.ucl).toBe(100);
    expect(g.lcl).toBe(0);
  });

  it("ostavlja UCL ispod 100% kad je sigma mala", () => {
    const g = granicePProcenat(0.02, 200);
    expect(g.ucl).toBeLessThan(100);
    expect(g.ucl).toBeGreaterThan(g.cl);
    expect(g.lcl).toBeGreaterThanOrEqual(0);
  });

  it("ne pušta UCL np-karte preko veličine podgrupe", () => {
    const g = graniceNp(0.5, 2);
    expect(g.ucl).toBeLessThanOrEqual(2);
    expect(g.lcl).toBeGreaterThanOrEqual(0);
    expect(g.cl).toBe(1);
  });
});

describe("vanKontrolnihGranica", () => {
  it("detektuje tačku van UCL/LCL", () => {
    expect(vanKontrolnihGranica(11, 10, 5)).toBe(true);
    expect(vanKontrolnihGranica(7, 10, 5)).toBe(false);
  });
});
