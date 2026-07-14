import { describe, it, expect } from "vitest";
import { generisiRadniNaloge } from "../src/lib/syncSifrarnikIzMerljivih.js";

describe("generisiRadniNaloge — kupac iz Osnovnog", () => {
  const karRows = [
    {
      id_deo: "MRAP-001",
      pogon_kod: "F",
      linija_faza: "Završna",
      radni_nalog: "RN-2026-MRAP001-F",
      naziv_dela: "MRAP komplet",
    },
    {
      id_deo: "MRAP-001",
      pogon_kod: "A",
      linija_faza: "Montaža",
      radni_nalog: "RN-2026-MRAP001-F",
      naziv_dela: "MRAP komplet",
    },
  ];

  const kupacPoDeo = new Map([
    ["MRAP-001", { kupac: "Lokalni servis", radni_nalog: "RN-2026-MRAP001-F", naziv_dela: "MRAP komplet" }],
  ]);

  it("dodeljuje različit broj_naloga po pogonu (ne duplira zaglavlje RN)", () => {
    const novi = generisiRadniNaloge(karRows, { kupacPoDeo });
    const brojevi = novi.map((r) => r.broj_naloga).sort();
    expect(brojevi).toContain("RN-2026-MRAP001-F");
    expect(brojevi).toContain("RN-2026-MRAP001-A");
    expect(new Set(brojevi).size).toBe(2);
    expect(novi.every((r) => r.kupac === "Lokalni servis")).toBe(true);
  });

  it("ažurira kupac na postojećem RN", () => {
    const postojeciRn = [{
      id: 1,
      broj_naloga: "RN-2026-MRAP001-F",
      id_deo: "MRAP-001",
      pogon_kod: "F",
      kupac: "",
      kolicina: 1,
      status: "aktivan",
    }];
    const out = generisiRadniNaloge(karRows, { postojeciRn, kupacPoDeo });
    const azuriran = out.find((r) => r.broj_naloga === "RN-2026-MRAP001-F");
    expect(azuriran?.kupac).toBe("Lokalni servis");
  });
});
