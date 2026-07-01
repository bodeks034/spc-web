/**
 * Pogon slovo (A–I) + naziv linije/faze.
 * Izvor: pogon_linija_mapa (tab pogon_kod u glavni unos.xlsx).
 */
import { LINIJA_FAZA_POGON_DEFAULT } from "./pogonLinijaLookup.js";

const POGON_LINIJA_DEFAULT = {
  A: "Ulazna kontrola",
  B: "Preseraj",
  C: "Karoserija",
  D: "Lakirnica",
  E: "Montaža",
  F: "Završna",
  G: "Mašinska obrada",
  H: "Alatnica",
  I: "Logistika",
};

/** linija_faza → pogon_kod redovi iz baze → Map(pogon → linija). */
export function pogonMapaIzRedova(rows) {
  const map = new Map(Object.entries(POGON_LINIJA_DEFAULT));

  for (const [linija, kod] of Object.entries(LINIJA_FAZA_POGON_DEFAULT)) {
    const k = String(kod || "").trim().toUpperCase();
    if (k && !map.has(k)) map.set(k, linija);
  }

  for (const r of rows || []) {
    const kod = String(r.pogon_kod || r["pogon kod"] || "").trim().toUpperCase();
    const linija = String(r.linija_faza || r.linija || "").trim();
    if (kod && linija) map.set(kod, linija);
  }

  return map;
}

export function formatPogonOznaka(kod, poKodu) {
  const k = String(kod || "").trim().toUpperCase();
  if (!k) return "—";
  const map = poKodu instanceof Map ? poKodu : pogonMapaIzRedova([]);
  const linija = map.get(k);
  return linija ? `${k} — ${linija}` : k;
}

/** Za &lt;select&gt;: [{ value: 'A', label: 'A — Ulazna kontrola' }, …] */
export function pogonSelectOpcije(poKodu) {
  const map = poKodu instanceof Map ? poKodu : pogonMapaIzRedova(poKodu);
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, linija]) => ({
      value,
      label: `${value} — ${linija}`,
      linija,
    }));
}
