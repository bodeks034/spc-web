import { describe, expect, it } from "vitest";
import sapPreset from "../config/erp/presets/sap.json" with { type: "json" };
import {
  fajlOdgovaraEntitetu,
  mapCsvRed,
  parsirajEntitetCsv,
} from "../src/lib/erpUvozCore.js";
import {
  detektujCsvDelimiter,
  normHeader,
  parseCsvText,
} from "../src/lib/radniNaloziUvoz.js";

describe("ERP v2 CSV ugovor", () => {
  it("normalizuje srpski CamelCase u kanonski snake_case", () => {
    expect(normHeader("ŠifraDela")).toBe("sifra_dela");
    expect(normHeader("BrojRadnogNaloga")).toBe("broj_radnog_naloga");
    expect(normHeader("Jedinica mere")).toBe("jedinica_mere");
  });

  it("detektuje tačka-zarez i UTF-8 BOM", () => {
    const csv = "\uFEFFSifraDela;NazivDela;Masa\nD-1;Nosač;1,25";
    expect(detektujCsvDelimiter("SifraDela;NazivDela;Masa")).toBe(";");
    const rows = parseCsvText(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      sifra_dela: "D-1",
      naziv_dela: "Nosač",
      masa: "1,25",
    });
  });

  it("prepoznaje numerisane nazive fajlova iz ERP dokumenta", () => {
    expect(fajlOdgovaraEntitetu("04_Delovi.csv", sapPreset.entiteti.delovi)).toBe(true);
    expect(fajlOdgovaraEntitetu("03_TipoviVozila.csv", sapPreset.entiteti.tipovi_vozila)).toBe(true);
    expect(fajlOdgovaraEntitetu("18_RadniNalozi.csv", sapPreset.entiteti.radni_nalozi)).toBe(true);
    expect(fajlOdgovaraEntitetu("04_Delovi.xlsx", sapPreset.entiteti.delovi)).toBe(true);
  });

  it("ne svodi composite-key entitet na poslednji red", () => {
    const csv = [
      "NadredjeniDeo,PodredjeniDeo,Kolicina,JedinicaMere",
      "A,B,2,kom",
      "A,C,4,kom",
    ].join("\n");
    const parsed = parsirajEntitetCsv(csv, sapPreset.entiteti.sastavnica);
    expect(parsed.validnih).toBe(2);
    expect(parsed.redovi.map((r) => r.podredjeni_deo)).toEqual(["B", "C"]);
  });

  it("SAP delete flag deaktivira umesto da aktivira zapis", () => {
    const mapped = mapCsvRed(
      {
        _linija: 2,
        matnr: "D-1",
        maktx: "Deo",
        lvorm: "X",
      },
      sapPreset.entiteti.delovi,
    );
    expect(mapped.ok).toBe(true);
    expect(mapped.row.aktivan).toBe(false);
    expect(mapped.row).not.toHaveProperty("_delete_flag");
  });

  it("parsira predloženi format radnih naloga", () => {
    const csv = [
      "BrojRadnogNaloga,SifraDela,Revizija,Kolicina,SifraLinije,SifraMasine,SifraSmene,BrojZaposlenog,BrojSerije,DatumProizvodnje,Status",
      "RN-100,D-1,B,50,L1,M1,S1,0007,LOT-9,18.07.2026,aktivan",
    ].join("\n");
    const parsed = parsirajEntitetCsv(csv, sapPreset.entiteti.radni_nalozi);
    expect(parsed.validnih).toBe(1);
    expect(parsed.redovi[0]).toMatchObject({
      broj_naloga: "RN-100",
      id_deo: "D-1",
      revizija: "B",
      sifra_linije: "L1",
      broj_serije: "LOT-9",
      datum_proizvodnje: "2026-07-18",
    });
  });
});
