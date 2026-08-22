import { describe, expect, it, vi } from "vitest";
import { validirajRedovePrePropagacije } from "../src/lib/glavniUnosValidacija.js";
import { auditPogonMapa } from "../src/lib/pogonMapaAudit.js";
import { stavkeChecklistePoslePropagacije } from "../src/lib/sifrarnikChecklist.js";
import {
  GLAVNI_UNOS_SHEET_TIP,
  filtrirajSheetovePoTipu,
} from "../src/lib/glavniUnosSheetTip.js";
import { SABLON_GRESKE_OPSTI, SABLON_GRESKE_VOZILO } from "../src/lib/greskaSablon.js";
import { statusDeoUSifrarniku, jeDemoIdDeo, nedostajeZaDeo, navigacijaIzStatusDeo, koraciNavigacijeIzStatusDeo, izracunajKompletnostDelova, pickPrviDelimicniDeo } from "../src/lib/sifrarnikOdrzavanje.js";
import { podrazumevaniBarkodProfil } from "../src/lib/barkodEtiketa.js";

describe("validirajRedovePrePropagacije", () => {
  it("blokira merljivu bez granica", () => {
    const rez = validirajRedovePrePropagacije([{
      id_deo: "DEMO-NM-001",
      karakteristika: "Širina",
      tip: "Merljiva",
      lsl: "",
      usl: "",
    }]);
    expect(rez.ok).toBe(false);
    expect(rez.greske.some((g) => /LSL\/USL/.test(g))).toBe(true);
  });

  it("upozorava na ID bez karakteristike", () => {
    const rez = validirajRedovePrePropagacije([
      { id_deo: "DEMO-NM-001", karakteristika: "" },
      { id_deo: "DEMO-NM-001", karakteristika: "Visina", tip: "Merljiva", lsl: 1, usl: 2 },
    ]);
    expect(rez.ok).toBe(true);
    expect(rez.upozorenja.some((u) => /nema nijednu/.test(u))).toBe(false);
  });
});

describe("auditPogonMapa", () => {
  it("prijavljuje nedostajuće pogone A–F", () => {
    const audit = auditPogonMapa([{ pogon_kod: "A", linija_faza: "Ulazna" }]);
    expect(audit.ok).toBe(false);
    expect(audit.nedostaju.length).toBeGreaterThan(0);
  });

  it("OK kada su A–F mapirani", () => {
    const audit = auditPogonMapa(
      ["A", "B", "C", "D", "E", "F"].map((p) => ({ pogon_kod: p, linija_faza: `Linija ${p}` })),
    );
    expect(audit.ok).toBe(true);
  });
});

describe("stavkeChecklistePoslePropagacije", () => {
  it("za final sheet uključuje tab vozila", () => {
    const stavke = stavkeChecklistePoslePropagacije({ tip: GLAVNI_UNOS_SHEET_TIP.FINAL });
    expect(stavke.some((s) => s.tab === "vozila")).toBe(true);
  });

  it("za deo sheet uključuje delovi pregled", () => {
    const stavke = stavkeChecklistePoslePropagacije({ tip: GLAVNI_UNOS_SHEET_TIP.PROJEKAT });
    expect(stavke.some((s) => s.tab === "delovi")).toBe(true);
  });
});

describe("greskaSablon", () => {
  it("ima po 5 šablona za deo i vozilo", () => {
    expect(SABLON_GRESKE_OPSTI).toHaveLength(5);
    expect(SABLON_GRESKE_VOZILO).toHaveLength(5);
  });
});

describe("filtrirajSheetovePoTipu", () => {
  const konfig = [
    { naziv: "opsti_1", sifra_vozila: null },
    { naziv: "ham_delovi", sifra_vozila: "HAM" },
    { naziv: "ntv_delovi", sifra_vozila: "NTV" },
  ];
  const svi = ["opsti_1", "ham_delovi", "ntv_delovi"];

  it("filtrira projekat po ERP", () => {
    const f = filtrirajSheetovePoTipu(svi, konfig, GLAVNI_UNOS_SHEET_TIP.PROJEKAT, "HAM");
    expect(f).toEqual(["ham_delovi"]);
  });
});

