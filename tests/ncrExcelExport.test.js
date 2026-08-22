import { describe, it, expect } from "vitest";

import {

  REGISTAR_EXCEL_HEADERS,

  ncrRedZaRegistarExcel,

  gruppisiNcrPoPogonu,

  imeNcrExcelFajla,

  isoToExcelSerial,

  buildNcrRegistarMasterWorkbook,

  buildNcrObrazacTemplateWorkbook,

  buildNcrPojedinacniObrazacWorkbook,

  linkKaNcrObrazcuExcel,

} from "../src/lib/ncrExcelExport.js";

import {

  NCR_REGISTAR_MASTER,

  NCR_OBRAZAC_TEMPLATE,

  FOLDER_NCR_OBRASCI,

} from "../src/lib/kvalitetFolderStruktura.js";



describe("ncrExcelExport", () => {

  it("REGISTAR_EXCEL_HEADERS ima 40 kolona (39 + Link ka fajlu)", () => {

    expect(REGISTAR_EXCEL_HEADERS).toHaveLength(40);

    expect(REGISTAR_EXCEL_HEADERS.at(-1)).toBe("Link ka fajlu");

  });



  it("mapira NCR red u Excel registar sa linkom", () => {

    const red = ncrRedZaRegistarExcel({

      broj_ncr: "NCR-2026-0001",

      datum_otvaranja: "2026-03-15",

      pogon: "Karoserija",

      id_deo: "MRAP-001",

      opis: "Test",

      ozbiljnost: "High",

      status: "open",

    });

    expect(red[0]).toBe("NCR-2026-0001");

    expect(red[2]).toBe("Karoserija");

    expect(red[34]).toBe("OTVOREN");

    expect(red.at(-1)).toBe(`${FOLDER_NCR_OBRASCI}/NCR-2026-0001.xlsx`);

  });



  it("grupiše po pogonu", () => {

    const g = gruppisiNcrPoPogonu([

      { pogon: "A", id: 1 },

      { pogon: "B", id: 2 },

      { pogon: "A", id: 3 },

    ]);

    expect(g.get("A")).toHaveLength(2);

  });



  it("master i template imena", () => {

    expect(imeNcrExcelFajla()).toBe(NCR_REGISTAR_MASTER);

    expect(NCR_REGISTAR_MASTER).toBe("NCR_Registar_Master.xlsx");

    expect(NCR_OBRAZAC_TEMPLATE).toBe("A4_NCR_Obrazac_Template.xlsx");

  });



  it("link ka pojedinačnom obrascu", () => {

    expect(linkKaNcrObrazcuExcel("NCR-2026-003")).toBe(`${FOLDER_NCR_OBRASCI}/NCR-2026-003.xlsx`);

  });



  it("master workbook ima Dashboard, Registar, Uputstvo (bez Obrazac lista)", () => {

    const wb = buildNcrRegistarMasterWorkbook({

      lista: [{ broj_ncr: "NCR-1", pogon: "Karoserija", opis: "x", id_deo: "D1", status: "open" }],

    });

    expect(wb.SheetNames).toContain("Dashboard");

    expect(wb.SheetNames).toContain("Registar");

    expect(wb.SheetNames).toContain("Uputstvo");

    expect(wb.SheetNames).not.toContain("Obrazac");

  });



  it("template i pojedinačni obrazac imaju Obrazac list", () => {

    const tpl = buildNcrObrazacTemplateWorkbook();

    expect(tpl.SheetNames).toEqual(["Obrazac"]);



    const poj = buildNcrPojedinacniObrazacWorkbook({ broj_ncr: "NCR-2026-001" });

    expect(poj.SheetNames).toEqual(["Obrazac"]);

  });

});

