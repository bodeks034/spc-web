/** PDF predaja smene — škart/KPI, SPC alarmi, otvoreni 8D, prioritet, eskalacije. */

import { agregirajAtributivneJedinice } from "./atributivneAgregacija.js";
import { dodajPdfBrendZaglavlje, dodajPdfBrendPodnozje } from "./pdfBrending.js";
import { registrujPdfFontLatin, PDF_FONT_SR } from "./pdfFontSr.js";
import { daniDoStudije } from "./msaKalendar.js";
import { primeniLinijaFilter, primeniPogonFilter, ucitajLinijeZaDigest } from "./digestLinija.js";
import { fetchPrioritetSmene } from "./kontekstualniVodic.js";
import { ucitajFaiCekaju } from "./faiWorkflow.js";
import { fetchSmenaStatPoPogonima, fetchAktivniRadniNalozi } from "./smenaPogonBreakdown.js";
import { formatPogonOznaka } from "./pogonOznaka.js";

export { primeniLinijaFilter, ucitajLinijeZaDigest };

const PDF_MARGIN = 14;
/** Maks. Y za telo — ostavlja mesto za potpis i podnožje (A4 ≈ 297 mm). */
const PDF_BODY_MAX_Y = 258;
const PDF_NEW_PAGE_Y = 28;

function dISO() {
  return new Date().toISOString().split("T")[0];
}

function pdfDims(pdf) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  return { pageW, pageH, contentW: pageW - PDF_MARGIN * 2, margin: PDF_MARGIN };
}

function pdfProveriStranicu(pdf, y, potrebno = 6) {
  if (y + potrebno > PDF_BODY_MAX_Y) {
    pdf.addPage();
    return PDF_NEW_PAGE_Y;
  }
  return y;
}

