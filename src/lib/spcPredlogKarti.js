/** Predlog SPC karata na osnovu tipa kontrole, dela i obima podataka. */

import { LAB_FPY_TAB } from "./rtyFpy.js";

export function jeKontrolaCelogVozila(deo) {
  if (!deo) return false;
  if (deo.tip_kontrole === "vozilo") return true;
  const id = (deo.id_deo || "").toUpperCase();
  const naziv = (deo.naziv_dela || "").toLowerCase();
  const kar = (deo.karakteristika || "").toLowerCase();
  return id.startsWith("AUTO")
    || id.startsWith("NTV")
    || id.startsWith("MRAP")
    || naziv.includes("komplet")
    || naziv.includes("celo vozilo")
    || kar.includes("celog vozila")
    || kar.includes("ceog vozila");
}

function statsAtributiv(rawData) {
  const rows = rawData || [];
  const nRows = rows.length;
  let ukN = 0;
  let ukNok = 0;
  let ukDefekata = 0;
  const velicine = [];
  const smene = new Set();
  const greske = new Set();

  rows.forEach(r => {
    const n = r.ukupno_merenja || 0;
    ukN += n;
    ukNok += r.nok_kolicina || 0;
    ukDefekata += r.kom_nok || 0;
    if (n > 0) velicine.push(n);
    if (r.smena) smene.add(r.smena);
    if (r.greska_naziv && r.greska_naziv !== "OK") greske.add(r.greska_naziv);
  });

  const avgN = velicine.length ? velicine.reduce((s, v) => s + v, 0) / velicine.length : 0;
  const minN = velicine.length ? Math.min(...velicine) : 0;
  const maxN = velicine.length ? Math.max(...velicine) : 0;
  const nVarijabilno = velicine.length > 1 && maxN !== minN;

  return {
    nRows,
    ukN,
    ukNok,
    ukDefekata,
    avgN,
    nVarijabilno,
    defekataPoKomadu: ukN > 0 ? ukDefekata / ukN : 0,
    pProc: ukN > 0 ? ukNok / ukN : 0,
    brojTipovaGresaka: greske.size,
    brojSmena: smene.size,
  };
}

function merenjeImaVrednost(m) {
  const raw = m?.vrednost_raw;
  const dec = m?.vrednost_dec;
  return Number.isFinite(raw) || Number.isFinite(dec) || (dec != null && dec !== "");
}

function statsMerljiv(rawData, pozicija) {
  const rows = (rawData || []).filter(merenjeImaVrednost);
  const n = rows.length;
  const nok = rows.filter(m => (m.status || "").toUpperCase() === "NOK").length;
  const pozicije = new Set(rows.map(m => m.pozicija).filter(Boolean));
  const poPoz = pozicija ? 1 : pozicije.size;

  return { n, nok, brojPozicija: poPoz, viseDimenzija: !pozicija && pozicije.size > 1 };
}

/**
 * @returns {{ naslov: string, opis: string, stavke: {id:string,naziv:string,tekst:string}[], preporuceniIds: string[] }}
 */
