import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPosaljiAuto = vi.fn().mockResolvedValue({ preskoceno: false });

vi.mock("../src/lib/autoObavestenja.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, posaljiAutoObavestenje: (...args) => mockPosaljiAuto(...args) };
});

describe("obavestiNcrLinija", () => {
  beforeEach(() => {
    mockPosaljiAuto.mockClear();
  });

  it("šalje obaveštenje za novi NCR sa linije", async () => {
    const { obavestiNcrLinija } = await import("../src/lib/autoAkcije.js");
    const supabase = {
      from(table) {
        if (table === "app_podesavanja") {
          return { select: () => Promise.resolve({ data: [] }) };
        }
        if (table === "auto_akcije_log") {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 1 }, error: null }),
              }),
            }),
          };
        }
        return { select: () => Promise.resolve({ data: [] }) };
      },
    };
    const rez = await obavestiNcrLinija(supabase, {
      id: 99,
      broj_ncr: "NCR-2026-0099",
      id_deo: "NM-001",
      linija: "Preseraj",
      ozbiljnost: "High",
      opis: "Dimenzija van tolerancije",
      detektovao: "Petar P.",
    }, { linija: "Preseraj" });
    expect(rez.ok).toBe(true);
    expect(mockPosaljiAuto).toHaveBeenCalledTimes(1);
    const alarm = mockPosaljiAuto.mock.calls[0][2];
    expect(alarm.id).toBe("auto_ncr_linija_99");
    expect(alarm.naslov).toContain("NCR sa linije");
    expect(alarm.opis).toContain("NM-001");
    expect(alarm.nivo).toBe("visok");
  });

  it("preskače bez id", async () => {
    const { obavestiNcrLinija } = await import("../src/lib/autoAkcije.js");
    const rez = await obavestiNcrLinija({}, {});
    expect(rez.ok).toBe(false);
    expect(mockPosaljiAuto).not.toHaveBeenCalled();
  });
});
