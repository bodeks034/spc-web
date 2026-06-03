import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
  ResponsiveContainer, Cell,
} from "recharts";
import {
  podgrupeMerenja, izracunajXbarRKarte, izracunajIMRKarte, calcCpCpk,
  paretoNokPoPoziciji, statPoSmeni, histogramMerenja,
  trendKvalitetaPoDanu, agregatKvaliteta, nokPoPozicijiDashboard,
  SIGMA_BENCH, yDomainSpc, sigmaProcesa,
} from "./lib/varijabilneSpcStats.js";
import { upisiSpcAlarm, kreirajAutoEskalaciju } from "./lib/spcStats.js";
import { downloadWorkbook, exportMerenjaVarijabilnaExcel } from "./lib/excelSync.js";
import { graniceKarakteristike, formatVrednostKarte, decStepenUDms, isStepen } from "./lib/varijabilneUtils.js";

const SUPABASE_URL = "https://wzxkcomeurogvfisticq.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eGtjb21ldXJvZ3ZmaXN0aWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzM1MDYsImV4cCI6MjA5NTEwOTUwNn0.Oa17CJOr-Zep2UsG5n8N7kehuoJmHanNYaNy4VriDBk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const KARTE_TIPOVI = new Set(["xbar", "r", "i", "mr"]);

function dISO() {
  return new Date().toISOString().split("T")[0];
}

