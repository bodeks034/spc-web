import { describe, it, expect } from "vitest";
import {
  nazivDelaBezSifre,
  porukaNemaMerljiveZaId,
} from "../src/lib/varijabilneUtils.js";

describe("merljive poruke i naziv dela", () => {
  it("prazna tabela ostaje poruka o uvozu", () => {
    const msg = porukaNemaMerljiveZaId([], "NEMA-999");
    expect(msg).toContain("Tabela karakteristike_merljive je prazna");
  });

  it("kad ima drugih redova, poruka je o tom ID-u", () => {
    const msg = porukaNemaMerljiveZaId(
      [{ id_deo: "5502-A" }],
      "NEMA-999",
    );
    expect(msg).toContain("ID NEMA-999");
    expect(msg).not.toContain("je prazna");
  });

  it("naziv jednak šifri se odbacuje", () => {
    expect(nazivDelaBezSifre("5502-A", "5502-A")).toBe("");
    expect(nazivDelaBezSifre("Osovina prednja", "5502-A")).toBe("Osovina prednja");
  });
});
