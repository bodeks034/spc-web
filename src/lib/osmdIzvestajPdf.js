const D_LABELE = [
  "D1 Tim",
  "D2 Opis problema",
  "D3 Privremena akcija",
  "D4 Uzrok",
  "D5 Korektivna akcija",
  "D6 Implementacija",
  "D7 Prevencija",
  "D8 Zakljucak",
];

const D_POLJA = [
  "d1_tim",
  "d2_opis_problema",
  "d3_privremena_akcija",
  "d4_uzrok",
  "d5_korektivna",
  "d6_implementacija",
  "d7_prevencija",
  "d8_zakljucak",
];

function datumZaPdf(izv) {
  const raw = izv?.created_at;
  if (!raw) return new Date();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function safeImeFajla(deo, datum) {
  const id = String(deo || "deo").replace(/[^\w.-]+/g, "_");
  const dan = datum.toISOString().split("T")[0];
  return id ? `${id}_${dan}` : dan;
}

/** Generise i preuzima PDF 8D izvestaja. */
export async function exportOsmdIzvestajPdf(izv, {
  naslov = "8D IZVESTAJ O PROBLEMU",
  prefiksFajla = "8D",
} = {}) {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const datum = datumZaPdf(izv);

  pdf.setFillColor(28, 35, 51);
  pdf.rect(0, 0, W, 30, "F");
  pdf.setTextColor(88, 166, 255);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text(naslov, 14, 12);
  pdf.setTextColor(200, 210, 230);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${izv?.id_deo || "—"} · ${datum.toLocaleDateString("sr-RS")}`, 14, 22);

  let y = 40;
  D_LABELE.forEach((lab, i) => {
    if (y > 260) {
      pdf.addPage();
      y = 20;
    }
    pdf.setFillColor(240, 244, 248);
    pdf.rect(14, y, W - 28, 6, "F");
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(80, 100, 120);
    pdf.text(lab.toUpperCase(), 16, y + 4.5);
    y += 8;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(30, 32, 36);
    const tekst = String(izv?.[D_POLJA[i]] || "—");
    const linije = pdf.splitTextToSize(tekst, W - 28);
    pdf.text(linije, 14, y);
    y += linije.length * 5 + 4;
  });

  pdf.save(`${prefiksFajla}_${safeImeFajla(izv?.id_deo, datum)}.pdf`);
}

export const OSMD_DB_KOLONE = [
  "id_deo",
  "d1_tim",
  "d2_opis_problema",
  "d3_privremena_akcija",
  "d4_uzrok",
  "d5_korektivna",
  "d6_implementacija",
  "d7_prevencija",
  "d8_zakljucak",
  "status",
];

export function osmdPayloadIzForme(form) {
  const out = {};
  for (const k of OSMD_DB_KOLONE) {
    if (form[k] !== undefined && form[k] !== null) out[k] = form[k];
  }
  return out;
}
