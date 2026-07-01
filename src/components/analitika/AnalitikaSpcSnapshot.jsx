import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { useAnalitikaFilter } from "../../lib/AnalitikaFilterContext.jsx";
import { buildSpcSnapshotMerljive, fetchSpcSnapshot } from "../../lib/analitikaSpcSnapshot.js";
import { bojaKapabiliteta } from "../../lib/varijabilneSpcStats.js";
import SpcSparkline from "./SpcSparkline.jsx";
import { AnalitikaMetrika as Metrika } from "./AnalitikaMetrika.jsx";

function bojaStatusa(id, C) {
  if (id === "kriticno") return C.crvena;
  if (id === "upozorenje") return C.zuta;
  if (id === "ok") return C.zelena;
  return C.sivi;
}

export default function AnalitikaSpcSnapshot({
  C,
  modul,
  onNavigacija,
  idDeoOverride,
  uklopljen = false,
  liveMerenja,
  liveKarakteristike,
  liveNPodgrupa,
  liveKpiPeriod,
  pozicijaOverride,
  nazivDelaOverride,
}) {
  const filter = useAnalitikaFilter();
  const idDeo = String(idDeoOverride || filter?.idDeo || "").trim().toUpperCase();
  const pozicijaFilter = pozicijaOverride ?? filter?.pozicija ?? "";
  const useLive = modul === "merljive" && Array.isArray(liveMerenja);
  const [fetchedSnap, setFetchedSnap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [greska, setGreska] = useState("");

  const liveSnap = useMemo(() => {
    if (!useLive || !idDeo) return null;
    return buildSpcSnapshotMerljive({
      merenja: liveMerenja,
      karakteristike: liveKarakteristike || [],
      pozicija: pozicijaFilter,
      nPodgrupa: liveNPodgrupa ?? 5,
      kpiPeriod: liveKpiPeriod,
      idDeo,
      nazivDela: nazivDelaOverride || "",
      period: filter?.period || "7",
    });
  }, [
    useLive,
    idDeo,
    liveMerenja,
    liveKarakteristike,
    pozicijaOverride,
    pozicijaFilter,
    liveNPodgrupa,
    liveKpiPeriod,
    nazivDelaOverride,
    filter?.period,
  ]);

  const snap = useLive ? liveSnap : fetchedSnap;

  const ucitaj = useCallback(async () => {
    if (!idDeo || useLive) {
      if (!useLive) setFetchedSnap(null);
      return;
    }
    setLoading(true);
    setGreska("");
    try {
      const d = await fetchSpcSnapshot(supabase, {
        modul,
        idDeo,
        smena: filter?.smena,
        period: filter?.period || "7",
        pozicija: modul === "merljive" ? pozicijaFilter : undefined,
      });
      setFetchedSnap(d);
    } catch (e) {
      setFetchedSnap(null);
      setGreska(e.message || "Greška učitavanja");
    } finally {
      setLoading(false);
    }
  }, [idDeo, modul, filter?.smena, filter?.period, pozicijaFilter, useLive]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  useEffect(() => {
    if (!idDeo || useLive) return;
    const ch = supabase.channel(`spc_snap_${modul}_${idDeo}`)
      .on("postgres_changes", { event: "*", schema: "public", table: modul === "merljive" ? "merenja_varijabilna" : "kontrolni_log" }, ucitaj)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [idDeo, modul, ucitaj, useLive]);

  if (!idDeo) {
    return (
      <div style={{
        marginBottom: uklopljen ? 0 : 14,
        padding: uklopljen ? "0 0 10px" : "14px 16px",
        background: uklopljen ? "transparent" : `${C.plava}12`,
        border: uklopljen ? "none" : `2px dashed ${C.plava}55`,
        borderRadius: uklopljen ? 0 : 12,
        color: C.sivi,
        fontSize: 11,
        lineHeight: 1.5,
      }}>
        <div style={{ color: C.plava, fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
          SPC SNAPSHOT
        </div>
        <strong style={{ color: C.tekst }}>Izaberi deo</strong>
        {modul === "merljive" ? " i po želji karakteristiku" : ""} u filteru hedera da vidiš Cp/Cpk, X̄/R, DPMO, Pareto i sparkline trend.
      </div>
    );
  }

  const nav = onNavigacija ? (d) => () => onNavigacija(d) : () => undefined;
  const statusBoja = bojaStatusa(snap?.status?.id, C);
  const periodLabel = filter?.period === "1" ? "danas" : `${filter?.period || 7} dana`;

  const omot = uklopljen ? {
    marginBottom: 0,
    background: "transparent",
    border: "none",
    borderRadius: 0,
    overflow: "visible",
    width: "100%",
    boxSizing: "border-box",
  } : {
    marginBottom: 14,
    background: C.panel,
    border: `1px solid ${statusBoja}40`,
    borderRadius: 12,
    overflow: "hidden",
  };

  return (
    <div style={omot}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        padding: uklopljen ? "0 0 8px" : "10px 14px",
        borderBottom: uklopljen ? "none" : `1px solid ${C.border}`,
        flexWrap: "wrap",
      }}>
        <div>
          <div style={{ color: C.tekst, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
            SPC SNAPSHOT · {idDeo}
            {snap?.nazivDela && (
              <span style={{ color: C.sivi, fontWeight: 400, marginLeft: 6, fontSize: 10 }}>
                {snap.nazivDela}
              </span>
            )}
          </div>
          <div style={{ color: C.sivi, fontSize: 9, marginTop: 3 }}>
            {modul === "merljive" && snap?.merenjaUk != null && `${snap.merenjaUk} merenja ukupno`}
            {modul === "atributivne" && snap?.unosaUk != null && `${snap.unosaUk} unosa ukupno`}
            {modul === "merljive" && snap?.merenjaUk != null && " · "}
            {modul === "merljive" && "DPMO/RTY kao SPC karte · Pareto u periodu: "}
            {modul === "atributivne" && "Period filtera: "}
            {periodLabel}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {snap?.status && (
            <span style={{
              background: `${statusBoja}18`,
              color: statusBoja,
              fontSize: 9,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 20,
              border: `1px solid ${statusBoja}45`,
            }}>
              ● {snap.status.label}
            </span>
          )}
          {onNavigacija && (
            <button
              type="button"
              onClick={nav({ tab: "karte" })}
              style={{
                background: "none",
                border: `1px solid ${C.plava}`,
                borderRadius: 6,
                color: C.plava,
                fontSize: 9,
                fontWeight: 700,
                padding: "4px 10px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              SPC karte →
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: uklopljen ? "0" : "12px 14px" }}>
        {loading ? (
          <div style={{ color: C.sivi, fontSize: 11, textAlign: "center", padding: 8 }}>Učitavanje SPC…</div>
        ) : greska ? (
          <div style={{ color: C.crvena, fontSize: 11, padding: 8 }}>{greska}</div>
        ) : !snap ? (
          <div style={{ color: C.border, fontSize: 11, padding: 8 }}>Nema podataka</div>
        ) : (
          <>
            {modul === "merljive" && snap.pozicija && (
              <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10 }}>
                {snap.pozicijaIzabrana ? "Karakteristika" : "Cp/Cpk dimenzija"}:{" "}
                <strong style={{ color: C.tekst }}>{snap.pozicija}</strong>
                {!snap.pozicijaIzabrana && " (automatski — najniži Cpk)"}
              </div>
            )}

            {(modul === "merljive" && (snap.sparkXbar?.length || snap.sparkR?.length))
              || (modul === "atributivne" && snap.sparkP?.length) ? (
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 12,
                alignItems: "flex-end",
              }}>
                {modul === "merljive" && (
                  <>
                    <SpcSparkline
                      points={snap.sparkXbar}
                      label="X̄ trend"
                      boja={C.zelena}
                      C={C}
                      onClick={nav({ tab: "karte", spcTip: "xbar" })}
                      title="Poslednjih 8 podgrupa — X̄ karta"
                    />
                    <SpcSparkline
                      points={snap.sparkR}
                      label="R trend"
                      boja={C.narandzasta}
                      C={C}
                      onClick={nav({ tab: "karte", spcTip: "r" })}
                      title="Poslednjih 8 podgrupa — R karta"
                    />
                  </>
                )}
                {modul === "atributivne" && (
                  <SpcSparkline
                    points={snap.sparkP}
                    label="p % trend"
                    boja={C.plava}
                    C={C}
                    onClick={nav({ tab: "karte", spcTip: "p" })}
                    title="Poslednjih 8 dana — p-karta"
                  />
                )}
              </div>
            ) : null}

            <div style={{
              display: "grid",
              gridTemplateColumns: modul === "merljive"
                ? "repeat(7, minmax(0, 1fr))"
                : "repeat(6, minmax(0, 1fr))",
              gap: 8,
              width: "100%",
              minWidth: 0,
              marginBottom: 12,
              boxSizing: "border-box",
            }}>
              {modul === "merljive" && (
                <>
                  <Metrika
                    label="Cp"
                    value={snap.cp != null ? snap.cp : "—"}
                    boja={bojaKapabiliteta(snap.cp, C)}
                    C={C}
                    spcVece
                    onClick={nav({ tab: "karte", spcTip: "cpk" })}
                    title="Cp/Cpk karta"
                  />
                  <Metrika
                    label="Cpk"
                    value={snap.cpk != null ? snap.cpk : "—"}
                    boja={bojaKapabiliteta(snap.cpk, C)}
                    C={C}
                    spcVece
                    onClick={nav({ tab: "karte", spcTip: "cpk" })}
                    title="Cp/Cpk karta"
                  />
                  <Metrika
                    label="X̄/R"
                    value={snap.vanKontrole > 0 ? `${snap.vanKontrole} ⚠` : "OK"}
                    boja={snap.vanKontrole > 0 ? C.crvena : C.zelena}
                    C={C}
                    spcVece
                    onClick={nav({ tab: "karte", spcTip: "xbar" })}
                    title="X̄ kontrolna karta"
                  />
                </>
              )}
              {modul === "atributivne" && (
                <>
                  <Metrika
                    label="p %"
                    value={snap.p != null ? `${snap.p}%` : "—"}
                    boja={snap.p > 5 ? C.crvena : snap.p > 2 ? C.zuta : C.plava}
                    C={C}
                    spcVece
                    onClick={nav({ tab: "karte", spcTip: "p" })}
                    title="p-karta"
                  />
                  <Metrika
                    label="p status"
                    value={snap.vanKontrole > 0 ? `${snap.vanKontrole} ⚠` : "OK"}
                    boja={snap.vanKontrole > 0 ? C.crvena : C.zelena}
                    C={C}
                    spcVece
                    onClick={nav({ tab: "karte", spcTip: "p" })}
                    title="p-karta"
                  />
                </>
              )}
              <Metrika
                label="DPMO"
                value={snap.dpmo != null ? snap.dpmo.toLocaleString() : "—"}
                boja={snap.dpmo > 6210 ? C.crvena : snap.dpmo > 233 ? C.zuta : C.zelena}
                C={C}
                spcVece
                onClick={nav({ tab: "karte", spcTip: modul === "merljive" ? "rty" : "rty" })}
                title="RTY / DPMO trend"
              />
              <Metrika
                label="PPM"
                value={snap.ppm != null ? snap.ppm.toLocaleString() : "—"}
                boja={C.narandzasta}
                C={C}
                spcVece
                onClick={nav({ tab: "karte", spcTip: "rty" })}
              />
              <Metrika
                label="Sigma"
                value={snap.sigma != null ? `${snap.sigma}σ` : "—"}
                boja={snap.sigma >= 4 ? C.zelena : snap.sigma >= 3 ? C.zuta : C.crvena}
                C={C}
                spcVece
                onClick={nav({ tab: "karte", spcTip: "sigma" })}
                title="Sigma nivo"
              />
              <Metrika
                label="Pareto"
                value={snap.pareto?.length ? `${snap.pareto.length} stavke` : "—"}
                boja={C.zelena}
                C={C}
                spcVece
                onClick={nav({ tab: "karte", spcTip: "pareto" })}
                title="Pareto analiza"
              />
            </div>

            {snap.pareto?.length > 0 && (
              <div style={{
                background: C.bg,
                borderRadius: 8,
                padding: "8px 12px",
                border: `1px solid ${C.border}`,
              }}>
                <div style={{ color: C.sivi, fontSize: 8, letterSpacing: 1, marginBottom: 6 }}>
                  PARETO TOP {snap.pareto.length} ({periodLabel})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 10 }}>
                  {snap.pareto.map((p, i) => (
                    <button
                      key={`${p.naziv}-${i}`}
                      type="button"
                      onClick={nav({ tab: "karte", spcTip: "pareto" })}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: onNavigacija ? "pointer" : "default",
                        fontFamily: "inherit",
                        color: C.tekst,
                      }}
                    >
                      <span style={{ color: C.crvena, fontWeight: 700 }}>{p.count}×</span>
                      {" "}{p.naziv}
                      {p.kum != null && (
                        <span style={{ color: C.sivi, fontSize: 9 }}> ({p.kum}%)</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