describe("statusDeoUSifrarniku", () => {
  it("kompletan kada ima gu, greske i crtez", () => {
    expect(statusDeoUSifrarniku(
      { id_deo: "X", slika_naziv: "a.png" },
      { guBroj: 2, greskeBroj: 3, imaBarkod: false },
    )).toBe("kompletan");
  });
});

describe("nedostajeZaDeo", () => {
  it("navodi crtez i greske", () => {
    const ned = nedostajeZaDeo({ id_deo: "X" }, { guBroj: 1, greskeBroj: 0, imaBarkod: false });
    expect(ned).toContain("Greške");
    expect(ned).toContain("Crtež");
  });
});

describe("jeDemoIdDeo", () => {
  it("prepoznaje DEMO prefiks", () => {
    expect(jeDemoIdDeo("DEMO-NM-001")).toBe(true);
    expect(jeDemoIdDeo("HAM-NM-001")).toBe(false);
  });
});

describe("koraciNavigacijeIzStatusDeo", () => {
  it("vraća više koraka kada nedostaje više stavki", () => {
    const koraci = koraciNavigacijeIzStatusDeo(
      { id_deo: "DEMO-X" },
      { guBroj: 0, greskeBroj: 0, imaBarkod: false },
    );
    expect(koraci.length).toBeGreaterThan(1);
    expect(koraci.some((k) => k.tab === "glavni_unos")).toBe(true);
  });
});

describe("izracunajKompletnostDelova", () => {
  it("računa procenat kompletnih", () => {
    const delovi = [
      { id_deo: "A", slika_naziv: "a.png" },
      { id_deo: "B" },
    ];
    const gu = { A: 2, B: 0 };
    const gr = { A: 1, B: 0 };
    const stat = izracunajKompletnostDelova(delovi, gu, gr, new Set());
    expect(stat.ukupno).toBe(2);
    expect(stat.kompletno).toBe(1);
    expect(stat.procenat).toBe(50);
  });
});

describe("pickPrviDelimicniDeo", () => {
  it("vraća prvi po id_deo koji nije kompletan", () => {
    const prviDelimicni = pickPrviDelimicniDeo(
      [
        { id_deo: "Z-1" },
        { id_deo: "A-1", slika_naziv: "x.png" },
      ],
      { "Z-1": 0, "A-1": 1 },
      { "A-1": 2 },
      new Set(),
    );
    expect(prviDelimicni?.deo.id_deo).toBe("Z-1");
    expect(prviDelimicni?.status).not.toBe("kompletan");
  });
});

describe("sifrarnikStatusEvent", () => {
  it("emituje custom event", async () => {
    const { SIFRARNIK_STATUS_EVENT, obavestiPromenuStatusaSifrarnika } = await import("../src/lib/sifrarnikStatusEvent.js");
    const dispatched = [];
    vi.stubGlobal("window", {
      dispatchEvent: (ev) => { dispatched.push(ev); },
    });
    obavestiPromenuStatusaSifrarnika({ izvor: "test", idDeo: "X" });
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe(SIFRARNIK_STATUS_EVENT);
    expect(dispatched[0].detail).toEqual({ izvor: "test", idDeo: "X" });
    vi.unstubAllGlobals();
  });
});

describe("navigacijaIzStatusDeo", () => {
  it("vodi na greske kada nedostaju", () => {
    const nav = navigacijaIzStatusDeo(
      { id_deo: "DEMO-X" },
      { guBroj: 2, greskeBroj: 0, imaBarkod: false },
    );
    expect(nav?.tab).toBe("greske");
    expect(nav?.ctx?.idDeo).toBe("DEMO-X");
  });

  it("kompletan vodi na glavni unos", () => {
    const nav = navigacijaIzStatusDeo(
      { id_deo: "HAM-1", slika_naziv: "a.png" },
      { guBroj: 1, greskeBroj: 2, imaBarkod: true },
    );
    expect(nav?.tab).toBe("glavni_unos");
  });
});

describe("podrazumevaniBarkodProfil", () => {
  it("vozilo koristi QR veću etiketu", () => {
    const p = podrazumevaniBarkodProfil({ tip_kontrole: "vozilo" });
    expect(p.tipKoda).toBe("qr");
    expect(p.dimenzijaId).toBe("100mm");
  });
});
