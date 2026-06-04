import { calcDPMO, calcRTY } from "./spcStats.js";
import { fetchKpiUnos, agregirajKpiUnos, dodajKpiBlokPdf } from "./kpiUnos.js";

export async function fetchSmenaStatMerljive(supabase, { datum, smena, idDeo }) {
  let q = supabase.from("merenja_varijabilna")
    .select("status")
    .eq("datum", datum)
    .eq("smena", Number(smena));
  if (idDeo) q = q.eq("id_deo", idDeo);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data || [];
  const n = rows.length;
  const nok = rows.filter(r => (r.status || "").toUpperCase() === "NOK").length;
  const ok = n - nok;
  return {
    ok, nok, merenja: n,
    rty: calcRTY(ok, n),
    dpmo: calcDPMO(nok, n),
    p: n > 0 ? +((nok / n) * 100).toFixed(2) : 0,
  };
}

export async function generisiIzvestajSmeneMerljive(supabase, korisnik, smena, C, addToast) {
  const danas = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase.from("merenja_varijabilna")
    .select("*")
    .eq("datum", danas)
    .eq("smena", Number(smena))
    .order("created_at", { ascending: true });
  if (error) {
    addToast?.(error.message, "greska");
    return;
  }
  if (!data?.length) {
    addToast?.("Nema merljivih merenja za ovu smenu danas.", "greska");
    return;
  }

  const n = data.length;
  const nok = data.filter(r => (r.status || "").toUpperCase() === "NOK").length;
  const ok = n - nok;
  const rty = n > 0 ? ((ok / n) * 100).toFixed(2) : 0;
  const dpmo = n > 0 ? Math.round((nok / n) * 1e6) : 0;

  const gB = {};
  data.forEach(r => {
    if ((r.status || "").toUpperCase() === "NOK") {
      const k = r.pozicija || "?";
      gB[k] = (gB[k] || 0) + 1;
    }
  });
  const topPoz = Object.entries(gB).sort((a, b) => b[1] - a[1]).slice(0, 8);

  let kpiAgg = null;
  try {
    const kpiRows = await fetchKpiUnos(supabase, {
      modul: "merljive",
      datum: danas,
      smena,
    });
    kpiAgg = agregirajKpiUnos(kpiRows);
  } catch { /* kpi_unos možda nije migriran */ }

  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(28, 35, 51);
  pdf.rect(0, 0, W, 40, "F");
  pdf.setTextColor(88, 166, 255);
  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text("SPC MERLJIVE VELIČINE", 14, 15);
  pdf.setTextColor(200, 210, 230);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text(`IZVEŠTAJ SMENE ${smena} · ${danas}`, 14, 25);
  pdf.text(`Generisao: ${korisnik?.ime || "—"}`, 14, 33);

  let y = 55;
  pdf.setTextColor(30, 32, 36);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("STATISTIKE SMENE (merenja)", 14, y);
  y += 8;

  [
    ["Ukupno merenja", n, ""],
    ["OK", ok, ""],
    ["NOK", nok, ""],
    ["RTY %", rty, "%"],
    ["DPMO", dpmo.toLocaleString(), ""],
  ].forEach(([naziv, vrednost, suf], i) => {
    const x = 14 + (i % 3) * 62;
    const yy = y + Math.floor(i / 3) * 22;
    pdf.setFillColor(240, 244, 248);
    pdf.rect(x, yy, 58, 18, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 110, 120);
    pdf.text(naziv, x + 4, yy + 7);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 32, 36);
    pdf.text(`${vrednost}${suf}`, x + 4, yy + 15);
  });
  y += 50;

  if (kpiAgg) {
    y = dodajKpiBlokPdf(pdf, y, kpiAgg);
  }

  if (topPoz.length) {
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.text("TOP NOK PO DIMENZIJI", 14, y);
    y += 8;
    topPoz.forEach(([naziv, count], i) => {
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(60, 70, 80);
      pdf.text(`${i + 1}. ${naziv}`, 14, y);
      pdf.text(`${count}×`, 150, y);
      y += 7;
    });
  }

  pdf.save(`Smena_merljive_${smena}_${danas}.pdf`);
  addToast?.("✓ PDF izveštaj smene", "uspeh");
}
