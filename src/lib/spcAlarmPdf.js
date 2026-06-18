/** PDF zapis reakcije na SPC alarm (A4, portrait). */

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
  let y = 18;

  pdf.setFillColor(28, 35, 51);
  pdf.rect(0, 0, W, 28, "F");
  pdf.setTextColor(255, 107, 107);
  pdf.setFontSize(15);
  pdf.setFont("helvetica", "bold");
  pdf.text("SPC ALARM — ZAPIS REAKCIJE", 14, 12);
  pdf.setTextColor(200, 210, 230);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.text(`ID alarma #${alarm.id} · ${fmtDatum(alarm.created_at)}`, 14, 21);

  y = 36;
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
  red("SPC kartica", [alarm.tip_karte, alarm.pozicija, alarm.pravilo].filter(Boolean).join(" · "));
  red("Merenje", `Vrednost ${fmtBroj(alarm.vrednost)} · UCL ${fmtBroj(alarm.ucl)} · LCL ${fmtBroj(alarm.lcl)}`);
  if (meta.radniNalog) red("Radni nalog", meta.radniNalog);
  if (alarm.komentar_operater) red("Komentar operatera", alarm.komentar_operater);
  if (meta.operaterIme) red("Potvrdio / karantin", meta.operaterIme);
  if (alarm.komentar_zatvaranja) red("Komentar zatvaranja", alarm.komentar_zatvaranja);
  if (meta.zatvorioIme) red("Zatvorio", meta.zatvorioIme);
  if (meta.eskalacijaId) red("Eskalacija", `#${meta.eskalacijaId}`);

  pdf.setFontSize(8);
  pdf.setTextColor(120, 130, 150);
  pdf.text(`Generisano: ${new Date().toLocaleString("sr-RS")}`, 14, 285);

  const datum = (alarm.updated_at || alarm.created_at || new Date().toISOString()).split("T")[0];
  pdf.save(`SPC_reakcija_${alarm.id_deo}_${datum}.pdf`);
}
