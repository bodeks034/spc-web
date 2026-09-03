import { describe, it, expect } from "vitest";
import {
  agregirajKvalitetDashboardAttr,
  agregirajKvalitetDashboardMer,
  agregirajKvalitetDashboardMerIzAgregata,
  trendKvalitetaDashboardMer,
  trendKvalitetaDashboardMerIzAgregata,
} from "../src/lib/kpiUnos.js";
import { _test as agregatTest } from "../src/lib/dashboardAgregatRpc.js";

const { uSintetickeAttrRedove } = agregatTest;

/** Ono što bi migracija 90 izračunala nad datim sirovim redovima. */
function sqlAgregatAttr(rows) {
  const grupe = new Map();
  for (const r of rows) {
    const k = `${r.datum}|${String(r.id_deo || "?").toUpperCase()}`;
    if (!grupe.has(k)) {
      grupe.set(k, { datum: r.datum, id_deo: String(r.id_deo || "?").toUpperCase(), ok: 0, kom_nok: 0, batches: new Map() });
    }
    const g = grupe.get(k);
    let ok = Number(r.ok_kolicina) || 0;
    const nok = Number(r.nok_kolicina) || 0;
    const uk = Number(r.ukupno_merenja) || 0;
    if (ok + nok <= 0 && uk > 0) {
      const jeNok = String(r.status || "").toUpperCase() === "NOK"
        || (r.greska_naziv && r.greska_naziv !== "OK");
      if (!jeNok) ok = uk;
    }
    g.ok += ok;
    g.kom_nok += Number(r.kom_nok) || 0;
    if (nok > 0) {
      const bk = r.inspekcija_id ? `insp|${r.inspekcija_id}` : `id|${r.id}`;
      g.batches.set(bk, Math.max(g.batches.get(bk) || 0, nok));
    }
  }
  return [...grupe.values()].map((g) => ({
    datum: g.datum,
    id_deo: g.id_deo,
    ok: g.ok,
    nok: [...g.batches.values()].reduce((s, v) => s + v, 0),
    kom_nok: g.kom_nok,
  }));
}

function sqlAgregatMer(rows) {
  const grupe = new Map();
  for (const r of rows) {
    const k = `${r.datum}|${String(r.id_deo || "?").toUpperCase()}`;
    if (!grupe.has(k)) grupe.set(k, { datum: r.datum, id_deo: String(r.id_deo || "?").toUpperCase(), n: 0, nok: 0 });
    const g = grupe.get(k);
    g.n += 1;
    if (String(r.status || "").toUpperCase() === "NOK") g.nok += 1;
  }
  return [...grupe.values()];
}

const LOG_ROWS = [
  { id: 1, datum: "2026-08-20", id_deo: "5501-A", ok_kolicina: 10, nok_kolicina: 0, kom_nok: 0, inspekcija_id: null },
  { id: 2, datum: "2026-08-20", id_deo: "5501-A", ok_kolicina: 0, nok_kolicina: 2, kom_nok: 3, inspekcija_id: "i-1" },
  // Isti inspekcija_id — NOK se broji jednom (max), ne sabira.
  { id: 3, datum: "2026-08-20", id_deo: "5501-A", ok_kolicina: 0, nok_kolicina: 2, kom_nok: 1, inspekcija_id: "i-1" },
  { id: 4, datum: "2026-08-21", id_deo: "5502-B", ukupno_merenja: 8, status: "OK", inspekcija_id: null },
  { id: 5, datum: "2026-08-21", id_deo: "5502-B", ukupno_merenja: 4, status: "NOK", greska_naziv: "Ogrebotina", inspekcija_id: "i-2" },
];

const MER_ROWS = [
  { datum: "2026-08-20", id_deo: "5501-A", status: "OK", pozicija: "P1" },
  { datum: "2026-08-20", id_deo: "5501-A", status: "NOK", pozicija: "P1" },
  { datum: "2026-08-21", id_deo: "5502-B", status: "OK", pozicija: "P2" },
  { datum: "2026-08-21", id_deo: "5502-B", status: "OK", pozicija: "P2" },
];

const KPI_ROWS = [];

describe("dashboard agregacija u bazi daje isti rezultat kao JS putanja", () => {
  it("atributivne — FPY/RTY se poklapaju", () => {
    const jsRez = agregirajKvalitetDashboardAttr(LOG_ROWS, KPI_ROWS);
    const rpcRez = agregirajKvalitetDashboardAttr(
      uSintetickeAttrRedove(sqlAgregatAttr(LOG_ROWS)),
      KPI_ROWS,
    );
    expect(rpcRez).toEqual(jsRez);
  });

  it("atributivne — dupla inspekcija se ne broji dvaput", () => {
    const agg = sqlAgregatAttr(LOG_ROWS).find((r) => r.datum === "2026-08-20");
    expect(agg.ok).toBe(10);
    expect(agg.nok).toBe(2);
  });

  it("merljive — agregat daje isti kvalitet kao sirovi redovi", () => {
    const jsRez = agregirajKvalitetDashboardMer(MER_ROWS, KPI_ROWS);
    const rpcRez = agregirajKvalitetDashboardMerIzAgregata(sqlAgregatMer(MER_ROWS), KPI_ROWS);
    expect(rpcRez).toEqual(jsRez);
  });

  it("merljive — trend se poklapa", () => {
    const jsTrend = trendKvalitetaDashboardMer(MER_ROWS, KPI_ROWS);
    const rpcTrend = trendKvalitetaDashboardMerIzAgregata(sqlAgregatMer(MER_ROWS), KPI_ROWS);
    expect(rpcTrend).toEqual(jsTrend);
  });

  it("sintetički redovi imaju jedinstven batch ključ po danu i delu", () => {
    const redovi = uSintetickeAttrRedove(sqlAgregatAttr(LOG_ROWS));
    const kljucevi = redovi.map((r) => r.inspekcija_id);
    expect(new Set(kljucevi).size).toBe(redovi.length);
  });
});
