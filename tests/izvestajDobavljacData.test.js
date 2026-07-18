import { describe, expect, it } from "vitest";
import {
  agregirajDobavljacDefekte,
  agregirajDobavljacMaterijale,
  agregirajDobavljacTrend,
  izracunajDobavljacStat,
} from "../src/lib/izvestajDobavljacData.js";

const REDOVI = [
  {
    datum: "2026-07-01",
    sifra_materijala: "MAT-1",
    kontrolisano: 100,
    ok_kolicina: 98,
    nok_kolicina: 2,
    primljeno: 500,
    status: "uslovno",
    defekt: "Korozija",
  },
  {
    datum: "2026-07-01",
    sifra_materijala: "MAT-1",
    kontrolisano: 50,
    ok_kolicina: 50,
    nok_kolicina: 0,
    primljeno: 200,
    status: "prihvaceno",
  },
  {
    datum: "2026-07-02",
    sifra_materijala: "MAT-2",
    kontrolisano: 20,
    ok_kolicina: 15,
    nok_kolicina: 5,
    primljeno: 20,
    status: "odbijeno",
    defekt: "Korozija",
  },
];

describe("izveštaj dobavljača", () => {
  it("računa KPI prijemne kontrole", () => {
    const s = izracunajDobavljacStat(REDOVI);
    expect(s).toMatchObject({
      prijema: 3,
      primljeno: 720,
      kontrolisano: 170,
      ok: 163,
      nok: 7,
      odbijeno: 1,
      uslovno: 1,
      prihvaceno: 1,
      ppm: 41176,
    });
    expect(s.okStopa).toBe(95.88);
    expect(s.prihvatPrijema).toBe(33.33);
  });

  it("grupiše trend, defekte i materijale", () => {
    expect(agregirajDobavljacTrend(REDOVI)).toHaveLength(2);
    expect(agregirajDobavljacDefekte(REDOVI)).toEqual([
      { defekt: "Korozija", kolicina: 7 },
    ]);
    const materijali = agregirajDobavljacMaterijale(REDOVI, [
      { sifra_materijala: "MAT-1", naziv_materijala: "Lim" },
      { sifra_materijala: "MAT-2", naziv_materijala: "Profil" },
    ]);
    expect(materijali.find((m) => m.sifra_materijala === "MAT-1")).toMatchObject({
      kontrolisano: 150,
      nok: 2,
      okStopa: 98.67,
    });
  });
});
