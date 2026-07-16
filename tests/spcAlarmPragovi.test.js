import { describe, it, expect, beforeEach } from "vitest";
import {
  NOK_ALARM_PO_KLASI,
  PODRAZUMEVANI_SPC_ALARM_PRAGOVI,
  setSpcAlarmPragoviCache,
  getAktivniSpcAlarmPragovi,
  nokAlarmProcenatZaKlasu,
  spcAlarmPragoviIzPodesavanja,
  statistikaNokSerije,
  pozicijeSaPrekoracenimNok,
  objasniLinijskiNokAlarm,
  SPC_ALARM_PRAG_KLJUCEVI,
} from "../src/lib/spcAlarmPragovi.js";

describe("spcAlarmPragovi", () => {
  beforeEach(() => {
    setSpcAlarmPragoviCache(PODRAZUMEVANI_SPC_ALARM_PRAGOVI);
  });

  it("podrazumevani pragovi po uputstvu", () => {
    expect(NOK_ALARM_PO_KLASI.critical).toBe(0.20);
    expect(NOK_ALARM_PO_KLASI.major).toBe(0.30);
    expect(NOK_ALARM_PO_KLASI.minor).toBe(0.40);
  });

  it("nokAlarmProcenatZaKlasu koristi klasu", () => {
    expect(nokAlarmProcenatZaKlasu("Major")).toBe(0.30);
    expect(nokAlarmProcenatZaKlasu("Critical")).toBe(0.20);
    expect(nokAlarmProcenatZaKlasu("Minor")).toBe(0.40);
    expect(nokAlarmProcenatZaKlasu("")).toBe(0.20);
  });

  it("čita pragove iz app_podesavanja", () => {
    const p = spcAlarmPragoviIzPodesavanja({
      [SPC_ALARM_PRAG_KLJUCEVI.major]: "25",
      [SPC_ALARM_PRAG_KLJUCEVI.critical]: "15",
    });
    expect(p.major).toBe(25);
    expect(p.critical).toBe(15);
    expect(p.minor).toBe(40);
  });

  it("cache menja aktivne pragove", () => {
    setSpcAlarmPragoviCache({ default: 20, critical: 15, major: 25, minor: 35 });
    expect(nokAlarmProcenatZaKlasu("Major")).toBe(0.25);
    expect(getAktivniSpcAlarmPragovi().critical).toBe(0.15);
  });

  it("Major 30% — 2/5 NOK pali alarm", () => {
    const merenja = [
      { status: "NOK" },
      { status: "NOK" },
      { status: "OK" },
      { status: "OK" },
      { status: "OK" },
    ];
    const s = statistikaNokSerije(merenja, 0.30);
    expect(s.pali).toBe(true);
    expect(s.nok).toBe(2);
  });

  it("Critical 20% — 1/5 NOK pali alarm", () => {
    const merenja = [
      { status: "NOK" },
      { status: "OK" },
      { status: "OK" },
      { status: "OK" },
      { status: "OK" },
    ];
    const s = statistikaNokSerije(merenja, 0.20);
    expect(s.pali).toBe(true);
  });

  it("pozicijeSaPrekoracenimNok po klasi dimenzije", () => {
    const rows = [
      { pozicija: "D1", status: "NOK" },
      { pozicija: "D1", status: "NOK" },
      { pozicija: "D1", status: "OK" },
      { pozicija: "D1", status: "OK" },
      { pozicija: "D1", status: "OK" },
    ];
    const pali = pozicijeSaPrekoracenimNok(rows, { D1: "Major" });
    expect(pali).toHaveLength(1);
    expect(pali[0].pozicija).toBe("D1");
  });

  it("Critical 20% — 3/5 NOK pali alarm", () => {
    const merenja = [
      { status: "NOK" },
      { status: "NOK" },
      { status: "NOK" },
      { status: "OK" },
      { status: "OK" },
    ];
    const s = statistikaNokSerije(merenja, 0.20);
    expect(s.pali).toBe(true);
    expect(s.nok).toBe(3);
  });

  it("samo NOK redovi bez OK (auto-snim) i dalje pale ako je 100% NOK na poziciji", () => {
    const rows = [
      { pozicija: "D1", status: "NOK" },
      { pozicija: "D1", status: "NOK" },
      { pozicija: "D1", status: "NOK" },
    ];
    const pali = pozicijeSaPrekoracenimNok(rows, { D1: "Critical" });
    expect(pali).toHaveLength(1);
    expect(pali[0].proc).toBe(1);
  });

  it("objasniLinijskiNokAlarm daje operateru razumljiv tekst", () => {
    const txt = objasniLinijskiNokAlarm({
      pozicija: "D1",
      pravilo: "NOK ≥20% Critical (2/8) · S1",
    });
    expect(txt).toMatch(/2 od 8 merenja su NOK/);
    expect(txt).toMatch(/20% NOK/);
    expect(txt).toMatch(/poziciji D1/);
  });
});
