import { describe, it, expect } from "vitest";
import { jeAutoPraviloUkljuceno, AUTO_PRAVILO_DEFAULTS } from "../src/lib/autoPodesavanja.js";
import { licencaDogadjajiIzDatuma } from "../src/lib/proaktivneNotifikacije.js";

describe("jeAutoPraviloUkljuceno", () => {
  it("podrazumevano uključeno", () => {
    expect(jeAutoPraviloUkljuceno(AUTO_PRAVILO_DEFAULTS, "nok3")).toBe(true);
  });

  it("poštuje isključeno", () => {
    expect(jeAutoPraviloUkljuceno({ auto_pravilo_nok3: "0" }, "nok3")).toBe(false);
    expect(jeAutoPraviloUkljuceno({ auto_pravilo_health: "0" }, "health")).toBe(false);
    expect(jeAutoPraviloUkljuceno({ auto_pravilo_erp: "0" }, "erp")).toBe(false);
  });
});

describe("licencaDogadjajiIzDatuma", () => {
  it("upozorava 7 dana pre isteka", () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    const iso = d.toISOString().slice(0, 10);
    const ev = licencaDogadjajiIzDatuma(iso);
    expect(ev.length).toBe(1);
    expect(ev[0].nivo).toBe("visok");
  });
});
