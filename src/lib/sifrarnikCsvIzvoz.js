/** Izvoz prikazane liste delova u CSV (Excel-friendly, sa BOM). */

const KOLONE = [
  ["id_deo", "ID dela"],
  ["naziv_dela", "Naziv"],
  ["karakteristika", "Karakteristika"],
  ["tip_kontrole", "Tip kontrole"],
  ["vozilo_katalog_id", "Linija"],
  ["sifra_vozila", "Šifra linije"],
  ["broj_crteza", "Broj crteža"],
  ["revizija", "Revizija"],
  ["kom_za_kontrolu", "Kom za kontrolu"],
  ["aktivan", "Aktivan"],
  ["_status", "Status šifrarnika"],
  ["_gu", "GU redova"],
  ["_greske", "Grešaka"],
  ["_barkod", "Ima barkod"],
  ["napomena", "Napomena"],
];

function esc(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function vrednost(deo, kljuc, statusFn, optsFn) {
  if (kljuc === "_status") return statusFn ? statusFn(deo) : "";
  if (kljuc === "_gu") return optsFn ? optsFn(deo).guBroj : "";
  if (kljuc === "_greske") return optsFn ? optsFn(deo).greskeBroj : "";
  if (kljuc === "_barkod") return optsFn ? (optsFn(deo).imaBarkod ? "da" : "ne") : "";
  if (kljuc === "aktivan") return deo.aktivan === false ? "ne" : "da";
  return deo[kljuc];
}

export function deloviUCsv(delovi, { statusFn = null, optsFn = null } = {}) {
  const header = KOLONE.map(([, label]) => esc(label)).join(",");
  const linije = (delovi || []).map((d) =>
    KOLONE.map(([kljuc]) => esc(vrednost(d, kljuc, statusFn, optsFn))).join(","),
  );
  return `\uFEFF${[header, ...linije].join("\n")}`;
}

export function preuzmiDeloviCsv(delovi, opts = {}, ime = "delovi") {
  const csv = deloviUCsv(delovi, opts);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ime}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return delovi?.length || 0;
}
