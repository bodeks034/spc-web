import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatBatchObjavaDigest } from "../src/lib/sifrarnikBatchDigest.js";
import { primeniPredlogDuplikata } from "../src/lib/sifrarnikDuplikatiPredlog.js";
import { fetchDeloviPoServerFilteru } from "../src/lib/sifrarnikDeloviServerFilter.js";
import { preuzmiDeoJson } from "../src/lib/sifrarnikExportJson.js";
import { sacuvajOtvoriSifrarnik } from "../src/lib/appModulNav.js";

vi.mock("../src/lib/supabaseClient.js", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock("../src/lib/sifrarnikAudit.js", () => ({
  logSifrarnikAudit: vi.fn(async () => {}),
}));

vi.mock("../src/lib/sifrarnikStatusEvent.js", () => ({
  obavestiPromenuStatusaSifrarnika: vi.fn(),
}));

import { supabase } from "../src/lib/supabaseClient.js";

describe("formatBatchObjavaDigest", () => {
  it("sumira uspeh i greške", () => {
    const txt = formatBatchObjavaDigest([
      { ok: true, idDeo: "A-1", karakteristike: 3 },
      { ok: false, idDeo: "B-2", greska: "Nema GU" },
    ]);
    expect(txt).toContain("1/2");
    expect(txt).toContain("A-1");
    expect(txt).toContain("B-2");
  });
});

describe("primeniPredlogDuplikata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("briše duplikate prema predlogu", async () => {
    const chain = { in: vi.fn(async () => ({ error: null })) };
    supabase.from.mockReturnValue({ delete: vi.fn(() => chain) });

    const res = await primeniPredlogDuplikata({
      idDeo: "X-1",
      predlog: { zadrziId: 10, obrisiIds: [5, 6] },
    });

    expect(res.obrisano).toBe(2);
    expect(supabase.from).toHaveBeenCalledWith("karakteristike_merljive");
  });
});

describe("fetchDeloviPoServerFilteru RPC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("koristi RPC kada postoji", async () => {
    supabase.rpc.mockResolvedValue({
      data: [{ id: 1, id_deo: "5501-A", status_sifrarnik: "delimicno" }],
      error: null,
    });

    const res = await fetchDeloviPoServerFilteru({ nedostajeFilter: "gu", limit: 10 });
    expect(res.viaRpc).toBe(true);
    expect(res.delovi[0].id_deo).toBe("5501-A");
    expect(supabase.rpc).toHaveBeenCalledWith("sifrarnik_filter_delovi", expect.objectContaining({
      p_nedostaje: "gu",
    }));
  });
});

describe("preuzmiDeoJson", () => {
  it("generiše download link", () => {
    const click = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: () => "blob:test", revokeObjectURL: vi.fn() });
    vi.stubGlobal("document", {
      createElement: () => ({ click, download: "", href: "" }),
    });

    preuzmiDeoJson({ id_deo: "DEMO-1" }, "DEMO-1");
    expect(click).toHaveBeenCalled();
  });
});

describe("sacuvajOtvoriSifrarnik", () => {
  it("vraća payload za navigaciju", () => {
    const payload = sacuvajOtvoriSifrarnik("karakteristike", { idDeo: "5501-A" });
    expect(payload).toMatchObject({
      modul: "sifrarnik",
      tab: "karakteristike",
      ctx: { idDeo: "5501-A" },
    });
  });
});
