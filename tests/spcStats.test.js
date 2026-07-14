import { describe, it, expect } from "vitest";
import {
  calcDPMO,
  calcP,
  calcPPM,
  kvalitetIzPrveLoga,
  vanKontrolnihGranica,
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

describe("vanKontrolnihGranica", () => {
  it("detektuje tačku van UCL/LCL", () => {
    expect(vanKontrolnihGranica(11, 10, 5)).toBe(true);
    expect(vanKontrolnihGranica(7, 10, 5)).toBe(false);
  });
});
