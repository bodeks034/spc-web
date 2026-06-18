import { useMemo } from "react";
import SkartDoradaOeePanel from "./SkartDoradaOeePanel.jsx";
import { izracunajOeeKpi } from "../lib/oeeKpi.js";

/**
 * KPI traka — uvek vidljiva (sažetak), proširenje po kliku.
 * Posle snimljene serije: dugme „Ažuriraj KPI“ za kasni unos škarta/dorade.
 */
export default function KpiSerijaPanel({
  C,
  vrednosti,
  onChange,
  grupaAB,
  otvoren,
  onToggle,
  kompakt = true,
  serijaSacuvana = false,
  kpiUpisan = false,
  snimaKpi = false,
  onAzurirajKpi,
  mozeAzurirati = false,
}) {
  const kpi = useMemo(() => izracunajOeeKpi(vrednosti || {}), [vrednosti]);
  const dorada = Number(vrednosti?.dorada) || 0;
  const skart = Number(vrednosti?.skart) || 0;
  const okPosle = Number(vrednosti?.ok_nakon_dorade) || 0;
  const imaVrednosti = dorada > 0 || skart > 0 || okPosle > 0;

  const chip = (label, val, boja) => (
    <span style={{
      background: `${boja}18`,
      border: `1px solid ${boja}40`,
      borderRadius: 4,
      padding: "2px 6px",
      fontSize: 9,
      color: boja,
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}>
      {label} {val}
    </span>
  );

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${imaVrednosti || serijaSacuvana ? C.zelena + "40" : C.border}`,
      borderRadius: 8,
      marginBottom: kompakt ? 4 : 8,
      flexShrink: 0,
      overflow: "hidden",
    }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: kompakt ? "7px 10px" : "9px 12px",
          background: otvoren ? `${C.zelena}10` : "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <span style={{ color: C.zelena, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, flexShrink: 0 }}>
          KPI
        </span>
        <span style={{ color: C.sivi, fontSize: 9, flexShrink: 0 }}>
          Serija {grupaAB || "—"}
        </span>
        <span style={{ display: "flex", gap: 4, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
          {chip("Dor.", dorada, C.narandzasta)}
          {chip("Šk.", skart, C.crvena)}
          {chip("OK↳", okPosle, C.plava)}
          {kpi.oee != null && (
            <span style={{ color: C.sivi, fontSize: 9, alignSelf: "center" }}>
              OEE {kpi.oee}%
            </span>
          )}
        </span>
        {serijaSacuvana && (
          <span style={{
            fontSize: 8,
            color: kpiUpisan ? C.zelena : C.zuta,
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {kpiUpisan ? "u bazi" : "sačuvano"}
          </span>
        )}
        <span style={{ color: C.sivi, fontSize: 12, flexShrink: 0 }}>
          {otvoren ? "▾" : "▸"}
        </span>
      </button>

      {otvoren && (
        <div style={{ padding: kompakt ? "0 8px 8px" : "0 12px 12px", borderTop: `1px solid ${C.border}` }}>
          <SkartDoradaOeePanel
            C={C}
            kompakt
            vrednosti={vrednosti}
            onChange={onChange}
            podnaslov={
              serijaSacuvana
                ? "Serija je snimljena — možeš dopuniti doradu/škart i kliknuti Ažuriraj KPI."
                : "Popuni pre Sačuvaj seriju (može i unapred, ili posle merenja)."
            }
          />
          {serijaSacuvana && onAzurirajKpi && (
            <button
              type="button"
              disabled={snimaKpi || !mozeAzurirati}
              onClick={onAzurirajKpi}
              style={{
                width: "100%",
                marginTop: 6,
                background: mozeAzurirati ? C.plava : C.hover,
                border: "none",
                borderRadius: 6,
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "9px 12px",
                cursor: mozeAzurirati && !snimaKpi ? "pointer" : "not-allowed",
                opacity: snimaKpi ? 0.7 : 1,
              }}
            >
              {snimaKpi ? "Snimam KPI…" : "Ažuriraj KPI (dorada / škart)"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