function fmt(v, jedinica, dec = 4) {
  return formatVrednostKarte(v, jedinica, dec);
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

function SpcGraf({ podaci, bojaLinije, C, lsl, usl, jedinica, height = 320 }) {
  if (!podaci?.length) return null;
  const sufiks = isStepen(jedinica) ? "°" : "";
  const cl = podaci[0].cl;
  const ucl = podaci[0].ucl;
  const lcl = podaci[0].lcl;
  const yDom = yDomainSpc(podaci, [lsl, usl].filter(Number.isFinite));
  const sigma = (ucl - cl) / 3;

  const Dot = (props) => {
    const { cx, cy, index } = props;
    const u = podaci[index]?.upoz;
    return (
      <circle cx={cx} cy={cy} r={u ? 7 : 4}
        fill={u ? C.crvena : bojaLinije} stroke={u ? "#fff" : "none"} strokeWidth={u ? 2 : 0} opacity={0.95} />
    );
  };

  const refLabel = (text, color, y) => ({
    value: `${text}=${fmt(y, jedinica)}`,
    fill: color,
    fontSize: 9,
    position: "right",
  });

  const fmtTip = (v, d) => {
    if (!Number.isFinite(v)) return "—";
    if (isStepen(jedinica)) return `${fmt(v, jedinica)} (${decStepenUDms(v)})`;
    return fmt(v, jedinica);
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={podaci} margin={{ top: 12, right: 110, bottom: 32, left: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.hover} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: C.sivi, fontSize: 9 }} tickLine={false}
          interval={Math.max(0, Math.floor(podaci.length / 14))} />
        <YAxis tick={{ fill: C.sivi, fontSize: 10 }} tickLine={false} axisLine={false}
          domain={yDom} tickFormatter={v => `${v}${sufiks}`} width={56} />
        <Tooltip
          contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }}
          formatter={(v, _n, p) => {
            const d = p?.payload;
            const we = d?.upoz ? " ⚠ WE" : "";
            return [
              `${fmtTip(v)}${we}`,
              `UCL ${fmtTip(d?.ucl)} · CL ${fmtTip(d?.cl)} · LCL ${fmtTip(d?.lcl)}`,
            ];
          }}
        />
        {Number.isFinite(ucl) && (
          <ReferenceLine y={ucl} stroke={C.crvena} strokeWidth={2} strokeDasharray="8 4"
            label={refLabel("UCL", C.crvena, ucl)} />
        )}
        {Number.isFinite(cl) && (
          <ReferenceLine y={cl} stroke={C.zuta} strokeWidth={2} strokeDasharray="4 3"
            label={refLabel("CL", C.zuta, cl)} />
        )}
        {Number.isFinite(lcl) && (
          <ReferenceLine y={lcl} stroke={C.zelena} strokeWidth={2} strokeDasharray="8 4"
            label={refLabel("LCL", C.zelena, lcl)} />
        )}
        {sigma > 0 && Number.isFinite(cl) && (
          <>
            <ReferenceLine y={cl + sigma} stroke={C.zuta} strokeWidth={0.5} strokeDasharray="2 6" opacity={0.45} />
            <ReferenceLine y={cl + 2 * sigma} stroke={C.crvena} strokeWidth={0.5} strokeDasharray="2 6" opacity={0.35} />
            <ReferenceLine y={cl - sigma} stroke={C.zuta} strokeWidth={0.5} strokeDasharray="2 6" opacity={0.45} />
            <ReferenceLine y={cl - 2 * sigma} stroke={C.crvena} strokeWidth={0.5} strokeDasharray="2 6" opacity={0.35} />
          </>
        )}
        {Number.isFinite(usl) && (
          <ReferenceLine y={usl} stroke="#f472b6" strokeWidth={1.2} strokeDasharray="3 3"
            label={{ value: `USL=${fmt(usl, jedinica)}`, fill: "#f472b6", fontSize: 8, position: "left" }} />
        )}
        {Number.isFinite(lsl) && (
          <ReferenceLine y={lsl} stroke="#f472b6" strokeWidth={1.2} strokeDasharray="3 3"
            label={{ value: `LSL=${fmt(lsl, jedinica)}`, fill: "#f472b6", fontSize: 8, position: "left" }} />
        )}
        <Line type="monotone" dataKey="val" stroke={bojaLinije} strokeWidth={2.5}
          dot={<Dot />} connectNulls activeDot={{ r: 6 }} name="Vrednost" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function KpiRed({ items, C }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
      {items.map(([n, v, b]) => (
        <div key={n} style={{
          background: C.panel, border: `1px solid ${b}25`, borderRadius: 8,
          padding: "9px 12px", textAlign: "center", minWidth: 72,
        }}>
          <div style={{ color: C.sivi, fontSize: 8, letterSpacing: 1.2 }}>{n}</div>
          <div style={{ color: b, fontSize: 15, fontWeight: 700 }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

export default function MerljiveSpcKarte({ C, addToast, korisnik }) {
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
  const kartaRef = useRef(null);
  const alarmPoslat = useRef(new Set());

  useEffect(() => {
    (async () => {
      const [dRes, kRes] = await Promise.all([
        supabase.from("sop_deo_varijabilni").select("id_deo,naziv_dela,broj_merenja").order("id_deo"),
        supabase.from("karakteristike_merljive").select("id_deo,pozicija,lsl,usl,nominala,jedinica").order("pozicija"),
      ]);
      setDelovi(dRes.data || []);
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

  const podgrupe = useMemo(() => podgrupeMerenja(rawData, nPodgrupa, jedinica), [rawData, nPodgrupa, jedinica]);
  const spc = useMemo(() => izracunajXbarRKarte(podgrupe, nPodgrupa), [podgrupe, nPodgrupa]);
  const imr = useMemo(() => izracunajIMRKarte(rawData, jedinica), [rawData, jedinica]);
  const cpk = useMemo(() => {
    const sig = imr.sigmaHat || spc.sigmaHat;
    const mean = imr.xBar || spc.xbarBar;
    return calcCpCpk(mean, sig, gr.lsl, gr.usl);
  }, [imr, spc, gr.lsl, gr.usl]);
  const paretoData = useMemo(() => paretoNokPoPoziciji(rawData, 8), [rawData]);
  const poSmeni = useMemo(() => statPoSmeni(rawData), [rawData]);
  const histData = useMemo(() => histogramMerenja(rawData, 10, jedinica), [rawData, jedinica]);
  const rtyTrend = useMemo(() => trendKvalitetaPoDanu(rawData), [rawData]);
  const agregat = useMemo(() => agregatKvaliteta(rawData), [rawData]);
  const poPoziciji = useMemo(() => nokPoPozicijiDashboard(rawData), [rawData]);

  const aktPodaci = useMemo(() => {
    if (tip === "r") return spc.rPodaci;
    if (tip === "i") return imr.iPodaci;
    if (tip === "mr") return imr.mrPodaci;
    return spc.xbarPodaci;
  }, [tip, spc, imr]);

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
    ["hist", "Histogram", C.ljubicasta],
  ];

  const sigmaNivo = sigmaProcesa(cpk, imr.sigmaHat || spc.sigmaHat, agregat.dpmo);
  const sigmaBoja = sigmaNivo >= 5 ? C.zelena : sigmaNivo >= 4 ? C.zuta : sigmaNivo >= 3 ? C.narandzasta : C.crvena;

  return (
    <div style={{ padding: 18, overflowY: "auto", flex: 1, minHeight: 0 }} ref={kartaRef}>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 4 }}>ID DELA</div>
          <select value={idDeo} onChange={e => { setIdDeo(e.target.value); setPozicija(""); }}
            style={{ ...INP_S, minWidth: 160, cursor: "pointer" }}>
            <option value="">— Izaberi —</option>
            {delovi.map(d => (
              <option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 4 }}>KARAKTERISTIKA</div>
          <select value={pozicija} onChange={e => setPozicija(e.target.value)} disabled={!idDeo}
            style={{ ...INP_S, minWidth: 200, cursor: "pointer" }}>
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

      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 16, flexWrap: "wrap" }}>
        {TABOVI.map(([id, naziv, boja]) => (
          <button key={id} type="button" onClick={() => setTip(id)} style={{
            background: "none", border: "none",
            borderBottom: tip === id ? `2px solid ${boja}` : "2px solid transparent",
            color: tip === id ? boja : C.sivi,
            fontSize: 11, fontWeight: 700, padding: "8px 12px", cursor: "pointer",
          }}>
            {naziv}
          </button>
        ))}
      </div>

      {!idDeo ? (
        <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: C.border, fontSize: 12 }}>
          Izaberi ID dela
        </div>
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
                      {" · "}osa grafikona: decimalni stepeni (°)
                    </>
                  ) : (
                    <>
                      LSL={gr.lsl ?? "—"} · USL={gr.usl ?? "—"} · nominala={gr.nominala ?? "—"} {gr.jedinica}
                    </>
                  )}
                  {cpk.cp != null && <> · Cp={cpk.cp} · Cpk={cpk.cpk}</>}
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
                  <SpcGraf
                    podaci={aktPodaci}
                    bojaLinije={tip === "r" ? C.narandzasta : tip === "mr" ? C.ljubicasta : tip === "i" ? "#22d3ee" : C.zelena}
                    C={C}
                    lsl={gr.lsl}
                    usl={gr.usl}
                    jedinica={jedinica}
                  />
                  <WesternUpozorenja podaci={aktPodaci} C={C} jedinica={jedinica} />
                </>
              )}
            </>
          )}

          {tip === "cpk" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
              {[
                ["X̄ / X̄̄", imr.xBar || spc.xbarBar, C.plava],
                ["σ̂", imr.sigmaHat || spc.sigmaHat, "#22d3ee"],
                ["Cp", cpk.cp, C.zelena],
                ["Cpk", cpk.cpk, cpk.cpk != null && cpk.cpk < 1.33 ? C.crvena : C.zelena],
                ["Sigma proc.", `${sigmaNivo}σ`, sigmaBoja],
                ["Podgrupa n", nPodgrupa, C.sivi],
              ].map(([n, v, b]) => (
                <div key={n} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, textAlign: "center" }}>
                  <div style={{ color: C.sivi, fontSize: 9, marginBottom: 6 }}>{n}</div>
                  <div style={{ color: b, fontSize: 22, fontWeight: 700 }}>{v ?? "—"}</div>
                </div>
              ))}
            </div>
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
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={rtyTrend} margin={{ top: 8, right: 70, bottom: 44, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.hover} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: C.sivi, fontSize: 9 }} angle={-35} textAnchor="end" height={48} />
                  <YAxis yAxisId="l" domain={[0, 100]} tick={{ fill: C.sivi, fontSize: 10 }} tickFormatter={v => `${v}%`} width={42} />
                  <YAxis yAxisId="r" orientation="right" domain={[0, "auto"]} tick={{ fill: C.sivi, fontSize: 10 }} width={50} />
                  <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11 }} />
                  <Legend wrapperStyle={{ color: C.sivi, fontSize: 10 }} />
                  <ReferenceLine yAxisId="l" y={99.38} stroke="#a3e635" strokeDasharray="3 5" opacity={0.7}
                    label={{ value: "4σ 99.38%", fill: "#a3e635", fontSize: 8, position: "right" }} />
                  <ReferenceLine yAxisId="l" y={95} stroke={C.zelena} strokeDasharray="4 2"
                    label={{ value: "95%", fill: C.zelena, fontSize: 8, position: "right" }} />
                  <Line yAxisId="l" type="monotone" dataKey="rty" stroke={C.zelena} strokeWidth={2.5}
                    dot={{ fill: C.zelena, r: 4 }} name="RTY %" connectNulls />
                  <Line yAxisId="r" type="monotone" dataKey="p" stroke={C.crvena} strokeWidth={1.5}
                    dot={{ fill: C.crvena, r: 3 }} name="p % NOK" strokeDasharray="5 3" connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
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
                    ["Cp / Cpk", `${cpk.cp ?? "—"} / ${cpk.cpk ?? "—"}`, C.plava],
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
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={SIGMA_BENCH.map(b => ({ ...b, trenutni: b.sigma === Math.round(sigmaNivo) }))} margin={{ top: 8, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.hover} />
                  <XAxis dataKey="nivo" tick={{ fill: C.sivi, fontSize: 10 }} />
                  <YAxis tick={{ fill: C.sivi, fontSize: 9 }} tickFormatter={v => v.toLocaleString()} />
                  <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, fontSize: 11 }} />
                  <Bar dataKey="sigma" name="Sigma" fill={C.plava} radius={[4, 4, 0, 0]}>
                    {SIGMA_BENCH.map((b, i) => (
                      <Cell key={b.nivo} fill={Math.round(sigmaNivo) === b.sigma ? sigmaBoja : C.plava} opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10, letterSpacing: 1 }}>RTY / DPMO TREND</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={rtyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.hover} />
                      <XAxis dataKey="label" tick={{ fill: C.sivi, fontSize: 8 }} />
                      <YAxis yAxisId="l" domain={[0, 100]} tick={{ fill: C.sivi, fontSize: 9 }} tickFormatter={v => `${v}%`} />
                      <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, fontSize: 10 }} />
                      <Line yAxisId="l" type="monotone" dataKey="rty" stroke={C.zelena} strokeWidth={2} dot={{ r: 3 }} name="RTY" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10, letterSpacing: 1 }}>PO SMENI</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={poSmeni}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.hover} />
                      <XAxis dataKey="s" tick={{ fill: C.sivi, fontSize: 9 }} />
                      <YAxis tick={{ fill: C.sivi, fontSize: 9 }} />
                      <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, fontSize: 10 }} />
                      <Bar dataKey="ok" stackId="a" fill={C.zelena} name="OK" />
                      <Bar dataKey="nok" stackId="a" fill={C.crvena} name="NOK" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
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
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={paretoData} margin={{ top: 8, right: 20, bottom: 40, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.hover} />
                  <XAxis dataKey="naziv" tick={{ fill: C.sivi, fontSize: 8 }} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fill: C.sivi, fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, fontSize: 11 }} />
                  <Bar dataKey="count" name="NOK" radius={[4, 4, 0, 0]}>
                    {paretoData.map((_, i) => <Cell key={i} fill={C.crvena} opacity={0.85 - i * 0.06} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: C.zelena, textAlign: "center", padding: 40 }}>Nema NOK merenja ✓</div>
            )
          )}

          {tip === "smena" && (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={poSmeni} margin={{ top: 8, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.hover} />
                <XAxis dataKey="s" tick={{ fill: C.sivi, fontSize: 10 }} />
                <YAxis tick={{ fill: C.sivi, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, fontSize: 11 }} />
                <Bar dataKey="ok" stackId="a" fill={C.zelena} name="OK" />
                <Bar dataKey="nok" stackId="a" fill={C.crvena} name="NOK" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {tip === "hist" && histData.length > 0 && (
            <>
              {kar && (
                <div style={{ color: C.sivi, fontSize: 10, marginBottom: 8 }}>
                  {gr.jeUgao
                    ? <>LSL {gr.lslText} ({fmt(gr.lsl, jedinica)}) · USL {gr.uslText} ({fmt(gr.usl, jedinica)})</>
                    : <>LSL={gr.lsl ?? "—"} · USL={gr.usl ?? "—"}</>}
                </div>
              )}
              <ResponsiveContainer width="100%" height={280}>
              <BarChart data={histData} margin={{ top: 8, right: 20, bottom: 40, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.hover} />
                <XAxis dataKey="bin" tick={{ fill: C.sivi, fontSize: 7 }} angle={-30} textAnchor="end" height={55} />
                <YAxis tick={{ fill: C.sivi, fontSize: 10 }} />
                <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, fontSize: 11 }} />
                <Bar dataKey="count" fill={C.plava} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            </>
          )}
        </>
      )}
    </div>
  );
}
