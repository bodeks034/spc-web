/** Snimanje KPI reda (škart, dorada, OEE) u tabelu kpi_unos. */

import { izracunajOeeKpi } from "./oeeKpi.js";

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
    serija: serija || null,
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
  if (sesija_id) {
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
  if (serija) q = q.eq("serija", String(serija).trim());
  if (radniNalog) q = q.eq("radni_nalog", radniNalog);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
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

export function agregirajKpiUnos(rows) {
  if (!rows?.length) return null;
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
  rows.forEach(r => {
    sum.planirano_kom = Math.max(sum.planirano_kom, r.planirano_kom || 0);
    sum.ukupno_kom += r.ukupno_kom || 0;
    sum.ispravno_iz_prve += r.ispravno_iz_prve || 0;
    sum.neusaglaseno += r.neusaglaseno || 0;
    sum.dorada += r.dorada || 0;
    sum.skart += r.skart || 0;
    sum.ok_nakon_dorade += r.ok_nakon_dorade || 0;
    sum.planirano_min += r.planirano_min || 0;
    sum.zastoj_min += r.zastoj_min || 0;
  });
  return {
    ...sum,
    brojUnosa: rows.length,
    kpi: izracunajOeeKpi({
      ...sum,
      planirano_kom: sum.planirano_kom || rows.reduce((m, r) => Math.max(m, r.planirano_kom || 0), 0),
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
    kpi.quality != null ? `kvalitet ${kpi.quality}%` : null,
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
