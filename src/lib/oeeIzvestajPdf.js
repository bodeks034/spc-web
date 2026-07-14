/**
 * OEE izveštaj — PDF i štampa (Operativa tab).
 */

import { dodajPdfBrendZaglavlje, dodajPdfBrendPodnozje, PDF_BREND } from "./pdfBrending.js";
import { registrujPdfFontLatin, PDF_FONT_SR } from "./pdfFontSr.js";
import { izracunajOeeKpi } from "./oeeKpi.js";
import { agregirajKpiUnos, grupisiKpiRedove, kpiKljucZaModul, datumIsoUSr, oznakaKpiKljuca } from "./kpiUnos.js";

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
    pdf.setFontSize(7);
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

/** Grupisani redovi po seriji (merljive) ili RN (atributivne) — kao u KPI hub-u. */
export function pripremiOeeRedove(podaci, modul) {
  if (!podaci?.length) return [];
  const { mapa, meta } = grupisiKpiRedove(modul, podaci);
  return Object.entries(mapa)
    .map(([kljuc, vrednosti]) => {
      const src = podaci.find((r) => kpiKljucZaModul(modul, r) === kljuc) || {};
      const m = meta[kljuc] || {};
      return {
        _kljuc: kljuc,
        _oznaka: oznakaKpiKljuca(modul, kljuc),
        id_deo: src.id_deo,
        datum: src.datum,
        smena: src.smena,
        radni_nalog: m.radni_nalog || src.radni_nalog,
        serija: m.serija ?? src.serija,
        ...vrednosti,
      };
    })
    .sort((a, b) => {
      const sa = String(a.serija || a._oznaka || "");
      const sb = String(b.serija || b._oznaka || "");
      return sa.localeCompare(sb, "sr");
    });
}

function formulaTekst(izvor, kpi) {
  const planMin = Number(izvor?.planirano_min) || 0;
  const zastoj = Number(izvor?.zastoj_min) || 0;
  const planKom = Number(izvor?.planirano_kom) || 0;
  const uk = Number(izvor?.ukupno_kom) || 0;
  const fp = Number(izvor?.ispravno_iz_prve) || 0;
  const linije = [];
  if (planMin > 0) {
    linije.push(`Dostupnost (A): (${planMin} − ${zastoj}) / ${planMin} min = ${kpi?.availability ?? "—"}%`);
  }
  if (planKom > 0) {
    linije.push(`Performanse (P): ${uk} / ${planKom} kom = ${kpi?.performance ?? "—"}%`);
  } else if (uk > 0) {
    linije.push(`Performanse (P): nema plana kom — 100%`);
  }
  if (uk > 0) {
    linije.push(`Kvalitet / FPY (Q): ${fp} / ${uk} kom = ${kpi?.quality ?? "—"}%`);
  }
  if (kpi?.availability != null && kpi?.performance != null && kpi?.quality != null) {
    linije.push(`OEE = ${kpi.availability}% × ${kpi.performance}% × ${kpi.quality}% = ${kpi.oee}%`);
  } else if (kpi?.oee != null) {
    linije.push(`OEE = ${kpi.oee}%`);
  }
  linije.push(
    `Ulazi: škart ${izvor?.skart ?? 0} · dorada ${izvor?.dorada ?? 0} · OK posle dorade ${izvor?.ok_nakon_dorade ?? 0} · neusaglašeno ${izvor?.neusaglaseno ?? 0}`,
  );
  return linije;
}

