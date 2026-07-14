/** Trasabilitet — merenja, KPI, log za ID delo / sesiju / komad (VIN-lot). */

import { dodajPdfBrendZaglavlje, dodajPdfBrendPodnozje, PDF_BREND } from "./pdfBrending.js";
import { registrujPdfFontLatin, PDF_FONT_SR } from "./pdfFontSr.js";

const PDF_CRNI = [12, 12, 12];
const PDF_BELO = [255, 255, 255];
const PDF_ALT = [232, 238, 246];
const PDF_GRANICA = [120, 130, 145];

function formatPdfVreme(ts) {
  if (!ts) return "—";
  return String(ts).slice(0, 16).replace("T", " ");
}

/** Naslov sekcije — plava traka, beli tekst. */
function pdfSekcijaNaslov(pdf, margin, y, tekst) {
  const w = pdf.internal.pageSize.getWidth() - margin * 2;
  pdf.setFillColor(...PDF_BREND.plava);
  pdf.rect(margin, y, w, 7, "F");
  pdf.setTextColor(...PDF_BELO);
  pdf.setFont(PDF_FONT_SR, "bold");
  pdf.setFontSize(9);
  pdf.text(tekst, margin + 2, y + 5);
  pdf.setTextColor(...PDF_CRNI);
  return y + 10;
}

