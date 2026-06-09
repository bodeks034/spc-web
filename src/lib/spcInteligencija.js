/**
 * Sumiranje stanja, jednostavna predikcija trenda i predlog korektivnih mera
 * na osnovu atributivnih (kontrolni_log) i merljivih (merenja_varijabilna) podataka.
 */

import { aggregateLogRows, calcRTY, calcP, calcDPMO, buildParetoFromLog } from "./spcStats.js";
import {
  trendKvalitetaPoDanu, podgrupeMerenja, izracunajXbarRKarte,
  calcCpCpk, bojaKapabiliteta,
} from "./varijabilneSpcStats.js";
import { predloziDodeljenogInzenjera } from "./eskalacijeHelper.js";

const STANJE = {
  U_KONTROLI: "u_kontroli",
  UPOZORENJE: "upozorenje",
  KRITICNO: "kriticno",
  NEDOVOLJNO: "nedovoljno_podataka",
};

/** Jednostavna linearna regresija y = a + b*x */
export function linearnaRegresija(tacke) {
  const pts = (tacke || []).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (pts.length < 2) return null;
  const n = pts.length;
  const sx = pts.reduce((s, p) => s + p.x, 0);
  const sy = pts.reduce((s, p) => s + p.y, 0);
  const sxx = pts.reduce((s, p) => s + p.x * p.x, 0);
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const b = (n * sxy - sx * sy) / denom;
  const a = (sy - b * sx) / n;
  const yMean = sy / n;
  const ssTot = pts.reduce((s, p) => s + (p.y - yMean) ** 2, 0);
  const ssRes = pts.reduce((s, p) => s + (p.y - (a + b * p.x)) ** 2, 0);
  const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  return { a, b, r2, n };
}

/** Predikcija sledećih N tačaka (x nastavlja od poslednjeg indeksa). */
export function predikcijaTrenda(trend, polje = "p", koraci = 3) {
  const red = (trend || []).filter(d => Number.isFinite(d[polje]));
  if (red.length < 3) return null;
  const reg = linearnaRegresija(red.map((d, i) => ({ x: i, y: d[polje] })));
  if (!reg) return null;
  const poslednji = red[red.length - 1];
  const sledeci = [];
  for (let k = 1; k <= koraci; k++) {
    const x = red.length - 1 + k;
    const v = +(reg.a + reg.b * x).toFixed(3);
    sledeci.push({ korak: k, vrednost: Math.max(0, v) });
  }
  const smer = reg.b > 0.15 ? "raste" : reg.b < -0.15 ? "pada" : "stabilno";
  return {
    polje,
    trenutno: poslednji[polje],
    sledeci,
    smer,
    nagib: +reg.b.toFixed(4),
    pouzdanost: +reg.r2.toFixed(2),
    brojDana: red.length,
  };
}

function spojiDnevniTrend(attrTrend, merTrend) {
  const dani = {};
  (attrTrend || []).forEach(d => {
    if (!d.datum) return;
    dani[d.datum] = { datum: d.datum, ok: d.ok || 0, nok: d.nok || 0, n: d.n || 0 };
  });
  (merTrend || []).forEach(d => {
    if (!d.datum) return;
    if (!dani[d.datum]) dani[d.datum] = { datum: d.datum, ok: 0, nok: 0, n: 0 };
    dani[d.datum].ok += d.ok || 0;
    dani[d.datum].nok += d.nok || 0;
    dani[d.datum].n += d.n || 0;
  });
  return Object.values(dani)
    .sort((a, b) => String(a.datum).localeCompare(String(b.datum)))
    .map(d => ({
      ...d,
      rty: calcRTY(d.ok, d.n),
      p: calcP(d.nok, d.n),
    }));
}

function oceniStanjeModula({ rty, p, predikcijaP, minMerenja = 10 }) {
  if (minMerenja < 5) return { stanje: STANJE.NEDOVOLJNO, razlog: "Premalo merenja" };
  if (p >= 15 || Number(rty) < 85) {
    return { stanje: STANJE.KRITICNO, razlog: `NOK ${p}% · RTY ${rty}%` };
  }
  if (p >= 8 || Number(rty) < 92 || predikcijaP?.smer === "raste") {
    return { stanje: STANJE.UPOZORENJE, razlog: predikcijaP?.smer === "raste"
      ? `Trend NOK raste (nagib +${predikcijaP.nagib}/dan)`
      : `NOK ${p}% · RTY ${rty}%` };
  }
  return { stanje: STANJE.U_KONTROLI, razlog: `RTY ${rty}% · NOK ${p}%` };
}

