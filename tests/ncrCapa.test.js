import { describe, it, expect } from "vitest";
import {
  validirajNcrPayload,
  dozvoljeniNcrStatusi,
  prefill8dIzNcr,
  NCR_STATUS_REDO,
} from "../src/lib/ncrCapa.js";
import { prefillNcrIzUnosaLinije, ncrPoljeOptsLinija, NCR_STATUS_LINija, NCR_SEKCIJE_LINija } from "../src/lib/ncrObrazacPolja.js";

describe("validirajNcrPayload", () => {
  it("zahteva id_deo, opis i pogon", () => {
    const r = validirajNcrPayload({ id_deo: "", opis: "", pogon: "" });
    expect(r.ok).toBe(false);
    expect(r.greske.id_deo).toBeTruthy();
    expect(r.greske.opis).toBeTruthy();
    expect(r.greske.pogon).toBeTruthy();
  });

  it("normalizuje id_deo", () => {
    const r = validirajNcrPayload({
      id_deo: " mrap-001 ",
      opis: "Test",
      pogon: "P1",
      datum_otvaranja: "2026-01-01",
      ozbiljnost: "Medium",
    });
    expect(r.ok).toBe(true);
    expect(r.id_deo).toBe("MRAP-001");
  });
});

describe("dozvoljeniNcrStatusi", () => {
  it("nudi sledeći korak i zatvaranje", () => {
    expect(dozvoljeniNcrStatusi("open")).toEqual(["containment", "closed"]);
    expect(dozvoljeniNcrStatusi("containment")).toEqual(["open", "disposition", "closed"]);
  });

  it("nudi ponovno otvaranje iz zatvorenog", () => {
    expect(dozvoljeniNcrStatusi("closed")).toEqual(["verification", "open"]);
  });
});

describe("prefill8dIzNcr", () => {
  it("mapira NCR u 8D prefill", () => {
    const p = prefill8dIzNcr({
      id: 5,
      id_deo: "MRAP-001",
      broj_ncr: "NCR-2026-0001",
      opis: "Pukotina",
      uzrok: "Alat",
      korektivna: "Zamena",
      verifikacija: "OK posle 10 kom",
    });
    expect(p.id_deo).toBe("MRAP-001");
    expect(p.ncr_id).toBe(5);
    expect(p.d2_opis_problema).toBe("Pukotina");
    expect(p.broj_reklamacije).toBe("NCR-2026-0001");
    expect(p.d4_uzrok).toBe("Alat");
  });
});

describe("poveziOsmd", () => {
  it("ažurira ncr_capa sa osmd_id", async () => {
    const updates = [];
    const supabase = {
      from: () => ({
        update: (patch) => {
          updates.push(patch);
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({ data: { id: 5, osmd_id: 99, ...patch }, error: null }),
              }),
            }),
          };
        },
      }),
    };
    const { poveziOsmd } = await import("../src/lib/ncrCapa.js");
    const row = await poveziOsmd(supabase, 5, 99);
    expect(row.osmd_id).toBe(99);
    expect(updates[0].osmd_id).toBe(99);
  });

  it("vraća null bez id-jeva", async () => {
    const { poveziOsmd } = await import("../src/lib/ncrCapa.js");
    expect(await poveziOsmd({}, null, 1)).toBeNull();
    expect(await poveziOsmd({}, 1, null)).toBeNull();
  });
});

describe("NCR_STATUS_REDO", () => {
  it("ima 6 koraka (Excel workflow)", () => {
    expect(NCR_STATUS_REDO).toHaveLength(6);
  });
});

describe("prefillNcrIzUnosaLinije", () => {
  it("puní kontekst sa linije bez automatskog popunjavanja linije", () => {
    const f = prefillNcrIzUnosaLinije({
      id_deo: "abc-1",
      linija: "Debljina lima",
      pogon: "C",
      status: "NOK",
      kategorija: "Dimenzija",
      karakteristika: "Debljina lima",
      modul: "atributivne",
    });
    expect(f.id_deo).toBe("ABC-1");
    expect(f.pogon).toBe("C");
    expect(f.linija).toBe("");
    expect(f.karakteristika).toBe("Debljina lima");
    expect(f.izvor).toBe("unos_linija");
    expect(f.prioritet).toBe("visok");
    expect(f.metoda_detekcije).toContain("Atributivna");
    expect(f.status).toBe(NCR_STATUS_LINija);
  });
});

describe("ncrPoljeOptsLinija", () => {
  it("zaključava status i sekcije E–H na liniji", () => {
    expect(ncrPoljeOptsLinija("A", { tip: "status" }).readOnly).toBe(true);
    expect(ncrPoljeOptsLinija("D", { tip: "textarea" }).readOnly).toBeFalsy();
    expect(ncrPoljeOptsLinija("E", {}).readOnly).toBe(true);
    expect(NCR_SEKCIJE_LINija.has("C")).toBe(true);
    expect(NCR_SEKCIJE_LINija.has("H")).toBe(false);
  });
});