function pdfSekcija(pdf, y, naslov) {
  y = pdfProveriStranicu(pdf, y, 12);
  const { margin, contentW } = pdfDims(pdf);
  pdf.setFillColor(44, 82, 130);
  pdf.rect(margin, y - 3, contentW, 7, "F");
  pdf.setFont(PDF_FONT_SR, "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  const lines = pdf.splitTextToSize(String(naslov), contentW - 4);
  pdf.text(lines[0], margin + 2, y + 1.5);
  return y + 9;
}

function pdfRed(pdf, y, tekst, opts = {}) {
  const {
    indent = 0,
    fontSize = 9,
    bold = false,
    boja = [60, 70, 80],
    lineH = 4.3,
    maxW = null,
  } = opts;
  const { margin, contentW } = pdfDims(pdf);
  const w = maxW ?? (contentW - indent);
  pdf.setFont(PDF_FONT_SR, bold ? "bold" : "normal");
  pdf.setFontSize(fontSize);
  pdf.setTextColor(...boja);
  const lines = pdf.splitTextToSize(String(tekst ?? ""), Math.max(w, 20));
  for (const ln of lines) {
    y = pdfProveriStranicu(pdf, y, lineH);
    pdf.text(ln, margin + indent, y);
    y += lineH;
  }
  return y;
}

function pdfLista(pdf, y, stavke, format, { prazno = "Nema stavki ✓", boja = [60, 70, 80] } = {}) {
  if (!stavke?.length) {
    return pdfRed(pdf, y, prazno, { boja: [100, 120, 100] }) + 2;
  }
  for (const s of stavke) {
    y = pdfRed(pdf, y, format(s), { boja });
  }
  return y + 2;
}

function pdfModulStatBlok(pdf, y, naslov, pod) {
  y = pdfProveriStranicu(pdf, y, 20);
  y = pdfRed(pdf, y, naslov, { bold: true, fontSize: 10, boja: [30, 32, 36] });
  const m = pod.merenja || {};
  y = pdfRed(pdf, y, `Ukupno: ${m.n} · OK: ${m.ok} · NOK: ${m.nok}`, { indent: 4 });
  y = pdfRed(pdf, y, `FPY: ${m.rty}% · DPMO: ${(m.dpmo ?? 0).toLocaleString()}`, { indent: 4 });
  if (pod.skartKpi) {
    const k = pod.skartKpi;
    let kpiLn = `Škart KPI: ${k.skart || 0} · Dorada: ${k.dorada || 0}`;
    if (k.planirano) kpiLn += ` · Plan: ${k.planirano}`;
    if (k.oee != null) kpiLn += ` · OEE: ${k.oee}%`;
    y = pdfRed(pdf, y, kpiLn, { indent: 4 });
  }
  if (pod.topNok?.length) {
    pod.topNok.slice(0, 5).forEach(([naziv, cnt], i) => {
      y = pdfRed(pdf, y, `${i + 1}. ${naziv} — ${cnt}×`, { indent: 4, fontSize: 8 });
    });
  }
  return y + 3;
}

function pdfPotpisINapomena(pdf, y, napomena = "") {
  const { margin, contentW } = pdfDims(pdf);
  const tekst = String(napomena || "").trim();
  if (tekst) {
    y = pdfSekcija(pdf, y, "NAPOMENA PREDAJE SMENE");
    y = pdfRed(pdf, y, tekst, { fontSize: 9 });
    y += 2;
  } else {
    y = pdfSekcija(pdf, y, "NAPOMENA ZA SLEDEĆU SMENU");
    for (let i = 0; i < 3; i++) {
      y = pdfProveriStranicu(pdf, y, 9);
      pdf.setDrawColor(170, 180, 190);
      pdf.setLineWidth(0.25);
      pdf.line(margin, y + 3, margin + contentW, y + 3);
      y += 9;
    }
  }

  y = pdfSekcija(pdf, y, "POTVRDA PREDAJE SMENE");
  y = pdfProveriStranicu(pdf, y, 22);
  const pol = (contentW - 8) / 2;
  pdf.setFont(PDF_FONT_SR, "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(80, 90, 100);
  [["Predao (ime, potpis)", margin], ["Primio (ime, potpis)", margin + pol + 8]].forEach(([lbl, x]) => {
    pdf.text(lbl, x, y);
    pdf.line(x, y + 10, x + pol, y + 10);
  });
  return y + 16;
}

function pdfPoPogonima(pdf, y, poPogon = []) {
  if (!poPogon?.length) return y;
  y = pdfSekcija(pdf, y, `PREGLED PO POGONIMA (${poPogon.length})`);
  for (const p of poPogon) {
    const attr = p.attr?.n ? `atr ${p.attr.n} (${p.attr.fpy ?? "—"}%)` : "atr —";
    const mer = p.merljive?.n ? `mer ${p.merljive.n} (${p.merljive.fpy ?? "—"}%)` : "mer —";
    const uk = p.ukupno?.n ? `ukupno ${p.ukupno.n} · FPY ${p.ukupno.fpy ?? "—"}%` : "";
    y = pdfRed(pdf, y, `${p.label || p.pogon}: ${attr} · ${mer}${uk ? ` · ${uk}` : ""}`, { fontSize: 8 });
  }
  return y + 2;
}

function pdfRadniNalozi(pdf, y, nalozi = []) {
  if (!nalozi?.length) return y;
  y = pdfSekcija(pdf, y, `AKTIVNI RADNI NALOZI (${nalozi.length})`);
  return pdfLista(pdf, y, nalozi.slice(0, 25), (n) => (
    `${formatPogonOznaka(n.pogon_kod)} · ${n.broj_naloga || "—"} · ${n.id_deo}${n.kolicina ? ` · ${n.kolicina} kom` : ""}`
  ), { prazno: "Nema aktivnih naloga" });
}

function pdfOfflineInfo(pdf, y, offlineInfo) {
  if (!offlineInfo?.total) return y;
  y = pdfSekcija(pdf, y, "OFFLINE RED (OVAJ RAČUNAR)");
  y = pdfRed(pdf, y, `${offlineInfo.total} paketa čeka sinhronizaciju · ${offlineInfo.stavki || 0} stavki`, {
    boja: [180, 100, 30],
  });
  if (offlineInfo.kontrolni_log || offlineInfo.merljive_serija || offlineInfo.atributivne_batch) {
    y = pdfRed(pdf, y, [
      offlineInfo.kontrolni_log ? `log: ${offlineInfo.kontrolni_log}` : null,
      offlineInfo.merljive_serija ? `merljive: ${offlineInfo.merljive_serija}` : null,
      offlineInfo.atributivne_batch ? `atributivne: ${offlineInfo.atributivne_batch}` : null,
    ].filter(Boolean).join(" · "), { fontSize: 8 });
  }
  return y + 2;
}

function pdfZavrsi(pdf) {
  dodajPdfBrendPodnozje(pdf);
}

async function fetchPredajaProsirenje(supabase, {
  datum, smena, linija, pogonKod = null, ukljuciPrioritet = false,
}) {
  const sm = Number(smena) || 1;
  try {
    const eskP = supabase.from("eskalacije")
      .select("id,id_deo,opis,prioritet,status,rok")
      .in("status", ["otvoren", "u_toku"])
      .order("created_at", { ascending: false })
      .limit(8);
    const faiP = ucitajFaiCekaju(supabase, { datum, smena: sm }).catch(() => []);
    const rnP = fetchAktivniRadniNalozi(supabase, { pogonKod });

    if (ukljuciPrioritet) {
      const [eskRes, prioMer, prioAtr, faiCekaju, radniNalozi] = await Promise.all([
        eskP,
        fetchPrioritetSmene(supabase, { modul: "merljive", datum, smena: sm, linija, limit: 3 }).catch(() => []),
        fetchPrioritetSmene(supabase, { modul: "atributivne", datum, smena: sm, linija, limit: 3 }).catch(() => []),
        faiP,
        rnP,
      ]);
      return {
        eskalacije: eskRes.error ? [] : (eskRes.data || []),
        prioritetMer: prioMer || [],
        prioritetAtr: prioAtr || [],
        faiCekaju: faiCekaju || [],
        radniNalozi: radniNalozi || [],
      };
    }

    const [eskRes, faiCekaju, radniNalozi] = await Promise.all([eskP, faiP, rnP]);
    return {
      eskalacije: eskRes.error ? [] : (eskRes.data || []),
      prioritetMer: [],
      prioritetAtr: [],
      faiCekaju: faiCekaju || [],
      radniNalozi: radniNalozi || [],
    };
  } catch {
    return {
      eskalacije: [],
      prioritetMer: [],
      prioritetAtr: [],
      faiCekaju: [],
      radniNalozi: [],
    };
  }
}

function mozeGenerisatiPredajaPdf({
  ukN, attrPod, prosirenje, poPogonData, napomena, offlineInfo, dopustiPrazno,
}) {
  if (dopustiPrazno) return true;
  if (ukN > 0) return true;
  if (poPogonData?.redovi?.length) return true;
  if (String(napomena || "").trim()) return true;
  if (offlineInfo?.total > 0) return true;
  if (attrPod?.alarmi?.length || attrPod?.ncr?.length || attrPod?.osmd?.length) return true;
  if (prosirenje?.radniNalozi?.length || prosirenje?.eskalacije?.length) return true;
  if (prosirenje?.faiCekaju?.length) return true;
  return false;
}

function pdfPrioritetSekcija(pdf, y, naslov, lista) {
  if (!lista?.length) return y;
  y = pdfSekcija(pdf, y, naslov);
  return pdfLista(pdf, y, lista, (p) => {
    const raz = (p.razlozi || []).slice(0, 2).join("; ");
    return `${p.idDeo} · skor ${p.skor} (${p.nivo})${raz ? ` — ${raz}` : ""}`;
  }, { boja: [90, 60, 30] });
}

function pdfZajednickeSekcije(pdf, y, pod, prosirenje, { modul = null } = {}) {
  const moment = pod.moment || { n: 0 };
  if (moment.n > 0) {
    y = pdfSekcija(pdf, y, "MOMENT ZATEZANJE");
    y = pdfRed(pdf, y, `Zatezanja: ${moment.n} · OK: ${moment.ok} · NOK: ${moment.nok}`);
  }

  if (prosirenje?.faiCekaju?.length && modul !== "atributivne") {
    y = pdfSekcija(pdf, y, `FAI ČEKA ODOBRENJE (${prosirenje.faiCekaju.length})`);
    y = pdfLista(pdf, y, prosirenje.faiCekaju, (f) => (
      `${f.id_deo}${f.radni_nalog ? ` · RN ${f.radni_nalog}` : ""} · status: čeka`
    ), { boja: [180, 100, 30] });
  }

  y = pdfSekcija(pdf, y, `SPC ALARMI (${pod.alarmi?.length || 0})`);
  y = pdfLista(pdf, y, pod.alarmi, (a) => (
    `#${a.id} ${a.id_deo} · ${a.tip_karte || ""} ${a.pozicija || ""} · ${a.pravilo || ""} [${a.status}]`
  ), {
    prazno: "Nema otvorenih alarma za datum smene ✓",
    boja: [180, 50, 50],
  });

  y = pdfSekcija(pdf, y, `OTVORENI NCR (${pod.ncr?.length || 0})`);
  y = pdfLista(pdf, y, pod.ncr, (n) => (
    `${n.broj_ncr} · ${n.id_deo} · [${n.status}]${n.prioritet ? ` (${n.prioritet})` : ""} — ${String(n.opis || "").trim()}`
  ), { prazno: "Nema otvorenih NCR zapisa ✓" });

  y = pdfSekcija(pdf, y, `OTVORENI 8D (${pod.osmd?.length || 0})`);
  y = pdfLista(pdf, y, pod.osmd, (d) => (
    `#${d.id} ${d.id_deo} · ${d.status} — ${String(d.d2_opis_problema || "").trim()}`
  ), { prazno: "Nema otvorenih 8D izveštaja ✓" });

  if (prosirenje?.eskalacije?.length) {
    y = pdfSekcija(pdf, y, `ESKALACIJE (${prosirenje.eskalacije.length})`);
    y = pdfLista(pdf, y, prosirenje.eskalacije, (e) => (
      `#${e.id} ${e.id_deo} · [${e.status}] ${e.prioritet || ""} — ${String(e.opis || "").trim()}${e.rok ? ` (rok: ${e.rok})` : ""}`
    ), { boja: [160, 80, 40] });
  }

  if (pod.kalIstekla?.length || pod.msaKasni?.length) {
    y = pdfSekcija(pdf, y, "KALIBRACIJA / MSA");
    if (pod.kalIstekla?.length) {
      y = pdfRed(pdf, y, `Istekla kalibracija: ${pod.kalIstekla.join(", ")}`);
    }
    if (pod.msaKasni?.length) {
      const nazivi = pod.msaKasni.map((r) => r.merilo?.naziv || "?").join(", ");
      y = pdfRed(pdf, y, `MSA kasni: ${nazivi}`);
    }
  }

  return y;
}

async function fetchPredajaPodataka(supabase, { datum, smena, modul, linija = null, pogonKod = null }) {
  const sm = Number(smena) || 1;
  const out = {
    datum,
    smena: sm,
    modul,
    linija: linija || null,
    merenja: { n: 0, ok: 0, nok: 0, rty: 0, dpmo: 0 },
    skartKpi: null,
    alarmi: [],
    osmd: [],
    ncr: [],
    moment: { n: 0, ok: 0, nok: 0 },
    msaKasni: [],
    kalIstekla: [],
    topNok: [],
  };

  if (modul === "merljive") {
    let q = supabase.from("merenja_varijabilna")
      .select("status,pozicija,id_deo,linija")
      .eq("datum", datum).eq("smena", sm);
    q = primeniLinijaFilter(q, linija);
    q = primeniPogonFilter(q, pogonKod);
    const { data } = await q;
    const rows = data || [];
    const n = rows.length;
    const nok = rows.filter((r) => (r.status || "").toUpperCase() === "NOK").length;
    out.merenja = {
      n, ok: n - nok, nok,
      rty: n > 0 ? +(((n - nok) / n) * 100).toFixed(2) : 0,
      dpmo: n > 0 ? Math.round((nok / n) * 1e6) : 0,
    };
    const g = {};
    rows.forEach((r) => {
      if ((r.status || "").toUpperCase() === "NOK") {
        const k = r.pozicija || "?";
        g[k] = (g[k] || 0) + 1;
      }
    });
    out.topNok = Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 8);
  } else {
    let q = supabase.from("kontrolni_log")
      .select("ukupno_merenja,ok_kolicina,nok_kolicina,kom_nok,greska_naziv,id_deo,naziv_dela,inspekcija_id,sesija_id,created_at,id,datum,smena,linija")
      .eq("datum", datum).eq("smena", sm);
    q = primeniLinijaFilter(q, linija);
    q = primeniPogonFilter(q, pogonKod);
    const { data } = await q;
    const rows = data || [];
    const { ok, nok, n } = agregirajAtributivneJedinice(rows);
    out.merenja = {
      n, ok, nok,
      rty: n > 0 ? +((ok / n) * 100).toFixed(2) : 0,
      dpmo: n > 0 ? Math.round((nok / n) * 1e6) : 0,
    };
    const g = {};
    rows.forEach((r) => {
      if (r.greska_naziv && r.greska_naziv !== "OK") {
        g[r.greska_naziv] = (g[r.greska_naziv] || 0) + (r.kom_nok || 0);
      }
    });
    out.topNok = Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }

  try {
    const { data: kpi } = await supabase.from("kpi_unos")
      .select("ukupno_kom,skart_kom,dorada_kom,oee,planirano_kom")
      .eq("datum", datum).eq("smena", sm).eq("modul", modul);
    if (kpi?.length) {
      const agg = kpi.reduce((acc, r) => {
        acc.ukupno = (acc.ukupno || 0) + (r.ukupno_kom || 0);
        acc.skart = (acc.skart || 0) + (r.skart_kom || 0);
        acc.dorada = (acc.dorada || 0) + (r.dorada_kom || 0);
        acc.planirano = (acc.planirano || 0) + (r.planirano_kom || 0);
        if (r.oee != null) {
          acc.oeeSum = (acc.oeeSum || 0) + Number(r.oee);
          acc.oeeN = (acc.oeeN || 0) + 1;
        }
        return acc;
      }, {});
      if (agg.oeeN > 0) {
        agg.oee = +((agg.oeeSum / agg.oeeN).toFixed(1));
      }
      out.skartKpi = agg;
    }
  } catch { /* */ }

  try {
    const { data: al } = await supabase.from("spc_alarmi")
      .select("id,id_deo,tip_karte,pozicija,pravilo,status,created_at")
      .eq("datum", datum)
      .in("status", ["otvoren", "potvrden", "karantin"])
      .order("created_at", { ascending: false })
      .limit(15);
    out.alarmi = al || [];
  } catch { /* */ }

  try {
    const { data: d8 } = await supabase.from("osmd_izvestaji")
      .select("id,id_deo,status,d2_opis_problema,created_at")
      .in("status", ["u_toku", "otvoren", "ceka"])
      .order("created_at", { ascending: false })
      .limit(10);
    out.osmd = d8 || [];
  } catch { /* */ }

  try {
    const { data: ncr } = await supabase.from("ncr_capa")
      .select("broj_ncr,id_deo,status,prioritet,opis,created_at")
      .not("status", "eq", "zatvoren")
      .order("created_at", { ascending: false })
      .limit(10);
    out.ncr = ncr || [];
  } catch { /* */ }

  try {
    const { data: mom } = await supabase.from("moment_protokol")
      .select("status")
      .eq("datum", datum)
      .eq("smena", sm);
    const rows = mom || [];
    const nok = rows.filter((r) => r.status === "NOK").length;
    out.moment = { n: rows.length, ok: rows.length - nok, nok };
  } catch { /* */ }

  try {
    const { data: msa } = await supabase.from("msa_kalendar")
      .select("sledeca_studija,merilo:merila(naziv)")
      .order("sledeca_studija", { ascending: true });
    out.msaKasni = (msa || []).filter((r) => {
      const d = daniDoStudije(r.sledeca_studija);
      return d !== null && d < 0;
    });
  } catch { /* */ }

  try {
    const { data: mer } = await supabase.from("merila")
      .select("naziv,kalibracije(sledeca_kal)")
      .eq("aktivno", true);
    const danas = new Date();
    out.kalIstekla = (mer || []).filter((m) => {
      const kal = (m.kalibracije || []).sort((a, b) => new Date(b.datum_kal) - new Date(a.datum_kal))[0];
      if (!kal?.sledeca_kal) return false;
      return new Date(kal.sledeca_kal) < danas;
    }).map((m) => m.naziv);
  } catch { /* */ }

  return out;
}

async function napraviPredajaPdf(supabase, {
  korisnik,
  smena,
  modul = "merljive",
  datum = dISO(),
  linija = null,
  pogonKod = null,
  napomena = "",
  offlineInfo = null,
  dopustiPrazno = false,
}) {
  const [pod, prosirenje, poPogonData] = await Promise.all([
    fetchPredajaPodataka(supabase, { datum, smena, modul, linija, pogonKod }),
    fetchPredajaProsirenje(supabase, { datum, smena, linija, pogonKod }),
    pogonKod
      ? Promise.resolve({ redovi: [] })
      : fetchSmenaStatPoPogonima(supabase, { datum, smena, linija }),
  ]);
  if (!dopustiPrazno && pod.merenja.n === 0) {
    const imaAlarmi = pod.alarmi?.length || pod.ncr?.length || pod.osmd?.length;
    const imaOstalo = String(napomena || "").trim() || offlineInfo?.total > 0
      || prosirenje?.radniNalozi?.length || prosirenje?.eskalacije?.length;
    if (!imaAlarmi && !imaOstalo) return null;
  }

  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registrujPdfFontLatin(pdf);

  const modulNaziv = modul === "merljive" ? "Merljive" : "Atributivne";
  const pogonSuf = pogonKod ? ` · pogon ${pogonKod}` : "";
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov: "Predaja smene — kvalitet",
    podnaslov: `${modulNaziv} · smena ${smena} · ${datum}${linija ? ` · ${linija}` : ""}${pogonSuf}`,
  });
  y += 4;
  y = pdfRed(pdf, y, `Generisao: ${korisnik?.ime || "—"} · ${new Date().toLocaleString("sr-RS")}`, { fontSize: 8 });
  y = pdfRed(pdf, y, "Sadržaj: KPI · po pogonima · RN · alarmi · NCR · 8D · eskalacije · prioritet · FAI", { fontSize: 8, boja: [120, 130, 140] });
  y += 4;

  y = pdfSekcija(pdf, y, "STATISTIKA SMENE");
  y = pdfModulStatBlok(pdf, y, modulNaziv.toUpperCase(), pod);
  y = pdfPoPogonima(pdf, y, poPogonData.redovi);

  if (modul === "merljive" && prosirenje.prioritetMer?.length) {
    y = pdfPrioritetSekcija(pdf, y, "PRIORITET SMENE — MERLJIVE", prosirenje.prioritetMer);
  }
  if (modul === "atributivne" && prosirenje.prioritetAtr?.length) {
    y = pdfPrioritetSekcija(pdf, y, "PRIORITET SMENE — ATRIBUTIVNE", prosirenje.prioritetAtr);
  }

  y = pdfRadniNalozi(pdf, y, prosirenje.radniNalozi);
  y = pdfOfflineInfo(pdf, y, offlineInfo);
  y = pdfZajednickeSekcije(pdf, y, pod, prosirenje, { modul });
  y = pdfPotpisINapomena(pdf, y, napomena);
  pdfZavrsi(pdf);

  const pogonF = pogonKod ? `_P${pogonKod}` : "";
  const filename = `TRI-CORE_Predaja_smene_${modul}_S${smena}_${datum}${pogonF}.pdf`;
  return { pdf, pod, prosirenje, datum, modul, smena, filename };
}

