/**

 * Koji dijagram (silueta vozila) za koji model.

 * Zone (K, M, T…) uvek crta aplikacija — u SVG/PNG ide samo oblík vozila, bez krugova.

 *

 * Ključ = delovi.id_deo ili delovi.vozilo_katalog_id (NTV-001…)

 * Vrednost = putanja u public/ (npr. /vozilo/dijagrami/NTV.png)

 * null = ugrađena limuzina u kodu (CarBodyDetailed)

 */



export const VOZILO_DIJAGRAMI = {

  default: null,



  "NTV-001": "/vozilo/dijagrami/NTV.png",

  NTV: "/vozilo/dijagrami/NTV.png",



  "MRAP-001": "/vozilo/dijagrami/MRAP.png",

  MRAP: "/vozilo/dijagrami/MRAP.png",



  "MRAP1-001": "/vozilo/dijagrami/MRAP1.png",

  MRAP1: "/vozilo/dijagrami/MRAP1.png",



  /** Legacy — civilni primeri */

  "FINAL-001": "/vozilo/dijagrami/auto-limuzina.svg",

  "AUTO-001": "/vozilo/dijagrami/auto-limuzina.svg",



  SUV: "/vozilo/dijagrami/suv.svg",

  "AUTO-SUV": "/vozilo/dijagrami/suv.svg",



  KAMION: "/vozilo/dijagrami/kamion.svg",

  "AUTO-KAMION": "/vozilo/dijagrami/kamion.svg",



  DZIP: "/vozilo/dijagrami/dzip.svg",

  "AUTO-DZIP": "/vozilo/dijagrami/dzip.svg",



  KOMBI: "/vozilo/dijagrami/kombi.svg",

  "AUTO-KOMBI": "/vozilo/dijagrami/kombi.svg",



  LIMUZINA: "/vozilo/dijagrami/auto-limuzina.svg",

};



const PREFIKS_DIJAGRAM = [

  ["MRAP1", "MRAP1-001"],

  ["MRAP", "MRAP-001"],

  ["NTV", "NTV-001"],

];



function kljucDijagrama(k) {

  const u = String(k || "").trim().toUpperCase();

  if (!u) return null;

  if (Object.prototype.hasOwnProperty.call(VOZILO_DIJAGRAMI, u)) return u;

  for (const [pref, mapKey] of PREFIKS_DIJAGRAM) {

    if (u === pref || u.startsWith(`${pref}-`)) return mapKey;

  }

  return null;

}



/** @param {{ vozilo_katalog_id?: string, id_deo?: string } | null | undefined} deo */

export function dijagramSrcZaDeo(deo) {

  if (!deo) return VOZILO_DIJAGRAMI.default;



  /** ID dela prvo — određuje siluetu vozila */

  const redosled = [deo.id_deo, deo.vozilo_katalog_id].filter(Boolean);

  for (const raw of redosled) {

    const k = kljucDijagrama(raw);

    if (k) return VOZILO_DIJAGRAMI[k];

  }



  return VOZILO_DIJAGRAMI.default;

}

