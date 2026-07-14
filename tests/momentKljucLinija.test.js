import { describe, it, expect, vi } from "vitest";

/** Minimalni mock Supabase query builder za proveru VIN filtera. */
function mockQuery() {
  const calls = [];
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((...a) => { calls.push(["eq", ...a]); return chain; }),
    is: vi.fn((...a) => { calls.push(["is", ...a]); return chain; }),
    order: vi.fn(() => chain),
    then: (resolve) => resolve({ data: [], error: null }),
    calls,
  };
  return chain;
}

describe("momentKljucLinija VIN filter", () => {
  it("ucitajZavrseneMomentKorake filtrira po VIN kada je zadat", async () => {
    const q = mockQuery();
    const supabase = { from: vi.fn(() => q) };
    const { ucitajZavrseneMomentKorake } = await import("../src/lib/momentKljucLinija.js");
    await ucitajZavrseneMomentKorake(supabase, {
      jobId: 1,
      idDeo: "MRAP1-001",
      vin: "VIN123",
    });
    expect(q.eq).toHaveBeenCalledWith("vin", "VIN123");
  });

  it("ucitajZavrseneMomentKorake bez VIN traži zapise bez vin", async () => {
    const q = mockQuery();
    const supabase = { from: vi.fn(() => q) };
    const { ucitajZavrseneMomentKorake } = await import("../src/lib/momentKljucLinija.js");
    await ucitajZavrseneMomentKorake(supabase, {
      jobId: 1,
      idDeo: "MRAP1-001",
      vin: "",
    });
    expect(q.is).toHaveBeenCalledWith("vin", null);
  });
});
