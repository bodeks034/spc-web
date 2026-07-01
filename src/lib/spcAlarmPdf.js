/** PDF zapis reakcije na SPC alarm (A4, portrait). */

import { dodajPdfBrendZaglavlje, dodajPdfBrendPodnozje } from "./pdfBrending.js";

function fmtBroj(v) {
  if (v == null || v === "") return "—";
  return Number(v).toFixed(4);
}

function fmtDatum(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("sr-RS");
}

export async function exportSpcAlarmReakcijaPdf(alarm, meta = {}) {
  if (!alarm?.id) return;
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();

  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov: "Alarm — zapis reakcije",
    podnaslov: `ID #${alarm.id} · ${fmtDatum(alarm.created_at)}`,
  });
  y += 4;

  const red = (label, value) => {
    if (y > 275) { pdf.addPage(); y = 20; }
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(100, 116, 139);
    pdf.text(label.toUpperCase(), 14, y);
    y += 5;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(30, 32, 36);
    const linije = pdf.splitTextToSize(String(value || "—"), W - 28);
    pdf.text(linije, 14, y);
    y += linije.length * 5 + 6;
  };

  red("Deo", `${alarm.id_deo}${meta.nazivDela ? ` — ${meta.nazivDela}` : ""}`);
  red("Status", (alarm.status || "—").toUpperCase());
  red("Kontrolna karta", [alarm.tip_karte, alarm.pozicija, alarm.pravilo].filter(Boolean).join(" · "));
  red("Merenje", `Vrednost ${fmtBroj(alarm.vrednost)} · UCL ${fmtBroj(alarm.ucl)} · LCL ${fmtBroj(alarm.lcl)}`);
  if (meta.radniNalog) red("Radni nalog", meta.radniNalog);
  if (alarm.komentar_operater) red("Komentar operatera", alarm.komentar_operater);
  if (meta.operaterIme) red("Potvrdio / karantin", meta.operaterIme);
  if (alarm.komentar_zatvaranja) red("Komentar zatvaranja", alarm.komentar_zatvaranja);
  if (meta.zatvorioIme) red("Zatvorio", meta.zatvorioIme);
  if (meta.eskalacijaId) red("Eskalacija", `#${meta.eskalacijaId}`);

  dodajPdfBrendPodnozje(pdf);

  const datum = (alarm.updated_at || alarm.created_at || new Date().toISOString()).split("T")[0];
  pdf.save(`TRI-CORE_alarm_${alarm.id_deo}_${datum}.pdf`);
}
