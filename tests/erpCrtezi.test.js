import { describe, it, expect } from "vitest";
import { mapCsvRed, parsirajEntitetCsv } from "../src/lib/erpUvozCore.js";

const CRTEZI_CFG = {
  tabela: "crtez_assets",
  ref_tip_fiksno: "deo",
  obavezna_polja: ["ref_id", "prikaz_putanja"],
  podrazumevano: { ref_tip: "deo", prikaz_format: "svg", revizija: "A", aktivna: true },
  kolone: {
    ref_id: { iz: ["id_deo", "MATNR"] },
    prikaz_putanja: { iz: ["prikaz_putanja", "svg_path"] },
    revizija: { iz: ["revizija", "REV"] },
  },
};

describe("ERP crtezi_dela", () => {
  it("mapira ref_id i podrazumevani ref_tip deo", () => {
    const r = mapCsvRed(
      { _linija: 2, id_deo: "5502-a", prikaz_putanja: "crtezi/prikaz/deo/5502-A/revA.svg" },
      CRTEZI_CFG,
    );
    expect(r.ok).toBe(true);
    expect(r.row.ref_id).toBe("5502-A");
    expect(r.row.ref_tip).toBe("deo");
    expect(r.row.prikaz_format).toBe("svg");
  });

  it("parsira CSV sa duplikat revizije", () => {
    const csv = `id_deo,prikaz_putanja,revizija
5502-A,path/a.svg,A
5502-A,path/b.svg,A`;
    const p = parsirajEntitetCsv(csv, {
      ...CRTEZI_CFG,
      upsert_strategija: "ref_lookup",
      lookup_polja: ["ref_tip", "ref_id", "revizija"],
    });
    expect(p.validnih).toBe(1);
    expect(p.greske.some((g) => g.includes("Duplikat"))).toBe(true);
  });
});
