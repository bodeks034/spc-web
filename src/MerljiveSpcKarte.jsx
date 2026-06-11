import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  podgrupeMerenja, izracunajXbarRKarte, izracunajIMRKarte, calcCpCpk, bojaKapabiliteta,
  paretoNokPoPoziciji, statPoSmeni,
  trendKvalitetaPoDanu, agregatKvaliteta, nokPoPozicijiDashboard,
  SIGMA_BENCH, yDomainSpc, sigmaProcesa,
} from "./lib/varijabilneSpcStats.js";
import { upisiSpcAlarm, kreirajAutoEskalaciju } from "./lib/spcStats.js";
import { downloadWorkbook, exportMerenjaVarijabilnaExcel } from "./lib/excelSync.js";
import { graniceKarakteristike, formatVrednostKarte, decStepenUDms, isStepen, jedinicaSpcOsi } from "./lib/varijabilneUtils.js";
import { uniqueDeloviIzSop } from "./lib/pogonSop.js";
import { useEkran } from "./lib/useEkran.js";
import {
  predlogMerljivihKarti,
  jeVodicSakriven,
  sakrijVodic,
} from "./lib/spcPredlogKarti.js";
import SpcVodicPredlog, { tabJePreporucen } from "./components/SpcVodicPredlog.jsx";
import SpcKontrolnaGraf from "./components/SpcKontrolnaGraf.jsx";
import {
  SpcParetoGraf, SpcOkNokBarGraf, SpcRtyTrendGraf, SpcRtyJednaLinija,
  SpcHistogramGraf, SpcSigmaBarGraf,
} from "./components/SpcAnalitikaGrafovi.jsx";
import NormalnostPanel from "./components/NormalnostPanel.jsx";
import {
  PoGrupiPanel, KorelacijaPozicijaMasinaPanel, PoredjenjeMerljive,
  ArhivaNokMerljive, OsmDIzvestajMerljive, HeatmapMerljivePanel,
} from "./components/MerljiveAnalitika.jsx";
import { histogramIGaus, proceniNormalnost } from "./lib/normalnost.js";
import { OeeKpiTab } from "./components/SkartDoradaOeePanel.jsx";

import { supabase } from "./lib/supabaseClient.js";
import {
  ucitajAktivniBaseline,
  primeniBaselineNaPodatke,
  formatBaselineBadge,
} from "./lib/spcBaseline.js";

const KARTE_TIPOVI = new Set(["xbar", "r", "i", "mr"]);

function dISO() {
  return new Date().toISOString().split("T")[0];
}

function fmt(v, jedinica, dec = 4) {
  return formatVrednostKarte(v, jedinica, dec);
}

function histBinZaVrednost(histData, vrednost) {
  if (!histData?.length || !Number.isFinite(vrednost)) return undefined;
  const bin = histData.reduce((best, d) =>
    Math.abs(d.mid - vrednost) < Math.abs((best?.mid ?? Infinity) - vrednost) ? d : best,
  histData[0]);
  return bin?.bin;
}

function TrendUpozorenje({ podaci, C, jedinica }) {
  if (!podaci?.length || podaci.length < 5) return null;
  const posl5 = podaci.slice(-5).map(d => d.val || 0);
  const rastuci = posl5.every((v, i) => i === 0 || v >= posl5[i - 1]);
  const opadajuci = posl5.every((v, i) => i === 0 || v <= posl5[i - 1]);
  const prosek5 = posl5.reduce((s, v) => s + v, 0) / 5;
  const prosekSvi = podaci.reduce((s, d) => s + (d.val || 0), 0) / podaci.length;
  const porast = prosek5 > prosekSvi * 1.05;
  const pad = prosek5 < prosekSvi * 0.95;
  if (!rastuci && !opadajuci && !porast && !pad) return null;
  return (
    <div style={{
      background: `${C.zuta}18`, border: `1px solid ${C.zuta}50`,
      borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 10, alignItems: "center",
    }}>
      <span style={{ fontSize: 18 }}>📈</span>
      <div>
        <div style={{ color: C.zuta, fontSize: 12, fontWeight: 700, marginBottom: 2 }}>TREND UPOZORENJE</div>
        <div style={{ color: C.sivi, fontSize: 11 }}>
          {rastuci && "Poslednjih 5 tačaka uzastopno raste. "}
          {opadajuci && "Poslednjih 5 tačaka uzastopno opada. "}
          {porast && `Prosek posled. 5 (${fmt(prosek5, jedinica)}) iznad ukupnog (${fmt(prosekSvi, jedinica)}). `}
          {pad && `Prosek posled. 5 (${fmt(prosek5, jedinica)}) ispod ukupnog (${fmt(prosekSvi, jedinica)}).`}
        </div>
      </div>
    </div>
  );
}

