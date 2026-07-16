/**
 * Uporedba inženjerskog lista sa legendom u dijagram SVG + komplet šifrarnikom.
 */
import komplet from "../data/momentKljucKomplet.json" with { type: "json" };
import { imeDijagrama, pozKlucevi } from "./momentDijagramHotspot.js";

/** dijagram → poz_br → { klasifikacija, opis, cilj_nm? } iz komplet seed-a. */
function izgradiLegendaMapu() {
  const mapa = new Map();
  for (const job of komplet.jobs || []) {
    const dij = job.dijagram_fajl || job.dijagram;
    if (!dij) continue;
    const fajl = imeDijagrama(dij);
    if (!mapa.has(fajl)) mapa.set(fajl, new Map());
    const pozMap = mapa.get(fajl);
    for (const p of job.pozicije || []) {
      if (!p.poz_br) continue;
      pozMap.set(String(p.poz_br), {
        klasifikacija: (p.klasifikacija || "STD").toUpperCase(),
        opis: p.opis || "",
      });
    }
    for (const k of job.koraci || []) {
      if (!k.poz_br) continue;
      const pb = String(k.poz_br);
      const postojeci = pozMap.get(pb) || {};
      pozMap.set(pb, {
        klasifikacija: (k.klasifikacija || postojeci.klasifikacija || "STD").toUpperCase(),
        opis: postojeci.opis || "",
        cilj_nm: k.cilj_nm != null ? Number(k.cilj_nm) : postojeci.cilj_nm,
        prolaz: k.prolaz,
      });
    }
  }
  return mapa;
}

let _legendaCache = null;
function legendaMapa() {
  if (!_legendaCache) _legendaCache = izgradiLegendaMapu();
  return _legendaCache;
}

function nadjiReferencu(fajl, pozBr) {
  const pozMap = legendaMapa().get(fajl);
  if (!pozMap) return null;
  for (const k of pozKlucevi(pozBr)) {
    if (pozMap.has(k)) return { poz: k, ...pozMap.get(k) };
  }
  return pozMap.get(String(pozBr)) ? { poz: pozBr, ...pozMap.get(String(pozBr)) } : null;
}

/** Vraća listu upozorenja (string) za jedan red lista. */
export function validirajMomentRedPremaDijagramu(red) {
  const upozorenja = [];
  const dij = imeDijagrama(red?.dijagram);
  if (!dij || !red?.poz_br) return upozorenja;

  const ref = nadjiReferencu(dij, red.poz_br);
  if (!ref) {
    upozorenja.push(`Poz. ${red.poz_br} nije u legendi dijagrama ${dij}`);
    return upozorenja;
  }

  const klasa = String(red.klasifikacija || "").trim().toUpperCase();
  if (klasa && ref.klasifikacija && klasa !== ref.klasifikacija) {
    upozorenja.push(
      `Poz. ${red.poz_br}: klasifikacija ${klasa} ≠ legende ${ref.klasifikacija} (${dij})`,
    );
  }

  const cilj = Number(red.cilj_nm);
  if (Number.isFinite(cilj) && ref.cilj_nm != null && Number.isFinite(ref.cilj_nm)) {
    const refNm = Number(ref.cilj_nm);
    if (Math.abs(cilj - refNm) > 0.5) {
      upozorenja.push(
        `Poz. ${red.poz_br}: cilj ${cilj} Nm ≠ referentnih ${refNm} Nm (${dij})`,
      );
    }
  }

  return upozorenja;
}

/** Validacija cele liste — vraća { upozorenja, brojProvera }. */
export function validirajMomentListu(redovi) {
  const upozorenja = [];
  for (let i = 0; i < (redovi || []).length; i++) {
    const w = validirajMomentRedPremaDijagramu(redovi[i]);
    for (const msg of w) {
      upozorenja.push(`Red ${i + 1}: ${msg}`);
    }
  }
  return { upozorenja, brojProvera: (redovi || []).length };
}
