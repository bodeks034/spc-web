import { describe, it, expect } from "vitest";
import {
  sagrupisiLanacProizvodnje,
  grupisiLanacPoKomadu,
  filtrirajLanacPoKomadu,
} from "../src/lib/trasabilitetIzvestaj.js";

describe("sagrupisiLanacProizvodnje", () => {
  it("spaja merenja i moment u hronološki lanac sa RN i lot", () => {
    const lanac = sagrupisiLanacProizvodnje({
      merenja: [{
        created_at: "2026-07-09T10:00:00Z",
        radni_nalog: "RN-100",
        sesija_id: "LOT-A1",
        pozicija: "D1",
        vrednost_raw: "10.2",
        status: "OK",
        kontrolor: "Petar",
        merni_instrument: "Mikrometar",
      }],
      momenti: [{
        created_at: "2026-07-09T11:00:00Z",
        radni_nalog: "RN-100",
        korak_redosled: 3,
        ostvareno_nm: 45,
        status: "OK",
        tool_kod: "TK002",
        vin: "VIN123",
      }],
    });
    expect(lanac).toHaveLength(2);
    expect(lanac[0].tip).toBe("Merenje");
    expect(lanac[0].rn).toBe("RN-100");
    expect(lanac[0].lot).toBe("LOT-A1");
    expect(lanac[1].tip).toBe("Moment");
    expect(lanac[1].lot).toBe("VIN123");
    expect(lanac[1].vin).toBe("VIN123");
  });
});

describe("grupisiLanacPoKomadu", () => {
  it("grupiše događaje po VIN/lot", () => {
    const lanac = sagrupisiLanacProizvodnje({
      momenti: [
        { created_at: "2026-07-09T11:00:00Z", radni_nalog: "RN-1", korak_redosled: 1, ostvareno_nm: 10, status: "OK", vin: "VIN-A" },
        { created_at: "2026-07-09T11:05:00Z", radni_nalog: "RN-1", korak_redosled: 2, ostvareno_nm: 20, status: "OK", vin: "VIN-A" },
        { created_at: "2026-07-09T12:00:00Z", radni_nalog: "RN-1", korak_redosled: 1, ostvareno_nm: 10, status: "OK", vin: "VIN-B" },
      ],
    });
    const grupe = grupisiLanacPoKomadu(lanac);
    expect(grupe).toHaveLength(2);
    expect(grupe.find((g) => g.vin === "VIN-A")?.dogadjaji).toHaveLength(2);
  });
});

describe("filtrirajLanacPoKomadu", () => {
  it("filtrira po VIN", () => {
    const lanac = sagrupisiLanacProizvodnje({
      momenti: [
        { created_at: "2026-07-09T11:00:00Z", radni_nalog: "RN-1", korak_redosled: 1, ostvareno_nm: 10, status: "OK", vin: "VIN-A" },
        { created_at: "2026-07-09T12:00:00Z", radni_nalog: "RN-1", korak_redosled: 1, ostvareno_nm: 10, status: "OK", vin: "VIN-B" },
      ],
    });
    const f = filtrirajLanacPoKomadu(lanac, "VIN-A");
    expect(f).toHaveLength(1);
    expect(f[0].vin).toBe("VIN-A");
  });
});
