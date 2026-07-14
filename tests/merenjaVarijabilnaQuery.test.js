import { describe, expect, it } from "vitest";
import {
  filtrirajMerenjaPoPoziciji,
  nadjiKarakteristikuPoPoziciji,
  normalizujPozicijuKljuč,
  pozicijaSePoklapa,
} from "../src/lib/merenjaVarijabilnaQuery.js";

describe("merenjaVarijabilnaQuery", () => {
  it("normalizuje dijakritiku i razmake u poziciji", () => {
    expect(normalizujPozicijuKljuč("Desni žljeb dužina")).toBe("desni zljeb duzina");
    expect(normalizujPozicijuKljuč("  Desni   ZLJEB   DUZINA  ")).toBe("desni zljeb duzina");
  });

  it("poklapa pozicije bez obzira na dijakritiku", () => {
    expect(pozicijaSePoklapa("Desni žljeb dužina", "Desni zljeb duzina")).toBe(true);
    expect(pozicijaSePoklapa("Levi žljeb širina", "Levi zljeb sirina")).toBe(true);
    expect(pozicijaSePoklapa("Precnik", "Širina")).toBe(false);
  });

  it("filtrira merenja po normalizovanoj poziciji", () => {
    const merenja = [
      { pozicija: "Desni zljeb duzina", id: 1 },
      { pozicija: "Desni žljeb dužina", id: 2 },
      { pozicija: "Levi žljeb dužina", id: 3 },
    ];
    const out = filtrirajMerenjaPoPoziciji(merenja, "Desni žljeb dužina");
    expect(out.map((m) => m.id).sort()).toEqual([1, 2]);
  });

  it("nalazi karakteristiku po normalizovanoj poziciji", () => {
    const kars = [
      { id_deo: "5502-A", pozicija: "Desni žljeb dužina", lsl: 123.8 },
      { id_deo: "5502-A", pozicija: "Levi žljeb dužina", lsl: 57.8 },
    ];
    const kar = nadjiKarakteristikuPoPoziciji(kars, "5502-a", "Desni zljeb duzina");
    expect(kar?.lsl).toBe(123.8);
  });
});
