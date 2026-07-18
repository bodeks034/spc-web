/**
 * ERP ulazni fajlovi — encoding + CSV/XLSX → tekst za parser.
 * Browser i Node (bez fs).
 */

import * as XLSX from "xlsx";

const ERP_EXT_RE = /\.(csv|xlsx|xls)$/i;
const SR_DIJAKRITICI = /[šđčćžŠĐČĆŽ]/g;
const REPLACEMENT = /\uFFFD/;

/** Skini poznatu ekstenziju pre poređenja imena fajla. */
export function skiniErpEkstenziju(imeFajla) {
  return String(imeFajla || "").replace(ERP_EXT_RE, "");
}

export function jeErpSpreadsheet(imeFajla) {
  return /\.(xlsx|xls)$/i.test(String(imeFajla || ""));
}

export function jeErpCsv(imeFajla) {
  return /\.csv$/i.test(String(imeFajla || ""));
}

export function jeErpUlazniFajl(imeFajla) {
  return ERP_EXT_RE.test(String(imeFajla || ""));
}

function scoreDekodiranja(text) {
  const s = String(text || "");
  if (!s) return -1e9;
  let score = 0;
  if (REPLACEMENT.test(s)) score -= 80;
  const dija = s.match(SR_DIJAKRITICI);
  if (dija) score += dija.length * 8;
  // Tipični CSV zaglavlja — potvrda da je tekst smislen
  if (/sifra|naziv|matnr|aufnr|ident|deo|nalog/i.test(s.slice(0, 800))) score += 12;
  // Moji-bajtovi / „Ä†“ tipični za pogrešan UTF-8 nad Windows-1250
  if (/Ã.|Ä.|Å.|Â./.test(s.slice(0, 2000))) score -= 25;
  return score;
}

function dekodujKandidat(bytes, encoding) {
  try {
    return new TextDecoder(encoding, { fatal: false }).decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Dekoduj bajtove ERP CSV-a: UTF-8 → Windows-1250 → ISO-8859-2 → Windows-1252.
 * Biramo encoding sa najboljim skorom (srpski dijakritici, bez replacement).
 */
export function dekodujErpBajtove(input, { hintEncoding = null } = {}) {
  const bytes = input instanceof Uint8Array
    ? input
    : input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : new Uint8Array(input);

  if (hintEncoding) {
    const forced = dekodujKandidat(bytes, hintEncoding);
    if (forced != null) return { text: forced, encoding: hintEncoding };
  }

  // UTF-8 BOM
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return {
      text: dekodujKandidat(bytes, "utf-8") || "",
      encoding: "utf-8",
    };
  }

  const kandidati = ["utf-8", "windows-1250", "iso-8859-2", "windows-1252"];
  let best = { text: "", encoding: "utf-8", score: -1e9 };
  for (const enc of kandidati) {
    const text = dekodujKandidat(bytes, enc);
    if (text == null) continue;
    const score = scoreDekodiranja(text);
    if (score > best.score) best = { text, encoding: enc, score };
  }
  return { text: best.text, encoding: best.encoding };
}

/**
 * Prvi sheet XLSX/XLS → CSV tekst (zarez).
 * cellDates: true da datumi ne ostanu Excel serijali gde je moguće.
 */
export function xlsxBufferToCsvText(input) {
  const data = input instanceof ArrayBuffer
    ? new Uint8Array(input)
    : input instanceof Uint8Array
      ? input
      : new Uint8Array(input);
  const wb = XLSX.read(data, { type: "array", cellDates: true, raw: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return "";
  return XLSX.utils.sheet_to_csv(wb.Sheets[sheetName], {
    FS: ",",
    RS: "\n",
    blankrows: false,
  });
}

/** Buffer/ArrayBuffer + ime fajla → CSV tekst spreman za parsirajEntitetCsv. */
export function erpUlazUCsvTekst(input, imeFajla) {
  if (jeErpSpreadsheet(imeFajla)) {
    return {
      text: xlsxBufferToCsvText(input),
      encoding: "xlsx",
      format: "xlsx",
    };
  }
  const decoded = dekodujErpBajtove(input);
  return { ...decoded, format: "csv" };
}
