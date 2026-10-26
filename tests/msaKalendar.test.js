import { describe, it, expect } from "vitest";
import { daniDoStudije, statusMsaKalendara } from "../src/lib/msaKalendar.js";
import { brojKalibracijaPoStatusu } from "../src/lib/msaMerilaPdf.js";

const C = { sivi: "#888", crvena: "#f00", zuta: "#ff0", zelena: "#0f0" };

function isoDana(pomeraj) {
  const d = new Date();
  d.setDate(d.getDate() + pomeraj);
  return d.toISOString().split("T")[0];
}

describe("kalibracija merila", () => {
  it("broji poslednju kalibraciju, ne stari istekli red", () => {
    const merila = [{
      id: 1,
      kalibracije: [
        { datum_kal: isoDana(-800), sledeca_kal: isoDana(-400) },
        { datum_kal: isoDana(-30), sledeca_kal: isoDana(400) },
      ],
    }, {
      id: 2,
      kalibracije: [
        { datum_kal: isoDana(-10), sledeca_kal: isoDana(-1) },
      ],
    }];
    expect(brojKalibracijaPoStatusu(merila)).toEqual({ isteklo: 1, uskoro: 0 });
  });
});

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
