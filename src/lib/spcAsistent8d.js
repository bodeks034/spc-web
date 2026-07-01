/**
 * SPC Asistent 8D — Faza 1 (šablonski nacrt bez LLM).
 * Pakuje analitiku u strukturirani prefill za OsmDIzvestaj / OsmdEditor.
 */

import { analizirajProces, labelaStanja } from "./spcInteligencija.js";
import { calcP, calcPPM, calcDPMO } from "./spcStats.js";
import { trendKvalitetaPoDanu } from "./varijabilneSpcStats.js";
import { nadjiTroubleshootingSablon } from "./troubleshootingSabloni.js";
import { normalizujWhy, spojiM6Detalj } from "./troubleshootingPrimeri.js";
import {
  nadjiWordPrimer8d,
  primeniWordPrimerNaNacrt,
  nacrtU8dEditorPrefill,
} from "./osmdWordPrimeri.js";
import { pfmeaCpZaDefekt, pfmeaCpArhiva } from "./pfmeaControlPlan.js";
import { ucitajLivePredloge } from "./predloziIzBaze.js";
import {
  serializeD2,
  serializeD4,
  serializeD6,
  serializeGrupaLista,
  serializeLista,
  praznaGrana5Why,
  serializeD8,
} from "./osmdStruktura.js";

const IZVOR_ASISTENT = "SPC Asistent · Faza 1 (šablon)";

/**
 * @typedef {object} Kontekst8d
 * @property {string} idDeo
 * @property {string} [nazivDela]
 * @property {number|string} [period]
 * @property {object} [kpi]
 * @property {object} [kpiKarte]
 * @property {object} [spc]
 * @property {Array<{naziv:string,count:number,kumulativ?:number}>} [pareto]
 * @property {Array<{naziv:string,nok:number}>} [topMasine]
 * @property {Array<{label:string,nok:number,n:number}>} [poSmeni]
 * @property {object} [inteligencija]
 * @property {string} [modul]
 */

function fmtPct(v, dec = 1) {
  const n = Number(v);
  return Number.isFinite(n) ? `${n.toFixed(dec)}%` : "—";
}

function fmtBroj(v) {
  const n = Number(v);
  return Number.isFinite(n) ? (n >= 1000 ? n.toLocaleString("sr-RS") : String(n)) : "—";
}

function periodLabel(period) {
  const p = String(period ?? "7");
  if (p.includes("—") || p.includes("-")) return p;
  if (p === "1") return "danas";
  return `poslednjih ${p} dana`;
}

/** Najgora smena po NOK u periodu. */
function najgoraSmena(poSmeni) {
  if (!poSmeni?.length) return null;
  return [...poSmeni].sort((a, b) => (b.nok || 0) - (a.nok || 0))[0];
}

/** Sastavlja kontekst iz atributivnog dashboarda. */
export function saberiKontekst8dAtributivne({
  idDeo,
  nazivDela,
  period,
  rawData = [],
  grupe = [],
  kvalitetUk = {},
  statUk = {},
  paretoData = [],
  topMasine = [],
  poSmeni = [],
  pPodaciKarte = [],
  pBarKarte,
  ukNKarte,
  ukNokKarte,
  ukOkKarte,
  heroFpy,
} = {}) {
  const ukN = kvalitetUk.ukupno ?? grupe.reduce((s, g) => s + g.n, 0);
  const ukNok = kvalitetUk.neusaglaseno ?? grupe.reduce((s, g) => s + g.nok, 0);
  const pBar = ukN > 0 ? ukNok / ukN : 0;

  const trendAttr = grupe.map((g, i) => ({
    datum: g.datum || g.label || `t${i}`,
    ok: g.ok,
    nok: g.nok,
    n: g.n,
    p: g.n > 0 ? calcP(g.nok, g.n) : 0,
  }));

  const topNok = (paretoData || []).slice(0, 6).map((p) => ({
    naziv: p.naziv,
    count: p.count,
    izvor: "atributivne",
    id_deo: idDeo,
  }));

  const inteligencija = analizirajProces({
    attr: {
      ukN,
      ukNOK: ukNok,
      fpy: heroFpy ?? kvalitetUk.rty,
      rty: String(heroFpy ?? kvalitetUk.rty ?? ""),
    },
    merljive: { merenja: 0, nok: 0 },
    trendAttr,
    trendMer: [],
    topNok,
    period: Number(period) || 7,
    idDeo,
  });

  const vanKontrole = (pPodaciKarte || []).filter((d) => d.upoz).length;

  return {
    idDeo: idDeo || "",
    nazivDela: nazivDela || "",
    period,
    modul: "atributivne",
    kpi: {
      fpy: heroFpy ?? kvalitetUk.rty,
      ppm: ukN > 0 ? calcPPM(ukNok, ukN) : null,
      dpmo: ukN > 0 ? (kvalitetUk.dpmo ?? calcDPMO(ukNok, ukN)) : null,
      pBar,
      ukN,
      ukNok,
    },
    kpiKarte: ukNKarte > 0 ? {
      fpy: ukOkKarte != null && ukNKarte > 0 ? +((ukOkKarte / ukNKarte) * 100).toFixed(1) : null,
      pBar: pBarKarte,
      ukN: ukNKarte,
      ukNok: ukNokKarte,
      opseg: "cela istorija dela",
    } : null,
    spc: {
      vanKontrole,
      tacaka: pPodaciKarte.length,
      pBar: pBarKarte,
    },
    pareto: paretoData,
    topMasine,
    poSmeni,
    inteligencija,
    statUk,
  };
}

