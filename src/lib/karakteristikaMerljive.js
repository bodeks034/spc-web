/**
 * Jedan tab karakteristike_merljive — izvor za merljive + auto-sync (SOP, delovi, RN).
 * Vizuelno / dokumentacija → atributivne; ostalo → merljive.
 */
import { pogonIzLinijeFaze, radniNalogIzDeoPogona } from "./syncSifrarnikIzMerljivih.js";
import { dedupeRowsForUpsert } from "./upsertUtil.js";
import {
  granicaZaSnimanje,
  granicaTextZaKarakteristiku,
} from "./glavniUnosGranice.js";
import { isUgao } from "./varijabilneUtils.js";
import { normHeader } from "./radniNaloziUvoz.js";

export const KARAKTERISTIKE_MERLJIVE_HEADER = [
  "id",
  "id_deo",
  "pogon_kod",
  "sifra_merenja",
  "sifra_karakteristike",
  "revizija",
  "sifra_operacije",
  "tip_karakteristike",
  "sifra_merila",
  "kriticna_karakteristika",
  "radni_nalog",
  "faza_naziv",
  "linija_faza",
  "linija_id",
  "masina_id",
  "naziv_dela",
  "slika",
  "ukupno_kom",
  "kom_za_kontrolu_n",
  "nivo_kontrole",
  "fai_broj_merenja",
  "broj_merenja",
  "pozicija",
  "klasa",
  "naziv_mere",
  "nominala",
  "usl",
  "lsl",
  "merni_instrument",
  "jedinica",
  "napomena",
];

/** Kolone koje idu u Supabase (ceo red — bez strip meta). */
export const KARAKTERISTIKE_DB_COLS = [
  ...KARAKTERISTIKE_MERLJIVE_HEADER,
  "usl_text",
  "lsl_text",
];

let karakteristikeDbColsCache = null;

function kolonaNedostajeUGresci(error, col) {
  const m = (error?.message || "").toLowerCase();
  const c = String(col || "").toLowerCase();
  return (
    (m.includes("schema cache") || m.includes("could not find") || m.includes("does not exist"))
    && m.includes(c)
  );
}

/** Provera šeme — preskače opcione kolone koje migracija još nije dodala. */
export async function getKarakteristikeDbCols(supabase) {
  if (karakteristikeDbColsCache) return karakteristikeDbColsCache;

  let cols = [...KARAKTERISTIKE_DB_COLS];
  for (const opt of [
    "fai_broj_merenja",
    "klasa",
    "sifra_karakteristike",
    "revizija",
    "sifra_operacije",
    "tip_karakteristike",
    "sifra_merila",
    "kriticna_karakteristika",
  ]) {
    const { error } = await supabase.from("karakteristike_merljive").select(`id,${opt}`).limit(0);
    if (error && kolonaNedostajeUGresci(error, opt)) {
      cols = cols.filter((c) => c !== opt);
    }
  }
  karakteristikeDbColsCache = cols;
  return karakteristikeDbColsCache;
}

export function resetKarakteristikeDbColsCache() {
  karakteristikeDbColsCache = null;
}

export const MIGRACIJA_FAI_BROJ_MERENJA = "37_fai_broj_merenja.sql";
export const MIGRACIJA_KLASA_KARAKTERISTIKE = "43_klasa_karakteristike.sql";
export const MIGRACIJA_KARAKTERISTIKE_UNIQUE_POGON = "40_karakteristike_unique_pogon.sql";
export const MIGRACIJA_KARAKTERISTIKE_ID_SEQ = "41_fix_karakteristike_id_sequence.sql";
export const KARAKTERISTIKE_UPSERT_CONFLICT = "id_deo,pogon_kod,sifra_merenja,pozicija";

/** Auto dodela broj_merenja (SPC podgrupa — max 10). */
const BROJ_MERENJA_SPC_AUTO_MAX = 10;

