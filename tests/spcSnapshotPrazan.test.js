import { describe, it, expect } from "vitest";
import { buildSpcSnapshotMerljive, snapshotAtributivneIzLoga } from "../src/lib/analitikaSpcSnapshot.js";
import { fajlErpZaPrikaz } from "../src/lib/erpUvozLog.js";

describe("SPC snimak bez merenja", () => {
  it("ne prikazuje 6σ, DPMO 0 ni lažni najniži Cpk", () => {
    const snap = buildSpcSnapshotMerljive({
      merenja: [],
      karakteristike: [
        { id_deo: "5502-A", pozicija: "Čistoća dela", lsl: 0, usl: 1 },
        { id_deo: "5502-A", pozicija: "D1", lsl: 9, usl: 11 },
      ],
      idDeo: "5502-A",
      nazivDela: "Osovina prednja",
    });
    expect(snap.merenjaUk).toBe(0);
    expect(snap.sigma).toBeNull();
    expect(snap.dpmo).toBeNull();
    expect(snap.pozicija).toBeNull();
    expect(snap.nazivDela).toBe("Osovina prednja");
    expect(snap.status.id).toBe("nedovoljno");
  });

  it("ne računa Cpk iz merenja van izabranog perioda", () => {
    const snap = buildSpcSnapshotMerljive({
      merenja: [
        { id_deo: "5502-A", pozicija: "D1", datum: "2020-01-01", vrednost_dec: 1, status: "NOK" },
        { id_deo: "5502-A", pozicija: "D1", datum: "2020-01-02", vrednost_dec: 2, status: "NOK" },
        { id_deo: "5502-A", pozicija: "Čistoća dela", datum: "2020-01-03", vrednost_dec: 0, status: "OK" },
      ],
      karakteristike: [
        { id_deo: "5502-A", pozicija: "D1", lsl: 9, usl: 11 },
        { id_deo: "5502-A", pozicija: "Čistoća dela", lsl: 0, usl: 1 },
      ],
      idDeo: "5502-A",
      nazivDela: "Osovina prednja",
      period: "90",
      kpiPeriod: { ukupno_kom: 100, nok: 40 },
    });
    expect(snap.merenjaUk).toBe(0);
    expect(snap.cpk).toBeNull();
    expect(snap.dpmo).toBeNull();
    expect(snap.pozicija).toBeNull();
    expect(snap.status.id).toBe("nedovoljno");
  });
});

describe("SPC snimak atributivni period", () => {
  it("ne tretira stare unose kao OK u praznom periodu", () => {
    const snap = snapshotAtributivneIzLoga([
      { id: 1, datum: "2024-01-15", ok_kolicina: 1, nok_kolicina: 0, ukupno_merenja: 1 },
      { id: 2, datum: "2024-01-15", ok_kolicina: 0, nok_kolicina: 1, ukupno_merenja: 1, kom_nok: 1, greska_naziv: "POVRSINA" },
    ], "90");
    expect(snap.unosaUk).toBe(0);
    expect(snap.p).toBeNull();
    expect(snap.dpmo).toBeNull();
    expect(snap.vanKontrole).toBe(0);
    expect(snap.sparkP).toEqual([]);
    expect(snap.status.id).toBe("nedovoljno");
  });
});

describe("ERP fajl na radnim nalozima", () => {
  it("ne ispisuje ceo paket fajlova", () => {
    const paket = "kupci.csv, dobavljaci.csv, merila.csv, radni_nalozi.csv, pfmea.csv";
    expect(fajlErpZaPrikaz(paket)).toBe("radni_nalozi.csv");
    expect(fajlErpZaPrikaz("kupci.csv, merila.csv")).toBe("2 fajlova");
    expect(fajlErpZaPrikaz("radni_nalozi.csv")).toBe("radni_nalozi.csv");
  });
});
