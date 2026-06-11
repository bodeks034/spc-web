/** Oznake pogona A–H (fabrika). */
export const POGONI = [
  { kod: "A", naziv: "Ulazna kontrola" },
  { kod: "B", naziv: "Preseraj" },
  { kod: "C", naziv: "Karoserija" },
  { kod: "D", naziv: "Lakirnica" },
  { kod: "E", naziv: "Montaža" },
  { kod: "F", naziv: "Finalna kontrola" },
  { kod: "G", naziv: "Mašinska obrada" },
  { kod: "H", naziv: "Alatnica" },
];

const MAP = Object.fromEntries(POGONI.map((p) => [p.kod, p.naziv]));

/** Kratko za dugmad na tel/tablet (jedna reč gde je moguće). */
const KRATKO = {
  A: "Ulazna",
  B: "Preseraj",
  C: "Karoserija",
  D: "Lakirnica",
  E: "Montaža",
  F: "Finalna",
  G: "Mašinska",
  H: "Alatnica",
};

/** Još kraće za uske ćelije (telefon, 4 kolone). */
const MIKRO = {
  A: "Ulazna",
  B: "Preseraj",
  C: "Karoser.",
  D: "Lakir.",
  E: "Montaža",
  F: "Finalna",
  G: "Mašins.",
  H: "Alatnica",
};

export function nazivPogona(kod) {
  return MAP[String(kod || "").trim().toUpperCase()] || "";
}

export function kratakNazivPogona(kod, { mikro = false } = {}) {
  const k = String(kod || "").trim().toUpperCase();
  const tab = mikro ? MIKRO : KRATKO;
  return tab[k] || nazivPogona(k).split(" ")[0] || k;
}

export function jeValidanPogon(kod) {
  return !!nazivPogona(kod);
}