function num(v) {
  if (v === "" || v == null) return null;
  const s = String(v).replace(",", ".").replace(/[^\d.\-+eE]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function pick(r, ...keys) {
  for (const k of keys) {
    const v = r?.[normHeader(k)];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

/** Vizuelno / vizuelna / dokumentacija → atributivni modul. */
export function jeAtributivnaPoInstrumentu(k) {
  const inst = String(k?.merni_instrument || "").trim().toLowerCase();
  if (!inst) return false;
  if (inst === "dokumentacija") return true;
  if (/vizueln/i.test(inst)) return true;
  return false;
}

/** Dimenzija za merljivi unos (SPC). */
export function jeMerljivaPoInstrumentu(k) {
  if (!k || jeAtributivnaPoInstrumentu(k)) return false;
  const poz = String(k.pozicija || "").trim();
  if (!poz || poz === "-") return false;
  const jed = String(k.jedinica || "").toLowerCase();
  if (jed.includes("stepen") || jed.includes("°") || jed.includes("ugao")) return true;
  const lsl = Number(k.lsl);
  const usl = Number(k.usl);
  if (Number.isFinite(lsl) && Number.isFinite(usl) && usl >= lsl) return true;
  return false;
}

export function brojMerenjaIzReda(r) {
  const n = num(pick(
    r,
    "broj_merenja",
    "spc broj merenja po dimenziji",
    "broj merenja ucestalost (1/h)",
    "broj merenja",
  ));
  if (Number.isFinite(n) && n > 0) return Math.min(Math.round(n), BROJ_MERENJA_SPC_AUTO_MAX);
  return null;
}

/** Ključ serije merenja unutar dela (pogon + linija + operacija). */
export function grupaSerijeKey(r) {
  const idDeo = String(r?.id_deo || "").trim().toUpperCase();
  const linija = String(r?.linija_faza || "").trim();
  let pogon = String(r?.pogon_kod || "").trim().toUpperCase();
  if (!pogon && linija) pogon = pogonIzLinijeFaze(linija) || "";
  const faza = String(r?.faza_naziv || "").trim();
  return `${idDeo}|${pogon}|${linija}|${faza}`;
}

function brojMerenjaZaSerijuGrupu(redoviGrupe) {
  for (const r of redoviGrupe || []) {
    const n = brojMerenjaIzReda(r);
    if (n) return n;
  }
  return null;
}

/**
 * Automatski dodeli sifra_merenja (1, 2, 3…) i broj_merenja po seriji
 * kad inženjer ne unese ručno (glavni unos / Excel).
 */
export function dodeliSerijeMerenja(redovi, { prepisi = false } = {}) {
  const lista = [...(redovi || [])];
  if (!lista.length) return lista;

  const grupe = new Map();
  lista.forEach((r, idx) => {
    const key = grupaSerijeKey(r);
    if (!grupe.has(key)) {
      grupe.set(key, {
        rows: [],
        firstIdx: idx,
        linija_id: num(r.linija_id) ?? 999,
      });
    }
    grupe.get(key).rows.push(r);
  });

  const sortirane = [...grupe.entries()].sort((a, b) => {
    const ga = a[1];
    const gb = b[1];
    const idCmp = String(ga.rows[0]?.id_deo || "").localeCompare(String(gb.rows[0]?.id_deo || ""));
    if (idCmp !== 0) return idCmp;
    const pogonCmp = String(ga.rows[0]?.pogon_kod || "").localeCompare(String(gb.rows[0]?.pogon_kod || ""));
    if (pogonCmp !== 0) return pogonCmp;
    if (ga.linija_id !== gb.linija_id) return ga.linija_id - gb.linija_id;
    return ga.firstIdx - gb.firstIdx;
  });

  const sifraPoGrupi = new Map();
  const brojPoGrupi = new Map();
  const serijaMetaPoGrupi = new Map();
  const brojacPoDeoPogon = new Map();

  sortirane.forEach(([key, g]) => {
    const r0 = g.rows[0];
    const pk = `${String(r0.id_deo).toUpperCase()}|${String(r0.pogon_kod || pogonIzLinijeFaze(r0.linija_faza) || "").toUpperCase()}`;
    const sledeca = (brojacPoDeoPogon.get(pk) || 0) + 1;
    brojacPoDeoPogon.set(pk, sledeca);
    sifraPoGrupi.set(key, String(sledeca));
    brojPoGrupi.set(key, brojMerenjaZaSerijuGrupu(g.rows));

    let nivo = null;
    let fai = null;
    for (const row of g.rows) {
      const n = String(row.nivo_kontrole || "").trim();
      if (n && !nivo) nivo = n;
      const fn = num(row.fai_broj_merenja);
      if (Number.isFinite(fn) && fn > 0 && fai == null) fai = fn;
    }
    serijaMetaPoGrupi.set(key, { nivo_kontrole: nivo, fai_broj_merenja: fai });
  });

  return podeliPrevelikeSerije(
    lista.map((r) => {
    const key = grupaSerijeKey(r);
    const out = { ...r };
    const imaSifru = String(out.sifra_merenja || "").trim();
    if (prepisi || !imaSifru) {
      out.sifra_merenja = sifraPoGrupi.get(key) || "1";
    }
    const autoBroj = brojPoGrupi.get(key);
    const imaBroj = Number(out.broj_merenja);
    if (autoBroj && (prepisi || !Number.isFinite(imaBroj) || imaBroj <= 0)) {
      out.broj_merenja = autoBroj;
    }

    const serijaMeta = serijaMetaPoGrupi.get(key) || {};
    if (serijaMeta.nivo_kontrole && !String(out.nivo_kontrole || "").trim()) {
      out.nivo_kontrole = serijaMeta.nivo_kontrole;
    }
    if (serijaMeta.fai_broj_merenja && !Number.isFinite(Number(out.fai_broj_merenja))) {
      out.fai_broj_merenja = serijaMeta.fai_broj_merenja;
    }

    return out;
    }),
  );
}

/** >5 merljivih dimenzija u jednoj seriji → podeli na serije 1,2,3… (po 5, npr. 5502-A). */
export function podeliPrevelikeSerije(redovi, maxPoSeriji = 5) {
  const lista = (redovi || []).map((r) => ({ ...r }));
  const grupe = new Map();
  for (const r of lista) {
    const key = `${grupaSerijeKey(r)}|${String(r.sifra_merenja || "").trim()}`;
    if (!grupe.has(key)) grupe.set(key, []);
    grupe.get(key).push(r);
  }

  for (const rows of grupe.values()) {
    const merljive = rows
      .filter(jeMerljivaPoInstrumentu)
      .sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    if (merljive.length <= maxPoSeriji) continue;
    merljive.forEach((r, i) => {
      r.sifra_merenja = String(Math.floor(i / maxPoSeriji) + 1);
    });
  }
  return lista;
}

/** FAI merenja na prvo parče (1–10), nezavisno od serije. */
export function faiBrojMerenjaIzReda(r) {
  const n = num(pick(r, "fai_broj_merenja", "fai broj merenja"));
  if (Number.isFinite(n) && n > 0) return Math.min(Math.max(Math.round(n), 1), 10);
  return 1;
}

/** Normalizuj jedan red iz Excel/CSV u kanonski oblik. */
export function mapKarakteristikaMerljiveRow(r) {
  const idDeo = String(pick(
    r,
    "id_deo",
    "id dela",
    "id dela*",
    "sifra_dela",
    "ident",
    "artikal",
    "matnr",
  ) || "").trim().toUpperCase();
  let pogon = String(pick(r, "pogon_kod", "pogon kod", "pogon") || "").trim().toUpperCase();
  const linijaFaza = String(pick(r, "linija_faza", "linija faza") || "").trim();
  if (!pogon && linijaFaza) pogon = pogonIzLinijeFaze(linijaFaza);

  const rnRaw = String(pick(
    r,
    "radni_nalog",
    "radni nalog",
    "rn",
    "broj_rn",
    "delovni_nalog",
  ) || "").trim();
  if (!pogon && rnRaw) {
    const m = rnRaw.toUpperCase().match(/-([A-H])$/);
    if (m) pogon = m[1];
  }
  const radniNalog = rnRaw
    ? rnRaw.toUpperCase()
    : (pogon ? radniNalogIzDeoPogona(idDeo, pogon) : null);

  const kom = num(pick(r, "kom_za_kontrolu_n", "kom za kontrolu n"));
  const brojMerenja = brojMerenjaIzReda(r);
  const jedinicaRaw = String(pick(r, "jedinica", "jedinica_mere") || "").trim() || "mm";
  const uslNum = granicaZaSnimanje(pick(r, "usl"), jedinicaRaw);
  const lslNum = granicaZaSnimanje(pick(r, "lsl"), jedinicaRaw);
  const nomNum = granicaZaSnimanje(pick(r, "nominala", "nominal"), jedinicaRaw);
  const jedinica = isUgao(jedinicaRaw) ? "stepen" : jedinicaRaw;

  const row = {
    id: num(r.id),
    id_deo: idDeo,
    pogon_kod: pogon || null,
    sifra_merenja: String(pick(r, "sifra_merenja", "sifra merenja", "sifra_karakteristike") || "").trim(),
    sifra_karakteristike: String(pick(r, "sifra_karakteristike") || "").trim() || null,
    revizija: String(pick(r, "revizija") || "").trim() || null,
    sifra_operacije: String(pick(r, "sifra_operacije") || "").trim() || null,
    tip_karakteristike: String(pick(r, "tip_karakteristike") || "").trim() || null,
    sifra_merila: String(pick(r, "sifra_merila") || "").trim() || null,
    kriticna_karakteristika: ["da", "true", "1", "x"].includes(
      String(pick(r, "kriticna_karakteristika") || "").trim().toLowerCase(),
    ),
    radni_nalog: radniNalog,
    faza_naziv: String(pick(r, "faza_naziv", "faza naziv") || "").trim() || null,
    linija_faza: linijaFaza || null,
    linija_id: num(pick(r, "linija_id", "linija id", "linij_id")),
    masina_id: num(pick(r, "masina_id", "masina id")),
    naziv_dela: String(pick(r, "naziv_dela", "naziv dela", "naziv", "opis_artikla") || "").trim() || null,
    slika: String(pick(r, "slika", "slika/crtez") || "").trim() || null,
    ukupno_kom: num(pick(r, "ukupno_kom", "ukupno kom")),
    kom_za_kontrolu_n: kom,
    pozicija: String(pick(r, "pozicija", "dimenzija", "sifra_karakteristike") || "").trim(),
    klasa: String(pick(r, "klasa", "Klasa") || "").trim() || null,
    naziv_mere: String(pick(r, "naziv_mere", "naziv mere", "naziv_karakteristike") || "").trim() || null,
    nominala: nomNum,
    usl: uslNum,
    lsl: lslNum,
    usl_text: pick(r, "usl_text") || granicaTextZaKarakteristiku(uslNum, jedinica),
    lsl_text: pick(r, "lsl_text") || granicaTextZaKarakteristiku(lslNum, jedinica),
    merni_instrument: String(pick(r, "merni_instrument", "merni instrument") || "").trim() || null,
    jedinica,
    napomena: String(pick(r, "napomena") || "").trim() || null,
    nivo_kontrole: String(pick(r, "nivo_kontrole", "nivo kontrole") || "").trim() || null,
    fai_broj_merenja: (() => {
      const n = num(pick(r, "fai_broj_merenja", "fai broj merenja", "fac broj"));
      if (Number.isFinite(n) && n > 0) return Math.min(Math.max(Math.round(n), 1), 10);
      return null;
    })(),
    broj_merenja: brojMerenja,
    atributivne: jeAtributivnaPoInstrumentu({ merni_instrument: pick(r, "merni_instrument", "merni instrument") })
      ? "DA"
      : "NE",
    merljive: jeMerljivaPoInstrumentu({
      pozicija: pick(r, "pozicija", "dimenzija"),
      merni_instrument: pick(r, "merni_instrument", "merni instrument"),
      lsl: lslNum,
      usl: uslNum,
      jedinica,
    })
      ? "DA"
      : "NE",
  };

  return row;
}

/** Prazan pogon → linija_faza → sufiks RN → 'A' (FK + UNIQUE). */
export function normalizujPogonKodKar(row) {
  let pogon = String(row?.pogon_kod || "").trim().toUpperCase();
  if (!pogon && row?.linija_faza) pogon = pogonIzLinijeFaze(row.linija_faza) || "";
  if (!pogon && row?.radni_nalog) {
    const m = String(row.radni_nalog).trim().toUpperCase().match(/-([A-H])$/);
    if (m) pogon = m[1];
  }
  if (!pogon) pogon = "A";
  return { ...row, pogon_kod: pogon };
}

/** Normalizuj prirodni ključ pre dedupe / upsert. */
export function normalizujKarakteristikuRed(row) {
  const r0 = normalizujPogonKodKar(row);
  const jedRaw = String(r0.jedinica || "").trim() || "mm";
  const usl = granicaZaSnimanje(r0.usl, jedRaw);
  const lsl = granicaZaSnimanje(r0.lsl, jedRaw);
  const nominala = granicaZaSnimanje(r0.nominala, jedRaw);
  const jedinica = isUgao(jedRaw) ? "stepen" : jedRaw;
  return {
    ...r0,
    id_deo: String(r0.id_deo || "").trim().toUpperCase(),
    sifra_merenja: String(r0.sifra_merenja ?? "").trim(),
    pozicija: String(r0.pozicija ?? "").trim(),
    usl,
    lsl,
    nominala,
    jedinica,
    usl_text: r0.usl_text || granicaTextZaKarakteristiku(usl, jedinica),
    lsl_text: r0.lsl_text || granicaTextZaKarakteristiku(lsl, jedinica),
  };
}

export function stripKarakteristikeForDb(row, cols = KARAKTERISTIKE_DB_COLS) {
  const o = {};
  for (const k of cols) {
    if (row[k] !== undefined) o[k] = row[k];
  }
  return o;
}

/** Upsert po prirodnom ključu — ne šalji id (PostgreSQL zadržava postojeći). */
export function stripKarakteristikeForDbUpsert(row, cols = KARAKTERISTIKE_DB_COLS) {
  const o = stripKarakteristikeForDb(row, cols);
  delete o.id;
  if (o.id_deo) o.id_deo = String(o.id_deo).trim().toUpperCase();
  if (o.pogon_kod) o.pogon_kod = String(o.pogon_kod).trim().toUpperCase() || "A";
  if (o.sifra_merenja !== undefined && o.sifra_merenja !== null) {
    o.sifra_merenja = String(o.sifra_merenja).trim();
  }
  if (o.pozicija !== undefined && o.pozicija !== null) {
    o.pozicija = String(o.pozicija).trim();
  }
  return o;
}

export function karakteristikaMatchKey(r) {
  const pogon = String(r.pogon_kod || "").trim().toUpperCase() || "A";
  return [
    String(r.id_deo || "").trim().toUpperCase(),
    pogon,
    String(r.sifra_merenja || "").trim(),
    String(r.pozicija || "").trim(),
  ].join("\0");
}

/** Jedinstven id po redu — Excel id se ne koristi (ponavlja se po pogonu). */
export async function resolveKarakteristikeIds(supabase, rows) {
  const idDeos = [...new Set(rows.map((r) => String(r.id_deo || "").trim().toUpperCase()).filter(Boolean))];
  if (!idDeos.length) return rows;

  const existing = [];
  for (let i = 0; i < idDeos.length; i += 50) {
    const chunk = idDeos.slice(i, i + 50);
    const { data, error } = await supabase
      .from("karakteristike_merljive")
      .select("id,id_deo,pogon_kod,sifra_merenja,pozicija")
      .in("id_deo", chunk);
    if (error) throw new Error(`karakteristike_merljive: ${error.message}`);
    existing.push(...(data || []));
  }

  const byKey = new Map();
  const usedIds = new Set();
  let maxId = 0;
  for (const r of existing) {
    const id = Number(r.id) || 0;
    byKey.set(karakteristikaMatchKey(r), id);
    usedIds.add(id);
    maxId = Math.max(maxId, id);
  }

  return rows.map((row) => {
    const key = karakteristikaMatchKey(row);
    const postojeci = byKey.get(key);
    if (postojeci) return { ...row, id: postojeci };

    let nextId = maxId + 1;
    while (usedIds.has(nextId)) nextId += 1;
    maxId = nextId;
    usedIds.add(nextId);
    byKey.set(key, nextId);
    return { ...row, id: nextId };
  });
}

export async function pripremiKarakteristikeZaUpsert(supabase, rows, dbCols = KARAKTERISTIKE_DB_COLS) {
  void supabase;
  const normalized = rows.map(normalizujKarakteristikuRed);
  const deduped = dedupeRowsForUpsert(normalized, KARAKTERISTIKE_UPSERT_CONFLICT);
  const stripped = deduped
    .map((r) => stripKarakteristikeForDbUpsert(r, dbCols))
    .filter((r) => r.id_deo && r.sifra_merenja && r.pozicija);
  return dedupeRowsForUpsert(stripped, KARAKTERISTIKE_UPSERT_CONFLICT);
}
