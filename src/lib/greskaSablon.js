/** Šabloni tipičnih grešaka za brzi unos posle Glavnog unosa. */
import { upsertGreskaKatalog } from "./sifrarnikApi.js";

export const SABLON_GRESKE_OPSTI = [
  { kategorija: "POVRŠINA", podkategorija: "Oštećenje", defekt: "Ogrebanost", opis: "Vidljiva ogrebotina" },
  { kategorija: "POVRŠINA", podkategorija: "Oštećenje", defekt: "Udubljenje", opis: "Udubljenje / pritisak" },
  { kategorija: "DIMENZIJE", podkategorija: "Van tolerancije", defekt: "Van specifikacije", opis: "Merljiva van granice" },
  { kategorija: "MATERIJAL", podkategorija: "Neusaglašenost", defekt: "Pogrešan materijal", opis: "" },
  { kategorija: "OSTALO", podkategorija: "Vizuelno", defekt: "Ostala neusaglašenost", opis: "" },
];

export const SABLON_GRESKE_VOZILO = [
  { kategorija: "KAROSERIJA", podkategorija: "Površina", defekt: "Ogrebanost laka", opis: "Zona na dijagramu" },
  { kategorija: "KAROSERIJA", podkategorija: "Ulegnuće", defekt: "Udubljenje", opis: "" },
  { kategorija: "STAKLA", podkategorija: "Oštećenje", defekt: "Pukotina / ogrebotina", opis: "" },
  { kategorija: "ENTERIJER", podkategorija: "Montaža", defekt: "Loš spoj", opis: "" },
  { kategorija: "FUNKCIJA", podkategorija: "Test", defekt: "Ne radi funkcija", opis: "Finalna kontrola" },
];

/**
 * @param {string} idDeo
 * @param {{ pogonKod?: string, vozilo?: boolean }} opts
 */
export async function dodajSablonGresaka(idDeo, { pogonKod = "A", vozilo = false } = {}) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) throw new Error("ID dela je obavezan za šablon grešaka.");

  const sablon = vozilo ? SABLON_GRESKE_VOZILO : SABLON_GRESKE_OPSTI;
  let n = 0;
  for (const g of sablon) {
    await upsertGreskaKatalog({
      ...g,
      id_deo: id,
      pogon_kod: vozilo ? "" : (pogonKod || "A"),
    });
    n += 1;
  }
  return n;
}
