import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { useAnalitikaFilter } from "../../lib/AnalitikaFilterContext.jsx";
import { datumOdIzPerioda } from "../../lib/analitikaFilterUtils.js";
import {
  aggregateLogRows,
  groupSpcRows,
  buildParetoFromLog,
  calcPPM,
  calcDPMO,
  calcDPMODefekti,
  predloziGrupisanjeSpc,
  kvalitetIzPrve,
} from "../../lib/spcStats.js";
import {
  buildPKartaPodaci,
  buildCKartaPodaci,
  buildUKartaPodaci,
  pripremaKontrolnaPodaci,
  pBarIzGrupe,
  cBarIzGrupe,
  uBarIzGrupe,
  nBarIzGrupe,
} from "../../lib/atributivneKartePodaci.js";
import { ucitajAktivniBaseline } from "../../lib/spcBaseline.js";
import {
  statAtributivneRedovi,
  agregirajAtributivnePoKljuču,
} from "../../lib/atributivneAgregacija.js";
import { fetchKpiUnos, agregirajKpiUnos } from "../../lib/kpiUnos.js";
import { LAB_FPY_TREND } from "../../lib/rtyFpy.js";
import { jeKontrolaCelogVozila } from "../../lib/spcPredlogKarti.js";
import SpcAtrDashboardHero from "./SpcAtrDashboardHero.jsx";
import SpcAtrHeatmapDanSmena from "./SpcAtrHeatmapDanSmena.jsx";
import SpcAtrKontrolnaKartaSekcija from "./SpcAtrKontrolnaKartaSekcija.jsx";
import {
  SpcParetoGraf,
  SpcOkNokBarGraf,
  SpcRtyJednaLinija,
  SpcPpmDpmoTrendGraf,
} from "../SpcAnalitikaGrafovi.jsx";
import AnalitikaSpcSnapshot from "../analitika/AnalitikaSpcSnapshot.jsx";
import SpcAsistent8dDugme from "./SpcAsistent8dDugme.jsx";

function SekcijaNaslov({ C, naslov, onDetalj, detaljLabel = "Detalj →" }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
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
          {detaljLabel}
        </button>
      )}
    </div>
  );
}

