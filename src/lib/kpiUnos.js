/** Snimanje KPI reda (škart, dorada, OEE) u tabelu kpi_unos. */

import { izracunajOeeKpi } from "./oeeKpi.js";
import { kvalitetIzPrve, kvalitetIzPrveKpi } from "./spcStats.js";
import {
  agregirajAtributivneJedinice,
  agregirajAtributivnePoKljuču,
} from "./atributivneAgregacija.js";

export function redKpiUnos({
  modul,
  datum,
  smena,
  id_deo,
  serija,
  radni_nalog,
  sesija_id,
  kpi = {},
}) {
  return {
    modul,
    datum,
    smena: Number(smena) || 1,
    id_deo: String(id_deo || "").toUpperCase(),
    serija: modul === "atributivne" ? null : (serija || null),
    radni_nalog: radni_nalog || null,
    sesija_id: sesija_id || null,
    ukupno_kom: Number(kpi.ukupno_kom) || 0,
    ispravno_iz_prve: Number(kpi.ispravno_iz_prve) || 0,
    neusaglaseno: Number(kpi.neusaglaseno) || 0,
    dorada: Number(kpi.dorada) || 0,
    skart: Number(kpi.skart) || 0,
    ok_nakon_dorade: Number(kpi.ok_nakon_dorade) || 0,
    planirano_min: Number(kpi.planirano_min) || 0,
    zastoj_min: Number(kpi.zastoj_min) || 0,
    planirano_kom: Number(kpi.planirano_kom ?? kpi?.kpi?.planirano_kom) || 0,
  };
}

export async function snimiKpiUnos(supabase, params) {
  const row = redKpiUnos(params);
  if (!row.id_deo) return { data: null, error: new Error("Nema ID dela za KPI") };
  return supabase.from("kpi_unos").insert(row).select("id").single();
}

export function kpiVrednostiIzDb(row) {
  if (!row) return null;
  return {
    ukupno_kom: Number(row.ukupno_kom) || 0,
    ispravno_iz_prve: Number(row.ispravno_iz_prve) || 0,
    neusaglaseno: Number(row.neusaglaseno) || 0,
    dorada: Number(row.dorada) || 0,
    skart: Number(row.skart) || 0,
    ok_nakon_dorade: Number(row.ok_nakon_dorade) || 0,
    planirano_min: Number(row.planirano_min) || 0,
    zastoj_min: Number(row.zastoj_min) || 0,
    planirano_kom: Number(row.planirano_kom) || 0,
  };
}

/** Saberi KPI brojeve (npr. više zapisa atributivne kontrole istog dana). */
export function saberiKpiVrednosti(a = {}, b = {}) {
  const sumKeys = [
    "ukupno_kom", "ispravno_iz_prve", "neusaglaseno",
    "dorada", "skart", "ok_nakon_dorade", "zastoj_min",
  ];
  const out = { ...a };
  for (const k of sumKeys) {
    out[k] = (Number(a[k]) || 0) + (Number(b[k]) || 0);
  }
  out.planirano_min = Math.max(Number(a.planirano_min) || 0, Number(b.planirano_min) || 0);
  out.planirano_kom = Math.max(Number(a.planirano_kom) || 0, Number(b.planirano_kom) || 0);
  return out;
}

function saberiKvalitetPoDelovima(deos, logPoDeo, kpiPoDeo) {
  const sum = {
    ukupno_kom: 0,
    ispravno_iz_prve: 0,
    neusaglaseno: 0,
    dorada: 0,
    skart: 0,
    ok_nakon_dorade: 0,
  };
  for (const deo of deos) {
    if (!deo || deo === "?") continue;
    const log = logPoDeo.get(deo) || { ok: 0, nok: 0, n: 0 };
    const kpi = kpiPoDeo.get(deo);
    const k = kvalitetIzPrve({
      kpi: kpi?.ukupno_kom > 0 ? kpi : null,
      ok: log.ok,
      nok: log.nok,
      n: log.n,
    });
    sum.ukupno_kom += k.ukupno;
    sum.ispravno_iz_prve += k.ispravnoIzPrve;
    sum.neusaglaseno += k.neusaglaseno;
    sum.dorada += Number(kpi?.dorada) || 0;
    sum.skart += Number(kpi?.skart) || 0;
    sum.ok_nakon_dorade += Number(kpi?.ok_nakon_dorade) || 0;
  }
  return kvalitetIzPrveKpi(sum);
}

