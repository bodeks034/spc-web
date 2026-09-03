import { describe, it, expect } from "vitest";
import { rangirajDanasKorake } from "../src/lib/danasTok.js";

describe("rangirajDanasKorake", () => {
  it("zaglavljeni sync ima najviši prioritet", () => {
    expect(rangirajDanasKorake({
      zaglavljenih: 2,
      imaKriticniAlarm: true,
      linija: true,
    })).toEqual(["zaglavljen", "alarm", "unos-atr"]);
  });

  it("linija vidi unos kad nema alarma", () => {
    expect(rangirajDanasKorake({ linija: true, online: true })).toEqual([
      "unos-atr",
      "unos-mer",
    ]);
  });

  it("nedovršena kontrolna lista ide pre unosa", () => {
    expect(rangirajDanasKorake({
      linija: true,
      listaNedovrsena: true,
    })).toEqual(["lista", "unos-atr", "unos-mer"]);
  });

  it("kvalitet bez alarma vidi odobrenja", () => {
    expect(rangirajDanasKorake({ qa: true, sifrarnik: true })).toEqual([
      "sifrarnik",
      "odobrenja",
    ]);
  });

  it("admin ide na go-live kad nema hitnijeg", () => {
    expect(rangirajDanasKorake({ admin: true })).toEqual(["admin"]);
  });
});