function WesternUpozorenja({ podaci, C, jedinica }) {
  const upoz = (podaci || []).filter(d => d.upoz);
  if (!upoz.length) return (
    <div style={{ color: C.zelena, fontSize: 11, marginTop: 10 }}>✓ Western Electric — nema kršenja pravila</div>
  );
  return (
    <div style={{
      background: `${C.crvena}12`, border: `1px solid ${C.crvena}40`,
      borderRadius: 8, padding: "10px 14px", marginTop: 12,
    }}>
      <div style={{ color: C.crvena, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
        ⚠ Western Electric — {upoz.length} tačka van kontrole
      </div>
      <div style={{ color: C.sivi, fontSize: 10, lineHeight: 1.6 }}>
        Pravila: tačka van UCL/LCL · 2 od 3 iznad 2σ · 4 od 5 iznad 1σ · 8 tačaka iste strane CL · 6 rastućih/padajućih.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {upoz.slice(0, 12).map(d => (
          <span key={d.label} style={{
            background: C.panel, border: `1px solid ${C.crvena}`, borderRadius: 4,
            padding: "2px 8px", fontSize: 10, color: C.crvena,
          }}>
            {d.label}: {fmt(d.val, jedinica)}
          </span>
        ))}
        {upoz.length > 12 && <span style={{ color: C.sivi, fontSize: 10 }}>+{upoz.length - 12}</span>}
      </div>
    </div>
  );
}

const NASLOV_KARTE = { xbar: "X̄-Karta", r: "R-Karta", i: "I-Karta", mr: "MR-Karta" };

function KpiRed({ items, C }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
      {items.map(([n, v, b]) => (
        <div key={n} style={{
          background: C.panel, border: `1px solid ${b}25`, borderRadius: 8,
          padding: "10px 14px", textAlign: "center", minWidth: 80,
        }}>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2, marginBottom: 3 }}>{n}</div>
          <div style={{ color: b, fontSize: 17, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

export default function MerljiveSpcKarte({ C, addToast, korisnik }) {
  const ekran = useEkran();
  const [delovi, setDelovi] = useState([]);
  const [karakteristike, setKarakteristike] = useState([]);
  const [idDeo, setIdDeo] = useState("");
  const [pozicija, setPozicija] = useState("");
  const [datumOd, setDatumOd] = useState("");
  const [datumDo, setDatumDo] = useState("");
  const [smena, setSmena] = useState("");
  const [nPodgrupa, setNPodgrupa] = useState(5);
  const [tip, setTip] = useState("xbar");
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [vodicSakrij, setVodicSakrij] = useState(false);
  const [osmdPrefill, setOsmdPrefill] = useState(null);
  const [baselineAktivan, setBaselineAktivan] = useState(null);
  const kartaRef = useRef(null);
  const alarmPoslat = useRef(new Set());
  const prevIdDeoRef = useRef("");
  const prevPozicijaRef = useRef("");

  useEffect(() => {
    (async () => {
      const [dRes, kRes] = await Promise.all([
        supabase.from("sop_deo_varijabilni").select("id_deo,pogon_kod,naziv_dela,broj_merenja").order("id_deo"),
        supabase.from("karakteristike_merljive").select("id_deo,pozicija,lsl,usl,nominala,jedinica").order("pozicija"),
      ]);
      setDelovi(uniqueDeloviIzSop(dRes.data || []));
      setKarakteristike(kRes.data || []);
    })();
  }, []);

  const pozicijeDeo = useMemo(() => {
    if (!idDeo) return [];
    return [...new Set(karakteristike.filter(k => k.id_deo === idDeo).map(k => k.pozicija))];
  }, [karakteristike, idDeo]);

  const kar = useMemo(() => {
    if (!pozicija) return null;
    return karakteristike.find(k => k.id_deo === idDeo && k.pozicija === pozicija) || null;
  }, [karakteristike, idDeo, pozicija]);

  const gr = useMemo(() => graniceKarakteristike(kar), [kar]);
  const jedinica = gr.jedinica;

  const ucitaj = useCallback(async () => {
    if (!idDeo) return;
    setLoading(true);
    try {
      let q = supabase.from("merenja_varijabilna")
        .select("*")
        .eq("id_deo", idDeo)
        .order("datum", { ascending: true })
        .order("created_at", { ascending: true });
      if (pozicija) q = q.eq("pozicija", pozicija);
      if (datumOd) q = q.gte("datum", datumOd);
      if (datumDo) q = q.lte("datum", datumDo);
      if (smena) q = q.eq("smena", Number(smena));
      const { data, error } = await q;
      if (error) throw error;
      setRawData(data || []);
    } catch (e) {
      addToast(e.message, "greska");
      setRawData([]);
    } finally {
      setLoading(false);
    }
  }, [idDeo, pozicija, datumOd, datumDo, smena, addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  useEffect(() => {
    if (!idDeo || !pozicija || !KARTE_TIPOVI.has(tip)) {
      setBaselineAktivan(null);
      return undefined;
    }
    let alive = true;
    (async () => {
      try {
        const b = await ucitajAktivniBaseline(supabase, { idDeo, tipKarte: tip, pozicija });
        if (alive) setBaselineAktivan(b);
      } catch {
        if (alive) setBaselineAktivan(null);
      }
    })();
    return () => { alive = false; };
  }, [idDeo, pozicija, tip]);

  const podgrupe = useMemo(() => podgrupeMerenja(rawData, nPodgrupa, jedinica), [rawData, nPodgrupa, jedinica]);
  const deoInfo = useMemo(() => delovi.find(d => d.id_deo === idDeo), [delovi, idDeo]);
  const imaGranice = Number.isFinite(gr.lsl) || Number.isFinite(gr.usl);

  const predlog = useMemo(() => predlogMerljivihKarti({
    deo: deoInfo,
    rawData,
    pozicija,
    pozicijeCount: pozicijeDeo.length,
    imaGranice,
    nPodgrupa,
    brojPodgrupa: podgrupe.length,
  }), [deoInfo, rawData, pozicija, pozicijeDeo.length, imaGranice, nPodgrupa, podgrupe.length]);

  useEffect(() => {
    setVodicSakrij(jeVodicSakriven("var", idDeo));
  }, [idDeo]);

  useEffect(() => {
    if (!idDeo || idDeo === prevIdDeoRef.current) return;
    prevIdDeoRef.current = idDeo;
    prevPozicijaRef.current = "";
    const prvi = predlog?.stavke?.[0]?.id;
    if (prvi) setTip(prvi);
  }, [idDeo, predlog]);

  useEffect(() => {
    if (!pozicija || pozicija === prevPozicijaRef.current) return;
    prevPozicijaRef.current = pozicija;
    const prvi = predlog?.stavke?.find(s => ["xbar", "i", "cpk"].includes(s.id))?.id
      || predlog?.stavke?.[0]?.id;
    if (prvi) setTip(prvi);
  }, [pozicija, predlog]);

  const zatvoriVodic = () => {
    sakrijVodic("var", idDeo);
    setVodicSakrij(true);
  };

  const spc = useMemo(() => izracunajXbarRKarte(podgrupe, nPodgrupa), [podgrupe, nPodgrupa]);
  const imr = useMemo(() => izracunajIMRKarte(rawData, jedinica), [rawData, jedinica]);
  const cpk = useMemo(() => {
    const sig = imr.sigmaHat || spc.sigmaHat;
    const mean = imr.xBar || spc.xbarBar;
    return calcCpCpk(mean, sig, gr.lsl, gr.usl);
  }, [imr, spc, gr.lsl, gr.usl]);
  const paretoData = useMemo(() => paretoNokPoPoziciji(rawData, 8), [rawData]);
  const poSmeni = useMemo(() => statPoSmeni(rawData), [rawData]);
  const histPaket = useMemo(() => histogramIGaus(rawData, 12, jedinica), [rawData, jedinica]);
  const histData = histPaket.data;
  const normalnost = useMemo(
    () => proceniNormalnost(histPaket.vals),
    [histPaket.vals],
  );
  const rtyTrend = useMemo(() => trendKvalitetaPoDanu(rawData), [rawData]);
  const agregat = useMemo(() => agregatKvaliteta(rawData), [rawData]);
  const poPoziciji = useMemo(() => nokPoPozicijiDashboard(rawData), [rawData]);

  const aktPodaciSirovi = useMemo(() => {
    if (tip === "r") return spc.rPodaci;
    if (tip === "i") return imr.iPodaci;
    if (tip === "mr") return imr.mrPodaci;
    return spc.xbarPodaci;
  }, [tip, spc, imr]);

  const aktPodaci = useMemo(
    () => primeniBaselineNaPodatke(aktPodaciSirovi, baselineAktivan).podaci,
    [aktPodaciSirovi, baselineAktivan],
  );

  const upozoreni = aktPodaci.filter(d => d.upoz);
  const trebaDimenzija = KARTE_TIPOVI.has(tip) || tip === "cpk" || tip === "hist";

  useEffect(() => {
    if (!idDeo || !upozoreni.length || !korisnik?.radnikId || !KARTE_TIPOVI.has(tip)) return;
    const k = `${idDeo}-${pozicija}-${tip}-${upozoreni.length}`;
    if (alarmPoslat.current.has(k)) return;
    alarmPoslat.current.add(k);
    const tipKarte = { xbar: "Xbar", r: "R", i: "I", mr: "MR" }[tip] || tip;
    (async () => {
      try {
        const pos = upozoreni[upozoreni.length - 1];
        await upisiSpcAlarm(supabase, {
          id_deo: idDeo,
          datum: dISO(),
          tip_karte: tipKarte,
          pravilo: "Western Electric",
          vrednost: pos.val,
          ucl: pos.ucl,
          lcl: pos.lcl,
        });
        await kreirajAutoEskalaciju(supabase, {
          id_deo: idDeo,
          opis: `Merljiva ${tipKarte}-karta (${pozicija || "sve"}): ${upozoreni.length} tačka van kontrole`,
          prioritet: "kriticno",
          kreirao_id: korisnik.radnikId,
          prefiks: "AUTO-VAR",
        });
        addToast(`⚠ SPC alarm (${tipKarte}): ${upozoreni.length} tačka van kontrole`, "greska");
      } catch { /* optional */ }
    })();
  }, [upozoreni, idDeo, pozicija, tip, korisnik?.radnikId, addToast]);

  const exportPDF = async () => {
    if (!kartaRef.current) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: h2c } = await import("html2canvas");
    const canvas = await h2c(kartaRef.current, { scale: 2, useCORS: true });
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const w = pdf.internal.pageSize.getWidth();
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, canvas.height * w / canvas.width);
    pdf.save(`SPC_merljive_${idDeo}_${pozicija || "sve"}_${dISO()}.pdf`);
  };

  const exportExcel = async () => {
    try {
      const wb = await exportMerenjaVarijabilnaExcel(supabase, idDeo, pozicija || null, datumOd, datumDo);
      if (!wb) { addToast("Nema podataka za export", "greska"); return; }
      downloadWorkbook(wb, `merenja_${idDeo}_${dISO()}.xlsx`);
      addToast("✓ Exportovano u Excel", "uspeh");
    } catch (e) {
      addToast(e.message, "greska");
    }
  };

  const INP_S = {
    background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.tekst, fontSize: 11, padding: "7px 10px", outline: "none", fontFamily: "inherit",
  };

  const TABOVI = [
    ["xbar", "X̄-Karta", C.zelena],
    ["r", "R-Karta", C.narandzasta],
    ["i", "I-Karta", "#22d3ee"],
    ["mr", "MR-Karta", C.ljubicasta],
    ["cpk", "Cp/Cpk", C.plava],
    ["rty", "RTY/DPMO", "#22d3ee"],
    ["sigma", "Sigma nivo", "#a3e635"],
    ["dashboard", "Dashboard", C.zuta],
    ["pareto", "Pareto NOK", C.crvena],
    ["smena", "Po smeni", C.zuta],
    ["heatmap", "Heat mapa", "#f472b6"],
    ["masina", "Po mašini", C.narandzasta],
    ["operater", "Po operateru", C.ljubicasta],
    ["korelacija", "Korelacija", "#22d3ee"],
    ["poredi", "Poređenje", "#a78bfa"],
    ["foto_spc", "Foto arhiva", "#fb923c"],
    ["8d", "8D", C.plava],
    ["hist", "Histogram", C.ljubicasta],
    ["oee", "OEE", C.narandzasta],
  ];

  const otvori8D = useCallback((d) => {
    setOsmdPrefill({
      id_deo: d.id_deo || idDeo,
      opis: d.opis || "",
    });
    setTip("8d");
  }, [idDeo]);

  const sigmaNivo = sigmaProcesa(cpk, imr.sigmaHat || spc.sigmaHat, agregat.dpmo);
  const sigmaBoja = sigmaNivo >= 5 ? C.zelena : sigmaNivo >= 4 ? C.zuta : sigmaNivo >= 3 ? C.narandzasta : C.crvena;

  const pad = ekran.mob ? 12 : ekran.tablet ? 14 : 18;

  return (
    <div style={{ padding: pad, overflowY: "auto", flex: 1, minHeight: 0, boxSizing: "border-box" }} ref={kartaRef}>
      <div style={{ display: "flex", gap: ekran.mob ? 8 : 10, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 4 }}>ID DELA</div>
          <select value={idDeo} onChange={e => { setIdDeo(e.target.value); setPozicija(""); }}
            style={{ ...INP_S, minWidth: ekran.mob ? "100%" : 160, width: ekran.mob ? "100%" : undefined, cursor: "pointer" }}>
            <option value="">— Izaberi —</option>
            {delovi.map(d => (
              <option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 4 }}>KARAKTERISTIKA</div>
          <select value={pozicija} onChange={e => setPozicija(e.target.value)} disabled={!idDeo}
            style={{ ...INP_S, minWidth: ekran.mob ? "100%" : 200, width: ekran.mob ? "100%" : undefined, cursor: "pointer" }}>
            <option value="">— Sve dimenzije —</option>
            {pozicijeDeo.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {[["OD", datumOd, setDatumOd], ["DO", datumDo, setDatumDo]].map(([l, v, s]) => (
          <div key={l}>
            <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 4 }}>{l}</div>
            <input type="date" value={v} onChange={e => s(e.target.value)} style={INP_S} />
          </div>
        ))}
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 4 }}>SMENA</div>
          <select value={smena} onChange={e => setSmena(e.target.value)} style={{ ...INP_S, cursor: "pointer" }}>
            <option value="">Sve</option>
            <option value="1">1</option><option value="2">2</option><option value="3">3</option>
          </select>
        </div>
        {KARTE_TIPOVI.has(tip) && tip !== "i" && tip !== "mr" && (
          <div>
            <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 4 }}>n PODGRUPE</div>
            <select value={nPodgrupa} onChange={e => setNPodgrupa(Number(e.target.value))} style={{ ...INP_S, cursor: "pointer" }}>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}
        <button type="button" onClick={ucitaj} disabled={!idDeo || loading}
          style={{
            background: !idDeo || loading ? C.hover : C.plava, border: "none", borderRadius: 6,
            color: !idDeo || loading ? C.sivi : "#fff", fontSize: 11, fontWeight: 700,
            padding: "8px 14px", cursor: !idDeo ? "not-allowed" : "pointer", alignSelf: "flex-end",
          }}>
          {loading ? "..." : "↻"}
        </button>
        <button type="button" onClick={exportPDF} disabled={!rawData.length}
          style={{
            background: !rawData.length ? C.hover : "#7c3aed", border: "none", borderRadius: 6,
            color: !rawData.length ? C.sivi : "#fff", fontSize: 11, fontWeight: 700,
            padding: "8px 12px", cursor: !rawData.length ? "not-allowed" : "pointer", alignSelf: "flex-end",
          }}>
          📄 PDF
        </button>
        <button type="button" onClick={exportExcel} disabled={!rawData.length}
          style={{
            background: !rawData.length ? C.hover : C.zelena, border: "none", borderRadius: 6,
            color: !rawData.length ? C.sivi : "#fff", fontSize: 11, fontWeight: 700,
            padding: "8px 12px", cursor: !rawData.length ? "not-allowed" : "pointer", alignSelf: "flex-end",
          }}>
          📊 Excel
        </button>
        {rawData.length > 0 && (
          <span style={{ color: C.sivi, fontSize: 10, alignSelf: "center" }}>
            {agregat.n} merenja · RTY {agregat.rty}% · DPMO {agregat.dpmo.toLocaleString()} ·{" "}
            <span style={{ color: agregat.nok > 0 ? C.crvena : C.zelena, fontWeight: 700 }}>
              {agregat.nok} NOK
            </span>
          </span>
        )}
      </div>

      {idDeo && !vodicSakrij && (
        <SpcVodicPredlog
          C={C}
          predlog={predlog}
          tip={tip}
          setTip={setTip}
          onZatvori={zatvoriVodic}
          kompakt={ekran.mob}
        />
      )}

      <div style={{
        display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 16, flexWrap: "wrap",
        overflowX: ekran.mob ? "auto" : "visible", WebkitOverflowScrolling: "touch",
      }}>
        {TABOVI.map(([id, naziv, boja]) => {
          const preporuka = tabJePreporucen(predlog, id);
          return (
          <button key={id} type="button" onClick={() => setTip(id)} style={{
            background: "none", border: "none",
            borderBottom: tip === id ? `2px solid ${boja}` : "2px solid transparent",
            color: tip === id ? boja : C.sivi,
            fontSize: ekran.mob ? 10 : 11, fontWeight: 700, padding: "8px 12px", cursor: "pointer", flexShrink: 0,
            boxShadow: preporuka && tip !== id ? `inset 0 -1px 0 ${C.plava}55` : "none",
          }}>
            {naziv}{preporuka ? <span style={{ color: C.plava, fontSize: 8, marginLeft: 3 }}>★</span> : null}
          </button>
        );})}
      </div>

      {!idDeo ? (
        <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: C.border, fontSize: 12 }}>
          Izaberi ID dela
        </div>
      ) : tip === "oee" ? (
        <OeeKpiTab
          C={C}
          modul="merljive"
          addToast={addToast}
          idDeoFilter={idDeo}
          datumOd={datumOd}
          datumDo={datumDo}
          smena={smena}
        />
      ) : loading ? (
        <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: C.sivi }}>Učitavanje…</div>
      ) : rawData.length === 0 ? (
        <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: C.border }}>Nema merenja</div>
      ) : trebaDimenzija && !pozicija ? (
        <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: C.zuta, fontSize: 12, textAlign: "center", padding: 20 }}>
          Za {tip.toUpperCase()} kartu izaberi konkretnu dimenziju (karakteristiku)
        </div>
      ) : (
        <>
          {KARTE_TIPOVI.has(tip) && (
            <>
              {baselineAktivan && (
                <div style={{
                  background: `${C.zuta}18`,
                  border: `1px solid ${C.zuta}50`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  marginBottom: 12,
                  color: C.zuta,
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  📌 {formatBaselineBadge(baselineAktivan)}
                  {baselineAktivan.napomena ? (
                    <span style={{ color: C.sivi, fontWeight: 400 }}> · {baselineAktivan.napomena}</span>
                  ) : null}
                </div>
              )}
              <KpiRed C={C} items={[
                ["CL", fmt(aktPodaci[0]?.cl, jedinica), C.zuta],
                ["UCL", fmt(aktPodaci[0]?.ucl, jedinica), C.crvena],
                ["LCL", fmt(aktPodaci[0]?.lcl, jedinica), C.zelena],
                ...(tip === "xbar" ? [["X̄̄", fmt(spc.xbarBar, jedinica), C.plava], ["R̄", fmt(spc.rBar, jedinica), C.narandzasta]] : []),
                ...(tip === "r" ? [["R̄", fmt(spc.rBar, jedinica), C.narandzasta]] : []),
                ...(tip === "i" ? [["X̄", fmt(imr.xBar, jedinica), C.plava], ["MR̄", fmt(imr.mrBar, jedinica), C.ljubicasta]] : []),
                ...(tip === "mr" ? [["MR̄", fmt(imr.mrBar, jedinica), C.ljubicasta]] : []),
                ["σ̂", fmt(imr.sigmaHat || spc.sigmaHat, jedinica), "#22d3ee"],
                ["VAN K.", upozoreni.length, upozoreni.length ? C.crvena : C.zelena],
              ]} />
              {kar && (
                <div style={{ color: C.sivi, fontSize: 10, marginBottom: 8 }}>
                  {gr.jeUgao ? (
                    <>
                      LSL {gr.lslText} ({fmt(gr.lsl, jedinica)}) · USL {gr.uslText} ({fmt(gr.usl, jedinica)})
                      {gr.nominala != null && <> · nominala {fmt(gr.nominala, jedinica)}</>}
                      {" · "}Excel IF(O7=Ugao): G7→mm — 15000 = 1,833333 mm
                    </>
                  ) : (
                    <>
                      LSL={gr.lsl ?? "—"} · USL={gr.usl ?? "—"} · nominala={gr.nominala ?? "—"} {gr.jedinica}
                    </>
                  )}
                  {cpk.cp != null && (
                    <>
                      {" · "}Cp=<span style={{ color: bojaKapabiliteta(cpk.cp, C), fontWeight: 700 }}>{cpk.cp}</span>
                      {" · "}Cpk=<span style={{ color: bojaKapabiliteta(cpk.cpk, C), fontWeight: 700 }}>{cpk.cpk ?? "—"}</span>
                    </>
                  )}
                </div>
              )}
              <TrendUpozorenje podaci={aktPodaci} C={C} jedinica={jedinica} />
              {(tip === "xbar" || tip === "r") && podgrupe.length === 0 ? (
                <div style={{ color: C.zuta, fontSize: 11, padding: 20 }}>
                  Nedovoljno merenja za podgrupe n={nPodgrupa}
                </div>
              ) : (tip === "i" || tip === "mr") && aktPodaci.length < 2 ? (
                <div style={{ color: C.zuta, fontSize: 11, padding: 20 }}>Potrebna bar 2 merenja za I-MR kartu</div>
              ) : (
                <>
                  <SpcKontrolnaGraf
                    podaci={aktPodaci}
                    bojaLinije={tip === "r" ? C.narandzasta : tip === "mr" ? C.ljubicasta : tip === "i" ? "#22d3ee" : C.zelena}
                    C={C}
                    lsl={gr.lsl}
                    usl={gr.usl}
                    naslovKarte={NASLOV_KARTE[tip]}
                    sufiks={isStepen(jedinica) ? " mm" : (jedinicaSpcOsi(jedinica) === "mm" ? " mm" : "")}
                    yDomain={yDomainSpc(aktPodaci, [gr.lsl, gr.usl].filter(Number.isFinite))}
                    formatVrednost={(v) => {
                      if (!Number.isFinite(v)) return "—";
                      if (isStepen(jedinica)) return `${fmt(v, jedinica)} (${decStepenUDms(v)})`;
                      return fmt(v, jedinica);
                    }}
                    height={ekran.mob ? 300 : 400}
                  />
                  <WesternUpozorenja podaci={aktPodaci} C={C} jedinica={jedinica} />
                </>
              )}
            </>
          )}

          {tip === "cpk" && (
            <>
              <NormalnostPanel normalnost={normalnost} C={C} jedinica={jedinica} />
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 12, marginTop: 14,
              }}>
                {[
                  ["X̄ / X̄̄", imr.xBar || spc.xbarBar, C.plava],
                  ["σ̂ SPC", imr.sigmaHat || spc.sigmaHat, "#22d3ee"],
                  ["σ uzorak", normalnost.sigma != null ? fmt(normalnost.sigma, jedinica) : "—", C.sivi],
                  ["Cp", cpk.cp, bojaKapabiliteta(cpk.cp, C)],
                  ["Cpk", cpk.cpk, bojaKapabiliteta(cpk.cpk, C)],
                  ["Sigma proc.", `${sigmaNivo}σ`, sigmaBoja],
                  ["Podgrupa n", nPodgrupa, C.sivi],
                ].map(([n, v, b]) => (
                  <div key={n} style={{
                    background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10,
                    padding: 16, textAlign: "center",
                  }}>
                    <div style={{ color: C.sivi, fontSize: 9, marginBottom: 6 }}>{n}</div>
                    <div style={{ color: b, fontSize: 22, fontWeight: 700 }}>{v ?? "—"}</div>
                  </div>
                ))}
              </div>
              {normalnost.status !== "ok" && cpk.cpk != null && (
                <div style={{ color: C.zuta, fontSize: 10, marginTop: 12, lineHeight: 1.5 }}>
                  Cp/Cpk pretpostavljaju približno normalnu raspodelu i stabilan proces. Ako je status žut/crven,
                  interpretiraj indekse uz oprez ili proširi uzorak.
                </div>
              )}
            </>
          )}

          {tip === "rty" && (
            <div>
              <KpiRed C={C} items={[
                ["RTY %", `${agregat.rty}%`, C.zelena],
                ["DPMO", agregat.dpmo.toLocaleString(), C.ljubicasta],
                ["Sigma", `${agregat.sigma.toFixed(1)}σ`, "#a3e635"],
                ["Uk. mereno", agregat.n, C.plava],
                ["Uk. NOK", agregat.nok, C.crvena],
              ]} />
              <SpcRtyTrendGraf data={rtyTrend} C={C} height={360} xKey="label" />
            </div>
          )}

          {tip === "sigma" && (
            <div>
              <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{
                  background: C.panel, border: `2px solid ${sigmaBoja}`, borderRadius: 16,
                  padding: "24px 32px", textAlign: "center", minWidth: 160,
                }}>
                  <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.5, marginBottom: 6 }}>SIGMA NIVO</div>
                  <div style={{ color: sigmaBoja, fontSize: 52, fontWeight: 700, lineHeight: 1 }}>
                    {sigmaNivo.toFixed(1)}σ
                  </div>
                  <div style={{ color: C.sivi, fontSize: 11, marginTop: 6 }}>
                    {sigmaNivo >= 5 ? "World class" : sigmaNivo >= 4 ? "Odlično" : sigmaNivo >= 3 ? "Dobro" : sigmaNivo >= 2 ? "Ispod proseka" : "Kritično"}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 200 }}>
                  {[
                    ["DPMO", agregat.dpmo.toLocaleString(), C.ljubicasta],
                    ["RTY %", `${agregat.rty}%`, C.zelena],
                    ["Cp", cpk.cp, bojaKapabiliteta(cpk.cp, C)],
                    ["Cpk", cpk.cpk, bojaKapabiliteta(cpk.cpk, C)],
                    ["σ̂ procesa", fmt(imr.sigmaHat || spc.sigmaHat, jedinica), "#22d3ee"],
                  ].map(([n, v, b]) => (
                    <div key={n} style={{ display: "flex", justifyContent: "space-between", background: C.panel, borderRadius: 8, padding: "10px 14px" }}>
                      <span style={{ color: C.sivi, fontSize: 11 }}>{n}</span>
                      <span style={{ color: b, fontWeight: 700, fontSize: 13 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: C.panel, borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 10 }}>SIGMA SKALA</div>
                <div style={{ display: "flex", height: 22, borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
                  {[C.crvena, C.narandzasta, C.zuta, "#84cc16", C.zelena, "#06b6d4"].map((c, i) => (
                    <div key={i} style={{ flex: 1, background: c, opacity: i + 1 <= Math.floor(sigmaNivo) ? 1 : 0.2, borderRight: i < 5 ? `1px solid ${C.bg}` : "" }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.sivi }}>
                  {["1σ", "2σ", "3σ", "4σ", "5σ", "6σ"].map(s => <span key={s}>{s}</span>)}
                </div>
              </div>
              <SpcSigmaBarGraf
                data={SIGMA_BENCH.map(b => ({ ...b, trenutni: b.sigma === Math.round(sigmaNivo) }))}
                C={C}
                height={260}
                accentBoja={sigmaBoja}
              />
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginTop: 16 }}>
                {SIGMA_BENCH.map((b, i) => (
                  <div key={b.nivo} style={{
                    display: "grid", gridTemplateColumns: "60px 100px 100px 1fr",
                    padding: "9px 14px", borderTop: i ? `1px solid ${C.border}` : "none",
                    background: Math.round(sigmaNivo) === b.sigma ? `${C.plava}15` : "transparent",
                    fontSize: 12, gap: 8,
                  }}>
                    <span style={{ fontWeight: 700, color: Math.round(sigmaNivo) === b.sigma ? C.plava : C.tekst }}>{b.nivo}</span>
                    <span style={{ color: C.sivi }}>{b.dpmo}</span>
                    <span style={{ color: C.sivi }}>{b.rty}</span>
                    <span style={{ color: C.sivi }}>{b.opis}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tip === "dashboard" && (
            <div>
              <KpiRed C={C} items={[
                ["RTY %", `${agregat.rty}%`, C.zelena],
                ["DPMO", agregat.dpmo.toLocaleString(), C.ljubicasta],
                ["Sigma", `${sigmaNivo.toFixed(1)}σ`, sigmaBoja],
                ["OK", agregat.ok, C.zelena],
                ["NOK", agregat.nok, C.crvena],
                ["Merenja", agregat.n, C.plava],
              ]} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <SpcRtyJednaLinija data={rtyTrend} C={C} height={220} xKey="label" naslov="RTY % trend" />
                <SpcOkNokBarGraf data={poSmeni} C={C} height={220} xKey="s" naslov="Po smeni" />
              </div>
              {!pozicija && poPoziciji.length > 0 && (
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10, letterSpacing: 1 }}>PO DIMENZIJI</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {poPoziciji.map(p => (
                      <div key={p.pozicija} style={{
                        display: "grid", gridTemplateColumns: "1fr 80px 80px 80px",
                        gap: 8, fontSize: 11, padding: "6px 0", borderBottom: `1px solid ${C.hover}`,
                      }}>
                        <span style={{ color: C.tekst }}>{p.pozicija}</span>
                        <span style={{ color: C.zelena }}>RTY {p.rty}%</span>
                        <span style={{ color: C.ljubicasta }}>DPMO {p.dpmo.toLocaleString()}</span>
                        <span style={{ color: p.nok ? C.crvena : C.sivi }}>{p.nok} NOK</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tip === "pareto" && (
            paretoData.length ? (
              <>
                <div style={{
                  border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 14,
                }}>
                  <div style={{
                    display: "grid", gridTemplateColumns: "1fr 70px 70px auto",
                    background: C.hover, padding: "8px 14px", fontSize: 9, color: C.sivi, gap: 8,
                  }}>
                    <span>POZICIJA</span><span>NOK</span><span>%</span><span />
                  </div>
                  {paretoData.map((p, i) => {
                    const uk = paretoData.reduce((s, d) => s + d.count, 0);
                    return (
                      <div key={p.naziv} style={{
                        display: "grid", gridTemplateColumns: "1fr 70px 70px auto",
                        padding: "8px 14px", borderTop: `1px solid ${C.border}`, fontSize: 11, gap: 8, alignItems: "center",
                      }}>
                        <span style={{ color: C.crvena, fontWeight: 700 }}>{p.naziv}</span>
                        <span>{p.count}</span>
                        <span style={{ color: C.sivi }}>{uk > 0 ? ((p.count / uk) * 100).toFixed(1) : 0}%</span>
                        <button type="button" onClick={() => otvori8D({
                          id_deo: idDeo,
                          opis: `Pareto merljive: ${p.naziv} — ${p.count} NOK (${p.kum}% kum.)`,
                        })}
                          style={{
                            background: "none", border: `1px solid ${C.plava}`, borderRadius: 5,
                            color: C.plava, fontSize: 9, padding: "3px 8px", cursor: "pointer",
                          }}>8D →</button>
                      </div>
                    );
                  })}
                </div>
                <SpcParetoGraf data={paretoData} C={C} height={320} kumKey="kum" countKey="count" />
              </>
            ) : (
              <div style={{ color: C.zelena, textAlign: "center", padding: 40 }}>Nema NOK merenja ✓</div>
            )
          )}

          {tip === "masina" && (
            <PoGrupiPanel merenja={rawData} polje="masina" naslov="MAŠINA" C={C} />
          )}

          {tip === "operater" && (
            <>
              <PoGrupiPanel merenja={rawData} polje="kontrolor" naslov="KONTROLOR" podnaslov="Ko je evidentirao merenje" C={C} />
              <div style={{ marginTop: 24 }}>
                <PoGrupiPanel merenja={rawData} polje="operater" naslov="OPERATER" podnaslov="Uloga / radnik na unosu" C={C} />
              </div>
            </>
          )}

          {tip === "korelacija" && (
            <KorelacijaPozicijaMasinaPanel merenja={rawData} C={C} />
          )}

          {tip === "poredi" && (
            <PoredjenjeMerljive idDeo={idDeo} pozicija={pozicija || ""} C={C} addToast={addToast} />
          )}

          {tip === "foto_spc" && (
            <ArhivaNokMerljive merenja={rawData} idDeo={idDeo} C={C} />
          )}

          {tip === "8d" && (
            <OsmDIzvestajMerljive
              korisnik={korisnik}
              C={C}
              addToast={addToast}
              sviDelovi={delovi}
              prefill={osmdPrefill}
              onPrefillUsed={() => setOsmdPrefill(null)}
            />
          )}

          {tip === "heatmap" && (
            <HeatmapMerljivePanel merenja={rawData} C={C} />
          )}

          {tip === "smena" && (
            <SpcOkNokBarGraf data={poSmeni} C={C} height={300} xKey="s" naslov="Merenja po smeni" />
          )}

          {tip === "hist" && (
            <>
              <NormalnostPanel normalnost={normalnost} C={C} jedinica={jedinica} kompakt />
              {kar && (
                <div style={{ color: C.sivi, fontSize: 10, marginBottom: 8 }}>
                  {gr.jeUgao
                    ? <>LSL {gr.lslText} ({fmt(gr.lsl, jedinica)}) · USL {gr.uslText} ({fmt(gr.usl, jedinica)})</>
                    : <>LSL={gr.lsl ?? "—"} · USL={gr.usl ?? "—"}</>}
                  {histPaket.mu != null && histPaket.sigma != null && (
                    <> · μ={fmt(histPaket.mu, jedinica)} · σ={fmt(histPaket.sigma, jedinica)}</>
                  )}
                </div>
              )}
              {histData.length > 0 ? (
                <SpcHistogramGraf
                  histData={histData}
                  C={C}
                  gr={gr}
                  histPaket={histPaket}
                  formatVrednost={v => fmt(v, jedinica)}
                  binZaVrednost={histBinZaVrednost}
                  height={360}
                />
              ) : (
                <div style={{ color: C.border, fontSize: 12, padding: 40, textAlign: "center" }}>
                  Nema numeričkih merenja za histogram
                </div>
              )}
              <div style={{ color: C.sivi, fontSize: 9, marginTop: 8, lineHeight: 1.5 }}>
                Ljubičasta kriva: Gausova raspodela N(μ, σ²) iz uzorka · stubovi: stvarna učestanost po intervalima.
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
