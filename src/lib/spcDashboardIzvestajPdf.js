/**
 * PDF i štampa — Pregled / SPC Dashboard.
 * Svaki tab šalje svoj naslov + cele liste (bez skraćivanja).
 */
import { buildListaFormaHtml, otvoriListaFormaStampu } from "./listaFormaDokument.js";
import { dodajPdfBrendZaglavlje, dodajPdfBrendPodnozje } from "./pdfBrending.js";
import { registrujPdfFontLatin, PDF_FONT_SR } from "./pdfFontSr.js";
import { LAB_FPY_PCT } from "./rtyFpy.js";

const MARGIN = 14;
const PDF_CRNI = [12, 12, 12];
const PDF_BELO = [255, 255, 255];
const PDF_ALT = [232, 238, 246];

function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safePrefiks(opts) {
  if (opts.prefiksFajla) return String(opts.prefiksFajla).replace(/[^\w\-]+/g, "_");
  const n = String(opts.naslov || "").toLowerCase();
  if (n.includes("pregled")) return "Pregled";
  if (n.includes("dashboard")) return "Dashboard";
  return String(opts.modul || "Izvestaj").replace(/[^\w\-]+/g, "_") || "Izvestaj";
}


/** @param {{ headers: string[], redovi: (string|number)[][] }} sekcija */
function tabelaHtml(sekcija) {
  const th = (sekcija.headers || []).map((h) => `<th>${escHtml(h)}</th>`).join("");
  const body = (sekcija.redovi || []).map((row) =>
    `<tr>${row.map((c) => `<td>${escHtml(c)}</td>`).join("")}</tr>`,
  ).join("");
  return `<h2 style="font-size:11pt;color:#1e293b;margin:14px 0 6px;">${escHtml(sekcija.naslov || "Tabela")} (${(sekcija.redovi || []).length})</h2>
<table><thead><tr>${th}</tr></thead>
<tbody>${body || `<tr><td colspan="${(sekcija.headers || []).length || 1}">Nema stavki</td></tr>`}</tbody></table>`;
}

/**
 * @param {{
 *   naslov?: string,
 *   modul?: string,
 *   idDeo?: string,
 *   nazivDela?: string,
 *   period?: string,
 *   napomena?: string,
 *   prefiksFajla?: string,
 *   kpi?: Array<{label:string, value:string|number}>,
 *   sekcije?: Array<{naslov:string, headers:string[], redovi:(string|number)[][]}>,
 *   pareto?: Array<{naziv?:string, name?:string, count?:number, kumulativ?:number}>,
 *   poSmeni?: Array<{label?:string, s?:string, ok?:number, nok?:number, n?:number, rty?:number}>,
 * }} opts
 */
function buildPrintHtml(opts = {}) {
  const naslov = opts.naslov || "Izveštaj";
  const kpiHtml = (opts.kpi || []).length
    ? `<div style="display:flex;flex-wrap:wrap;gap:10px;margin:0 0 14px;">${(opts.kpi || []).map((k) =>
      `<div style="border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px;min-width:90px;">
        <div style="font-size:8pt;color:#64748b;text-transform:uppercase;">${escHtml(k.label)}</div>
        <strong style="font-size:14pt;">${escHtml(k.value)}</strong>
      </div>`,
    ).join("")}</div>`
    : "";

  const sekcije = [...(opts.sekcije || [])];

  if ((opts.pareto || []).length) {
    sekcije.push({
      naslov: "Top NOK / Pareto",
      headers: ["Stavka", "Broj", "Kumulativ"],
      redovi: opts.pareto.map((p) => [
        p.naziv || p.name || "—",
        p.count ?? "—",
        p.kumulativ != null ? `${p.kumulativ}%` : "—",
      ]),
    });
  }

  if ((opts.poSmeni || []).length) {
    sekcije.push({
      naslov: "Po smeni",
      headers: ["Smena", "N", "OK", "NOK", LAB_FPY_PCT],
      redovi: opts.poSmeni.map((s) => [
        s.label || s.s || "—",
        s.n ?? "—",
        s.ok ?? "—",
        s.nok ?? "—",
        s.rty != null ? `${s.rty}%` : "—",
      ]),
    });
  }

  const sekcijeHtml = sekcije.map(tabelaHtml).join("");
  const tabelaHtmlBody = `${kpiHtml}${sekcijeHtml || "<p>Nema podataka za izvoz.</p>"}`;

  return buildListaFormaHtml({
    naslov,
    podnaslov: opts.period ? `Period: ${opts.period}` : undefined,
    meta: [
      { label: "Modul", value: opts.modul },
      { label: "Deo", value: opts.idDeo },
      { label: "Naziv dela", value: opts.nazivDela },
    ].filter((m) => m.value),
    sekcijaNaslov: "Sadržaj izveštaja",
    tabelaHtml: tabelaHtmlBody,
    napomena: opts.napomena,
  });
}

