/**
 * Zone kontrole za namštaj / vrata — isti UI kao celo vozilo (dijagram + hotspots + čipovi).
 * viewBox 682×520 — kao vozilo.
 *
 * Hotspot koordinate su izmerene iz kuh-vrata.png (1024×1536, objectFit contain →
 * slika je široka 346,67 i počinje na x=167,67), pa prstenovi padaju tačno na
 * brojeve 1–4 ucrtane u slici. `prsten: true` crta samo obruč, bez duplog broja.
 */

/** @typedef {import("./voziloZoneConfig.js").VoziloZona} VoziloZona */

/** @type {import("./voziloZoneConfig.js").VoziloZona[]} */
export const VRATA_ZONE = [
  {
    id: "IVICA-001",
    kratko: "1",
    naziv: "Ivica",
    boja: "#178AD4",
    bojaPozadina: "#E6F1FB",
    bojaTekst: "#0C447C",
    hotspot: { cx: 343, cy: 21, r: 13 },
    prsten: true,
    legenda: { x: 8, y: 30, w: 92, h: 40, strana: "levo" },
    linijaDo: { x: 326, y: 23 },
    odgovaraKategorija: (kat) => {
      const k = String(kat || "").toUpperCase();
      return k.includes("IVICA") || k.includes("KANT") || k.includes("EDGE");
    },
    odgovaraPodkategorija: () => true,
  },
  {
    id: "POVR-001",
    kratko: "2",
    naziv: "Površina",
    boja: "#0F6E56",
    bojaPozadina: "#E1F5EE",
    bojaTekst: "#085041",
    hotspot: { cx: 342, cy: 209, r: 13 },
    prsten: true,
    legenda: { x: 582, y: 191, w: 92, h: 40, strana: "desno" },
    linijaDo: { x: 359, y: 209 },
    odgovaraKategorija: (kat) => {
      const k = String(kat || "").toUpperCase();
      return k.includes("POVR") || k.includes("FURNIR") || k.includes("LAK");
    },
    odgovaraPodkategorija: () => true,
  },
  {
    id: "UGAO-001",
    kratko: "3",
    naziv: "Uglovi",
    boja: "#854F0B",
    bojaPozadina: "#FAEEDA",
    bojaTekst: "#633806",
    hotspot: { cx: 457, cy: 42, r: 13 },
    prsten: true,
    legenda: { x: 582, y: 30, w: 92, h: 40, strana: "desno" },
    linijaDo: { x: 474, y: 43 },
    odgovaraKategorija: (kat) => {
      const k = String(kat || "").toUpperCase();
      return k.includes("GEOMET") || k.includes("UGAO") || k.includes("FORMA") || k.includes("KRIVA");
    },
    odgovaraPodkategorija: () => true,
  },
  {
    id: "RUPE-001",
    kratko: "4",
    naziv: "Rupice",
    boja: "#993556",
    bojaPozadina: "#FBEAF0",
    bojaTekst: "#72243E",
    hotspot: { cx: 201, cy: 303, r: 13 },
    prsten: true,
    legenda: { x: 8, y: 287, w: 92, h: 40, strana: "levo" },
    linijaDo: { x: 184, y: 304 },
    odgovaraKategorija: (kat) => {
      const k = String(kat || "").toUpperCase();
      return k.includes("BUŠ") || k.includes("BUS") || k.includes("RUP") || k.includes("ŠARK") || k.includes("SARK");
    },
    odgovaraPodkategorija: () => true,
  },
];

/** Da li deo koristi layout zona za vrata / namštaj (ne auto). */
export function jeVrataZonaDeo(deo) {
  if (!deo) return false;
  const tip = String(deo.tip_kontrole || "").toLowerCase();
  const id = String(deo.id_deo || "").toUpperCase();
  const vk = String(deo.vozilo_katalog_id || "").toUpperCase();
  const naziv = String(deo.naziv_dela || "").toLowerCase();
  const kar = String(deo.karakteristika || "").toLowerCase();
  if (vk === "KUH" || vk.startsWith("KUH-") || vk === "VRATA") return true;
  if (id.startsWith("KUH-") || id.includes("VRATA")) return true;
  if (tip === "vozilo" && (naziv.includes("vrata") || naziv.includes("kuhinj") || kar.includes("vrata"))) return true;
  return false;
}