/** Dashboard RTY: po ID dela — KPI (FPY) ima prednost nad logom. */
export function agregirajKvalitetDashboardAttr(logData = [], kpiRows = []) {
  const logPoDeo = agregirajAtributivnePoKljuču(logData, r => r.id_deo || "?");
  const kpiPoDeo = new Map();
  for (const r of kpiRows) {
    if (r.modul !== "atributivne") continue;
    const deo = String(r.id_deo || "").toUpperCase() || "?";
    kpiPoDeo.set(deo, saberiKpiVrednosti(kpiPoDeo.get(deo) || {}, kpiVrednostiIzDb(r)));
  }
  const logStat = new Map();
  for (const [deo, rows] of logPoDeo.entries()) {
    const { ok, nok, n } = agregirajAtributivneJedinice(rows);
    logStat.set(deo, { ok, nok, n });
  }
  const deos = new Set([...logStat.keys(), ...kpiPoDeo.keys()]);
  return saberiKvalitetPoDelovima(deos, logStat, kpiPoDeo);
}

/** Dashboard RTY merljive — KPI komadi + log merenja po delu. */
export function agregirajKvalitetDashboardMer(merData = [], kpiRows = []) {
  const logPoDeo = new Map();
  for (const r of merData) {
    const deo = String(r.id_deo || "").toUpperCase() || "?";
    if (!logPoDeo.has(deo)) logPoDeo.set(deo, { ok: 0, nok: 0, n: 0 });
    const g = logPoDeo.get(deo);
    g.n += 1;
    if ((r.status || "").toUpperCase() === "NOK") g.nok += 1;
    else g.ok += 1;
  }
  const kpiPoDeo = new Map();
  for (const r of kpiRows) {
    if (r.modul !== "merljive") continue;
    const deo = String(r.id_deo || "").toUpperCase() || "?";
    kpiPoDeo.set(deo, saberiKpiVrednosti(kpiPoDeo.get(deo) || {}, kpiVrednostiIzDb(r)));
  }
  const deos = new Set([...logPoDeo.keys(), ...kpiPoDeo.keys()]);
  return saberiKvalitetPoDelovima(deos, logPoDeo, kpiPoDeo);
}

export function trendKvalitetaDashboardAttr(logData, kpiRows) {
  const datumi = new Set();
  (logData || []).forEach(r => r.datum && datumi.add(r.datum));
  (kpiRows || []).forEach(r => r.datum && datumi.add(r.datum));
  return [...datumi].sort().map(datum => {
    const k = agregirajKvalitetDashboardAttr(
      (logData || []).filter(r => r.datum === datum),
      (kpiRows || []).filter(r => r.datum === datum),
    );
    return {
      datum,
      ok: k.ispravnoIzPrve,
      nok: k.neusaglaseno,
      n: k.ukupno,
      fpy: k.fpy,
      rty: k.fpy,
      p: k.p,
    };
  });
}

export function trendKvalitetaDashboardMer(merData, kpiRows) {
  const datumi = new Set();
  (merData || []).forEach(r => r.datum && datumi.add(r.datum));
  (kpiRows || []).forEach(r => r.datum && datumi.add(r.datum));
  return [...datumi].sort().map(datum => {
    const k = agregirajKvalitetDashboardMer(
      (merData || []).filter(r => r.datum === datum),
      (kpiRows || []).filter(r => r.datum === datum),
    );
    return {
      datum,
      label: datum?.substring?.(5) || datum,
      ok: k.ispravnoIzPrve,
      nok: k.neusaglaseno,
      n: k.ukupno,
      fpy: k.fpy,
      rty: k.fpy,
      p: k.p,
    };
  });
}

/**
 * Ključ grupisanja KPI redova.
 * Merljive: RN + serija A/B/C. Atributivne: samo RN (nema serija — samo OK/NOK/defekti).
 */
export function kpiKljucZaModul(modul, red) {
  const rn = String(red?.radni_nalog || "").trim().toUpperCase() || "—";
  if (modul === "atributivne") return `atr:${rn}`;
  const serija = String(red?.serija || "").trim().toUpperCase() || "—";
  return `mer:${rn}:${serija}`;
}

export function oznakaKpiKljuca(modul, kljuc) {
  if (modul === "atributivne") {
    const rn = String(kljuc || "").replace(/^atr:/, "");
    return rn && rn !== "—" ? `Kontrola · RN ${rn}` : "Kontrola (atributivne)";
  }
  const parts = String(kljuc || "").replace(/^mer:/, "").split(":");
  const rn = parts[0] || "—";
  const serija = parts[1] || "—";
  if (rn !== "—" && serija !== "—") return `RN ${rn} · serija ${serija}`;
  if (rn !== "—") return `RN ${rn}`;
  if (serija !== "—") return `Serija ${serija}`;
  return "Bez RN / serije";
}

