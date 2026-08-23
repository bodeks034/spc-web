import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/lib/glavniUnosApi.js", () => ({
  propagirajMerljiviDeo: vi.fn(),
  osveziSifrarnikStatusMv: vi.fn(async () => {}),
}));

vi.mock("../src/lib/sifrarnikBatchRollback.js", () => ({
  snapBatchPreObjave: vi.fn(),
}));

vi.mock("../src/lib/sifrarnikBatchDigest.js", () => ({
  posaljiBatchObjavaDigest: vi.fn(async () => ({ preskoceno: true })),
}));

vi.mock("../src/lib/sifrarnikDeloviMv.js", () => ({
  fetchSpremniBatchIzMv: vi.fn(async () => null),
}));

vi.mock("../src/lib/sifrarnikAudit.js", () => ({
  logSifrarnikAudit: vi.fn(),
}));

vi.mock("../src/lib/sifrarnikOdrzavanje.js", async (importOriginal) => {
  const orig = await importOriginal();
  return {
    ...orig,
    fetchAktivniDeloviSaStatusom: vi.fn(),
  };
});

import { propagirajMerljiviDeo } from "../src/lib/glavniUnosApi.js";
import { idDeoIzErpPreviewStavke, proceniDeloviBezGuPosleErp } from "../src/lib/erpGuProcena.js";
import { objaviSpremneDelove, jeSpremanZaBatchObjavu } from "../src/lib/sifrarnikBatchObjava.js";
import { fetchAktivniDeloviSaStatusom, metaSkenaStatusa } from "../src/lib/sifrarnikOdrzavanje.js";

describe("metaSkenaStatusa", () => {
  it("označava truncated kad ima više delova od limita", () => {
    expect(metaSkenaStatusa(2000, 3500)).toEqual({
      skenirano: 2000,
      ukupnoAktivnih: 3500,
      truncated: true,
      limit: 2000,
    });
  });
});

describe("idDeoIzErpPreviewStavke", () => {
  it("izvlači id_deo iz preview redova", () => {
    const ids = idDeoIzErpPreviewStavke({
      entitet: "delovi",
      validnih: 2,
      primer: [{ id_deo: "HAM-1" }, { MATNR: "HAM-2" }],
    });
    expect(ids).toContain("HAM-1");
    expect(ids).toContain("HAM-2");
  });
});

describe("jeSpremanZaBatchObjavu", () => {
  it("zahteva GU, greške i crtež", () => {
    expect(jeSpremanZaBatchObjavu({ slika_naziv: "x.jpg" }, { guBroj: 1, greskeBroj: 1 })).toBe(true);
    expect(jeSpremanZaBatchObjavu({ slika_naziv: "" }, { guBroj: 1, greskeBroj: 1 })).toBe(false);
    expect(jeSpremanZaBatchObjavu({ slika_naziv: "x.jpg" }, { guBroj: 0, greskeBroj: 1 })).toBe(false);
  });
});

describe("objaviSpremneDelove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAktivniDeloviSaStatusom.mockResolvedValue({
      stavke: [
        {
          deo: { id_deo: "A", slika_naziv: "a.jpg" },
          opts: { guBroj: 2, greskeBroj: 1 },
          status: "delimicno",
        },
        {
          deo: { id_deo: "B", slika_naziv: "b.jpg" },
          opts: { guBroj: 1, greskeBroj: 2 },
          status: "delimicno",
        },
      ],
      truncated: false,
      skenirano: 2,
      ukupnoAktivnih: 2,
    });
  });

  it("prijavljuje uspeh i greške po delu", async () => {
    propagirajMerljiviDeo
      .mockResolvedValueOnce({ karakteristike: 3 })
      .mockRejectedValueOnce(new Error("RN konflikt"));

    const progress = [];
    const rez = await objaviSpremneDelove({
      onProgress: (p) => progress.push(p),
    });

    expect(rez.uspeh).toBe(1);
    expect(rez.neuspelo).toBe(1);
    expect(rez.rezultati.find((r) => r.idDeo === "B")?.greska).toMatch(/RN konflikt/);
    expect(progress.length).toBe(2);
  });
});

describe("proceniDeloviBezGuPosleErp", () => {
  it("je eksportovana funkcija", () => {
    expect(typeof proceniDeloviBezGuPosleErp).toBe("function");
  });
});