async function napraviPredajaPdfPogon(supabase, {
  korisnik,
  smena,
  datum = dISO(),
  linija = null,
  pogonKod = null,
  napomena = "",
  offlineInfo = null,
  dopustiPrazno = false,
}) {
  const [attrPod, merPod, prosirenje, poPogonData] = await Promise.all([
    fetchPredajaPodataka(supabase, { datum, smena, modul: "atributivne", linija, pogonKod }),
    fetchPredajaPodataka(supabase, { datum, smena, modul: "merljive", linija, pogonKod }),
    fetchPredajaProsirenje(supabase, { datum, smena, linija, pogonKod }),
    pogonKod
      ? Promise.resolve({ redovi: [] })
      : fetchSmenaStatPoPogonima(supabase, { datum, smena, linija }),
  ]);
  const ukN = (attrPod.merenja.n || 0) + (merPod.merenja.n || 0);
  if (!mozeGenerisatiPredajaPdf({
    ukN, attrPod, prosirenje, poPogonData, napomena, offlineInfo, dopustiPrazno,
  })) return null;

  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registrujPdfFontLatin(pdf);

  const pogonSuf = pogonKod ? ` · pogon ${pogonKod}` : " · svi pogoni";
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov: "Predaja smene — ceo pogon",
    podnaslov: `Atributivne + merljive · smena ${smena} · ${datum}${pogonSuf}`,
  });
  y += 4;
  y = pdfRed(pdf, y, `Generisao: ${korisnik?.ime || "—"} · ${new Date().toLocaleString("sr-RS")}`, { fontSize: 8 });
  y += 4;

  const ukOk = attrPod.merenja.ok + merPod.merenja.ok;
  const ukNok = attrPod.merenja.nok + merPod.merenja.nok;
  const ukFpy = ukN > 0 ? +(((ukOk / ukN) * 100).toFixed(2)) : 0;
  const ukDpmo = ukN > 0 ? Math.round((ukNok / ukN) * 1e6) : 0;

  y = pdfSekcija(pdf, y, "UKUPNO POGON");
  y = pdfRed(pdf, y, `Ukupno: ${ukN} · OK: ${ukOk} · NOK: ${ukNok}`);
  y = pdfRed(pdf, y, `FPY: ${ukFpy}% · DPMO: ${ukDpmo.toLocaleString()}`);
  const skUk = {
    skart: (attrPod.skartKpi?.skart || 0) + (merPod.skartKpi?.skart || 0),
    dorada: (attrPod.skartKpi?.dorada || 0) + (merPod.skartKpi?.dorada || 0),
    planirano: (attrPod.skartKpi?.planirano || 0) + (merPod.skartKpi?.planirano || 0),
  };
  if (skUk.skart || skUk.dorada || skUk.planirano) {
    y = pdfRed(pdf, y, `Škart KPI: ${skUk.skart} · Dorada: ${skUk.dorada}${skUk.planirano ? ` · Plan: ${skUk.planirano}` : ""}`);
  }
  y += 2;

  y = pdfPoPogonima(pdf, y, poPogonData.redovi);
  y = pdfModulStatBlok(pdf, y, "ATRIBUTIVNE", attrPod);
  y = pdfModulStatBlok(pdf, y, "MERLJIVE", merPod);

  y = pdfPrioritetSekcija(pdf, y, "PRIORITET — ATRIBUTIVNE", prosirenje.prioritetAtr);
  y = pdfPrioritetSekcija(pdf, y, "PRIORITET — MERLJIVE", prosirenje.prioritetMer);

  y = pdfRadniNalozi(pdf, y, prosirenje.radniNalozi);
  y = pdfOfflineInfo(pdf, y, offlineInfo);

  const zajPod = {
    ...attrPod,
    moment: attrPod.moment?.n > 0 ? attrPod.moment : merPod.moment,
  };
  y = pdfZajednickeSekcije(pdf, y, zajPod, prosirenje);
  y = pdfPotpisINapomena(pdf, y, napomena);
  pdfZavrsi(pdf);

  const pogonF = pogonKod ? `_P${pogonKod}` : "";
  const filename = `TRI-CORE_Predaja_smene_pogon_S${smena}_${datum}${pogonF}.pdf`;
  return { pdf, attrPod, merPod, prosirenje, datum, smena, filename };
}

