/**
 * ERP uvoz iz browsera — upload CSV fajlova.
 */
import {
  mapirajFajloveNaEntitete,
  pokreniErpUvozIzIzvora,
  sumErpRezultati,
  formatErpUvozRezultat,
} from "./erpUvozCore.js";
import { ucitajErpConfigBrowser } from "./erpUvozPresets.js";
import { upisiErpUvozLog } from "./erpUvozLog.js";

function citajFajl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(String(ev.target?.result || ""));
    reader.onerror = () => reject(new Error(`Ne mogu pročitati ${file.name}`));
    reader.readAsText(file, "UTF-8");
  });
}

/** Preview upload-a pre upisa. */
export async function previewErpUpload(config, fajlovi) {
  const { mapa, nespojeni } = mapirajFajloveNaEntitete(fajlovi, config);
  const stavke = [];

  for (const [entId, file] of Object.entries(mapa)) {
    const text = await citajFajl(file);
    stavke.push({
      entitet: entId,
      fajl: file.name,
      velicina: file.size,
      text,
    });
  }

  return { stavke, nespojeni: nespojeni.map((f) => f.name) };
}

/** Uvoz uploadovanih CSV u Supabase. */
export async function pokreniErpUpload(supabase, { preset, fajlovi, dryRun = false }) {
  const config = ucitajErpConfigBrowser(preset);
  const { mapa, nespojeni } = mapirajFajloveNaEntitete(fajlovi, config);

  const csvPoEntitetu = {};
  for (const [entId, file] of Object.entries(mapa)) {
    csvPoEntitetu[entId] = {
      text: await citajFajl(file),
      fajl: file.name,
    };
  }

  const res = await pokreniErpUvozIzIzvora(supabase, config, { csvPoEntitetu, dryRun });
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
