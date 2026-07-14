import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  proveriMaxKorisnika,
  mozeDodatiAktivnogRadnika,
  brojAktivnihRadnika,
} from "../src/lib/licencaMaxKorisnika.js";

function mockSupabase({ count = 0, radnikAktivan = true } = {}) {
  return {
    from(table) {
      if (table === "radnici") {
        return {
          select(_cols, opts = {}) {
            if (opts.head) {
              return {
                eq: () => Promise.resolve({ count, error: null }),
              };
            }
            return {
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { aktivan: radnikAktivan },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    },
  };
}

describe("licencaMaxKorisnika", () => {
  it("brojAktivnihRadnika vraća count iz Supabase", async () => {
    const n = await brojAktivnihRadnika(mockSupabase({ count: 7 }));
    expect(n).toBe(7);
  });

  it("proveriMaxKorisnika dozvoljava kad je ispod limita", async () => {
    const r = await proveriMaxKorisnika(mockSupabase({ count: 3 }), {
      maxKorisnika: 10,
      radnikId: 1,
    });
    expect(r.ok).toBe(true);
  });

  it("proveriMaxKorisnika dozvoljava postojećeg aktivnog kad je kvota puna", async () => {
    const r = await proveriMaxKorisnika(mockSupabase({ count: 5, radnikAktivan: true }), {
      maxKorisnika: 5,
      radnikId: 99,
    });
    expect(r.ok).toBe(true);
  });

  it("proveriMaxKorisnika blokira novog kad je kvota puna", async () => {
    const r = await proveriMaxKorisnika(mockSupabase({ count: 5, radnikAktivan: false }), {
      maxKorisnika: 5,
      radnikId: 99,
    });
    expect(r.ok).toBe(false);
    expect(r.kod).toBe("max_korisnika");
  });

  it("mozeDodatiAktivnogRadnika blokira na limitu", async () => {
    const r = await mozeDodatiAktivnogRadnika(mockSupabase({ count: 5 }), 5);
    expect(r.ok).toBe(false);
    expect(r.poruka).toMatch(/limit licence/i);
  });

  it("ignoriše limit kad max nije postavljen", async () => {
    const r = await mozeDodatiAktivnogRadnika(mockSupabase({ count: 99 }), null);
    expect(r.ok).toBe(true);
  });
});
