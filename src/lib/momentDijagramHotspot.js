import hotspotData from "../data/momentDijagramHotspot.json";

export const PRIKAZ_EKRANA_KLJUCA = "Prikaz_ekrana_digitalnog_kljuca.svg";

/** Normalizuj Poz. br. za mapiranje (npr. "8/9" → ["8","9"]). */
export function pozKlucevi(pozBr) {
  const s = String(pozBr || "").trim();
  if (!s) return [];
  if (s.includes("/")) return s.split("/").map((x) => x.trim()).filter(Boolean);
  return [s];
}

export function imeDijagrama(putanja) {
  const ime = String(putanja || "").trim();
  if (!ime) return null;
  return ime.split("/").pop().split("\\").pop();
}

export function hotspotZaPoz(dijagram, pozBr) {
  const fajl = imeDijagrama(dijagram);
  if (!fajl || !hotspotData[fajl]) return [];
  const mapa = hotspotData[fajl].pozicije || {};
  const kljucevi = pozKlucevi(pozBr);
  const tacke = [];
  for (const k of kljucevi) {
    const lista = mapa[k];
    if (lista) tacke.push(...lista.map(([x, y]) => ({ x, y, poz: k })));
  }
  if (!tacke.length && mapa[pozBr]) {
    tacke.push(...mapa[pozBr].map(([x, y]) => ({ x, y, poz: pozBr })));
  }
  return tacke;
}

export function viewBoxDijagrama(dijagram) {
  const fajl = imeDijagrama(dijagram);
  return hotspotData[fajl]?.viewBox || [1000, 760];
}
