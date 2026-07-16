import { useRef, useState } from "react";
import ZajednickiDashboard from "../ZajednickiDashboard.jsx";
import AnalitikaKpiStrip from "./AnalitikaKpiStrip.jsx";
import AnalitikaSpcSnapshot from "./AnalitikaSpcSnapshot.jsx";
import AnalitikaPregledKpi from "./AnalitikaPregledKpi.jsx";
import { useAnalitikaFilter } from "../../lib/AnalitikaFilterContext.jsx";
import { stampajEkran, preuzmiEkranPdf } from "../../lib/listaEkranIzvoz.js";

const FORM_MAX = 960;

export default function AnalitikaPregledPanel({
  C,
  addToast,
  korisnik,
  onOtvori8D,
  onOtvoriNcr,
  modul,
  onOtvoriOee,
  onNavigacija,
}) {
  const filter = useAnalitikaFilter();
  const ivica = modul === "merljive" ? C.zelena : C.plava;
  const [busyPdf, setBusyPdf] = useState(false);
  const izvozRef = useRef(null);

  const BTN_SEC = {
    background: C.hover,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 11,
    fontWeight: 700,
    padding: "7px 12px",
    cursor: "pointer",
    fontFamily: "inherit",
  };

  const stampaj = async () => {
    try {
      await stampajEkran(izvozRef.current, { naslov: "Pregled", bgColor: C.bg });
    } catch (e) {
      addToast?.(e.message || "Štampa greška", "greska");
    }
  };

  const exportPdf = async () => {
    setBusyPdf(true);
    try {
      await preuzmiEkranPdf(izvozRef.current, {
        naslov: "Pregled",
        prefiksFajla: "Pregled",
        bgColor: C.bg,
      });
      addToast?.("✓ PDF preuzet", "uspeh");
    } catch (e) {
      addToast?.(e.message || "PDF greška", "greska");
    } finally {
      setBusyPdf(false);
    }
  };

  return (
    <div style={{ padding: 16, overflow: "auto", flex: 1, boxSizing: "border-box" }}>
      <div
        ref={izvozRef}
        style={{ width: "100%", maxWidth: FORM_MAX, margin: "0 auto", boxSizing: "border-box" }}
      >
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12,
        }}>
          <div style={{
            color: C.tekst,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.8,
          }}>
            PREGLED
            {modul === "atributivne" && (
              <span style={{ color: C.plava, fontSize: 10, marginLeft: 8, fontWeight: 600 }}>· ATR</span>
            )}
            {modul === "merljive" && (
              <span style={{ color: C.zelena, fontSize: 10, marginLeft: 8, fontWeight: 600 }}>· MER</span>
            )}
          </div>
          <div data-izvoz-hide style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={stampaj} style={BTN_SEC}>
              Štampaj
            </button>
            <button
              type="button"
              onClick={exportPdf}
              disabled={busyPdf}
              style={{
                ...BTN_SEC,
                border: `1px solid ${ivica}55`,
                color: ivica,
                opacity: busyPdf ? 0.6 : 1,
                cursor: busyPdf ? "wait" : "pointer",
              }}
            >
              {busyPdf ? "PDF…" : "PDF"}
            </button>
          </div>
        </div>

        <div style={{
          background: C.panel,
          border: `1px solid ${ivica}35`,
          borderRadius: 12,
          padding: "14px 14px 12px",
          marginBottom: 14,
          width: "100%",
          boxSizing: "border-box",
        }}>
          <AnalitikaSpcSnapshot
            C={C}
            modul={modul}
            onNavigacija={onNavigacija}
            uklopljen
          />
          <div style={{ borderTop: `1px solid ${C.border}`, margin: "12px 0 10px" }} />
          <AnalitikaPregledKpi
            C={C}
            modul={modul}
            onNavigacija={onNavigacija}
          />
        </div>

        <div style={{ width: "100%", boxSizing: "border-box" }}>
          <ZajednickiDashboard
            C={C}
            addToast={addToast}
            korisnik={korisnik}
            onOtvori8D={onOtvori8D}
            onOtvoriNcr={onOtvoriNcr}
            filterIdDeo={filter?.idDeo}
            filterPeriod={filter?.period}
            filterLinija={filter?.linija}
            filterSmena={filter?.smena}
            sakrijFilterTraku
            sakrijNaslov
            modul={modul}
            onNavigacija={onNavigacija}
            sakrijKpiSest
          />
        </div>

        <AnalitikaKpiStrip
          C={C}
          modul={modul}
          filterIdDeo={filter?.idDeo}
          filterPeriod={filter?.period}
          filterSmena={filter?.smena}
          onDetaljiOee={onOtvoriOee}
        />
      </div>
    </div>
  );
}
