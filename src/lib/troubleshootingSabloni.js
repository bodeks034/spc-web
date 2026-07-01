/**

 * Šablonska baza Problem → Uzrok → Rešenje (Faza 1 asistenta 8D).

 * Ugrađeni šabloni + primeri iz src/data/primeri-8d.json (Word arhiva).

 * Poklapanje isključivo po defektu (Pareto / sličan naziv), ne po ID dela.

 */



import { ucitajPrimere8dIzJson, scoreSablonZaDefekt } from "./troubleshootingPrimeri.js";

import primeriJson from "../data/primeri-8d.json";



/**

 * @typedef {object} TroubleshootingSablon

 * @property {string} [id]

 * @property {string[]} kljucevi

 * @property {string} problem

 * @property {string} uzrok

 * @property {string} [korenskiUzrok]

 * @property {string} [privremena]

 * @property {string} resenje

 * @property {string} [m6]

 * @property {Record<string, string>} [m6Detalj]

 * @property {string[]|null} [why]

 * @property {object|null} [d2]

 * @property {string[]} [d7Stavke]

 * @property {string} [proces]

 * @property {string} [izvor]

 * @property {string} [napomena]

 * @property {boolean} [izUvoznogJson]

 */



/** @type {TroubleshootingSablon[]} */

export const TROUBLESHOOTING_UGRADENI = [

  {

    id: "ugr-ogrebanje",

    kljucevi: ["ogreban", "ogrebanje", "grebanje", "ogrebotina"],

    problem: "Ogrebotine / površinska oštećenja na delu",

    uzrok: "Kontakt pri rukovanju, transport ili zaštita radnog mesta nedovoljna",

    privremena: "100% vizuelna kontrola sumnjive serije; segregacija; zaštita kritičnih zona",

    resenje: "Pregledati zaštitu radnog mesta i transport — smanjiti kontakt pri rukovanju; obuka operatera",

    m6: "metod",

    proces: "atributivne",

  },

  {

    id: "ugr-ulegnuce",

    kljucevi: ["ulegnuće", "ulegnuce", "udubljenje", "ulegnut"],

    problem: "Ulegnuće / udubljenje na površini",

    uzrok: "Prenizak pritisak alata, neispravna matrica ili parametri štampe",

    privremena: "Privremeno smanjiti pritisak; sortiranje serije po uzorku",

    resenje: "Proveriti pritisak alata / parametre štampe i čistoću matrice; verifikovati set-up",

    m6: "masina",

    proces: "atributivne",

  },

  {

    id: "ugr-pukotina",

    kljucevi: ["pukotina", "pukotine", "pukotine", "lom", "naprsina"],

    problem: "Pukotina / strukturni defekt",

    uzrok: "Parametri hlađenja, ciklus ili materijal van specifikacije",

    privremena: "Segregacija serije; uzorak na mikroskop / NDT",

    resenje: "Analizirati parametre hlađenja i ciklus — uzorak na mikroskop; korekcija procesa",

    m6: "materijal",

    proces: "atributivne",

  },

  {

    id: "ugr-dimenzija",

    kljucevi: ["dimenzija", "merenje", "tolerancija", "van tolerancije", "tolerancije"],

    problem: "Dimenzija van tolerancije",

    uzrok: "Set-up alata, habanje alata ili greška merila",

    privremena: "100% merenje kritične dimenzije do stabilizacije; kalibracija merila",

    resenje: "Kalibracija merila i set-up alata za kritičnu dimenziju; provera Cp/Cpk na SPC karti",

    m6: "merenje",

    proces: "merljive",

  },

  {

    id: "ugr-zavar",

    kljucevi: ["zavar", "zavara", "vara", "visina vara", "var", "poroz", "undercut", "spatter", "haz", "spoj"],

    problem: "Defekt zavara (poroznost, undercut, spatter…)",

    uzrok: "Parametri zavarivanja, priprema spoja ili gas/žica van specifikacije (v. ISO 5817)",

    privremena: "Segregacija spojeva sumnjive kvalitete; vizuelna kontrola po ISO 5817 nivo D",

    resenje: "Proveriti WFS, napon, gas, čistoću spoja; uskladiti parametre prema WPS; obuka zavarivača",

    m6: "metod",

    proces: "atributivne",

  },

  {

    id: "ugr-funkcionalni",

    kljucevi: ["blokira", "funkcional", "ne radi", "funkcionalni"],

    problem: "Funkcionalni defekt — sklop ne radi / blokira",

    uzrok: "Neusaglašena komponenta, montaža ili tolerancija spoja",

    privremena: "100% funkcionalna kontrola do stabilizacije",

    resenje: "Ispitati funkcionalnost sklopa — provera komponenti i montažnog procesa",

    m6: "metod",

    proces: "atributivne",

  },

  {

    id: "ugr-livenje",

    kljucevi: ["livenje", "liv", "porozit", "hladni spoj", "odliv"],

    problem: "Defekt livenja (porozitost, hladni spoj, nedovoljno punjenje)",

    uzrok: "Temperatura liva, ventilacija kalupa ili ciklus punjenja",

    privremena: "Segregacija serije; uzorak za metalografsku analizu",

    resenje: "Optimizovati temperaturu liva i ciklus; provera kalupa i degaziranja",

    m6: "masina",

    proces: "atributivne",

  },

  {

    id: "ugr-kovanje",

    kljucevi: ["kovanje", "kov", "pukotina kovanja", "matrica"],

    problem: "Defekt kovanja (pukotina, ulegnuće, nepotpuno punjenje matrice)",

    uzrok: "Temperatura materijala, habanje matrice ili pogrešan ciklus",

    privremena: "Sortiranje serije; pregled matrice",

    resenje: "Provera temperature i lubrikacije; održavanje matrice; korekcija ciklusa",

    m6: "masina",

    proces: "atributivne",

  },

  {

    id: "ugr-cnc-habanje",

    kljucevi: ["habanje", "alat", "cnc", "freza", "turning", "insert", "tool life"],

    problem: "Dimenzija / površina — indikacija habanja alata (CNC)",

    uzrok: "Prekoračen vek alata, pogrešne brzine/rez ili premaz pločice",

    privremena: "Smanjiti brzinu rezanja; promena inserta; dodatno uzorkovanje",

    resenje: "Optimizovati parametre rezanja i interval zamene alata prema Tool Wear Guide proizvođača alata",

    m6: "masina",

    proces: "merljive",

  },

];



