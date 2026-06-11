import { filtrirajVoziloRedove } from "./voziloZoneConfig.js";

/** @typedef {{ id_deo?: string, greska_katalog_id?: string, vozilo_katalog_id?: string, tip_kontrole?: string, pogon_kod?: string }} DeoInfo */

/** Kad baza nema pogon_kod — podrazumevane kategorije po pogonu (A–H). */
export const KATEGORIJE_GRESAKA_PO_POGONU = {
  A: ["DIMENZIJA", "VIZUELNO", "MATERIJAL", "PAKOVANJE", "OZNAKE", "OSTALO"],
  B: ["POVRSINA", "DIMENZIJA"],
  C: ["LOS VAR", "ZAZOR", "POVRSINA"],
  D: ["POVRSINA", "VIZUELNO"],
  E: ["MONTAZA", "FUNKCIJA"],
  F: ["MONTAZA", "FUNKCIJA", "VIZUELNO", "PAKOVANJE", "OZNAKE"],
  G: ["DIMENZIJA", "POVRSINA"],
  H: ["DIMENZIJA"],
};

function kategorijaKlasa(r) {
  return norm(r.kategorija) || "OSTALO";
}

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
  if (deo.tip_kontrole === "vozilo" && id) {
    keys.add(id);
    const pref = id.replace(/-\d{3}$/, "");
    if (pref && pref !== id) keys.add(pref);
  } else if (id.startsWith("AUTO") || id.startsWith("NTV") || id.startsWith("MRAP")) keys.add(id);
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
 * Samo greške izabranog pogona (A–H).
 * 1) Redovi sa pogon_kod = izabrani pogon
 * 2) Ako nema takvih — kategorije iz KATEGORIJE_GRESAKA_PO_POGONU (stari šifrarnik bez kolone)
 * 3) Bez izabranog pogona — ne filtrira
 */
export function filtrirajGreskePoPogonu(rows, pogonKod) {
  const all = rows || [];
  const pogon = norm(pogonKod);
  if (!pogon) return all;

  const eksplicitno = all.filter((r) => norm(r.pogon_kod) === pogon);
  if (eksplicitno.length) return eksplicitno;

  const dozvoljene = new Set((KATEGORIJE_GRESAKA_PO_POGONU[pogon] || []).map(norm));
  if (!dozvoljene.size) return [];

  const imaOznacenih = all.some((r) => norm(r.pogon_kod));
  return all.filter((r) => {
    const pk = norm(r.pogon_kod);
    if (pk) return false;
    if (imaOznacenih) return false;
    return dozvoljene.has(kategorijaKlasa(r));
  });
}

/** Deo + pogon za atributivni unos. */
export function filtrirajGreskeZaUnos(rows, deo, pogonKod) {
  const pogon = norm(pogonKod) || norm(deo?.pogon_kod);
  return filtrirajGreskePoPogonu(filtrirajGreskeZaDeo(rows, deo), pogon);
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
