import { describe, it, expect } from "vitest";
import { daniDoStudije, statusMsaKalendara } from "../src/lib/msaKalendar.js";

const C = { sivi: "#888", crvena: "#f00", zuta: "#ff0", zelena: "#0f0" };

describe("msaKalendar", () => {
  it("daniDoStudije za budući datum", () => {
    const buduci = new Date();
    buduci.setDate(buduci.getDate() + 10);
    const d = daniDoStudije(buduci.toISOString().split("T")[0]);
    expect(d).toBeGreaterThanOrEqual(9);
    expect(d).toBeLessThanOrEqual(11);
  });

  it("status za kasnu studiju", () => {
    const proslo = new Date();
    proslo.setDate(proslo.getDate() - 3);
    const st = statusMsaKalendara(proslo.toISOString().split("T")[0], C);
    expect(st.label).toMatch(/KASNI/);
    expect(st.boja).toBe(C.crvena);
  });

  it("status neplanirano", () => {
    const st = statusMsaKalendara(null, C);
    expect(st.label).toBe("NEPLANIRANO");
  });
});
