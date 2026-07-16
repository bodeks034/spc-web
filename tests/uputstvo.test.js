import { describe, it, expect } from "vitest";
import { jednostavanMdUHtml } from "../src/lib/uputstvoRender.js";
import { dokumentiZaUlogu } from "../src/lib/uputstvoKatalog.js";

describe("uputstvoRender", () => {
  it("pretvara naslov, listu i tabelu", () => {
    const html = jednostavanMdUHtml("# Test\n\n- stavka 1\n- stavka 2\n\n| A | B |\n|---|---|\n| 1 | 2 |\n");
    expect(html).toContain("<h1>Test</h1>");
    expect(html).toContain("<li>stavka 1</li>");
    expect(html).toContain("<table class=\"u-tab\">");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<td>1</td>");
  });
});

describe("uputstvoKatalog", () => {
  it("operator vidi samo Obuku Modul 1 (bez Korišćenje aplikacije)", () => {
    const d = dokumentiZaUlogu("operator");
    expect(d.map((x) => x.id)).toEqual(["operater-modul1"]);
    expect(d[0].tip).toBe("html");
    expect(d.some((x) => x.kategorija === "koriscenje")).toBe(false);
    expect(d.some((x) => x.id === "koriscenje-app")).toBe(false);
    expect(d.some((x) => x.id === "inzenjer-modul2")).toBe(false);
  });

  it("kontrolor vidi isto što i operator", () => {
    const op = dokumentiZaUlogu("operator").map((x) => x.id);
    const ko = dokumentiZaUlogu("kontrolor").map((x) => x.id);
    expect(ko).toEqual(op);
  });

  it("kvalitet vidi inzenjer modul2 kao HTML", () => {
    const d = dokumentiZaUlogu("kvalitet");
    const m2 = d.find((x) => x.id === "inzenjer-modul2");
    expect(m2?.tip).toBe("html");
    expect(m2?.fajl).toContain("/obuka-paket/OBUKA_INZENJER_MODUL2.html");
    expect(d.some((x) => x.id === "operater-modul1")).toBe(true);
  });

  it("admin vidi ERP", () => {
    const d = dokumentiZaUlogu("admin");
    expect(d.some((x) => x.id === "erp-konfig")).toBe(true);
  });
});
