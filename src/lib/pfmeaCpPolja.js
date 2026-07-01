/**
 * Definicije polja za unos PFMEA i Control Plan — label, placeholder, tip, grupe.
 * PFMEA: 9 numerisanih polja (vertikalni raspored).
 */

export const PFMEA_UNOS_GRUPE = [
  {
    id: "p1",
    naslov: "1. IDENTIFIKACIJA PROCESA",
    cols: 1,
    polja: [
      { key: "br_dela", label: "Broj dela", placeholder: "npr. NM-001", required: true },
      { key: "proces", label: "Proces / operacija", placeholder: "npr. WS-04 Zavarivanje MIG", rows: 2, required: true },
    ],
  },
  {
    id: "p2",
    naslov: "2. EFEKAT GREŠKE",
    cols: 1,
    polja: [
      { key: "efekat_greske", label: "Efekat greške", placeholder: "Posledica za kupca, bezbednost, funkciju", rows: 2, required: true },
      { key: "s", label: "S — ozbiljnost", type: "number", min: 1, max: 10, placeholder: "1–10" },
    ],
  },
  {
    id: "p3",
    naslov: "3. MOD GREŠKE",
    cols: 1,
    polja: [
      { key: "mod_greske", label: "Mod greške", placeholder: "npr. Pukotina zavara u HAZ zoni", rows: 2, required: true },
      { key: "uzrok_greske", label: "Uzrok greške", placeholder: "Kategorija / opis uzroka", rows: 2 },
    ],
  },
  {
    id: "p4",
    naslov: "4. UZROK I POJAVLJIVANJE",
    cols: 1,
    polja: [
      { key: "uzrok_mehanizam", label: "Uzrok / mehanizam", placeholder: "Zašto se greška dešava (5M, parametri…)", rows: 2 },
      { key: "o", label: "O — ponavljanje", type: "number", min: 1, max: 10, placeholder: "1–10" },
    ],
  },
  {
    id: "p5",
    naslov: "5. KONTROLE I OTKRIVANJE",
    cols: 1,
    polja: [
      { key: "postojece_kontrole", label: "Postojeće kontrole", placeholder: "PT 5%, vizuelni pregled…", rows: 2 },
      { key: "d", label: "D — otkrivanje", type: "number", min: 1, max: 10, placeholder: "1–10" },
    ],
  },
  {
    id: "p6",
    naslov: "6. RPN BEFORE (PRE)",
    cols: 1,
    polja: [
      { key: "rpn_before", label: "RPN before", type: "number", placeholder: "S × O × D", readOnlyCalc: true },
    ],
  },
  {
    id: "p7",
    naslov: "7. PREPORUČENE AKCIJE / KOREKTIVNE MERE",
    cols: 1,
    polja: [
      { key: "akcija", label: "Preporučena akcija", placeholder: "SPC praćenje, 100% kontrola…", rows: 2 },
      { key: "odgovorni", label: "Odgovorni", placeholder: "Ime / uloga / tim" },
      { key: "rok", label: "Rok", placeholder: "dd.mm.gggg." },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["", "Otvoreno", "U toku", "Završeno", "Verifikovano"],
      },
    ],
  },
  {
    id: "p8",
    naslov: "8. NOVA OCENA",
    cols: 3,
    polja: [
      { key: "s_posle", label: "S — ozbiljnost", type: "number", min: 1, max: 10, placeholder: "1–10" },
      { key: "o_posle", label: "O — ponavljanje", type: "number", min: 1, max: 10, placeholder: "1–10" },
      { key: "d_posle", label: "D — otkrivanje", type: "number", min: 1, max: 10, placeholder: "1–10" },
      { key: "rpn_after", label: "RPN after (posle)", type: "number", placeholder: "S × O × D", readOnlyCalc: true, span: 3 },
    ],
  },
  {
    id: "p9",
    naslov: "9. STATUS I ODGOVORNOST",
    cols: 1,
    polja: [
      { key: "pfmea_veza", label: "PFMEA veza", placeholder: "PFMEA-NM-001 §3.2" },
      { key: "control_plan_ref", label: "Control Plan ref.", placeholder: "CP-NM-001 Op.04" },
      { key: "odobrio", label: "Odobrio", placeholder: "Ime / funkcija" },
      { key: "datum", label: "Datum", type: "date" },
    ],
  },
];

