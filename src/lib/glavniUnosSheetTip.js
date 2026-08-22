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

/** Poruka posle propagacije — šta još ručno. */
export function checklistPoslePropagacije(analiza) {
  const zajednicko = [
    "Katalog grešaka (Modul 0 → Atributivne)",
    "Crtež / slika dela",
    "Test skena na Modul 1",
  ];
  if (analiza.tip === GLAVNI_UNOS_SHEET_TIP.FINAL) {
    return [
      "Tip vozila + dijagram (Modul 0 → Celo vozilo)",
      "Defekti po zonama (katalog vozila)",
      ...zajednicko.slice(1),
    ];
  }
  return zajednicko;
}
