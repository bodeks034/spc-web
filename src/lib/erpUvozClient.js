/**
 * ERP uvoz iz browsera — upload CSV / XLSX fajlova.
 */
import {
  mapirajFajloveNaEntitete,
  parsirajEntitetCsv,
  pokreniErpUvozIzIzvora,
  sumErpRezultati,
  formatErpUvozRezultat,
} from "./erpUvozCore.js";
import { ucitajErpConfigBrowser } from "./erpUvozPresets.js";
import { upisiErpUvozLog } from "./erpUvozLog.js";
import { erpUlazUCsvTekst, jeErpSpreadsheet } from "./erpCsvIo.js";

function citajFajlKaoBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result || new ArrayBuffer(0));
    reader.onerror = () => reject(new Error(`Ne mogu pročitati ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

async function citajFajl(file) {
  const buf = await citajFajlKaoBuffer(file);
  const { text, encoding, format } = erpUlazUCsvTekst(buf, file.name);
  return { text, encoding, format };
}

/** Preview upload-a pre upisa. */
export async function previewErpUpload(config, fajlovi) {
  const { mapa, nespojeni } = mapirajFajloveNaEntitete(fajlovi, config);
  const stavke = [];

  for (const [entId, file] of Object.entries(mapa)) {
    const ucitano = await citajFajl(file);
    const parsed = parsirajEntitetCsv(ucitano.text, config.entiteti[entId]);
    stavke.push({
      entitet: entId,
      fajl: file.name,
      velicina: file.size,
      text: ucitano.text,
      encoding: ucitano.encoding,
      format: ucitano.format || (jeErpSpreadsheet(file.name) ? "xlsx" : "csv"),
      ukupno: parsed.ukupno,
      validnih: parsed.validnih,
      upozorenja: parsed.greske.length,
      greske: parsed.greske.slice(0, 10),
      primer: parsed.redovi.slice(0, 2),
    });
  }

  return { stavke, nespojeni: nespojeni.map((f) => f.name) };
}

/** Uvoz uploadovanih CSV/XLSX u Supabase. */
export async function pokreniErpUpload(supabase, { preset, fajlovi, dryRun = false }) {
  const config = ucitajErpConfigBrowser(preset);
  const { mapa, nespojeni } = mapirajFajloveNaEntitete(fajlovi, config);

  const csvPoEntitetu = {};
  for (const [entId, file] of Object.entries(mapa)) {
    const ucitano = await citajFajl(file);
    csvPoEntitetu[entId] = {
      text: ucitano.text,
      fajl: file.name,
      encoding: ucitano.encoding,
      format: ucitano.format,
    };
  }

  const res = await pokreniErpUvozIzIzvora(supabase, config, {
    csvPoEntitetu,
    dryRun,
    izvor: "ui-upload",
  });
  res.nespojeniFajlovi = nespojeni.map((f) => f.name);

  if (!dryRun) {
    const sum = sumErpRezultati(res.rezultati);
    const fajloviStr = res.rezultati.filter((r) => r.fajl).map((r) => r.fajl).join(", ");
    await upisiErpUvozLog(supabase, {
      izvor: "ui-upload",
      fajl: fajloviStr || null,
      ukupno: sum.ukupno,
      validnih: sum.validnih,
      upsertovano: sum.upsertovano,
      aktivnih: 0,
      upozorenja: sum.upozorenja,
      uspeh: res.ok,
      greska: res.ok ? null : res.rezultati.find((r) => r.greska)?.greska,
      detalj: formatErpUvozRezultat(res),
    }).catch(() => {});
  }

  return res;
}

export { formatErpUvozRezultat, sumErpRezultati, ucitajErpConfigBrowser };