async function kreirajPdf(opts = {}) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registrujPdfFontLatin(pdf);

  const naslov = opts.naslov || "Izveštaj";
  const meta = [
    opts.modul || null,
    opts.idDeo ? `Deo ${opts.idDeo}` : null,
    opts.nazivDela || null,
    opts.period ? `Period ${opts.period}` : null,
    new Date().toLocaleString("sr-RS"),
  ].filter(Boolean).join(" · ");

  let y = await dodajPdfBrendZaglavlje(pdf, { naslov, podnaslov: meta });
  y += 2;

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;

  const ensure = (need) => {
    if (y + need > pageH - 16) {
      pdf.addPage();
      y = MARGIN + 8;
    }
  };

  if (opts.napomena) {
    pdf.setFont(PDF_FONT_SR, "italic");
    pdf.setFontSize(8);
    pdf.setTextColor(80, 90, 100);
    const lines = pdf.splitTextToSize(opts.napomena, contentW);
    lines.forEach((ln) => { ensure(4); pdf.text(ln, MARGIN, y); y += 4; });
    pdf.setTextColor(...PDF_CRNI);
    y += 2;
  }

  const kpi = opts.kpi || [];
  if (kpi.length) {
    ensure(10);
    pdf.setFont(PDF_FONT_SR, "bold");
    pdf.setFontSize(10);
    pdf.text("KPI", MARGIN, y);
    y += 6;
    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(9);
    kpi.forEach((k) => {
      ensure(5);
      pdf.text(`${k.label}: ${k.value}`, MARGIN, y);
      y += 5;
    });
    y += 3;
  }

  const drawTable = (title, headers, rows, widths) => {
    if (!rows.length) return;
    ensure(16);
    pdf.setFont(PDF_FONT_SR, "bold");
    pdf.setFontSize(10);
    pdf.text(`${title} (${rows.length})`, MARGIN, y);
    y += 5;
    const headerH = 6.5;
    const lineH = 3.8;
    const tabelaW = Math.min(widths.reduce((a, b) => a + b, 0), contentW);

    const drawHeader = () => {
      pdf.setFillColor(28, 35, 51);
      pdf.rect(MARGIN, y - 3.5, tabelaW, headerH, "F");
      pdf.setTextColor(...PDF_BELO);
      pdf.setFont(PDF_FONT_SR, "bold");
      pdf.setFontSize(7);
      let cx = MARGIN + 1;
      headers.forEach((h, i) => { pdf.text(h, cx, y); cx += widths[i]; });
      pdf.setTextColor(...PDF_CRNI);
      y += headerH;
    };

    drawHeader();
    rows.forEach((cells, ri) => {
      const split = cells.map((c, i) => pdf.splitTextToSize(String(c), Math.max(widths[i] - 2, 8)));
      const lines = Math.max(...split.map((s) => s.length), 1);
      const rowH = lines * lineH + 2;
      if (y + rowH > pageH - 16) {
        pdf.addPage();
        y = MARGIN + 8;
        drawHeader();
      }
      if (ri % 2 === 0) {
        pdf.setFillColor(...PDF_ALT);
        pdf.rect(MARGIN, y - 2.8, tabelaW, rowH, "F");
      }
      pdf.setFont(PDF_FONT_SR, "normal");
      pdf.setFontSize(7);
      let cx = MARGIN + 1;
      split.forEach((arr, i) => {
        arr.forEach((ln, li) => pdf.text(ln, cx, y + li * lineH));
        cx += widths[i];
      });
      y += rowH;
    });
    y += 4;
  };

  const sekcije = [...(opts.sekcije || [])];
  if ((opts.pareto || []).length) {
    sekcije.push({
      naslov: "Top NOK / Pareto",
      headers: ["Stavka", "Broj", "Kumulativ"],
      widths: [100, 30, 35],
      redovi: opts.pareto.map((p) => [
        p.naziv || p.name || "—",
        p.count ?? "—",
        p.kumulativ != null ? `${p.kumulativ}%` : "—",
      ]),
    });
  }
  if ((opts.poSmeni || []).length) {
    sekcije.push({
      naslov: "Po smeni",
      headers: ["Smena", "N", "OK", "NOK", LAB_FPY_PCT],
      widths: [40, 25, 30, 30, 30],
      redovi: opts.poSmeni.map((s) => [
        s.label || s.s || "—",
        s.n ?? "—",
        s.ok ?? "—",
        s.nok ?? "—",
        s.rty != null ? `${s.rty}%` : "—",
      ]),
    });
  }

  sekcije.forEach((s) => {
    const cols = s.headers?.length || 1;
    const widths = s.widths || Array(cols).fill(Math.floor(contentW / cols));
    drawTable(s.naslov || "Tabela", s.headers || [], s.redovi || [], widths);
  });

  if (!kpi.length && !sekcije.length) {
    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(10);
    pdf.text("Nema podataka za izvoz.", MARGIN, y + 4);
  }

  dodajPdfBrendPodnozje(pdf);
  const datum = new Date().toISOString().slice(0, 10);
  const tag = String(opts.idDeo || opts.modul || "sve").replace(/[^\w\-]+/g, "_");
  return { pdf, filename: `TRI-CORE_${safePrefiks(opts)}_${tag}_${datum}.pdf` };
}

