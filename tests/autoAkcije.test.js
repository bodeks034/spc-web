import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  AUTO_PRAGOVI,
  proveriUzastopniNokIAktiviraj,
} from "../src/lib/autoAkcije.js";
import { brojUzastopnihNok } from "../src/lib/kontekstualniVodic.js";

describe("brojUzastopnihNok", () => {
  it("broji uzastopne NOK na istoj poziciji (najnoviji prvi)", () => {
    const redovi = [
      { status: "NOK", pozicija: "P1" },
      { status: "NOK", pozicija: "P1" },
      { status: "NOK", pozicija: "P1" },
      { status: "OK", pozicija: "P1" },
    ];
    expect(brojUzastopnihNok(redovi, "pozicija").max).toBe(3);
  });
});

function builder(data, terminal = "limit") {
  const self = {
    eq: () => self,
    in: () => self,
    not: () => self,
    lt: () => self,
    ilike: () => self,
    gte: () => self,
    like: () => self,
    order: () => self,
    limit: () => Promise.resolve({ data }),
    maybeSingle: () => Promise.resolve({ data: data?.[0] || null }),
    single: () => Promise.resolve({ data: data?.[0] || null, error: null }),
    select: () => self,
  };
  if (terminal === "await") return Promise.resolve({ data });
  return self;
}

function mockSupabase(logRows) {
  return {
    from(table) {
      if (table === "merenja_varijabilna") {
        return { select: () => builder(logRows) };
      }
      if (table === "eskalacije") {
        return {
          select: () => builder([]),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: "esk-1" }, error: null }),
            }),
          }),
        };
      }
      if (table === "ncr_capa") {
        return {
          select: () => builder([]),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: { id: "ncr-1", broj_ncr: "NCR-2026-1" },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "radnici") {
        return { select: () => builder([]) };
      }
      return { select: () => builder([]) };
    },
  };
}

describe("proveriUzastopniNokIAktiviraj", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ne aktivira ispod praga", async () => {
    const log = [
      { status: "NOK", pozicija: "A" },
      { status: "OK", pozicija: "A" },
    ];
    const supabase = mockSupabase(log);
    const rez = await proveriUzastopniNokIAktiviraj(supabase, {
      modul: "merljive",
      idDeo: "NM-001",
      datum: "2026-07-09",
      smena: 1,
    });
    expect(rez.nokUzastopna).toBeLessThan(AUTO_PRAGOVI.nokUzastopnaEskalacija);
    expect(rez.eskalacija).toBeUndefined();
  });

  it("aktivira eskalaciju na 3+ uzastopna NOK", async () => {
    const log = [
      { status: "NOK", pozicija: "P2" },
      { status: "NOK", pozicija: "P2" },
      { status: "NOK", pozicija: "P2" },
    ];
    const supabase = mockSupabase(log);
    const rez = await proveriUzastopniNokIAktiviraj(supabase, {
      modul: "merljive",
      idDeo: "NM-001",
      datum: "2026-07-09",
      kreiraoId: "r1",
    });
    expect(rez.nokUzastopna).toBeGreaterThanOrEqual(3);
    expect(rez.eskalacija).toBeTruthy();
    expect(rez.ncr).toBeTruthy();
  });
});
