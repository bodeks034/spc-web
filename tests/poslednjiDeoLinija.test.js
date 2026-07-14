import { describe, it, expect, beforeEach, vi } from "vitest";
import { procitajPoslednjiDeo, sacuvajPoslednjiDeo, obrisiPoslednjiDeo } from "../src/lib/poslednjiDeoLinija.js";

describe("poslednjiDeoLinija", () => {
  const KEY = "spc_poslednji_deo_linija";
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

  it("čuva i čita id_deo po modulu", () => {
    sacuvajPoslednjiDeo("atributivne", "5501-A", 2);
    expect(procitajPoslednjiDeo("atributivne")).toBe("5501-A");
    expect(procitajPoslednjiDeo("atributivne", 2)).toBe("5501-A");
  });

  it("ne vraća deo kad smena ne odgovara", () => {
    sacuvajPoslednjiDeo("varijabilne", "5502-B", 1);
    expect(procitajPoslednjiDeo("varijabilne", 2)).toBeNull();
  });

  it("ignoriše prazan modul", () => {
    sacuvajPoslednjiDeo("", "X", 1);
    expect(JSON.parse(store[KEY] || "{}")).toEqual({});
  });

  it("briše zapamćeni deo pri izlasku iz modula", () => {
    sacuvajPoslednjiDeo("varijabilne", "NM-001", 1);
    sacuvajPoslednjiDeo("atributivne", "MRAP-001", 1);
    obrisiPoslednjiDeo("varijabilne");
    expect(procitajPoslednjiDeo("varijabilne")).toBeNull();
    expect(procitajPoslednjiDeo("atributivne")).toBe("MRAP-001");
  });
});
