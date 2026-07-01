import { yDomainRangeChart, yDomainSpc } from "../../lib/varijabilneSpcStats.js";
import { graniceKarakteristike, formatVrednostKarte, decStepenUDms, isStepen, jedinicaSpcOsi } from "../../lib/varijabilneUtils.js";
import { LAB_FPY_KRATKO, LAB_FPY_TREND } from "../../lib/rtyFpy.js";
import SpcKontrolnaGraf from "../SpcKontrolnaGraf.jsx";
import { SpcParetoGraf, SpcOkNokBarGraf, SpcRtyJednaLinija } from "../SpcAnalitikaGrafovi.jsx";
import SpcKapabilitetSemafor from "./SpcKapabilitetSemafor.jsx";

function fmt(v, jedinica, dec = 4) {
  return formatVrednostKarte(v, jedinica, dec);
}

function Sekcija({ naslov, C, onDetalj, detaljLabel, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
        gap: 8,
      }}>
        <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.2, fontWeight: 700 }}>
          {naslov}
        </div>
        {onDetalj && (
          <button
            type="button"
            onClick={onDetalj}
            style={{
              background: "none",
              border: `1px solid ${C.plava}`,
              borderRadius: 6,
              color: C.plava,
              fontSize: 9,
              fontWeight: 700,
              padding: "3px 8px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {detaljLabel || "Detalj →"}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function KpiPlocice({ items, C }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))",
      gap: 8,
      marginBottom: 14,
    }}>
      {items.map(([n, v, b]) => (
        <div
          key={n}
          style={{
            background: C.panel,
            border: `1px solid ${(b || C.border)}35`,
            borderRadius: 8,
            padding: "10px 8px",
            textAlign: "center",
          }}
        >
          <div style={{ color: C.sivi, fontSize: 8, letterSpacing: 0.8, marginBottom: 4 }}>{n}</div>
          <div style={{ color: b || C.tekst, fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {v}
          </div>
        </div>
      ))}
    </div>
  );
}

/** SPC dashboard merljive — X̄/R, Cp/Cpk, Pareto, DPMO (fokus na kontrolu procesa). */
export default function SpcDashboardMerljive({
  C,
  ekran,
  idDeo,
  pozicija,
  kar,
  spc,
  cpk,
  agregat,
  sigmaNivo,
  sigmaBoja,
  paretoData,
  poPoziciji,
  poSmeni,
  rtyTrend,
  podgrupe,
  nPodgrupa,
  onOpenTab,
  onOpen8D,
}) {
  const gr = graniceKarakteristike(kar);
  const jedinica = gr.jedinica;
  const xbarPodaci = spc?.xbarPodaci || [];
  const rPodaci = spc?.rPodaci || [];
  const vanX = xbarPodaci.filter((d) => d.upozVanGranica || d.upozObrazac).length;
  const vanR = rPodaci.filter((d) => d.upozVanGranica || d.upozObrazac).length;
  const chartH = ekran?.mob ? 200 : 240;
  const grid2 = ekran?.mob ? "1fr" : "1fr 1fr";

  const formatOs = (v) => {
    if (!Number.isFinite(v)) return "—";
    if (isStepen(jedinica)) return `${fmt(v, jedinica)} (${decStepenUDms(v)})`;
    return fmt(v, jedinica);
  };

  return (
    <div>
      <SpcKapabilitetSemafor
        C={C}
        cpk={cpk}
        vanX={vanX}
        vanR={vanR}
        podgrupe={podgrupe.length}
        pozicija={pozicija}
        onOpenTab={onOpenTab}
        kompakt={!!ekran?.mob}
      />

      <KpiPlocice
        C={C}
        items={[
          [LAB_FPY_KRATKO, `${agregat.rty}%`, C.zelena],
          ["DPMO", agregat.dpmo.toLocaleString(), C.ljubicasta],
          ["Sigma", `${sigmaNivo.toFixed(1)}σ`, sigmaBoja],
          ["NOK", agregat.nok, agregat.nok > 0 ? C.crvena : C.sivi],
          ["Merenja", agregat.n, C.plava],
        ]}
      />

      {pozicija ? (
        <>
          {kar && (
            <div style={{ color: C.sivi, fontSize: 10, marginBottom: 12 }}>
              <strong style={{ color: C.tekst }}>{pozicija}</strong>
              {" · "}LSL={gr.lsl ?? "—"} · USL={gr.usl ?? "—"} · nominala={gr.nominala ?? "—"} {gr.jedinica}
            </div>
          )}

          {podgrupe.length === 0 ? (
            <div style={{
              color: C.zuta,
              fontSize: 11,
              padding: "16px 0",
              textAlign: "center",
            }}>
              Nedovoljno merenja za X̄/R podgrupe (n={nPodgrupa})
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: grid2, gap: 14, marginBottom: 16 }}>
              <Sekcija
                naslov="X̄-KARTA"
                C={C}
                onDetalj={onOpenTab ? () => onOpenTab("xbar") : undefined}
              >
                <SpcKontrolnaGraf
                  podaci={xbarPodaci}
                  bojaLinije={C.zelena}
                  C={C}
                  lsl={gr.lsl}
                  usl={gr.usl}
                  naslovKarte="X̄"
                  sufiks={isStepen(jedinica) ? " mm" : (jedinicaSpcOsi(jedinica) === "mm" ? " mm" : "")}
                  yDomain={yDomainSpc(xbarPodaci, [gr.lsl, gr.usl].filter(Number.isFinite))}
                  formatVrednost={formatOs}
                  height={chartH}
                />
              </Sekcija>
              <Sekcija
                naslov="R-KARTA"
                C={C}
                onDetalj={onOpenTab ? () => onOpenTab("r") : undefined}
              >
                <SpcKontrolnaGraf
                  podaci={rPodaci}
                  bojaLinije={C.narandzasta}
                  C={C}
                  naslovKarte="R"
                  yDomain={yDomainRangeChart(rPodaci)}
                  formatVrednost={(v) => {
                    if (!Number.isFinite(v)) return "—";
                    const dec = Math.abs(v) < 0.1 ? 4 : Math.abs(v) < 1 ? 3 : 2;
                    return (+v).toFixed(dec).replace(".", ",");
                  }}
                  height={chartH}
                />
              </Sekcija>
            </div>
          )}

          {paretoData?.length > 0 && (
            <Sekcija
              naslov="PARETO NOK"
              C={C}
              onDetalj={onOpenTab ? () => onOpenTab("pareto") : undefined}
            >
              <SpcParetoGraf data={paretoData} C={C} height={chartH} kumKey="kum" countKey="count" />
            </Sekcija>
          )}
        </>
      ) : (
        <>
          <div style={{
            background: `${C.plava}12`,
            border: `1px solid ${C.plava}35`,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 14,
            color: C.sivi,
            fontSize: 11,
          }}>
            Izaberi <strong style={{ color: C.plava }}>karakteristiku</strong> u filteru da aktiviraš semafore i X̄/R karte.
          </div>
          {paretoData?.length > 0 && (
            <Sekcija
              naslov="PARETO NOK PO DIMENZIJI"
              C={C}
              onDetalj={onOpenTab ? () => onOpenTab("pareto") : undefined}
            >
              <SpcParetoGraf data={paretoData} C={C} height={280} kumKey="kum" countKey="count" />
            </Sekcija>
          )}
          {poPoziciji?.length > 0 && (
            <div style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 14,
              marginBottom: 16,
            }}>
              <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10, letterSpacing: 1 }}>PO DIMENZIJI</div>
              <div style={{ display: "grid", gap: 8 }}>
                {poPoziciji.map((p) => (
                  <div
                    key={p.pozicija}
                    style={{
                      display: "grid",
                      gridTemplateColumns: ekran?.mob ? "1fr" : "1fr 80px 80px 80px",
                      gap: 8,
                      fontSize: 11,
                      padding: "6px 0",
                      borderBottom: `1px solid ${C.hover}`,
                    }}
                  >
                    <span style={{ color: C.tekst }}>{p.pozicija}</span>
                    <span style={{ color: C.zelena }}>{LAB_FPY_KRATKO} {p.rty}%</span>
                    <span style={{ color: C.ljubicasta }}>DPMO {p.dpmo.toLocaleString()}</span>
                    <span style={{ color: p.nok ? C.crvena : C.sivi }}>{p.nok} NOK</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div style={{
        borderTop: `1px solid ${C.border}`,
        paddingTop: 14,
        marginTop: 4,
      }}>
        <div style={{ color: C.border, fontSize: 9, letterSpacing: 1, marginBottom: 10 }}>TREND I SMENA</div>
        <div style={{ display: "grid", gridTemplateColumns: grid2, gap: 14 }}>
          <SpcRtyJednaLinija data={rtyTrend} C={C} height={180} xKey="label" naslov={LAB_FPY_TREND} />
          <SpcOkNokBarGraf data={poSmeni} C={C} height={180} xKey="s" naslov="Po smeni" />
        </div>
      </div>

      {paretoData?.length > 0 && pozicija && onOpen8D && (
        <div style={{ marginTop: 12, textAlign: "right" }}>
          <button
            type="button"
            onClick={() => onOpen8D({
              id_deo: idDeo,
              opis: `Pareto merljive ${pozicija || idDeo}`,
            })}
            style={{
              background: "none",
              border: `1px solid ${C.plava}`,
              borderRadius: 6,
              color: C.plava,
              fontSize: 10,
              padding: "6px 12px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Otvori 8D →
          </button>
        </div>
      )}
    </div>
  );
}
