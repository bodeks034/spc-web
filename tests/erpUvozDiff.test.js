import { describe, it, expect } from "vitest";

import {

  parsirajErpUvozDetalj,

  sumirajErpUvozLog,

  sastaviErpDiffSažetak,

  logJeDanas,

} from "../src/lib/erpUvozDiff.js";

import { deloviPoPogonu, predloziDelovaZaTablet } from "../src/lib/linijaDeoMapa.js";



describe("erpUvozDiff", () => {

  it("parsira uspešne i neuspešne stavke", () => {

    const detalj = [

      "✓ delovi: delovi.csv — upsert 12 (10/10)",

      "✗ greske_katalog: duplicate key",

      "— kupci: preskočeno",

      "⏳ radni_nalozi: fajl premlad",

      "⚠ merila: nema validnih redova",

    ].join("\n");

    const stavke = parsirajErpUvozDetalj(detalj);

    expect(stavke).toHaveLength(5);

    expect(stavke[0]).toMatchObject({ uspeh: true, entitet: "delovi", upsertovano: 12, promenjeno: true });

    expect(stavke[1]).toMatchObject({ greska: true, entitet: "greske_katalog" });

    expect(stavke[3]).toMatchObject({ ceka: true, entitet: "radni_nalozi" });

    expect(stavke[4]).toMatchObject({ upozorenje: true });

  });



  it("sumirajErpUvozLog dodaje brojače i promene", () => {

    const log = {

      uspeh: true,

      detalj: "✓ delovi: delovi.csv — upsert 5 (5/5)\n✗ rn: fail",

      upsertovano: 5,

      validnih: 5,

      created_at: new Date().toISOString(),

    };

    const s = sumirajErpUvozLog(log);

    expect(s.uspesnih).toBe(1);

    expect(s.gresaka).toBe(1);

    expect(s.ukupnoUpsert).toBe(5);

    expect(s.promene).toHaveLength(1);

  });



  it("sastaviErpDiffSažetak za inženjera", () => {

    const trenutni = sumirajErpUvozLog({

      uspeh: true,

      detalj: "✓ delovi: delovi.csv — upsert 3 (3/3)\n✓ greske_katalog: greske.csv — upsert 1 (1/1)",

      created_at: new Date().toISOString(),

    });

    const s = sastaviErpDiffSažetak(trenutni);

    expect(s.promene.length).toBe(2);

    expect(s.redovi[0]).toContain("Upsert-ovano");

  });



  it("logJeDanas", () => {

    expect(logJeDanas({ created_at: new Date().toISOString() })).toBe(true);

    expect(logJeDanas({ created_at: "2020-01-01T10:00:00Z" })).toBe(false);

  });



  it("vraća null za prazan log", () => {

    expect(sumirajErpUvozLog(null)).toBeNull();

  });

});



describe("linijaDeoMapa", () => {

  const pogoni = [

    { id_deo: "A1", naziv_dela: "Deo A1", pogon_kod: "A" },

    { id_deo: "A2", naziv_dela: "Deo A2", pogon_kod: "A" },

    { id_deo: "B1", naziv_dela: "Deo B1", pogon_kod: "B" },

  ];



  it("deloviPoPogonu filtrira po pogon_kod", () => {

    const a = deloviPoPogonu(pogoni, "A");

    expect(a).toHaveLength(2);

    expect(a.map((d) => d.id_deo)).toEqual(["A1", "A2"]);

  });



  it("predloziDelovaZaTablet po pogonu", () => {

    const p = predloziDelovaZaTablet({ atributivniPogoni: pogoni, pogonKod: "B" });

    expect(p).toHaveLength(1);

    expect(p[0].id_deo).toBe("B1");

  });

});

