import { describe, it, expect } from "vitest";
import { dISO, lokacijaDela, ocistiRedZaInsert } from "../src/lib/atributivneUnosHelper.js";

describe("atributivneUnosHelper", () => {
  it("ocistiRedZaInsert uklanja id i created_at", () => {
    const r = ocistiRedZaInsert({ id: 1, created_at: "x", status: "OK" });
    expect(r).toEqual({ status: "OK" });
  });

  it("dISO vraća YYYY-MM-DD", () => {
    expect(dISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("lokacijaDela mapira liniju i mašinu", () => {
    const loc = lokacijaDela(
      { linija_id: 1, masina_id: 2 },
      [{ id: 1, naziv: "L1" }],
      [{ id: 2, naziv: "M2" }],
    );
    expect(loc).toEqual({ linija: "L1", masina: "M2" });
  });
});
