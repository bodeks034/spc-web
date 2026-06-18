/** PDF predaja smene — škart/KPI, SPC alarmi, otvoreni 8D. */

function dISO() {
  return new Date().toISOString().split("T")[0];
}

async function fetchPredajaPodataka(supabase, { datum, smena, modul }) {
  const sm = Number(smena) || 1;
  const out = {
    datum,
    smena: sm,
    modul,
    merenja: { n: 0, ok: 0, nok: 0, rty: 0, dpmo: 0 },
    skartKpi: null,
    alarmi: [],
    osmd: [],
    topNok: [],
  };

  if (modul === "merljive") {
    const { data } = await supabase.from("merenja_varijabilna")
      .select("status,pozicija,id_deo")
      .eq("datum", datum).eq("smena", sm);
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
    const { data } = await supabase.from("kontrolni_log")
      .select("ukupno_merenja,ok_kolicina,nok_kolicina,greska_naziv,id_deo,naziv_dela")
      .eq("datum", datum).eq("smena", sm);
    const rows = data || [];
    const n = rows.reduce((s, r) => s + (r.ukupno_merenja || 0), 0);
    const nok = rows.reduce((s, r) => s + (r.nok_kolicina || 0), 0);
    const ok = rows.reduce((s, r) => s + (r.ok_kolicina || 0), 0);
    out.merenja = {
      n, ok, nok,
      rty: n > 0 ? +((ok / n) * 100).toFixed(2) : 0,
      dpmo: n > 0 ? Math.round((nok / n) * 1e6) : 0,
    };
    const g = {};
    rows.forEach((r) => {
      if (r.greska_naziv && r.greska_naziv !== "OK") {
        g[r.greska_naziv] = (g[r.greska_naziv] || 0) + (r.nok_kolicina || 0);
      }
    });
    out.topNok = Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }

  try {
    const { data: kpi } = await supabase.from("kpi_unos")
      .select("ukupno_kom,skart_kom,dorada_kom,oee,planirano_kom")
      .eq("datum", datum).eq("smena", sm).eq("modul", modul);
    if (kpi?.length) {
      out.skartKpi = kpi.reduce((acc, r) => ({
        ukupno: (acc.ukupno || 0) + (r.ukupno_kom || 0),
        skart: (acc.skart || 0) + (r.skart_kom || 0),
        dorada: (acc.dorada || 0) + (r.dorada_kom || 0),
      }), {});
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

  return out;
}

function pdfSekcija(pdf, y, naslov, W) {
  if (y > 265) { pdf.addPage(); y = 20; }
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 32, 36);
  pdf.text(naslov, 14, y);
  return y + 7;
}

export async function generisiPredajaSmenePdf(supabase, {
  korisnik,
  smena,
  modul = "merljive",
  addToast,
}) {
  const datum = dISO();
  const pod = await fetchPredajaPodataka(supabase, { datum, smena, modul });

  if (modul === "merljive" && pod.merenja.n === 0) {
    addToast?.("Nema merljivih merenja za ovu smenu danas.", "greska");
    return;
  }
  if (modul === "atributivne" && pod.merenja.n === 0) {
    addToast?.("Nema atributivnih unosa za ovu smenu danas.", "greska");
    return;
  }

  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(28, 35, 51);
  pdf.rect(0, 0, W, 42, "F");
  pdf.setTextColor(88, 166, 255);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("PREDAJA SMENE — KVALITET", 14, 14);
  pdf.setTextColor(200, 210, 230);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${modul === "merljive" ? "Merljive" : "Atributivne"} · smena ${smena} · ${datum}`, 14, 24);
  pdf.text(`Generisao: ${korisnik?.ime || "—"} · ${new Date().toLocaleString("sr-RS")}`, 14, 32);
  pdf.text("Dokument: škart/KPI · SPC alarmi · otvoreni 8D", 14, 38);

  let y = 52;
  y = pdfSekcija(pdf, y, "STATISTIKA SMENE", W);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(60, 70, 80);
  [
    `Ukupno: ${pod.merenja.n} · OK: ${pod.merenja.ok} · NOK: ${pod.merenja.nok}`,
    `RTY: ${pod.merenja.rty}% · DPMO: ${pod.merenja.dpmo.toLocaleString()}`,
  ].forEach((ln) => { pdf.text(ln, 14, y); y += 5; });

  if (pod.skartKpi) {
    y += 3;
    pdf.text(
      `Škart (KPI): ${pod.skartKpi.skart || 0} kom · Dorada: ${pod.skartKpi.dorada || 0} · Ukupno serija: ${pod.skartKpi.ukupno || 0}`,
      14, y,
    );
    y += 8;
  }

  if (pod.topNok.length) {
    y = pdfSekcija(pdf, y, "TOP NOK / ŠKART", W);
    pod.topNok.forEach(([naziv, cnt], i) => {
      pdf.text(`${i + 1}. ${naziv} — ${cnt}×`, 14, y);
      y += 5;
    });
    y += 4;
  }

  y = pdfSekcija(pdf, y, `SPC ALARMI (${pod.alarmi.length})`, W);
  if (!pod.alarmi.length) {
    pdf.setTextColor(100, 120, 100);
    pdf.text("Nema otvorenih alarma za danas ✓", 14, y);
    y += 8;
  } else {
    pod.alarmi.forEach((a) => {
      if (y > 270) { pdf.addPage(); y = 20; }
      pdf.setTextColor(180, 50, 50);
      pdf.text(
        `#${a.id} ${a.id_deo} · ${a.tip_karte || ""} ${a.pozicija || ""} · ${a.pravilo || ""} [${a.status}]`,
        14, y,
      );
      y += 5;
    });
    y += 4;
  }

  y = pdfSekcija(pdf, y, `OTVORENI 8D (${pod.osmd.length})`, W);
  if (!pod.osmd.length) {
    pdf.setTextColor(100, 120, 100);
    pdf.text("Nema otvorenih 8D izveštaja ✓", 14, y);
  } else {
    pod.osmd.forEach((d) => {
      if (y > 270) { pdf.addPage(); y = 20; }
      pdf.setTextColor(60, 70, 80);
      const opis = String(d.d2_opis_problema || "").substring(0, 70);
      pdf.text(`#${d.id} ${d.id_deo} · ${d.status} — ${opis}`, 14, y);
      y += 5;
    });
  }

  pdf.setFontSize(8);
  pdf.setTextColor(140, 150, 160);
  pdf.text("Potpis predaje smene: _________________________  Potpis primio: _________________________", 14, 285);

  pdf.save(`Predaja_smene_${modul}_${smena}_${datum}.pdf`);
  addToast?.("✓ PDF predaja smene", "uspeh");
}

export { fetchPredajaPodataka, dISO as dIsoPredaja };