export function predlogAtributivnihKarti({ deo, rawData = [], grupisanje = "dan" }) {
  const st = statsAtributiv(rawData);
  const kom = Number(deo?.kom_za_kontrolu) || 0;
  const kar = (deo?.karakteristika || "").toLowerCase();
  const vozilo = jeKontrolaCelogVozila(deo);
  const stavke = [];
  const seen = new Set();

  const add = (id, naziv, tekst, score) => {
    if (seen.has(id)) return;
    seen.add(id);
    stavke.push({ id, naziv, tekst, score });
  };

  if (vozilo) {
    add("p", "p-Karta", "udeo neispravnih vozila po danu/smeni", 100);
    add("u", "u-Karta", "prosečan broj defekata po vozilu", 95);
    add("pareto", "Pareto", "dominantni defekti na celom autu", 90);
    add("rty", LAB_FPY_TAB, "trend kvaliteta finalne kontrole", 85);
    stavke.sort((a, b) => b.score - a.score);
    return {
      naslov: "Kontrola celog vozila",
      ikona: "🚗",
      opis: st.nRows
        ? `Atributivni podaci: ${st.nRows} unosa, ${st.ukN} jedinica. Za dimenzije koristi Varijabilne veličine. C/nC retko za finalni auto.`
        : "Finalna vizuelna kontrola — grupiši po danu ili smeni. Za dimenzije (CMM) koristi Varijabilne veličine.",
      stavke: stavke.map(({ id, naziv, tekst }) => ({ id, naziv, tekst })),
      preporuceniIds: stavke.map(s => s.id),
    };
  }

  if (st.nVarijabilno || grupisanje === "dan" || grupisanje === "dan_smena") {
    add("p", "p-Karta", "udeo neispravnih kada se broj uzoraka menja po periodu", 90);
  } else if (st.nRows >= 3 && st.avgN > 0) {
    add("np", "np-Karta", `broj loših kada je uzorak stabilan (≈${Math.round(st.avgN)}/period)`, 88);
  } else {
    add("p", "p-Karta", "proporcija neispravnih po periodu", 85);
  }

  if (st.defekataPoKomadu >= 1.2 || kar.includes("defekt") || kar.includes("grešk")) {
    add("u", "u-Karta", "više defekata po komadu — prosečan broj grešaka/merenje", 82);
  }

  if (st.defekataPoKomadu >= 2.5 && st.nRows >= 2) {
    add("nc", "nC-Karta", "ukupan broj grešaka po periodu", 70);
  }

  if (st.brojTipovaGresaka >= 2 || st.ukDefekata > st.ukNok) {
    add("pareto", "Pareto", "koji tipovi grešaka dominiraju", 92);
  }

  if (st.nRows >= 2) {
    add("rty", LAB_FPY_TAB, "trend kvaliteta kroz vreme", 80);
  }

  if (st.brojSmena >= 2) {
    add("smena", "Po smeni", "poređenje smena za isti deo", 75);
  }

  if (kom <= 15 && st.nRows > 0) {
    add("u", "u-Karta", "mali cilj uzorka — prati defekte po jedinici", 78);
  }

  if (st.nRows === 0) {
    add("pareto", "Pareto", "posle prvih unosa — top greške", 70);
    if (kar.includes("dimenzij") || kar.includes("zazor")) {
      add("p", "p-Karta", "vizuelna/zazor kontrola — udeo NOK", 65);
    }
  }

  if (st.nRows < 5 && st.nRows > 0) {
    add("pareto", "Pareto", "malo tačaka — prvo identifikuj glavne greške", 94);
  }

  stavke.sort((a, b) => b.score - a.score);
  const top = stavke.slice(0, 5);

  const opisDelovi = [];
  if (deo?.karakteristika) opisDelovi.push(deo.karakteristika);
  if (kom) opisDelovi.push(`cilj ~${kom}/smena`);
  let opis = opisDelovi.length ? opisDelovi.join(" · ") + ". " : "";
  if (st.nRows) {
    opis += `${st.nRows} unosa, ${st.ukN} merenja`;
    if (st.nVarijabilno) opis += ", varijabilan n → p-karta";
    else if (st.avgN) opis += `, n̄≈${Math.round(st.avgN)}`;
    if (st.pProc > 0) opis += `, p≈${(st.pProc * 100).toFixed(1)}%`;
    opis += ".";
  } else {
    opis += "Nema podataka u filteru — predlog na osnovu tipa dela; učitaj period ili osveži.";
  }

  return {
    naslov: deo?.naziv_dela ? `Deo ${deo.id_deo}` : "Atributivna kontrola",
    ikona: "📊",
    opis,
    stavke: top.map(({ id, naziv, tekst }) => ({ id, naziv, tekst })),
    preporuceniIds: top.map(s => s.id),
  };
}

/**
 * @returns {{ naslov: string, opis: string, stavke: {id:string,naziv:string,tekst:string}[], preporuceniIds: string[] }}
 */
