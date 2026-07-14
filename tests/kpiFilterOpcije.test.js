import { describe, it, expect } from "vitest";
import {
  izgradiKpiFilterOpcije,
  filtrirajKpiStavke,
  datumIsoUSr,
} from "../src/lib/kpiUnos.js";

describe("izgradiKpiFilterOpcije", () => {
  it("deduplikuje i sortira po datumu opadajuće", () => {
    const out = izgradiKpiFilterOpcije([
      { radni_nalog: "rn1", datum: "2026-07-01", smena: 1 },
      { radni_nalog: "rn1", datum: "2026-07-01", smena: 1 },
      { radni_nalog: "rn2", datum: "2026-07-08", smena: 2 },
      { broj_naloga: "rn3", datum: "2026-07-05", smena: 3 },
    ]);
    expect(out.stavke).toHaveLength(3);
    expect(out.stavke[0].datum).toBe("2026-07-08");
    expect(out.radniNalozi).toEqual(["RN1", "RN2", "RN3"]);
    expect(out.smene).toEqual(["1", "2", "3"]);
  });
});

describe("filtrirajKpiStavke", () => {
  const stavke = [
    { radni_nalog: "RN1", datum: "2026-07-08", smena: "2" },
    { radni_nalog: "RN1", datum: "2026-07-07", smena: "1" },
    { radni_nalog: "RN2", datum: "2026-07-08", smena: "1" },
  ];

  it("filtrira po RN i datumu", () => {
    const f = filtrirajKpiStavke(stavke, { radniNalog: "RN1", datumIso: "2026-07-08" });
    expect(f).toHaveLength(1);
    expect(f[0].smena).toBe("2");
  });
});

describe("datumIsoUSr", () => {
  it("konvertuje ISO u sr format", () => {
    expect(datumIsoUSr("2026-07-09")).toBe("09.07.2026");
  });
});
