/**
 * Automatsko pakovanje PDF izveštaja u KONTROLA_KVALITETA pri izvozu.
 */

import { snimiFajlUKvalitetPutanja } from "./kvalitetFolderSync.js";
import { putanjaKvalitetFajla, putanjaOperativaPdf } from "./kvalitetFolderStruktura.js";

export function pdfArrayBuffer(pdf) {
  return pdf.output("arraybuffer");
}

/**
 * Preuzima PDF u browser i paralelno snima u povezani folder kvaliteta.
 * @param {import('jspdf').jsPDF} pdf
 * @param {string} filename
 * @param {string} folderPutanja — npr. "04_Izvestaji_Kupci" ili "06_Operativni_Izvestaji/Smena"
 */
export async function syncPdfUKvalitetFolder(pdf, filename, folderPutanja, {
  syncFolder = true,
  preuzmi = true,
  onFolderSync,
} = {}) {
  if (preuzmi) pdf.save(filename);
  if (!syncFolder) return { filename, folder: null };

  const rel = folderPutanja.includes("/")
    ? `${folderPutanja}/${filename}`
    : `${folderPutanja}/${filename}`;
  const buf = pdfArrayBuffer(pdf);
  const rez = await snimiFajlUKvalitetPutanja(rel, buf);
  onFolderSync?.(rez);
  return { filename, folder: rez };
}

/** Helper za operativne izveštaje (smena, trasabilitet, …). */
export async function syncOperativaPdf(pdf, filename, kategorija, opts = {}) {
  const putanja = putanjaOperativaPdf(kategorija, filename);
  const folderDir = putanja.slice(0, putanja.lastIndexOf("/"));
  return syncPdfUKvalitetFolder(pdf, filename, folderDir, opts);
}

/** NCR obrazac PDF → NCR_KVALITET/Pojedinacni_Obrasci/ (pored registra). */
export async function syncNcrObrazacPdf(pdf, filename, opts = {}) {
  const { FOLDER_NCR, FOLDER_NCR_OBRASCI } = await import("./kvalitetFolderStruktura.js");
  const folderDir = `${FOLDER_NCR}/${FOLDER_NCR_OBRASCI}`;
  return syncPdfUKvalitetFolder(pdf, filename, folderDir, opts);
}

export { putanjaKvalitetFajla, putanjaOperativaPdf };
