import { describe, it, expect } from "vitest";
import {
  formatMerenjaZaTextarea,
  grupisiMerenjaPoSeriji,
  merenjaBrojeviIzKolona,
  pripremiMerenjaZaOc,
  tipGraniceIzGranica,
} from "../src/lib/iso3951MerenjaIzvor.js";

describe("iso3951MerenjaIzvor", () => {
  it("tipGraniceIzGranica", () => {
    expect(tipGraniceIzGranica(9.8, 10.2)).toBe("dvostrano");
    expect(tipGraniceIzGranica(null, 10)).toBe("gornja");
    expect(tipGraniceIzGranica(5, null)).toBe("donja");
  });

  it("formatMerenjaZaTextarea koristi zarez", () => {
    expect(formatMerenjaZaTextarea([10.02, 9.99])).toBe("10,02 9,99");
  });

  it("grupisiMerenjaPoSeriji — sesija_id", () => {
    const grupe = grupisiMerenjaPoSeriji([
      { sesija_id: "a", created_at: "2026-01-01T10:00:00Z", vrednost_dec: 1 },
      { sesija_id: "b", created_at: "2026-01-02T10:00:00Z", vrednost_dec: 2 },
      { sesija_id: "b", created_at: "2026-01-02T10:00:01Z", vrednost_dec: 3 },
    ]);
    expect(grupe[0].stavke).toHaveLength(2);
    expect(grupe[0].kljuc).toBe("s:b");
  });

  it("merenjaBrojeviIzKolona po poziciji", () => {
    const kolone = [
      { naziv: "A", merenja: [{ dec: 10.1 }] },
      { naziv: "B", merenja: [{ dec: 9.9 }, { dec: 10 }] },
    ];
    expect(merenjaBrojeviIzKolona(kolone, "B")).toEqual([9.9, 10]);
  });

  it("pripremiMerenjaZaOc — poslednja serija", () => {
    const raw = [
      { pozicija: "D1", sesija_id: "old", created_at: "2026-01-01", vrednost_dec: 1, jedinica: "mm" },
      { pozicija: "D1", sesija_id: "new", created_at: "2026-01-05", vrednost_dec: 10.01, jedinica: "mm" },
      { pozicija: "D1", sesija_id: "new", created_at: "2026-01-05", vrednost_dec: 10.02, jedinica: "mm" },
    ];
    const r = pripremiMerenjaZaOc({ rawRedovi: raw, pozicija: "D1", jedinica: "mm" });
    expect(r.brojevi).toEqual([10.01, 10.02]);
    expect(r.greska).toBeNull();
  });
});
