import { describe, it, expect } from "vitest";
import { evaluirajAlarme } from "../src/lib/operativniAlarmi.js";

const C = { crvena: "#f00", zuta: "#ff0", plava: "#00f" };

describe("evaluirajAlarme", () => {
  it("alarm za visok NOK danas", () => {
    const { alarmi } = evaluirajAlarme({
      attr: { ukN: 50, ukNOK: 10 },
      merljive: { merenja: 50, nok: 0 },
    });
    expect(alarmi.some((a) => a.id === "nok_danas")).toBe(true);
  });

  it("alarm za isteklu kalibraciju", () => {
    const { alarmi } = evaluirajAlarme({
      merila: [{ naziv: "Šubler 1", kalStatus: "istekla" }],
    });
    expect(alarmi.some((a) => a.id === "kal_istekla")).toBe(true);
  });

  it("alarm za MSA studiju koja kasni", () => {
    const proslo = new Date();
    proslo.setDate(proslo.getDate() - 5);
    const { alarmi } = evaluirajAlarme({
      msaStudije: [{
        sledeca_studija: proslo.toISOString().split("T")[0],
        merilo: { naziv: "Torque key" },
      }],
    });
    expect(alarmi.some((a) => a.id === "msa_kasni")).toBe(true);
  });

  it("info alarm za MSA uskoro", () => {
    const uskoro = new Date();
    uskoro.setDate(uskoro.getDate() + 14);
    const { alarmi } = evaluirajAlarme({
      msaStudije: [{
        sledeca_studija: uskoro.toISOString().split("T")[0],
        merilo: { naziv: "CMM" },
      }],
    });
    expect(alarmi.some((a) => a.id === "msa_uskoro")).toBe(true);
  });
});
