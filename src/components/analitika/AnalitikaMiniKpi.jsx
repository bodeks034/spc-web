import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { fetchZajednickiDashboard } from "../../lib/zajednickiDashboard.js";
import { useAnalitikaFilter } from "../../lib/AnalitikaFilterContext.jsx";

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
  const [podaci, setPodaci] = useState(null);
  const [loading, setLoading] = useState(true);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchZajednickiDashboard(supabase, {
        period: Number(filter?.period || 7),
        idDeo: filter?.idDeo || undefined,
        linija: filter?.linija || undefined,
        smena: filter?.smena || undefined,
      });
      setPodaci(d);
    } catch {
      setPodaci(null);
    } finally {
      setLoading(false);
    }
  }, [filter?.period, filter?.idDeo, filter?.linija, filter?.smena]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  useEffect(() => {
    const ch = supabase.channel("analitika_mini_kpi")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "kontrolni_log" }, ucitaj)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "merenja_varijabilna" }, ucitaj)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ucitaj]);

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
      ) : !podaci ? (
        <span style={{ color: C.border, fontSize: 10 }}>—</span>
      ) : (
        <>
          {modul !== "merljive" && (
            <Chip
              label="FPY ATR"
              value={`${podaci.attr.fpy ?? podaci.attr.rty}%`}
              boja={C.plava}
              C={C}
              onClick={nav({ tab: "karte" })}
              title="SPC karte atributivno"
            />
          )}
          {modul !== "atributivne" && (
            <Chip
              label="FPY MER"
              value={`${podaci.merljive.fpy ?? podaci.merljive.rty}%`}
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
            label="OEE"
            value={podaci.oee.prosek != null ? `${podaci.oee.prosek}%` : "—"}
            boja={podaci.oee.prosek >= 65 ? C.zelena : podaci.oee.prosek >= 40 ? C.zuta : C.crvena}
            C={C}
            onClick={nav({ tab: "oee" })}
            title="OEE tab"
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
        onClick={ucitaj}
        disabled={loading}
        title="Osveži"
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
