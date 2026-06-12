/**
 * Jedan tab karakteristike_merljive — izvor za merljive + auto-sync (SOP, delovi, RN).
 * Vizuelno / dokumentacija → atributivne; ostalo → merljive.
 */
import { pogonIzLinijeFaze, radniNalogIzDeoPogona } from "./syncSifrarnikIzMerljivih.js";

export const KARAKTERISTIKE_MERLJIVE_HEADER = [
  "id",
  "id_deo",
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
  "pozicija",
  "naziv_mere",
  "nominala",
  "usl",
  "lsl",
  "merni_instrument",
  "jedinica",
  "napomena",
  "nivo_kontrole",
];

/** Kolone koje idu u Supabase (ceo red — bez strip meta). */
export const KARAKTERISTIKE_DB_COLS = [
  ...KARAKTERISTIKE_MERLJIVE_HEADER,
  "broj_merenja",
  "usl_text",
  "lsl_text",
];

function num(v) {
  if (v === "" || v == null) return null;
  const s = String(v).replace(",", ".").replace(/[^\d.\-+eE]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function pick(r, ...keys) {
  for (const k of keys) {
    const v = r?.[k];
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
  const lsl = Number(k.lsl);
  const usl = Number(k.usl);
  if (Number.isFinite(lsl) && Number.isFinite(usl) && usl >= lsl) return true;
  const jed = String(k.jedinica || "").toLowerCase();
  if (jed.includes("stepen") || jed.includes("°")) return true;
  return false;
}

export function brojMerenjaIzReda(r) {
  const n = num(pick(r, "kom_za_kontrolu_n", "broj_merenja", "nivo_kontrole"));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Normalizuj jedan red iz Excel/CSV u kanonski oblik. */
export function mapKarakteristikaMerljiveRow(r) {
  const idDeo = String(pick(r, "id_deo", "id dela", "id dela*") || "").trim().toUpperCase();
  let pogon = String(pick(r, "pogon_kod", "pogon kod", "pogon") || "").trim().toUpperCase();
  const linijaFaza = String(pick(r, "linija_faza", "linija faza") || "").trim();
  if (!pogon && linijaFaza) pogon = pogonIzLinijeFaze(linijaFaza);

  const rnRaw = String(pick(r, "radni_nalog", "radni nalog") || "").trim();
  const radniNalog = rnRaw
    ? rnRaw.toUpperCase()
    : (pogon ? radniNalogIzDeoPogona(idDeo, pogon) : null);

  const kom = num(pick(r, "kom_za_kontrolu_n", "kom za kontrolu n"));
  const brojMerenja = brojMerenjaIzReda(r) ?? kom;

  const row = {
    id: num(r.id),
    id_deo: idDeo,
    pogon_kod: pogon || null,
    sifra_merenja: String(pick(r, "sifra_merenja", "sifra merenja") || "").trim(),
    radni_nalog: radniNalog,
    faza_naziv: String(pick(r, "faza_naziv", "faza naziv") || "").trim() || null,
    linija_faza: linijaFaza || null,
    linija_id: num(pick(r, "linija_id", "linija id", "linij_id")),
    masina_id: num(pick(r, "masina_id", "masina id")),
    naziv_dela: String(pick(r, "naziv_dela", "naziv dela") || "").trim() || null,
    slika: String(pick(r, "slika", "slika/crtez") || "").trim() || null,
    ukupno_kom: num(pick(r, "ukupno_kom", "ukupno kom")),
    kom_za_kontrolu_n: kom,
    pozicija: String(pick(r, "pozicija", "dimenzija") || "").trim(),
    naziv_mere: String(pick(r, "naziv_mere", "naziv mere") || "").trim() || null,
    nominala: num(pick(r, "nominala")),
    usl: num(pick(r, "usl")),
    lsl: num(pick(r, "lsl")),
    usl_text: pick(r, "usl_text") || (pick(r, "usl") !== "" ? String(pick(r, "usl")) : null),
    lsl_text: pick(r, "lsl_text") || (pick(r, "lsl") !== "" ? String(pick(r, "lsl")) : null),
    merni_instrument: String(pick(r, "merni_instrument", "merni instrument") || "").trim() || null,
    jedinica: String(pick(r, "jedinica") || "").trim() || null,
    napomena: String(pick(r, "napomena") || "").trim() || null,
    nivo_kontrole: String(pick(r, "nivo_kontrole", "nivo kontrole") || "").trim() || null,
    broj_merenja: brojMerenja,
    /** Izvedeno — za auto-sync (ne u Excel header). */
    atributivne: jeAtributivnaPoInstrumentu({ merni_instrument: pick(r, "merni_instrument", "merni instrument") })
      ? "DA"
      : "NE",
    merljive: jeMerljivaPoInstrumentu({
      pozicija: pick(r, "pozicija", "dimenzija"),
      merni_instrument: pick(r, "merni_instrument", "merni instrument"),
      lsl: num(pick(r, "lsl")),
      usl: num(pick(r, "usl")),
      jedinica: pick(r, "jedinica"),
    })
      ? "DA"
      : "NE",
  };

  return row;
}

export function stripKarakteristikeForDb(row) {
  const o = {};
  for (const k of KARAKTERISTIKE_DB_COLS) {
    if (row[k] !== undefined) o[k] = row[k];
  }
  return o;
}
