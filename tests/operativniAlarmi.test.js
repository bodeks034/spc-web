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

  it("stare eskalacije sabija u jedinstvene ID delova", () => {
    const staro = new Date(Date.now() - 48 * 3600000).toISOString();
    const red = (id) => ({ id_deo: id, status: "otvoren", created_at: staro });
    const { alarmi } = evaluirajAlarme({
      eskalacije: [
        red("5502-A"), red("5502-A"), red("HAM-001"),
        red("NM-001"), red("NTV-001"), red("MRAP-001"),
      ],
    });
    const stari = alarmi.find((a) => a.id === "eskalacije_stare");
    expect(stari.opis).toBe("5502-A, HAM-001, NM-001, NTV-001 i još 1");
    expect(stari.naslov).toBe("6 eskalacija bez odgovora > 24h");
  });

  it("otvorene eskalacije nabrajaju delove, ne odsečene opise", () => {
    const sada = new Date().toISOString();
    const { alarmi } = evaluirajAlarme({
      eskalacije: [
        { id_deo: "5502-A", status: "otvoren", created_at: sada, opis: "AUTO-NOK-VAR: Debljina lima · serija 1" },
        { id_deo: "5502-A", status: "otvoren", created_at: sada, opis: "duplikat" },
        { id_deo: "HAM-001", status: "otvoren", created_at: sada, opis: "3 NOK uzastopna na poz. FUNKCIONALNE ZONE" },
      ],
    });
    const otv = alarmi.find((a) => a.id === "eskalacije_otvorene");
    expect(otv.opis).toBe("5502-A, HAM-001");
    expect(otv.naslov).toBe("3 otvorenih eskalacija");
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
