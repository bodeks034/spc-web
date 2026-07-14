import { describe, it, expect } from "vitest";
import { sumirajProveruSeme } from "../src/lib/schemaCheck.js";

describe("sumirajProveruSeme", () => {
  it("ok kad su sve migracije primenjene", () => {
    const s = sumirajProveruSeme([
      { id: "a", ok: true, naziv: "A", fajl: "a.sql" },
      { id: "b", ok: true, naziv: "B", fajl: "b.sql" },
    ]);
    expect(s.ok).toBe(true);
    expect(s.primenjeno).toBe(2);
    expect(s.nedostaje).toEqual([]);
  });

  it("lista nedostajućih migracija", () => {
    const s = sumirajProveruSeme([
      { id: "ncr_capa", ok: false, naziv: "NCR", fajl: "59_ncr_capa.sql" },
      { id: "kpi_unos", ok: true, naziv: "KPI", fajl: "14.sql" },
    ]);
    expect(s.ok).toBe(false);
    expect(s.nedostaje).toHaveLength(1);
    expect(s.nedostaje[0].id).toBe("ncr_capa");
  });
});
