import { describe, it, expect, vi, beforeEach } from "vitest";
import { optsIzMvReda, statusIzMvReda } from "../src/lib/sifrarnikDeloviMv.js";
import { snapBatchPreObjave, ucitajBatchSnap, obrisiBatchSnap } from "../src/lib/sifrarnikBatchRollback.js";

describe("optsIzMvReda", () => {
  it("mapira MV kolone u opts", () => {
    expect(optsIzMvReda({ gu_broj: 3, gr_broj: 2, ima_barkod: true })).toEqual({
      guBroj: 3,
      greskeBroj: 2,
      imaBarkod: true,
    });
  });
});

describe("statusIzMvReda", () => {
  it("koristi status_sifrarnik iz MV", () => {
    expect(statusIzMvReda({ status_sifrarnik: "kompletan", slika_naziv: "x.jpg" })).toBe("kompletan");
  });
});

describe("snapBatchPreObjave", () => {
  beforeEach(() => {
    obrisiBatchSnap();
    sessionStorage.clear();
  });

  it("čuva snapshot u sessionStorage", () => {
    snapBatchPreObjave({ ids: ["A-1", "B-2"], statistika: { ukupno: 2 } });
    const snap = ucitajBatchSnap();
    expect(snap.ids).toEqual(["A-1", "B-2"]);
    expect(snap.statistika.ukupno).toBe(2);
  });
});

describe("primeniSvePredlogeDuplikata", () => {
  it("je eksportovana funkcija", async () => {
    const mod = await import("../src/lib/sifrarnikDuplikatiPredlog.js");
    expect(typeof mod.primeniSvePredlogeDuplikata).toBe("function");
  });
});
