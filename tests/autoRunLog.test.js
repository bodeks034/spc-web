import { describe, it, expect } from "vitest";
import {
  pronadjiUzastopneFailove,
  filtrirajAkcije,
  akcijeUcsv,
} from "../src/lib/autoRunLog.js";

describe("pronadjiUzastopneFailove", () => {
  it("detektuje dva uzastopna faila", () => {
    const runovi = [
      { job_id: "digest", status: "fail", created_at: "2026-07-09T12:00:00Z" },
      { job_id: "digest", status: "fail", created_at: "2026-07-09T11:00:00Z" },
      { job_id: "digest", status: "ok", created_at: "2026-07-09T10:00:00Z" },
    ];
    const f = pronadjiUzastopneFailove(runovi, 2);
    expect(f).toHaveLength(1);
    expect(f[0].jobId).toBe("digest");
  });

  it("ignorise jedan fail", () => {
    const runovi = [
      { job_id: "digest", status: "fail", created_at: "2026-07-09T12:00:00Z" },
      { job_id: "digest", status: "ok", created_at: "2026-07-09T11:00:00Z" },
    ];
    expect(pronadjiUzastopneFailove(runovi, 2)).toHaveLength(0);
  });
});

describe("audit filter i CSV", () => {
  const akcije = [
    { tip: "nok3", opis: "test", created_at: "2026-07-09" },
    { tip: "ncr_zatvori", opis: "zatv", created_at: "2026-07-09" },
  ];

  it("filtrira po tipu", () => {
    expect(filtrirajAkcije(akcije, "nok3")).toHaveLength(1);
    expect(filtrirajAkcije(akcije, "sve")).toHaveLength(2);
  });

  it("generise CSV", () => {
    const csv = akcijeUcsv(akcije);
    expect(csv).toContain("nok3");
    expect(csv.split("\n").length).toBe(3);
  });
});
