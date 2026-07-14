import { describe, it, expect } from "vitest";
import { izracunajMomentPct, ucitajShopFloorStatus } from "../src/lib/shopFloorStatus.js";
import { izracunajFpyIzDash, bojaFpyKpi } from "../src/lib/sefSmenaDashboard.js";
import { AUTO_PRAGOVI } from "../src/lib/autoAkcije.js";

const C = {
  sivi: "#888",
  zelena: "#0f0",
  zuta: "#ff0",
  crvena: "#f00",
};

describe("izracunajMomentPct", () => {
  it("računa procenat OK", () => {
    expect(izracunajMomentPct(95, 5)).toBe(95);
    expect(izracunajMomentPct(0, 0)).toBeNull();
  });
});

describe("izracunajFpyIzDash", () => {
  it("kombinuje atributivne i merljive", () => {
    const fpy = izracunajFpyIzDash({ ukN: 100, ukNOK: 5 }, { merenja: 50, nok: 5 });
    expect(fpy).toBe(93.3);
  });

  it("vraća null bez uzoraka", () => {
    expect(izracunajFpyIzDash({}, {})).toBeNull();
  });
});

describe("bojaFpyKpi", () => {
  it("boji po pragovima", () => {
    expect(bojaFpyKpi(null, C)).toBe(C.sivi);
    expect(bojaFpyKpi(99, C)).toBe(C.zelena);
    expect(bojaFpyKpi(96, C)).toBe(C.zuta);
    expect(bojaFpyKpi(90, C)).toBe(C.crvena);
  });
});

describe("ucitajShopFloorStatus — NOK streak", () => {
  it("računa uzastopne NOK za merljive", async () => {
    const chainEnd = (data) => ({
      eq: () => Promise.resolve({ data, error: null }),
      order: () => ({ limit: () => Promise.resolve({ data, error: null }) }),
      limit: () => Promise.resolve({ data, error: null }),
    });
    const supabase = {
      from(table) {
        if (table === "merenja_varijabilna") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({
                      data: [
                        { status: "NOK", pozicija: "12", created_at: "t3" },
                        { status: "NOK", pozicija: "12", created_at: "t2" },
                        { status: "NOK", pozicija: "12", created_at: "t1" },
                        { status: "OK", pozicija: "12", created_at: "t0" },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "spc_alarmi") {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({
                    limit: () => ({
                      eq: () => Promise.resolve({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "moment_protokol") {
          return { select: () => ({ eq: () => chainEnd([]) }) };
        }
        if (table === "ncr_capa") {
          return {
            select: () => ({
              not: () => ({
                order: () => ({
                  limit: () => ({
                    eq: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "erp_uvoz_log") {
          return { select: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) };
        }
        return { select: () => chainEnd([]) };
      },
    };
    const r = await ucitajShopFloorStatus(supabase, { idDeo: "TEST-01", modul: "merljive" });
    expect(r.nokUzastopna).toBe(3);
    expect(r.pragPauze).toBe(AUTO_PRAGOVI.nokUzastopnaEskalacija);
    expect(r.nokPozicija).toBe("12");
  });
});
