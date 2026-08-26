/**
 * Tip glavnog unos sheeta — opšti delovi / komponente projekta / celo vozilo.
 * Bez nove kolone u bazi: koristi sifra_vozila + sadržaj redova.
 */

export const GLAVNI_UNOS_SHEET_TIP = {
  OPSTI: "opsti",
  PROJEKAT: "projekat",
  FINAL: "final",
};

/** Isti kriterijum kao metaDeoIzGlavnogUnosa — red za finalnu kontrolu vozila. */
export function jeRedCeloVozilo(row) {
  const tip = String(row?.tip || "").toLowerCase();
  const kar = String(row?.karakteristika || "").toLowerCase();
  return tip.includes("vozilo")
    || /celog vozila|celo vozilo|finalna vizuelna kontrola/.test(kar);
}

/** @param {Array} redovi @param {{ sifra_vozila?: string | null, naziv?: string }} konfig */
export function analizaSheeta(redovi, konfig = {}) {
  const sifra = String(konfig.sifra_vozila || "").trim().toUpperCase() || null;
  const naziv = String(konfig.naziv || "").toLowerCase();
  const imaVoziloRed = (redovi || []).some(jeRedCeloVozilo);

  if (imaVoziloRed || /_final\b|final/i.test(naziv)) {
    return {
      tip: GLAVNI_UNOS_SHEET_TIP.FINAL,
      sifra_vozila: sifra,
      kratko: sifra ? `${sifra} · celo vozilo` : "Celo vozilo",
      opis: "Finalna kontrola — tip_kontrole=vozilo, dijagram + zone.",
    };
  }
  if (sifra) {
    return {
      tip: GLAVNI_UNOS_SHEET_TIP.PROJEKAT,
      sifra_vozila: sifra,
      kratko: `${sifra} · komponente`,
      opis: "Delovi projekta — tip_kontrole=deo, ERP veza preko šifre vozila.",
    };
  }
  return {
    tip: GLAVNI_UNOS_SHEET_TIP.OPSTI,
    sifra_vozila: null,
    kratko: "Opšti delovi",
    opis: "Nije vezano za vozilo — zavrtnji, lim, dobavljački materijal.",
  };
}

/** Predlog imena sheeta pri kreiranju. */
export function predlogNazivaSheeta(tipSheeta, sifraVozila, postojeciSheetovi = []) {
  const n = (postojeciSheetovi.length || 0) + 1;
  const erp = String(sifraVozila || "").trim().toLowerCase();
  if (tipSheeta === GLAVNI_UNOS_SHEET_TIP.FINAL) {
    return erp ? `${erp}_final` : `final_${n}`;
  }
  if (tipSheeta === GLAVNI_UNOS_SHEET_TIP.PROJEKAT) {
    return erp ? `${erp}_delovi` : `vozilo${n}`;
  }
  return `opsti_${n}`;
}

/** Sheetovi koji odgovaraju tipu / ERP u čarobnjaku. */
export function filtrirajSheetovePoTipu(sheetovi, konfiguracije, tipSheeta, sifraVozila = "") {
  const erp = String(sifraVozila || "").trim().toUpperCase();
  return (sheetovi || []).filter((naziv) => {
    const konfig = (konfiguracije || []).find((r) => r.naziv === naziv);
    const analiza = analizaSheeta([], { ...konfig, naziv });
    if (tipSheeta === GLAVNI_UNOS_SHEET_TIP.OPSTI) {
      return analiza.tip === GLAVNI_UNOS_SHEET_TIP.OPSTI;
    }
    if (tipSheeta === GLAVNI_UNOS_SHEET_TIP.FINAL) {
      return analiza.tip === GLAVNI_UNOS_SHEET_TIP.FINAL
        && (!erp || analiza.sifra_vozila === erp);
    }
    if (tipSheeta === GLAVNI_UNOS_SHEET_TIP.PROJEKAT) {
      return analiza.tip === GLAVNI_UNOS_SHEET_TIP.PROJEKAT
        && (!erp || analiza.sifra_vozila === erp);
    }
    return true;
  });
}

/** Poruka posle propagacije — šta još ručno. */
export function checklistPoslePropagacije(analiza) {
  const zajednicko = [
    "Katalog grešaka (Modul 0 → Atributivne)",
    "Crtež / slika dela",
    "Test skena na Modul 1",
  ];
  if (analiza.tip === GLAVNI_UNOS_SHEET_TIP.FINAL) {
    return [
      "Tip vozila + dijagram (Modul 0 → Linije proizvoda)",
      "Defekti po zonama (katalog vozila)",
      ...zajednicko.slice(1),
    ];
  }
  return zajednicko;
}

