/**

 * Puni 8D iz Word arhive — učitava se po pronađenom šablonu defekta (ne po ID dela).

 */



import wordData from "../data/osmd-word-primeri.json" with { type: "json" };
import { normalizujIdDeo } from "./idDeoUtil.js";
import { pfmeaCpZaDefekt } from "./pfmeaControlPlan.js";



/** @param {string} sablonId npr. 8d-nm-001 */

export function sablonIdUBroj8d(sablonId) {

  const m = String(sablonId || "").match(/^8d-([a-z]+)-(\d+)$/i);

  if (!m) return null;

  return `8D-${m[1].toUpperCase()}-${m[2]}`;

}



/** @returns {object|null} pun Word 8D zapis */

export function nadjiWordPrimer8d({ sablonId, broj8d } = {}) {

  const primeri = wordData?.primeri || [];

  if (broj8d) {

    const hit = primeri.find((p) => normalizujIdDeo(p.broj_8d) === normalizujIdDeo(broj8d));

    if (hit) return hit;

  }

  if (sablonId) {

    const b8 = sablonIdUBroj8d(sablonId);

    if (b8) {

      return primeri.find((p) => normalizujIdDeo(p.broj_8d) === normalizujIdDeo(b8)) || null;

    }

  }

  return null;

}



/** Nacrt iz Word primera — zadržava sadržaj šablona, stvarni deo iz dashboarda. */

export function primeniWordPrimerNaNacrt(wordPrimer, kontekst, sablon) {
  const idDeo = kontekst?.idDeo || "";
  const nazivDela = kontekst?.nazivDela || "";
  const defekt = kontekst?.pareto?.[0]?.naziv || wordPrimer.defekt_nedostatak || sablon?.problem || "";
  const { pfmea_ref, control_plan_ref } = pfmeaCpZaDefekt(defekt);

  return {
    ...wordPrimer,
    id_deo: idDeo,
    naziv_dela: nazivDela,
    artikal_naziv_sifra: nazivDela && idDeo
      ? `${nazivDela} (${idDeo})`
      : (wordPrimer.artikal_naziv_sifra || ""),
    defekt_nedostatak: defekt,
    pfmea_ref: pfmea_ref || wordPrimer.pfmea_ref || "",
    control_plan_ref: control_plan_ref || wordPrimer.control_plan_ref || "",
    status: "u_izradi",
    _asistent: {
      izvor: "SPC Asistent · Word primer + Excel PFMEA/CP",
      faza: 1,
      sablonId: sablon?.id || null,
      sablon: sablon?.problem || wordPrimer.defekt_nedostatak || null,
      sablonIzvor: sablon?.izvor || wordData?.izvor || null,
      izUvoznogJson: true,
      wordPrimer: wordPrimer.broj_8d || null,
      rezime: [
        sablon?.problem ? `Šablon: ${sablon.problem}` : null,
        wordPrimer.broj_8d ? `Referenca: ${wordPrimer.broj_8d}` : null,
        defekt ? `Defekt u SPC: ${defekt}` : null,
      ].filter(Boolean).join(" · "),
      generisano: new Date().toISOString(),
    },
  };
}



/** Sva polja za OsmdEditor iz nacrta (asistent / Word / eskalacija). */

export function nacrtU8dEditorPrefill(nacrt) {

  if (!nacrt) return {};

  const zaglavlje = [

    "broj_8d", "broj_reklamacije", "defekt_nedostatak", "kupac_ime_id", "kupac_lokacija",

    "kupac_kontakt", "artikal_naziv_sifra", "lot_serijski", "otpremnica_rn",

    "kolicina_reklamacije", "datum_prijema_reklamacije", "datum_otvaranja_8d",

    "datum_cilj_zatvaranja", "klasa_greske", "bezbednost_problem",

  ];

  const out = {

    id_deo: nacrt.id_deo || "",

    naziv_dela: nacrt.naziv_dela || "",

    d1_tim: nacrt.d1_tim || "",

    d2_opis_problema: nacrt.d2_opis_problema || nacrt.opis || "",

    d3_privremena_akcija: nacrt.d3_privremena_akcija || "",

    d4_uzrok: nacrt.d4_uzrok || "",

    d5_korektivna: nacrt.d5_korektivna || nacrt.korektivna_akcija || "",

    d6_implementacija: nacrt.d6_implementacija || "",

    d7_prevencija: nacrt.d7_prevencija || "",

    d8_zakljucak: nacrt.d8_zakljucak || "",

    lesson_learned: nacrt.lesson_learned || "",

    pfmea_ref: nacrt.pfmea_ref || "",

    control_plan_ref: nacrt.control_plan_ref || "",

    status: nacrt.status === "zavrsen" ? "u_izradi" : (nacrt.status || "u_izradi"),

  };

  for (const k of zaglavlje) {

    if (nacrt[k] != null && nacrt[k] !== "") out[k] = nacrt[k];

  }

  if (nacrt._asistent) out._asistent = nacrt._asistent;

  return out;

}


