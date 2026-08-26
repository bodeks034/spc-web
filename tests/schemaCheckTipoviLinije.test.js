import { describe, expect, it, vi } from "vitest";
import { proveriTipoviLinijePrivremene } from "../src/lib/schemaCheck.js";

function mockSupabase({ tip = { kod: "VOZ-01" }, sheet = { naziv: "voz-01_delovi" }, tipErr = null, sheetErr = null } = {}) {
  const from = vi.fn((table) => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => {
        if (table === "tipovi_vozila") {
          return tipErr ? { data: null, error: tipErr } : { data: tip, error: null };
        }
        if (table === "glavni_unos_sheetovi") {
          return sheetErr ? { data: null, error: sheetErr } : { data: sheet, error: null };
        }
        return { data: null, error: null };
      }),
    };
    return chain;
  });
  return { from };
}

describe("proveriTipoviLinijePrivremene", () => {
  it("OK kad postoje VOZ-01 i voz-01_delovi", async () => {
    const rez = await proveriTipoviLinijePrivremene(mockSupabase());
    expect(rez.ok).toBe(true);
  });

  it("fail kad nema VOZ-01", async () => {
    const rez = await proveriTipoviLinijePrivremene(mockSupabase({ tip: null }));
    expect(rez.ok).toBe(false);
    expect(rez.poruka).toMatch(/VOZ-01/);
  });

  it("fail kad nema sheet voz-01_delovi", async () => {
    const rez = await proveriTipoviLinijePrivremene(mockSupabase({ sheet: null }));
    expect(rez.ok).toBe(false);
    expect(rez.poruka).toMatch(/voz-01_delovi/);
  });
});