export async function generisiPredajaSmenePdf(supabase, {
  korisnik,
  smena,
  modul = "merljive",
  datum = dISO(),
  linija = null,
  pogonKod = null,
  napomena = "",
  offlineInfo = null,
  addToast,
}) {
  try {
    const built = await napraviPredajaPdf(supabase, {
      korisnik, smena, modul, datum, linija, pogonKod, napomena, offlineInfo,
    });
    if (!built) {
      addToast?.(
        `Nema podataka za PDF · smena ${smena} · ${datum}. Proverite datum, smenu i filter pogona.`,
        "greska",
      );
      return;
    }
    built.pdf.save(built.filename);
    addToast?.("✓ PDF predaja smene", "uspeh");
  } catch (e) {
    console.error("generisiPredajaSmenePdf", e);
    addToast?.(`PDF greška: ${e?.message || "nepoznata"}`, "greska");
  }
}

/** Za email digest / cron — vraća PDF kao Buffer. */
export async function generisiPredajaSmenePdfBuffer(supabase, {
  smena,
  modul = "merljive",
  korisnik = { ime: "SPC automatizacija" },
  datum = dISO(),
  linija = null,
} = {}) {
  const built = await napraviPredajaPdf(supabase, {
    korisnik, smena, modul, datum, linija, dopustiPrazno: true,
  });
  if (!built) return null;
  const buffer = Buffer.from(built.pdf.output("arraybuffer"));
  return { buffer, filename: built.filename, pod: built.pod };
}