function dodajFormuluBlok(pdf, y, izvor, kpi) {
  if (y > 230) { pdf.addPage(); y = MARGIN + 6; }
  y = pdfSekcijaNaslov(pdf, y, "RAČUNANJE OEE (A × P × Q)");
  pdf.setFont(PDF_FONT_SR, "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...PDF_CRNI);
  for (const t of formulaTekst(izvor, kpi)) {
    if (y > 265) { pdf.addPage(); y = MARGIN + 6; }
    pdf.text(t, MARGIN, y);
    y += 4.5;
  }
  y += 4;
  return y;
}

function dodajPotpisBlok(pdf, y) {
  const H = pdf.internal.pageSize.getHeight();
  if (y > H - 40) { pdf.addPage(); y = MARGIN + 6; }
  y = pdfSekcijaNaslov(pdf, y, "POTVRDA");
  pdf.setFont(PDF_FONT_SR, "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...PDF_CRNI);
  pdf.text("Potpis šefa smene: _________________________   Datum: _______________", MARGIN, y);
  return y + 8;
}

const RED_KOLONE_SERIJA = [
  { label: "SERIJA / RN", w: 32, fmt: (r) => r._oznaka || r.serija || r.radni_nalog || "—" },
  { label: "IZ PRVE", w: 16, fmt: (r) => String(r.ispravno_iz_prve ?? 0) },
  { label: "NEUS.", w: 14, fmt: (r) => String(r.neusaglaseno ?? 0) },
  { label: "DORADA", w: 14, fmt: (r) => String(r.dorada ?? 0) },
  { label: "ŠKART", w: 12, fmt: (r) => String(r.skart ?? 0) },
  { label: "OK↳", w: 12, fmt: (r) => String(r.ok_nakon_dorade ?? 0) },
  { label: "UK.KOM", w: 14, fmt: (r) => String(r.ukupno_kom ?? 0) },
  { label: "OEE", w: 14, fmt: (r) => (r._kpi?.oee != null ? `${r._kpi.oee}%` : "—") },
  { label: "A%", w: 12, fmt: (r) => (r._kpi?.availability != null ? `${r._kpi.availability}%` : "—") },
  { label: "P%", w: 12, fmt: (r) => (r._kpi?.performance != null ? `${r._kpi.performance}%` : "—") },
  { label: "FPY", w: 12, fmt: (r) => (r._kpi?.fpy != null ? `${r._kpi.fpy}%` : "—") },
];

function redUkupnoZaTabelu(agregat, agregatKpi) {
  if (!agregat) return null;
  return {
    _oznaka: "UKUPNO",
    ispravno_iz_prve: agregat.ispravno_iz_prve,
    neusaglaseno: agregat.neusaglaseno,
    dorada: agregat.dorada,
    skart: agregat.skart,
    ok_nakon_dorade: agregat.ok_nakon_dorade,
    ukupno_kom: agregat.ukupno_kom,
    _kpi: agregatKpi,
  };
}

function filterOpis(filter) {
  const delovi = [];
  if (filter.idDeo) delovi.push(`Deo: ${filter.idDeo}`);
  if (filter.radniNalog) delovi.push(`RN: ${filter.radniNalog}`);
  if (filter.datum) delovi.push(`Datum: ${datumIsoUSr(filter.datum) || filter.datum}`);
  if (filter.smena) delovi.push(`Smena: ${filter.smena}`);
  if (filter.datumOd) delovi.push(`Od: ${filter.datumOd}`);
  if (filter.datumDo) delovi.push(`Do: ${filter.datumDo}`);
  return delovi.join(" · ") || "Svi filteri";
}

export async function kreirajOeeIzvestajPdf({
  podaci,
  modul = "merljive",
  filter = {},
} = {}) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registrujPdfFontLatin(pdf);

  const redovi = pripremiOeeRedove(podaci, modul).map((r) => ({
    ...r,
    _kpi: izracunajOeeKpi(r),
  }));
  const agregat = agregirajKpiUnos(podaci, { modul });
  const agregatKpi = agregat?.kpi || null;
  const agregatIzvor = agregat ? {
    planirano_min: agregat.planirano_min,
    zastoj_min: agregat.zastoj_min,
    planirano_kom: agregat.planirano_kom,
    ukupno_kom: agregat.ukupno_kom,
    ispravno_iz_prve: agregat.ispravno_iz_prve,
    skart: agregat.skart,
    dorada: agregat.dorada,
    ok_nakon_dorade: agregat.ok_nakon_dorade,
    neusaglaseno: agregat.neusaglaseno,
  } : null;

  const modulNaziv = modul === "merljive" ? "Merljive" : "Atributivne";
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov: "OEE izveštaj",
    podnaslov: `${modulNaziv} · ${filterOpis(filter)}`,
  });
  y += 4;

  y = pdfMetaRed(pdf, y, `Datum izveštaja: ${new Date().toLocaleString("sr-RS")}`);
  y = pdfMetaRed(pdf, y, `Broj serija / unosa: ${redovi.length}`);
  y += 4;

  if (agregatKpi && agregatIzvor) {
    y = dodajFormuluBlok(pdf, y, agregatIzvor, agregatKpi);
    y = pdfSekcijaNaslov(pdf, y, "AGREGAT ZA FILTER");
    const kpiKartice = [
      ["OEE", agregatKpi.oee != null ? `${agregatKpi.oee}%` : "—"],
      ["Dostupnost", agregatKpi.availability != null ? `${agregatKpi.availability}%` : "—"],
      ["Performanse", agregatKpi.performance != null ? `${agregatKpi.performance}%` : "—"],
      ["FPY", agregatKpi.fpy != null ? `${agregatKpi.fpy}%` : "—"],
      ["Škart", String(agregat.skart ?? 0)],
      ["Dorada", String(agregat.dorada ?? 0)],
      ["OK posle dor.", String(agregat.ok_nakon_dorade ?? 0)],
      ["Ukupno kom", String(agregat.ukupno_kom ?? 0)],
      ["Plan kom", String(agregat.planirano_kom ?? 0)],
      ["Zastoj min", String(agregat.zastoj_min ?? 0)],
    ];
    kpiKartice.forEach(([n, v], i) => {
      const x = MARGIN + (i % 3) * 60;
      const yy = y + Math.floor(i / 3) * 20;
      pdf.setFillColor(240, 244, 248);
      pdf.rect(x, yy, 56, 16, "F");
      pdf.setFontSize(7);
      pdf.setFont(PDF_FONT_SR, "normal");
      pdf.setTextColor(100, 110, 120);
      pdf.text(n, x + 3, yy + 6);
      pdf.setFontSize(11);
      pdf.setFont(PDF_FONT_SR, "bold");
      pdf.setTextColor(...PDF_CRNI);
      pdf.text(String(v), x + 3, yy + 13);
    });
    y += Math.ceil(kpiKartice.length / 3) * 20 + 6;
  }

  if (redovi.length) {
    const naslovSerija = modul === "merljive"
      ? `PREGLED PO SERIJI (${redovi.length})`
      : `PREGLED PO RN / KONTROLI (${redovi.length})`;
    y = pdfSekcijaNaslov(pdf, y, naslovSerija);
    y = pdfTabela(pdf, { y, kolone: RED_KOLONE_SERIJA, redovi, maxRedova: 30 });
    if (agregatKpi && agregat) {
      const uk = redUkupnoZaTabelu(agregat, agregatKpi);
      y = pdfMetaRed(pdf, y, "—", true);
      y = pdfTabela(pdf, { y, kolone: RED_KOLONE_SERIJA, redovi: [uk] });
    }
    y += 2;

    if (redovi.length <= 8) {
      for (const r of redovi) {
        if (y > 220) { pdf.addPage(); y = MARGIN + 6; }
        y = pdfSekcijaNaslov(pdf, y, `DETALJ — ${r._oznaka || r.serija || "serija"}`);
        y = dodajFormuluBlok(pdf, y, r, r._kpi);
      }
    }
  } else {
    y = pdfSekcijaNaslov(pdf, y, "PREGLED PO SERIJI");
    y = pdfMetaRed(pdf, y, "Nema KPI unosa za izabrani filter.");
    y += 4;
  }

  dodajPotpisBlok(pdf, y);
  dodajPdfBrendPodnozje(pdf);

  const deo = filter.idDeo || "sve";
  const datum = filter.datum || new Date().toISOString().slice(0, 10);
  const filename = `TRI-CORE_OEE_${modul}_${deo}_${datum}.pdf`;
  return { pdf, filename };
}

