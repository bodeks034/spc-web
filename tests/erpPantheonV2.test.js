import { describe, expect, it } from "vitest";
import sapPreset from "../config/erp/presets/sap.json" with { type: "json" };
import pantheonPreset from "../config/erp/presets/pantheon.json" with { type: "json" };
import { parsirajEntitetCsv } from "../src/lib/erpUvozCore.js";

describe("Pantheon ERP v2 preset", () => {
  it("ima isti entitetski obim i redosled kao SAP v2", () => {
    expect(pantheonPreset.verzija).toBe(2);
    expect(pantheonPreset.redosled_uvoza).toEqual(sapPreset.redosled_uvoza);
    expect(Object.keys(pantheonPreset.entiteti).sort())
      .toEqual(Object.keys(sapPreset.entiteti).sort());
  });

  it("zadržava v2 strategije, kompozitne ključeve i QMS", () => {
    expect(pantheonPreset.entiteti.sastavnica.upsert_kljuc)
      .toBe("nadredjeni_deo,podredjeni_deo,revizija");
    expect(pantheonPreset.entiteti.operacije.upsert_kljuc)
      .toBe("id_deo,sifra_operacije");
    expect(pantheonPreset.entiteti.kontrolni_plan_erp.upsert_strategija)
      .toBe("qms_document_rows");
    expect(pantheonPreset.entiteti.pfmea_erp.upsert_strategija)
      .toBe("qms_document_rows");
    expect(pantheonPreset.entiteti.serijski_brojevi.reference_checks.length).toBeGreaterThan(0);
  });

  it("parsira Pantheon delove (Ident/Naziv/GrupaArtikla)", () => {
    const csv = [
      "Ident,Naziv,GrupaArtikla,Revizija,Masa,JedinicaMere",
      "RTB-P-1,Nosač Pantheon,TV4X4,A,2.5,kom",
    ].join("\n");
    const parsed = parsirajEntitetCsv(csv, pantheonPreset.entiteti.delovi);
    expect(parsed.validnih).toBe(1);
    expect(parsed.redovi[0]).toMatchObject({
      id_deo: "RTB-P-1",
      naziv_dela: "Nosač Pantheon",
      sifra_vozila: "TV4X4",
      revizija: "A",
      masa: 2.5,
    });
  });

  it("parsira Pantheon karakteristike preko Ident i RN", () => {
    const csv = [
      "Ident,RN,Pogon,Pozicija,SifraKarakteristike,NazivKarakteristike,Nominal,LSL,USL,JedinicaMere",
      "RTB-P-1,RN-P-001-B,B,CC-01,CC-01,Razmak,620,619.8,620.2,mm",
    ].join("\n");
    const parsed = parsirajEntitetCsv(
      csv,
      pantheonPreset.entiteti.karakteristike_merljive,
    );
    expect(parsed.validnih).toBe(1);
    expect(parsed.redovi[0]).toMatchObject({
      id_deo: "RTB-P-1",
      radni_nalog: "RN-P-001-B",
      pogon_kod: "B",
      pozicija: "CC-01",
      nominala: 620,
    });
  });
});