function tezeStanja(a, b) {
  const red = [STANJE.U_KONTROLI, STANJE.UPOZORENJE, STANJE.KRITICNO, STANJE.NEDOVOLJNO];
  return red.indexOf(b) > red.indexOf(a) ? b : a;
}

const MERE_PO_DEFEKTU = {
  ogreban: "Pregledati zaštitu radnog mesta i transport — smanjiti kontakt pri rukovanju.",
  ogrebanje: "Pregledati zaštitu radnog mesta i transport — smanjiti kontakt pri rukovanju.",
  ulegnuce: "Proveriti pritisak alata / parametre štampe i čistoću matrice.",
  pukotina: "Analizirati parametre hlađenja i ciklus — uzorak na mikroskop.",
  dimenzija: "Kalibracija merila i set-up alata za kritičnu dimenziju.",
  tolerancija: "Ponoviti set-up procesa i verifikovati Cp/Cpk na SPC karti.",
  blokira: "Ispitati funkcionalnost sklopa — 100% funkcionalna kontrola do stabilizacije.",
  neispravan: "Segregacija serije, uzrok u proizvodnom parametru ili komponenti.",
};

function predlogZaDefekt(naziv, modul) {
  const k = (naziv || "").toLowerCase();
  for (const [kljuc, tekst] of Object.entries(MERE_PO_DEFEKTU)) {
    if (k.includes(kljuc)) {
      return { prioritet: "visok", modul, akcija: tekst, obrazlozenje: `Dominantan defekt: ${naziv}` };
    }
  }
  return {
    prioritet: "visok",
    modul,
    akcija: `Pokrenuti 5-Why / Ishikawa za defekt „${naziv}" — kontejnment i sortiranje.`,
    obrazlozenje: `Najčešći NOK u ${modul === "merljive" ? "merljivim" : "atributivnim"} kontrolama`,
  };
}

/**
 * Glavna analiza — koristi agregate iz zajedničkog dashboarda.
 */
