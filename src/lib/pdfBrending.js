/** Zajednični PDF brend — TRI-CORE QC zaglavlje i podnožje. */

import { getBrending } from "./brending.js";
import { PDF_LOGO_DATA_URL } from "./pdfLogoEmbedded.js";
import { registrujPdfFontLatin, PDF_FONT_SR } from "./pdfFontSr.js";

let _logoFetchUrl = null;

export const PDF_BREND = {
  naziv: "TRI-CORE QC",
  slogan: "Tri modula. Jedan sistem kvaliteta.",
  plava: [44, 82, 130],
  narandzasta: [230, 126, 34],
  tamna: [28, 35, 51],
};

/** Ugrađeni raster logo — uvek dostupan u PDF-u (bez mreže). */
export function getPdfLogoDataUrl() {
  return PDF_LOGO_DATA_URL || _logoFetchUrl;
}

export async function ucitajPdfLogo() {
  if (PDF_LOGO_DATA_URL) return PDF_LOGO_DATA_URL;
  if (_logoFetchUrl) return _logoFetchUrl;
  try {
    const base = import.meta.env.BASE_URL || "/";
    const res = await fetch(`${base}tri-core-qc-icon.png`);
    if (!res.ok) return null;
    const blob = await res.blob();
    _logoFetchUrl = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    return _logoFetchUrl;
  } catch {
    return null;
  }
}

export function developedByTekst() {
  const naziv = getBrending().razvojNaziv?.trim();
  return naziv ? `Developed by ${naziv}` : "";
}

function crtajBrendTekst(pdf, textX, y) {
  pdf.setFont(PDF_FONT_SR, "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...PDF_BREND.plava);
  pdf.text("TRI-CORE", textX, y);
  const wCore = pdf.getTextWidth("TRI-CORE");
  pdf.setTextColor(...PDF_BREND.narandzasta);
  pdf.text(" QC", textX + wCore, y);
  return textX + wCore + pdf.getTextWidth(" QC");
}

/**
 * Tamna traka zaglavlja — raster simbol + TRI-CORE QC + naslov dokumenta.
 * @returns {number} Y pozicija ispod zaglavlja (mm)
 */
export async function dodajPdfBrendZaglavlje(pdf, {
  naslov = "",
  podnaslov = "",
  margin = 14,
  visina = null,
} = {}) {
  const W = pdf.internal.pageSize.getWidth();
  const logo = await ucitajPdfLogo();
  const barH = visina || (podnaslov ? 28 : 24);

  await registrujPdfFontLatin(pdf);

  pdf.setFillColor(...PDF_BREND.tamna);
  pdf.rect(0, 0, W, barH, "F");

  const logoW = 18;
  const logoH = 16;
  const logoY = (barH - logoH) / 2;
  let textX = margin;

  if (logo) {
    try {
      pdf.addImage(logo, "PNG", margin, logoY, logoW, logoH);
      textX = margin + logoW + 4;
    } catch {
      textX = margin;
    }
  }

  const brandEndX = crtajBrendTekst(pdf, textX, barH / 2 + 1);

  if (naslov) {
    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(210, 218, 230);
    const maxW = W - brandEndX - margin - 2;
    const naslovStr = ` · ${naslov}`;
    const lines = pdf.splitTextToSize(naslovStr, Math.max(40, maxW));
    pdf.text(lines[0] || naslovStr, brandEndX + 1, barH / 2 + 1);
  }

  if (podnaslov) {
    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(170, 180, 195);
    const lines = pdf.splitTextToSize(podnaslov, W - textX - margin);
    pdf.text(lines[0] || podnaslov, textX, barH - 6);
  }

  return barH + 6;
}

/** Podnožje: brend levo, Developed by desno. */
export function dodajPdfBrendPodnozje(pdf) {
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const developed = developedByTekst();

  pdf.setFont(PDF_FONT_SR, "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(130, 140, 155);
  pdf.text(`${PDF_BREND.naziv} · ${PDF_BREND.slogan}`, 14, H - 8);
  if (developed) {
    const w = pdf.getTextWidth(developed);
    pdf.text(developed, W - 14 - w, H - 8);
  }
}
