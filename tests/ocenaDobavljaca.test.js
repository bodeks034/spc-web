import { describe, expect, it } from "vitest";
import {
  izracunajKvalitetSkor,
  izracunajUkupnuOcenu,
  klasaDobavljaca,
  napraviPredlogOcene,
  ppmSkor,
} from "../src/lib/ocenaDobavljaca.js";

describe("ocena dobavljača", () => {
  it("mapira PPM u skor", () => {
    expect(ppmSkor(0)).toBe(100);
    expect(ppmSkor(500)).toBe(100);
    expect(ppmSkor(1000)).toBe(95);
    expect(ppmSkor(50000)).toBe(25);
    expect(ppmSkor(100000)).toBe(0);
  });

  it("računa kvalitetni skor sa penalima odbijenih/uslovnih", () => {
    const skor = izracunajKvalitetSkor({
      kontrolisano: 1000,
      prijema: 10,
      ppm: 1000,
      odbijeno: 1,
      uslovno: 1,
    });
    // PPM 1000 → 95; odbijeno 10% → -6; uslovno 10% → -2
    expect(skor).toBe(87);
  });

  it("vraća null kad nema kontrole", () => {
    expect(izracunajKvalitetSkor({ kontrolisano: 0, prijema: 0 })).toBeNull();
  });

  it("računa ukupnu ocenu i A–D klasu", () => {
    expect(izracunajUkupnuOcenu({
      kvalitet: 100, isporuka: 100, dokumentacija: 100, reakcija: 100,
    })).toEqual({ ukupno: 100, klasa: "A" });

    expect(izracunajUkupnuOcenu({
      kvalitet: 80, isporuka: 70, dokumentacija: 60, reakcija: 50,
    })).toEqual({ ukupno: 73, klasa: "C" });

    expect(klasaDobavljaca(89.9)).toBe("B");
    expect(klasaDobavljaca(59.9)).toBe("D");
  });

  it("pravi predlog sa podrazumevanim ostalim skorovima 100", () => {
    const p = napraviPredlogOcene({
      kontrolisano: 200,
      prijema: 4,
      ppm: 0,
      odbijeno: 0,
      uslovno: 0,
    });
    expect(p.kvalitet).toBe(100);
    expect(p.ukupno).toBe(100);
    expect(p.klasa).toBe("A");
  });
});
