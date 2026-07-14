/** DejaVu Sans — podrška za srpsku latinicu (č ć š ž đ) u jsPDF. */

const REG_KEY = "__spcPdfFontSr";
let _fontMod = null;

export const PDF_FONT_SR = "DejaVuSans";

async function ucitajFontMod() {
  if (!_fontMod) {
    _fontMod = await import("./pdfFontDejaVuData.js");
  }
  return _fontMod;
}

/** Registruje DejaVu Sans na jsPDF instanci (idempotentno). */
export async function registrujPdfFontLatin(pdf) {
  if (pdf[REG_KEY]) return PDF_FONT_SR;
  const { DEJAVU_SANS_NORMAL_B64, DEJAVU_SANS_BOLD_B64 } = await ucitajFontMod();
  pdf.addFileToVFS("DejaVuSans.ttf", DEJAVU_SANS_NORMAL_B64);
  pdf.addFileToVFS("DejaVuSans-Bold.ttf", DEJAVU_SANS_BOLD_B64);
  pdf.addFont("DejaVuSans.ttf", PDF_FONT_SR, "normal");
  pdf.addFont("DejaVuSans-Bold.ttf", PDF_FONT_SR, "bold");
  pdf[REG_KEY] = true;
  return PDF_FONT_SR;
}

/** Postavi font + veličinu (normal | bold). */
export async function pdfSetFont(pdf, style = "normal", size = 9) {
  await registrujPdfFontLatin(pdf);
  pdf.setFont(PDF_FONT_SR, style);
  pdf.setFontSize(size);
}