export async function preuzmiSpcDashboardPdf(opts = {}) {
  const { pdf, filename } = await kreirajPdf(opts);
  pdf.save(filename);
  return filename;
}

export function stampajSpcDashboard(opts = {}) {
  otvoriListaFormaStampu(buildPrintHtml(opts));
}

/** Payload iz atributivnog SPC dashboarda — cela lista sa ekrana. */
export function payloadDashboardAtributivne({
  idDeo, period, heroPBar, heroDpmo, heroPpm, heroFpy,
  ukN, ukNOK, paretoData, poSmeni, heroOpseg,
} = {}) {
  const periodLabel = period === "1" ? "danas" : `${period} dana`;
  return {
    modul: "atributivne",
    naslov: "Dashboard — atributivne",
    prefiksFajla: "Dashboard",
    idDeo: idDeo || "",
    period: periodLabel,
    napomena: heroOpseg || undefined,
    kpi: [
      { label: "p̄", value: heroPBar != null ? Number(heroPBar).toFixed(4) : "—" },
      { label: LAB_FPY_PCT, value: heroFpy != null ? `${heroFpy}%` : "—" },
      { label: "DPMO", value: heroDpmo ?? "—" },
      { label: "PPM", value: heroPpm ?? "—" },
      { label: "N / NOK", value: `${ukN ?? "—"} / ${ukNOK ?? "—"}` },
    ],
    pareto: (paretoData || []).map((p) => ({
      naziv: p.naziv || p.name,
      count: p.count,
      kumulativ: p.kumulativ,
    })),
    poSmeni: (poSmeni || []).map((s) => ({
      label: s.label || s.s,
      n: s.n,
      ok: s.ok,
      nok: s.nok,
      rty: s.n > 0 ? +((s.ok / s.n) * 100).toFixed(1) : null,
    })),
  };
}

/** Payload iz merljivog SPC dashboarda — cela lista sa ekrana. */
export function payloadDashboardMerljive({
  idDeo, nazivDela, period, agregat, cpk, sigmaNivo, paretoData, poSmeni, vanX, vanR,
} = {}) {
  const periodLabel = period === "1" ? "danas" : `${period} dana`;
  return {
    modul: "merljive",
    naslov: "Dashboard — merljive",
    prefiksFajla: "Dashboard",
    idDeo: idDeo || "",
    nazivDela: nazivDela || "",
    period: periodLabel,
    kpi: [
      { label: LAB_FPY_PCT, value: agregat?.rty != null ? `${agregat.rty}%` : "—" },
      { label: "DPMO", value: agregat?.dpmo ?? "—" },
      { label: "p %", value: agregat?.p != null ? `${agregat.p}%` : "—" },
      { label: "Cp / Cpk", value: cpk ? `${cpk.cp ?? "—"} / ${cpk.cpk ?? "—"}` : "—" },
      { label: "σ nivo", value: sigmaNivo ?? "—" },
      { label: "N / NOK", value: `${agregat?.n ?? "—"} / ${agregat?.nok ?? "—"}` },
      { label: "Van X̄ / R", value: `${vanX ?? 0} / ${vanR ?? 0}` },
    ],
    pareto: (paretoData || []).map((p) => ({
      naziv: p.naziv || p.name || p.pozicija,
      count: p.count ?? p.nok,
      kumulativ: p.kumulativ ?? p.kum,
    })),
    poSmeni: (poSmeni || []).map((s) => ({
      label: s.label || s.s || (s.smena != null ? `Smena ${s.smena}` : "—"),
      n: s.n ?? s.ukupno,
      ok: s.ok,
      nok: s.nok,
      rty: s.rty ?? (s.n > 0 && s.ok != null ? +((s.ok / s.n) * 100).toFixed(1) : null),
    })),
  };
}

