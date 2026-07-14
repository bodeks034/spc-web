import { describe, it, expect } from "vitest";
import {
  normalizujDatumLog,
  filtrirajLogRedove,
  offlineKontrolniRedovi,
  offlineMerljiviRedovi,
  spojiOfflineINadRedove,
} from "../src/lib/logPregledHelper.js";

describe("logPregledHelper", () => {
  it("normalizuje sr datum", () => {
    expect(normalizujDatumLog("13.07.2026")).toBe("2026-07-13");
    expect(normalizujDatumLog("2026-07-13")).toBe("2026-07-13");
  });

  it("filtrira po smeni", () => {
    const rows = [
      { datum: "2026-07-13", smena: 1, id_deo: "A" },
      { datum: "2026-07-13", smena: 2, id_deo: "B" },
    ];
    expect(filtrirajLogRedove(rows, { smena: "2" })).toHaveLength(1);
    expect(filtrirajLogRedove(rows, { smena: "sve" })).toHaveLength(2);
  });

  it("izvlači offline atributivne redove", () => {
    const q = [{
      id: "j1",
      type: "atributivne_batch",
      createdAt: "2026-07-13T10:00:00Z",
      payload: { logRows: [{ datum: "2026-07-13", smena: 1, id_deo: "X", status: "OK" }] },
    }];
    const rows = offlineKontrolniRedovi(q);
    expect(rows).toHaveLength(1);
    expect(rows[0]._offline).toBe(true);
    expect(rows[0].id_deo).toBe("X");
  });

  it("izvlači offline merljive redove", () => {
    const q = [{
      id: "j2",
      type: "merljive_serija",
      createdAt: "2026-07-13T11:00:00Z",
      payload: { merenja: [{ datum: "2026-07-13", smena: 2, id_deo: "Y", pozicija: "D1", status: "OK" }] },
    }];
    expect(offlineMerljiviRedovi(q)).toHaveLength(1);
  });

  it("spaja offline ispred baze", () => {
    const off = [{ id_deo: "O", _offline: true }];
    const db = [{ id_deo: "D" }];
    const spoj = spojiOfflineINadRedove(off, db);
    expect(spoj[0].id_deo).toBe("O");
    expect(spoj[1].id_deo).toBe("D");
  });
});
