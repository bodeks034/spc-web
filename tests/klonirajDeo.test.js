import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSupabase, ucitajRedovePoIdDeo, upsertDeo } = vi.hoisted(() => {
  const mockSupabase = { from: vi.fn() };
  const ucitajRedovePoIdDeo = vi.fn();
  const upsertDeo = vi.fn().mockResolvedValue({ id_deo: "NOVI-001" });
  return { mockSupabase, ucitajRedovePoIdDeo, upsertDeo };
});

vi.mock("../src/lib/supabaseClient.js", () => ({
  supabase: mockSupabase,
}));

vi.mock("../src/lib/sifrarnikApi.js", () => ({
  upsertDeo,
}));

vi.mock("../src/lib/idDeoQuery.js", () => ({
  ucitajRedovePoIdDeo,
}));

import { klonirajDeoUGlavniUnos } from "../src/lib/glavniUnosApi.js";

describe("klonirajDeoUGlavniUnos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockImplementation((table) => {
      if (table === "delovi") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: { id_deo: "IZVOR-1", naziv_dela: "Test deo", aktivan: true },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "glavni_unos_redovi") {
        return {
          insert: (payload) => ({
            select: () => Promise.resolve({
              data: payload,
              error: null,
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });
  });

  it("kopira redove na novi ID", async () => {
    ucitajRedovePoIdDeo.mockImplementation(async (_sb, _table, idDeo) => {
      if (idDeo === "IZVOR-1") {
        return [
          { id: 1, id_deo: "IZVOR-1", sheet_naziv: "vozilo1", karakteristika: "A", redosled: 0 },
          { id: 2, id_deo: "IZVOR-1", sheet_naziv: "vozilo1", karakteristika: "B", redosled: 1 },
        ];
      }
      return [];
    });

    const rez = await klonirajDeoUGlavniUnos("IZVOR-1", "NOVI-001");
    expect(rez.redova).toBe(2);
    expect(rez.cilj).toBe("NOVI-001");
    expect(upsertDeo).toHaveBeenCalledWith(expect.objectContaining({ id_deo: "NOVI-001" }));
  });

  it("odbija kada cilj već ima redove", async () => {
    ucitajRedovePoIdDeo.mockImplementation(async (_sb, _table, idDeo) => {
      if (idDeo === "IZVOR-1") return [{ id: 1, id_deo: "IZVOR-1", karakteristika: "A" }];
      if (idDeo === "NOVI-001") return [{ id: 9, id_deo: "NOVI-001", karakteristika: "X" }];
      return [];
    });

    await expect(klonirajDeoUGlavniUnos("IZVOR-1", "NOVI-001")).rejects.toThrow(/već ima/);
  });
});
