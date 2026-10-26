import { describe, it, expect } from "vitest";
import {
  prefiksDeoIzIdDeo,
  brojeviPaketaIzRednog,
  brojeviPaketaIzBroj8d,
  oznaka8d,
  OTVORENI_8D,
} from "../src/lib/osmdBrojevi.js";
import { opis8dZaListu } from "../src/lib/osmdStruktura.js";
import { prefillPfmeaCpIz8d } from "../src/lib/osmdPfmeaCpBridge.js";
import { ZAGLAVLJE_8D_KLJUCEVI } from "../src/lib/osmdZaglavlje.js";

describe("osmdBrojevi", () => {
  it("prefiks iz ID dela", () => {
    expect(prefiksDeoIzIdDeo("HAM-NM-001")).toBe("NM");
    expect(prefiksDeoIzIdDeo("NM-001")).toBe("NM");
  });

  it("generiše usklađen paket brojeva", () => {
    expect(brojeviPaketaIzRednog("NM", 4)).toEqual({
      broj_8d: "8D-NM-004",
      broj_pfmea: "PFMEA-NM-004",
      broj_control_plan: "CP-NM-004",
    });
  });

  it("iz postojećeg 8D broja", () => {
    expect(brojeviPaketaIzBroj8d("8D-NME-004")).toEqual({
      broj_8d: "8D-NME-004",
      broj_pfmea: "PFMEA-NME-004",
      broj_control_plan: "CP-NME-004",
    });
  });
});

describe("otvoreni 8D", () => {
  it("broji u_izradi, ne završen", () => {
    expect(OTVORENI_8D).toEqual(expect.arrayContaining(["u_izradi", "u_toku", "otvoren", "ceka"]));
    expect(OTVORENI_8D).not.toContain("zavrsen");
  });
});

describe("oznaka i opis 8D", () => {
  it("ne ponavlja prefiks 8D", () => {
    expect(oznaka8d("8D-NM-002")).toBe("8D-NM-002");
    expect(oznaka8d("12")).toBe("8D 12");
    expect(oznaka8d("", 9)).toBe("8D #9");
  });

  it("prikazuje ceo opis, i iz JSON D2", () => {
    const dugi = "Otvoreno automatski: 3 NOK uzastopna na poz. FUNKCIONALNE ZONE I PODVOZJE · smena 1";
    expect(opis8dZaListu(dugi)).toBe(dugi);
    expect(opis8dZaListu(JSON.stringify({ _fmt: 3, inicijalni: "Pukotina zavara", sta: "HAZ" }))).toBe("Pukotina zavara — HAZ");
  });

  it("u CP ne lepi 8D ispred broja koji ga već ima", () => {
    const prefill = prefillPfmeaCpIz8d({
      id_deo: "NM-001",
      broj_8d: "8D-NM-002",
      defekt_nedostatak: "Pukotina",
    });
    expect(prefill.controlPlan.redovi[0].zapis_forma).toBe("8D-NM-002");
    expect(prefill.napomena.startsWith("Preneto iz 8D-NM-002")).toBe(true);
  });
});

describe("prefillPfmeaCpIz8d brojevi", () => {
  it("prenosi broj PFMEA i CP u stavke", () => {
    const prefill = prefillPfmeaCpIz8d({
      id_deo: "NM-001",
      broj_8d: "8D-NM-007",
      broj_pfmea: "PFMEA-NM-007",
      broj_control_plan: "CP-NM-007",
      defekt_nedostatak: "Pukotina",
      d4_uzrok: "Uzrok test",
    });
    expect(prefill.brojPfmea).toBe("PFMEA-NM-007");
    expect(prefill.brojControlPlan).toBe("CP-NM-007");
    expect(prefill.pfmea.redovi[0].pfmea_veza).toBe("PFMEA-NM-007");
    expect(prefill.pfmea.redovi[0].control_plan_ref).toBe("CP-NM-007");
    expect(prefill.controlPlan.redovi[0].pfmea_referenca).toBe("PFMEA-NM-007");
    expect(prefill.controlPlan.redovi[0].zapis_forma).toBe("CP-NM-007");
  });
});

describe("ZAGLAVLJE_8D polja", () => {
  it("uključuje broj PFMEA i CP posle 8D", () => {
    expect(ZAGLAVLJE_8D_KLJUCEVI.indexOf("broj_8d")).toBe(0);
    expect(ZAGLAVLJE_8D_KLJUCEVI.indexOf("broj_pfmea")).toBe(1);
    expect(ZAGLAVLJE_8D_KLJUCEVI.indexOf("broj_control_plan")).toBe(2);
  });
});
