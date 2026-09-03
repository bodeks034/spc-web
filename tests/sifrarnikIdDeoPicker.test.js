import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  snapBatchPreObjave,
  sacuvajBatchRezultat,
  ucitajBatchSnap,
  obrisiBatchSnap,
  uspesniIdoviIzSnap,
} from "../src/lib/sifrarnikBatchRollback.js";
import {
  ucitajRecentIdDeo,
  zapamtiRecentIdDeo,
} from "../src/components/sifrarnik/SifrarnikIdDeoPicker.jsx";

describe("batch snap posle objave", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    sessionStorage.clear();
  });

  it("čuva rezultate i uspešne ID-ove", () => {
    snapBatchPreObjave({ ids: ["A-1", "B-1"], statistika: { ukupno: 2 } });
    sacuvajBatchRezultat({
      rezultati: [
        { idDeo: "A-1", ok: true, karakteristike: 3 },
        { idDeo: "B-1", ok: false, greska: "x" },
      ],
      linijaKod: "VOZ-01",
    });
    const snap = ucitajBatchSnap();
    expect(snap.faza).toBe("posle");
    expect(snap.uspeh).toBe(1);
    expect(snap.neuspelo).toBe(1);
    expect(snap.linijaKod).toBe("VOZ-01");
    expect(uspesniIdoviIzSnap(snap)).toEqual(["A-1"]);
    obrisiBatchSnap();
    expect(ucitajBatchSnap()).toBeNull();
  });
});

describe("SifrarnikIdDeoPicker recent", () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it("pamti i deduplikuje ID-ove", () => {
    zapamtiRecentIdDeo("ham-nm-001");
    zapamtiRecentIdDeo("VOZ-01-A");
    zapamtiRecentIdDeo("HAM-NM-001");
    expect(ucitajRecentIdDeo()).toEqual(["HAM-NM-001", "VOZ-01-A"]);
  });
});
