import { useAnalitikaFilter } from "../../lib/AnalitikaFilterContext.jsx";
import { useDashboardPodaci } from "../../lib/useDashboardPodaci.js";

function fpyPrikaz(fpy, rty, imaUzorka) {
  if (!imaUzorka) return "—";
  const n = Number(fpy ?? rty);
  return Number.isFinite(n) ? `${n}%` : "—";
}

function Chip({ label, value, boja, C, onClick, title }) {
  const klik = typeof onClick === "function";
  const Tag = klik ? "button" : "div";
  return (
    <Tag
      type={klik ? "button" : undefined}
      onClick={onClick}
      title={title}
      style={{
        flexShrink: 0,
        background: C.bg,
        border: `1px solid ${boja}40`,
        borderRadius: 8,
        padding: "5px 10px",
        cursor: klik ? "pointer" : "default",
        fontFamily: "inherit",
        textAlign: "left",
      }}
    >
      <div style={{ color: C.sivi, fontSize: 8, letterSpacing: 0.8, marginBottom: 2 }}>{label}</div>
      <div style={{ color: boja, fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </Tag>
  );
}

/** Kompaktni KPI u hederu — samo na PREGLED tabu. */
export default function AnalitikaMiniKpi({ C, modul, onNavigacija, kompakt }) {
  const filter = useAnalitikaFilter();
  const { podaci, loading, greska, osvezavaSe, osvezi } = useDashboardPodaci({
    period: Number(filter?.period || 7),
    idDeo: filter?.idDeo || "",
    linija: filter?.linija || "",
    smena: filter?.smena ?? "",
  });

  const nav = onNavigacija
    ? (dest) => () => onNavigacija(dest)
    : () => undefined;

  const pad = kompakt ? "6px 8px" : "8px 18px";

  return (
    <div style={{
      padding: pad,
      background: `${C.plava}06`,
      borderBottom: `1px solid ${C.border}`,
      display: "flex",
      gap: 8,
      alignItems: "center",
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      <span style={{ color: C.sivi, fontSize: 8, letterSpacing: 1, flexShrink: 0 }}>PREGLED</span>
      {loading ? (
        <span style={{ color: C.border, fontSize: 10 }}>…</span>
      ) : greska && !podaci ? (
        <span role="alert" style={{ color: C.crvena, fontSize: 10 }} title={greska}>
          greška — klikni ↻
        </span>
      ) : !podaci ? (
        <span style={{ color: C.border, fontSize: 10 }}>—</span>
      ) : (
        <>
          {modul !== "merljive" && (
            <Chip
              label="FPY ATR"
              value={fpyPrikaz(podaci.attr.fpy, podaci.attr.rty, Number(podaci.attr?.ukN) > 0)}
              boja={C.plava}
              C={C}
              onClick={nav({ tab: "karte" })}
              title="SPC karte atributivno"
            />
          )}
          {modul !== "atributivne" && (
            <Chip
              label="FPY MER"
              value={fpyPrikaz(podaci.merljive.fpy, podaci.merljive.rty, Number(podaci.merljive?.merenja) > 0)}
              boja={C.zelena}
              C={C}
              onClick={nav({ tab: "karte" })}
              title="SPC karte merljivo"
            />
          )}
          <Chip
            label="RTY"
            value={podaci.rtyPogon != null ? `${podaci.rtyPogon}%` : "—"}
            boja={C.narandzasta}
            C={C}
            onClick={nav({ tab: "karte", spcTip: "rty" })}
            title="FPY / RTY trend"
          />
          <Chip
            label="ŠKART"
            value={String(podaci.kpi?.skart ?? 0)}
            boja={(podaci.kpi?.skart || 0) > 0 ? C.crvena : C.tekst}
            C={C}
            title="Škart iz KPI unosa"
          />
          {podaci.alarmi?.length > 0 && (
            <Chip
              label="ALARMI"
              value={podaci.alarmi.length}
              boja={C.crvena}
              C={C}
              onClick={nav({ tab: "odobrenja" })}
              title="Odobrenja QA"
            />
          )}
          {podaci.eskalacije?.otvorene > 0 && (
            <Chip
              label="ESK"
              value={podaci.eskalacije.otvorene}
              boja={C.zuta}
              C={C}
              onClick={nav({ tab: "eskalacije" })}
              title="Eskalacije"
            />
          )}
        </>
      )}
      <button
        type="button"
        onClick={osvezi}
        disabled={osvezavaSe}
        title="Osveži"
        aria-label="Osveži KPI"
        style={{
          flexShrink: 0,
          marginLeft: "auto",
          background: C.hover,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          color: C.sivi,
          fontSize: 10,
          padding: "4px 8px",
          cursor: "pointer",
        }}
      >
        ↻
      </button>
    </div>
  );
}