const { primeri: uvezeniPrimeri, greske: greskeUvoza } = ucitajPrimere8dIzJson(primeriJson);

if (greskeUvoza.length && typeof console !== "undefined") {

  console.warn("[troubleshooting] primeri-8d.json:", greskeUvoza.join("; "));

}



/** Svi šabloni: prvo Word/JSON primeri (specifičniji), pa ugrađeni. */

export const TROUBLESHOOTING_SABLONI = [

  ...uvezeniPrimeri.filter((p) => !p.kljucevi.includes("_primer")),

  ...TROUBLESHOOTING_UGRADENI,

];



export { uvezeniPrimeri, greskeUvoza };



const MIN_SKOR = 4;



/**

 * Pronalazi šablon po istom ili sličnom nazivu defekta (Pareto, NOK lista…).

 * @param {string} nazivDefekta — top defekt iz analitike

 * @param {{ pareto?: Array<{naziv?: string}> }} [opcije]

 * @returns {TroubleshootingSablon | null}

 */

export function nadjiTroubleshootingSablon(nazivDefekta, opcije = {}) {

  const nazivi = [];

  const dodaj = (s) => {

    const t = String(s ?? "").trim();

    if (!t) return;

    if (!nazivi.some((x) => x.toLowerCase() === t.toLowerCase())) nazivi.push(t);

  };



  dodaj(nazivDefekta);

  for (const p of opcije.pareto || []) dodaj(p?.naziv);



  if (!nazivi.length) return null;



  const dodatni = opcije.dodatniSabloni || [];

  const sabloni = dodatni.length

    ? [...dodatni, ...TROUBLESHOOTING_SABLONI]

    : TROUBLESHOOTING_SABLONI;



  let najbolji = null;

  let najScore = 0;



  for (const s of sabloni) {

    let score = 0;

    for (let i = 0; i < nazivi.length; i++) {

      const w = scoreSablonZaDefekt(nazivi[i], s) * (i === 0 ? 1.25 : 1);

      score = Math.max(score, w);

    }

    if (s.izBaze && score >= MIN_SKOR) score += 15;

    else if (s.izUvoznogJson && score >= MIN_SKOR) score += 12;

    if (score > najScore) {

      najScore = score;

      najbolji = s;

    }

  }



  return najScore >= MIN_SKOR ? najbolji : null;

}



export function statistikaSablona() {

  return {

    ugradeni: TROUBLESHOOTING_UGRADENI.length,

    uvezeni: uvezeniPrimeri.filter((p) => !p.kljucevi.includes("_primer")).length,

    ukupno: TROUBLESHOOTING_SABLONI.length,

    greskeUvoza,

  };

}


