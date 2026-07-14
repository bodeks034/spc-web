import { describe, it, expect } from "vitest";
import {
  isoAuditKombinovanoCsv,
  isoAuditPaketKombinovano,
  spcPragoviAuditCsv,
  iso3951AuditCsv,
  aqlAuditCsv,
  pfmeaCpAuditCsv,
  safeImeFajla,
} from "../src/lib/isoAuditPaket.js";

describe("isoAuditKombinovanoCsv", () => {
  it("spaja akcije i runove", () => {
    const csv = isoAuditKombinovanoCsv({
      akcije: [{ created_at: "2026-07-09", tip: "nok3", opis: "test", entitet: "ncr", id_deo: "A1" }],
      runovi: [{ created_at: "2026-07-09", job_id: "digest", status: "ok", poruka: "OK" }],
    });
    expect(csv).toContain("auto_akcija");
    expect(csv).toContain("auto_run");
    expect(csv).toContain("nok3");
    expect(csv).toContain("digest");
  });
});

describe("isoAuditPaketKombinovano", () => {
  it("spaja audit log sa ISO3951, AQL, pragovima i PfMEA", () => {
    const csv = isoAuditPaketKombinovano({
      akcije: [{ created_at: "2026-07-09", tip: "nok3", opis: "test", entitet: "ncr", id_deo: "A1" }],
      runovi: [],
      pragovi: { default: 20, critical: 20, major: 30, minor: 40 },
      iso3951: { nivo: "II", aql: "1.5" },
      aql: { nivo: "II", tipInspekcije: "Normalna", aqlPoKlasi: { critical: 0 } },
      pfmea: [{ id_deo: "A1", naziv: "PFMEA A1", revizija: 1, pfmea_stavki: 3, cp_stavki: 2 }],
    });
    expect(csv).toContain("auto_akcija");
    expect(csv).toContain("spc_alarm_prag");
    expect(csv).toContain("iso3951");
    expect(csv).toContain("aql_iso2859");
    expect(csv).toContain("pfmea_cp");
  });
});

describe("analitika audit CSV", () => {
  it("spcPragoviAuditCsv", () => {
    const csv = spcPragoviAuditCsv({ default: 20, critical: 20, major: 30, minor: 40 });
    expect(csv).toContain("critical,20");
  });
  it("iso3951AuditCsv", () => {
    const csv = iso3951AuditCsv({ nivo: "II", aql: "1.5" }, 5000);
    expect(csv).toContain("iso3951,nivo");
    expect(csv).toContain("5000");
  });
  it("aqlAuditCsv", () => {
    const csv = aqlAuditCsv({ nivo: "II", aqlPoKlasi: { major: 1.5 } }, 5000);
    expect(csv).toContain("aql_major");
  });
  it("pfmeaCpAuditCsv", () => {
    const csv = pfmeaCpAuditCsv([{ id_deo: "X", naziv: "Doc", pfmea_stavki: 1, cp_stavki: 0 }]);
    expect(csv).toContain("pfmea_cp");
    expect(csv).toContain("X");
  });
});

describe("safeImeFajla", () => {
  it("čišći specijalne karaktere", () => {
    expect(safeImeFajla("LOT/A1*")).toBe("LOT_A1_");
  });
});