/** Sastavlja kontekst iz merljivog SPC dashboarda. */
export function saberiKontekst8dMerljive({
  idDeo,
  nazivDela,
  period,
  pozicija,
  agregat = {},
  cpk = {},
  spc = {},
  paretoData = [],
  poSmeni = [],
  rawData = [],
  vanX = 0,
  vanR = 0,
} = {}) {
  const ukN = agregat.n || 0;
  const ukNok = agregat.nok || 0;
  const pBar = ukN > 0 ? ukNok / ukN : 0;
  const trendMer = trendKvalitetaPoDanu(rawData);

  const pareto = (paretoData || []).map((p) => ({
    naziv: p.naziv,
    count: p.count,
    kumulativ: p.kum ?? p.kumulativ ?? null,
  }));

  const topNok = pareto.map((p) => ({
    ...p,
    izvor: "merljive",
    id_deo: idDeo,
  }));

  const inteligencija = analizirajProces({
    attr: { ukN: 0, ukNOK: 0 },
    merljive: {
      merenja: ukN,
      nok: ukNok,
      fpy: agregat.rty,
      rty: String(agregat.rty ?? ""),
    },
    trendAttr: [],
    trendMer,
    topNok,
    period: Number(period) || 7,
    idDeo,
  });

  if (cpk.cpk != null && cpk.cpk < 1.33) {
    const preporuka = cpk.cpk < 1
      ? "Cpk < 1 — hitan set-up alata, kalibracija merila i segregacija serije."
      : "Cpk 1–1.33 — optimizovati centriranje procesa i smanjiti varijaciju (R karta).";
    inteligencija.korektivneMere.unshift({
      prioritet: cpk.cpk < 1 ? "visok" : "srednji",
      modul: "merljive",
      id_deo: idDeo,
      akcija: preporuka,
      obrazlozenje: pozicija
        ? `Pozicija ${pozicija}: Cpk=${cpk.cpk}, Cp=${cpk.cp ?? "—"}`
        : `Cpk=${cpk.cpk} (agregat merenja u periodu)`,
    });
  }

  if (vanX + vanR > 0) {
    inteligencija.korektivneMere.unshift({
      prioritet: "visok",
      modul: "merljive",
      id_deo: idDeo,
      akcija: "Analizirati tačke van UCL/LCL na X̄/R karti — set-up alata i kalibracija merila.",
      obrazlozenje: `X̄ van kontrole: ${vanX} · R van kontrole: ${vanR}`,
    });
  }

  const poSmeniFmt = (poSmeni || []).map((s) => ({
    s: s.s?.replace?.("Smena ", "S") || s.s,
    label: s.s || s.label,
    ok: s.ok,
    nok: s.nok,
    n: s.n,
  }));

  return {
    idDeo: idDeo || "",
    nazivDela: nazivDela || "",
    period,
    modul: "merljive",
    pozicija: pozicija || "",
    kpi: {
      fpy: agregat.rty,
      ppm: ukN > 0 ? calcPPM(ukNok, ukN) : null,
      dpmo: agregat.dpmo ?? (ukN > 0 ? calcDPMO(ukNok, ukN) : null),
      pBar,
      ukN,
      ukNok,
    },
    spc: {
      vanKontrole: vanX + vanR,
      vanX,
      vanR,
      cpk: cpk.cpk,
      cp: cpk.cp,
      xbarBar: spc.xbarBar,
    },
    pareto,
    poSmeni: poSmeniFmt,
    inteligencija,
  };
}