export function analizirajProces({
  attr = {},
  merljive = {},
  trendAttr = [],
  trendMer = [],
  topNok = [],
  alarmi = [],
  eskalacije = {},
  oee = {},
  period = 7,
  idDeo = null,
} = {}) {
  const ukupnoTrend = spojiDnevniTrend(trendAttr, trendMer);
  const predAttr = predikcijaTrenda(trendAttr, "p", 3);
  const predMer = predikcijaTrenda(trendMer, "p", 3);
  const predUkupno = predikcijaTrenda(ukupnoTrend, "p", 3);
  const predRty = predikcijaTrenda(ukupnoTrend, "rty", 3);

  const attrP = attr.ukN > 0 ? calcP(attr.ukNOK, attr.ukN) : 0;
  const merP = merljive.merenja > 0 ? calcP(merljive.nok, merljive.merenja) : 0;

  const stanjeAttr = oceniStanjeModula({
    rty: attr.rty,
    p: attrP,
    predikcijaP: predAttr,
    minMerenja: attr.ukN || 0,
  });
  const stanjeMer = oceniStanjeModula({
    rty: merljive.rty,
    p: merP,
    predikcijaP: predMer,
    minMerenja: merljive.merenja || 0,
  });

  let ukupnoStanje = tezeStanja(stanjeAttr.stanje, stanjeMer.stanje);
  if (alarmi.some(a => a.nivo === "visok")) ukupnoStanje = STANJE.KRITICNO;
  if (!attr.ukN && !merljive.merenja) ukupnoStanje = STANJE.NEDOVOLJNO;

  const korektivneMere = [];

  (topNok || []).slice(0, 3).forEach(p => {
    korektivneMere.push({
      ...predlogZaDefekt(p.naziv, p.izvor === "merljive" ? "merljive" : "atributivne"),
      id_deo: p.id_deo || idDeo || null,
    });
  });

  if (predUkupno?.smer === "raste" && predUkupno.pouzdanost >= 0.35) {
    const sledeciP = predUkupno.sledeci[0]?.vrednost;
    korektivneMere.push({
      prioritet: "visok",
      modul: "oba",
      akcija: "Povećati učestalost kontrole i aktivirati dodatno uzorkovanje pre probijanja UCL.",
      obrazlozenje: `Predviđen NOK za sledeći period: ~${sledeciP}% (trend ${predUkupno.smer}, R²=${predUkupno.pouzdanost})`,
    });
  }

  if (predRty?.smer === "pada" && predRty.pouzdanost >= 0.3) {
    const sledeciRty = predRty.sledeci[0]?.vrednost;
    korektivneMere.push({
      prioritet: "srednji",
      modul: "oba",
      akcija: "Organizovati brzi pregled smene — segregacija sumnjivih komada i provera set-upa.",
      obrazlozenje: `RTY trend pada — procena sledećeg dana ~${sledeciRty}%`,
    });
  }

  if (Number(merP) > Number(attrP) + 3 && merljive.merenja >= 10) {
    korektivneMere.push({
      prioritet: "srednji",
      modul: "merljive",
      akcija: "Proveriti kalibraciju merila i set-up alata na pozicijama sa najviše NOK.",
      obrazlozenje: `Merljive NOK (${merP}%) iznad atributivnih (${attrP}%)`,
    });
  }

  if (oee.prosek != null && oee.prosek < 65) {
    korektivneMere.push({
      prioritet: "srednji",
      modul: "proizvodnja",
      akcija: "Analizirati zastoje i skart/doradu u KPI unosu — cilj OEE ≥ 65%.",
      obrazlozenje: `Prosečan OEE ${oee.prosek}% u poslednjih ${period} dana`,
    });
  }

  if (eskalacije?.otvorene > 0) {
    korektivneMere.push({
      prioritet: "srednji",
      modul: "capa",
      akcija: "Zatvoriti otvorene eskalacije sa dokumentovanom korektivnom akcijom (8D po potrebi).",
      obrazlozenje: `${eskalacije.otvorene} otvorenih eskalacija`,
    });
  }

  if (!korektivneMere.length && ukupnoStanje === STANJE.U_KONTROLI) {
    korektivneMere.push({
      prioritet: "info",
      modul: "oba",
      akcija: "Nastaviti redovno praćenje SPC karti — proces je stabilan.",
      obrazlozenje: "Nema značajnih odstupanja u posmatranom periodu",
    });
  }

  const vidljive = [];
  const kljucevi = new Set();
  for (const m of korektivneMere) {
    const k = `${m.modul}|${m.akcija.slice(0, 40)}`;
    if (kljucevi.has(k)) continue;
    kljucevi.add(k);
    vidljive.push(m);
  }

  const redPrior = { visok: 0, srednji: 1, info: 2 };
  vidljive.sort((a, b) => redPrior[a.prioritet] - redPrior[b.prioritet]);

  return {
    ukupnoStanje,
    stanjeAttr,
    stanjeMer,
    predikcija: {
      ukupnoNok: predUkupno,
      ukupnoRty: predRty,
      atributivne: predAttr,
      merljive: predMer,
    },
    sumarno: {
      period,
      ukupnoMerenja: (attr.ukN || 0) + (merljive.merenja || 0),
      ukupnoNok: (attr.ukNOK || 0) + (merljive.nok || 0),
      rtyAttr: attr.rty,
      rtyMer: merljive.rty,
      pAttr: attrP,
      pMer: merP,
      danaUTrendu: ukupnoTrend.length,
    },
    korektivneMere: vidljive.slice(0, 8),
  };
}

export function labelaStanja(stanje) {
  if (stanje === STANJE.KRITICNO) return "KRITIČNO";
  if (stanje === STANJE.UPOZORENJE) return "UPOZORENJE";
  if (stanje === STANJE.NEDOVOLJNO) return "NEDOVOLJNO PODATAKA";
  return "U KONTROLI";
}

export function bojaStanja(stanje, C) {
  if (stanje === STANJE.KRITICNO) return C.crvena;
  if (stanje === STANJE.UPOZORENJE) return C.zuta;
  if (stanje === STANJE.NEDOVOLJNO) return C.sivi;
  return C.zelena;
}

