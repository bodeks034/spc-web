import { describe, expect, it } from "vitest";
import { deoPripadaLiniji, jeLegacyLinija } from "../src/lib/linijaProizvoda.js";
import { stavkeChecklistePoslePropagacije } from "../src/lib/sifrarnikChecklist.js";
import { GLAVNI_UNOS_SHEET_TIP } from "../src/lib/glavniUnosSheetTip.js";

describe("deoPripadaLiniji", () => {
  it("povezuje vozilo_katalog_id i prefiks ID", () => {
    expect(deoPripadaLiniji({ vozilo_katalog_id: "VOZ-03" }, "VOZ-03")).toBe(true);
    expect(deoPripadaLiniji({ id_deo: "VOZ-03-NM-001" }, "VOZ-03")).toBe(true);
    expect(deoPripadaLiniji({ vozilo_katalog_id: "VOZ-01" }, "VOZ-03")).toBe(false);
  });

  it("prazan filter propusti sve", () => {
    expect(deoPripadaLiniji({ id_deo: "X" }, "")).toBe(true);
  });
});

describe("jeLegacyLinija", () => {
  it("MRAP je legacy, VOZ nije", () => {
    expect(jeLegacyLinija("MRAP")).toBe(true);
    expect(jeLegacyLinija("VOZ-01")).toBe(false);
  });
});

describe("stavkeChecklistePoslePropagacije", () => {
  it("uključuje liniju u labelama", () => {
    const st = stavkeChecklistePoslePropagacije(
      { tip: GLAVNI_UNOS_SHEET_TIP.PROJEKAT, sifra_vozila: "VOZ-02" },
      "VOZ-02-NM-001",
    );
    expect(st[0].label).toContain("VOZ-02");
    expect(st[0].ctx?.linijaKod).toBe("VOZ-02");
  });
});
