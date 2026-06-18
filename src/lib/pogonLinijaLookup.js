/**
 * Mapiranje linija_faza → pogon_kod.
 * Izvor istine: tab pogon_kod u glavni unos.xlsx (sync postavlja runtime mapu).
 */

/** Podrazumevano (kad nema glavnog unosa) — usklađeno sa tabom pogon_kod. */
export const LINIJA_FAZA_POGON_DEFAULT = {
  "Ulazna kontrola": "A",
  Preseraj: "B",
  Karoserija: "C",
  Lakirnica: "D",
  "Montaža": "E",
  Montaza: "E",
  "Završna": "F",
  Zavrsna: "F",
  "Masinska obrada": "G",
  "Mašinska obrada": "G",
  Alatnica: "H",
};

let runtimeMap = null;

/** Postavi mapu iz glavnog unosa (tab pogon_kod) — poziva sync skripta. */
export function setPogonLinijaMap(map) {
  if (!map || typeof map !== "object") {
    runtimeMap = null;
    return;
  }
  runtimeMap = { ...map };
}

/** Iz buildGlavniUnosLookups().pogonByLinija (Map). */
export function pogonLinijaMapIzGlavnogUnosa(pogonByLinija) {
  const out = { ...LINIJA_FAZA_POGON_DEFAULT };
  if (!pogonByLinija) return out;
  for (const info of pogonByLinija.values()) {
    const linija = String(info?.linija_faza || "").trim();
    const pogon = String(info?.pogon || "").trim().toUpperCase();
    if (linija && pogon) out[linija] = pogon;
  }
  return out;
}

export function aktivnaPogonLinijaMap() {
  return { ...LINIJA_FAZA_POGON_DEFAULT, ...(runtimeMap || {}) };
}

export function pogonIzLinijeFaze(linijaFaza) {
  const s = String(linijaFaza || "").trim();
  if (!s) return "";
  const map = aktivnaPogonLinijaMap();
  if (map[s]) return map[s];
  const lower = s.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (k.toLowerCase() === lower) return v;
  }
  return "";
}