function TopMasineMini({ rows, C, onDetalj }) {
  if (!rows?.length) return null;
  const max = Math.max(...rows.map((r) => r.nok), 1);
  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: 12,
    }}>
      <SekcijaNaslov C={C} naslov="TOP MAŠINE (NOK)" onDetalj={onDetalj} />
      <div style={{ display: "grid", gap: 8 }}>
        {rows.slice(0, 5).map((m) => (
          <div key={m.naziv} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
            <span style={{
              color: C.tekst,
              minWidth: 72,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {m.naziv}
            </span>
            <div style={{ flex: 1, background: C.hover, borderRadius: 3, height: 8 }}>
              <div style={{
                width: `${(m.nok / max) * 100}%`,
                height: 8,
                borderRadius: 3,
                background: C.crvena,
              }}
              />
            </div>
            <span style={{ color: C.crvena, fontWeight: 700, minWidth: 28, textAlign: "right" }}>{m.nok}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function dISO() {
  return new Date().toISOString().split("T")[0];
}

/** SPC dashboard atributivne — hero KPI, p-karta, trend, Pareto, heatmap. */
export default function SpcDashboardAtributivne({
  C,
  addToast,
  onNavigacija,
  sviDelovi = [],
  korisnik,
  onOtvori8D,
  periodOverride,
  idDeoOverride,
  smenaOverride,
  showSnapshot = true,
  showToolbar = true,
  dashRef,
}) {
  const filter = useAnalitikaFilter();
  const idDeo = String(idDeoOverride ?? filter?.idDeo ?? "").trim().toUpperCase();
  const smena = smenaOverride ?? filter?.smena ?? "";
  const [periodLokal, setPeriodLokal] = useState(filter?.period || "7");
  const period = periodOverride ?? periodLokal;

  const [rawData, setRawData] = useState([]);
  const [rawDataKarte, setRawDataKarte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingKarte, setLoadingKarte] = useState(false);
  const [kpiPeriod, setKpiPeriod] = useState(null);
  const [baselineP, setBaselineP] = useState(null);
  const [baselineC, setBaselineC] = useState(null);
  const [baselineU, setBaselineU] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const internalRef = useRef(null);
  const ref = dashRef || internalRef;

  const deoInfo = useMemo(
    () => sviDelovi.find((d) => d.id_deo === idDeo),
    [sviDelovi, idDeo],
  );

  const grupisanje = useMemo(() => {
    if (!rawData.length) return "dan";
    return predloziGrupisanjeSpc(rawData, { vozilo: jeKontrolaCelogVozila(deoInfo) });
  }, [rawData, deoInfo]);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const od = datumOdIzPerioda(period);
      let q = supabase.from("kontrolni_log")
        .select("datum,smena,status,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,id_deo,masina_id,created_at,masina:masine(naziv)")
        .gte("datum", od)
        .order("datum", { ascending: true });
      if (idDeo) q = q.eq("id_deo", idDeo);
      if (smena) q = q.eq("smena", Number(smena));
      const { data, error } = await q;
      if (error) throw error;
      setRawData(data || []);
    } catch (e) {
      addToast?.(e.message, "greska");
      setRawData([]);
    } finally {
      setLoading(false);
    }
  }, [period, idDeo, smena, addToast]);

  useEffect(() => {
    if (periodOverride) return;
    if (filter?.period) setPeriodLokal(filter.period);
  }, [filter?.period, periodOverride]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const ucitajKarte = useCallback(async () => {
    if (!idDeo) {
      setRawDataKarte([]);
      return;
    }
    setLoadingKarte(true);
    try {
      let q = supabase.from("kontrolni_log")
        .select("datum,smena,status,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,id_deo,masina_id,created_at,masina:masine(naziv)")
        .eq("id_deo", idDeo)
        .order("datum", { ascending: true })
        .order("created_at", { ascending: true });
      if (smena) q = q.eq("smena", Number(smena));
      const { data, error } = await q;
      if (error) throw error;
      setRawDataKarte(data || []);
    } catch (e) {
      addToast?.(e.message, "greska");
      setRawDataKarte([]);
    } finally {
      setLoadingKarte(false);
    }
  }, [idDeo, smena, addToast]);

  useEffect(() => { ucitajKarte(); }, [ucitajKarte]);

  useEffect(() => {
    if (!idDeo) {
      setBaselineP(null);
      setBaselineC(null);
      setBaselineU(null);
      return undefined;
    }
    let alive = true;
    (async () => {
      try {
        const [bp, bc, bu] = await Promise.all([
          ucitajAktivniBaseline(supabase, { idDeo, tipKarte: "p" }),
          ucitajAktivniBaseline(supabase, { idDeo, tipKarte: "c" }),
          ucitajAktivniBaseline(supabase, { idDeo, tipKarte: "u" }),
        ]);
        if (!alive) return;
        setBaselineP(bp);
        setBaselineC(bc);
        setBaselineU(bu);
      } catch {
        if (alive) {
          setBaselineP(null);
          setBaselineC(null);
          setBaselineU(null);
        }
      }
    })();
    return () => { alive = false; };
  }, [idDeo]);

  useEffect(() => {
    if (!showToolbar) return undefined;
    const ch = supabase.channel(`dash_atr_${idDeo || "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "kontrolni_log" }, () => {
        ucitaj();
        ucitajKarte();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ucitaj, ucitajKarte, idDeo, showToolbar]);

  useEffect(() => {
    if (!idDeo) {
      setKpiPeriod(null);
      return undefined;
    }
    let alive = true;
    (async () => {
      try {
        const od = datumOdIzPerioda(period);
        const rows = await fetchKpiUnos(supabase, {
          modul: "atributivne",
          idDeo,
          datumOd: od,
          smena: smena || undefined,
          limit: 500,
        });
        if (!alive) return;
        setKpiPeriod(agregirajKpiUnos(rows, { modul: "atributivne" }));
      } catch {
        if (alive) setKpiPeriod(null);
      }
    })();
    return () => { alive = false; };
  }, [idDeo, smena, period]);

  const grupe = useMemo(() => groupSpcRows(rawData, grupisanje), [rawData, grupisanje]);
  const statUk = useMemo(() => statAtributivneRedovi(rawData), [rawData]);

  const kvalitetUk = useMemo(() => {
    const logOk = grupe.reduce((s, g) => s + g.ok, 0);
    const logNok = grupe.reduce((s, g) => s + g.nok, 0);
    const logN = grupe.reduce((s, g) => s + g.n, 0);
    return kvalitetIzPrve({ kpi: kpiPeriod, ok: logOk, nok: logNok, n: logN });
  }, [grupe, kpiPeriod]);

  const ukN = kvalitetUk.ukupno;
  const ukNOK = kvalitetUk.neusaglaseno;
  const pBar = ukN > 0 ? ukNOK / ukN : 0;
  const dpmo = ukN > 0
    ? (statUk.komNok > 0 && statUk.komNok !== statUk.nok
      ? calcDPMODefekti(statUk.komNok, statUk.n)
      : kvalitetUk.dpmo)
    : null;
  const ppm = ukN > 0 ? calcPPM(ukNOK, ukN) : null;

  const grupisanjeKarte = useMemo(() => {
    if (!rawDataKarte.length) return "dan";
    return predloziGrupisanjeSpc(rawDataKarte, { vozilo: jeKontrolaCelogVozila(deoInfo) });
  }, [rawDataKarte, deoInfo]);

  const grupeKarte = useMemo(
    () => groupSpcRows(rawDataKarte, grupisanjeKarte),
    [rawDataKarte, grupisanjeKarte],
  );

  const statKarte = useMemo(() => statAtributivneRedovi(rawDataKarte), [rawDataKarte]);

  const pBarKarte = useMemo(() => pBarIzGrupe(grupeKarte), [grupeKarte]);
  const cBarKarte = useMemo(() => cBarIzGrupe(grupeKarte), [grupeKarte]);
  const uBarKarte = useMemo(() => uBarIzGrupe(grupeKarte), [grupeKarte]);
  const ukNKarte = useMemo(() => grupeKarte.reduce((s, g) => s + g.n, 0), [grupeKarte]);
  const ukNokKarte = useMemo(() => grupeKarte.reduce((s, g) => s + g.nok, 0), [grupeKarte]);
  const ukOkKarte = useMemo(() => grupeKarte.reduce((s, g) => s + g.ok, 0), [grupeKarte]);
  const nBarKarte = useMemo(() => nBarIzGrupe(grupeKarte, ukNKarte), [grupeKarte, ukNKarte]);

  const pPodaciKarte = useMemo(
    () => pripremaKontrolnaPodaci(buildPKartaPodaci(grupeKarte, pBarKarte), baselineP),
    [grupeKarte, pBarKarte, baselineP],
  );

  const cPodaciKarte = useMemo(
    () => pripremaKontrolnaPodaci(buildCKartaPodaci(rawDataKarte, cBarKarte), baselineC),
    [rawDataKarte, cBarKarte, baselineC],
  );

  const uPodaciKarte = useMemo(
    () => pripremaKontrolnaPodaci(buildUKartaPodaci(grupeKarte, uBarKarte), baselineU),
    [grupeKarte, uBarKarte, baselineU],
  );

  const vanKontrole = pPodaciKarte.filter((d) => d.upoz).length;

  const heroIzKarte = !!(idDeo && grupeKarte.length);
  const heroPBar = heroIzKarte ? pBarKarte : pBar;
  const heroDpmo = heroIzKarte && ukNKarte > 0
    ? (statKarte.komNok > 0 && statKarte.komNok !== statKarte.nok
      ? calcDPMODefekti(statKarte.komNok, statKarte.n)
      : calcDPMO(ukNokKarte, ukNKarte))
    : dpmo;
  const heroPpm = heroIzKarte && ukNKarte > 0 ? calcPPM(ukNokKarte, ukNKarte) : ppm;
  const heroFpy = heroIzKarte && ukNKarte > 0
    ? +((ukOkKarte / ukNKarte) * 100).toFixed(1)
    : kvalitetUk.rty;
  const heroOpseg = heroIzKarte
    ? "KPI iznad: cela istorija dela (kao SPC karte) · trendovi/Pareto ispod: period filtera"
    : idDeo
      ? null
      : `KPI: agregat svih delova · period ${period === "1" ? "danas" : `${period} dana`}`;
  const imaVisestrukeDefekte = statKarte.komNok > statKarte.nok;

  const paretoData = useMemo(() => {
    const s = buildParetoFromLog(rawData, 10);
    const uk = s.reduce((t, d) => t + d.count, 0);
    let k = 0;
    return s.map((d) => {
      k += d.count;
      return { ...d, kumulativ: uk > 0 ? +((k / uk) * 100).toFixed(1) : 0 };
    });
  }, [rawData]);

  const poSmeni = useMemo(() => {
    const smeneGr = agregirajAtributivnePoKljuču(rawData, (r) => Number(r.smena));
    return [1, 2, 3].map((sm) => {
      const rows = smeneGr.get(sm) || [];
      const d = statAtributivneRedovi(rows);
      return { s: `S${sm}`, ok: d.ok, nok: d.nok, n: d.n, label: `Smena ${sm}` };
    });
  }, [rawData]);

  const trendSkart = useMemo(() => grupe.map((g) => ({
    label: g.label || g.datum?.substring(5) || "",
    rty: g.n > 0 ? +(g.nok / g.n * 100).toFixed(2) : 0,
  })), [grupe]);

  const trendFpy = useMemo(() => grupe.map((g) => ({
    label: g.label || g.datum?.substring(5) || "",
    rty: g.n > 0 ? +((g.ok / g.n) * 100).toFixed(1) : 0,
  })), [grupe]);

  const ppmDpmoTrend = useMemo(() => grupe.map((g) => {
    const komNok = g.c ?? g.nok;
    return {
      label: g.label || g.datum?.substring(5) || "",
      ppm: g.n > 0 ? calcPPM(g.nok, g.n) : null,
      dpmo: g.n > 0
        ? (komNok > 0 && komNok !== g.nok ? calcDPMODefekti(komNok, g.n) : calcPPM(g.nok, g.n))
        : null,
    };
  }), [grupe]);

  const topMasine = useMemo(() => {
    const gr = agregirajAtributivnePoKljuču(rawData, (r) => r.masina?.naziv || "Nepoznata");
    return [...gr.entries()]
      .map(([naziv, rows]) => {
        const d = statAtributivneRedovi(rows);
        return { naziv, nok: d.nok };
      })
      .filter((m) => m.nok > 0)
      .sort((a, b) => b.nok - a.nok);
  }, [rawData]);

  const agregatPregled = useMemo(() => aggregateLogRows(rawData), [rawData]);

  const asistentDashboardProps = useMemo(() => ({
    idDeo,
    nazivDela: deoInfo?.naziv_dela || "",
    period,
    rawData,
    grupe,
    kvalitetUk,
    statUk,
    paretoData,
    topMasine,
    poSmeni,
    pPodaciKarte,
    pBarKarte,
    ukNKarte,
    ukNokKarte,
    ukOkKarte,
    heroFpy,
  }), [
    idDeo, deoInfo, period, rawData, grupe, kvalitetUk, statUk, paretoData,
    topMasine, poSmeni, pPodaciKarte, pBarKarte, ukNKarte, ukNokKarte, ukOkKarte, heroFpy,
  ]);

  const navKarte = onNavigacija
    ? (spcTip) => () => onNavigacija({ tab: "karte", spcTip })
    : undefined;

  const exportPDF = async () => {
    if (!ref.current || pdfBusy) return;
    setPdfBusy(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: h2c } = await import("html2canvas");
      const { dodajPdfBrendZaglavlje, dodajPdfBrendPodnozje } = await import("../../lib/pdfBrending.js");
      const canvas = await h2c(ref.current, { scale: 2, useCORS: true });
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const w = pdf.internal.pageSize.getWidth();
      const headerH = await dodajPdfBrendZaglavlje(pdf, {
        naslov: "Analitika — atributivne",
        podnaslov: idDeo || "",
      });
      const imgH = canvas.height * w / canvas.width;
      const pageH = pdf.internal.pageSize.getHeight();
      const availH = pageH - headerH - 12;
      const drawH = Math.min(imgH, availH);
      const drawW = drawH * canvas.width / canvas.height;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, headerH, drawW, drawH);
      dodajPdfBrendPodnozje(pdf);
      pdf.save(`TRI-CORE_Analitika_ATR_${idDeo || "pogon"}_${dISO()}.pdf`);
    } catch (e) {
      addToast?.(e.message || "PDF greška", "greska");
    } finally {
      setPdfBusy(false);
    }
  };

  const BOJE = [C.crvena, C.narandzasta, C.zuta, C.plava, C.ljubicasta];

  return (
    <div style={{ padding: showToolbar ? 18 : 0 }} ref={ref}>
      {showSnapshot && (
        <AnalitikaSpcSnapshot C={C} modul="atributivne" onNavigacija={onNavigacija} uklopljen={!showToolbar} />
      )}

      {showToolbar && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <span style={{ color: C.tekst, fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
            ANALITIKA
            {idDeo && <span style={{ color: C.sivi, fontWeight: 400, marginLeft: 8, fontSize: 11 }}>{idDeo}</span>}
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            {!periodOverride && (
              <select
                value={periodLokal}
                onChange={(e) => setPeriodLokal(e.target.value)}
                style={{
                  background: C.input,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  color: C.tekst,
                  fontSize: 11,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <option value="1">Danas</option>
                <option value="7">7 dana</option>
                <option value="30">30 dana</option>
                <option value="90">90 dana</option>
              </select>
            )}
            {onOtvori8D && idDeo && (
              <SpcAsistent8dDugme
                C={C}
                korisnik={korisnik}
                izvor="dashboard"
                onOtvori8D={onOtvori8D}
                addToast={addToast}
                disabled={loading || loadingKarte}
                dashboardProps={asistentDashboardProps}
              />
            )}
            <button
              type="button"
              onClick={exportPDF}
              disabled={pdfBusy || !rawData.length}
              style={{
                background: pdfBusy || !rawData.length ? C.hover : "#7c3aed",
                border: "none",
                borderRadius: 6,
                color: pdfBusy || !rawData.length ? C.sivi : "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "7px 14px",
                cursor: pdfBusy || !rawData.length ? "not-allowed" : "pointer",
              }}
            >
              {pdfBusy ? "⏳ PDF…" : "📄 PDF"}
            </button>
            {onNavigacija && (
              <button
                type="button"
                onClick={() => onNavigacija({ tab: "karte", spcTip: "p" })}
                style={{
                  background: "none",
                  border: `1px solid ${C.plava}`,
                  borderRadius: 6,
                  color: C.plava,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "7px 14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                SPC karte →
              </button>
            )}
          </div>
        </div>
      )}

      {loading || (idDeo && loadingKarte) ? (
        <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: C.sivi, fontSize: 12 }}>
          Učitavanje…
        </div>
      ) : !rawData.length && (!idDeo || !rawDataKarte.length) ? (
        <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: C.border, fontSize: 12 }}>
          {idDeo ? "Nema podataka za izabrani deo" : "Izaberi deo u filteru za p-kartu po delu, ili proširi period"}
        </div>
      ) : (
        <>
          <SpcAtrDashboardHero
            C={C}
            pBar={heroPBar}
            dpmo={heroDpmo}
            ppm={heroPpm}
            fpy={heroFpy}
            vanKontrole={vanKontrole}
            imaPKartu={pPodaciKarte.length > 0}
            idDeo={idDeo}
            onNavigacija={onNavigacija}
            opsegPodataka={heroOpseg}
          />

          {!idDeo && (
            <div style={{
              background: `${C.plava}12`,
              border: `1px solid ${C.plava}35`,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 14,
              color: C.sivi,
              fontSize: 11,
            }}>
              Prikaz je agregat za <strong>sve delove</strong> u periodu. Izaberi deo u filteru za p-kartu jednog dela.
            </div>
          )}

          {idDeo && loadingKarte && (
            <div style={{ color: C.sivi, fontSize: 11, marginBottom: 16 }}>Učitavanje p/C/u karata…</div>
          )}

          {idDeo && !loadingKarte && pPodaciKarte.length > 0 && (
            <SpcAtrKontrolnaKartaSekcija
              C={C}
              tip="p"
              cd={pPodaciKarte}
              naziv="p-Karta"
              opis="Proporcija neispravnih · varijabilno n"
              boja={C.plava}
              sufiks="%"
              grupisanje={grupisanjeKarte}
              nBar={nBarKarte}
              nTacaka={grupeKarte.length}
              baselineAktivan={baselineP}
              rtyPct={ukNKarte > 0 ? `${((ukOkKarte / ukNKarte) * 100).toFixed(1)}%` : "-"}
              ppm={ukNKarte > 0 ? calcPPM(ukNokKarte, ukNKarte) : null}
              dpmo={ukNKarte > 0
                ? (statKarte.komNok > 0 && statKarte.komNok !== statKarte.nok
                  ? calcDPMODefekti(statKarte.komNok, statKarte.n)
                  : calcDPMO(ukNokKarte, ukNKarte))
                : null}
              dpmoDefekti={statKarte.komNok > statKarte.nok}
              onDetalj={navKarte?.("p")}
            />
          )}

          {idDeo && !loadingKarte && cPodaciKarte.length > 0 && (
            <SpcAtrKontrolnaKartaSekcija
              C={C}
              tip="c"
              cd={cPodaciKarte}
              naziv="C-Karta"
              opis="Ukupan broj grešaka · konstantno n"
              boja={C.narandzasta}
              sufiks=""
              grupisanje={grupisanjeKarte}
              baselineAktivan={baselineC}
              onDetalj={navKarte?.("c")}
            />
          )}

          {idDeo && !loadingKarte && uPodaciKarte.length > 0 && (
            <SpcAtrKontrolnaKartaSekcija
              C={C}
              tip="u"
              cd={uPodaciKarte}
              naziv="u-Karta"
              opis="Grešaka po komadu · varijabilno n"
              boja={C.ljubicasta}
              sufiks=""
              grupisanje={grupisanjeKarte}
              nTacaka={grupeKarte.length}
              baselineAktivan={baselineU}
              onDetalj={navKarte?.("u")}
              formatVrednost={(v) => (Number.isFinite(v) ? Number(v).toFixed(4) : "—")}
              naslovSekcije={imaVisestrukeDefekte ? "AKTIVNA u-KARTA · više defekata po komadu" : undefined}
            />
          )}

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginBottom: 20 }}>
            <SekcijaNaslov C={C} naslov="TRENDOVI I STABILNOST" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <SpcRtyJednaLinija
                data={trendSkart}
                C={C}
                height={200}
                xKey="label"
                naslov="Trend škarta (p %)"
                serijaNaziv="Škart %"
              />
              <SpcOkNokBarGraf
                data={poSmeni}
                C={C}
                height={200}
                xKey="label"
                naslov="NOK po smeni"
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <SpcRtyJednaLinija data={trendFpy} C={C} height={180} xKey="label" naslov={LAB_FPY_TREND} />
              <SpcPpmDpmoTrendGraf data={ppmDpmoTrend} C={C} height={180} xKey="label" />
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <SekcijaNaslov C={C} naslov="ANALIZA UZROKA I LOKACIJE" />
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}>
              {paretoData.length > 0 && (
                <div>
                  <SekcijaNaslov C={C} naslov="PARETO GREŠAKA" onDetalj={navKarte?.("pareto")} />
                  <SpcParetoGraf
                    data={paretoData}
                    C={C}
                    height={260}
                    boje={BOJE}
                    kumKey="kumulativ"
                    countKey="count"
                  />
                </div>
              )}
              <div>
                <SekcijaNaslov C={C} naslov="HEATMAP — DAN × SMENA" onDetalj={navKarte?.("heatmap")} />
                <div style={{
                  background: C.panel,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 12,
                }}>
                  <SpcAtrHeatmapDanSmena rawData={rawData}
                    C={C}
                    maxDana={14}
                    kompakt
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <TopMasineMini rows={topMasine} C={C} onDetalj={navKarte?.("masina")} />
              <div style={{
                background: C.panel,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 14,
                fontSize: 11,
                lineHeight: 2,
              }}>
                <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.2, fontWeight: 700, marginBottom: 8 }}>
                  KPI PREGLED
                </div>
                <div><span style={{ color: C.sivi }}>Unosa:</span> <strong>{agregatPregled?.ukN ?? statUk.n}</strong></div>
                <div><span style={{ color: C.sivi }}>Grupisanje p-karte:</span> <strong>{(idDeo ? grupisanjeKarte : grupisanje) === "komad" ? "po komadu" : "po danu"}</strong></div>
                <div><span style={{ color: C.sivi }}>Tačaka na p-karti:</span> <strong>{pPodaciKarte.length}</strong></div>
                <div><span style={{ color: C.sivi }}>Tačaka na C-karti:</span> <strong>{cPodaciKarte.length}</strong></div>
                <div><span style={{ color: C.sivi }}>Tačaka na u-karti:</span> <strong>{uPodaciKarte.length}</strong></div>
                <div><span style={{ color: C.sivi }}>Mašina u izboru:</span> <strong>{topMasine.length || "—"}</strong></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