export function predlogMerljivihKarti({
  deo,
  rawData = [],
  pozicija = "",
  pozicijeCount = 0,
  imaGranice = false,
  nPodgrupa = 5,
  brojPodgrupa = 0,
}) {
  const st = statsMerljiv(rawData, pozicija);
  const brojMerenjaPoUzorku = Number(deo?.broj_merenja) || 1;
  const n = Math.min(10, Math.max(2, nPodgrupa));
  const stavke = [];
  const seen = new Set();

  const add = (id, naziv, tekst, score) => {
    if (seen.has(id)) return;
    seen.add(id);
    stavke.push({ id, naziv, tekst, score });
  };

  const dovoljnoZaXbarR = brojPodgrupa >= 2 && st.n >= n * 2;
  const maloMerenja = st.n < n * 2;
  const jednoPoUzorku = brojMerenjaPoUzorku <= 1;

  if (st.viseDimenzija || (!pozicija && pozicijeCount > 1)) {
    add("pareto", "Pareto NOK", "koja dimenzija najčešće pada", 95);
    add("dashboard", "Dashboard", "pregled svih pozicija odjednom", 88);
  }

  if (pozicija) {
    if (dovoljnoZaXbarR && !jednoPoUzorku) {
      add("xbar", "X̄-Karta", `sredina podgrupa n=${n} (${brojPodgrupa} podgrupa)`, 100);
      add("r", "R-Karta", "raspon unutar podgrupe — varijacija procesa", 95);
    }
    if (maloMerenja || jednoPoUzorku) {
      add("i", "I-Karta", "pojedinačna merenja (malo tačaka ili 1 merenje/uzorak)", 92);
      add("mr", "MR-Karta", "pomeraj između uzastopnih merenja", 85);
    }
    if (imaGranice && st.n >= 5) {
      add("cpk", "Cp/Cpk", "kapabilitet u odnosu na LSL/USL", 90);
      add("hist", "Histogram", "raspodela oko tolerancija", 82);
    }
  } else if (st.n > 0) {
    add("pareto", "Pareto NOK", "izaberi problematičnu dimenziju", 93);
    add("dashboard", "Dashboard", "zatim otvori X̄/R za jednu poziciju", 80);
  }

  if (st.nok > 0 || st.n >= 3) {
    add("rty", LAB_FPY_TAB, "trend OK/NOK merenja", 78);
    add("sigma", "Sigma nivo", "DPMO i proces sigma", 76);
  }

  if (st.n >= 10 && !pozicija) {
    add("smena", "Po smeni", "da li smena utiče na dimenzije", 72);
    add("heatmap", "Heat mapa", "NOK po danu i smeni", 68);
  }

  if (st.n >= 3) {
    add("oee", "OEE", "škart, dorada i OEE za period filtera", 66);
  }

  if (st.n >= 5) {
    add("masina", "Po mašini", "NOK po radnom mestu / mašini", 70);
    add("operater", "Po operateru", "kontrolor i operater na unosu", 68);
  }

  if (st.nok >= 3) {
    add("korelacija", "Korelacija", "dimenzija × mašina za NOK", 74);
    add("foto_spc", "Foto arhiva", "NOK merenja sa fotografijama", 72);
    add("poredi", "Poređenje", "tekuci vs prethodni period", 70);
  }

  if (st.nok > 0) {
    add("8d", "8D", "korektivna akcija za dimenziju / deo", 65);
  }

  if (st.n === 0) {
    if (pozicijeCount > 1) {
      add("dashboard", "Dashboard", `deo ima ${pozicijeCount} dimenzija — start ovde`, 90);
      add("pareto", "Pareto NOK", "posle unosa — koja pozicija pada", 85);
    } else if (pozicijeCount === 1) {
      add("xbar", "X̄-Karta", "jedna dimenzija — kontrola sredine procesa", 88);
      add("i", "I-Karta", "alternativa dok nema dovoljno podgrupa", 75);
    } else {
      add("dashboard", "Dashboard", "definiši karakteristike u šifarniku", 70);
    }
    if (imaGranice) add("cpk", "Cp/Cpk", "kad uneseš merenja sa granicama", 65);
  }

  stavke.sort((a, b) => b.score - a.score);
  const top = stavke.slice(0, 5);

  let opis = "";
  if (deo?.naziv_dela) opis = `${deo.id_deo} — ${deo.naziv_dela}. `;
  opis += `${brojMerenjaPoUzorku} merenj${brojMerenjaPoUzorku === 1 ? "e" : "a"}/uzorak`;
  if (pozicija) opis += ` · pozicija «${pozicija}»`;
  else if (pozicijeCount) opis += ` · ${pozicijeCount} dimenzija`;
  if (st.n) {
    opis += ` · ${st.n} zapisa`;
    if (brojPodgrupa) opis += `, ${brojPodgrupa} podgrupa (n=${n})`;
    if (st.nok) opis += `, ${st.nok} NOK`;
    opis += ".";
  } else {
    opis += " · nema merenja u filteru.";
  }

  return {
    naslov: pozicija ? `Dimenzija: ${pozicija}` : (deo?.naziv_dela || "Merljiva kontrola"),
    ikona: "📐",
    opis,
    stavke: top.map(({ id, naziv, tekst }) => ({ id, naziv, tekst })),
    preporuceniIds: top.map(s => s.id),
  };
}

export function vodicSakrijKey(modul, idDeo) {
  return `spc_vodic_sakrij_${modul}_${idDeo || "_"}`;
}

export function jeVodicSakriven(modul, idDeo) {
  if (!idDeo) return true;
  return sessionStorage.getItem(vodicSakrijKey(modul, idDeo)) === "1";
}

export function sakrijVodic(modul, idDeo) {
  if (idDeo) sessionStorage.setItem(vodicSakrijKey(modul, idDeo), "1");
}
