/**
 * Glavni unos — zajednička logika (browser + Node).
 * Izvor istine za mapiranje: excel rad izmenjen/glavni unos.xlsx (voziloN tabovi).
 */
import {
  mapKarakteristikaMerljiveRow,
  dodeliSerijeMerenja,
  normalizujKarakteristikuRed,
  KARAKTERISTIKE_UPSERT_CONFLICT,
} from "./karakteristikaMerljive.js";
import { dedupeRowsForUpsert } from "./upsertUtil.js";
import { propagirajMetaKarakteristika } from "./definicijaKarakteristika.js";
import { pogonIzLinijeFaze } from "./syncSifrarnikIzMerljivih.js";
import { normHeader } from "./radniNaloziUvoz.js";
import {
  GLAVNI_UNOS_BROJ_MERENJA_DEFAULT,
  GLAVNI_UNOS_COL_BROJ_MERENJA,
} from "./spcDefaults.js";
import {
  pogonLinijaMapIzGlavnogUnosa,
  setPogonLinijaMap,
} from "./pogonLinijaLookup.js";
import {
  granicaZaSnimanje,
  granicaTextZaKarakteristiku,
} from "./glavniUnosGranice.js";
import { isUgao } from "./varijabilneUtils.js";
import { normalizujIdDeo } from "./idDeoUtil.js";

export const VOZILO_SHEET_RE = /^vozilo\d+$/i;

export { GLAVNI_UNOS_BROJ_MERENJA_DEFAULT, GLAVNI_UNOS_COL_BROJ_MERENJA };

export { metaDeoIzGlavnogUnosa } from "./glavniUnosDemo.js";

export const GLAVNI_UNOS_VOZILO_HEADERS = [
  "id", "Datum", "id_deo", "Broj crteza", "Radni_nalog", "Kupac", "Naziv dela", "Slika",
  "Linija", "Operacija", "Masina_id", "Ukupno_kom", "Kom_za_kontrolu_n",
  "Karakteristika", "Klasa", "Nominal", "USL", "LSL", "Jedinica", "Tip",
  "Instrument", "Kontolor",
  "Nivo_kontrole FAC",
  "FAC broj",
  GLAVNI_UNOS_COL_BROJ_MERENJA,
  "Reakcioni plan",
  "Podatke uneo",
];

export const GLAVNI_UNOS_DB_COLS = [
  "sheet_naziv", "redosled", "id_deo", "datum", "broj_crteza", "radni_nalog", "kupac",
  "naziv_dela", "slika", "linija", "operacija", "masina_id", "ukupno_kom",
  "kom_za_kontrolu_n", "karakteristika", "klasa", "nominal", "usl", "lsl",
  "jedinica", "tip", "instrument", "kontolor", "nivo_kontrole_fac", "fac_broj",
  "spc_broj_merenja", "reakcioni_plan", "podatke_uneo",
];

function nk(s) {
  return normHeader(s);
}

export function pick(row, ...keys) {
  for (const k of keys) {
    for (const [hk, val] of Object.entries(row || {})) {
      if (nk(hk) === nk(k) && val !== undefined && val !== null && String(val).trim() !== "") {
        return String(val).trim();
      }
    }
  }
  return "";
}

