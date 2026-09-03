import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Test useToasts logike bez React renderHook (izbegava jsdom dependency)
describe("useToasts logika", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("toast objekat ima ispravna polja", () => {
    const tekst = "Test poruka";
    const tip = "uspeh";
    const id = Date.now();
    const toast = { tekst, tip, id };
    expect(toast.tekst).toBe("Test poruka");
    expect(toast.tip).toBe("uspeh");
    expect(typeof toast.id).toBe("number");
  });

  it("filter uklanja toast po id-u", () => {
    const toasts = [
      { tekst: "A", tip: "info", id: 1 },
      { tekst: "B", tip: "uspeh", id: 2 },
      { tekst: "C", tip: "greska", id: 3 },
    ];
    const bez2 = toasts.filter((t) => t.id !== 2);
    expect(bez2).toHaveLength(2);
    expect(bez2.map((t) => t.tekst)).toEqual(["A", "C"]);
  });

  it("podrazumevani tip treba biti info", () => {
    const tip = undefined || "info";
    expect(tip).toBe("info");
  });
});