/** Sastavlja kontekst iz fetchInteligencijaDeo (tab STANJE). */
export function saberiKontekst8dInteligencija({
  idDeo,
  nazivDela,
  period,
  inteligencija,
  topNok = [],
  kapabilitet = [],
} = {}) {
  const pareto = (topNok || []).slice(0, 8).map((p) => ({
    naziv: p.naziv,
    count: p.count,
    kumulativ: null,
  }));

  const loCpk = kapabilitet.filter((k) => k.cpk != null && k.cpk < 1.33)[0];

  return {
    idDeo: idDeo || "",
    nazivDela: nazivDela || "",
    period,
    modul: "oba",
    pareto,
    inteligencija,
    kpi: inteligencija?.sumarno ? {
      fpy: inteligencija.sumarno.rtyPogon,
      pBar: (inteligencija.sumarno.pAttr ?? 0) / 100,
      ukN: inteligencija.sumarno.ukupnoMerenja,
      ukNok: inteligencija.sumarno.ukupnoNok,
    } : null,
    spc: loCpk ? {
      vanKontrole: loCpk.cpk < 1 ? 1 : 0,
      napomena: `Cpk ${loCpk.pozicija}: ${loCpk.cpk}`,
    } : null,
  };
}

function buildD2(kontekst, sablon) {
  const { idDeo, nazivDela, period, kpi, kpiKarte, spc, pareto, poSmeni, inteligencija } = kontekst;
  const top = pareto?.[0];
  const smena = najgoraSmena(poSmeni);
  const stanje = inteligencija?.ukupnoStanje;
  const razlogStanja = [
    inteligencija?.stanjeAttr?.razlog,
    inteligencija?.stanjeMer?.razlog,
  ].filter(Boolean).join(" · ");
  const pPct = kpi?.pBar != null ? fmtPct(kpi.pBar * 100, 2) : "—";

  const inicijalni = [
    `Kvalitet dela ${idDeo}${nazivDela ? ` (${nazivDela})` : ""} — ${labelaStanja(stanje) || "analiza SPC"}.`,
    sablon?.izvor ? `Referenca: ${sablon.izvor}.` : IZVOR_ASISTENT,
  ].join(" ");

  const sta = top
    ? `Dominantan defekt: „${top.naziv}" (${top.count} slučajeva${top.kumulativ != null ? `, ${top.kumulativ}% kumulativno` : ""}).`
    : sablon?.problem || `Povećan udeo NOK — NOK ${pPct}, FPY ${fmtPct(kpi?.fpy)}.`;

  const kada = `Period: ${periodLabel(period)}.${smena?.nok ? ` Najviše NOK u ${smena.label || smena.s} (${smena.nok} kom).` : ""}`;

  const gde = [
    idDeo ? `Deo: ${idDeo}.` : "",
    spc?.vanKontrole > 0
      ? `SPC: ${spc.vanKontrole} tačaka van kontrole (UCL/LCL ili X̄/R).`
      : spc?.tacaka > 0 ? "SPC: proces u kontrolnim granicama." : "",
  ].filter(Boolean).join(" ");

  const ko = "Tim kvaliteta / proizvodnja — inicijator 8D na osnovu SPC dashboarda.";

  const predNok = inteligencija?.predikcija?.ukupnoNok;
  const koji = predNok?.smer === "raste"
    ? `Trend NOK raste — predviđeno ~${fmtPct(predNok.sledeci[0]?.vrednost, 2)}.`
    : predNok?.smer === "pada"
      ? "Trend NOK opada — pratiti stabilizaciju."
      : "Trend stabilan u posmatranom periodu.";

  const kako = [
    kontekst.pozicija ? `Karakteristika: ${kontekst.pozicija}.` : "",
    kontekst.spc?.cpk != null ? `Cp/Cpk: ${kontekst.spc.cp ?? "—"}/${kontekst.spc.cpk}.` : "",
    kontekst.spc?.vanX != null && (kontekst.spc.vanX + kontekst.spc.vanR) > 0
      ? `X̄/R van kontrole: ${kontekst.spc.vanX + kontekst.spc.vanR} tačaka.`
      : "",
    kpiKarte?.opseg ? `KPI (istorija dela): FPY ${fmtPct(kpiKarte.fpy)}, p̄ ${fmtPct((kpiKarte.pBar ?? 0) * 100, 2)}.` : "",
    kpi?.ppm != null ? `Period filter: PPM ${fmtBroj(kpi.ppm)}, DPMO ${fmtBroj(kpi.dpmo)}.` : "",
    razlogStanja || "",
  ].filter(Boolean).join(" ");

  const d2Sablon = sablon?.d2;
  return serializeD2({
    inicijalni: d2Sablon?.inicijalni || inicijalni,
    sta: d2Sablon?.sta || sta,
    kada: d2Sablon?.kada || kada,
    gde: d2Sablon?.gde || gde,
    ko: d2Sablon?.ko || ko,
    koji: d2Sablon?.koji || koji,
    kako: d2Sablon?.kako || kako,
  });
}

