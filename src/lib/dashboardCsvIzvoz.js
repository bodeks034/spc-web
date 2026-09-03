/** Izvoz dashboard agregata i TOP NOK liste u CSV. */

function esc(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function red(kljuc, vrednost) {
  return `${esc(kljuc)},${esc(vrednost)}`;
}

export function dashboardUCsv(podaci) {
  if (!podaci) return "";

  const linije = [
    "Pokazatelj,Vrednost",
    red("Period (dana)", podaci.period),
    red("Od datuma", podaci.od),
    red("Filter deo", podaci.idDeoFilter || "svi"),
    red("FPY atributivne (%)", podaci.attr?.fpy ?? ""),
    red("DPMO atributivne", podaci.attr?.dpmo ?? ""),
    red("Kontrolisano atributivno", podaci.attr?.ukN ?? ""),
    red("NOK atributivno", podaci.attr?.ukNOK ?? ""),
    red("FPY merljive (%)", podaci.merljive?.fpy ?? ""),
    red("DPMO merljive", podaci.merljive?.dpmo ?? ""),
    red("Merenja", podaci.merljive?.merenja ?? ""),
    red("NOK merenja", podaci.merljive?.nok ?? ""),
    red("RTY pogona (%)", podaci.rtyPogon ?? ""),
    red("Škart", podaci.kpi?.skart ?? 0),
    red("Dorada", podaci.kpi?.dorada ?? 0),
    red("Eskalacije otvorene", podaci.eskalacije?.otvorene ?? 0),
    red("Merila upozorenja", podaci.merila?.upozorenja ?? 0),
    red("Aktivni nalozi", podaci.aktivniNalozi ?? 0),
    "",
    "TOP NOK,Izvor,Broj",
    ...(podaci.topNok || []).map((t) => [esc(t.naziv), esc(t.izvor), esc(t.count)].join(",")),
    "",
    "Trend datum,Izvor,FPY,OK,NOK",
    ...(podaci.trend || []).map((t) => [t.datum, "atributivne", t.fpy, t.ok, t.nok].map(esc).join(",")),
    ...(podaci.trendMer || []).map((t) => [t.datum, "merljive", t.fpy, t.ok, t.nok].map(esc).join(",")),
  ];

  return `\uFEFF${linije.join("\n")}`;
}

export function preuzmiDashboardCsv(podaci, ime = "dashboard") {
  const csv = dashboardUCsv(podaci);
  if (!csv) return false;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ime}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
