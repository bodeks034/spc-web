import { describe, it, expect } from "vitest";
import { objasniAutoUzrokNcr, labelIzvorNcr } from "../src/lib/ncrWorkflowVeza.js";

describe("objasniAutoUzrokNcr", () => {
  it("objašnjava SPC alarm", () => {
    const r = objasniAutoUzrokNcr({
      izvor: "spc_alarm",
      spc_alarm_id: 12,
      opis: "SPC alarm: NOK streak na poziciji A",
    });
    expect(r?.naslov).toBe("Otvoreno iz SPC alarma");
    expect(r?.razlog).toContain("NOK streak");
  });

  it("objašnjava auto-pravilo NOK3", () => {
    const r = objasniAutoUzrokNcr({
      izvor: "auto_pravilo",
      opis: "AUTO-NCR-3X: 3 uzastopna NOK na poziciji B",
    });
    expect(r?.naslov).toContain("automatski");
    expect(r?.razlog).toContain("3 uzastopna NOK");
  });

  it("koristi audit zapis kad postoji", () => {
    const r = objasniAutoUzrokNcr(
      { izvor: "auto_pravilo", opis: "AUTO-NCR" },
      { opis: "Eskalacija + draft NCR iz auto-pravila", tip: "nok3" },
    );
    expect(r?.razlog).toBe("Eskalacija + draft NCR iz auto-pravila");
  });

  it("vraća null za ručni NCR", () => {
    expect(objasniAutoUzrokNcr({ izvor: "rucno", opis: "Ručno prijavljeno" })).toBeNull();
  });
});

describe("labelIzvorNcr", () => {
  it("mapira poznate izvore", () => {
    expect(labelIzvorNcr({ izvor: "spc_alarm" })).toBe("SPC alarm na liniji");
    expect(labelIzvorNcr({ izvor: "rucno" })).toBe("Ručni unos");
  });
});
