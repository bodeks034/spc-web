/**
 * Tab Definicija_Karakteristika — jedan izvor za merljive + meta (SOP / delovi / RN).
 * Kolone A–L: dimenzije (legacy .xlsm), M–X: meta (popuni na prvom redu grupe po pogonu).
 */
import { pogonIzLinijeFaze, radniNalogIzDeoPogona } from "./syncSifrarnikIzMerljivih.js";
import { jeMerljivaPoInstrumentu } from "./karakteristikaMerljive.js";

export const DEFINICIJA_COL = {
  id_deo: 0,
  sifra_merenja: 1,
  pozicija: 2,
  naziv_mere: 3,
  nominala: 4,
  usl: 5,
  lsl: 6,
  usl_text: 7,
  lsl_text: 8,
  merni_instrument: 9,
  jedinica: 10,
  napomena: 11,
  pogon_kod: 12,
  faza_naziv: 13,
  linija_faza: 14,
  broj_merenja: 15,
  atributivne: 16,
  merljive: 17,
  kom_za_kontrolu_n: 18,
  radni_nalog: 19,
  slika: 20,
  linija_id: 21,
  masina_id: 22,
  naziv_dela: 23,
};

export const DEFINICIJA_HEADER = [
  "id_deo", "sifra_merenja", "pozicija", "naziv_mere", "nominala", "usl", "lsl",
  "usl_text", "lsl_text", "merni_instrument", "jedinica", "napomena",
  "pogon_kod", "faza_naziv", "linija_faza", "broj_merenja",
  "atributivne", "merljive", "kom_za_kontrolu_n", "radni_nalog", "slika",
  "linija_id", "masina_id", "naziv_dela",
];

