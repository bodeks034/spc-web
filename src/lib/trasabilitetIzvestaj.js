/** Trasabilitet — merenja, KPI, log za ID delo / sesiju. */

export async function ucitajTrasabilitet(supabase, { idDeo, sesijaId, datumOd, datumDo }) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return { merenja: [], kpi: [], log: [], greska: "Unesite ID dela" };

  let qMer = supabase.from("merenja_varijabilna")
    .select("*")
    .eq("id_deo", id)
    .order("created_at", { ascending: true });
  if (sesijaId) qMer = qMer.eq("sesija_id", sesijaId);
  if (datumOd) qMer = qMer.gte("datum", datumOd);
  if (datumDo) qMer = qMer.lte("datum", datumDo);

  let qKpi = supabase.from("kpi_unos")
    .select("*")
    .eq("id_deo", id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (sesijaId) qKpi = qKpi.eq("sesija_id", sesijaId);

  let qLog = supabase.from("kontrolni_log")
    .select("datum,smena,status,ok_kolicina,nok_kolicina,id_deo,naziv_dela,greska_naziv,created_at,sesija_id")
    .eq("id_deo", id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (sesijaId) qLog = qLog.eq("sesija_id", sesijaId);

  const [merRes, kpiRes, logRes] = await Promise.all([qMer, qKpi, qLog]);

  if (merRes.error) return { greska: merRes.error.message };
  return {
    idDeo: id,
    sesijaId: sesijaId || null,
    merenja: merRes.data || [],
    kpi: kpiRes.data || [],
    log: logRes.data || [],
  };
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
export async function ucitajTrasabilitetLinijaMer(supabase, { idDeo, smena, limit = 25 }) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return { merenja: [], greska: "Unesite ID dela" };

  const od = new Date();
  od.setDate(od.getDate() - 7);
  const datumOd = od.toISOString().split("T")[0];

  let q = supabase.from("merenja_varijabilna")
    .select("datum,smena,pozicija,vrednost_raw,status,sifra_merenja,created_at")
    .eq("id_deo", id)
    .gte("datum", datumOd)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (smena) q = q.eq("smena", String(smena));

  const { data, error } = await q;
  return {
    idDeo: id,
    smena: smena || null,
    merenja: data || [],
    greska: error?.message || null,
  };
}

export async function preuzmiTrasabilitetPdf(podaci, C) {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  let y = margin;

  const line = (txt, size = 10, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(String(txt), 180);
    for (const ln of lines) {
      if (y > 280) { pdf.addPage(); y = margin; }
      pdf.text(ln, margin, y);
      y += size * 0.45;
    }
    y += 2;
  };

  line("SPC — TRASABILITET", 14, true);
  line(`ID delo: ${podaci.idDeo}`, 11, true);
  if (podaci.sesijaId) line(`Sesija: ${podaci.sesijaId}`, 9);
  line(`Datum izveštaja: ${new Date().toLocaleString("sr-RS")}`, 9);
  y += 4;

  line(`Merljiva merenja (${podaci.merenja.length})`, 11, true);
  podaci.merenja.slice(0, 80).forEach(m => {
    line(
      `${m.datum} S${m.smena} · ${m.pozicija} · ${m.vrednost_raw} · ${m.status} · ${m.kontrolor || ""}`,
      8,
    );
  });
  if (podaci.merenja.length > 80) line(`… +${podaci.merenja.length - 80} redova u bazi`, 8);

  y += 4;
  line(`KPI unosi (${podaci.kpi.length})`, 11, true);
  podaci.kpi.slice(0, 15).forEach(k => {
    line(
      `${k.datum} S${k.smena} · serija ${k.serija || "—"} · škart ${k.skart_kom || 0} · OEE ${k.oee_pct ?? "—"}%`,
      8,
    );
  });

  y += 4;
  line(`Atributivni log (${podaci.log.length})`, 11, true);
  podaci.log.slice(0, 20).forEach(l => {
    line(`${l.datum} · ${l.status} · OK ${l.ok_kolicina} NOK ${l.nok_kolicina}`, 8);
  });

  pdf.save(`trasabilitet_${podaci.idDeo}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
