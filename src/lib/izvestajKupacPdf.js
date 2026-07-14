/**
 * Izveštaj za kupca — PDF, štampa i agregacije (atributivne + merljive).
 */

import { dodajPdfBrendZaglavlje, dodajPdfBrendPodnozje, PDF_BREND } from "./pdfBrending.js";
import { registrujPdfFontLatin, PDF_FONT_SR } from "./pdfFontSr.js";
import { LAB_FPY_KRATKO } from "./rtyFpy.js";
import { statAtributivneRedovi } from "./atributivneAgregacija.js";

const PDF_CRNI = [12, 12, 12];
const PDF_BELO = [255, 255, 255];
const PDF_ALT = [232, 238, 246];
const PDF_GRANICA = [120, 130, 145];
const MARGIN = 14;

function pdfSekcijaNaslov(pdf, y, tekst) {
  const w = pdf.internal.pageSize.getWidth() - MARGIN * 2;
  pdf.setFillColor(...PDF_BREND.plava);
  pdf.rect(MARGIN, y, w, 7, "F");
  pdf.setTextColor(...PDF_BELO);
  pdf.setFont(PDF_FONT_SR, "bold");
  pdf.setFontSize(9);
  pdf.text(tekst, MARGIN + 2, y + 5);
  pdf.setTextColor(...PDF_CRNI);
  return y + 10;
}

