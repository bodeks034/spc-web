import { dodajPdfBrendZaglavlje, dodajPdfBrendPodnozje, PDF_BREND } from "./pdfBrending.js";
import { registrujPdfFontLatin, PDF_FONT_SR } from "./pdfFontSr.js";
import { opisKlaseDobavljaca } from "./ocenaDobavljaca.js";

const M = 14;

function esc(v) {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fmt(v) {
  return Number(v || 0).toLocaleString("sr-RS");
}

function statusDobavljaca(d) {
  return d?.aktivan === false ? "Neaktivan" : "Aktivan";
}

function safeIme(v) {
  return String(v || "dobavljac").replace(/[^\w.-]+/g, "_").slice(0, 35);
}

function pdfRed(pdf, y, tekst, bold = false) {
  if (y > 275) {
    pdf.addPage();
    y = 18;
  }
  pdf.setFont(PDF_FONT_SR, bold ? "bold" : "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(15, 23, 42);
  pdf.text(String(tekst), M, y, { maxWidth: 182 });
  return y + 5;
}

function pdfNaslov(pdf, y, tekst) {
  if (y > 265) {
    pdf.addPage();
    y = 18;
  }
  pdf.setFillColor(...PDF_BREND.plava);
  pdf.rect(M, y, 182, 7, "F");
  pdf.setFont(PDF_FONT_SR, "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.text(tekst, M + 2, y + 5);
  return y + 11;
}

function fotoNokRedovi(kontrole = []) {
  return (kontrole || []).filter((r) => String(r?.foto_nok || "").startsWith("data:image"));
}

function pdfFotoNokGalerija(pdf, y, kontrole = []) {
  const saFotkom = fotoNokRedovi(kontrole).slice(0, 12);
  if (!saFotkom.length) return y;

  y = pdfNaslov(pdf, y, `FOTO NOK DELA (${saFotkom.length})`);
  const colW = 88;
  const imgH = 52;
  let col = 0;

  for (const r of saFotkom) {
    if (y + imgH + 14 > 280) {
      pdf.addPage();
      y = 18;
      col = 0;
    }
    const x = M + col * (colW + 6);
    try {
      const fmtImg = /image\/png/i.test(r.foto_nok) ? "PNG" : "JPEG";
      pdf.addImage(r.foto_nok, fmtImg, x, y, colW, imgH);
    } catch {
      pdf.setDrawColor(180, 180, 180);
      pdf.rect(x, y, colW, imgH);
      pdf.setFontSize(7);
      pdf.text("Slika nije dostupna", x + 4, y + 26);
    }
    pdf.setFont(PDF_FONT_SR, "normal");
    pdf.setFontSize(6);
    pdf.setTextColor(15, 23, 42);
    const potpis = [
      r.datum || "",
      r.sifra_materijala || r.id_deo || "",
      r.broj_lota || "",
      r.defekt || r.foto_komentar || "",
    ].filter(Boolean).join(" · ");
    pdf.text(potpis.slice(0, 55), x, y + imgH + 4, { maxWidth: colW });

    col += 1;
    if (col >= 2) {
      col = 0;
      y += imgH + 12;
    }
  }
  if (col !== 0) y += imgH + 12;
  return y + 2;
}

export async function preuzmiIzvestajDobavljacPdf(podaci) {
  const jspdfMod = await import("jspdf");
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await registrujPdfFontLatin(pdf);
  const d = podaci.dobavljac || {};
  const s = podaci.stat || {};
  let y = await dodajPdfBrendZaglavlje(pdf, {
    naslov: "Izveštaj kvaliteta dobavljača",
    podnaslov: `${d.sifra_dobavljaca || ""} · ${d.naziv_dobavljaca || ""} · ${podaci.period} dana`,
  });
  y += 4;

  y = pdfNaslov(pdf, y, "PODACI O DOBAVLJAČU");
  y = pdfRed(pdf, y, `Šifra: ${d.sifra_dobavljaca || "—"}    Naziv: ${d.naziv_dobavljaca || "—"}`, true);
  y = pdfRed(pdf, y, `Država: ${d.drzava || "—"}    Grad: ${d.grad || "—"}    Status: ${statusDobavljaca(d)}`);
  y = pdfRed(pdf, y, `Period od: ${podaci.datumOd}    Generisano: ${new Date().toLocaleString("sr-RS")}`);
  y += 2;

  y = pdfNaslov(pdf, y, "KPI PRIJEMNE KONTROLE");
  y = pdfRed(pdf, y, `Prijema: ${fmt(s.prijema)}    Primljeno: ${fmt(s.primljeno)}    Kontrolisano: ${fmt(s.kontrolisano)}`, true);
  y = pdfRed(pdf, y, `OK: ${fmt(s.ok)}    NOK: ${fmt(s.nok)}    OK stopa: ${s.okStopa ?? 0}%    PPM: ${fmt(s.ppm)}`);
  y = pdfRed(pdf, y, `Prihvaćeni prijemi: ${s.prihvatPrijema ?? 0}%    Uslovno: ${fmt(s.uslovno)}    Odbijeno: ${fmt(s.odbijeno)}`);
  y += 2;

  const oc = podaci.predlogOcene || {};
  if (oc.kvalitet != null) {
    y = pdfNaslov(pdf, y, "OCENA DOBAVLJAČA");
    y = pdfRed(pdf, y, `Kvalitet (60%): ${oc.kvalitet}    Predlog ukupno: ${oc.ukupno}    Klasa: ${oc.klasa}`, true);
    y = pdfRed(pdf, y, opisKlaseDobavljaca(oc.klasa));
    y = pdfRed(pdf, y, "Ponderi: kvalitet 60% + isporuka 20% + dokumentacija 10% + reakcija 10%. Bez automatske blokade.");
    if (podaci.istorijaOcena?.[0]) {
      const z = podaci.istorijaOcena[0];
      y = pdfRed(pdf, y, `Poslednja sačuvana: ${z.ukupna_ocena} (${z.klasa}) · status ${z.status} · period do ${z.period_do}`);
    }
    y += 2;
  }

  if (podaci.materijali?.length) {
    y = pdfNaslov(pdf, y, "KVALITET PO MATERIJALU / DELU");
    for (const m of podaci.materijali.slice(0, 35)) {
      y = pdfRed(pdf, y, `${m.sifra_materijala} · ${m.naziv_materijala || "—"} · kontrolisano ${fmt(m.kontrolisano)} · NOK ${fmt(m.nok)} · OK ${m.okStopa}%`);
    }
    y += 2;
  }

  if (podaci.defekti?.length) {
    y = pdfNaslov(pdf, y, "PARETO DEFEKATA");
    for (const dft of podaci.defekti.slice(0, 20)) {
      y = pdfRed(pdf, y, `${dft.defekt}: ${fmt(dft.kolicina)} NOK`);
    }
    y += 2;
  }

  if (podaci.kontrole?.length) {
    y = pdfNaslov(pdf, y, `PRIJEMNE KONTROLE (${podaci.kontrole.length})`);
    for (const r of podaci.kontrole.slice(0, 40)) {
      y = pdfRed(
        pdf,
        y,
        `${r.datum || "—"} · ${r.sifra_materijala || r.id_deo || "—"} · lot ${r.broj_lota || "—"} · OK ${fmt(r.ok_kolicina)} / NOK ${fmt(r.nok_kolicina)} · ${r.status || "—"} · foto ${r.foto_nok ? "DA" : "NE"}`,
      );
    }
    y += 2;
  }

  y = pdfFotoNokGalerija(pdf, y, podaci.kontrole);

  dodajPdfBrendPodnozje(pdf);
  const filename = `TRI-CORE_Izvestaj_dobavljac_${safeIme(d.sifra_dobavljaca)}_${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(filename);
  return filename;
}

export function buildIzvestajDobavljacPrintHtml(podaci) {
  const d = podaci.dobavljac || {};
  const s = podaci.stat || {};
  const fotoRedovi = fotoNokRedovi(podaci.kontrole);
  const materijali = (podaci.materijali || []).map((m) =>
    `<tr><td>${esc(m.sifra_materijala)}</td><td>${esc(m.naziv_materijala)}</td><td>${fmt(m.kontrolisano)}</td><td>${fmt(m.ok)}</td><td>${fmt(m.nok)}</td><td>${esc(m.okStopa)}%</td></tr>`,
  ).join("");
  const kontrole = (podaci.kontrole || []).map((r) =>
    `<tr><td>${esc(r.datum)}</td><td>${esc(r.sifra_materijala || r.id_deo || "—")}</td><td>${esc(r.broj_lota || "—")}</td><td>${fmt(r.kontrolisano)}</td><td>${fmt(r.ok_kolicina)}</td><td>${fmt(r.nok_kolicina)}</td><td>${r.foto_nok ? "DA" : "—"}</td><td>${esc(r.status)}</td></tr>`,
  ).join("");
  const fotoHtml = fotoRedovi.map((r) => `
    <figure class="foto-kartica">
      <img src="${esc(r.foto_nok)}" alt="NOK deo"/>
      <figcaption>
        <div><b>${esc(r.datum || "—")}</b> · ${esc(r.sifra_materijala || r.id_deo || "—")}</div>
        <div>Lot: ${esc(r.broj_lota || "—")} · Status: ${esc(r.status || "—")}</div>
        <div>${esc(r.defekt || r.foto_komentar || "")}</div>
      </figcaption>
    </figure>`).join("");

  const oc = podaci.predlogOcene || {};
  const ocenaHtml = oc.kvalitet != null ? `
<h2>Ocena dobavljača</h2>
<div class="kpi">
${[["Kvalitet 60%", oc.kvalitet], ["Predlog ukupno", oc.ukupno], ["Klasa", oc.klasa], ["Opis", opisKlaseDobavljaca(oc.klasa)]].map(([l, v]) => `<div class="box"><div class="lab">${esc(l)}</div><b>${esc(v)}</b></div>`).join("")}
</div>
<p>Ponderi: kvalitet 60% + isporuka 20% + dokumentacija 10% + reakcija 10%. Bez automatske blokade.</p>` : "";

  return `<!doctype html><html lang="sr"><head><meta charset="utf-8"><title>Izveštaj dobavljača</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;color:#172033;margin:24px;font-size:11px}h1{color:#2c5282;font-size:18px}h2{font-size:12px;color:#2c5282;border-bottom:2px solid #2c5282;padding-bottom:4px;margin-top:20px}.meta,.kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.box{background:#f1f5f9;padding:9px;border-radius:6px}.lab{font-size:9px;color:#64748b;text-transform:uppercase}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:6px}th{background:#1e293b;color:#fff;text-align:left}.foto-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:10px}.foto-kartica{margin:0;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;background:#fff}.foto-kartica img{width:100%;height:180px;object-fit:cover;display:block}figcaption{padding:8px;font-size:10px;line-height:1.4}@media print{body{margin:10mm}.foto-kartica img{height:140px}}</style>
</head><body><h1>Izveštaj kvaliteta dobavljača</h1>
<div class="meta"><div class="box"><div class="lab">Šifra</div>${esc(d.sifra_dobavljaca)}</div><div class="box"><div class="lab">Naziv</div>${esc(d.naziv_dobavljaca)}</div><div class="box"><div class="lab">Status</div>${statusDobavljaca(d)}</div><div class="box"><div class="lab">Država</div>${esc(d.drzava || "—")}</div><div class="box"><div class="lab">Grad</div>${esc(d.grad || "—")}</div><div class="box"><div class="lab">Period</div>${esc(podaci.period)} dana</div></div>
<h2>KPI prijemne kontrole</h2><div class="kpi">
${[["Prijema",s.prijema],["Primljeno",fmt(s.primljeno)],["Kontrolisano",fmt(s.kontrolisano)],["OK stopa",`${s.okStopa}%`],["PPM",fmt(s.ppm)],["Odbijeno",s.odbijeno]].map(([l,v])=>`<div class="box"><div class="lab">${l}</div><b>${v}</b></div>`).join("")}</div>
${ocenaHtml}
${materijali ? `<h2>Kvalitet po materijalu / delu</h2><table><thead><tr><th>Šifra</th><th>Naziv</th><th>Kontrolisano</th><th>OK</th><th>NOK</th><th>OK %</th></tr></thead><tbody>${materijali}</tbody></table>` : ""}
${kontrole ? `<h2>Prijemne kontrole</h2><table><thead><tr><th>Datum</th><th>Materijal/deo</th><th>Lot</th><th>Kontrolisano</th><th>OK</th><th>NOK</th><th>Foto NOK</th><th>Status</th></tr></thead><tbody>${kontrole}</tbody></table>` : ""}
${fotoHtml ? `<h2>Foto NOK dela (${fotoRedovi.length})</h2><div class="foto-grid">${fotoHtml}</div>` : ""}
</body></html>`;
}

export function stampajIzvestajDobavljac(podaci) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) throw new Error("Pregledač je blokirao prozor za štampu. Dozvolite pop-up.");
  w.document.write(buildIzvestajDobavljacPrintHtml(podaci));
  w.document.close();
  w.onload = () => setTimeout(() => w.print(), 500);
}
