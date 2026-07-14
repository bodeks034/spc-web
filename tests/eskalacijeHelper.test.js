import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  normalizujPrefill8d,
  sacuvajNavigacijuNcr,
  procitajNavigacijuNcr,
  prefill8dIzEskalacije,
} from "../src/lib/eskalacijeHelper.js";

function stubSessionStorage() {
  const store = {};
  vi.stubGlobal("sessionStorage", {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((key) => delete store[key]); },
  });
}

describe("normalizujPrefill8d NCR", () => {
  it("koristi prefill8dIzNcr kad postoji ncr_id", () => {
    const p = normalizujPrefill8d({
      ncr_id: 12,
      id_deo: "MRAP-001",
      opis: "Pukotina",
      broj_ncr: "NCR-2026-0003",
      uzrok: "Alat",
    });
    expect(p.ncr_id).toBe(12);
    expect(p.id_deo).toBe("MRAP-001");
    expect(p.d2_opis_problema).toBe("Pukotina");
    expect(p.broj_reklamacije).toBe("NCR-2026-0003");
  });

  it("prepoznaje NCR po broju reklamacije", () => {
    const p = normalizujPrefill8d({
      id: 7,
      broj_reklamacije: "NCR-2026-0099",
      id_deo: "X",
      opis: "Test",
    });
    expect(p.ncr_id).toBe(7);
  });
});

describe("NCR navigacija session", () => {
  beforeEach(() => {
    stubSessionStorage();
  });

  it("sacuvaj i procitaj NCR tab + prefill", () => {
    sacuvajNavigacijuNcr({ id_deo: "ABC", opis: "Alarm" });
    const r = procitajNavigacijuNcr();
    expect(r.tab).toBe("ncr");
    expect(r.prefill).toEqual({ id_deo: "ABC", opis: "Alarm" });
    expect(sessionStorage.getItem("spc_tab_atr")).toBeNull();
    expect(sessionStorage.getItem("spc_ncr_prefill")).toBeNull();
  });
});

describe("prefill8dIzEskalacije", () => {
  it("čisti INTEL/AUTO prefikse", () => {
    const p = prefill8dIzEskalacije({ id_deo: "A", opis: "INTEL: problem" });
    expect(p.opis).toBe("problem");
  });
});