/** Kombinovani PDF — atributivne + merljive. */
export async function generisiPredajaSmenePdfBufferPogon(supabase, {
  smena,
  korisnik = { ime: "SPC automatizacija" },
  datum = dISO(),
  linija = null,
} = {}) {
  const built = await napraviPredajaPdfPogon(supabase, {
    korisnik, smena, datum, linija, dopustiPrazno: true,
  });
  if (!built) return null;
  const buffer = Buffer.from(built.pdf.output("arraybuffer"));
  return { buffer, filename: built.filename, pod: built };
}

export async function generisiPredajaSmenePdfPogon(supabase, {
  korisnik,
  smena,
  datum = dISO(),
  linija = null,
  pogonKod = null,
  napomena = "",
  offlineInfo = null,
  addToast,
}) {
  try {
    const built = await napraviPredajaPdfPogon(supabase, {
      korisnik, smena, datum, linija, pogonKod, napomena, offlineInfo,
    });
    if (!built) {
      addToast?.(
        `Nema podataka za PDF · smena ${smena} · ${datum}. Proverite datum i smenu (S1/S2/S3).`,
        "greska",
      );
      return;
    }
    built.pdf.save(built.filename);
    addToast?.("✓ PDF predaja smene — ceo pogon", "uspeh");
  } catch (e) {
    console.error("generisiPredajaSmenePdfPogon", e);
    addToast?.(`PDF greška: ${e?.message || "nepoznata"}`, "greska");
  }
}

export { fetchPredajaPodataka, dISO as dIsoPredaja };
