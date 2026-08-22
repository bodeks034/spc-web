import { describe, it, expect } from "vitest";
import {
  evaluiraj8dOkidace,
  okidacReklamacijaKupca,
  okidacPonovljeniNcr,
  okidacTrosakKolicina,
  okidacScCc,
  ncrMozeZatvoritiBez8d,
  NCR_8D_PRAGOVI,
} from "../src/lib/ncr8dOkidaci.js";

describe("ncr8dOkidaci", () => {
  it("okidač 1 — reklamacija kupca", () => {
    expect(okidacReklamacijaKupca({ broj_reklamacije: "REK-99" }).aktivno).toBe(true);
    expect(okidacReklamacijaKupca({ uticaj_kupca: "DA" }).aktivno).toBe(true);
    expect(okidacReklamacijaKupca({ opis: "x" }).aktivno).toBe(false);
  });

  it("okidač 2 — ponovljeni NCR", () => {
    const r = okidacPonovljeniNcr(
      { id: 2, id_deo: "D1", linija: "L1", opis: "Pukotina na spoju" },
      [{ id: 1, id_deo: "D1", linija: "L1", broj_ncr: "NCR-2026-003", datum_otvaranja: "2026-02-01" }],
    );
    expect(r.aktivno).toBe(true);
    expect(r.prethodniNcr).toBe("NCR-2026-003");
  });

  it("okidač 3 — trošak i količina", () => {
    expect(okidacTrosakKolicina({ trosak_skarta: 600 }).aktivno).toBe(true);
    expect(okidacTrosakKolicina({ kolicina_neispravna: 60 }).aktivno).toBe(true);
    expect(okidacTrosakKolicina({ trosak_skarta: 100 }).aktivno).toBe(false);
  });

  it("okidač 4 — SC/CC", () => {
    expect(okidacScCc({ karakteristika_klasa: "SC" }).aktivno).toBe(true);
    expect(okidacScCc({ karakteristika: "Dimenzija SC poz 12" }).aktivno).toBe(true);
    expect(okidacScCc({ karakteristika_klasa: "Standard" }).aktivno).toBe(false);
  });

  it("evaluiraj8dOkidace — obavezan 8D", () => {
    const ev = evaluiraj8dOkidace({ broj_reklamacije: "R-1", trosak_skarta: 600 });
    expect(ev.obavezan8d).toBe(true);
    expect(ev.okidaci.length).toBeGreaterThanOrEqual(2);
    expect(ev.preporuka.osmd_pokrenut).toBe(true);
  });

  it("zatvaranje blokirano bez 8D", () => {
    const ev = evaluiraj8dOkidace({ broj_reklamacije: "R-1" });
    expect(ncrMozeZatvoritiBez8d({ broj_reklamacije: "R-1" }, ev).ok).toBe(false);
    expect(ncrMozeZatvoritiBez8d({ broj_reklamacije: "R-1", osmd_pokrenut: true }, ev).ok).toBe(true);
  });

  it("pragovi su konfigurabilni", () => {
    expect(NCR_8D_PRAGOVI.trosakSkartaEur).toBe(500);
  });
});