/** Cp/Cpk po poziciji + predikcija sledećeg Cpk (linearni trend po danima). */
export function analizirajKapabilitetPoPoziciji(karakteristike, merenja, n = 5) {
  const karMap = {};
  (karakteristike || []).forEach(k => { karMap[k.pozicija] = k; });

  const poPoz = {};
  (merenja || []).forEach(m => {
    const p = m.pozicija || "?";
    if (!poPoz[p]) poPoz[p] = [];
    poPoz[p].push(m);
  });

  return Object.entries(poPoz).map(([pozicija, ms]) => {
    const kar = karMap[pozicija];
    const podgrupe = podgrupeMerenja(ms, n, kar?.jedinica);
    const spc = izracunajXbarRKarte(podgrupe, n);
    const { cp, cpk } = calcCpCpk(spc.xbarBar, spc.sigmaHat, kar?.lsl, kar?.usl);

    const poDanu = {};
    ms.forEach(m => {
      if (!m.datum) return;
      if (!poDanu[m.datum]) poDanu[m.datum] = [];
      poDanu[m.datum].push(m);
    });
    const dani = Object.keys(poDanu).sort();
    const cpkPoDanu = dani.map((datum, i) => {
      const pg = podgrupeMerenja(poDanu[datum], n, kar?.jedinica);
      if (!pg.length) return null;
      const s = izracunajXbarRKarte(pg, n);
      const cap = calcCpCpk(s.xbarBar, s.sigmaHat, kar?.lsl, kar?.usl);
      return { datum, cpk: cap.cpk, x: i };
    }).filter(d => d && d.cpk != null);

    const reg = cpkPoDanu.length >= 3
      ? linearnaRegresija(cpkPoDanu.map(d => ({ x: d.x, y: d.cpk })))
      : null;
    const sledeciCpk = reg
      ? +Math.max(0, reg.a + reg.b * cpkPoDanu.length).toFixed(3)
      : null;
    const smerCpk = reg
      ? (reg.b > 0.03 ? "poboljsava" : reg.b < -0.03 ? "pogorsava" : "stabilno")
      : "nedovoljno";

    let preporuka = "Nastaviti redovno praćenje dimenzije.";
    if (cpk != null && cpk < 1.0) {
      preporuka = "Cpk < 1 — hitan set-up alata, kalibracija merila i segregacija serije.";
    } else if (cpk != null && cpk < 1.33) {
      preporuka = "Cpk 1–1.33 — optimizovati centriranje procesa i smanjiti varijaciju (R karta).";
    } else if (smerCpk === "pogorsava") {
      preporuka = `Cpk trend pada — predviđeno ~${sledeciCpk ?? "?"}; preventivni set-up pre probijanja tolerancije.`;
    }

    return {
      pozicija,
      nominala: kar?.nominala,
      lsl: kar?.lsl,
      usl: kar?.usl,
      jedinica: kar?.jedinica,
      cp,
      cpk,
      sledeciCpk,
      smerCpk,
      pouzdanost: reg ? +reg.r2.toFixed(2) : null,
      merenja: ms.length,
      podgrupa: n,
      preporuka,
      bojaCpk: (v, C) => bojaKapabiliteta(v, C),
    };
  }).sort((a, b) => {
    const ac = a.cpk ?? 99;
    const bc = b.cpk ?? 99;
    return ac - bc;
  });
}

function datumOdDana(dana) {
  const od = new Date();
  od.setDate(od.getDate() - Number(dana));
  return od.toISOString().split("T")[0];
}

