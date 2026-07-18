import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  dekodujErpBajtove,
  erpUlazUCsvTekst,
  jeErpUlazniFajl,
  skiniErpEkstenziju,
  xlsxBufferToCsvText,
} from "../src/lib/erpCsvIo.js";
import { fajlOdgovaraEntitetu } from "../src/lib/erpUvozCore.js";
import { normalizujDatum, parseCsvText } from "../src/lib/radniNaloziUvoz.js";
import sapPreset from "../config/erp/presets/sap.json" with { type: "json" };

function encodeWindows1250(str) {
  // TextEncoder ne podržava windows-1250 — ručno mapiranje srpskih slova.
  const map = {
    Š: 0x8a, š: 0x9a, Ž: 0x8e, ž: 0x9e, Č: 0xc8, č: 0xe8,
    Ć: 0xc6, ć: 0xe6, Đ: 0xd0, đ: 0xf0,
  };
  const out = [];
  for (const ch of str) {
    if (map[ch] != null) out.push(map[ch]);
    else out.push(ch.charCodeAt(0) & 0xff);
  }
  return new Uint8Array(out);
}

describe("ERP encoding + XLSX ulaz", () => {
  it("prepoznaje CSV i XLSX ekstenzije", () => {
    expect(jeErpUlazniFajl("delovi.csv")).toBe(true);
    expect(jeErpUlazniFajl("04_Delovi.xlsx")).toBe(true);
    expect(jeErpUlazniFajl("readme.txt")).toBe(false);
    expect(skiniErpEkstenziju("04_Delovi.xlsx")).toBe("04_Delovi");
  });

  it("fajlOdgovaraEntitetu izjednačava .csv i .xlsx", () => {
    expect(fajlOdgovaraEntitetu("04_Delovi.xlsx", sapPreset.entiteti.delovi)).toBe(true);
    expect(fajlOdgovaraEntitetu("delovi.xls", sapPreset.entiteti.delovi)).toBe(true);
    expect(fajlOdgovaraEntitetu("16_Merila.xlsx", sapPreset.entiteti.merila)).toBe(true);
  });

  it("dekoduje Windows-1250 sa srpskim dijakriticima", () => {
    const bytes = encodeWindows1250("SifraDela;NazivDela\nD-1;Nosač rezervoara\n");
    const { text, encoding } = dekodujErpBajtove(bytes);
    expect(encoding).toBe("windows-1250");
    expect(text).toContain("Nosač");
    const rows = parseCsvText(text);
    expect(rows[0].naziv_dela).toBe("Nosač rezervoara");
  });

  it("zadržava ispravan UTF-8", () => {
    const utf8 = new TextEncoder().encode("SifraDela,NazivDela\nD-1,Nosač\n");
    const { text, encoding } = dekodujErpBajtove(utf8);
    expect(encoding).toBe("utf-8");
    expect(text).toContain("Nosač");
  });

  it("konvertuje XLSX u CSV tekst", () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["SifraDela", "NazivDela", "Masa"],
      ["RTB-001", "Nosač", 2.45],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Delovi");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const csv = xlsxBufferToCsvText(buf);
    expect(csv).toMatch(/SifraDela/);
    expect(csv).toMatch(/RTB-001/);
    const { text, format } = erpUlazUCsvTekst(buf, "04_Delovi.xlsx");
    expect(format).toBe("xlsx");
    expect(text).toContain("RTB-001");
  });
});

describe("ERP datumi", () => {
  it("prihvata ISO i tačku", () => {
    expect(normalizujDatum("2026-07-18")).toBe("2026-07-18");
    expect(normalizujDatum("18.07.2026")).toBe("2026-07-18");
  });

  it("prihvata DD/MM i MM/DD kad je nedvosmisleno", () => {
    expect(normalizujDatum("18/07/2026")).toBe("2026-07-18");
    expect(normalizujDatum("07/18/2026")).toBe("2026-07-18");
    expect(normalizujDatum("18-07-2026")).toBe("2026-07-18");
  });

  it("ambiguous 01/02/2026 → evropski DD/MM", () => {
    expect(normalizujDatum("01/02/2026")).toBe("2026-02-01");
  });

  it("Excel serijal → ISO", () => {
    // 2026-07-18 ≈ Excel serial 46221 (provera relativno)
    expect(normalizujDatum("46221")).toMatch(/^2026-07-/);
  });
});