function pdfMetaRed(pdf, y, tekst, bold = false) {
  pdf.setFont(PDF_FONT_SR, bold ? "bold" : "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...PDF_CRNI);
  pdf.text(tekst, MARGIN, y);
  return y + 5;
}

function pdfTabela(pdf, { y, kolone, redovi, maxRedova = null }) {
  const pageW = pdf.internal.pageSize.getWidth();
  const tabelaW = pageW - MARGIN * 2;
  const fontSize = 7;
  const lineH = 4.2;
  const headerH = 7;
  const lista = maxRedova ? redovi.slice(0, maxRedova) : redovi;

  const drawHeader = (atY) => {
    pdf.setFillColor(...PDF_BREND.tamna);
    pdf.rect(MARGIN, atY - 4.5, tabelaW, headerH, "F");
    pdf.setTextColor(...PDF_BELO);
    pdf.setFont(PDF_FONT_SR, "bold");
    pdf.setFontSize(7);
    let cx = MARGIN + 1.5;
    for (const k of kolone) {
      pdf.text(k.label, cx, atY);
      cx += k.w;
    }
    pdf.setTextColor(...PDF_CRNI);
    return atY + headerH - 1;
  };

  y = drawHeader(y);

  lista.forEach((row, ri) => {
    const cells = kolone.map((k) => {
      const raw = k.fmt ? k.fmt(row) : String(row[k.key] ?? "—");
      return pdf.splitTextToSize(raw, Math.max(k.w - 2, 8));
    });
    const lines = Math.max(...cells.map((c) => c.length), 1);
    const rowH = lines * lineH + 2.5;

    if (y + rowH > 250) {
      pdf.addPage();
      y = MARGIN + 6;
      y = drawHeader(y);
    }

    if (ri % 2 === 0) {
      pdf.setFillColor(...PDF_ALT);
      pdf.rect(MARGIN, y - 3.2, tabelaW, rowH, "F");
    }

    pdf.setDrawColor(...PDF_GRANICA);
    pdf.setLineWidth(0.15);
    pdf.line(MARGIN, y - 3.2, MARGIN + tabelaW, y - 3.2);

    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(fontSize);
    let cx = MARGIN + 1.5;
    cells.forEach((linesArr, ci) => {
      linesArr.forEach((ln, li) => {
        pdf.text(ln, cx, y + li * lineH);
      });
      cx += kolone[ci].w;
    });
    y += rowH;
  });

  pdf.setDrawColor(...PDF_BREND.tamna);
  pdf.setLineWidth(0.25);
  pdf.line(MARGIN, y - 1, MARGIN + tabelaW, y - 1);
  return y + 4;
}

function pdfKpiKartice(pdf, y, stat) {
  const kpi = [
    ["Mereno", stat.n, ""],
    ["OK", stat.ok, ""],
    ["NOK", stat.nok, ""],
    [LAB_FPY_KRATKO, stat.rty, "%"],
    ["DPMO", stat.dpmo, ""],
    ["PPM", stat.ppm ?? "—", ""],
  ];
  kpi.forEach(([n, v, s], i) => {
    const x = MARGIN + (i % 3) * 60;
    const yy = y + Math.floor(i / 3) * 22;
    pdf.setFillColor(240, 244, 248);
    pdf.rect(x, yy, 56, 18, "F");
    pdf.setFontSize(8);
    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setTextColor(100, 110, 120);
    pdf.text(n, x + 3, yy + 7);
    pdf.setFontSize(13);
    pdf.setFont(PDF_FONT_SR, "bold");
    pdf.setTextColor(...PDF_CRNI);
    pdf.text(`${v}${s}`, x + 3, yy + 15);
  });
  return y + 46;
}

/** Agregacija kvaliteta po ID dela. */
export function agregirajPoDelu(log, { merljive = false } = {}) {
  const gr = {};
  for (const r of log || []) {
    const id = String(r.id_deo || "").toUpperCase();
    if (!id) continue;
    if (merljive) {
      if (!gr[id]) {
        gr[id] = { id_deo: id, naziv: r.naziv_dela || "", mereno: 0, ok: 0, nok: 0 };
      }
      gr[id].mereno += 1;
      if ((r.status || "").toUpperCase() === "NOK") gr[id].nok += 1;
      else gr[id].ok += 1;
      continue;
    }
    if (!gr[id]) {
      gr[id] = { rows: [], naziv: r.naziv_dela || "" };
    }
    gr[id].rows.push(r);
    if (!gr[id].naziv && r.naziv_dela) gr[id].naziv = r.naziv_dela;
  }

  if (merljive) {
    return Object.values(gr)
      .map((d) => ({
        ...d,
        rty: d.mereno > 0 ? ((d.ok / d.mereno) * 100).toFixed(1) : "—",
        ppm: d.mereno > 0 ? Math.round((d.nok / d.mereno) * 1e6) : "—",
      }))
      .sort((a, b) => b.nok - a.nok || b.mereno - a.mereno);
  }

  return Object.values(gr)
    .map(({ rows, naziv }) => {
      const d = statAtributivneRedovi(rows);
      const id = String(rows[0]?.id_deo || "").toUpperCase();
      return {
        id_deo: id,
        naziv,
        mereno: d.n,
        ok: d.ok,
        nok: d.nok,
        rty: d.n > 0 ? d.rty.toFixed(1) : "—",
        ppm: d.n > 0 ? String(d.dpmo) : "—",
      };
    })
    .sort((a, b) => b.nok - a.nok || b.mereno - a.mereno);
}

/** Pareto defekata (atributivne). */
export function paretoDefekata(log, limit = 8) {
  const gr = {};
  for (const r of log || []) {
    const g = String(r.greska_naziv || r.podkategorija || "").trim();
    if (!g) continue;
    const nok = Number(r.nok_kolicina) || 0;
    if (nok <= 0) continue;
    gr[g] = (gr[g] || 0) + nok;
  }
  return Object.entries(gr)
    .map(([defekt, kolicina]) => ({ defekt, kolicina }))
    .sort((a, b) => b.kolicina - a.kolicina || a.defekt.localeCompare(b.defekt))
    .slice(0, limit);
}

/** Status isporuke na osnovu DPMO. */
export function ocenaIsporuke(stat) {
  const dpmo = Number(stat?.dpmo);
  if (!Number.isFinite(dpmo)) return "N/A";
  if (dpmo <= 500) return "ODOBRENO";
  if (dpmo <= 2000) return "USLOVNO ODOBRENO";
  return "ZAHTEVA AKCIJU";
}

function obogatiStat(stat) {
  const n = Number(stat?.n) || 0;
  const nok = Number(stat?.nok) || 0;
  const ppm = n > 0 ? Math.round((nok / n) * 1e6) : "—";
  return { ...stat, ppm };
}

const RN_KOLONE = [
  { label: "NALOG", w: 32, key: "broj_naloga" },
  { label: "ID DELA", w: 28, key: "id_deo" },
  { label: "NAZIV", w: 72, key: "naziv_dela" },
  { label: "KOL.", w: 18, fmt: (r) => String(r.kolicina ?? "—") },
];

const DELO_KOLONE = [
  { label: "ID DELA", w: 28, key: "id_deo" },
  { label: "NAZIV", w: 52, key: "naziv" },
  { label: "MERENO", w: 22, fmt: (r) => String(r.mereno) },
  { label: "OK", w: 18, fmt: (r) => String(r.ok) },
  { label: "NOK", w: 18, fmt: (r) => String(r.nok) },
  { label: "FPY %", w: 20, key: "rty" },
  { label: "PPM", w: 22, key: "ppm" },
];

const DEFEKT_KOLONE = [
  { label: "DEFEKT", w: 100, key: "defekt" },
  { label: "NOK KOL.", w: 30, fmt: (r) => String(r.kolicina) },
];

const CILJ_KOLONE = [
  { label: "ID DELA", w: 24, key: "id_deo" },
  { label: "FPY %", w: 18, key: "rty_stvarno" },
  { label: "CILJ %", w: 18, key: "rty_cilj" },
  { label: "PPM", w: 20, key: "dpmo_stvarno" },
  { label: "CILJ PPM", w: 22, key: "dpmo_cilj" },
  { label: "STATUS", w: 28, key: "status" },
];

const TREND_KOLONE = [
  { label: "DATUM", w: 28, key: "datum" },
  { label: "MERENO", w: 22, fmt: (r) => String(r.n) },
  { label: "OK", w: 18, fmt: (r) => String(r.ok) },
  { label: "NOK", w: 18, fmt: (r) => String(r.nok) },
  { label: "FPY %", w: 20, fmt: (r) => String(r.rty) },
  { label: "DPMO", w: 24, fmt: (r) => String(r.dpmo) },
];

const SPC_KOLONE = [
  { label: "ID DELA", w: 24, key: "id_deo" },
  { label: "POZ.", w: 16, key: "pozicija" },
  { label: "Cp", w: 16, key: "cp" },
  { label: "Cpk", w: 16, key: "cpk" },
  { label: "MER.", w: 14, fmt: (r) => String(r.merenja) },
  { label: "STATUS", w: 24, key: "status" },
];

const NCR_KOLONE = [
  { label: "NCR", w: 30, key: "broj_ncr" },
  { label: "DELO", w: 22, key: "id_deo" },
  { label: "STATUS", w: 22, key: "status" },
  { label: "PRIOR.", w: 18, key: "prioritet" },
  { label: "OPIS", w: 58, fmt: (r) => String(r.opis || "").slice(0, 80) },
];

const OSMD_KOLONE = [
  { label: "8D", w: 24, fmt: (r) => String(r.broj_8d || r.id) },
  { label: "DELO", w: 22, key: "id_deo" },
  { label: "STATUS", w: 22, key: "status" },
  { label: "OPIS", w: 72, fmt: (r) => String(r.d2_opis_problema || "").slice(0, 90) },
];

function dodajPotpisPecatBlok(pdf, y, { statusIsporuke } = {}) {
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  if (y > H - 75) {
    pdf.addPage();
    y = MARGIN + 6;
  }

  y = pdfSekcijaNaslov(pdf, y, "ZAKLJUČAK I POTVRDA ZA KUPCA");

  pdf.setFont(PDF_FONT_SR, "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...PDF_CRNI);
  const tekst = [
    "Potvrđujemo da su podaci u ovom izveštaju generisani iz TRI-CORE QC sistema kvaliteta",
    "i da su proizvodi kontrolisani u skladu sa internim procedurama i specifikacijom kupca.",
    `Status isporuke za period: ${statusIsporuke}`,
  ];
  tekst.forEach((t) => {
    pdf.text(t, MARGIN, y);
    y += 4.5;
  });
  y += 4;

  const colW = (W - MARGIN * 2 - 20) / 2;
  const pecatX = MARGIN;
  const potpisX = MARGIN + colW + 20;
  const boxH = 32;

  pdf.setDrawColor(...PDF_BREND.plava);
  pdf.setLineWidth(0.4);
  pdf.setLineDashPattern([2, 2], 0);
  pdf.rect(pecatX, y, colW, boxH);
  pdf.setLineDashPattern([], 0);

  pdf.setFont(PDF_FONT_SR, "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...PDF_BREND.plava);
  pdf.text("PEČAT (QA)", pecatX + colW / 2, y + 8, { align: "center" });
  pdf.setFont(PDF_FONT_SR, "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(140, 150, 165);
  pdf.text("Mesto za pečat", pecatX + colW / 2, y + 22, { align: "center" });

  pdf.setFont(PDF_FONT_SR, "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...PDF_CRNI);
  pdf.text("Priprema (inženjer kvaliteta):", potpisX, y + 6);
  pdf.line(potpisX, y + 18, potpisX + colW, y + 18);
  pdf.text("Odobrio (šef kvaliteta):", potpisX, y + 24);
  pdf.line(potpisX, y + 30, potpisX + colW, y + 30);

  y += boxH + 8;
  pdf.setFontSize(7);
  pdf.setTextColor(120, 130, 145);
  pdf.text(`Datum potvrde: ${new Date().toLocaleDateString("sr-RS")}`, MARGIN, y);

  return y;
}

export async function kreirajIzvestajKupacPdf(podaci, {
  kupac,
  period,
  modul = "atributivne",
  brojIzvestaja = null,
} = {}) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registrujPdfFontLatin(pdf);

  const stat = obogatiStat(podaci.stat || {});
  const poDeo = podaci.poDeo || agregirajPoDelu(podaci.log, { merljive: modul === "merljive" });
  const defekti = modul === "atributivne"
    ? (podaci.defekti || paretoDefekata(podaci.log))
    : (podaci.defekti || []);
  const statusIsporuke = ocenaIsporuke(stat);
  const ciljevi = podaci.ciljevi || [];
  const trend = podaci.trend || [];
  const spcSummary = podaci.spcSummary || [];
  const ncr = podaci.ncr || [];
  const osmd = podaci.osmd || [];
  const br = brojIzvestaja || `IK-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(kupac || "X").slice(0, 4).toUpperCase()}`;

  const modulNaziv = modul === "merljive" ? "Merljive karakteristike" : "Atributivna kontrola";
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov: "Izveštaj kvaliteta za kupca",
    podnaslov: `${kupac} · ${period} dana · ${modulNaziv}`,
  });
  y += 4;

  y = pdfMetaRed(pdf, y, `Broj izveštaja: ${br}`, true);
  y = pdfMetaRed(pdf, y, `Datum generisanja: ${new Date().toLocaleString("sr-RS")}`);
  y = pdfMetaRed(pdf, y, `Obuhvaćeno radnih naloga: ${(podaci.nalozi || []).length}`);
  y += 4;

  y = pdfSekcijaNaslov(pdf, y, "KPI PERIODA");
  y = pdfKpiKartice(pdf, y, stat);
  y += 2;

  if ((podaci.nalozi || []).length) {
    y = pdfSekcijaNaslov(pdf, y, `RADNI NALOZI (${podaci.nalozi.length})`);
    y = pdfTabela(pdf, { y, kolone: RN_KOLONE, redovi: podaci.nalozi, maxRedova: 40 });
  }

  if (poDeo.length) {
    y = pdfSekcijaNaslov(pdf, y, `KVALITET PO DELU (${poDeo.length})`);
    y = pdfTabela(pdf, { y, kolone: DELO_KOLONE, redovi: poDeo, maxRedova: 30 });
  }

  if (defekti.length) {
    const naslovDef = modul === "merljive" ? "TOP NOK PO DIMENZIJI" : `TOP DEFEKTI — PARETO (${defekti.length})`;
    y = pdfSekcijaNaslov(pdf, y, naslovDef);
    y = pdfTabela(pdf, { y, kolone: DEFEKT_KOLONE, redovi: defekti });
  }

  if (ciljevi.length) {
    y = pdfSekcijaNaslov(pdf, y, `CILJEVI KVALITETA — STVARNO VS CILJ (${ciljevi.length})`);
    y = pdfTabela(pdf, { y, kolone: CILJ_KOLONE, redovi: ciljevi, maxRedova: 25 });
  }

  if (trend.length) {
    y = pdfSekcijaNaslov(pdf, y, `TREND KVALITETA PO DANU (${trend.length})`);
    y = pdfTabela(pdf, { y, kolone: TREND_KOLONE, redovi: trend, maxRedova: 31 });
  }

  if (spcSummary.length) {
    y = pdfSekcijaNaslov(pdf, y, `SPC KAPABILITET — Cp/Cpk (${spcSummary.length})`);
    y = pdfTabela(pdf, { y, kolone: SPC_KOLONE, redovi: spcSummary, maxRedova: 40 });
  }

  if (ncr.length) {
    y = pdfSekcijaNaslov(pdf, y, `OTVORENI NCR / CAPA (${ncr.length})`);
    y = pdfTabela(pdf, { y, kolone: NCR_KOLONE, redovi: ncr, maxRedova: 15 });
  } else {
    y = pdfSekcijaNaslov(pdf, y, "OTVORENI NCR / CAPA");
    y = pdfMetaRed(pdf, y, "Nema otvorenih NCR za delove ovog kupca ✓");
    y += 2;
  }

  if (osmd.length) {
    y = pdfSekcijaNaslov(pdf, y, `OTVORENI 8D IZVEŠTAJI (${osmd.length})`);
    y = pdfTabela(pdf, { y, kolone: OSMD_KOLONE, redovi: osmd, maxRedova: 12 });
  } else {
    y = pdfSekcijaNaslov(pdf, y, "OTVORENI 8D IZVEŠTAJI");
    y = pdfMetaRed(pdf, y, "Nema otvorenih 8D za delove ovog kupca ✓");
    y += 2;
  }

  dodajPotpisPecatBlok(pdf, y, { statusIsporuke });
  dodajPdfBrendPodnozje(pdf);

  return { pdf, filename: `TRI-CORE_Izvestaj_kupac_${safeIme(kupac)}_${new Date().toISOString().slice(0, 10)}.pdf` };
}

function safeIme(s) {
  return String(s || "kupac").replace(/[^\w.-]+/g, "_").slice(0, 30);
}

export async function preuzmiIzvestajKupacPdf(podaci, options = {}) {
  const { pdf, filename } = await kreirajIzvestajKupacPdf(podaci, options);
  pdf.save(filename);
  return filename;
}

export function buildIzvestajKupacPrintHtml(podaci, {
  kupac,
  period,
  modul = "atributivne",
  brojIzvestaja = null,
} = {}) {
  const stat = obogatiStat(podaci.stat || {});
  const poDeo = podaci.poDeo || agregirajPoDelu(podaci.log, { merljive: modul === "merljive" });
  const defekti = modul === "atributivne"
    ? (podaci.defekti || paretoDefekata(podaci.log))
    : (podaci.defekti || []);
  const statusIsporuke = ocenaIsporuke(stat);
  const ciljevi = podaci.ciljevi || [];
  const trend = podaci.trend || [];
  const spcSummary = podaci.spcSummary || [];
  const ncr = podaci.ncr || [];
  const osmd = podaci.osmd || [];
  const br = brojIzvestaja || `IK-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
  const modulNaziv = modul === "merljive" ? "Merljive karakteristike" : "Atributivna kontrola";
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const kpiHtml = [
    ["Mereno", stat.n], ["OK", stat.ok], ["NOK", stat.nok],
    [LAB_FPY_KRATKO, `${stat.rty}%`], ["DPMO", stat.dpmo], ["PPM", stat.ppm],
  ].map(([l, v]) => `<div class="kpi"><div class="kpi-l">${esc(l)}</div><div class="kpi-v">${esc(v)}</div></div>`).join("");

  const rnRows = (podaci.nalozi || []).map((n) =>
    `<tr><td>${esc(n.broj_naloga)}</td><td>${esc(n.id_deo)}</td><td>${esc(n.naziv_dela)}</td><td>${esc(n.kolicina)}</td></tr>`,
  ).join("");

  const deoRows = poDeo.map((d) =>
    `<tr><td>${esc(d.id_deo)}</td><td>${esc(d.naziv)}</td><td>${d.mereno}</td><td>${d.ok}</td><td>${d.nok}</td><td>${esc(d.rty)}</td><td>${esc(d.ppm)}</td></tr>`,
  ).join("");

  const defRows = defekti.map((d) =>
    `<tr><td>${esc(d.defekt)}</td><td>${d.kolicina}</td></tr>`,
  ).join("");

  const ciljRows = ciljevi.map((c) =>
    `<tr><td>${esc(c.id_deo)}</td><td>${esc(c.rty_stvarno)}</td><td>${esc(c.rty_cilj)}</td><td>${esc(c.dpmo_stvarno)}</td><td>${esc(c.dpmo_cilj)}</td><td>${esc(c.status)}</td></tr>`,
  ).join("");

  const trendRows = trend.map((t) =>
    `<tr><td>${esc(t.datum)}</td><td>${t.n}</td><td>${t.ok}</td><td>${t.nok}</td><td>${t.rty}</td><td>${t.dpmo}</td></tr>`,
  ).join("");

  const spcRows = spcSummary.map((s) =>
    `<tr><td>${esc(s.id_deo)}</td><td>${esc(s.pozicija)}</td><td>${esc(s.cp)}</td><td>${esc(s.cpk)}</td><td>${s.merenja}</td><td>${esc(s.status)}</td></tr>`,
  ).join("");

  const ncrRows = ncr.map((n) =>
    `<tr><td>${esc(n.broj_ncr)}</td><td>${esc(n.id_deo)}</td><td>${esc(n.status)}</td><td>${esc(n.prioritet)}</td><td>${esc(String(n.opis || "").slice(0, 80))}</td></tr>`,
  ).join("");

  const osmdRows = osmd.map((d) =>
    `<tr><td>${esc(d.broj_8d || d.id)}</td><td>${esc(d.id_deo)}</td><td>${esc(d.status)}</td><td>${esc(String(d.d2_opis_problema || "").slice(0, 90))}</td></tr>`,
  ).join("");

  return `<!DOCTYPE html><html lang="sr"><head><meta charset="utf-8"/>
<title>Izveštaj za kupca — ${esc(kupac)}</title>
<style>
  body{font-family:Segoe UI,Arial,sans-serif;font-size:11px;color:#1a1a1a;margin:24px;}
  h1{font-size:16px;color:#2c5282;margin:0 0 4px;}
  .meta{color:#555;margin-bottom:16px;}
  .kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0;}
  .kpi{background:#f0f4f8;padding:10px;border-radius:6px;}
  .kpi-l{font-size:9px;color:#666;text-transform:uppercase;}
  .kpi-v{font-size:18px;font-weight:700;}
  h2{font-size:12px;color:#2c5282;border-bottom:2px solid #2c5282;padding-bottom:4px;margin-top:20px;}
  table{width:100%;border-collapse:collapse;margin-top:8px;}
  th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;}
  th{background:#1c2333;color:#fff;font-size:9px;}
  tr:nth-child(even){background:#e8eef6;}
  .potpis{margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:24px;}
  .pecat{border:2px dashed #2c5282;min-height:90px;text-align:center;padding:12px;color:#2c5282;}
  .linija{border-bottom:1px solid #333;margin:28px 0 4px;}
  @media print{body{margin:12mm;}}
</style></head><body>
<h1>Izveštaj kvaliteta za kupca</h1>
<div class="meta">
  <div><b>Kupac:</b> ${esc(kupac)} · <b>Period:</b> ${esc(period)} dana · <b>Modul:</b> ${esc(modulNaziv)}</div>
  <div><b>Broj izveštaja:</b> ${esc(br)} · <b>Datum:</b> ${new Date().toLocaleString("sr-RS")}</div>
  <div><b>Status isporuke:</b> ${esc(statusIsporuke)}</div>
</div>
<h2>KPI perioda</h2>
<div class="kpi-grid">${kpiHtml}</div>
${rnRows ? `<h2>Radni nalozi (${podaci.nalozi.length})</h2><table><thead><tr><th>Nalog</th><th>ID dela</th><th>Naziv</th><th>Kol.</th></tr></thead><tbody>${rnRows}</tbody></table>` : ""}
${deoRows ? `<h2>Kvalitet po delu</h2><table><thead><tr><th>ID dela</th><th>Naziv</th><th>Mereno</th><th>OK</th><th>NOK</th><th>FPY %</th><th>PPM</th></tr></thead><tbody>${deoRows}</tbody></table>` : ""}
${defRows ? `<h2>${modul === "merljive" ? "Top NOK po dimenziji" : "Top defekti (Pareto)"}</h2><table><thead><tr><th>Defekt</th><th>NOK kol.</th></tr></thead><tbody>${defRows}</tbody></table>` : ""}
${ciljRows ? `<h2>Ciljevi kvaliteta — stvarno vs cilj</h2><table><thead><tr><th>ID dela</th><th>FPY %</th><th>Cilj %</th><th>PPM</th><th>Cilj PPM</th><th>Status</th></tr></thead><tbody>${ciljRows}</tbody></table>` : ""}
${trendRows ? `<h2>Trend kvaliteta po danu</h2><table><thead><tr><th>Datum</th><th>Mereno</th><th>OK</th><th>NOK</th><th>FPY %</th><th>DPMO</th></tr></thead><tbody>${trendRows}</tbody></table>` : ""}
${spcRows ? `<h2>SPC kapabilitet (Cp/Cpk)</h2><table><thead><tr><th>ID dela</th><th>Poz.</th><th>Cp</th><th>Cpk</th><th>Mer.</th><th>Status</th></tr></thead><tbody>${spcRows}</tbody></table>` : ""}
<h2>Otvoreni NCR / CAPA (${ncr.length})</h2>
${ncrRows ? `<table><thead><tr><th>NCR</th><th>Deo</th><th>Status</th><th>Prior.</th><th>Opis</th></tr></thead><tbody>${ncrRows}</tbody></table>` : "<p>Nema otvorenih NCR ✓</p>"}
<h2>Otvoreni 8D izveštaji (${osmd.length})</h2>
${osmdRows ? `<table><thead><tr><th>8D</th><th>Deo</th><th>Status</th><th>Opis</th></tr></thead><tbody>${osmdRows}</tbody></table>` : "<p>Nema otvorenih 8D ✓</p>"}
<h2>Zaključak i potvrda</h2>
<p>Potvrđujemo da su podaci generisani iz TRI-CORE QC i da su proizvodi kontrolisani u skladu sa specifikacijom kupca.</p>
<div class="potpis">
  <div class="pecat"><b>PEČAT (QA)</b><br/><small>Mesto za pečat</small></div>
  <div>
    <div>Priprema (inženjer kvaliteta):</div><div class="linija"></div>
    <div>Odobrio (šef kvaliteta):</div><div class="linija"></div>
    <div style="margin-top:8px;font-size:10px;color:#666;">Datum: ${new Date().toLocaleDateString("sr-RS")}</div>
  </div>
</div>
</body></html>`;
}

/** Otvara prozor za štampu (Ctrl+P) — isti sadržaj kao PDF. */
export async function stampajIzvestajKupac(podaci, options = {}) {
  const html = buildIzvestajKupacPrintHtml(podaci, options);
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) throw new Error("Pregledač je blokirao prozor za štampu. Dozvolite pop-up.");
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 500);
}
