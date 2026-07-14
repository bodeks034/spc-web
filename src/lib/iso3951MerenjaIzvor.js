/** Učitavanje i formatiranje merenja za ISO 3951 OC panel iz SPC baze ili forme. */

import { filtrirajMerenjaPoPoziciji } from "./merenjaVarijabilnaQuery.js";
import { vrednostZaKarte, graniceKarakteristike } from "./varijabilneUtils.js";

export function tipGraniceIzGranica(lsl, usl) {
  const hasL = lsl != null && lsl !== "" && Number.isFinite(Number(String(lsl).replace(",", ".")));
  const hasU = usl != null && usl !== "" && Number.isFinite(Number(String(usl).replace(",", ".")));
  if (hasL && hasU) return "dvostrano";
  if (hasU) return "gornja";
  if (hasL) return "donja";
  return "gornja";
}

export function graniceZaIso3951IzKar(kar) {
  const gr = graniceKarakteristike(kar);
  return {
    lsl: gr.lsl != null ? String(gr.lsl) : "",
    usl: gr.usl != null ? String(gr.usl) : "",
    tipGranice: tipGraniceIzGranica(gr.lsl, gr.usl),
    jedinica: gr.jedinica || "",
  };
}

export function formatBrojZaIsoTekst(n) {
  if (!Number.isFinite(n)) return "";
  const fixed = (+n).toFixed(4);
  const trimmed = fixed.replace(/\.?0+$/, "");
  return trimmed.replace(".", ",");
}

export function formatMerenjaZaTextarea(brojevi) {
  return (brojevi || [])
    .filter((x) => Number.isFinite(x))
    .map(formatBrojZaIsoTekst)
    .join(" ");
}

export function vrednostIzRedaMerenja(row, jedinica) {
  return vrednostZaKarte(row.vrednost_raw, row.vrednost_dec, jedinica ?? row.jedinica);
}

export function kljucSerijeMerenja(row) {
  if (row?.sesija_id) return `s:${row.sesija_id}`;
  const ts = row?.created_at ? String(row.created_at).slice(0, 19) : "";
  return `f:${row?.datum}|${row?.smena}|${row?.radni_nalog || ""}|${ts}`;
}

export function grupisiMerenjaPoSeriji(redovi) {
  const grupe = new Map();
  for (const r of redovi || []) {
    const k = kljucSerijeMerenja(r);
    if (!grupe.has(k)) grupe.set(k, []);
    grupe.get(k).push(r);
  }
  return [...grupe.entries()]
    .map(([kljuc, stavke]) => ({
      kljuc,
      stavke,
      sortTs: Math.max(...stavke.map((s) => Date.parse(s.created_at || s.datum) || 0)),
    }))
    .sort((a, b) => b.sortTs - a.sortTs);
}

export function merenjaBrojeviIzRedova(redovi, { jedinica, limit } = {}) {
  const nums = (redovi || [])
    .map((r) => vrednostIzRedaMerenja(r, jedinica))
    .filter((n) => Number.isFinite(n));
  if (limit && limit > 0) return nums.slice(-limit);
  return nums;
}

export function merenjaBrojeviIzKolona(kolone, pozicija) {
  const cols = kolone || [];
  let cilj = cols;
  if (pozicija) {
    const p = String(pozicija).trim().toLowerCase();
    cilj = cols.filter((k) => k.naziv !== "-" && String(k.naziv || "").trim().toLowerCase() === p);
  } else {
    cilj = cols.filter((k) => k.naziv !== "-" && k.merenja?.length);
  }
  const col = cilj.find((k) => k.merenja?.length) || cilj[0];
  if (!col?.merenja?.length) return [];
  return col.merenja
    .map((m) => {
      const raw = m.dec ?? m.raw;
      const n = Number(String(raw ?? "").replace(",", "."));
      return Number.isFinite(n) ? n : null;
    })
    .filter(Number.isFinite);
}

/**
 * @param {"poslednja_serija"|"poslednjih_n"|"forma"} izvor
 */
export function pripremiMerenjaZaOc({
  rawRedovi,
  kolone,
  pozicija,
  jedinica,
  izvor = "poslednja_serija",
  limitN,
  radniNalog,
} = {}) {
  if (izvor === "forma" && kolone?.length) {
    const brojevi = merenjaBrojeviIzKolona(kolone, pozicija);
    return {
      brojevi,
      tekst: formatMerenjaZaTextarea(brojevi),
      opis: `forma unos${pozicija ? ` · ${pozicija}` : ""}`,
      greska: brojevi.length ? null : "Nema merenja u formi za izabranu poziciju.",
    };
  }

  let redovi = filtrirajMerenjaPoPoziciji(rawRedovi || [], pozicija);
  if (radniNalog) {
    const rn = String(radniNalog).trim().toUpperCase();
    redovi = redovi.filter((r) => String(r.radni_nalog || "").trim().toUpperCase() === rn);
  }

  if (!redovi.length) {
    return {
      brojevi: [],
      tekst: "",
      opis: "",
      greska: pozicija
        ? `Nema sačuvanih merenja za poziciju „${pozicija}".`
        : "Izaberite poziciju ili unesite merenja ručno.",
    };
  }

  let brojevi;
  let opis;
  if (izvor === "poslednjih_n") {
    brojevi = merenjaBrojeviIzRedova(redovi, { jedinica, limit: limitN || undefined });
    opis = `poslednjih ${brojevi.length}${pozicija ? ` · ${pozicija}` : ""}`;
  } else {
    const grupe = grupisiMerenjaPoSeriji(redovi);
    const poslednja = grupe[0]?.stavke || [];
    brojevi = merenjaBrojeviIzRedova(poslednja, { jedinica });
    const meta = poslednja[0];
    opis = `poslednja serija${meta?.datum ? ` · ${meta.datum}` : ""}${pozicija ? ` · ${pozicija}` : ""}`;
  }

  return {
    brojevi,
    tekst: formatMerenjaZaTextarea(brojevi),
    opis,
    greska: brojevi.length ? null : "Nema validnih numeričkih merenja.",
  };
}
