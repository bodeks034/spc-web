import { describe, it, expect, vi } from "vitest";
import {
  proveriAktivanKarantin,
  karantinNeuspeh,
  karantinNeproveren,
  tekstKarantinPolja,
} from "../src/lib/karantinProvera.js";

vi.mock("../src/lib/momentKljucApi.js", () => ({
  resolveMomentIdDeo: async () => null,
}));

/** Minimalni supabase stub: po tabeli vraća {data} ili {error}. */
function stub(odgovori) {
  return {
    from(tabela) {
      const rez = odgovori[tabela] || { data: [], error: null };
      const lanac = {
        select: () => lanac,
        in: () => lanac,
        eq: () => lanac,
        order: () => lanac,
        limit: () => Promise.resolve(rez),
      };
      return lanac;
    },
  };
}

describe("proveriAktivanKarantin", () => {
  it("prazan ulaz ne pravi upit", async () => {
    const r = await proveriAktivanKarantin(stub({}), { idDeo: "", radniNalog: "" });
    expect(r.aktivan).toBe(false);
    expect(r.neproveren).toBeFalsy();
  });

  it("aktivan HOLD lot znači blokadu", async () => {
    const r = await proveriAktivanKarantin(
      stub({
        karantin_lotovi: { data: [{ id: 1, id_deo: "5501-A", razlog: "SPC", status: "aktivan" }], error: null },
        spc_alarmi: { data: [], error: null },
      }),
      { idDeo: "5501-a" },
    );
    expect(r.aktivan).toBe(true);
    expect(r.neproveren).toBeFalsy();
  });

  it("greška u bilo kom upitu je fail-closed, ne 'čisto'", async () => {
    const r = await proveriAktivanKarantin(
      stub({
        karantin_lotovi: { data: null, error: { message: "RLS deny" } },
        spc_alarmi: { data: [], error: null },
      }),
      { idDeo: "5501-A" },
    );
    expect(r.aktivan).toBe(false);
    expect(karantinNeproveren(r)).toBe(true);
    expect(r.greska).toBe("RLS deny");
  });

  it("delimična greška ne prolazi kao potvrđeno čisto", async () => {
    const r = await proveriAktivanKarantin(
      stub({
        karantin_lotovi: { data: [], error: null },
        spc_alarmi: { data: null, error: { message: "timeout" } },
      }),
      { idDeo: "5501-A" },
    );
    expect(karantinNeproveren(r)).toBe(true);
  });

  it("karantinNeuspeh pravi neprovereno stanje iz bačene greške", () => {
    const r = karantinNeuspeh(new Error("network"));
    expect(r.aktivan).toBe(false);
    expect(r.neproveren).toBe(true);
    expect(r.greska).toBe("network");
    expect(tekstKarantinPolja(r)).toBe("provera nije uspela");
  });
});