/** Učitavanje i analiza za jedan deo (tab STANJE). */
export async function fetchInteligencijaDeo(supabase, { idDeo, period = 7 } = {}) {
  if (!idDeo) return null;
  const od = datumOdDana(period);

  const [logRes, merRes, karRes, sopRes] = await Promise.all([
    supabase.from("kontrolni_log")
      .select("datum,status,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,smena,id_deo")
      .eq("id_deo", idDeo)
      .gte("datum", od),
    supabase.from("merenja_varijabilna")
      .select("datum,status,id_deo,pozicija,smena,vrednost_raw,vrednost_dec,jedinica")
      .eq("id_deo", idDeo)
      .gte("datum", od),
    supabase.from("karakteristike_merljive")
      .select("pozicija,nominala,lsl,usl,jedinica,sifra_merenja")
      .eq("id_deo", idDeo),
    supabase.from("sop_deo_varijabilni")
      .select("broj_merenja")
      .eq("id_deo", idDeo)
      .maybeSingle(),
  ]);

  const logData = logRes.data || [];
  const merData = merRes.data || [];
  const karakteristike = karRes.data || [];
  const nPodgrupa = sopRes.data?.broj_merenja || 5;

  const attrAgg = aggregateLogRows(logData) || {};
  const merN = merData.length;
  const merNok = merData.filter(r => (r.status || "").toUpperCase() === "NOK").length;
  const merOk = merN - merNok;
  const trendAttr = attrAgg.trend || [];
  const trendMer = trendKvalitetaPoDanu(merData);

  const paretoAttr = buildParetoFromLog(logData, 6).map(p => ({
    ...p, izvor: "atributivne", id_deo: idDeo,
  }));
  const paretoMer = {};
  merData.forEach(r => {
    if ((r.status || "").toUpperCase() === "NOK") {
      const k = r.pozicija || "?";
      paretoMer[k] = (paretoMer[k] || 0) + 1;
    }
  });
  const topNok = [
    ...paretoAttr,
    ...Object.entries(paretoMer).map(([naziv, count]) => ({
      naziv, count, izvor: "merljive", id_deo: idDeo,
    })),
  ].sort((a, b) => b.count - a.count).slice(0, 8);

  const kapabilitet = analizirajKapabilitetPoPoziciji(karakteristike, merData, nPodgrupa);

  const inteligencija = analizirajProces({
    attr: {
      ukN: attrAgg.ukN || 0,
      ukNOK: attrAgg.ukNOK || 0,
      rty: attrAgg.rty || "0",
      dpmo: attrAgg.dpmo || 0,
    },
    merljive: {
      merenja: merN,
      nok: merNok,
      rty: calcRTY(merOk, merN),
      dpmo: calcDPMO(merNok, merN),
    },
    trendAttr,
    trendMer,
    topNok,
    alarmi: [],
    eskalacije: {},
    oee: {},
    period,
    idDeo,
  });

  kapabilitet.filter(k => k.cpk != null && k.cpk < 1.33).slice(0, 2).forEach(k => {
    inteligencija.korektivneMere.unshift({
      prioritet: k.cpk < 1 ? "visok" : "srednji",
      modul: "merljive",
      id_deo: idDeo,
      akcija: k.preporuka,
      obrazlozenje: `Pozicija ${k.pozicija}: Cpk=${k.cpk}${k.sledeciCpk != null ? ` → ~${k.sledeciCpk}` : ""}`,
    });
  });

  const redPrior = { visok: 0, srednji: 1, info: 2 };
  inteligencija.korektivneMere.sort((a, b) => redPrior[a.prioritet] - redPrior[b.prioritet]);
  inteligencija.korektivneMere = inteligencija.korektivneMere.slice(0, 8);

  return {
    idDeo,
    period,
    od,
    inteligencija,
    kapabilitet,
    imaPodatke: logData.length > 0 || merData.length > 0,
  };
}

/** Kreira eskalaciju iz predloga korektivne mere. */
export async function kreirajEskalacijuIzPredloga(supabase, {
  id_deo, opis, korektivna_akcija, prioritet = "visok", kreirao_id,
}) {
  if (!id_deo) throw new Error("Izaberite ID dela.");
  const prefiks = "INTEL";
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase.from("eskalacije")
    .select("id,opis,id_deo,korektivna_akcija,dodeljen_id,dodeljen:radnici!eskalacije_dodeljen_id_fkey(ime)")
    .eq("id_deo", id_deo)
    .in("status", ["otvoren", "u_toku"])
    .gte("created_at", since)
    .ilike("opis", `${prefiks}%`)
    .limit(5);
  const dupl = (existing || []).find(e =>
    (e.opis || "").includes((opis || "").slice(0, 40)),
  );
  if (dupl) {
    return {
      id: dupl.id,
      duplikat: true,
      dodeljen_ime: dupl.dodeljen?.ime || null,
      eskalacija: dupl,
    };
  }

  const { dodeljen_id, dodeljen_ime } = await predloziDodeljenogInzenjera(supabase);
  const priorMap = { visok: "visok", srednji: "srednji", info: "nizak" };
  const { data, error } = await supabase.from("eskalacije").insert({
    id_deo,
    opis: `${prefiks}: ${opis}`,
    korektivna_akcija,
    prioritet: priorMap[prioritet] || "srednji",
    status: "otvoren",
    kreirao_id: kreirao_id || null,
    dodeljen_id: dodeljen_id || null,
    rok: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  }).select("id,opis,id_deo,korektivna_akcija,dodeljen_id,dodeljen:radnici!eskalacije_dodeljen_id_fkey(ime)").single();
  if (error) throw error;
  return {
    id: data.id,
    duplikat: false,
    dodeljen_ime: data.dodeljen?.ime || dodeljen_ime,
    eskalacija: data,
  };
}

export { STANJE };