export const CP_UNOS_GRUPE = [
  {
    id: "cp1",
    naslov: "1. IDENTIFIKACIJA DELA / PROCESA",
    cols: 1,
    polja: [
      { key: "br_dela", label: "Br. dela / ID", placeholder: "npr. NM-001", required: true },
      { key: "proces", label: "Operacija / proces", placeholder: "npr. WS-04 / Finalni pregled", rows: 2, required: true },
    ],
  },
  {
    id: "cp2",
    naslov: "2. KARAKTERISTIKA KONTROLE",
    cols: 1,
    polja: [
      { key: "karakteristika", label: "Karakteristika (KSK/VSK)", placeholder: "npr. Napon zavarivanja (U)", rows: 2, required: true },
      {
        key: "klasifikacija",
        label: "Klasifikacija karakteristika",
        type: "select",
        options: ["", "KSK", "VSK", "STD", "BEZ"],
      },
    ],
  },
  {
    id: "cp3",
    naslov: "3. SPECIFIKACIJA",
    cols: 1,
    polja: [
      { key: "nominalna", label: "Nominalna vrednost", placeholder: "npr. 22.0 V" },
      { key: "tolerancija", label: "Tolerancija / specifikacija", placeholder: "npr. 20.5–23.5 V" },
    ],
  },
  {
    id: "cp4",
    naslov: "4. METODE MERENJA / KONTROLE",
    cols: 1,
    polja: [
      { key: "metoda", label: "Metoda merenja", placeholder: "SPC online, CMM, PT…", rows: 2 },
      { key: "oprema", label: "Oprema / instrument", placeholder: "SPC modul, merač…" },
      { key: "msa", label: "MSA status", placeholder: "R&R ≤ 10%" },
    ],
  },
  {
    id: "cp5",
    naslov: "5. UČESTALOST / VELIČINA UZORKA",
    cols: 1,
    polja: [
      { key: "ucestalost", label: "Učestalost kontrole", placeholder: "Kontinuirano, svaki LOT…" },
      { key: "velicina_uzoraka", label: "Veličina uzorka", placeholder: "100%, n=5…" },
    ],
  },
  {
    id: "cp6",
    naslov: "6. REAKCIJA NA NEUSKLAĐENOST",
    cols: 1,
    polja: [
      { key: "reakcija_nekontrolisano", label: "Reakcija na nekontrolisano stanje", placeholder: "Zaustaviti liniju, podesiti parametre…", rows: 2 },
      { key: "reakcija_na_nepravilan_deo", label: "Reakcija na nepravilan deo", placeholder: "Hold LOT, NCR, izolacija…", rows: 2 },
    ],
  },
  {
    id: "cp7",
    naslov: "7. ODGOVORNOST / ZAPIS",
    cols: 1,
    polja: [
      { key: "odgovorni", label: "Odgovorni", placeholder: "Operater / KK" },
      { key: "zapis_forma", label: "Zapis / forma", placeholder: "F-WS04-SPC" },
    ],
  },
  {
    id: "cp8",
    naslov: "8. PFMEA REFERENCE",
    cols: 1,
    polja: [
      { key: "pfmea_referenca", label: "PFMEA referenca", placeholder: "PFMEA-NM §3.2" },
      { key: "mod_greske_pfmea", label: "Mod greške (PFMEA)", placeholder: "Povezani mod iz PFMEA", rows: 2 },
    ],
  },
  {
    id: "cp9",
    naslov: "9. STATUS",
    cols: 1,
    polja: [
      {
        key: "status_cp",
        label: "Status Control Plana",
        type: "select",
        options: ["", "Aktivan", "Nacrt", "Zastareo"],
      },
    ],
  },
];

/** Automatski RPN = S × O × D */
export function izracunajRpn(s, o, d) {
  const a = Number(s);
  const b = Number(o);
  const c = Number(d);
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return "";
  if (a < 1 || b < 1 || c < 1) return "";
  return String(a * b * c);
}

export function primeniRpnKalkulaciju(red) {
  const next = { ...red };
  next.rpn_before = izracunajRpn(red.s, red.o, red.d) || "";
  next.rpn_after = izracunajRpn(red.s_posle, red.o_posle, red.d_posle) || "";
  return next;
}

const PFMEA_RPN_KLJUCEVI = ["s", "o", "d", "s_posle", "o_posle", "d_posle"];

export function pfmeaKljucMenjaRpn(key) {
  return PFMEA_RPN_KLJUCEVI.includes(key);
}

export const RPN_SUMMARY_POLJA = [
  { key: "dio", label: "Deo / ID" },
  { key: "mod_greske", label: "Mod greške", rows: 2 },
  { key: "s", label: "S", short: true },
  { key: "o", label: "O", short: true },
  { key: "d", label: "D", short: true },
  { key: "rpn_before", label: "RPN Before (pre)", short: true },
  { key: "rpn_after", label: "RPN After (posle)", short: true },
  { key: "poboljsanje", label: "Poboljšanje %", short: true },
];

export function formatPoboljsanjePct(val) {
  if (val == null || val === "") return "—";
  const n = Number(val);
  if (!Number.isFinite(n)) return String(val);
  const pct = n > 0 && n <= 1 ? n * 100 : n;
  return `${Math.round(pct * 10) / 10}%`;
}

function rpnBroj(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** PROSEK (srednje) i UKUPNO (zbir RPN) na kraju tabele. */
export function agregirajRpnSummary(redovi) {
  const rows = (redovi || []).filter((r) => r && !r._agregat);
  if (!rows.length) return { prosek: null, ukupno: null };

  const pick = (key) => rows.map((r) => rpnBroj(r[key])).filter((n) => n != null);
  const avg = (arr) => (arr.length
    ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
    : null);
  const sum = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) : null);

  const sA = pick("s");
  const oA = pick("o");
  const dA = pick("d");
  const rbA = pick("rpn_before");
  const raA = pick("rpn_after");
  const pobA = rows.map((r) => {
    const n = rpnBroj(r.poboljsanje);
    if (n == null) return null;
    return n > 0 && n <= 1 ? n * 100 : n;
  }).filter((n) => n != null);

  const sumRb = sum(rbA);
  const sumRa = sum(raA);
  let ukupnoPob = null;
  if (sumRb != null && sumRb > 0 && sumRa != null) {
    ukupnoPob = Math.round((1 - sumRa / sumRb) * 1000) / 10;
  }

  return {
    prosek: {
      dio: "PROSEK",
      mod_greske: `(${rows.length} stavki)`,
      s: avg(sA),
      o: avg(oA),
      d: avg(dA),
      rpn_before: avg(rbA),
      rpn_after: avg(raA),
      poboljsanje: avg(pobA),
      _agregat: true,
    },
    ukupno: {
      dio: "UKUPNO",
      mod_greske: "",
      s: "",
      o: "",
      d: "",
      rpn_before: sumRb,
      rpn_after: sumRa,
      poboljsanje: ukupnoPob,
      _agregat: true,
    },
  };
}

export function svaPoljaIzGrupa(grupe) {
  return grupe.flatMap((g) => g.polja);
}
