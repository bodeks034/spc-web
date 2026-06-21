import { useMemo } from "react";
import SkartDoradaOeePanel from "./SkartDoradaOeePanel.jsx";
import { izracunajOeeKpi } from "../lib/oeeKpi.js";

/**
 * KPI traka — uvek vidljiva (sažetak), proširenje po kliku.
 * Chipovi prikazuju ukupno za ceo ID deo (sve serije).
 */
export default function KpiSerijaPanel({
  C,
  vrednosti,
  ukupnoZaDeo,
  onChange,
  grupaAB,
  idDeo,
  otvoren,
  onToggle,
  onZatvori,
  kompakt = true,
  serijaSacuvana = false,
  kpiUpisan = false,
  snimaKpi = false,
  onAzurirajKpi,
  mozeAzurirati = false,
  onOtvoriHub,
  faiRezim = false,
  trakaJedanRed = false,
}) {
  const prikaz = ukupnoZaDeo || vrednosti || {};
  const kpi = useMemo(() => izracunajOeeKpi(prikaz), [prikaz]);
  const izPrve = Number(prikaz?.ispravno_iz_prve) || 0;
  const dorada = Number(prikaz?.dorada) || 0;
  const skart = Number(prikaz?.skart) || 0;
  const neusaglaseno = Number(prikaz?.neusaglaseno) || 0;
  const okPosle = Number(prikaz?.ok_nakon_dorade) || 0;
  const imaVrednosti = izPrve > 0 || dorada > 0 || skart > 0 || neusaglaseno > 0 || okPosle > 0;

  const zatvori = onZatvori || onToggle;
  const padTraka = trakaJedanRed ? "4px 6px" : (kompakt ? "7px 10px" : "9px 12px");
  const fsNaslov = trakaJedanRed ? 8 : (kompakt ? 10 : 11);
  const fsChip = trakaJedanRed ? 8 : 9;
  const padChip = trakaJedanRed ? "1px 4px" : "2px 6px";

  const chip = (label, val, boja) => (
    <span style={{
      background: `${boja}18`,
      border: `1px solid ${boja}40`,
      borderRadius: trakaJedanRed ? 3 : 4,
      padding: padChip,
      fontSize: fsChip,
      color: boja,
      fontWeight: 700,
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}>
      {label} {val}
    </span>
  );

  return (
    <>
      {otvoren && (
        <div
          role="presentation"
          onClick={zatvori}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: "rgba(0,0,0,0.42)",
          }}
        />
      )}
      <div style={{
        position: "relative",
        zIndex: otvoren ? 130 : 1,
        background: C.panel,
        border: `1px solid ${imaVrednosti || serijaSacuvana ? C.zelena + "40" : C.border}`,
        borderRadius: trakaJedanRed ? 6 : 8,
        marginBottom: trakaJedanRed ? 2 : (kompakt ? 4 : 8),
        flexShrink: 0,
        overflow: "hidden",
        boxShadow: otvoren ? "0 8px 28px rgba(0,0,0,0.35)" : "none",
      }}>
        <button
          type="button"
          onClick={onToggle}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: trakaJedanRed ? 4 : 8,
            padding: padTraka,
            minHeight: trakaJedanRed ? 28 : undefined,
            background: otvoren ? `${C.zelena}18` : "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit",
            position: "sticky",
            top: 0,
            zIndex: 2,
            flexWrap: trakaJedanRed ? "nowrap" : "wrap",
            overflow: trakaJedanRed ? "hidden" : "visible",
          }}
        >
          <span style={{
            color: C.zelena,
            fontSize: fsNaslov,
            fontWeight: 700,
            letterSpacing: trakaJedanRed ? 0.4 : 0.8,
            flexShrink: 0,
          }}>
            KPI
          </span>
          {!trakaJedanRed && (
            <span style={{ color: C.sivi, fontSize: 9, flexShrink: 0 }}>
              {idDeo ? `${idDeo} · sve serije` : `Serija ${grupaAB || "—"}`}
            </span>
          )}
          <span style={{
            display: "flex",
            gap: trakaJedanRed ? 3 : 4,
            flexWrap: trakaJedanRed ? "nowrap" : "wrap",
            flex: 1,
            minWidth: 0,
            overflow: trakaJedanRed ? "auto" : "visible",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}>
            {chip(trakaJedanRed ? "1." : "Iz prve", izPrve, C.zelena)}
            {chip("Neus.", neusaglaseno, C.zuta)}
            {chip("Dor.", dorada, C.narandzasta)}
            {chip("Šk.", skart, C.crvena)}
            {chip("OK↳", okPosle, C.plava)}
            {!trakaJedanRed && kpi.oee != null && (
              <span style={{ color: C.sivi, fontSize: 9, alignSelf: "center" }}>
                OEE {kpi.oee}%
              </span>
            )}
          </span>
          {serijaSacuvana && !trakaJedanRed && (
            <span style={{
              fontSize: 8,
              color: kpiUpisan ? C.zelena : C.zuta,
              fontWeight: 700,
              flexShrink: 0,
            }}>
              {kpiUpisan ? "u bazi" : "sačuvano"}
            </span>
          )}
          {onOtvoriHub && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOtvoriHub();
              }}
              title="KPI dorada po RN i datumu"
              style={{
                background: `${C.plava}18`,
                border: `1px solid ${C.plava}44`,
                borderRadius: trakaJedanRed ? 3 : 4,
                color: C.plava,
                fontSize: trakaJedanRed ? 7 : 8,
                fontWeight: 700,
                padding: trakaJedanRed ? "2px 4px" : "3px 6px",
                cursor: "pointer",
                flexShrink: 0,
                fontFamily: "inherit",
                lineHeight: 1.1,
              }}
            >
              {trakaJedanRed ? "RN" : "Dorada RN"}
            </button>
          )}
          <span style={{ color: C.sivi, fontSize: trakaJedanRed ? 10 : 12, flexShrink: 0, lineHeight: 1 }}>
            {otvoren ? (trakaJedanRed ? "▲" : "▲ zatvori") : "▸"}
          </span>
        </button>

        {otvoren && (
          <div
            role="presentation"
            onClick={zatvori}
            style={{
              padding: kompakt ? "0 8px 8px" : "0 12px 12px",
              borderTop: `1px solid ${C.border}`,
              cursor: "pointer",
              maxHeight: "min(52vh, 420px)",
              overflowY: "auto",
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ cursor: "default" }}
            >
              <div style={{
                color: C.sivi,
                fontSize: 9,
                margin: "8px 0 6px",
                lineHeight: 1.5,
              }}>
                Ukupno za <strong style={{ color: C.tekst }}>{idDeo || "deo"}</strong>
                {prikaz.brojSerija > 1 ? ` · ${prikaz.brojSerija} serije` : ""}
                <br />
                Iz prve <strong style={{ color: C.zelena }}>{izPrve}</strong>
                {" · "}Neus. <strong style={{ color: C.zuta }}>{neusaglaseno}</strong>
                {" · "}Dor. <strong style={{ color: C.narandzasta }}>{dorada}</strong>
                {" · "}Šk. <strong style={{ color: C.crvena }}>{skart}</strong>
                {" · "}OK posle dor. <strong style={{ color: C.plava }}>{okPosle}</strong>
              </div>
              <SkartDoradaOeePanel
                C={C}
                kompakt
                vrednosti={vrednosti}
                ukupno={ukupnoZaDeo}
                onChange={onChange}
                podnaslov={
                  faiRezim
                    ? "FAI u toku — KPI za seriju popuni posle merenja. Za doradu po RN koristi „Dorada RN“."
                    : serijaSacuvana
                      ? "Serija je snimljena — dopuni doradu/škart pa Ažuriraj KPI."
                      : "Popuni pre Sačuvaj seriju (sabira se u ukupno za deo)."
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
            <button
              type="button"
              onClick={zatvori}
              style={{
                width: "100%",
                marginTop: 8,
                background: C.hover,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.tekst,
                fontSize: 11,
                fontWeight: 700,
                padding: "10px 12px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Zatvori KPI panel ▲
            </button>
          </div>
        )}
      </div>
    </>
  );
}
