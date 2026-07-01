/**
 * Paket kvaliteta (ZIP): Word 8D + RPN Summary (xlsx) + PFMEA/CP (xlsx).
 */

import JSZip from "jszip";
import { buildOsmdWordHtml } from "./osmdIzvestajPdf.js";
import {
  generisiPfmeaCpWorkbookBuffer,
  generisiRpnSummaryWorkbookBuffer,
  pfmeaCpDocZaIzvoz,
} from "./pfmeaCpExcelExport.js";
import { izracunajRpnSummary } from "./pfmeaControlPlan.js";

function safeIme(izv8d, pfmeaDoc) {
  const deo = izv8d?.broj_8d || izv8d?.id_deo || pfmeaDoc?.idDeo || "kvalitet";
  return String(deo).replace(/[^\w\s\-./čćšđžČĆŠĐŽ]+/g, "_").slice(0, 72);
}

function preuzmiBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * @param {object} izv8d — 8D izveštaj
 * @param {object|null} pfmeaCpDoc — PFMEA/CP dokument
 */
export async function exportKvalitetPaketZip(izv8d, pfmeaCpDoc, {
  onProgress,
  preuzmi = true,
  imeFajla,
} = {}) {
  const base = (imeFajla || `Paket_8D_${safeIme(izv8d, pfmeaCpDoc)}`).replace(/\.zip$/i, "");
  const zip = new JSZip();

  onProgress?.("Priprema Word 8D…");
  const wordHtml = buildOsmdWordHtml(izv8d, {
    naslov: "8D izveštaj o problemu",
    podnaslov: izv8d?.broj_8d ? `Broj: ${izv8d.broj_8d}` : undefined,
  });
  zip.file(`8D_${safeIme(izv8d, pfmeaCpDoc)}.doc`, "\ufeff" + wordHtml);

  const payload = pfmeaCpDocZaIzvoz(pfmeaCpDoc);
  const rpn = payload?.rpnSummary?.length
    ? payload.rpnSummary
    : izracunajRpnSummary(payload?.pfmeaRedovi || []);

  onProgress?.("Dodajem RPN Summary…");
  zip.file(
    `RPN_Summary_${safeIme(izv8d, pfmeaCpDoc)}.xlsx`,
    generisiRpnSummaryWorkbookBuffer(rpn),
  );

  onProgress?.("Dodajem PFMEA / Control Plan Excel…");
  if (payload && (payload.pfmeaRedovi.length || payload.cpRedovi.length)) {
    zip.file(
      `PFMEA_CP_${safeIme(izv8d, pfmeaCpDoc)}.xlsx`,
      generisiPfmeaCpWorkbookBuffer({ ...payload, rpnSummary: rpn }),
    );
  } else {
    zip.file(
      "UPUTSTVO_PFMEA_CP.txt",
      "Nema povezanog PFMEA/CP dokumenta.\r\n"
      + "Kreirajte ga iz 8D dugmetom → PFMEA / Control Plan, pa ponovo preuzmite paket.\r\n",
    );
  }

  zip.file(
    "README_PAKET.txt",
    "Paket kvaliteta — TRI-CORE QC\r\n"
    + "────────────────────────\r\n"
    + "• 8D_*.doc — izveštaj 8D (Word)\r\n"
    + "• RPN_Summary_*.xlsx — sažetak rizika\r\n"
    + "• PFMEA_CP_*.xlsx — PFMEA + Control Plan + RPN\r\n",
  );

  onProgress?.("Pakujem ZIP…");
  const blob = await zip.generateAsync({ type: "blob" });
  if (preuzmi) preuzmiBlob(blob, `${base}.zip`);
  onProgress?.("Gotovo");
  return blob;
}