export function num(v) {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function dbRedToExcelRaw(row) {
  if (!row) return {};
  return {
    id_deo: row.id_deo,
    Datum: row.datum,
    "Broj crteza": row.broj_crteza,
    Radni_nalog: row.radni_nalog,
    Kupac: row.kupac,
    "Naziv dela": row.naziv_dela,
    Slika: row.slika,
    Linija: row.linija,
    Operacija: row.operacija,
    Masina_id: row.masina_id,
    Ukupno_kom: row.ukupno_kom,
    Kom_za_kontrolu_n: row.kom_za_kontrolu_n,
    Karakteristika: row.karakteristika,
    Klasa: row.klasa,
    Nominal: row.nominal,
    USL: row.usl,
    LSL: row.lsl,
    Jedinica: row.jedinica,
    Tip: row.tip,
    Instrument: row.instrument,
    Kontolor: row.kontolor,
    "Nivo_kontrole FAC": row.nivo_kontrole_fac,
    "FAC broj": row.fac_broj,
    [GLAVNI_UNOS_COL_BROJ_MERENJA]: row.spc_broj_merenja,
    "Reakcioni plan": row.reakcioni_plan,
    "Podatke uneo": row.podatke_uneo,
  };
}

export function excelRawToDbPayload(raw, sheetNaziv, redosled = 0) {
  return {
    sheet_naziv: sheetNaziv,
    redosled,
    id_deo: normalizujIdDeo(pick(raw, "id_deo", "id dela")) || null,
    datum: pick(raw, "Datum", "datum") || null,
    broj_crteza: pick(raw, "Broj crteza", "broj crteza") || null,
    radni_nalog: pick(raw, "Radni_nalog", "radni_nalog", "radni nalog") || null,
    kupac: pick(raw, "Kupac", "kupac", "customer") || null,
    naziv_dela: pick(raw, "Naziv dela", "naziv_dela") || null,
    slika: pick(raw, "Slika", "slika") || null,
    linija: pick(raw, "Linija", "linija") || null,
    operacija: pick(raw, "Operacija", "operacija") || null,
    masina_id: num(pick(raw, "Masina_id", "masina_id")),
    ukupno_kom: num(pick(raw, "Ukupno_kom", "ukupno_kom")),
    kom_za_kontrolu_n: num(pick(raw, "Kom_za_kontrolu_n", "kom za kontrolu n")),
    karakteristika: pick(raw, "Karakteristika", "karakteristika") || null,
    klasa: pick(raw, "Klasa", "klasa") || null,
    nominal: granicaZaSnimanje(pick(raw, "Nominal", "nominala", "nominal"), pick(raw, "Jedinica", "jedinica")),
    usl: granicaZaSnimanje(pick(raw, "USL", "usl"), pick(raw, "Jedinica", "jedinica")),
    lsl: granicaZaSnimanje(pick(raw, "LSL", "lsl"), pick(raw, "Jedinica", "jedinica")),
    jedinica: pick(raw, "Jedinica", "jedinica") || null,
    tip: pick(raw, "Tip", "tip") || null,
    instrument: pick(raw, "Instrument", "merni_instrument") || null,
    kontolor: pick(raw, "Kontolor", "kontolor") || null,
    nivo_kontrole_fac: pick(raw, "Nivo_kontrole FAC", "nivo_kontrole") || null,
    fac_broj: num(pick(raw, "FAC broj", "fai_broj_merenja")),
    spc_broj_merenja: num(pick(raw, GLAVNI_UNOS_COL_BROJ_MERENJA, "broj_merenja")),
    reakcioni_plan: pick(raw, "Reakcioni plan", "napomena") || null,
    podatke_uneo: pick(raw, "Podatke uneo") || null,
  };
}

export function buildLookupsFromPogonRows(pogonRows) {
  const pogonByLinija = new Map();
  for (const r of pogonRows || []) {
    const faza = r.linija_faza;
    if (!faza) continue;
    pogonByLinija.set(nk(faza), {
      linija_id: num(r.linija_id),
      pogon: String(r.pogon_kod || "").trim().toUpperCase(),
      linija_faza: faza,
    });
  }
  return {
    pogonByLinija,
    linijaByName: new Map(),
    masinaByLinijaOperacija: new Map(),
  };
}

/** Lookup iz Excel workbook-a (pogon_kod + Pomocni). */
export function buildGlavniUnosLookups(wb, sheetRowsFn) {
  const pogonByLinija = new Map();
  sheetRowsFn(wb, "pogon_kod").forEach((r) => {
    const faza = pick(r, "linija_faza", "linija");
    if (!faza) return;
    pogonByLinija.set(nk(faza), {
      linija_id: num(pick(r, "linija_id", "linij_id")),
      pogon: pick(r, "pogon kod", "pogon_kod", "pogon").toUpperCase(),
      linija_faza: faza,
    });
  });

  const linijaByName = new Map();
  const masinaByLinijaOperacija = new Map();
  sheetRowsFn(wb, "Pomocni").forEach((r) => {
    const linija = pick(r, "linija");
    if (linija) {
      linijaByName.set(nk(linija), {
        id_linija: num(pick(r, "id_linija", "linija id")),
        linija,
      });
    }
    const op = pick(r, "operacija");
    const masinaNaziv = pick(r, "naziv masine", "masina");
    if (linija && op && masinaNaziv) {
      masinaByLinijaOperacija.set(`${nk(linija)}|${nk(op)}`, masinaNaziv);
    }
  });

  return { pogonByLinija, linijaByName, masinaByLinijaOperacija };
}

export function brojMerenjaIzGlavnogUnosaReda(raw, tip) {
  const tipL = String(tip || "").toLowerCase();
  const n = num(pick(
    raw,
    GLAVNI_UNOS_COL_BROJ_MERENJA,
    "Broj merenja ucestalost (1/h)",
    "Broj merenja",
    "broj_merenja",
    "Broj_merenja",
  ));
  if (tipL.includes("atributiv")) return null;
  if (tipL.includes("merljiv") && !n) return GLAVNI_UNOS_BROJ_MERENJA_DEFAULT;
  return n;
}

export function mapGlavniUnosVoziloRed(raw, lookups) {
  const idDeo = pick(raw, "id_deo", "id dela").toUpperCase();
  if (!idDeo) return null;

  const linijaFaza = pick(raw, "Linija", "linija", "linija_faza");
  const pogonInfo = lookups.pogonByLinija.get(nk(linijaFaza));
  const linijaInfo = lookups.linijaByName.get(nk(linijaFaza));
  let pogon = pogonInfo?.pogon || pogonIzLinijeFaze(linijaFaza) || "";
  if (!pogon && linijaFaza) {
    const rnProbe = pick(raw, "Radni_nalog", "radni_nalog", "radni nalog");
    const m = String(rnProbe || "").trim().toUpperCase().match(/-([A-H])$/);
    if (m) pogon = m[1];
  }

  const operacija = pick(raw, "Operacija", "operacija", "faza_naziv");
  let masinaId = num(pick(raw, "Masina_id", "masina_id", "masina id"));
  if (!masinaId) {
    const masinaNaziv = lookups.masinaByLinijaOperacija.get(`${nk(linijaFaza)}|${nk(operacija)}`);
    if (masinaNaziv) masinaId = num(masinaNaziv.replace(/\D/g, "")) || 1;
  }

  const karakteristika = pick(raw, "Karakteristika", "karakteristika", "pozicija");
  const tip = pick(raw, "Tip", "tip").toLowerCase();
  let instrument = pick(raw, "Instrument", "merni_instrument", "merni instrument");
  if (tip.includes("atributiv")) {
    if (!instrument) instrument = /dokument/i.test(karakteristika) ? "Dokumentacija" : "Vizuelno";
  }

  const nivoRaw = pick(raw, "Nivo_kontrole FAC", "nivo_kontrole", "nivo kontrole");
  const faiRaw = pick(raw, "FAC broj", "fai_broj_merenja", "fai broj merenja");

  const jedinica = pick(raw, "Jedinica", "jedinica") || "mm";
  const uslNum = granicaZaSnimanje(raw.usl ?? pick(raw, "USL", "usl"), jedinica);
  const lslNum = granicaZaSnimanje(raw.lsl ?? pick(raw, "LSL", "lsl"), jedinica);
  const nomNum = granicaZaSnimanje(raw.nominal ?? pick(raw, "Nominal", "nominala"), jedinica);

  return {
    id_deo: idDeo,
    pogon_kod: pogon,
    sifra_merenja: pick(raw, "sifra_merenja", "sifra merenja"),
    broj_merenja: brojMerenjaIzGlavnogUnosaReda(raw, tip),
    klasa: pick(raw, "Klasa", "klasa"),
    radni_nalog: pick(raw, "Radni_nalog", "radni_nalog", "radni nalog"),
    faza_naziv: operacija,
    linija_faza: linijaFaza,
    linija_id: pogonInfo?.linija_id ?? linijaInfo?.id_linija ?? null,
    masina_id: masinaId,
    naziv_dela: pick(raw, "Naziv dela", "naziv_dela"),
    slika: pick(raw, "Slika", "slika"),
    ukupno_kom: num(pick(raw, "Ukupno_kom", "ukupno_kom")),
    kom_za_kontrolu_n: num(pick(raw, "Kom_za_kontrolu_n", "kom za kontrolu n")),
    // „Šta se meri” = pozicija. Naziv mere ostaje prazan — inače se na unosu
    // duplira isti tekst u „Šta se meri” i „Nominala / oznaka”. Nominala ide u nominala.
    pozicija: karakteristika,
    naziv_mere: null,
    nominala: nomNum,
    usl: uslNum,
    lsl: lslNum,
    usl_text: granicaTextZaKarakteristiku(uslNum, jedinica),
    lsl_text: granicaTextZaKarakteristiku(lslNum, jedinica),
    jedinica: isUgao(jedinica) ? "stepen" : jedinica,
    merni_instrument: instrument,
    napomena: pick(raw, "Reakcioni plan", "napomena"),
    nivo_kontrole: nivoRaw || null,
    fai_broj_merenja: num(faiRaw),
  };
}

function karKey(r) {
  const nr = normalizujKarakteristikuRed(r);
  const pogon = String(nr.pogon_kod || "").trim().toUpperCase();
  return [
    String(nr.id_deo).toUpperCase(),
    pogon,
    String(nr.sifra_merenja || "").trim(),
    String(nr.pozicija).trim(),
  ].join("|");
}

export function mergeKarakteristike(postojeci, izGlavnog) {
  const touchedDeo = new Set(izGlavnog.map((r) => String(r.id_deo).toUpperCase()));
  const kept = (postojeci || []).filter((r) => !touchedDeo.has(String(r.id_deo).toUpperCase()));

  let maxId = [...kept, ...izGlavnog].reduce((m, r) => Math.max(m, num(r.id) || 0), 0);
  const byKey = new Map();
  kept.forEach((r) => byKey.set(karKey(r), { ...r }));

  izGlavnog.forEach((r) => {
    const key = karKey(r);
    const old = byKey.get(key);
    const id = old?.id ?? (++maxId);
    byKey.set(key, { ...old, ...r, id });
  });

  return dedupeRowsForUpsert(
    [...byKey.values()].map(normalizujKarakteristikuRed),
    KARAKTERISTIKE_UPSERT_CONFLICT,
  ).sort((a, b) => {
    const c = String(a.id_deo).localeCompare(String(b.id_deo));
    return c !== 0 ? c : String(a.pozicija).localeCompare(String(b.pozicija));
  });
}

/** Karakteristike iz DB redova glavnog unosa. */
export function karakteristikeIzGlavniUnosRedova(dbRedovi, lookups) {
  const karakteristike = [];
  for (const row of dbRedovi || []) {
    if (!row?.id_deo || !row?.karakteristika) continue;
    const mapped = mapGlavniUnosVoziloRed(dbRedToExcelRaw(row), lookups);
    if (!mapped) continue;
    const kar = mapKarakteristikaMerljiveRow(mapped);
    if (kar.id_deo && kar.pozicija) karakteristike.push(kar);
  }
  return dodeliSerijeMerenja(propagirajMetaKarakteristika(karakteristike));
}

/** Kupac, RN i količina po delu — za propagaciju u radni_nalozi. */
export function kupacPoDeoIzGlavnogUnosa(dbRedovi) {
  const map = new Map();
  for (const row of dbRedovi || []) {
    const id = normalizujIdDeo(row.id_deo);
    if (!id) continue;
    const prev = map.get(id) || {};
    map.set(id, {
      kupac: row.kupac || prev.kupac || null,
      radni_nalog: row.radni_nalog || prev.radni_nalog || null,
      ukupno_kom: row.ukupno_kom ?? prev.ukupno_kom ?? null,
      naziv_dela: row.naziv_dela || prev.naziv_dela || null,
    });
  }
  return map;
}

/**
 * Pogoni za atributivni modul — direktno iz redova glavnog unosa (id_deo + pogon + karakteristike).
 */
export function pogonRedoviIzGlavnogUnosa(dbRedovi, lookups) {
  const byKey = new Map();

  for (const row of dbRedovi || []) {
    if (!row?.id_deo || !row?.karakteristika) continue;
    const mapped = mapGlavniUnosVoziloRed(dbRedToExcelRaw(row), lookups);
    if (!mapped?.id_deo) continue;

    const pogon = String(mapped.pogon_kod || "").trim().toUpperCase();
    if (!pogon) continue;

    const key = `${mapped.id_deo}|${pogon}`;
    const kar = String(row.karakteristika || "").trim();
    const prev = byKey.get(key) || {
      id_deo: mapped.id_deo,
      pogon_kod: pogon,
      radni_nalog: mapped.radni_nalog || row.radni_nalog || null,
      naziv_dela: mapped.naziv_dela || row.naziv_dela || null,
      karakteristika: mapped.faza_naziv || row.operacija || null,
      kom_za_kontrolu: mapped.kom_za_kontrolu_n ?? row.kom_za_kontrolu_n ?? 30,
      napomena: null,
      aktivan: true,
      karSet: new Set(),
    };

    if (kar) prev.karSet.add(kar);
    byKey.set(key, prev);
  }

  return [...byKey.values()].map(({ karSet, ...p }) => ({
    id_deo: p.id_deo,
    pogon_kod: p.pogon_kod,
    radni_nalog: p.radni_nalog,
    naziv_dela: p.naziv_dela,
    karakteristika: [...karSet].join(", ") || p.karakteristika,
    kom_za_kontrolu: p.kom_za_kontrolu,
    napomena: p.napomena,
    aktivan: true,
  }));
}

export function parseGlavniUnosVoziloSheets(wb, sheetRowsFn) {
  const lookups = buildGlavniUnosLookups(wb, sheetRowsFn);
  setPogonLinijaMap(pogonLinijaMapIzGlavnogUnosa(lookups.pogonByLinija));
  const sheets = [];
  const karakteristike = [];

  wb.SheetNames.forEach((name) => {
    if (!VOZILO_SHEET_RE.test(name)) return;
    const rows = sheetRowsFn(wb, name).filter((r) => pick(r, "id_deo", "id dela"));
    if (!rows.length) return;
    sheets.push({ name, redova: rows.length });

    rows.forEach((raw) => {
      const mapped = mapGlavniUnosVoziloRed(raw, lookups);
      if (!mapped) return;
      const kar = mapKarakteristikaMerljiveRow(mapped);
      if (kar.id_deo && kar.pozicija) karakteristike.push(kar);
    });
  });

  const saSerijama = dodeliSerijeMerenja(propagirajMetaKarakteristika(karakteristike));
  return { lookups, sheets, karakteristike: saSerijama };
}
