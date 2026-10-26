import { AnalitikaMetrika } from "./AnalitikaMetrika.jsx";
import { deltaTrenda } from "./Sparkline.jsx";

function fpyPrikaz(fpy, rty, imaUzorka) {
  if (!imaUzorka) return "—";
  const n = Number(fpy ?? rty);
  return Number.isFinite(n) ? `${n}%` : "—";
}

function dpmoPrikaz(dpmo, imaUzorka) {
  if (!imaUzorka || dpmo == null || !Number.isFinite(Number(dpmo))) return "DPMO —";
  return `DPMO ${Number(dpmo).toLocaleString()}`;
}

/** Šest KPI polja u jednom redu — puna širina roditelja (kao ostatak forme). */
export default function AnalitikaKpiSestPolja({ C, podaci, modul, onNavigacija }) {
  if (!podaci) return null;

  const skart = podaci.kpi?.skart ?? 0;
  const dorada = podaci.kpi?.dorada ?? 0;

  const trendAttr = podaci.trend || [];
  const trendMer = podaci.trendMer || [];
  const imaAttr = Number(podaci.attr?.ukN) > 0;
  const imaMer = Number(podaci.merljive?.merenja) > 0;

  const kartice = [
    { id: "atr", label: "FPY ATR", value: fpyPrikaz(podaci.attr.fpy, podaci.attr.rty, imaAttr), boja: C.plava, sub: dpmoPrikaz(podaci.attr.dpmo, imaAttr), trend: trendAttr, delta: deltaTrenda(trendAttr) },
    { id: "mer", label: "FPY MER", value: fpyPrikaz(podaci.merljive.fpy, podaci.merljive.rty, imaMer), boja: C.zelena, sub: `${podaci.merljive.merenja} mer.`, trend: trendMer, delta: deltaTrenda(trendMer) },
    { id: "rty", label: "RTY", value: podaci.rtyPogon != null ? `${podaci.rtyPogon}%` : "—", boja: C.narandzasta, sub: podaci.fazeKvaliteta?.length > 1 ? "pogon" : "ukupno" },
    { id: "skart", label: "ŠKART", value: String(skart), boja: skart > 0 ? C.crvena : C.tekst, sub: dorada > 0 ? `Dor. ${dorada}` : (podaci.kpi?.imaKpi ? `${podaci.kpi.kpiBroj} KPI` : "—") },
    { id: "esk", label: "ESK", value: podaci.eskalacije.otvorene, boja: C.zuta, sub: podaci.eskalacije.auto > 0 ? `${podaci.eskalacije.auto} auto` : "otv." },
    { id: "merila", label: "MERILA", value: podaci.merila.upozorenja, boja: podaci.merila.istekla ? C.crvena : podaci.merila.uskoro ? C.zuta : C.zelena, sub: podaci.merila.istekla ? `${podaci.merila.istekla} ist.` : `${podaci.merila.ukupno} akt.` },
  ];

  const redosled = modul === "atributivne"
    ? ["atr", "rty", "skart", "mer", "esk", "merila"]
    : modul === "merljive"
      ? ["mer", "rty", "skart", "atr", "esk", "merila"]
      : kartice.map((k) => k.id);

  const navMap = {
    atr: { tab: "karte" },
    mer: { tab: "karte" },
    rty: { tab: "karte", spcTip: "rty" },
    esk: { tab: "eskalacije" },
    merila: { tab: modul === "merljive" ? "msa" : "kalibracija" },
  };

  const titleMap = {
    atr: "SPC karte — atributivno",
    mer: "SPC karte — merljivo",
    rty: "FPY / RTY trend",
    skart: "Škart i dorada iz KPI unosa",
    esk: "Eskalacije",
    merila: modul === "merljive" ? "MSA / merila" : "Kalibracija merila",
  };

  const nav = onNavigacija
    ? (id) => () => (navMap[id] ? onNavigacija(navMap[id]) : undefined)
    : () => undefined;

  return (
    <div
      role="group"
      aria-label="Ključni pokazatelji"
      style={{
        display: "grid",
        // auto-fit umesto tvrdih 6 kolona — na telefonu se prelama u 2-3 kolone.
        gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
        gap: 6,
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      {redosled.map((id) => {
        const k = kartice.find((c) => c.id === id);
        if (!k) return null;
        return (
          <AnalitikaMetrika
            key={k.id}
            label={k.label}
            value={k.value}
            boja={k.boja}
            C={C}
            sub={k.sub}
            uRedu
            trend={k.trend}
            delta={k.delta}
            onClick={nav(k.id)}
            title={titleMap[id]}
          />
        );
      })}
    </div>
  );
}
