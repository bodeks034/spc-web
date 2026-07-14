import { describe, it, expect } from "vitest";
import { mapCsvRed, parsirajEntitetCsv } from "../src/lib/erpUvozCore.js";

describe("ERP praksa — delovi", () => {
  const cfg = {
    tabela: "delovi",
    obavezna_polja: ["id_deo", "naziv_dela"],
    kolone: {
      id_deo: { iz: ["id_deo"], transform: "upper" },
      naziv_dela: { iz: ["naziv_dela"] },
      pogon_kod: { iz: ["pogon_kod"], transform: "upper" },
      radni_nalog: { iz: ["radni_nalog"], transform: "upper" },
    },
  };

  it("ne šalje pogon_kod u tabelu delovi — sync u delovi_atributivni_pogon", () => {
    const r = mapCsvRed(
      { _linija: 2, id_deo: "5501-a", naziv_dela: "Nosač", pogon_kod: "b", radni_nalog: "rn-001-b" },
      cfg,
    );
    expect(r.ok).toBe(true);
    expect(r.row.id_deo).toBe("5501-A");
    expect(r.row.pogon_kod).toBeUndefined();
    expect(r.row.radni_nalog).toBeUndefined();
    expect(r.row._sync_pogon_kod).toBe("B");
    expect(r.row._sync_radni_nalog).toBe("RN-001-B");
  });
});

describe("ERP praksa — greske_katalog", () => {
  const cfg = {
    tabela: "greske_katalog",
    obavezna_polja: ["kategorija", "podkategorija"],
    kolone: {
      kategorija: { iz: ["kategorija"] },
      podkategorija: { iz: ["podkategorija"] },
      defekt: { iz: ["defekt"] },
      id_deo: { iz: ["id_deo"], transform: "upper" },
    },
  };

  it("podrazumeva defekt iz podkategorije", () => {
    const r = mapCsvRed(
      { _linija: 2, kategorija: "Vizuelno", podkategorija: "Lak" },
      cfg,
    );
    expect(r.ok).toBe(true);
    expect(r.row.defekt).toBe("Lak");
  });
});

describe("ERP praksa — kalibracije", () => {
  const cfg = {
    tabela: "kalibracije",
    obavezna_polja: ["datum_kal"],
    kolone: {
      datum_kal: { iz: ["datum_kal"], transform: "datum" },
      sledeca_kal: { iz: ["sledeca_kal"], transform: "datum" },
    },
  };

  it("zahteva referencu na merilo", () => {
    const r = mapCsvRed(
      { _linija: 2, datum_kal: "2025-01-15" },
      cfg,
    );
    expect(r.ok).toBe(false);
    expect(r.greska).toMatch(/merilo/i);
  });

  it("mapira serijski broj merila", () => {
    const r = mapCsvRed(
      { _linija: 2, serijski_broj: "SB-001", datum_kal: "15.01.2025" },
      cfg,
    );
    expect(r.ok).toBe(true);
    expect(r.row._merilo_serijski).toBe("SB-001");
    expect(r.row.datum_kal).toBe("2025-01-15");
  });
});

describe("ERP praksa — karakteristike_merljive", () => {
  const cfg = {
    mapiranje: "karakteristike_merljive",
    obavezna_polja: ["id_deo", "pozicija"],
    kolone: {},
  };

  it("normalizuje dimenziju iz CSV", () => {
    const csv = `id_deo,pogon_kod,pozicija,sifra_merenja,nominala,usl,lsl,jedinica
5502-a,A,D1,D1,10,10.2,9.8,mm`;
    const p = parsirajEntitetCsv(csv, {
      ...cfg,
      upsert_strategija: "karakteristike_merljive",
      upsert_kljuc: "id_deo,pogon_kod,sifra_merenja,pozicija",
    });
    expect(p.validnih).toBe(1);
    expect(p.redovi[0].id_deo).toBe("5502-A");
    expect(p.redovi[0].pogon_kod).toBe("A");
    expect(p.redovi[0].pozicija).toBe("D1");
  });
});
