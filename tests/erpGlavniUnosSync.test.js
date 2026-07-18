import { describe, expect, it } from "vitest";
import {
  erpGlavniUnosKljuc,
  napraviErpGlavniUnosRedove,
} from "../src/lib/erpGlavniUnosSync.js";

describe("ERP raspored u Glavni unos", () => {
  it("raspoređuje deo po SifraVozila i bira RN istog pogona", () => {
    const rezultat = napraviErpGlavniUnosRedove({
      sheetovi: [{ naziv: "vozilo1", sifra_vozila: "TV4X4", aktivan: true }],
      delovi: [{
        id_deo: "RTB-001",
        sifra_vozila: "TV4X4",
        naziv_dela: "Nosač rezervoara",
        broj_crteza: "RTB-001",
      }],
      karakteristike: [{
        id_deo: "RTB-001",
        pogon_kod: "B",
        sifra_merenja: "CC-01",
        pozicija: "CC-01",
        naziv_mere: "Razmak otvora",
        nominala: 620,
        lsl: 619.8,
        usl: 620.2,
        sifra_operacije: "OP-PRES",
      }],
      radniNalozi: [
        { broj_naloga: "RN-RTB-A", id_deo: "RTB-001", pogon_kod: "A", kolicina: 50 },
        { broj_naloga: "RN-RTB-B", id_deo: "RTB-001", pogon_kod: "B", kolicina: 50 },
      ],
    });

    expect(rezultat.bezMape).toEqual([]);
    expect(rezultat.redovi).toHaveLength(1);
    expect(rezultat.redovi[0]).toMatchObject({
      sheet_naziv: "vozilo1",
      id_deo: "RTB-001",
      radni_nalog: "RN-RTB-B",
      operacija: "OP-PRES",
      linija: "Preseraj",
      izvor: "erp",
      erp_kljuc: "RTB-001|B|CC-01|CC-01",
    });
  });

  it("ne raspoređuje vozilo bez dodeljenog sheeta", () => {
    const rezultat = napraviErpGlavniUnosRedove({
      sheetovi: [{ naziv: "vozilo1", sifra_vozila: "TV4X4", aktivan: true }],
      delovi: [{ id_deo: "D-2", sifra_vozila: "NTV" }],
      karakteristike: [{ id_deo: "D-2", pogon_kod: "A", pozicija: "D1" }],
    });
    expect(rezultat.redovi).toEqual([]);
    expect(rezultat.bezMape).toEqual(["NTV"]);
  });

  it("ERP ključ je stabilan i ne zavisi od radnog naloga", () => {
    const kar = {
      id_deo: "rtb-001",
      pogon_kod: "b",
      sifra_merenja: "CC-01",
      pozicija: "CC-01",
      radni_nalog: "RN-1",
    };
    expect(erpGlavniUnosKljuc(kar)).toBe("RTB-001|B|CC-01|CC-01");
    expect(erpGlavniUnosKljuc({ ...kar, radni_nalog: "RN-2" }))
      .toBe("RTB-001|B|CC-01|CC-01");
  });
});
