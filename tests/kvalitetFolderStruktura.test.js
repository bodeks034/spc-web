import { describe, it, expect } from "vitest";

import {

  imeProcesFoldera,

  imePfmeaExcela,

  imeControlPlanExcela,

  ime8dDocx,

  NCR_REGISTAR_MASTER,

  NCR_OBRAZAC_TEMPLATE,

  FOLDER_NCR,

  FOLDER_NCR_OBRASCI,

  FOLDER_8D,

  FOLDER_INZ,

  PODRAZUMEVANI_PROCESI,

  spojiPogoneZaStrukturu,

  strukturaDrvo,

  putanjaOperativaPdf,

  putanjaKvalitetFajla,

  FOLDER_KUPAC,

  ime8dWordFajla,

  imeNcrObrazacFajla,
  imeNcrObrazacPdf,
  putanjaNcrObrazacExcel,
  putanjaNcrObrazacPdf,
} from "../src/lib/kvalitetFolderStruktura.js";



describe("kvalitetFolderStruktura", () => {

  it("definiše NCR_KVALITET strukturu", () => {

    expect(FOLDER_NCR).toBe("NCR_KVALITET");

    expect(FOLDER_NCR_OBRASCI).toBe("Pojedinacni_Obrasci");

    expect(FOLDER_8D).toBe("02_8D_Izvestaji");

    expect(FOLDER_INZ).toBe("03_Inzenjering_Kvaliteta");

    expect(NCR_REGISTAR_MASTER).toBe("NCR_Registar_Master.xlsx");

    expect(NCR_OBRAZAC_TEMPLATE).toBe("A4_NCR_Obrazac_Template.xlsx");

  });



  it("generiše ime i putanju pojedinačnog NCR obrasca", () => {

    expect(imeNcrObrazacFajla("NCR-2026-001")).toBe("NCR-2026-001.xlsx");

    expect(imeNcrObrazacPdf("NCR-2026-001")).toBe("NCR-2026-001.pdf");

    expect(putanjaNcrObrazacExcel("NCR-2026-001")).toBe("Pojedinacni_Obrasci/NCR-2026-001.xlsx");

    expect(putanjaNcrObrazacPdf("NCR-2026-001")).toBe("NCR_KVALITET/Pojedinacni_Obrasci/NCR-2026-001.pdf");

  });



  it("mapira pogon u Proces_* folder", () => {

    expect(imeProcesFoldera("Karoserija")).toBe("Proces_Karoserija");

    expect(imeProcesFoldera("CNC Obrada")).toBe("Proces_CNC_Obrada");

  });



  it("generiše PFMEA i CP imena po pogonu", () => {

    expect(imePfmeaExcela("Zavarivanje")).toBe("PFMEA_Zavarivanje.xlsx");

    expect(imeControlPlanExcela("Montaza")).toBe("Control_Plan_Montaza.xlsx");

  });



  it("generiše 8D docx ime", () => {

    expect(ime8dDocx({ broj_8d: "001", opis: "Reklamacija Kupca", godina: 2026 }))

      .toMatch(/^8D_2026_001_/);

  });



  it("spaja podrazumevane procese sa pogonskim iz baze", () => {

    const svi = spojiPogoneZaStrukturu(["Test_Pogon"]);

    expect(svi).toContain("Karoserija");

    expect(svi).toContain("Test_Pogon");

    expect(svi.length).toBe(PODRAZUMEVANI_PROCESI.length + 1);

  });



  it("gradi stablo za UI", () => {

    const drvo = strukturaDrvo(["Montaza"]);

    expect(drvo.root).toBe("KONTROLA_KVALITETA");

    expect(drvo.grane.length).toBeGreaterThanOrEqual(6);

    expect(drvo.grane.some((g) => g.id === "kupac")).toBe(true);

    expect(drvo.grane.some((g) => g.id === "dobavljac")).toBe(true);

    expect(drvo.grane.some((g) => g.id === "operativa")).toBe(true);

    expect(drvo.grane.find((g) => g.id === "inz")?.deca.some((d) => d.pogon === "Montaza")).toBe(true);

    const ncrGrana = drvo.grane.find((g) => g.id === "ncr");

    expect(ncrGrana?.podfolder).toBe(FOLDER_NCR_OBRASCI);

  });



  it("generiše putanje za operativne i kupac PDF", () => {

    expect(putanjaKvalitetFajla(FOLDER_KUPAC, "test.pdf")).toContain("04_Izvestaji_Kupci");

    expect(putanjaOperativaPdf("smena", "smena.pdf")).toContain("06_Operativni_Izvestaji/Smena");

  });



  it("generiše ime 8D Word fajla (.doc)", () => {

    expect(ime8dWordFajla({ broj_8d: "004", d2_opis_problema: "Test" }))

      .toMatch(/^8D_\d{4}_004_Test\.doc$/);

  });

});

