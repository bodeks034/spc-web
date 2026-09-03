import { describe, it, expect } from "vitest";
import { MIGRACIJE_LISTA, proveriSemu, sumirajProveruSeme, GO_LIVE_IDS } from "../src/lib/schemaCheck.js";

/**
 * Supabase stub koji na sve odgovara uspehom — kao baza u kojoj su sve
 * migracije primenjene. Ako neka stavka i tada ispadne "nedostaje", znači
 * da joj provera nije povezana u mapu statusa.
 */
function supabaseSveOk() {
  const upit = {
    select: () => upit,
    eq: () => upit,
    limit: () => Promise.resolve({ data: [], error: null }),
    maybeSingle: () => Promise.resolve({ data: { kod: "VOZ-01", naziv: "voz-01_delovi" }, error: null }),
    then: (res) => res({ data: [], error: null }),
  };
  const brisanje = {
    eq: () => brisanje,
    then: (res) => res({ error: null }),
  };
  return {
    from: () => ({
      ...upit,
      upsert: () => Promise.resolve({ data: null, error: null }),
      delete: () => brisanje,
    }),
    rpc: (name) => Promise.resolve({
      data: name === "obrisi_deo_eskalacije_fk_ok" ? true : [],
      error: null,
    }),
  };
}

describe("schemaCheck pokrivenost", () => {
  it("svaka migracija iz liste ima povezanu proveru", async () => {
    const stavke = await proveriSemu(supabaseSveOk());
    const nepovezane = stavke.filter((s) => !s.ok).map((s) => `${s.fajl} (${s.id})`);
    expect(nepovezane).toEqual([]);
  });

  it("sumira sve stavke iz liste", async () => {
    const stavke = await proveriSemu(supabaseSveOk());
    const rezime = sumirajProveruSeme(stavke);
    expect(rezime.ukupno).toBe(MIGRACIJE_LISTA.length);
    expect(rezime.ok).toBe(true);
  });

  it("migracije 88-95 su u listi", () => {
    const fajlovi = MIGRACIJE_LISTA.map((m) => m.fajl);
    expect(fajlovi).toContain("88_obrisi_deo_kaskadno.sql");
    expect(fajlovi).toContain("89_sifrarnik_linija_i_mv_refresh.sql");
    expect(fajlovi).toContain("90_dashboard_agregati.sql");
    expect(fajlovi).toContain("91_arhiviranje_i_audit_trigger.sql");
    expect(fajlovi).toContain("92_bezbednost_rls_i_pin.sql");
    expect(fajlovi).toContain("93_rls_uloge_upisa.sql");
    expect(fajlovi).toContain("94_broj_zapisa_po_delu.sql");
    expect(fajlovi).toContain("95_obrisi_deo_eskalacije_fk.sql");
    expect(fajlovi).toContain("97_error_log.sql");
  });

  it("GO_LIVE_IDS pokriva 88-95 i error_log", () => {
    expect(GO_LIVE_IDS.has("obrisi_deo_kaskadno")).toBe(true);
    expect(GO_LIVE_IDS.has("bezbednost_rls_pin")).toBe(true);
    expect(GO_LIVE_IDS.has("rls_uloge_upisa")).toBe(true);
    expect(GO_LIVE_IDS.has("broj_zapisa_po_delu")).toBe(true);
    expect(GO_LIVE_IDS.has("dashboard_agregati")).toBe(true);
    expect(GO_LIVE_IDS.has("obrisi_deo_eskalacije_fk")).toBe(true);
    expect(GO_LIVE_IDS.has("error_log")).toBe(true);
  });
});
