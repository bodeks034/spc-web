import { flushSync } from "react-dom";
import { dodajPdfBrendZaglavlje, dodajPdfBrendPodnozje } from "./pdfBrending.js";

function dISO() {
  return new Date().toISOString().split("T")[0];
}

function formatPeriod(meta) {
  const od = meta.datumOd;
  const do_ = meta.datumDo;
  if (od && do_) return `${od} — ${do_}`;
  if (od) return `od ${od}`;
  if (do_) return `do ${do_}`;
  return "sve datume";
}

function izgledaPrazno(el) {
  if (!el || el.offsetHeight < 60) return true;
  const t = String(el.innerText || "").trim().slice(0, 120);
  return /^(Izaberi|Nema merenja|Nema podataka|Učitavanje|Potrebna|Za X|Za I|Nedovoljno)/i.test(t);
}

function dodajSlikuNaStranicu(pdf, canvas, { margin = 10, headerH = 24 } = {}) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const availW = pageW - margin * 2;
  const availH = pageH - margin - headerH;
  let imgW = availW;
  let imgH = (canvas.height * imgW) / canvas.width;
  if (imgH > availH) {
    imgH = availH;
    imgW = (canvas.width * imgH) / canvas.height;
  }
  pdf.addImage(
    canvas.toDataURL("image/jpeg", 0.88),
    "JPEG",
    margin,
    headerH,
    imgW,
    imgH,
  );
}

/** Jedna trenutno vidljiva karta — brzi export za slanje / arhivu. */
export async function exportSpcTrenutnaKartaPdf({ sadrzajRef, meta = {}, addToast }) {
  const el = sadrzajRef?.current;
  if (!el || izgledaPrazno(el)) {
    addToast?.("Nema sadržaja za PDF — proveri filter, dimenziju ili izaberi kartu", "greska");
    return;
  }
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  const canvas = await html2canvas(el, {
    scale: 1.5,
    useCORS: true,
    logging: false,
    backgroundColor: meta.bgColor || "#0f1419",
  });
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = 12;
  const headerH = await dodajPdfBrendZaglavlje(pdf, {
    naslov: [meta.tabNaziv || meta.tab, meta.idDeo].filter(Boolean).join(" · ") || "Kontrolna karta",
  });
  dodajSlikuNaStranicu(pdf, canvas, { margin, headerH });
  dodajPdfBrendPodnozje(pdf);
  const tabSlug = String(meta.tab || "karta").replace(/[^\w-]+/g, "_");
  pdf.save(`TRI-CORE_${meta.idDeo || "deo"}_${tabSlug}_${dISO()}.pdf`);
  addToast?.("✓ PDF ove karte", "uspeh");
}

/**
 * PDF paket: naslovna + po jedna strana za svaku preporučenu kartu (grafikon + KPI red).
 */
export async function exportSpcPredlogPaketPdf({
  preporuceniIds = [],
  stavke = [],
  tab,
  setTab,
  sadrzajRef,
  meta = {},
  tabSpreman = () => true,
  onProgress,
  addToast,
}) {
  const ids = [...new Set(preporuceniIds)].filter(
    (id) => id !== "8d" && tabSpreman(id),
  );
  if (!ids.length) {
    addToast?.("Nema preporučenih karata sa podacima za PDF", "greska");
    return;
  }

  const originalTab = tab;
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = 12;
  const pageW = pdf.internal.pageSize.getWidth();

  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov: String(meta.naslov || "Analitika — izveštaj"),
    podnaslov: [
      meta.idDeo && `ID: ${meta.idDeo}`,
      meta.modul && `Modul: ${meta.modul}`,
      `Period: ${formatPeriod(meta)}`,
    ].filter(Boolean).join(" · "),
  });
  y += 4;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(40, 45, 55);
  [
    meta.nazivDela && meta.nazivDela,
    meta.pozicija && `Dimenzija: ${meta.pozicija}`,
    meta.smena && `Smena: ${meta.smena}`,
    `Generisano: ${new Date().toLocaleString("sr-RS")}`,
  ].filter(Boolean).forEach((line) => {
    pdf.text(line, margin, y);
    y += 6;
  });
  y += 4;
  pdf.setFontSize(9);
  pdf.setTextColor(90, 100, 120);
  pdf.text("Preporučene karte u ovom izveštaju:", margin, y);
  y += 6;
  ids.forEach((id, i) => {
    const s = stavke.find((x) => x.id === id);
    pdf.text(`${i + 1}. ${s?.naziv || id}${s?.tekst ? ` — ${s.tekst}` : ""}`, margin, y);
    y += 5;
  });
  pdf.setTextColor(0, 0, 0);

  dodajPdfBrendPodnozje(pdf);

  let captured = 0;

  for (let i = 0; i < ids.length; i++) {
    const chartId = ids[i];
    const st = stavke.find((s) => s.id === chartId);
    const naziv = st?.naziv || chartId;
    onProgress?.(`Karta ${i + 1}/${ids.length}: ${naziv}`);

    flushSync(() => setTab(chartId));
    await new Promise((r) => setTimeout(r, 500));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const el = sadrzajRef?.current;
    if (!el || izgledaPrazno(el)) continue;

    const canvas = await html2canvas(el, {
      scale: 1.35,
      useCORS: true,
      logging: false,
      backgroundColor: meta.bgColor || "#0f1419",
    });
    if (canvas.height < 40) continue;

    pdf.addPage();
    await dodajPdfBrendZaglavlje(pdf, { naslov: naziv });
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(`${naziv}${meta.idDeo ? ` · ${meta.idDeo}` : ""}`, margin, 14);
    if (st?.tekst) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      const lines = pdf.splitTextToSize(st.tekst, pageW - margin * 2);
      pdf.text(lines, margin, 20);
      pdf.setTextColor(0, 0, 0);
    }
    dodajSlikuNaStranicu(pdf, canvas, { margin, headerH: st?.tekst ? 32 : 28 });
    dodajPdfBrendPodnozje(pdf);
    captured++;
  }

  flushSync(() => setTab(originalTab));

  if (captured === 0) {
    addToast?.(
      "PDF nije kreiran — za merljive izaberi dimenziju; proveri filter i podatke",
      "greska",
    );
    return;
  }

  dodajPdfBrendPodnozje(pdf);

  const fname = `TRI-CORE_izvestaj_${meta.idDeo || "deo"}_${meta.modul || "analitika"}_${dISO()}.pdf`;
  pdf.save(fname);
  addToast?.(`✓ PDF izveštaj: ${captured} karte`, "uspeh");
}