function buildD3(kontekst, sablon, mere) {
  const grupe = [];
  const priv = sablon?.privremena || mere.find((m) => m.prioritet === "visok")?.akcija
    || "Segregacija sumnjive serije i pojačana kontrola do root cause analize.";

  grupe.push({
    naslov: "D3.1 — Sadržaj / segregacija",
    stavke: [priv, "Označiti i izolovati seriju/lot sa povećanim NOK.", ""],
  });

  grupe.push({
    naslov: "D3.2 — Provera / sortiranje",
    stavke: [
      kontekst.spc?.vanKontrole > 0
        ? "100% kontrola dok SPC karta ne stabilizuje tačke van granica."
        : "Povećati učestalost kontrole na kritičnim karakteristikama.",
      kontekst.pareto?.[0] ? `Fokus sortiranja na defekt „${kontekst.pareto[0].naziv}".` : "",
      "",
    ],
  });

  grupe.push({
    naslov: "D3.3 — Komunikacija",
    stavke: [
      "Obavestiti proizvodnju, logistiku i kupca prema proceduri eskalacije.",
      kontekst.idDeo ? `ID dela ${kontekst.idDeo} — status u SPC sistemu.` : "",
      "",
    ],
  });

  return serializeGrupaLista({ _fmt: 4, grupe });
}

function buildD4(kontekst, sablon) {
  const top = kontekst.pareto?.[0];
  const naziv = top?.naziv || sablon?.problem || "Neispravnost u procesu";
  const uzrok = sablon?.uzrok || "Potrebna verifikacija 5-Why / Ishikawa na licu mesta.";
  const koren = sablon?.korenskiUzrok || sablon?.resenje || "";

  const whyPodrazumevano = [
    `Zašto se javlja „${naziv}"? — ${sablon?.problem || "Povećan NOK u kontroli."}`,
    `Zašto? — ${uzrok}`,
    "Zašto? — (dopuniti nakon pregleda mašine/alata i parametara)",
    "Zašto? — (dopuniti nakon intervjua sa operaterom)",
    koren ? `Zašto? — ${koren}` : "Zašto? — (dopuniti — poslednji korak 5-Why)",
  ];

  const why = sablon?.why?.some((w) => String(w).trim())
    ? normalizujWhy(sablon.why, whyPodrazumevano)
    : whyPodrazumevano;

  const m6 = spojiM6Detalj(sablon ?? {}, kontekst);

  return serializeD4({
    problem_naslov: naziv,
    opis_problema: [
      sablon?.problem || `Povećan udeo defekta „${naziv}"`,
      kontekst.inteligencija?.stanjeAttr?.razlog || kontekst.inteligencija?.stanjeMer?.razlog || "",
    ].filter(Boolean).join("\n"),
    grane: [{
      ...praznaGrana5Why(),
      opis: naziv,
      why,
      korenski_uzrok: koren || sablon?.resenje || "",
    }],
    m6,
    efekti: `NOK ${fmtPct((kontekst.kpi?.pBar ?? 0) * 100, 2)}, FPY ${fmtPct(kontekst.kpi?.fpy)}.`,
    rezultat: "Dopuniti nakon verifikacije uzroka i implementacije korektivnih mera.",
  });
}

function buildD5(kontekst, sablon, mere) {
  const stavke = [];
  if (sablon?.resenje) stavke.push(sablon.resenje);
  mere.filter((m) => m.prioritet !== "info").slice(0, 5).forEach((m) => {
    if (!stavke.includes(m.akcija)) stavke.push(m.akcija);
  });
  if (!stavke.length) {
    stavke.push("Definisati trajno rešenje nakon zatvaranja D4 analize.");
  }
  return serializeLista(stavke);
}

function buildD6(mere) {
  const redovi = mere.filter((m) => m.prioritet !== "info").slice(0, 6).map((m) => ({
    akcija: m.akcija,
    odgovorni: "",
    rok: "",
    status: "Planirano",
  }));
  if (!redovi.length) {
    redovi.push({
      akcija: "Implementirati korektivnu meru i verifikovati efekat na SPC karti",
      odgovorni: "",
      rok: "",
      status: "Planirano",
    });
  }
  return serializeD6({
    _fmt: 3,
    redovi,
    verifikacija: ["Verifikovati efekat na SPC karti / kriterijumima prihvatanja"],
  });
}

