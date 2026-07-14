import { describe, it, expect } from "vitest";
import {
  validirajNcrPayload,
  dozvoljeniNcrStatusi,
  prefill8dIzNcr,
  NCR_STATUS_REDO,
} from "../src/lib/ncrCapa.js";

describe("validirajNcrPayload", () => {
  it("zahteva id_deo i opis", () => {
    const r = validirajNcrPayload({ id_deo: "", opis: "" });
    expect(r.ok).toBe(false);
    expect(r.greske.id_deo).toBeTruthy();
    expect(r.greske.opis).toBeTruthy();
  });

  it("normalizuje id_deo", () => {
    const r = validirajNcrPayload({ id_deo: " mrap-001 ", opis: "Test" });
    expect(r.ok).toBe(true);
    expect(r.id_deo).toBe("MRAP-001");
  });
});

describe("dozvoljeniNcrStatusi", () => {
  it("nudi sledeći korak i zatvaranje", () => {
    expect(dozvoljeniNcrStatusi("otvoren")).toEqual(["analiza", "zatvoren"]);
    expect(dozvoljeniNcrStatusi("analiza")).toEqual(["otvoren", "akcija", "zatvoren"]);
  });

  it("nudi ponovno otvaranje iz zatvorenog", () => {
    expect(dozvoljeniNcrStatusi("zatvoren")).toEqual(["verifikacija", "otvoren"]);
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
  it("ima 5 koraka", () => {
    expect(NCR_STATUS_REDO).toHaveLength(5);
  });
});
