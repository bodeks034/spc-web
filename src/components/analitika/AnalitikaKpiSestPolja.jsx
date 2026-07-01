import { AnalitikaMetrika } from "./AnalitikaMetrika.jsx";

/** Šest KPI polja u jednom redu — puna širina roditelja (kao ostatak forme). */
export default function AnalitikaKpiSestPolja({ C, podaci, modul, onNavigacija }) {
  if (!podaci) return null;

  const kartice = [
    { id: "atr", label: "FPY ATR", value: `${podaci.attr.fpy ?? podaci.attr.rty}%`, boja: C.plava, sub: `DPMO ${podaci.attr.dpmo.toLocaleString()}` },
    { id: "mer", label: "FPY MER", value: `${podaci.merljive.fpy ?? podaci.merljive.rty}%`, boja: C.zelena, sub: `${podaci.merljive.merenja} mer.` },
    { id: "rty", label: "RTY", value: podaci.rtyPogon != null ? `${podaci.rtyPogon}%` : "—", boja: C.narandzasta, sub: podaci.fazeKvaliteta?.length > 1 ? "pogon" : "ukupno" },
    { id: "oee", label: "OEE", value: podaci.oee.prosek != null ? `${podaci.oee.prosek}%` : "—", boja: podaci.oee.prosek >= 65 ? C.zelena : podaci.oee.prosek >= 40 ? C.zuta : C.crvena, sub: podaci.oee.rty != null ? `RTY ${podaci.oee.rty}%` : (podaci.oee.imaKpi ? `${podaci.oee.kpiBroj} KPI` : "—") },
    { id: "esk", label: "ESK", value: podaci.eskalacije.otvorene, boja: C.zuta, sub: podaci.eskalacije.auto > 0 ? `${podaci.eskalacije.auto} auto` : "otv." },
    { id: "merila", label: "MERILA", value: podaci.merila.upozorenja, boja: podaci.merila.istekla ? C.crvena : podaci.merila.uskoro ? C.zuta : C.zelena, sub: podaci.merila.istekla ? `${podaci.merila.istekla} ist.` : `${podaci.merila.ukupno} akt.` },
  ];

  const redosled = modul === "atributivne"
    ? ["atr", "rty", "oee", "mer", "esk", "merila"]
    : modul === "merljive"
      ? ["mer", "rty", "oee", "atr", "esk", "merila"]
      : kartice.map((k) => k.id);

  const navMap = {
    atr: { tab: "karte" },
    mer: { tab: "karte" },
    rty: { tab: "karte", spcTip: "rty" },
    oee: { tab: "oee" },
    esk: { tab: "eskalacije" },
    merila: { tab: modul === "merljive" ? "msa" : "kalibracija" },
  };

  const titleMap = {
    atr: "SPC karte — atributivno",
    mer: "SPC karte — merljivo",
    rty: "FPY / RTY trend",
    oee: "OEE i KPI",
    esk: "Eskalacije",
    merila: modul === "merljive" ? "MSA / merila" : "Kalibracija merila",
  };

  const nav = onNavigacija
    ? (id) => () => onNavigacija(navMap[id])
    : () => undefined;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
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
            onClick={nav(k.id)}
            title={titleMap[id]}
          />
        );
      })}
    </div>
  );
}