export const SHEET_GRUPA = {
  OPSTI: "opsti",
  VOZILO: "vozilo",
  PROIZVOD: "proizvod",
  LEGACY: "legacy",
};

/** Parsira voz-01_delovi, pro-02_final, opsti_1, vozilo1… */
export function metaSheetNaziva(naziv) {
  const n = String(naziv || "").toLowerCase();
  let m = n.match(/^voz-(\d+)_(delovi|final)$/);
  if (m) {
    return {
      grupa: SHEET_GRUPA.VOZILO,
      kod: `VOZ-${String(m[1]).padStart(2, "0")}`,
      vrsta: m[2],
      naziv: n,
    };
  }
  m = n.match(/^pro-(\d+)_(delovi|final)$/);
  if (m) {
    return {
      grupa: SHEET_GRUPA.PROIZVOD,
      kod: `PRO-${String(m[1]).padStart(2, "0")}`,
      vrsta: m[2],
      naziv: n,
    };
  }
  if (/^opsti/.test(n)) {
    return { grupa: SHEET_GRUPA.OPSTI, kod: null, vrsta: "delovi", naziv: n };
  }
  return { grupa: SHEET_GRUPA.LEGACY, kod: null, vrsta: null, naziv: n };
}

/** Grupiše sheetove po liniji — za kompaktan UI umesto 40+ dugmadi. */
export function grupisiSheetovePoLiniji(sheetovi = []) {
  const opsti = [];
  const vozila = new Map();
  const proizvodi = new Map();
  const legacy = [];

  for (const naziv of sheetovi) {
    const meta = metaSheetNaziva(naziv);
    if (meta.grupa === SHEET_GRUPA.OPSTI) {
      opsti.push(naziv);
      continue;
    }
    if (meta.grupa === SHEET_GRUPA.VOZILO) {
      if (!vozila.has(meta.kod)) vozila.set(meta.kod, { delovi: null, final: null });
      const slot = vozila.get(meta.kod);
      if (meta.vrsta === "final") slot.final = naziv;
      else slot.delovi = naziv;
      continue;
    }
    if (meta.grupa === SHEET_GRUPA.PROIZVOD) {
      if (!proizvodi.has(meta.kod)) proizvodi.set(meta.kod, { delovi: null, final: null });
      const slot = proizvodi.get(meta.kod);
      if (meta.vrsta === "final") slot.final = naziv;
      else slot.delovi = naziv;
      continue;
    }
    legacy.push(naziv);
  }

  const sortKod = (a, b) => a[0].localeCompare(b[0], undefined, { numeric: true });
  return {
    opsti,
    vozila: [...vozila.entries()].sort(sortKod),
    proizvodi: [...proizvodi.entries()].sort(sortKod),
    legacy,
  };
}

/** Ključ linije za dropdown: opsti:opsti_1, voz:VOZ-01, pro:PRO-02, legacy:vozilo1 */
export function kljucLinijeSheeta(meta, naziv) {
  if (meta.grupa === SHEET_GRUPA.OPSTI) return `opsti:${naziv}`;
  if (meta.grupa === SHEET_GRUPA.VOZILO) return `voz:${meta.kod}`;
  if (meta.grupa === SHEET_GRUPA.PROIZVOD) return `pro:${meta.kod}`;
  return `legacy:${naziv}`;
}

export function sheetIzKljucaLinije(kljuc, vrsta, grupe) {
  if (!kljuc) return null;
  const [tip, id] = kljuc.split(":");
  if (tip === "opsti") return id;
  if (tip === "voz") {
    const par = grupe.vozila.find(([k]) => k === id);
    return par ? (vrsta === "final" ? par[1].final : par[1].delovi) || par[1].delovi || par[1].final : null;
  }
  if (tip === "pro") {
    const par = grupe.proizvodi.find(([k]) => k === id);
    return par ? (vrsta === "final" ? par[1].final : par[1].delovi) || par[1].delovi || par[1].final : null;
  }
  if (tip === "legacy") return id;
  return null;
}

export function kljucLinijeIzSheeta(naziv, grupe) {
  const meta = metaSheetNaziva(naziv);
  if (meta.grupa === SHEET_GRUPA.OPSTI) {
    return grupe.opsti.includes(naziv) ? kljucLinijeSheeta(meta, naziv) : null;
  }
  if (meta.grupa === SHEET_GRUPA.VOZILO) return `voz:${meta.kod}`;
  if (meta.grupa === SHEET_GRUPA.PROIZVOD) return `pro:${meta.kod}`;
  if (grupe.legacy.includes(naziv)) return `legacy:${naziv}`;
  return null;
}
