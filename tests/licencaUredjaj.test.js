import { describe, it, expect, beforeEach, vi } from "vitest";
import { uredjajId, nazivUredjaja } from "../src/lib/licencaUredjaj.js";
import { formatPrikazKvote } from "../src/lib/licencaKvotaPrikaz.js";

describe("licencaUredjaj", () => {
  const store = {};

  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    vi.stubGlobal("localStorage", {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    });
  });

  it("generiše stabilan uredjajId", () => {
    const a = uredjajId();
    const b = uredjajId();
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(8);
  });

  it("nazivUredjaja vraća string", () => {
    expect(typeof nazivUredjaja()).toBe("string");
  });
});

describe("formatKvota", () => {
  it("formatira X / Y kad postoji limit", () => {
    const p = formatPrikazKvote(3, 10);
    expect(p).toMatchObject({ tekst: "3 / 10", naLimitu: false });
  });

  it("prikazuje samo broj kad nema limita", () => {
    const p = formatPrikazKvote(7, null);
    expect(p.tekst).toBe("7");
    expect(p.hint).toBe("bez limita");
  });

  it("označava limit", () => {
    expect(formatPrikazKvote(5, 5)?.naLimitu).toBe(true);
  });

  it("učitavanje", () => {
    expect(formatPrikazKvote(null, 10)?.ucitava).toBe(true);
  });
});
