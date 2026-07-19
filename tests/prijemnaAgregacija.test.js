import { describe, expect, it } from "vitest";
import {
  agregirajMerljiveUzorke,
  agregirajPrijemIzMerenja,
} from "../src/lib/prijemnaAgregacija.js";

describe("automatski prijem iz merenja", () => {
  it("merljivi uzorak je NOK ako je bilo koja dimenzija NOK", () => {
    const rows = [
      { inspekcija_id: "u1", status: "OK" },
      { inspekcija_id: "u1", status: "NOK" },
      { inspekcija_id: "u2", status: "OK" },
      { inspekcija_id: "u2", status: "OK" },
    ];
    expect(agregirajMerljiveUzorke(rows)).toEqual({ ok: 1, nok: 1, n: 2 });
  });

  it("više dimenzija ne povećava broj kontrolisanih uzoraka", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      inspekcija_id: "isti-uzorak",
      status: i === 4 ? "NOK" : "OK",
    }));
    expect(agregirajMerljiveUzorke(rows)).toEqual({ ok: 0, nok: 1, n: 1 });
  });

  it("sabira atributivne i merljive jedinice istog prijema", () => {
    const atributivni = [
      { id: 1, status: "OK", ok_kolicina: 2, nok_kolicina: 0 },
      { id: 2, inspekcija_id: "a-nok", status: "NOK", nok_kolicina: 1 },
    ];
    const merljivi = [
      { inspekcija_id: "m1", status: "OK" },
      { inspekcija_id: "m2", status: "NOK" },
      { inspekcija_id: "m2", status: "OK" },
    ];
    const zbir = agregirajPrijemIzMerenja(atributivni, merljivi);
    expect(zbir).toMatchObject({ ok: 3, nok: 2, n: 5 });
    expect(zbir.merljivi).toEqual({ ok: 1, nok: 1, n: 2 });
  });
});
