/**
 * Kanonske dropdown liste — izvor istine u kodu (pre DB dopune).
 */

/** Tačno 9 stavki iz glavni unos.xlsx — redosled fiksiran. */
export const REAKCIONI_KANON = [
  "Zaustavi proces",
  "Korekcija alata",
  "Podešavanje",
  "Odbaci deo",
  "Stop proizvodnje",
  "Korekcija",
  "Dorada",
  "Sortiranje",
  "Čišćenje",
];

/** Stare pogrešne stavke (ukloniti iz baze ako postoje). */
export const REAKCIONI_UKLONITI = [
  "Zaustavi liniju — obavesti šefa smene",
  "Karantin serije / lota",
  "Ponovno merenje (5 uzoraka)",
  "Korektivna akcija + 8D",
  "Kalibracija merila pre nastavka",
  "Odobrenje inženjera za nastavak proizvodnje",
  "Sortiranje / selekcija NOK komada",
];

export const JEDINICE_KANON = ["mm", "µm", "stepen", "deg", "%", "kom", "N·m", "kg", "Ra"];

/** Karakteristike sa ciframa / Ø ne idu u dropdown (npr. Otvor Ø10, Ø47…). */
export function karakteristikaImaBroj(naziv) {
  const s = String(naziv || "");
  return /[\d]/.test(s) || /Ø/.test(s);
}

export function filtrirajKarakteristikeBezBrojeva(lista) {
  return (lista || [])
    .map((v) => String(v || "").trim())
    .filter((v) => v && !karakteristikaImaBroj(v));
}

export function spojiKanonskuListu(kanon, ...dodatniIzvori) {
  const set = new Set(kanon);
  const out = [...kanon];
  for (const src of dodatniIzvori) {
    for (const v of src || []) {
      const s = String(v || "").trim();
      if (!s || set.has(s)) continue;
      set.add(s);
      out.push(s);
    }
  }
  return out;
}

export function reakcioniZaDropdown(dbVrednosti = []) {
  const dozvoljeno = new Set(REAKCIONI_KANON);
  const dodatno = (dbVrednosti || []).filter((v) => dozvoljeno.has(v));
  return spojiKanonskuListu(REAKCIONI_KANON, dodatno);
}

export function jediniceZaDropdown(dbVrednosti = [], izKarakteristika = []) {
  return spojiKanonskuListu(JEDINICE_KANON, dbVrednosti, izKarakteristika);
}

export function karakteristikeZaDropdown(seedLista = [], dbVrednosti = [], izKarakteristika = []) {
  const baza = filtrirajKarakteristikeBezBrojeva(seedLista);
  const izDb = filtrirajKarakteristikeBezBrojeva(dbVrednosti);
  const izKar = filtrirajKarakteristikeBezBrojeva(izKarakteristika);
  return spojiKanonskuListu(baza, izDb, izKar)
    .sort((a, b) => a.localeCompare(b, "sr"));
}

export function instrumentiZaDropdown(seedLista = [], dbVrednosti = [], izKarakteristika = []) {
  return spojiKanonskuListu(seedLista, dbVrednosti, izKarakteristika)
    .sort((a, b) => a.localeCompare(b, "sr"));
}
