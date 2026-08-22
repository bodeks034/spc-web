import { describe, it, expect } from "vitest";

import {

  labelStatusaExcel,

  jeNcr8dAlarmRed,

  COL_STATUS,

  COL_8D,

  REGISTAR_DATA_START_ROW,

  NCR_EXCEL_HEADER_RGB,

  NCR_EXCEL_DATE_FMT,

  COL_DATUM_OTVARANJA,

  postaviExcelDatumCeliju,

} from "../src/lib/ncrRegistarExcelStil.js";

import { isoToExcelSerial, buildNcrRegistarMasterWorkbook, buildNcrObrazacTemplateWorkbook, buildNcrPojedinacniObrazacWorkbook, REGISTAR_EXCEL_HEADERS } from "../src/lib/ncrExcelExport.js";
import { EXCEL_HEADER_PLAVA } from "../src/lib/excelStil.js";
import XLSX from "xlsx-js-style";



describe("ncrRegistarExcelStil", () => {

  it("mapira status u ZATVOREN / OTVOREN", () => {

    expect(labelStatusaExcel("closed")).toBe("ZATVOREN");

    expect(labelStatusaExcel("open")).toBe("OTVOREN");

    expect(labelStatusaExcel("containment")).toBe("CONTAINMENT");

  });



  it("8D alarm samo kad je ponavljanje DA i 8D pokrenut", () => {

    expect(jeNcr8dAlarmRed({ ponavljanje: "DA", osmd_pokrenut: true })).toBe(true);

    expect(jeNcr8dAlarmRed({ ponavljanje: "NE", osmd_pokrenut: true })).toBe(false);

  });



  it("master registar ima hyperlink i stil na status koloni", () => {

    const wb = buildNcrRegistarMasterWorkbook({

      lista: [{

        broj_ncr: "NCR-2026-0099",

        pogon: "Karoserija",

        opis: "Test",

        id_deo: "D1",

        status: "open",

        ponavljanje: "DA",

        osmd_pokrenut: true,

      }],

    });

    const ws = wb.Sheets.Registar;

    const statusCell = ws[XLSX.utils.encode_cell({ r: REGISTAR_DATA_START_ROW, c: COL_STATUS })];

    expect(statusCell?.v).toBe("OTVOREN");



    const linkCol = REGISTAR_EXCEL_HEADERS.length - 1;

    const linkCell = ws[XLSX.utils.encode_cell({ r: REGISTAR_DATA_START_ROW, c: linkCol })];

    expect(linkCell?.f || linkCell?.l?.Target).toBeTruthy();



    const osmdCell = ws[XLSX.utils.encode_cell({ r: REGISTAR_DATA_START_ROW, c: COL_8D })];

    expect(osmdCell?.s?.fill?.fgColor?.rgb).toBe("FF4444");

  });



  it("koristi industrijsku plavu za header", () => {

    expect(NCR_EXCEL_HEADER_RGB).toBe(EXCEL_HEADER_PLAVA);

  });



  it("obrazac ima plave sekcije i label polja", () => {

    const wb = buildNcrObrazacTemplateWorkbook();

    const ws = wb.Sheets.Obrazac;

    let sekcija = null;

    for (const addr of Object.keys(ws)) {

      if (addr.startsWith("!")) continue;

      if (String(ws[addr]?.v || "").startsWith("A. OSNOVNI")) {

        sekcija = ws[addr];

        break;

      }

    }

    expect(sekcija?.s?.fill?.fgColor?.rgb).toBe(EXCEL_HEADER_PLAVA);

    const label = ws.B5 || ws.A5;

    expect(label?.s?.fill?.fgColor?.rgb).toBeTruthy();

  });



  it("registar i obrazac formatiraju datume kao dd.mm.yyyy", () => {

    const wb = buildNcrRegistarMasterWorkbook({

      lista: [{

        broj_ncr: "NCR-2026-0099",

        datum_otvaranja: "2026-03-15",

        pogon: "Karoserija",

        opis: "Test",

        id_deo: "D1",

        status: "open",

      }],

    });

    const regCell = wb.Sheets.Registar[XLSX.utils.encode_cell({

      r: REGISTAR_DATA_START_ROW,

      c: COL_DATUM_OTVARANJA,

    })];

    expect(regCell?.v).toBe(isoToExcelSerial("2026-03-15"));

    expect(regCell?.z).toBe(NCR_EXCEL_DATE_FMT);



    const obrazac = buildNcrPojedinacniObrazacWorkbook({

      broj_ncr: "NCR-2026-0001",

      datum_otvaranja: "2026-04-20",

    });

    const ws = obrazac.Sheets.Obrazac;

    let datumCell = null;

    for (const addr of Object.keys(ws)) {

      if (addr.startsWith("!")) continue;

      const cell = ws[addr];

      if (cell?.v === isoToExcelSerial("2026-04-20")) {

        datumCell = cell;

        break;

      }

    }

    expect(datumCell?.z).toBe(NCR_EXCEL_DATE_FMT);

    const testCell = { v: 45000, t: "n" };

    postaviExcelDatumCeliju(testCell);

    expect(testCell.z).toBe(NCR_EXCEL_DATE_FMT);

  });

});

