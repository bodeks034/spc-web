import { filtrirajVoziloRedove } from "./voziloZoneConfig.js";

/** @typedef {{ id_deo?: string, greska_katalog_id?: string, vozilo_katalog_id?: string, tip_kontrole?: string }} DeoInfo */

export function buildGreskeKatalog(rows) {
  const gr = {};
  const df = {};
  (rows || []).forEach((r) => {
    if (!gr[r.kategorija]) gr[r.kategorija] = [];
    if (r.podkategorija && !gr[r.kategorija].includes(r.podkategorija)) {
      gr[r.kategorija].push(r.podkategorija);
    }
    if (!r.defekt || r.defekt === "-") return;
    if (!df[r.kategorija]) df[r.kategorija] = {};
    if (!df[r.kategorija][r.podkategorija]) df[r.kategorija][r.podkategorija] = [];
    if (!df[r.kategorija][r.podkategorija].includes(r.defekt)) {
      df[r.kategorija][r.podkategorija].push(r.defekt);
    }
  });
  return { gr, df };
}

function norm(v) {
  return (v || "").trim().toUpperCase();
}

/** Ključevi za filter pojedinačnog dela. */
export function kljuceviGreskeDelo(deo) {
  if (!deo) return [];
  const keys = new Set();
  if (deo.greska_katalog_id) keys.add(norm(deo.greska_katalog_id));
  if (deo.id_deo) keys.add(norm(deo.id_deo));
  return [...keys];
}

/** Ključevi za filter kataloga vozila. */
export function kljuceviKatalogVozila(deo) {
  if (!deo) return [];
  const keys = new Set();
  if (deo.vozilo_katalog_id) keys.add(norm(deo.vozilo_katalog_id));
  const id = norm(deo.id_deo);
  if (id.startsWith("AUTO")) keys.add(id);
  return [...keys];
}

function redOdgovaraKljuču(red, keys, polja) {
  return polja.some((p) => {
    const v = norm(red[p]);
    if (!v) return false;
    return keys.some((k) => v === k);
  });
}

function redImaPrefiksKljuča(red, keys, polje) {
  const v = norm(red[polje]);
  if (!v) return false;
  return keys.some((k) => v === k || v.startsWith(`${k}-`) || v.startsWith(`${k}_`));
}

/**
 * Pojedinačni delovi — greske_katalog.
 * 1) Redovi sa id_deo ili katalog_id koji odgovara delu
 * 2) Inače zajednički (oba polja prazna)
 * 3) Inače ceo katalog (stari šifrarnik)
 */
export function filtrirajGreskeZaDeo(rows, deo) {
  const all = rows || [];
  const keys = kljuceviGreskeDelo(deo);
  if (!keys.length) return all;

  const specific = all.filter((r) => redOdgovaraKljuču(r, keys, ["id_deo", "katalog_id"]));
  if (specific.length) return specific;

  const zajednicki = all.filter((r) => !norm(r.id_deo) && !norm(r.katalog_id));
  return zajednicki.length ? zajednicki : all;
}

/**
 * Celo vozilo — katalog_gresaka_vozilo po modelu (pre zone na dijagramu).
 */
export function filtrirajKatalogVozilaPoDelu(rows, deo) {
  const all = rows || [];
  const keys = kljuceviKatalogVozila(deo);
  if (!keys.length) return all;

  const specific = all.filter((r) => redImaPrefiksKljuča(r, keys, "vozilo_id"));
  if (specific.length) return specific;

  const legacy = all.filter((r) => {
    const vid = norm(r.vozilo_id);
    return vid === "FINAL-001" || /^[A-Z]+-\d{3}$/.test(vid);
  });
  return legacy.length ? legacy : all;
}

/** Zona dijagrama + model. */
export function filtrirajKatalogVozilaZaUnos(rows, deo, zonaId) {
  const poModelu = filtrirajKatalogVozilaPoDelu(rows, deo);
  return filtrirajVoziloRedove(poModelu, zonaId);
}
