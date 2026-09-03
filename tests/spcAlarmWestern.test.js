import { describe, it, expect } from "vitest";
import {
  WE_PRAVILO_PREFIKS,
  jeLinijskiSpcAlarm,
  jeAnalitickiSpcAlarm,
  jeWesternElectricAlarm,
  alarmBlokiraLiniju,
} from "../src/lib/spcAlarmWorkflow.js";

describe("Western Electric → spc_alarmi blokada", () => {
  it("WE prefiks pravila je linijski i blokira", () => {
    const a = {
      tip_karte: "Xbar",
      pravilo: `${WE_PRAVILO_PREFIKS}Xbar: 2 tač(aka) van kontrole`,
      status: "otvoren",
    };
    expect(jeWesternElectricAlarm(a)).toBe(true);
    expect(jeLinijskiSpcAlarm(a)).toBe(true);
    expect(jeAnalitickiSpcAlarm(a)).toBe(false);
    expect(alarmBlokiraLiniju(a)).toBe(true);
  });

  it("stari grafikon alarm bez WE ne blokira", () => {
    const a = {
      tip_karte: "grafikon",
      pravilo: "Van UCL na Xbar",
      status: "otvoren",
    };
    expect(jeWesternElectricAlarm(a)).toBe(false);
    expect(jeLinijskiSpcAlarm(a)).toBe(false);
    expect(jeAnalitickiSpcAlarm(a)).toBe(true);
    expect(alarmBlokiraLiniju(a)).toBe(false);
  });

  it("tip_karte p/np/c/u i I/MR su linijski", () => {
    for (const tip of ["p", "np", "c", "u", "I", "MR", "R", "Xbar"]) {
      expect(jeLinijskiSpcAlarm({ tip_karte: tip, pravilo: "x", status: "otvoren" })).toBe(true);
      expect(alarmBlokiraLiniju({ tip_karte: tip, pravilo: "x", status: "otvoren" })).toBe(true);
    }
  });

  it("potvrđen WE ne blokira unos (samo otvoren/karantin)", () => {
    const a = {
      tip_karte: "p",
      pravilo: `${WE_PRAVILO_PREFIKS}p: 1 tač(aka) van kontrole`,
      status: "potvrden",
    };
    expect(jeLinijskiSpcAlarm(a)).toBe(true);
    expect(alarmBlokiraLiniju(a)).toBe(false);
  });

  it("legacy WE razmak prefiks i dalje važi", () => {
    const a = { tip_karte: "Xbar", pravilo: "WE Xbar van kontrole", status: "karantin" };
    expect(jeWesternElectricAlarm(a)).toBe(true);
    expect(alarmBlokiraLiniju(a)).toBe(true);
  });
});
