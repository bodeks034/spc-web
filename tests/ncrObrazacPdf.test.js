import { describe, it, expect } from "vitest";
import { praznaNcrForma } from "../src/lib/ncrObrazacPolja.js";
import {
  buildObrazacHtml,
  stampajPrazanNcrObrazac,
  preuzmiPrazanNcrObrazacPdf,
  POTPISI,
} from "../src/lib/ncrObrazacPdf.js";

describe("prazni obrasci NCR", () => {
  it("NCR prazan sablon — sekcije A–H, potpisi, visoki opis", () => {
    const html = buildObrazacHtml(praznaNcrForma(), { prazanSablon: true });
    expect(html).toContain("Prazan A4 obrazac");
    expect(html).toContain("prazno");
    expect(html).toContain("NEUSAGLAŠENOSTI");
    expect(html).toContain("Zvanični potpisi");
    expect(html).toContain("polje-opis");
    expect(html).toContain("Menadžer kvaliteta (zatvaranje)");
    expect(POTPISI).toHaveLength(3);
  });

  it("exportuje funkcije za štampu i PDF", () => {
    expect(typeof stampajPrazanNcrObrazac).toBe("function");
    expect(typeof preuzmiPrazanNcrObrazacPdf).toBe("function");
  });
});