/** Grupiši KPI redove iz baze — atributivne saberi u jedan red po RN (ne po defektu/zapisu). */
export function grupisiKpiRedove(modul, rows = []) {
  const mapa = {};
  const idMapa = {};
  const meta = {};
  for (const r of rows) {
    const k = kpiKljucZaModul(modul, r);
    const v = kpiVrednostiIzDb(r);
    mapa[k] = mapa[k] ? saberiKpiVrednosti(mapa[k], v) : v;
    idMapa[k] = r.id;
    meta[k] = {
      radni_nalog: r.radni_nalog || null,
      serija: modul === "atributivne" ? null : (r.serija || null),
      brojRedova: (meta[k]?.brojRedova || 0) + 1,
    };
  }
  return { mapa, idMapa, meta };
}

/** Poslednji KPI red za seriju / sesiju (kasni unos dorade i škarta). */
export async function pronadjiKpiUnos(supabase, {
  modul,
  idDeo,
  datum,
  smena,
  serija,
  radniNalog,
  sesija_id,
}) {
  const mod = String(modul || "").toLowerCase();
  if (sesija_id && mod !== "atributivne") {
    const { data, error } = await supabase
      .from("kpi_unos")
      .select("*")
      .eq("modul", modul)
      .eq("sesija_id", sesija_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id || !datum) return null;
  let q = supabase
    .from("kpi_unos")
    .select("*")
    .eq("modul", modul)
    .eq("id_deo", id)
    .eq("datum", datum)
    .eq("smena", Number(smena) || 1);
  if (mod === "atributivne") {
    q = q.is("serija", null);
  } else if (serija) {
    q = q.eq("serija", String(serija).trim());
  }
  if (radniNalog) q = q.eq("radni_nalog", radniNalog);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

/** Atributivne: jedan KPI po RN/dan/smena — saberi stare redove (defekti nisu serije). */
export async function pronadjiAgregiraniKpiAtributivne(supabase, { idDeo, datum, smena, radniNalog }) {
  const rows = await fetchKpiUnos(supabase, {
    modul: "atributivne",
    idDeo,
    datum,
    smena,
    radniNalog: radniNalog || undefined,
    limit: 100,
  });
  if (!rows.length) return null;
  const { mapa, idMapa } = grupisiKpiRedove("atributivne", rows);
  const rn = String(radniNalog || "").trim().toUpperCase() || "—";
  const kljuc = `atr:${rn}`;
  const vrednosti = mapa[kljuc] || Object.values(mapa)[0];
  const id = idMapa[kljuc] || Object.values(idMapa)[0];
  const baza = rows.find(r => r.id === id) || rows[0];
  return { ...baza, ...vrednosti, id };
}

export async function azurirajKpiUnos(supabase, kpiId, params) {
  const row = redKpiUnos(params);
  if (!kpiId) return { data: null, error: new Error("Nema KPI reda za ažuriranje") };
  const {
    ukupno_kom,
    ispravno_iz_prve,
    neusaglaseno,
    dorada,
    skart,
    ok_nakon_dorade,
    planirano_min,
    zastoj_min,
    planirano_kom,
  } = row;
  return supabase
    .from("kpi_unos")
    .update({
      ukupno_kom,
      ispravno_iz_prve,
      neusaglaseno,
      dorada,
      skart,
      ok_nakon_dorade,
      planirano_min,
      zastoj_min,
      planirano_kom,
    })
    .eq("id", kpiId)
    .select("id")
    .single();
}

export async function snimiIliAzurirajKpiUnos(supabase, params, existingId) {
  if (existingId) return azurirajKpiUnos(supabase, existingId, params);
  return snimiKpiUnos(supabase, params);
}

export function porukaKpiGreske(error) {
  const msg = error?.message || "";
  if (msg.includes("sesija_id")) {
    return `${msg}\nPokreni 15_sesija_id.sql u Supabase SQL Editoru.`;
  }
  if (msg.includes("kpi_unos") || msg.includes("schema cache")) {
    return `${msg}\nPokreni 14_kpi_skart_dorada_oee.sql u Supabase SQL Editoru.`;
  }
  return msg;
}

/** Učitaj KPI unose za period / smenu (PDF i analitika). */
export async function fetchKpiUnos(supabase, {
  modul,
  datumOd,
  datumDo,
  datum,
  smena,
  idDeo,
  limit = 200,
  radniNalog,
}) {
  let q = supabase.from("kpi_unos").select("*").eq("modul", modul);
  if (datum) q = q.eq("datum", datum);
  if (datumOd) q = q.gte("datum", datumOd);
  if (datumDo) q = q.lte("datum", datumDo);
  if (smena != null && smena !== "") q = q.eq("smena", Number(smena));
  if (idDeo) q = q.eq("id_deo", String(idDeo).toUpperCase());
  if (radniNalog) q = q.eq("radni_nalog", String(radniNalog).trim().toUpperCase());
  const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

export function agregirajKpiUnos(rows, { modul } = {}) {
  if (!rows?.length) return null;

  let lista = rows;
  let brojUnosa = rows.length;

  if (modul === "atributivne") {
    const { mapa } = grupisiKpiRedove("atributivne", rows);
    lista = Object.values(mapa);
    brojUnosa = lista.length;
  }

  const sum = {
    ukupno_kom: 0,
    ispravno_iz_prve: 0,
    neusaglaseno: 0,
    dorada: 0,
    skart: 0,
    ok_nakon_dorade: 0,
    planirano_min: 0,
    zastoj_min: 0,
    planirano_kom: 0,
  };
  lista.forEach(r => {
    sum.planirano_kom = Math.max(sum.planirano_kom, r.planirano_kom || 0);
    sum.ukupno_kom += r.ukupno_kom || 0;
    sum.ispravno_iz_prve += r.ispravno_iz_prve || 0;
    sum.neusaglaseno += r.neusaglaseno || 0;
    sum.dorada += r.dorada || 0;
    sum.skart += r.skart || 0;
    sum.ok_nakon_dorade += r.ok_nakon_dorade || 0;
    sum.planirano_min = Math.max(sum.planirano_min, Number(r.planirano_min) || 0);
    sum.zastoj_min += r.zastoj_min || 0;
  });
  return {
    ...sum,
    brojUnosa,
    brojRedovaBaze: modul === "atributivne" ? rows.length : undefined,
    kpi: izracunajOeeKpi({
      ...sum,
      planirano_kom: sum.planirano_kom || lista.reduce((m, r) => Math.max(m, r.planirano_kom || 0), 0),
    }),
  };
}

/** Sekcija KPI u jsPDF izveštaju smene; vraća novi Y. */
export function dodajKpiBlokPdf(pdf, y, agg) {
  if (!agg?.brojUnosa) return y;
  const { kpi, brojUnosa, skart, dorada, ukupno_kom } = agg;
  const W = pdf.internal.pageSize.getWidth();

  if (y > 250) { pdf.addPage(); y = 20; }

  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 32, 36);
  pdf.text(`KPI — ŠKART · DORADA · OEE (${brojUnosa} unosa)`, 14, y);
  y += 8;

  const kartice = [
    ["OEE", kpi.oee != null ? `${kpi.oee}%` : "—"],
    ["RTY", kpi.rty != null ? `${kpi.rty}%` : "—"],
    ["FPY", kpi.fpy != null ? `${kpi.fpy}%` : "—"],
    ["Škart", String(skart)],
    ["Dorada", String(dorada)],
    ["UK kom", String(ukupno_kom)],
    ["Dostupn.", kpi.availability != null ? `${kpi.availability}%` : "—"],
    ["Perform.", kpi.performance != null ? `${kpi.performance}%` : "—"],
  ];

  kartice.forEach(([naziv, vrednost], i) => {
    const x = 14 + (i % 3) * 62;
    const yy = y + Math.floor(i / 3) * 22;
    pdf.setFillColor(240, 244, 248);
    pdf.rect(x, yy, 58, 18, "F");
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(100, 110, 120);
    pdf.text(naziv, x + 4, yy + 7);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 32, 36);
    pdf.text(String(vrednost), x + 4, yy + 15);
  });
  y += Math.ceil(kartice.length / 3) * 22 + 6;

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 110, 120);
  const linija = [
    kpi.skartStopa != null ? `škart ${kpi.skartStopa}%` : null,
    kpi.doradaStopa != null ? `dorada ${kpi.doradaStopa}%` : null,
    kpi.quality != null ? `kvalitet FPY ${kpi.quality}%` : null,
    kpi.rty != null && kpi.rty !== kpi.fpy ? `RTY ${kpi.rty}%` : null,
    kpi.performance != null && kpi.performance < 100 ? `performanse ${kpi.performance}%` : null,
  ].filter(Boolean).join(" · ");
  if (linija) {
    pdf.text(linija, 14, y);
    y += 6;
  }

  pdf.setDrawColor(200, 210, 220);
  pdf.line(14, y, W - 14, y);
  y += 8;

  return y;
}
