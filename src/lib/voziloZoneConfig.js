/**
 * null = ugrađeni vektorski crtež (oštar na svim ekranima).
 * Za sopstvenu fotografiju: "/vozilo/vehicle_photo.png" (preporuka 1364×1040 px).
 * Folder "sifarnik celo vozilo" se NE koristi u runtime — samo za referencu dizajna.
 */
export const VOZILO_DIAGRAM_SRC = null;

/** @typedef {{ id: string, kratko: string, naziv: string, boja: string, bojaPozadina: string, bojaTekst: string, hotspot: { cx: number, cy: number, r: number }, legenda: { x: number, y: number, w: number, h: number, strana: "levo"|"desno" }, linijaDo: { x: number, y: number }, odgovaraKategorija: (kat: string) => boolean, odgovaraPodkategorija: (kat: string, pod: string) => boolean }} VoziloZona */

/** @type {VoziloZona[]} */
export const VOZILO_ZONE = [
  {
    id: "KAROS-001",
    kratko: "K",
    naziv: "Karoserija",
    boja: "#178AD4",
    bojaPozadina: "#E6F1FB",
    bojaTekst: "#0C447C",
    hotspot: { cx: 325, cy: 185, r: 14 },
    legenda: { x: 8, y: 40, w: 78, h: 40, strana: "levo" },
    linijaDo: { x: 325, y: 185 },
    odgovaraKategorija: (kat) =>
      kat === "EKSTERIJER (Karoserija i Limarija)" || kat === "STAKLENE POVRŠINE",
    odgovaraPodkategorija: () => true,
  },
  {
    id: "MOTOR-001",
    kratko: "M",
    naziv: "Motor",
    boja: "#0F6E56",
    bojaPozadina: "#E1F5EE",
    bojaTekst: "#085041",
    hotspot: { cx: 145, cy: 255, r: 14 },
    legenda: { x: 8, y: 94, w: 78, h: 40, strana: "levo" },
    linijaDo: { x: 145, y: 255 },
    odgovaraKategorija: (kat) => kat === "FUNKCIONALNE ZONE I PODVOZJE",
    odgovaraPodkategorija: (_kat, pod) => pod === "Motorni prostor",
  },
  {
    id: "TRANS-001",
    kratko: "T",
    naziv: "Transmisija",
    boja: "#854F0B",
    bojaPozadina: "#FAEEDA",
    bojaTekst: "#633806",
    hotspot: { cx: 325, cy: 290, r: 14 },
    legenda: { x: 8, y: 148, w: 78, h: 40, strana: "levo" },
    linijaDo: { x: 325, y: 290 },
    odgovaraKategorija: (kat) => kat === "FUNKCIONALNE ZONE I PODVOZJE",
    odgovaraPodkategorija: (_kat, pod) =>
      pod === "Podvozje" || pod === "Točkovi i gume",
  },
  {
    id: "INT-001",
    kratko: "I",
    naziv: "Enterijer",
    boja: "#993556",
    bojaPozadina: "#FBEAF0",
    bojaTekst: "#72243E",
    hotspot: { cx: 325, cy: 230, r: 14 },
    legenda: { x: 594, y: 40, w: 78, h: 40, strana: "desno" },
    linijaDo: { x: 325, y: 230 },
    odgovaraKategorija: (kat) => kat === "ENTERIJER (Kabina)",
    odgovaraPodkategorija: () => true,
  },
  {
    id: "EL-001",
    kratko: "E",
    naziv: "Elektrika",
    boja: "#534AB7",
    bojaPozadina: "#EEEDFE",
    bojaTekst: "#3C3489",
    hotspot: { cx: 505, cy: 255, r: 14 },
    legenda: { x: 594, y: 94, w: 78, h: 40, strana: "desno" },
    linijaDo: { x: 505, y: 255 },
    odgovaraKategorija: (kat) =>
      kat === "OSVETLJENJE, SIGNALIZACIJA I SENZORI" || kat === "FUNKCIONALNE ZONE I PODVOZJE",
    odgovaraPodkategorija: (kat, pod) =>
      kat === "OSVETLJENJE, SIGNALIZACIJA I SENZORI" || pod === "Elektrika",
  },
  {
    id: "FINAL-001",
    kratko: "F",
    naziv: "Finalna",
    boja: "#5F5E5A",
    bojaPozadina: "#F1EFE8",
    bojaTekst: "#2C2C2A",
    hotspot: { cx: 325, cy: 340, r: 14 },
    legenda: { x: 594, y: 148, w: 78, h: 40, strana: "desno" },
    linijaDo: { x: 325, y: 340 },
    odgovaraKategorija: (kat) =>
      kat === "OSTALO" || kat === "FUNKCIONALNE ZONE I PODVOZJE",
    odgovaraPodkategorija: (kat, pod) =>
      kat === "OSTALO"
      || pod === "Funkcionalni test"
      || pod === "Prtljažni prostor",
  },
];

export function zonaPoId(id) {
  return VOZILO_ZONE.find(z => z.id === id) || null;
}

/**
 * Filtrira katalog grešaka (gr + df) prema izabranoj zoni vozila.
 * @param {Record<string, string[]>} gr
 * @param {Record<string, Record<string, string[]>>} df
 * @param {string|null} zonaId
 */
export function filtrirajKatalogPoZoni(gr, df, zonaId) {
  const zona = zonaPoId(zonaId);
  if (!zona) return { gr: gr || {}, df: df || {} };

  const newGr = {};
  const newDf = {};

  for (const [kat, pods] of Object.entries(gr || {})) {
    if (!zona.odgovaraKategorija(kat)) continue;
    const filtered = (pods || []).filter(p => zona.odgovaraPodkategorija(kat, p));
    if (filtered.length) newGr[kat] = filtered;
  }

  for (const [kat, podMap] of Object.entries(df || {})) {
    if (!zona.odgovaraKategorija(kat)) continue;
    const newPodMap = {};
    for (const [pod, defekti] of Object.entries(podMap || {})) {
      if (!zona.odgovaraPodkategorija(kat, pod)) continue;
      newPodMap[pod] = defekti;
    }
    if (Object.keys(newPodMap).length) newDf[kat] = newPodMap;
  }

  return { gr: newGr, df: newDf };
}

/**
 * Novi katalog (9 sheetova po komponentama): svaki red ima vozilo_id = KAROS-001, MOTOR-001…
 * Stari katalog (1 sheet): svi redovi imaju vozilo_id = FINAL-001 → filtrira se po kategoriji.
 * @param {{ vozilo_id?: string, kategorija: string, podkategorija: string }[]} rows
 * @param {string|null} zonaId
 */
export function filtrirajVoziloRedove(rows, zonaId) {
  const zona = zonaPoId(zonaId);
  if (!zona) return rows || [];

  return (rows || []).filter((r) => {
    if (r.vozilo_id === zonaId) return true;
    if (r.vozilo_id && r.vozilo_id !== "FINAL-001") return false;
    return zona.odgovaraKategorija(r.kategorija)
      && zona.odgovaraPodkategorija(r.kategorija, r.podkategorija);
  });
}
