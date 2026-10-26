import { describe, it, expect } from "vitest";
import {
  jePogonOmogucen,
  naloziZaDeoPoPogonu,
  pogonKodIzRnReda,
  pogoniZaDeoAtributivne,
} from "../src/lib/pogonSop.js";

const atr = [
  { id_deo: "5502-A", pogon_kod: "G", aktivan: true, radni_nalog: "RN-2024-002" },
  { id_deo: "5502-A", pogon_kod: "NT001", aktivan: true, radni_nalog: null },
];

const nalozi = [
  { id_deo: "5502-A", status: "aktivan", broj_naloga: "RN-2026-101", pogon_kod: "NT001" },
  { id_deo: "5502-A", status: "aktivan", broj_naloga: "RN-2026-5502A-G", pogon_kod: null },
];

describe("pogon van slova A–H", () => {
  it("zadržava NT001 iz atributivnih pogona i sa naloga", () => {
    expect(pogoniZaDeoAtributivne(atr, "5502-A")).toEqual(["G", "NT001"]);
    expect(pogonKodIzRnReda(nalozi[0])).toBe("NT001");
    expect(pogonKodIzRnReda(nalozi[1])).toBe("G");
    expect(naloziZaDeoPoPogonu(nalozi, "5502-A").NT001.broj_naloga).toBe("RN-2026-101");
  });

  it("oba pogona imaju aktivan nalog, pa unos ne sme da ostane samo na G", () => {
    const opts = {
      naloziRows: nalozi,
      atributivniPogonRows: atr,
      idDeo: "5502-A",
      modul: "atributivne",
    };
    expect(jePogonOmogucen({ ...opts, pogonKod: "NT001" })).toBe(true);
    expect(jePogonOmogucen({ ...opts, pogonKod: "G" })).toBe(true);
  });
});
