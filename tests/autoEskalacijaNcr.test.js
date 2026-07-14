import { describe, it, expect, vi } from "vitest";
import { jeAutoObavestenje } from "../src/lib/autoObavestenja.js";
import { zatvoriEskalacijeZaNcr, zatvoriSpcAlarmeZaNcr, posleZatvaranjaNcr } from "../src/lib/eskalacijeHelper.js";

const mockObavestiNcr = vi.hoisted(() => vi.fn().mockResolvedValue({ ok: true }));

vi.mock("../src/lib/spcAlarmWorkflow.js", () => ({
  zatvoriSpcAlarmSistemski: vi.fn(async (_s, id) => ({ id })),
}));

vi.mock("../src/lib/autoAkcije.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, obavestiNcrZatvoren: (...args) => mockObavestiNcr(...args) };
});

describe("jeAutoObavestenje", () => {
  it("prepoznaje auto ID prefikse", () => {
    expect(jeAutoObavestenje({ id: "auto_nok3_NM-001_2026-07-09" })).toBe(true);
    expect(jeAutoObavestenje({ id: "ncr_rok_12" })).toBe(true);
    expect(jeAutoObavestenje({ id: "ncr_bez_8d_5" })).toBe(true);
    expect(jeAutoObavestenje({ id: "auto_ncr_zatvoren_12" })).toBe(true);
    expect(jeAutoObavestenje({ id: "alarm_visok_1" })).toBe(false);
  });
});

describe("zatvoriEskalacijeZaNcr", () => {
  it("zatvara povezanu eskalaciju", async () => {
    const supabase = {
      from(table) {
        if (table === "eskalacije") {
          return {
            update: () => ({
              eq: () => ({
                in: () => ({
                  select: () => ({
                    maybeSingle: () => Promise.resolve({
                      data: { id: 42, opis: "AUTO-NOK", status: "zatvoren" },
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
      },
    };
    const rez = await zatvoriEskalacijeZaNcr(supabase, {
      id: 1,
      status: "zatvoren",
      eskalacija_id: 42,
    });
    expect(rez.zatvoreno).toEqual([42]);
  });

  it("ne radi ako NCR nije zatvoren", async () => {
    const supabase = { from: () => { throw new Error("ne sme"); } };
    const rez = await zatvoriEskalacijeZaNcr(supabase, { id: 1, status: "otvoren" });
    expect(rez.zatvoreno).toEqual([]);
  });
});

describe("zatvoriSpcAlarmeZaNcr", () => {
  it("zatvara SPC alarm povezan sa NCR-om", async () => {
    const supabase = {
      from(table) {
        if (table === "spc_alarmi") {
          return {
            select: () => ({
              eq: () => ({
                in: () => Promise.resolve({ data: [] }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
      },
    };
    const rez = await zatvoriSpcAlarmeZaNcr(supabase, {
      id: 1,
      status: "zatvoren",
      broj_ncr: "NCR-001",
      spc_alarm_id: 99,
    });
    expect(rez.zatvoreno).toEqual([99]);
  });
});

describe("posleZatvaranjaNcr", () => {
  it("poziva obaveštenje posle zatvaranja", async () => {
    mockObavestiNcr.mockClear();
    const supabase = {
      from(table) {
        if (table === "eskalacije") {
          return {
            update: () => ({
              eq: () => ({
                in: () => ({
                  select: () => ({
                    maybeSingle: () => Promise.resolve({ data: null, error: null }),
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
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
                in: () => Promise.resolve({ data: [] }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        };
      },
    };

    const rez = await posleZatvaranjaNcr(supabase, {
      id: 5,
      status: "zatvoren",
      broj_ncr: "NCR-TEST",
      id_deo: "X",
      spc_alarm_id: 99,
    });
    expect(rez.spcAlarmi).toEqual([99]);
    expect(mockObavestiNcr).toHaveBeenCalledOnce();
  });
});