function buildD7(kontekst, sablon) {
  const stavke = [
    ...(sablon?.d7Stavke || []),
    sablon?.resenje ? `Standardizovati: ${sablon.resenje}` : "",
    "Ažurirati FMEA / kontrolni plan ako je potrebno.",
    "Obuka operatera i verifikacija na sledećoj seriji (SPC trend).",
    kontekst.spc?.vanKontrole > 0
      ? "Definisati alarm kada SPC karta pređe granice — automatska eskalacija."
      : "Periodični pregled Pareto defekata (nedeljno).",
    "",
  ].filter((s, i, arr) => s || i === arr.length - 1);

  return serializeGrupaLista({
    _fmt: 4,
    grupe: [{ naslov: "D7 — Prevencija ponavljanja", stavke }],
  });
}

function buildD8(kontekst) {
  return serializeD8({
    tekst: [
      "Nacrt generisan automatski — obavezna validacija tima pre zatvaranja 8D.",
      `Kriterijum zatvaranja: FPY ≥ cilj, p-karta stabilna, Pareto defekta smanjen ≥ 50%.`,
      `Izvor podataka: SPC dashboard · ${periodLabel(kontekst.period)} · ${kontekst.idDeo || "pogon"}.`,
    ].join("\n"),
    datum_zatvaranja: "",
    odobrio: "",
  });
}

/**
 * Generiše kompletan prefill za OsmDIzvestaj.
 * Učitava live primere iz baze (8D + PFMEA/CP) pored statičkog JSON-a.
 * @param {Kontekst8d} kontekst
 * @returns {Promise<object>}
 */
export async function generisiNacrt8d(kontekst) {
  if (!kontekst?.idDeo && !kontekst?.inteligencija) {
    throw new Error("Izaberite deo ili učitajte podatke inteligencije pre generisanja 8D.");
  }

  const pareto = kontekst.pareto || [];
  const topNaziv = pareto[0]?.naziv || "";

  const live = await ucitajLivePredloge();
  const sablon = nadjiTroubleshootingSablon(topNaziv, {
    pareto,
    dodatniSabloni: live.primere8d,
  });

  const wordPrimer = sablon ? nadjiWordPrimer8d({ sablonId: sablon.id }) : null;

  if (wordPrimer) {
    return primeniWordPrimerNaNacrt(wordPrimer, kontekst, sablon);
  }

  const mere = kontekst.inteligencija?.korektivneMere || [];

  const d2 = buildD2(kontekst, sablon);
  const d3 = buildD3(kontekst, sablon, mere);
  const d4 = buildD4(kontekst, sablon);
  const d5 = buildD5(kontekst, sablon, mere);
  const d6 = buildD6(mere);
  const d7 = buildD7(kontekst, sablon);
  const d8 = buildD8(kontekst);

  const rezime = [
    kontekst.inteligencija?.stanjeAttr?.razlog || kontekst.inteligencija?.stanjeMer?.razlog,
    topNaziv ? `Top defekt: ${topNaziv}` : null,
    sablon ? `Šablon: ${sablon.problem}` : null,
  ].filter(Boolean).join(" · ");

  const jsonPfmea = pfmeaCpArhiva?.pfmea?.redovi ?? [];
  const jsonCp = pfmeaCpArhiva?.controlPlan?.redovi ?? [];
  const { pfmea_ref, control_plan_ref } = pfmeaCpZaDefekt(topNaziv || sablon?.problem || "", {
    sviPfmea: [...live.pfmea, ...jsonPfmea],
    sviCp: [...live.cp, ...jsonCp],
  });

  return {
    id_deo: kontekst.idDeo || "",
    naziv_dela: kontekst.nazivDela || "",
    defekt_nedostatak: topNaziv || sablon?.problem || "",
    opis: d2,
    d2_opis_problema: d2,
    d3_privremena_akcija: d3,
    d4_uzrok: d4,
    d5_korektivna: d5,
    d6_implementacija: d6,
    d7_prevencija: d7,
    d8_zakljucak: d8,
    pfmea_ref,
    control_plan_ref,
    _asistent: {
      izvor: IZVOR_ASISTENT,
      faza: 1,
      sablonId: sablon?.id || null,
      sablon: sablon?.problem || null,
      sablonIzvor: sablon?.izvor || null,
      izUvoznogJson: !!sablon?.izUvoznogJson,
      izBaze: !!sablon?.izBaze,
      rezime,
      generisano: new Date().toISOString(),
    },
  };
}

/** Prefill kompatibilan sa navigacijom iz eskalacije + proširena polja. */
export function prefill8dIzAsistenta(nacrt) {
  if (!nacrt) return {};
  return { ...nacrt };
}
