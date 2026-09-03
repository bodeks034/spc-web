import LinijaHeaderChip from "./LinijaHeaderChip.jsx";

/**
 * Zajednički header chipovi: KPI + opcioni NCR + children + prebacivanje režima.
 * Modul-specifično (LOG/PRIJEM/merilo/MOM) ide u children.
 */
export default function LinijaHeaderAkcije({
  C,
  kompakt = false,
  jeLinija = false,
  onKpi,
  ncr = null,
  onPromeniRezim = null,
  children = null,
  afterRezim = null,
}) {
  return (
    <>
      {typeof onKpi === "function" && (
        <LinijaHeaderChip
          C={C}
          boja={C.zelena}
          aktivan
          onClick={onKpi}
          title="KPI dorada i škart po ID delu"
          stil={{ background: `${C.zelena}22`, border: `1px solid ${C.zelena}`, color: C.zelena }}
        >
          {kompakt ? "KPI" : "KPI dorada"}
        </LinijaHeaderChip>
      )}
      {ncr?.onClick && (
        <LinijaHeaderChip
          C={C}
          boja={C.crvena}
          aktivan
          onClick={ncr.onClick}
          title="Otvori NCR obrazac sa podacima sa linije"
          testId="ncr-linija-dugme"
          stil={{ background: `${C.crvena}22`, border: `1px solid ${C.crvena}`, color: C.crvena }}
        >
          NCR
        </LinijaHeaderChip>
      )}
      {children}
      {typeof onPromeniRezim === "function" && (
        <LinijaHeaderChip
          C={C}
          boja={jeLinija ? C.zelena : C.plava}
          aktivan
          onClick={() => onPromeniRezim(jeLinija ? "analitika" : "linija")}
          title={jeLinija ? "Modul 2 — Analitika" : "Modul 1 — Unos"}
          stil={{
            background: jeLinija ? `${C.zelena}22` : `${C.plava}22`,
            border: `1px solid ${jeLinija ? C.zelena : C.plava}`,
            color: jeLinija ? C.zelena : C.plava,
            padding: "1px 5px",
          }}
        >
          {kompakt
            ? (jeLinija ? "📊" : "🏭")
            : (jeLinija ? "📊 Modul 2 — Analitika" : "🏭 Modul 1 — Unos")}
        </LinijaHeaderChip>
      )}
      {afterRezim}
    </>
  );
}