function num(v) {
  if (v === "" || v == null) return null;
  const s = String(v).replace(",", ".").replace(/[^\d.\-+eE]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function cell(r, col) {
  return r[col] ?? "";
}

/** Čitaj po imenu kolone (header red) ili poziciono indeksu. */
function pickDefinicija(r, ...keys) {
  if (!r || typeof r !== "object") return "";
  for (const k of keys) {
    const kn = String(k).toLowerCase().replace(/\s+/g, "_");
    for (const [hk, val] of Object.entries(r)) {
      const hkn = String(hk).toLowerCase().replace(/\s+/g, "_");
      if (hkn === kn && val !== undefined && val !== null && String(val).trim() !== "") {
        return val;
      }
    }
  }
  return "";
}

export function definicijaImaHeaderRed(rows) {
  const h = String(rows[0]?.[0] ?? "").trim().toLowerCase();
  return h === "id_deo" || h === "id dela" || h === "id dela*";
}

/** Parsiraj jedan red Definicija_Karakteristika (pozicioni, red ≥ 1). */
export function parseDefinicijaRed(r) {
  const idDeo = String(cell(r, DEFINICIJA_COL.id_deo) || "").trim().toUpperCase();
  const pozicija = String(cell(r, DEFINICIJA_COL.pozicija) || "").trim();
  if (!idDeo || !pozicija) return null;

  let pogon = String(cell(r, DEFINICIJA_COL.pogon_kod) || "").trim().toUpperCase();
  const linijaFaza = String(cell(r, DEFINICIJA_COL.linija_faza) || "").trim();
  if (!pogon && linijaFaza) pogon = pogonIzLinijeFaze(linijaFaza);

  const rnRaw = String(cell(r, DEFINICIJA_COL.radni_nalog) || "").trim();
  const radniNalog = rnRaw
    ? rnRaw.toUpperCase()
    : (pogon ? radniNalogIzDeoPogona(idDeo, pogon) : null);

  return {
    id_deo: idDeo,
    pogon_kod: pogon || null,
    sifra_merenja: String(cell(r, DEFINICIJA_COL.sifra_merenja) || "").trim(),
    faza_naziv: String(cell(r, DEFINICIJA_COL.faza_naziv) || "").trim() || null,
    linija_faza: linijaFaza || null,
    broj_merenja: num(cell(r, DEFINICIJA_COL.broj_merenja)),
    pozicija,
    naziv_mere: String(cell(r, DEFINICIJA_COL.naziv_mere) || "").trim() || null,
    nominala: num(cell(r, DEFINICIJA_COL.nominala)),
    usl: num(cell(r, DEFINICIJA_COL.usl)),
    lsl: num(cell(r, DEFINICIJA_COL.lsl)),
    usl_text: String(cell(r, DEFINICIJA_COL.usl_text) ?? "").trim() || null,
    lsl_text: String(cell(r, DEFINICIJA_COL.lsl_text) ?? "").trim() || null,
    merni_instrument: String(cell(r, DEFINICIJA_COL.merni_instrument) || "").trim() || null,
    jedinica: String(cell(r, DEFINICIJA_COL.jedinica) || "").trim() || null,
    napomena: String(cell(r, DEFINICIJA_COL.napomena) || "").trim() || null,
    nivo_kontrole: String(pickDefinicija(r, "nivo_kontrole", "nivo kontrole") || "").trim() || null,
    fai_broj_merenja: num(pickDefinicija(r, "fai_broj_merenja", "fai broj merenja", "fac broj")),
    atributivne: String(cell(r, DEFINICIJA_COL.atributivne) ?? "").trim() || null,
    merljive: String(cell(r, DEFINICIJA_COL.merljive) ?? "").trim() || null,
    kom_za_kontrolu_n: cell(r, DEFINICIJA_COL.kom_za_kontrolu_n),
    radni_nalog: radniNalog,
    slika: String(cell(r, DEFINICIJA_COL.slika) || "").trim() || null,
    linija_id: cell(r, DEFINICIJA_COL.linija_id),
    masina_id: cell(r, DEFINICIJA_COL.masina_id),
    naziv_dela: String(cell(r, DEFINICIJA_COL.naziv_dela) || "").trim() || null,
  };
}

export function parseDefinicijaSheet(rows) {
  const start = definicijaImaHeaderRed(rows) ? 1 : 1;
  const out = [];
  for (let i = start; i < rows.length; i++) {
    const parsed = parseDefinicijaRed(rows[i]);
    if (parsed) out.push(parsed);
  }
  return propagirajMetaKarakteristika(out);
}

const META_PROPAGIRAJ = [
  "pogon_kod",
  "sifra_merenja",
  "radni_nalog",
  "faza_naziv",
  "linija_faza",
  "linija_id",
  "masina_id",
  "naziv_dela",
  "slika",
  "ukupno_kom",
  "kom_za_kontrolu_n",
];

function metaPrazno(v) {
  return v === undefined || v === null || String(v).trim() === "";
}

function pogonIzRnMeta(radniNalog) {
  const m = String(radniNalog || "").trim().toUpperCase().match(/-([A-H])$/);
  return m ? m[1] : "";
}

function metaGrupaKey(idDeo, pogonKod, sifraMerenja, linijaFaza, rowId) {
  const id = String(idDeo || "").trim().toUpperCase();
  const pogon = String(pogonKod || "").trim().toUpperCase();
  const sifra = String(sifraMerenja || "").trim();
  const linija = String(linijaFaza || "").trim();
  if (!id) return "";
  if (pogon) return sifra ? `${id}|${pogon}|${sifra}` : `${id}|${pogon}`;
  if (linija) {
    const izLinije = pogonIzLinijeFaze(linija);
    if (izLinije) return sifra ? `${id}|${izLinije}|${sifra}` : `${id}|${izLinije}`;
    return sifra ? `${id}|@${linija}|${sifra}` : `${id}|@${linija}`;
  }
  const rid = rowId != null && rowId !== "" ? String(rowId) : "";
  if (sifra && rid) return `${id}|~${rid}|${sifra}`;
  if (rid) return `${id}|~${rid}`;
  return `${id}|~?`;
}

/** Meta sa prvog reda grupe (id_deo + pogon_kod) → ostali redovi iste grupe. */
export function propagirajMetaKarakteristika(rows) {
  const sorted = [...(rows || [])].sort(
    (a, b) => (Number(a.id) || 0) - (Number(b.id) || 0),
  );
  const lastByGrupa = new Map();
  let prethodniZaDeo = null;

  return sorted.map((raw) => {
    const id = String(raw.id_deo || "").trim().toUpperCase();
    if (!id) return raw;

    const out = { ...raw };

    // Nastavak Excel bloka (prazan pogon) — nasledi prethodni red istog dela.
    if (
      metaPrazno(out.pogon_kod)
      && prethodniZaDeo
      && String(prethodniZaDeo.id_deo || "").toUpperCase() === id
      && !metaPrazno(prethodniZaDeo.pogon_kod)
    ) {
      out.pogon_kod = prethodniZaDeo.pogon_kod;
      if (metaPrazno(out.linija_faza) && prethodniZaDeo.linija_faza) {
        out.linija_faza = prethodniZaDeo.linija_faza;
      }
      if (metaPrazno(out.radni_nalog) && prethodniZaDeo.radni_nalog) {
        out.radni_nalog = prethodniZaDeo.radni_nalog;
      }
    }

    if (metaPrazno(out.pogon_kod) && out.linija_faza) {
      const izLinije = pogonIzLinijeFaze(out.linija_faza);
      if (izLinije) out.pogon_kod = izLinije;
    }

    if (metaPrazno(out.pogon_kod) && out.radni_nalog) {
      const izRn = pogonIzRnMeta(out.radni_nalog);
      if (izRn) out.pogon_kod = izRn;
    }

    if (metaPrazno(out.pogon_kod) && jeMerljivaPoInstrumentu(out)) {
      out.pogon_kod = "A";
    }

    if (!metaPrazno(out.pogon_kod)) {
      out.pogon_kod = String(out.pogon_kod).trim().toUpperCase();
    }

    const key = metaGrupaKey(id, out.pogon_kod, out.sifra_merenja, out.linija_faza, out.id);
    if (!lastByGrupa.has(key)) lastByGrupa.set(key, {});
    const state = lastByGrupa.get(key);

    for (const col of META_PROPAGIRAJ) {
      const v = out[col];
      if (!metaPrazno(v)) {
        if (col === "pogon_kod") {
          state[col] = String(v).trim().toUpperCase();
        } else {
          state[col] = v;
        }
      } else if (state[col] !== undefined) {
        out[col] = state[col];
      }
    }

    prethodniZaDeo = out;
    return out;
  });
}

export function pogonKodKarakteristike(k, { multiPogon = false } = {}) {
  let pk = String(k?.pogon_kod || "").trim().toUpperCase();
  if (!pk && k?.linija_faza) {
    pk = pogonIzLinijeFaze(k.linija_faza) || "";
  }
  if (!pk && k?.radni_nalog) {
    pk = pogonIzRnMeta(k.radni_nalog);
  }
  if (pk) return pk;
  return multiPogon ? "" : null;
}

/** Karakteristika red (CSV) → Definicija pozicioni niz. */
export function karakteristikaUDefinicijuRed(k) {
  const row = new Array(DEFINICIJA_HEADER.length).fill("");
  row[DEFINICIJA_COL.id_deo] = k.id_deo || "";
  row[DEFINICIJA_COL.sifra_merenja] = k.sifra_merenja || "";
  row[DEFINICIJA_COL.pozicija] = k.pozicija || "";
  row[DEFINICIJA_COL.naziv_mere] = k.naziv_mere || "";
  row[DEFINICIJA_COL.nominala] = k.nominala ?? "";
  row[DEFINICIJA_COL.usl] = k.usl ?? "";
  row[DEFINICIJA_COL.lsl] = k.lsl ?? "";
  row[DEFINICIJA_COL.usl_text] = k.usl_text ?? "";
  row[DEFINICIJA_COL.lsl_text] = k.lsl_text ?? "";
  row[DEFINICIJA_COL.merni_instrument] = k.merni_instrument || "";
  row[DEFINICIJA_COL.jedinica] = k.jedinica || "";
  row[DEFINICIJA_COL.napomena] = k.napomena || "";
  row[DEFINICIJA_COL.pogon_kod] = k.pogon_kod || "";
  row[DEFINICIJA_COL.faza_naziv] = k.faza_naziv || "";
  row[DEFINICIJA_COL.linija_faza] = k.linija_faza || "";
  row[DEFINICIJA_COL.broj_merenja] = k.broj_merenja ?? "";
  row[DEFINICIJA_COL.atributivne] = k.atributivne || "";
  row[DEFINICIJA_COL.merljive] = k.merljive || "";
  row[DEFINICIJA_COL.kom_za_kontrolu_n] = k.kom_za_kontrolu_n ?? "";
  row[DEFINICIJA_COL.radni_nalog] = k.radni_nalog || "";
  row[DEFINICIJA_COL.slika] = k.slika || "";
  row[DEFINICIJA_COL.linija_id] = k.linija_id ?? "";
  row[DEFINICIJA_COL.masina_id] = k.masina_id ?? "";
  row[DEFINICIJA_COL.naziv_dela] = k.naziv_dela || "";
  return row;
}
