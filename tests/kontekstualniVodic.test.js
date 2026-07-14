import { describe, it, expect } from "vitest";
import {
  brojUzastopnihNok,
  izracunajRizikSkor,
  generisiKorake,
  obogatiKontekstAlarmima,
} from "../src/lib/kontekstualniVodic.js";
import { WORKFLOW_TIP } from "../src/lib/workflowAkcije.js";

describe("brojUzastopnihNok", () => {
  it("broji uzastopne NOK na istoj poziciji", () => {
    const redovi = [
      { status: "OK", pozicija: "12" },
      { status: "NOK", pozicija: "12" },
      { status: "NOK", pozicija: "12" },
      { status: "NOK", pozicija: "12" },
    ];
    expect(brojUzastopnihNok(redovi).max).toBe(3);
  });
});

describe("izracunajRizikSkor", () => {
  it("daje visok skor za alarm + NOK + bez dorade", () => {
    const r = izracunajRizikSkor({
      alarmi: [{ nivo: "visok" }],
      nokUzastopna: 3,
      kpiAgg: { neusaglaseno: 5, dorada: 0 },
      nemaDorade: true,
    });
    expect(r.skor).toBeGreaterThan(50);
    expect(r.razlozi.length).toBeGreaterThan(0);
  });
});

describe("generisiKorake", () => {
  it("predlaže KPI doradu kad ima neusaglašenih", () => {
    const koraci = generisiKorake({
      idDeo: "5502-A",
      kpiAgg: { neusaglaseno: 3, dorada: 0 },
      modul: "merljive",
    });
    expect(koraci.some((k) => k.akcija === WORKFLOW_TIP.KPI_DORADA)).toBe(true);
  });

  it("predlaže pauzu serije pri 3× NOK", () => {
    const koraci = generisiKorake({
      idDeo: "5502-A",
      nokUzastopna: 3,
      modul: "merljive",
    });
    expect(koraci.some((k) => k.id === "pauziraj_seriju" && k.akcija === WORKFLOW_TIP.ODOBRENJA)).toBe(true);
  });
});

describe("obogatiKontekstAlarmima", () => {
  it("dodaje korake iz alarma kad ima današnji unos", () => {
    const ctx = {
      idDeo: "X",
      modul: "merljive",
      ncrLista: [],
      kpiAgg: null,
      kpiRows: [{ id: 1 }],
      logRedovi: [{ status: "NOK", pozicija: "1" }],
      nokUzastopna: 0,
      nemaDorade: false,
      reakcije: [],
    };
    const out = obogatiKontekstAlarmima(ctx, [{ id: "deo_nok_x", nivo: "visok", naslov: "Test", opis: "Opis" }]);
    expect(out.koraci.some((k) => k.akcija === WORKFLOW_TIP.NCR_IZ_ALARMA)).toBe(true);
  });

  it("ne prikazuje korake bez današnjeg unosa", () => {
    const ctx = {
      idDeo: "NM-001",
      modul: "merljive",
      ncrLista: [],
      kpiAgg: null,
      kpiRows: [],
      logRedovi: [],
      nokUzastopna: 0,
      nemaDorade: false,
      reakcije: [],
    };
    const out = obogatiKontekstAlarmima(ctx, [{ id: "eskalacije_stare", nivo: "visok", naslov: "Esk" }]);
    expect(out.koraci).toEqual([]);
    expect(out.rizik.skor).toBe(0);
  });
});