export async function preuzmiOeeIzvestajPdf(opts = {}) {
  const { pdf, filename } = await kreirajOeeIzvestajPdf(opts);
  pdf.save(filename);
  return filename;
}

export function buildOeePrintHtml({
  podaci,
  modul = "merljive",
  filter = {},
} = {}) {
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const redovi = pripremiOeeRedove(podaci, modul).map((r) => ({
    ...r,
    _kpi: izracunajOeeKpi(r),
  }));
  const agregat = agregirajKpiUnos(podaci, { modul });
  const kpi = agregat?.kpi;
  const izvor = agregat ? {
    planirano_min: agregat.planirano_min,
    zastoj_min: agregat.zastoj_min,
    planirano_kom: agregat.planirano_kom,
    ukupno_kom: agregat.ukupno_kom,
    ispravno_iz_prve: agregat.ispravno_iz_prve,
    skart: agregat.skart,
    dorada: agregat.dorada,
    ok_nakon_dorade: agregat.ok_nakon_dorade,
    neusaglaseno: agregat.neusaglaseno,
  } : null;

  const formulaHtml = formulaTekst(izvor, kpi).map((t) => `<div>${esc(t)}</div>`).join("");

  const serijaRows = redovi.map((r) => `
    <tr>
      <td><b>${esc(r._oznaka || r.serija || r.radni_nalog)}</b></td>
      <td>${r.ispravno_iz_prve ?? 0}</td>
      <td>${r.neusaglaseno ?? 0}</td>
      <td>${r.dorada ?? 0}</td>
      <td>${r.skart ?? 0}</td>
      <td>${r.ok_nakon_dorade ?? 0}</td>
      <td>${r.ukupno_kom ?? 0}</td>
      <td>${r._kpi?.oee != null ? `${r._kpi.oee}%` : "—"}</td>
      <td>${r._kpi?.availability != null ? `${r._kpi.availability}%` : "—"}</td>
      <td>${r._kpi?.performance != null ? `${r._kpi.performance}%` : "—"}</td>
      <td>${r._kpi?.fpy != null ? `${r._kpi.fpy}%` : "—"}</td>
    </tr>`).join("");

  const ukupnoRow = agregat && kpi ? `
    <tr style="font-weight:700;background:#e2e8f0;">
      <td>UKUPNO</td>
      <td>${agregat.ispravno_iz_prve ?? 0}</td>
      <td>${agregat.neusaglaseno ?? 0}</td>
      <td>${agregat.dorada ?? 0}</td>
      <td>${agregat.skart ?? 0}</td>
      <td>${agregat.ok_nakon_dorade ?? 0}</td>
      <td>${agregat.ukupno_kom ?? 0}</td>
      <td>${kpi.oee != null ? `${kpi.oee}%` : "—"}</td>
      <td>${kpi.availability != null ? `${kpi.availability}%` : "—"}</td>
      <td>${kpi.performance != null ? `${kpi.performance}%` : "—"}</td>
      <td>${kpi.fpy != null ? `${kpi.fpy}%` : "—"}</td>
    </tr>` : "";

  const detaljHtml = redovi.length <= 8
    ? redovi.map((r) => `
      <div class="serija-blok">
        <h3>${esc(r._oznaka || r.serija)}</h3>
        ${formulaTekst(r, r._kpi).map((t) => `<div>${esc(t)}</div>`).join("")}
      </div>`).join("")
    : "";

  const modulNaziv = modul === "merljive" ? "Merljive" : "Atributivne";
  const naslovTab = modul === "merljive" ? "Pregled po seriji" : "Pregled po RN";

  return `<!DOCTYPE html><html lang="sr"><head><meta charset="utf-8"/>
<title>OEE izveštaj</title>
<style>
  body{font-family:Segoe UI,Arial,sans-serif;font-size:11px;color:#1a1a1a;margin:24px;}
  h1{font-size:16px;color:#2c5282;}
  h2{font-size:13px;color:#2c5282;margin-top:20px;}
  h3{font-size:11px;color:#475569;margin:12px 0 4px;}
  .meta{color:#555;margin-bottom:16px;}
  .formula{background:#f0f4f8;padding:12px;border-radius:8px;margin:12px 0;line-height:1.6;}
  .serija-blok{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px;margin:10px 0;line-height:1.5;}
  .oee-big{font-size:24px;font-weight:700;color:#2c5282;text-align:center;margin:12px 0;}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:10px;}
  th,td{border:1px solid #ccc;padding:5px 6px;text-align:left;}
  th{background:#1c2333;color:#fff;font-size:9px;}
  tr:nth-child(even){background:#e8eef6;}
  @media print{body{margin:12mm;}}
</style></head><body>
<h1>OEE izveštaj — ${esc(modulNaziv)}</h1>
<div class="meta">${esc(filterOpis(filter))}<br/>Datum: ${new Date().toLocaleString("sr-RS")} · Serija/unosa: ${redovi.length}</div>
${kpi ? `<div class="formula"><b>UKUPNO ZA FILTER</b>${formulaHtml}<div class="oee-big">OEE: ${kpi.oee ?? "—"}%</div></div>` : ""}
<h2>${naslovTab}</h2>
${serijaRows ? `<table><thead><tr><th>Serija / RN</th><th>Iz prve</th><th>Neus.</th><th>Dorada</th><th>Škart</th><th>OK↳</th><th>Uk.kom</th><th>OEE</th><th>A%</th><th>P%</th><th>FPY</th></tr></thead><tbody>${serijaRows}${ukupnoRow}</tbody></table>` : "<p>Nema unosa.</p>"}
${detaljHtml}
<p style="margin-top:24px;">Potpis šefa smene: _________________________</p>
</body></html>`;
}

export async function stampajOeeIzvestaj(opts = {}) {
  const html = buildOeePrintHtml(opts);
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) throw new Error("Pregledač je blokirao prozor za štampu. Dozvolite pop-up.");
  win.document.write(html);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 500);
}