/** Payload tab Pregled — ceo pregled (ne dashboard), sve liste. */
export function payloadPregledProizvodnje(podaci, {
  modul = "",
  idDeo = "",
  period = "7",
  linija = "",
  smena = "",
} = {}) {
  if (!podaci) return null;
  const periodLabel = String(period) === "1" ? "danas" : `${period} dana`;
  const filterMeta = [
    idDeo ? `Deo ${idDeo}` : null,
    linija ? `Linija ${linija}` : null,
    smena ? `Smena ${smena}` : null,
  ].filter(Boolean).join(" · ");

  const topNok = podaci.topNok || [];
  const ukNok = topNok.reduce((s, p) => s + (Number(p.count) || 0), 0);
  let kum = 0;
  const pareto = topNok.map((p) => {
    kum += Number(p.count) || 0;
    return {
      naziv: `${p.izvor === "merljive" ? "MER" : "ATR"} · ${p.naziv || "—"}`,
      count: p.count,
      kumulativ: ukNok > 0 ? +((kum / ukNok) * 100).toFixed(1) : null,
    };
  });

  const sekcije = [];

  const alarmi = podaci.alarmi || [];
  if (alarmi.length) {
    sekcije.push({
      naslov: "Alarmi",
      headers: ["Nivo", "Naslov", "Opis"],
      widths: [22, 50, 100],
      redovi: alarmi.map((a) => [
        a.nivo || "—",
        a.naslov || "—",
        a.opis || "—",
      ]),
    });
  }

  const esk = podaci.eskalacije?.lista || [];
  if (esk.length) {
    sekcije.push({
      naslov: "Eskalacije",
      headers: ["Deo", "Prioritet", "Status", "Opis", "Rok"],
      widths: [28, 24, 24, 80, 26],
      redovi: esk.map((e) => [
        e.id_deo || "—",
        e.prioritet || "—",
        e.status || "—",
        e.opis || "—",
        e.rok || "—",
      ]),
    });
  }

  const merila = podaci.merila?.lista || [];
  if (merila.length) {
    sekcije.push({
      naslov: "Merila — upozorenja",
      headers: ["Naziv", "Status", "Dani"],
      widths: [90, 40, 30],
      redovi: merila.map((m) => [
        m.naziv || "—",
        m.kalStatus || "—",
        m.dani ?? "—",
      ]),
    });
  }

  const faze = podaci.fazeKvaliteta || [];
  if (faze.length) {
    sekcije.push({
      naslov: "Faze kvaliteta",
      headers: ["Faza", "FPY %"],
      widths: [100, 40],
      redovi: faze.map((f) => [f.naziv || "—", f.fpy ?? "—"]),
    });
  }

  return {
    modul: modul || "pregled",
    naslov: "Pregled",
    prefiksFajla: "Pregled",
    idDeo: idDeo || podaci.idDeoFilter || "",
    period: periodLabel,
    napomena: filterMeta || undefined,
    kpi: [
      { label: "FPY ATR", value: `${podaci.attr?.fpy ?? podaci.attr?.rty ?? "—"}%` },
      { label: "FPY MER", value: `${podaci.merljive?.fpy ?? podaci.merljive?.rty ?? "—"}%` },
      { label: "RTY pogon", value: podaci.rtyPogon != null ? `${podaci.rtyPogon}%` : "—" },
      { label: "OEE", value: podaci.oee?.prosek != null ? `${podaci.oee.prosek}%` : "—" },
      { label: "Eskalacije otv.", value: podaci.eskalacije?.otvorene ?? "—" },
      { label: "Merila upoz.", value: podaci.merila?.upozorenja ?? "—" },
      { label: "ATR N / NOK", value: `${podaci.attr?.ukN ?? "—"} / ${podaci.attr?.ukNOK ?? "—"}` },
      { label: "MER N / NOK", value: `${podaci.merljive?.merenja ?? "—"} / ${podaci.merljive?.nok ?? "—"}` },
      { label: "Aktivni nalozi", value: podaci.aktivniNalozi ?? "—" },
      { label: "Alarmi", value: alarmi.length },
    ],
    pareto,
    sekcije,
  };
}