/** Meta red — tamniji, bold. */
function pdfMetaRed(pdf, margin, y, tekst, bold = false) {
  pdf.setFont(PDF_FONT_SR, bold ? "bold" : "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...PDF_CRNI);
  pdf.text(tekst, margin, y);
  return y + 5;
}

/**
 * Tabela sa zaglavljem (tamna traka) i alternirajućim redovima.
 * @returns {number} nova Y pozicija
 */
function pdfTabela(pdf, { margin, y, kolone, redovi, maxRedova = null }) {
  const pageW = pdf.internal.pageSize.getWidth();
  const tabelaW = pageW - margin * 2;
  const fontSize = 7;
  const lineH = 4.2;
  const headerH = 7;
  const lista = maxRedova ? redovi.slice(0, maxRedova) : redovi;

  const drawHeader = (atY) => {
    pdf.setFillColor(...PDF_BREND.tamna);
    pdf.rect(margin, atY - 4.5, tabelaW, headerH, "F");
    pdf.setTextColor(...PDF_BELO);
    pdf.setFont(PDF_FONT_SR, "bold");
    pdf.setFontSize(7);
    let cx = margin + 1.5;
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

    if (y + rowH > 276) {
      pdf.addPage();
      y = margin + 6;
      y = drawHeader(y);
    }

    if (ri % 2 === 0) {
      pdf.setFillColor(...PDF_ALT);
      pdf.rect(margin, y - 3.2, tabelaW, rowH, "F");
    }

    pdf.setDrawColor(...PDF_GRANICA);
    pdf.setLineWidth(0.15);
    pdf.line(margin, y - 3.2, margin + tabelaW, y - 3.2);

    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(fontSize);
    let cx = margin + 1.5;
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
  pdf.line(margin, y - 1, margin + tabelaW, y - 1);
  return y + 4;
}

const LANAC_KOLONE = [
  { label: "VREME", w: 26, fmt: (d) => formatPdfVreme(d.ts) },
  { label: "TIP", w: 17, fmt: (d) => d.tip || "—" },
  { label: "RN", w: 20, fmt: (d) => d.rn || "—" },
  { label: "LOT/VIN", w: 22, fmt: (d) => d.lot || "—" },
  { label: "OPERACIJA", w: 30, fmt: (d) => d.operacija || "—" },
  { label: "ALAT", w: 22, fmt: (d) => d.alat || "—" },
  { label: "OPERATER", w: 22, fmt: (d) => d.operater || "—" },
  { label: "DETALJ", w: 23, fmt: (d) => d.detalj || "—" },
];

const MERENJA_KOLONE = [
  { label: "DATUM", w: 22, fmt: (m) => m.datum || "—" },
  { label: "SM", w: 10, fmt: (m) => (m.smena != null ? `S${m.smena}` : "—") },
  { label: "POZICIJA", w: 28, fmt: (m) => m.pozicija || "—" },
  { label: "VREDNOST", w: 22, fmt: (m) => m.vrednost_raw || "—" },
  { label: "STATUS", w: 16, fmt: (m) => m.status || "—" },
  { label: "KONTROLOR", w: 30, fmt: (m) => m.kontrolor || m.operater || "—" },
  { label: "RN/SES", w: 54, fmt: (m) => m.radni_nalog || m.sesija_id || "—" },
];

const KPI_KOLONE = [
  { label: "DATUM", w: 24, fmt: (k) => k.datum || "—" },
  { label: "SM", w: 10, fmt: (k) => (k.smena != null ? `S${k.smena}` : "—") },
  { label: "SERIJA", w: 18, fmt: (k) => k.serija || "—" },
  { label: "ŠKART", w: 16, fmt: (k) => String(k.skart ?? k.skart_kom ?? 0) },
  { label: "DORADA", w: 16, fmt: (k) => String(k.dorada ?? 0) },
  { label: "UKUPNO", w: 18, fmt: (k) => String(k.ukupno_kom ?? "—") },
  { label: "RN", w: 80, fmt: (k) => k.radni_nalog || "—" },
];

const LOG_KOLONE = [
  { label: "DATUM", w: 24, fmt: (l) => l.datum || "—" },
  { label: "STATUS", w: 18, fmt: (l) => l.status || "—" },
  { label: "OK", w: 14, fmt: (l) => String(l.ok_kolicina ?? 0) },
  { label: "NOK", w: 14, fmt: (l) => String(l.nok_kolicina ?? 0) },
  { label: "GREŠKA", w: 50, fmt: (l) => l.greska_naziv || "—" },
  { label: "RN", w: 62, fmt: (l) => l.radni_nalog || l.sesija_id || "—" },
];

const NCR_KOLONE = [
  { label: "BROJ NCR", w: 30, fmt: (n) => n.broj_ncr || "—" },
  { label: "STATUS", w: 20, fmt: (n) => n.status || "—" },
  { label: "VIN", w: 26, fmt: (n) => n.vin || "—" },
  { label: "OPIS", w: 106, fmt: (n) => (n.opis || "").slice(0, 120) },
];

/** Lot/VIN na merenjima_varijabilna — nema kolone serija/vin (koristi sesija_id, RN). */
function lotIzMerenja(m) {
  return m.sesija_id || m.radni_nalog || m.sifra_merenja || null;
}

function lotIzMomenta(mo) {
  return mo.vin || null;
}

/** Supabase .or() filter za lot/VIN pretragu. */
function orIlikeFilter(vinQ, kolone) {
  const q = String(vinQ || "").trim();
  if (!q) return null;
  const esc = q.replace(/[%_]/g, "");
  return kolone.map((k) => `${k}.ilike.%${esc}%`).join(",");
}

/** Jedinstveni hronološki lanac događaja po komadu (RN / lot / operacija / alat / operater). */
export function sagrupisiLanacProizvodnje({ merenja = [], kpi = [], log = [], momenti = [], alarmi = [], ncr = [] }) {
  const dogadjaji = [];

  for (const m of merenja) {
    dogadjaji.push({
      ts: m.created_at || m.datum,
      tip: "Merenje",
      rn: m.radni_nalog || "—",
      lot: lotIzMerenja(m) || "—",
      operacija: `Dim ${m.pozicija || m.sifra_merenja || "—"}`,
      alat: m.merni_instrument || (m.merilo_id ? `Merilo ${m.merilo_id}` : "—"),
      operater: m.kontrolor || m.operater || "—",
      detalj: `${m.vrednost_raw} · ${m.status}`,
      sesija: m.sesija_id || null,
      vin: lotIzMerenja(m),
    });
  }
  for (const k of kpi) {
    dogadjaji.push({
      ts: k.created_at || k.datum,
      tip: "KPI",
      rn: k.radni_nalog || "—",
      lot: k.serija || "—",
      operacija: "KPI unos",
      alat: "—",
      operater: k.kontrolor || "—",
      detalj: `OEE ${k.oee_pct ?? "—"}% · škart ${k.skart_kom || 0}`,
      sesija: k.sesija_id || null,
      vin: k.serija || null,
    });
  }
  for (const l of log) {
    dogadjaji.push({
      ts: l.created_at || l.datum,
      tip: "Atributivno",
      rn: l.radni_nalog || "—",
      lot: l.radni_nalog || l.sesija_id || "—",
      operacija: l.greska_naziv || "Kontrola",
      alat: "—",
      operater: l.kontrolor || "—",
      detalj: `${l.status} OK ${l.ok_kolicina} NOK ${l.nok_kolicina}`,
      sesija: l.sesija_id || null,
      vin: l.sesija_id || null,
    });
  }
  for (const mo of momenti) {
    dogadjaji.push({
      ts: mo.created_at || mo.datum,
      tip: "Moment",
      rn: mo.radni_nalog || "—",
      lot: lotIzMomenta(mo) || "—",
      operacija: `Korak ${mo.korak_redosled}`,
      alat: mo.tool_kod ? `Ključ ${mo.tool_kod}` : "Moment ključ",
      operater: mo.operater_id ? `#${mo.operater_id}` : "—",
      detalj: `${mo.ostvareno_nm} Nm · ${mo.status}`,
      sesija: null,
      vin: mo.vin || null,
    });
  }
  for (const a of alarmi) {
    dogadjaji.push({
      ts: a.created_at || a.datum,
      tip: "SPC alarm",
      rn: "—",
      lot: "—",
      operacija: a.tip_karte || "SPC",
      alat: "—",
      operater: "—",
      detalj: `${a.pravilo} · ${a.status}`,
      sesija: null,
      vin: null,
    });
  }
  for (const n of ncr) {
    dogadjaji.push({
      ts: n.created_at || n.datum,
      tip: "NCR",
      rn: n.radni_nalog || "—",
      lot: n.vin || n.lot || "—",
      operacija: n.broj_ncr,
      alat: "—",
      operater: "—",
      detalj: `${n.status} · ${(n.opis || "").slice(0, 80)}`,
      sesija: null,
      vin: n.vin || null,
    });
  }

  return dogadjaji
    .filter((d) => d.ts)
    .sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
}

/** Grupiše lanac po komadu (VIN / lot / serija). */
export function grupisiLanacPoKomadu(lanac = []) {
  const poKomadu = new Map();
  for (const d of lanac) {
    const kljuc = d.vin || (d.lot !== "—" ? d.lot : null) || d.sesija || "bez_komada";
    if (!poKomadu.has(kljuc)) {
      poKomadu.set(kljuc, { kljuc, vin: d.vin || null, lot: d.lot, dogadjaji: [] });
    }
    poKomadu.get(kljuc).dogadjaji.push(d);
  }
  return [...poKomadu.values()].sort((a, b) => {
    const ta = a.dogadjaji[0]?.ts || "";
    const tb = b.dogadjaji[0]?.ts || "";
    return String(ta).localeCompare(String(tb));
  });
}

export function filtrirajLanacPoKomadu(lanac, vinLot) {
  const q = String(vinLot || "").trim().toUpperCase();
  if (!q) return lanac;
  return lanac.filter((d) =>
    String(d.vin || "").toUpperCase().includes(q)
    || String(d.lot || "").toUpperCase().includes(q)
    || String(d.rn || "").toUpperCase().includes(q),
  );
}

export async function ucitajTrasabilitet(supabase, { idDeo, sesijaId, datumOd, datumDo, vinLot }) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return { merenja: [], kpi: [], log: [], momenti: [], alarmi: [], ncr: [], greska: "Unesite ID dela" };

  const vinQ = String(vinLot || "").trim().toUpperCase();

  let qMer = supabase.from("merenja_varijabilna")
    .select("datum,smena,radni_nalog,sesija_id,pozicija,vrednost_raw,status,sifra_merenja,kontrolor,operater,merni_instrument,created_at")
    .eq("id_deo", id)
    .order("created_at", { ascending: true });
  if (sesijaId) qMer = qMer.eq("sesija_id", sesijaId);
  if (datumOd) qMer = qMer.gte("datum", datumOd);
  if (datumDo) qMer = qMer.lte("datum", datumDo);
  const merOr = orIlikeFilter(vinQ, ["sesija_id", "radni_nalog"]);
  if (merOr) qMer = qMer.or(merOr);

  let qKpi = supabase.from("kpi_unos")
    .select("*")
    .eq("id_deo", id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (sesijaId) qKpi = qKpi.eq("sesija_id", sesijaId);
  if (datumOd) qKpi = qKpi.gte("datum", datumOd);
  if (datumDo) qKpi = qKpi.lte("datum", datumDo);
  const kpiOr = orIlikeFilter(vinQ, ["serija", "sesija_id", "radni_nalog"]);
  if (kpiOr) qKpi = qKpi.or(kpiOr);

  let qLog = supabase.from("kontrolni_log")
    .select("datum,smena,status,ok_kolicina,nok_kolicina,id_deo,naziv_dela,greska_naziv,radni_nalog,kontrolor,created_at,sesija_id")
    .eq("id_deo", id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (sesijaId) qLog = qLog.eq("sesija_id", sesijaId);
  if (datumOd) qLog = qLog.gte("datum", datumOd);
  if (datumDo) qLog = qLog.lte("datum", datumDo);
  const logOr = orIlikeFilter(vinQ, ["sesija_id", "radni_nalog"]);
  if (logOr) qLog = qLog.or(logOr);

  let qMom = supabase.from("moment_protokol")
    .select("datum,smena,korak_redosled,poz_br,ostvareno_nm,ostvareno_ugao,status,radni_nalog,linija,izvor,error_kod,tool_kod,vin,operater_id,created_at")
    .eq("id_deo", id)
    .order("created_at", { ascending: false })
    .limit(80);
  if (datumOd) qMom = qMom.gte("datum", datumOd);
  if (datumDo) qMom = qMom.lte("datum", datumDo);
  if (vinQ) qMom = qMom.ilike("vin", `%${vinQ}%`);
  let qAlarm = supabase.from("spc_alarmi")
    .select("datum,tip_karte,pravilo,vrednost,ucl,lcl,status,created_at")
    .eq("id_deo", id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (datumOd) qAlarm = qAlarm.gte("datum", datumOd);
  if (datumDo) qAlarm = qAlarm.lte("datum", datumDo);

  let qNcr = supabase.from("ncr_capa")
    .select("broj_ncr,status,opis,uzrok,radni_nalog,vin,created_at,rok")
    .eq("id_deo", id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (vinQ) qNcr = qNcr.ilike("vin", `%${vinQ}%`);

  const [merRes, kpiRes, logRes, momRes, alarmRes, ncrRes] = await Promise.all([
    qMer, qKpi, qLog, qMom, qAlarm, qNcr,
  ]);

  if (merRes.error) return { greska: merRes.error.message };

  const lanacSirovi = sagrupisiLanacProizvodnje({
    merenja: merRes.data || [],
    kpi: kpiRes.data || [],
    log: logRes.data || [],
    momenti: momRes.error ? [] : (momRes.data || []),
    alarmi: alarmRes.error ? [] : (alarmRes.data || []),
    ncr: ncrRes.error ? [] : (ncrRes.data || []),
  });
  const lanac = filtrirajLanacPoKomadu(lanacSirovi, vinQ);
  const poKomadu = grupisiLanacPoKomadu(lanacSirovi);

  return {
    idDeo: id,
    sesijaId: sesijaId || null,
    vinLot: vinQ || null,
    lanac,
    lanacSirovi,
    poKomadu,
    merenja: merRes.data || [],
    kpi: kpiRes.data || [],
    log: logRes.data || [],
    momenti: momRes.error ? [] : (momRes.data || []),
    alarmi: alarmRes.error ? [] : (alarmRes.data || []),
    ncr: ncrRes.error ? [] : (ncrRes.data || []),
    momentiGreska: momRes.error?.message || null,
    alarmiGreska: alarmRes.error?.message || null,
    ncrGreska: ncrRes.error?.message || null,
  };
}

/** Pronađi ID delo po lot/VIN ako nije prosleđen. */
async function pronadjiIdDeoPoLotu(supabase, lotQ) {
  const merOr = orIlikeFilter(lotQ, ["sesija_id", "radni_nalog"]);
  const kpiOr = orIlikeFilter(lotQ, ["serija", "sesija_id", "radni_nalog"]);
  const probes = [
    merOr && supabase.from("merenja_varijabilna").select("id_deo").or(merOr).limit(1),
    kpiOr && supabase.from("kpi_unos").select("id_deo").or(kpiOr).limit(1),
    supabase.from("moment_protokol").select("id_deo").ilike("vin", `%${lotQ}%`).limit(1),
    supabase.from("ncr_capa").select("id_deo").ilike("vin", `%${lotQ}%`).limit(1),
  ].filter(Boolean);
  for (const p of probes) {
    const { data } = await p;
    const deo = data?.[0]?.id_deo;
    if (deo) return String(deo).toUpperCase();
  }
  return null;
}

/** Trasabilitet fokus na jedan lot/VIN (ISO audit). */
export async function ucitajTrasabilitetPoLotu(supabase, { lot, idDeo = null }) {
  const lotQ = String(lot || "").trim().toUpperCase();
  if (!lotQ) return { greska: "Unesite lot ili VIN" };

  let deo = String(idDeo || "").trim().toUpperCase();
  if (!deo) {
    deo = await pronadjiIdDeoPoLotu(supabase, lotQ);
  }
  if (!deo) {
    return { greska: `Nije pronađen deo za lot/VIN: ${lotQ}` };
  }

  const pod = await ucitajTrasabilitet(supabase, { idDeo: deo, vinLot: lotQ });
  if (pod.greska) return pod;

  const komad = (pod.poKomadu || []).find((k) =>
    String(k.vin || "").toUpperCase().includes(lotQ)
    || String(k.lot || "").toUpperCase().includes(lotQ),
  ) || pod.poKomadu?.[0] || null;

  return { ...pod, lot: lotQ, komad };
}

function safeLotIme(lot) {
  return String(lot || "lot").replace(/[^\w.-]+/g, "_").slice(0, 40);
}

async function kreirajTrasabilitetPdf(podaci, { naslov, podnaslov, fokusLanac = null, fokusKomad = null } = {}) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  await registrujPdfFontLatin(pdf);
  let y = await dodajPdfBrendZaglavlje(pdf, { naslov, podnaslov });
  y += 6;

  y = pdfMetaRed(pdf, margin, y, `Datum izveštaja: ${new Date().toLocaleString("sr-RS")}`);
  y = pdfMetaRed(pdf, margin, y, `ID delo: ${podaci.idDeo}`, true);
  if (podaci.lot || podaci.vinLot) {
    y = pdfMetaRed(pdf, margin, y, `Lot/VIN: ${podaci.lot || podaci.vinLot}`, true);
  }
  y += 4;

  const lanac = fokusLanac || podaci.lanac || [];
  const komad = fokusKomad;

  if (komad) {
    const naslovK = komad.vin ? `VIN ${komad.vin}` : (komad.lot !== "—" ? `Lot ${komad.lot}` : komad.kljuc);
    y = pdfSekcijaNaslov(pdf, margin, y, `ISO trasabilitet — komad: ${naslovK} (${komad.dogadjaji.length} događaja)`);
    y = pdfTabela(pdf, { margin, y, kolone: LANAC_KOLONE, redovi: komad.dogadjaji });
    y += 2;
  }

  if (lanac.length && !komad) {
    y = pdfSekcijaNaslov(pdf, margin, y, `Lanac proizvodnje (${lanac.length} događaja)`);
    y = pdfTabela(pdf, { margin, y, kolone: LANAC_KOLONE, redovi: lanac, maxRedova: 80 });
    if (lanac.length > 80) y = pdfMetaRed(pdf, margin, y, `… +${lanac.length - 80} događaja u bazi`);
    y += 2;
  }

  const ncrLot = (podaci.ncr || []).filter((n) =>
    !podaci.lot || String(n.vin || "").toUpperCase().includes(podaci.lot),
  );
  if (ncrLot.length) {
    y = pdfSekcijaNaslov(pdf, margin, y, `NCR / CAPA za lot (${ncrLot.length})`);
    y = pdfTabela(pdf, { margin, y, kolone: NCR_KOLONE, redovi: ncrLot });
    y += 2;
  }

  if (y > 250) { pdf.addPage(); y = margin + 6; }
  pdf.setFont(PDF_FONT_SR, "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...PDF_BREND.plava);
  pdf.text("— Potvrda za audit —", margin, y);
  y += 5;
  pdf.setFont(PDF_FONT_SR, "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...PDF_CRNI);
  pdf.text("Generisano iz TRI-CORE QC · trasabilitet + auto audit log", margin, y);
  dodajPdfBrendPodnozje(pdf);
  return pdf;
}

/** PDF trasabilitet po jednom lotu/VIN (ISO). */
export async function preuzmiTrasabilitetPdfPoLotu(podaci, lot) {
  const lotQ = String(lot || podaci.lot || podaci.vinLot || "").trim().toUpperCase();
  const komad = podaci.komad || (podaci.poKomadu || []).find((k) =>
    String(k.vin || "").toUpperCase().includes(lotQ)
    || String(k.lot || "").toUpperCase().includes(lotQ),
  );
  const lanac = komad?.dogadjaji?.length
    ? komad.dogadjaji
    : filtrirajLanacPoKomadu(podaci.lanac || [], lotQ);

  const pdf = await kreirajTrasabilitetPdf(
    { ...podaci, lot: lotQ },
    {
      naslov: "ISO — Trasabilitet po lotu",
      podnaslov: `Lot/VIN ${lotQ} · Deo ${podaci.idDeo}`,
      fokusLanac: lanac,
      fokusKomad: komad,
    },
  );
  pdf.save(`ISO_trasabilitet_${safeLotIme(lotQ)}_${podaci.idDeo}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function generisiTrasabilitetPdfBufferPoLotu(podaci, lot) {
  const lotQ = String(lot || podaci.lot || "").trim().toUpperCase();
  const komad = podaci.komad || (podaci.poKomadu || []).find((k) =>
    String(k.vin || "").toUpperCase().includes(lotQ)
    || String(k.lot || "").toUpperCase().includes(lotQ),
  );
  const lanac = komad?.dogadjaji?.length
    ? komad.dogadjaji
    : filtrirajLanacPoKomadu(podaci.lanac || [], lotQ);
  const pdf = await kreirajTrasabilitetPdf(
    { ...podaci, lot: lotQ },
    {
      naslov: "ISO — Trasabilitet po lotu",
      podnaslov: `Lot/VIN ${lotQ} · Deo ${podaci.idDeo}`,
      fokusLanac: lanac,
      fokusKomad: komad,
    },
  );
  const buffer = Buffer.from(pdf.output("arraybuffer"));
  const filename = `ISO_trasabilitet_${safeLotIme(lotQ)}_${podaci.idDeo}.pdf`;
  return { buffer, filename };
}

/** Ograničen pregled za Modul 1 atributivne — samo kontrolni log (bez PDF / merljivih). */
export async function ucitajTrasabilitetLinijaAtr(supabase, { idDeo, smena, limit = 25 }) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return { log: [], greska: "Unesite ID dela" };

  const od = new Date();
  od.setDate(od.getDate() - 7);
  const datumOd = od.toISOString().split("T")[0];

  let q = supabase.from("kontrolni_log")
    .select("datum,smena,status,ok_kolicina,nok_kolicina,greska_naziv,podkategorija,created_at")
    .eq("id_deo", id)
    .gte("datum", datumOd)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (smena) q = q.eq("smena", smena);

  const { data, error } = await q;
  return {
    idDeo: id,
    smena: smena || null,
    log: data || [],
    greska: error?.message || null,
  };
}

/** Ograničen pregled za Modul 1 merljive — samo varijabilna merenja. */
export async function ucitajTrasabilitetLinijaMer(supabase, { idDeo, smena, limit = 25, vinLot }) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return { merenja: [], greska: "Unesite ID dela" };

  const od = new Date();
  od.setDate(od.getDate() - 7);
  const datumOd = od.toISOString().split("T")[0];
  const vinQ = String(vinLot || "").trim().toUpperCase();

  let q = supabase.from("merenja_varijabilna")
    .select("datum,smena,pozicija,vrednost_raw,status,sifra_merenja,sesija_id,radni_nalog,created_at")
    .eq("id_deo", id)
    .gte("datum", datumOd)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (smena) q = q.eq("smena", String(smena));
  const merOr = orIlikeFilter(vinQ, ["sesija_id", "radni_nalog", "sifra_merenja"]);
  if (merOr) q = q.or(merOr);

  const { data, error } = await q;
  return {
    idDeo: id,
    smena: smena || null,
    merenja: data || [],
    greska: error?.message || null,
  };
}

export async function preuzmiTrasabilitetPdf(podaci, C) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  await registrujPdfFontLatin(pdf);
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov: "Trasabilitet",
    podnaslov: `ID delo: ${podaci.idDeo}`,
  });
  y += 6;

  if (podaci.sesijaId) y = pdfMetaRed(pdf, margin, y, `Sesija: ${podaci.sesijaId}`);
  if (podaci.vinLot) y = pdfMetaRed(pdf, margin, y, `Filter komad (VIN/lot): ${podaci.vinLot}`, true);
  y = pdfMetaRed(pdf, margin, y, `Datum izveštaja: ${new Date().toLocaleString("sr-RS")}`);
  y += 4;

  if (podaci.poKomadu?.length) {
    for (const k of podaci.poKomadu.slice(0, 20)) {
      const naslov = k.vin ? `VIN ${k.vin}` : (k.lot !== "—" ? `Lot ${k.lot}` : `Sesija ${k.kljuc}`);
      y = pdfSekcijaNaslov(pdf, margin, y, `Komad: ${naslov} · ${k.dogadjaji.length} događaja`);
      y = pdfTabela(pdf, { margin, y, kolone: LANAC_KOLONE, redovi: k.dogadjaji, maxRedova: 15 });
      if (k.dogadjaji.length > 15) {
        y = pdfMetaRed(pdf, margin, y, `… +${k.dogadjaji.length - 15} događaja za ovaj komad`);
      }
      y += 2;
      if (y > 240) { pdf.addPage(); y = margin + 6; }
    }
  }

  if (podaci.lanac?.length) {
    y = pdfSekcijaNaslov(pdf, margin, y, `Lanac proizvodnje (${podaci.lanac.length} događaja)`);
    y = pdfTabela(pdf, { margin, y, kolone: LANAC_KOLONE, redovi: podaci.lanac, maxRedova: 60 });
    if (podaci.lanac.length > 60) y = pdfMetaRed(pdf, margin, y, `… +${podaci.lanac.length - 60} događaja u bazi`);
    y += 4;
  }

  if (podaci.merenja?.length) {
    if (y > 230) { pdf.addPage(); y = margin + 6; }
    y = pdfSekcijaNaslov(pdf, margin, y, `Merljiva merenja (${podaci.merenja.length})`);
    y = pdfTabela(pdf, { margin, y, kolone: MERENJA_KOLONE, redovi: podaci.merenja, maxRedova: 80 });
    if (podaci.merenja.length > 80) y = pdfMetaRed(pdf, margin, y, `… +${podaci.merenja.length - 80} redova u bazi`);
    y += 4;
  }

  if (podaci.kpi?.length) {
    if (y > 230) { pdf.addPage(); y = margin + 6; }
    y = pdfSekcijaNaslov(pdf, margin, y, `KPI unosi (${podaci.kpi.length})`);
    y = pdfTabela(pdf, { margin, y, kolone: KPI_KOLONE, redovi: podaci.kpi, maxRedova: 15 });
    y += 4;
  }

  if (podaci.log?.length) {
    if (y > 230) { pdf.addPage(); y = margin + 6; }
    y = pdfSekcijaNaslov(pdf, margin, y, `Atributivni log (${podaci.log.length})`);
    y = pdfTabela(pdf, { margin, y, kolone: LOG_KOLONE, redovi: podaci.log, maxRedova: 20 });
    y += 4;
  }

  if (podaci.momenti?.length) {
    if (y > 230) { pdf.addPage(); y = margin + 6; }
    y = pdfSekcijaNaslov(pdf, margin, y, `Moment protokol (${podaci.momenti.length})`);
    y = pdfTabela(pdf, {
      margin,
      y,
      kolone: [
        { label: "DATUM", w: 22, fmt: (m) => m.datum || "—" },
        { label: "SM", w: 10, fmt: (m) => (m.smena != null ? `S${m.smena}` : "—") },
        { label: "KORAK", w: 14, fmt: (m) => String(m.korak_redosled ?? "—") },
        { label: "NM", w: 18, fmt: (m) => String(m.ostvareno_nm ?? "—") },
        { label: "STATUS", w: 16, fmt: (m) => m.status || "—" },
        { label: "VIN", w: 28, fmt: (m) => m.vin || "—" },
        { label: "ALAT", w: 24, fmt: (m) => m.tool_kod || "—" },
        { label: "RN", w: 50, fmt: (m) => m.radni_nalog || "—" },
      ],
      redovi: podaci.momenti,
      maxRedova: 40,
    });
    if (podaci.momenti.length > 40) y = pdfMetaRed(pdf, margin, y, `… +${podaci.momenti.length - 40} u bazi`);
    y += 4;
  }

  if (podaci.alarmi?.length) {
    if (y > 230) { pdf.addPage(); y = margin + 6; }
    y = pdfSekcijaNaslov(pdf, margin, y, `SPC alarmi (${podaci.alarmi.length})`);
    y = pdfTabela(pdf, {
      margin,
      y,
      kolone: [
        { label: "DATUM", w: 24, fmt: (a) => a.datum || "—" },
        { label: "KARTA", w: 22, fmt: (a) => a.tip_karte || "—" },
        { label: "PRAVILO", w: 40, fmt: (a) => a.pravilo || "—" },
        { label: "STATUS", w: 22, fmt: (a) => a.status || "—" },
        { label: "VREDNOST", w: 74, fmt: (a) => String(a.vrednost ?? "—") },
      ],
      redovi: podaci.alarmi,
      maxRedova: 20,
    });
    y += 4;
  }

  if (podaci.ncr?.length) {
    if (y > 230) { pdf.addPage(); y = margin + 6; }
    y = pdfSekcijaNaslov(pdf, margin, y, `NCR / CAPA (${podaci.ncr.length})`);
    y = pdfTabela(pdf, { margin, y, kolone: NCR_KOLONE, redovi: podaci.ncr, maxRedova: 15 });
  }

  dodajPdfBrendPodnozje(pdf);
  pdf.save(`TRI-CORE_trasabilitet_${podaci.idDeo}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
