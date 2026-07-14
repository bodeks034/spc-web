import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  groupSpcRows, buildParetoFromLog, predloziGrupisanjeSpc,
  kreirajAutoEskalaciju, calcDPMO, calcPPM, calcDPMODefekti, calcRTY, sigmaIzDPMO, kvalitetIzPrve,
} from "../../../lib/spcStats.js";
import { LAB_FPY_TAB, LAB_FPY_PCT, LAB_FPY_KRATKO } from "../../../lib/rtyFpy.js";
import {
  jeKontrolaCelogVozila,
  predlogAtributivnihKarti,
  jeVodicSakriven,
  sakrijVodic,
} from "../../../lib/spcPredlogKarti.js";
import { exportSpcPredlogPaketPdf, exportSpcTrenutnaKartaPdf } from "../../../lib/spcPaketPdf.js";
import SpcVodicPredlog, { tabJePreporucen } from "../../SpcVodicPredlog.jsx";
import SpcKontrolnaGraf from "../../SpcKontrolnaGraf.jsx";
import {
  SpcParetoGraf, SpcOkNokBarGraf, SpcRtyTrendGraf, SpcPpmDpmoTrendGraf,
} from "../../SpcAnalitikaGrafovi.jsx";
import { fetchKpiUnos, agregirajKpiUnos } from "../../../lib/kpiUnos.js";
import { ucitajAktivniBaseline, primeniBaselineNaPodatke, formatBaselineBadge } from "../../../lib/spcBaseline.js";
import { agregirajAtributivnePoKljuču, statAtributivneRedovi } from "../../../lib/atributivneAgregacija.js";
import { useSpcFilterSync, SpcFilterTrakaBaner } from "../../../hooks/useSpcFilterSync.jsx";
import AnalitikaSpcSnapshot from "../../analitika/AnalitikaSpcSnapshot.jsx";
import SpcKartaOpis from "../../analitika/SpcKartaOpis.jsx";
import { opisSpcKarte } from "../../../lib/analitikaOpisi.js";
import {
  PoredjenjePerioda,
  TrendUpozorenje,
  KorelacijaGreskaMasina,
  FotoArhiva,
  OCKriva,
  StabilnostProcesa,
  exportExcel,
} from "../AtrAnalitikaDodaci.jsx";


export default function SpcKarteAtributivne({ sviDelovi, C, addToast, korisnik, onOtvori8D, spoljniFilter, pocetniTip, onPocetniTipPotrosen, onNavigacijaKarte }) {
  const [tip,setTip]         = useState("p");
  const [idDeo,setIdDeo]     = useState("");
  const [datumOd,setDatumOd] = useState("");
  const [datumDo,setDatumDo] = useState("");
  const [smena,setSmena]     = useState("");
  const [masinaId,setMasinaId] = useState("");
  const [grupisanje,setGrupisanje] = useState("dan");
  const [grupisanjeRucno,setGrupisanjeRucno] = useState(false);
  const [loading,setLoading] = useState(false);
  const [rawData,setRawData] = useState([]);
  const [masineList,setMasineList] = useState([]);
  const [vodicSakrij,setVodicSakrij] = useState(false);
  const [baselineAktivan, setBaselineAktivan] = useState(null);
  const [kpiPeriod, setKpiPeriod] = useState(null);
  const kartaRef = useRef(null);
  const sadrzajRef = useRef(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const alarmPoslat = useRef(new Set());
  const prevIdDeoRef = useRef("");

  useSpcFilterSync(spoljniFilter, { setIdDeo, setDatumOd, setDatumDo, setSmena });

  useEffect(() => {
    if (pocetniTip) {
      setTip(pocetniTip);
      onPocetniTipPotrosen?.();
    }
  }, [pocetniTip, onPocetniTipPotrosen]);

  const deoIzabran = useMemo(() => sviDelovi.find(d => d.id_deo === idDeo), [sviDelovi, idDeo]);
  const predlog = useMemo(
    () => predlogAtributivnihKarti({ deo: deoIzabran, rawData, grupisanje }),
    [deoIzabran, rawData, grupisanje],
  );

  useEffect(() => {
    setVodicSakrij(jeVodicSakriven("atr", idDeo));
  }, [idDeo]);

  useEffect(() => {
    if (!idDeo || idDeo === prevIdDeoRef.current) return;
    prevIdDeoRef.current = idDeo;
    const prvi = predlog?.stavke?.[0]?.id;
    if (prvi) setTip(prvi);
  }, [idDeo, predlog]);

  const zatvoriVodic = () => {
    sakrijVodic("atr", idDeo);
    setVodicSakrij(true);
  };

  useEffect(() => {
    supabase.from("masine").select("id,naziv").then(({ data }) => setMasineList(data || []));
  }, []);

  useEffect(() => {
    setGrupisanjeRucno(false);
    setGrupisanje(jeKontrolaCelogVozila(deoIzabran) ? "komad" : "dan");
  }, [idDeo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!idDeo || grupisanjeRucno || !rawData.length) return;
    setGrupisanje(predloziGrupisanjeSpc(rawData, {
      vozilo: jeKontrolaCelogVozila(deoIzabran),
    }));
  }, [idDeo, rawData, deoIzabran, grupisanjeRucno]);

  const ucitaj = useCallback(async()=>{
    if(!idDeo)return; setLoading(true);
    const selectFull = "datum,smena,status,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,podkategorija,masina_id,inspekcija_id,sesija_id,created_at,id_deo,id,masina:masine(naziv),kontrolor:radnici!kontrolni_log_kontrolor_id_fkey(ime)";
    const selectBase = "datum,smena,status,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,podkategorija,masina_id,sesija_id,created_at,id_deo,id,masina:masine(naziv),kontrolor:radnici!kontrolni_log_kontrolor_id_fkey(ime)";
    const applyFilters = (q) => {
      let f = q.eq("id_deo", idDeo).order("datum", { ascending: true }).order("created_at", { ascending: true });
      if (datumOd) f = f.gte("datum", datumOd);
      if (datumDo) f = f.lte("datum", datumDo);
      if (smena) f = f.eq("smena", Number(smena));
      if (masinaId) f = f.eq("masina_id", Number(masinaId));
      return f;
    };
    try{
      let { data, error } = await applyFilters(supabase.from("kontrolni_log").select(selectFull));
      if (error && /inspekcija_id/i.test(error.message)) {
        ({ data, error } = await applyFilters(supabase.from("kontrolni_log").select(selectBase)));
      }
      if (error) throw error;
      setRawData(data||[]);
    }catch(e){addToast(e.message,"greska"); setRawData([]);}
    finally{setLoading(false);}
  },[idDeo,datumOd,datumDo,smena,masinaId,addToast]);

  useEffect(()=>{ucitaj();},[ucitaj]);

  useEffect(() => {
    if (!idDeo) {
      setKpiPeriod(null);
      return undefined;
    }
    let alive = true;
    (async () => {
      try {
        const rows = await fetchKpiUnos(supabase, {
          modul: "atributivne",
          idDeo,
          datumOd: datumOd || undefined,
          datumDo: datumDo || undefined,
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
  }, [idDeo, datumOd, datumDo, smena]);

  useEffect(() => {
    if (!idDeo || !tip) {
      setBaselineAktivan(null);
      return undefined;
    }
    let alive = true;
    (async () => {
      try {
        const b = await ucitajAktivniBaseline(supabase, { idDeo, tipKarte: tip });
        if (alive) setBaselineAktivan(b);
      } catch {
        if (alive) setBaselineAktivan(null);
      }
    })();
    return () => { alive = false; };
  }, [idDeo, tip]);

  const grupe = useMemo(() => groupSpcRows(rawData, grupisanje), [rawData, grupisanje]);

  const kvalitetUk = useMemo(() => {
    const logOk = grupe.reduce((s, g) => s + g.ok, 0);
    const logNok = grupe.reduce((s, g) => s + g.nok, 0);
    const logN = grupe.reduce((s, g) => s + g.n, 0);
    return kvalitetIzPrve({
      kpi: kpiPeriod,
      ok: logOk,
      nok: logNok,
      n: logN,
    });
  }, [grupe, kpiPeriod]);

  const statUk = useMemo(() => statAtributivneRedovi(rawData), [rawData]);

  const ukOK = kvalitetUk.ispravnoIzPrve;
  const ukNOK = kvalitetUk.neusaglaseno;
  const ukN = kvalitetUk.ukupno;
  const ppmSpc = ukN > 0 ? calcPPM(ukNOK, ukN) : null;
  const dpmoSpc = ukN > 0
    ? (statUk.komNok > 0 && statUk.komNok !== statUk.nok
      ? calcDPMODefekti(statUk.komNok, statUk.n)
      : kvalitetUk.dpmo)
    : null;
  const pBar  = ukN>0?ukNOK/ukN:0;
  const cBar  = grupe.length>0?grupe.reduce((s,g)=>s+g.c,0)/grupe.length:0;
  const uBar  = ukN>0?grupe.reduce((s,g)=>s+g.c,0)/ukN:0;
  const nBar  = grupe.length>0?ukN/grupe.length:1; // prosečna veličina podgrupe za np/nC

  // ── 5 KARATA ─────────────────────────────────────────────
  const karte = useMemo(()=>[
    {
      id:"p", naziv:"p-Karta", opis:"Proporcija neispravnih · varijabilno n",
      boja:C.plava, sufiks:"%",
      podaci: grupe.map(g=>({
        datum:g.datum, label:g.label,
        val:+(g.n>0?(g.nok/g.n)*100:0).toFixed(3),
        cl: +(pBar*100).toFixed(3),
        ucl:+((pBar+3*Math.sqrt(pBar*(1-pBar)/Math.max(g.n,1)))*100).toFixed(3),
        lcl:+(Math.max(0,pBar-3*Math.sqrt(pBar*(1-pBar)/Math.max(g.n,1)))*100).toFixed(3),
        n:g.n, nok:g.nok,
      })),
    },
    {
      id:"np", naziv:"np-Karta", opis:"Broj neispravnih · konstantno n",
      boja:"#22d3ee", sufiks:"",
      podaci: grupe.map(g=>({
        datum:g.datum, label:g.label,
        val:+g.nok.toFixed(0),
        cl: +(pBar*nBar).toFixed(2),
        ucl:+(pBar*nBar+3*Math.sqrt(pBar*(1-pBar)*nBar)).toFixed(2),
        lcl:+(Math.max(0,pBar*nBar-3*Math.sqrt(pBar*(1-pBar)*nBar))).toFixed(2),
        n:g.n, nok:g.nok,
      })),
    },
    {
      id:"c", naziv:"C-Karta", opis:"Ukupan broj grešaka · konstantno n",
      boja:C.narandzasta, sufiks:"",
      podaci: (()=>{
        const cgr={};
        rawData.forEach(r=>{
          const k=`${r.datum}|${r.greska_naziv||"sve"}`;
          if(!cgr[k])cgr[k]={datum:r.datum,naziv:r.greska_naziv||"sve",c:0};
          cgr[k].c+=r.kom_nok||0;
        });
        return Object.values(cgr).sort((a,b)=>a.datum.localeCompare(b.datum)).map(g=>({
          datum:g.datum, naziv:g.naziv,
          val:+g.c.toFixed(0),
          cl: +cBar.toFixed(2),
          ucl:+(cBar+3*Math.sqrt(Math.max(cBar,0.001))).toFixed(2),
          lcl:+(Math.max(0,cBar-3*Math.sqrt(Math.max(cBar,0.001)))).toFixed(2),
        }));
      })(),
    },
    {
      id:"nc", naziv:"nC-Karta", opis:"Ukupan broj grešaka po periodu · konstantno n",
      boja:"#f472b6", sufiks:"",
      podaci: grupe.map(g=>({
        datum:g.datum, label:g.label,
        val:+g.c.toFixed(0),
        cl: +cBar.toFixed(2),
        ucl:+(cBar+3*Math.sqrt(Math.max(cBar,0.001))).toFixed(2),
        lcl:+(Math.max(0,cBar-3*Math.sqrt(Math.max(cBar,0.001)))).toFixed(2),
      })),
    },
    {
      id:"u", naziv:"u-Karta", opis:"Grešaka po komadu · varijabilno n",
      boja:C.ljubicasta, sufiks:"",
      podaci: grupe.map(g=>({
        datum:g.datum, label:g.label,
        val:+(g.n>0?g.c/g.n:0).toFixed(4),
        cl: +uBar.toFixed(4),
        ucl:+(uBar+3*Math.sqrt(uBar/Math.max(g.n,1))).toFixed(4),
        lcl:+(Math.max(0,uBar-3*Math.sqrt(uBar/Math.max(g.n,1)))).toFixed(4),
        n:g.n,
      })),
    },
  ],[grupe,rawData,pBar,cBar,uBar,nBar,C]);

  const akt = karte.find(k=>k.id===tip)||karte[0];

  const cd = useMemo(() => {
    if (!akt?.podaci?.length) return [];
    const pod = akt.podaci.map(d => ({
      ...d,
      label: d.label || d.datum?.substring(5) || (d.naziv?.substring(0, 8)) || "",
    }));
    return primeniBaselineNaPodatke(pod, baselineAktivan).podaci;
  }, [akt, baselineAktivan]);

  useEffect(() => {
    if (!idDeo || !cd.length || !korisnik?.radnikId) return;
    const upoz = cd.filter(d => d.upoz);
    if (!upoz.length) return;
    const key = `${idDeo}-${tip}-${upoz.length}`;
    if (alarmPoslat.current.has(key)) return;
    alarmPoslat.current.add(key);
    (async () => {
      try {
        await kreirajAutoEskalaciju(supabase, {
          id_deo: idDeo,
          opis: `SPC ${tip}-karta: ${upoz.length} tačka van kontrole (Western Electric)`,
          prioritet: "kriticno",
          kreirao_id: korisnik.radnikId,
          prefiks: "AUTO-SPC",
        });
        addToast(`⚠ SPC upozorenje: ${upoz.length} tačka van kontrole — ne blokira liniju`, "greska");
      } catch (e) {
        addToast(`SPC eskalacija nije snimljena: ${e.message || "greška"}`, "greska");
      }
    })();
  }, [cd, idDeo, tip, korisnik?.radnikId, addToast]);

  const upozoreni = cd.filter(d=>d.upoz);
  const cl = cd.length ? +(cd.reduce((s,d)=>s+d.cl,0)/cd.length).toFixed(4) : 0;
  const ucl = cd.length ? +(cd.reduce((s,d)=>s+d.ucl,0)/cd.length).toFixed(4) : 0;
  const lcl = cd.length ? +(cd.reduce((s,d)=>s+d.lcl,0)/cd.length).toFixed(4) : 0;

  // ── Analiza po smeni ──────────────────────────────────────
  const poSmeni = useMemo(() => {
    const smeneGr = agregirajAtributivnePoKljuču(rawData, r => Number(r.smena));
    return [1, 2, 3].map((sm) => {
      const rows = smeneGr.get(sm) || [];
      const d = statAtributivneRedovi(rows);
      return {
        s: `Smena ${sm}`,
        ok: d.ok,
        nok: d.nok,
        n: d.n,
        rty: d.rty,
        p: d.p,
      };
    });
  }, [rawData]);

  const paretoData = useMemo(() => buildParetoFromLog(rawData, 8), [rawData]);

  // ── FPY trend (jedna faza) ───────────────────────────────
  const rtyTrend = useMemo(()=>grupe.map(g=>({
    datum: g.label||g.datum?.substring(5)||"",
    label: g.label||g.datum?.substring(5)||"",
    rty:   g.n>0?+((g.ok/g.n)*100).toFixed(1):0,
    p:     g.n>0?+(g.nok/g.n*100).toFixed(2):0,
    n:     g.n,
    nok:   g.nok,
    ppm:   g.n>0 ? calcPPM(g.nok, g.n) : 0,
    dpmo:  g.n>0
      ? (g.c > g.nok ? calcDPMODefekti(g.c, g.n) : calcDPMO(g.nok, g.n))
      : 0,
  })),[grupe]);

  // ── Eksport PDF (paket preporučenih karata) ─────────────────
  const tabSpremanZaPdf = useCallback((tabId) => {
    if (tabId === "8d") return false;
    const valid = new Set([
      ...karte.map(k => k.id),
      "pareto", "smena", "masina", "operater", "rty", "heatmap", "sigma",
      "korelacija", "poredi", "foto_spc", "oc_spc", "stabilnost_spc",
    ]);
    return valid.has(tabId);
  }, [karte]);

  const pdfMeta = useCallback(() => ({
    idDeo,
    nazivDela: deoIzabran?.naziv_dela,
    modul: "atributivne",
    datumOd,
    datumDo,
    smena: smena || undefined,
    naslov: `SPC atributivne · ${idDeo}`,
    bgColor: C.bg,
    tab: tip,
  }), [idDeo, deoIzabran?.naziv_dela, datumOd, datumDo, smena, C.bg, tip]);

  const nazivTrenutneKarte = useMemo(() => {
    const k = karte.find(x => x.id === tip);
    if (k) return k.naziv;
    const extra = {
      pareto: "Pareto", smena: "Po smeni", masina: "Po mašini", operater: "Po operateru",
      rty: LAB_FPY_TAB, heatmap: "Heat mapa", sigma: "Sigma nivo", korelacija: "Korelacija",
      poredi: "Poređenje", foto_spc: "Foto arhiva", oc_spc: "OC kriva", stabilnost_spc: "Stabilnost",
    };
    return extra[tip] || tip;
  }, [tip, karte]);

  const exportPdfPaket = async () => {
    if (pdfBusy || !idDeo || !predlog?.preporuceniIds?.length) return;
    setPdfBusy(true);
    try {
      await exportSpcPredlogPaketPdf({
        preporuceniIds: predlog.preporuceniIds,
        stavke: predlog.stavke,
        tab: tip,
        setTab: setTip,
        sadrzajRef,
        meta: pdfMeta(),
        tabSpreman: tabSpremanZaPdf,
        addToast,
      });
    } catch (e) {
      addToast(e.message || "PDF greška", "greska");
    } finally {
      setPdfBusy(false);
    }
  };

  const exportPdfOveKarte = async () => {
    if (pdfBusy || !idDeo) return;
    setPdfBusy(true);
    try {
      await exportSpcTrenutnaKartaPdf({
        sadrzajRef,
        meta: { ...pdfMeta(), tabNaziv: nazivTrenutneKarte },
        addToast,
      });
    } catch (e) {
      addToast(e.message || "PDF greška", "greska");
    } finally {
      setPdfBusy(false);
    }
  };

  const INP_S={background:C.input,border:`1px solid ${C.border}`,borderRadius:6,
    color:C.tekst,fontSize:11,padding:"7px 10px",outline:"none",fontFamily:"inherit"};
  const BOJE_P=[C.crvena,C.narandzasta,C.zuta,C.plava,C.ljubicasta,"#22d3ee","#f472b6","#a3e635"];

  return(
    <div style={{padding:18,overflowY:"auto"}} ref={kartaRef}>

      <SpcFilterTrakaBaner spoljniFilter={spoljniFilter} C={C} />

      {/* ── FILTERI ── */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4}}>ID DELA</div>
          <select value={idDeo} onChange={e=>setIdDeo(e.target.value)}
            style={{...INP_S,minWidth:170,cursor:"pointer"}}>
            <option value="">-- Izaberi deo --</option>
            {sviDelovi.map(d=><option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>)}
          </select>
        </div>
        {[["OD","date",datumOd,setDatumOd],["DO","date",datumDo,setDatumDo]].map(([l,t,v,s])=>(
          <div key={l}>
            <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4}}>{l}</div>
            <input type={t} value={v} onChange={e=>s(e.target.value)} style={INP_S}/>
          </div>
        ))}
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4}}>SMENA</div>
          <select value={smena} onChange={e=>setSmena(e.target.value)} style={{...INP_S,cursor:"pointer"}}>
            <option value="">Sve</option>
            <option value="1">1</option><option value="2">2</option><option value="3">3</option>
          </select>
        </div>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4}}>MAŠINA</div>
          <select value={masinaId} onChange={e=>setMasinaId(e.target.value)} style={{...INP_S,cursor:"pointer"}}>
            <option value="">Sve</option>
            {masineList.map(m=><option key={m.id} value={m.id}>{m.naziv}</option>)}
          </select>
        </div>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4}}>GRUPIŠI</div>
          <select value={grupisanje} onChange={e=>{ setGrupisanjeRucno(true); setGrupisanje(e.target.value); }} style={{...INP_S,cursor:"pointer"}}>
            <option value="dan">Po danu</option>
            <option value="komad">Po komadu</option>
            <option value="smena">Po smeni</option>
            <option value="dan_smena">Dan + smena</option>
          </select>
        </div>
        <button onClick={ucitaj} disabled={!idDeo||loading}
          style={{background:!idDeo||loading?C.hover:C.plava,border:"none",borderRadius:6,
            color:!idDeo||loading?C.sivi: C.onAkcent,fontSize:11,fontWeight:700,
            padding:"8px 14px",cursor:!idDeo?"not-allowed":"pointer",alignSelf:"flex-end"}}>
          {loading?"...":"↻"}
        </button>
        <button onClick={exportPdfPaket} disabled={!rawData.length||pdfBusy||!idDeo||!predlog?.preporuceniIds?.length}
          title="PDF svih ★ preporučenih karata iz vodiča"
          style={{background:!rawData.length||pdfBusy||!predlog?.preporuceniIds?.length?C.hover:"#7c3aed",border:"none",borderRadius:6,
            color:!rawData.length||pdfBusy||!predlog?.preporuceniIds?.length?C.sivi: C.onAkcent,fontSize:11,fontWeight:700,
            padding:"8px 12px",cursor:!rawData.length||pdfBusy||!predlog?.preporuceniIds?.length?"not-allowed":"pointer",alignSelf:"flex-end"}}>
          {pdfBusy ? "⏳ PDF…" : "📄 PDF izveštaj"}
        </button>
        <button onClick={exportPdfOveKarte} disabled={!rawData.length||pdfBusy||!idDeo}
          title="PDF samo trenutno otvorene karte"
          style={{background:!rawData.length||pdfBusy?C.hover:C.panel,border:`1px solid ${!rawData.length||pdfBusy?C.border:C.plava}`,borderRadius:6,
            color:!rawData.length||pdfBusy?C.sivi:C.plava,fontSize:11,fontWeight:700,
            padding:"8px 12px",cursor:!rawData.length||pdfBusy?"not-allowed":"pointer",alignSelf:"flex-end"}}>
          PDF ove karte
        </button>
        <button onClick={()=>exportExcel(idDeo,datumOd,datumDo,addToast)} disabled={!rawData.length}
          style={{background:!rawData.length?C.hover:C.zelena,border:"none",borderRadius:6,
            color:!rawData.length?C.sivi: C.onAkcent,fontSize:11,fontWeight:700,
            padding:"8px 12px",cursor:!rawData.length?"not-allowed":"pointer",alignSelf:"flex-end"}}>
          📊 Excel
        </button>
        <div style={{flex:1}}/>
        {rawData.length>0&&<span style={{color:C.sivi,fontSize:10,alignSelf:"center"}}>
          {rawData.length} unosa · {grupe.length} {grupisanje === "komad" ? "komada" : "dana"} ·{" "}
          <span style={{color:upozoreni.length>0?C.crvena:C.zelena,fontWeight:700}}>
            {upozoreni.length} van kontrole
          </span>
        </span>}
      </div>

      <AnalitikaSpcSnapshot
        C={C}
        modul="atributivne"
        idDeoOverride={idDeo}
        onNavigacija={({ spcTip, tab }) => {
          if (spcTip) setTip(spcTip);
          onNavigacijaKarte?.({ spcTip, tab });
        }}
      />

      {idDeo && !vodicSakrij && (
        <SpcVodicPredlog C={C} predlog={predlog} tip={tip} setTip={setTip} onZatvori={zatvoriVodic} />
      )}

      {/* ── TABOVI KARATA ── */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:16,flexWrap:"wrap"}}>
        {karte.map(k=>{
          const preporuka = tabJePreporucen(predlog, k.id);
          return (
          <button key={k.id} onClick={()=>setTip(k.id)} title={opisSpcKarte(k.id, "atributivne")} style={{
            background:"none",border:"none",
            borderBottom:tip===k.id?`2px solid ${k.boja}`:"2px solid transparent",
            color:tip===k.id?k.boja:C.sivi,
            fontSize:11,fontWeight:700,padding:"8px 14px",cursor:"pointer",letterSpacing:0.5,
            boxShadow: preporuka && tip !== k.id ? `inset 0 -1px 0 ${C.plava}55` : "none"}}>
            {k.naziv}{preporuka ? <span style={{ color: C.plava, fontSize: 8, marginLeft: 3 }}>★</span> : null}
          </button>
        );})}
        {[
          ["pareto",   "Pareto",      C.zelena],
          ["smena",    "Po smeni",    C.zuta],
          ["masina",   "Po mašini",   C.narandzasta],
          ["operater", "Po operateru",C.ljubicasta],
          ["rty",      LAB_FPY_TAB,    "#22d3ee"],
          ["heatmap",    "Heat mapa",   "#f472b6"],
          ["sigma",      "Sigma nivo",  "#a3e635"],
          ["korelacija", "Korelacija",  "#22d3ee"],
          ["poredi",     "Poređenje",   "#a78bfa"],
          ["foto_spc",   "Foto arhiva", "#fb923c"],
          ["oc_spc",    "OC kriva",    "#a3e635"],
          ["stabilnost_spc","Stabilnost","#f472b6"],
        ].map(([id,naziv,boja])=>{
          const preporuka = tabJePreporucen(predlog, id);
          return (
          <button key={id} onClick={()=>setTip(id)} title={opisSpcKarte(id, "atributivne")} style={{
            background:"none",border:"none",
            borderBottom:tip===id?`2px solid ${boja}`:"2px solid transparent",
            color:tip===id?boja:C.sivi,
            fontSize:11,fontWeight:700,padding:"8px 14px",cursor:"pointer",letterSpacing:0.5,
            boxShadow: preporuka && tip !== id ? `inset 0 -1px 0 ${C.plava}55` : "none"}}>
            {naziv}{preporuka ? <span style={{ color: C.plava, fontSize: 8, marginLeft: 3 }}>★</span> : null}
          </button>
        );})}
      </div>

      {idDeo && <SpcKartaOpis tip={tip} modul="atributivne" C={C} />}

      {!idDeo?(
        <div style={{height:350,display:"flex",alignItems:"center",justifyContent:"center",
          flexDirection:"column",gap:10,color:C.border}}>
          <span style={{fontSize:36}}>📊</span>
          <span style={{fontSize:12}}>Izaberi ID dela</span>
        </div>
      ):loading?(
        <div style={{height:350,display:"flex",alignItems:"center",justifyContent:"center",
          color:C.sivi,fontSize:12}}>Učitavanje...</div>
      ):rawData.length===0?(
        <div style={{height:350,display:"flex",alignItems:"center",justifyContent:"center",
          color:C.border,fontSize:12}}>Nema podataka</div>
      ):(
        <div ref={sadrzajRef}>
        <>
          {/* ── SPC KARTE (p, np, C, nC, u) ── */}
          {["p","np","c","nc","u"].includes(tip)&&(
            <>
              {/* KPI row */}
              <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
                {[
                  ["CL",`${cl}${akt.sufiks}`,C.zuta,"Centralna linija"],
                  ["UCL",`${ucl}${akt.sufiks}`,C.crvena,"+3σ"],
                  ["LCL",`${lcl}${akt.sufiks}`,C.zelena,"-3σ"],
                  ["TAČAKA",cd.length,C.plava,""],
                  ["VAN K.",upozoreni.length,upozoreni.length>0?C.crvena:C.zelena,
                   upozoreni.length>0?"⚠":"✓ OK"],
                  [LAB_FPY_KRATKO,ukN>0?`${kvalitetUk.rty}%`:"-",C.ljubicasta,""],
                  ["PPM", ppmSpc != null ? ppmSpc.toLocaleString() : "-", C.narandzasta, "kom/mil."],
                  ["DPMO", dpmoSpc != null ? dpmoSpc.toLocaleString() : "-","#f472b6",
                   statUk.komNok > statUk.nok ? "defekti" : ""],
                ].map(([n,v,b,o])=>(
                  <div key={n} style={{background:C.panel,border:`1px solid ${b}25`,borderRadius:8,
                    padding:"10px 14px",textAlign:"center",minWidth:84}}>
                    <div style={{color:C.sivi,fontSize:9,letterSpacing:1.2,marginBottom:3}}>{n}</div>
                    <div style={{color:b,fontSize:17,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{v}</div>
                    {o&&<div style={{color:C.sivi,fontSize:8,marginTop:1}}>{o}</div>}
                  </div>
                ))}
              </div>

              {/* Trend upozorenje */}
              <TrendUpozorenje podaci={cd} C={C}/>

              {/* Opis */}
              <div style={{color:C.sivi,fontSize:10,marginBottom:10}}>
                <strong style={{color:akt.boja}}>{akt.naziv}</strong> — {akt.opis}
                {(tip==="p"||tip==="np")&&<> · n̄ = {Math.round(nBar)}</>}
                {grupisanje==="komad"&&<> · {grupe.length} komada na grafikonu</>}
              </div>

              {grupisanje==="komad"&&grupe.length>1&&(
                <div style={{
                  background:`${C.plava}12`, border:`1px solid ${C.plava}35`,
                  borderRadius:8, padding:"8px 12px", marginBottom:12,
                  color:C.sivi, fontSize:11,
                }}>
                  Grupisanje <strong style={{color:C.plava}}>po komadu</strong> — svaki OK/NOK komad je jedna tačka.
                  Za dnevni prosek izaberi «Po danu».
                </div>
              )}

              {tip==="c"&&akt.podaci.length>0&&akt.podaci.every(d=>!d.val)&&(
                <div style={{
                  background:`${C.zuta}12`, border:`1px solid ${C.zuta}40`,
                  borderRadius:8, padding:"8px 12px", marginBottom:12,
                  color:C.zuta, fontSize:11,
                }}>
                  C-karta prati broj defekata — svi unosi su OK (nema grešaka za crtanje).
                </div>
              )}

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

              <SpcKontrolnaGraf
                podaci={cd}
                bojaLinije={akt.boja}
                C={C}
                sufiks={akt.sufiks}
                naslovKarte={akt.naziv}
                height={400}
                formatVrednost={(v) => (Number.isFinite(v) ? String(v) : "—")}
              />

              {/* Upozorenja */}
              {upozoreni.length>0&&(
                <div style={{marginTop:12,background:C.nok,border:`1px solid ${C.crvena}30`,
                  borderRadius:8,padding:"10px 14px"}}>
                  <div style={{color:C.crvena,fontSize:11,fontWeight:700,marginBottom:5}}>
                    ⚠ WESTERN ELECTRIC — {upozoreni.length} tačaka van statističke kontrole
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {upozoreni.map((d,i)=>(
                      <span key={i} style={{background:C.crvena+"20",border:`1px solid ${C.crvena}40`,
                        borderRadius:4,padding:"2px 8px",fontSize:10,color:C.crvena}}>
                        {d.label}: {d.val}{akt.sufiks}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* WE pravila */}
              <div style={{marginTop:14,background:C.panel,border:`1px solid ${C.border}`,
                borderRadius:8,padding:"10px 14px"}}>
                <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:8}}>
                  WESTERN ELECTRIC PRAVILA (ISO 8258)
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                  {[["P1","1 tačka van UCL/LCL (3σ)"],["P2","9 uzastopnih na istoj strani CL"],
                    ["P3","6 uzastopnih u trendu"],["P4","2/3 uzastopnih van 2σ iste strane"]
                  ].map(([p,o])=>(
                    <div key={p} style={{display:"flex",gap:6,fontSize:10}}>
                      <span style={{color:C.crvena,fontWeight:700,minWidth:22}}>{p}:</span>
                      <span style={{color:C.sivi}}>{o}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── PARETO ── */}
          {tip==="pareto"&&(
            <div>
              <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
                PARETO DIJAGRAM — TOP GREŠKE (80/20 pravilo)
              </div>
              {!paretoData.length?(
                <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",
                  color:C.border,fontSize:12}}>Nema NOK podataka</div>
              ):(
                <>
                  <SpcParetoGraf data={paretoData} C={C} height={340} boje={BOJE_P} kumKey="kum" />
                  {/* Tabela */}
                  <div style={{marginTop:14,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 80px",
                      background:C.hover,padding:"8px 14px",fontSize:9,color:C.sivi,gap:8}}>
                      <span>GREŠKA</span><span>BROJ</span><span>%</span><span>KUMULATIV</span>
                    </div>
                    {paretoData.map((p,i)=>{
                      const uk=paretoData.reduce((s,d)=>s+d.count,0);
                      return(
                        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 80px auto",
                          padding:"8px 14px",borderTop:`1px solid ${C.border}`,fontSize:11,gap:8,alignItems:"center"}}>
                          <span style={{color:BOJE_P[i%BOJE_P.length],fontWeight:700}}>{p.naziv}</span>
                          <span style={{color:C.tekst}}>{p.count}</span>
                          <span style={{color:C.sivi}}>{uk>0?((p.count/uk)*100).toFixed(1):0}%</span>
                          <span style={{color:C.zuta}}>{p.kum}%</span>
                          {onOtvori8D && (
                            <button type="button" onClick={()=>onOtvori8D({
                              id_deo: idDeo,
                              greska: p.naziv,
                              count: p.count,
                              opis: `Pareto: ${p.naziv} — ${p.count} grešaka (${p.kum}% kumulativ) za ${idDeo}`,
                            })}
                              style={{background:"none",border:`1px solid ${C.plava}`,borderRadius:5,
                                color:C.plava,fontSize:9,padding:"3px 8px",cursor:"pointer",whiteSpace:"nowrap"}}>
                              8D →
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── PO SMENI ── */}
          {tip==="smena"&&(
            <div>
              <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
                ANALIZA PO SMENI
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                {poSmeni.map(s=>(
                  <div key={s.s} style={{background:C.panel,border:`1px solid ${C.border}`,
                    borderRadius:10,padding:16,textAlign:"center"}}>
                    <div style={{color:C.plava,fontSize:14,fontWeight:700,marginBottom:10}}>{s.s}</div>
                    {[["OK",s.ok,C.zelena],["NOK",s.nok,C.crvena],
                      [LAB_FPY_KRATKO,s.rty+"%",C.zuta],["p",s.p+"%",C.narandzasta]].map(([l,v,b])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",
                        fontSize:11,marginBottom:5}}>
                        <span style={{color:C.sivi}}>{l}</span>
                        <span style={{color:b,fontWeight:700}}>{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <SpcOkNokBarGraf data={poSmeni} C={C} height={300} xKey="s" stacked={false} naslov="OK / NOK po smeni" />
            </div>
          )}

          {/* ── FPY (faza) / DPMO ── */}
          {tip==="rty"&&(
            <div>
              <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
                {LAB_FPY_PCT} I DPMO TREND PO DANU · FPY = prolaznost iz prve (bez OK posle dorade)
              </div>
              <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
                {[
                  [LAB_FPY_PCT,ukN>0?`${calcRTY(ukOK, ukN).toFixed(2)}%`:"-",C.zelena],
                  ["DPMO",ukN>0?calcDPMO(ukNOK, ukN).toLocaleString():"-",C.ljubicasta],
                  ["PPM", ukN>0?calcPPM(ukNOK, ukN).toLocaleString():"-", C.narandzasta],
                  ["Sigma nivo",ukN>0?`${sigmaIzDPMO(calcDPMO(ukNOK, ukN)).toFixed(1)}σ`:"-","#a3e635"],
                  ["Uk. mereno",ukN,C.plava],
                  ["Iz prve",ukOK,C.zelena],
                  ["NOK / neus.",ukNOK,C.crvena],
                  ...(kvalitetUk.okNakonDorade>0?[["OK posle dor.",kvalitetUk.okNakonDorade,"#22d3ee"]]:[]),
                ].map(([n,v,b])=>(
                  <div key={n} style={{background:C.panel,border:`1px solid ${b}25`,borderRadius:8,
                    padding:"10px 14px",textAlign:"center",minWidth:100}}>
                    <div style={{color:C.sivi,fontSize:8,letterSpacing:1.2,marginBottom:3}}>{n}</div>
                    <div style={{color:b,fontSize:16,fontWeight:700}}>{v}</div>
                  </div>
                ))}
              </div>
              <SpcRtyTrendGraf data={rtyTrend} C={C} height={360} xKey="datum" />
              <SpcPpmDpmoTrendGraf data={rtyTrend} C={C} height={280} xKey="datum" />
            </div>
          )}

          {/* ── PO MAŠINI ── */}
          {tip==="masina"&&(()=>{
            const grupe = agregirajAtributivnePoKljuču(rawData, r => r.masina?.naziv || "Nepoznata");
            const arr = [...grupe.entries()].map(([naziv, rows]) => {
              const d = statAtributivneRedovi(rows);
              return { naziv, ...d };
            }).sort((a, b) => b.nok - a.nok);
            const BOJE=[C.plava,C.zelena,C.narandzasta,C.ljubicasta,"#22d3ee","#f472b6"];
            return(
              <div>
                <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
                  ANALIZA PO MAŠINI
                </div>
                {!arr.length?<div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>
                  Nema podataka — mašine nisu dodeljene delovima
                </div>:(
                  <>
                    <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(arr.length,4)},1fr)`,gap:10,marginBottom:20}}>
                      {arr.map((m,i)=>(
                        <div key={m.naziv} style={{background:C.panel,border:`1px solid ${BOJE[i%BOJE.length]}30`,borderRadius:10,padding:14}}>
                          <div style={{color:BOJE[i%BOJE.length],fontWeight:700,fontSize:14,marginBottom:8}}>{m.naziv}</div>
                          {[["OK",m.ok,C.zelena],["NOK",m.nok,C.crvena],
                            [LAB_FPY_KRATKO,m.rty+"%",C.zuta],["DPMO",m.dpmo.toLocaleString(),C.ljubicasta]
                          ].map(([l,v,b])=>(
                            <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                              <span style={{color:C.sivi}}>{l}</span>
                              <span style={{color:b,fontWeight:700}}>{v}</span>
                            </div>
                          ))}
                          <div style={{marginTop:8,background:C.hover,borderRadius:3,height:5}}>
                            <div style={{background:m.rty>95?C.zelena:m.rty>80?C.zuta:C.crvena,
                              width:`${m.rty}%`,height:5,borderRadius:3}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                    <SpcOkNokBarGraf data={arr} C={C} height={280} xKey="naziv" naslov="OK / NOK po mašini" />
                  </>
                )}
              </div>
            );
          })()}

          {/* ── PO OPERATERU ── */}
          {tip==="operater"&&(()=>{
            const grupe = agregirajAtributivnePoKljuču(rawData, r => r.kontrolor?.ime || "Nepoznat");
            const arr = [...grupe.entries()].map(([ime, rows]) => {
              const d = statAtributivneRedovi(rows);
              return { ime, ...d };
            }).sort((a, b) => b.nok - a.nok);
            const BOJE=[C.plava,C.narandzasta,C.ljubicasta,C.zelena,"#22d3ee","#f472b6"];
            return(
              <div>
                <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
                  ANALIZA PO OPERATERU / KONTROLORU
                </div>
                {!arr.length?<div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>
                  Nema podataka
                </div>:(
                  <>
                    <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",marginBottom:20}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 70px 70px 70px 80px 80px",
                        background:C.hover,padding:"9px 14px",fontSize:9,color:C.sivi,gap:8,letterSpacing:1}}>
                        <span>IME</span><span>OK</span><span>NOK</span>
                        <span>MERENJA</span><span>{LAB_FPY_PCT}</span><span>DPMO</span>
                      </div>
                      {arr.map((o,i)=>(
                        <div key={o.ime} style={{display:"grid",
                          gridTemplateColumns:"1fr 70px 70px 70px 80px 80px",
                          padding:"10px 14px",borderTop:`1px solid ${C.border}`,
                          fontSize:12,gap:8,alignItems:"center"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:BOJE[i%BOJE.length],flexShrink:0}}/>
                            <span style={{color:C.tekst,fontWeight:700}}>{o.ime}</span>
                          </div>
                          <span style={{color:C.zelena}}>{o.ok}</span>
                          <span style={{color:C.crvena,fontWeight:o.nok>0?700:400}}>{o.nok}</span>
                          <span style={{color:C.sivi}}>{o.n}</span>
                          <div>
                            <span style={{color:o.rty>95?C.zelena:o.rty>80?C.zuta:C.crvena,fontWeight:700}}>
                              {o.rty}%
                            </span>
                            <div style={{background:C.hover,borderRadius:2,height:3,marginTop:3}}>
                              <div style={{background:o.rty>95?C.zelena:o.rty>80?C.zuta:C.crvena,
                                width:`${o.rty}%`,height:3,borderRadius:2}}/>
                            </div>
                          </div>
                          <span style={{color:C.ljubicasta,fontSize:11}}>
                            {o.n>0?Math.round((o.nok/o.n)*1e6).toLocaleString():"-"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <SpcOkNokBarGraf data={arr} C={C} height={280} xKey="ime" naslov="OK / NOK po operateru" />
                  </>
                )}
              </div>
            );
          })()}

          {/* ── HEAT MAPA ── */}
          {tip==="heatmap"&&(()=>{
            // NOK po dan/smena matrica
            const matrix={};
            const dani=[];
            rawData.forEach(r=>{
              if(!matrix[r.datum]){ matrix[r.datum]={};dani.push(r.datum); }
              const s=`Smena ${r.smena||1}`;
              matrix[r.datum][s]=(matrix[r.datum][s]||0)+(r.nok_kolicina||0);
            });
            const unikDani=[...new Set(dani)].sort().slice(-30); // poslednih 30 dana
            const smene=["Smena 1","Smena 2","Smena 3"];
            const maxVal=unikDani.reduce((mx,d)=>
              Math.max(mx,...smene.map(s=>matrix[d]?.[s]||0)),0);
            const getColor=(v)=>{
              if(v===0)return C.hover;
              const int=Math.min(v/Math.max(maxVal,1),1);
              if(int<0.33)return C.zelena+"80";
              if(int<0.66)return C.zuta+"90";
              return C.crvena+(Math.round(128+int*127).toString(16).padStart(2,"0"));
            };
            return(
              <div>
                <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
                  HEAT MAPA NOK — PO DANU I SMENI (poslednih 30 dana)
                </div>
                <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
                  <span style={{color:C.sivi,fontSize:10}}>0</span>
                  {[C.hover,C.zelena+"80",C.zuta+"90",C.crvena+"aa",C.crvena].map((c,i)=>(
                    <div key={i} style={{width:20,height:14,background:c,borderRadius:2}}/>
                  ))}
                  <span style={{color:C.sivi,fontSize:10}}>max ({maxVal})</span>
                </div>
                <div style={{overflowX:"auto"}}>
                  <div style={{display:"grid",
                    gridTemplateColumns:`80px repeat(${unikDani.length},1fr)`,
                    gap:2,minWidth:400}}>
                    <div/>{unikDani.map(d=>(
                      <div key={d} style={{color:C.sivi,fontSize:8,textAlign:"center",
                        transform:"rotate(-60deg)",transformOrigin:"bottom center",
                        height:40,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
                        {d.substring(5)}
                      </div>
                    ))}
                    {smene.map(s=>(
                      <>
                        <div key={s} style={{color:C.sivi,fontSize:10,display:"flex",
                          alignItems:"center",paddingRight:8}}>{s}</div>
                        {unikDani.map(d=>{
                          const v=matrix[d]?.[s]||0;
                          return(
                            <div key={d+s} title={`${d} ${s}: ${v} NOK`}
                              style={{background:getColor(v),borderRadius:3,height:22,
                                display:"flex",alignItems:"center",justifyContent:"center",
                                fontSize:v>0?8:0,color: C.onAkcent,fontWeight:700,cursor:"default"}}>
                              {v>0?v:""}
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </div>
                </div>
                <div style={{marginTop:16,color:C.sivi,fontSize:10}}>
                  Tamnije = više NOK. Hover na ćeliju za detalje.
                </div>
              </div>
            );
          })()}

          {/* ── SIGMA NIVO ── */}
          {tip==="sigma"&&(()=>{
            const dpmo=calcDPMO(ukNOK, ukN);
            const sigma=sigmaIzDPMO(dpmo);
            const rty=calcRTY(ukOK, ukN);

            // Benchmark tabela
            const bench=[
              {nivo:"6σ",dpmo:"3.4",rty:"99.9997%",opis:"World class"},
              {nivo:"5σ",dpmo:"233",rty:"99.977%",opis:"Odlično"},
              {nivo:"4σ",dpmo:"6,210",rty:"99.38%",opis:"Dobro"},
              {nivo:"3σ",dpmo:"66,807",rty:"93.32%",opis:"Prosečno"},
              {nivo:"2σ",dpmo:"308,538",rty:"69.15%",opis:"Loše"},
              {nivo:"1σ",dpmo:"691,462",rty:"30.85%",opis:"Kritično"},
            ];
            const trenutniIdx=Math.max(0,6-Math.ceil(sigma));

            return(
              <div>
                <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:16}}>
                  SIGMA NIVO PROCESA
                </div>
                {/* Gauge */}
                <div style={{display:"flex",gap:16,marginBottom:24,flexWrap:"wrap",alignItems:"center"}}>
                  <div style={{background:C.panel,border:`2px solid ${
                    sigma>=5?C.zelena:sigma>=4?C.zuta:sigma>=3?C.narandzasta:C.crvena}`,
                    borderRadius:16,padding:"24px 32px",textAlign:"center",minWidth:160}}>
                    <div style={{color:C.sivi,fontSize:10,letterSpacing:1.5,marginBottom:6}}>SIGMA NIVO</div>
                    <div style={{color:sigma>=5?C.zelena:sigma>=4?C.zuta:sigma>=3?C.narandzasta:C.crvena,
                      fontSize:52,fontWeight:700,lineHeight:1}}>{sigma.toFixed(1)}σ</div>
                    <div style={{color:C.sivi,fontSize:11,marginTop:6}}>
                      {sigma>=5?"World class":sigma>=4?"Odlično":sigma>=3?"Dobro":sigma>=2?"Ispod proseka":"Kritično"}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10,flex:1,minWidth:200}}>
                    {[
                      ["DPMO",Math.round(dpmo).toLocaleString(),C.ljubicasta],
                      [LAB_FPY_PCT,rty.toFixed(3)+"%",C.zelena],
                      ["Uk. NOK",ukNOK,C.crvena],
                      ["Uk. mereno",ukN,C.plava],
                    ].map(([n,v,b])=>(
                      <div key={n} style={{display:"flex",justifyContent:"space-between",
                        background:C.panel,borderRadius:8,padding:"10px 14px"}}>
                        <span style={{color:C.sivi,fontSize:11}}>{n}</span>
                        <span style={{color:b,fontWeight:700,fontSize:13}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sigma skala vizualna */}
                <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16}}>
                  <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:10}}>SIGMA SKALA</div>
                  <div style={{display:"flex",height:20,borderRadius:6,overflow:"hidden",marginBottom:8}}>
                    {[C.crvena,C.narandzasta,C.zuta,"#84cc16",C.zelena,"#06b6d4"].map((c,i)=>(
                      <div key={i} style={{flex:1,background:c,
                        opacity:i+1<=Math.floor(sigma)?1:0.2,
                        borderRight:i<5?`1px solid ${C.bg}`:""}}/>
                    ))}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.sivi}}>
                    {["1σ","2σ","3σ","4σ","5σ","6σ"].map(s=><span key={s}>{s}</span>)}
                  </div>
                </div>

                {/* Benchmark tabela */}
                <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
                  <div style={{display:"grid",gridTemplateColumns:"60px 100px 100px 1fr",
                    background:C.hover,padding:"8px 14px",fontSize:9,color:C.sivi,gap:8,letterSpacing:1}}>
                    <span>NIVO</span><span>DPMO</span><span>{LAB_FPY_KRATKO}</span><span>OCENA</span>
                  </div>
                  {bench.map((b,i)=>(
                    <div key={b.nivo} style={{display:"grid",
                      gridTemplateColumns:"60px 100px 100px 1fr",
                      padding:"9px 14px",borderTop:`1px solid ${C.border}`,
                      background:i===trenutniIdx?C.plava+"15":"transparent",
                      fontSize:12,gap:8,alignItems:"center"}}>
                      <span style={{color:i===trenutniIdx?C.plava:C.tekst,fontWeight:700}}>{b.nivo}</span>
                      <span style={{color:C.sivi}}>{b.dpmo}</span>
                      <span style={{color:C.sivi}}>{b.rty}</span>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{color:C.sivi,fontSize:11}}>{b.opis}</span>
                        {i===trenutniIdx&&<span style={{background:C.plava,color: C.onAkcent,
                          fontSize:9,padding:"1px 6px",borderRadius:10}}>← Vi ste ovde</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {tip==="korelacija"&&(
            <KorelacijaGreskaMasina rawData={rawData} C={C}/>
          )}

          {tip==="poredi"&&(
            <PoredjenjePerioda idDeo={idDeo} C={C} addToast={addToast}/>
          )}
          {tip==="foto_spc"&&(
            <FotoArhiva C={C} addToast={addToast}/>
          )}
          {tip==="oc_spc"&&(
            <OCKriva C={C}/>
          )}
          {tip==="stabilnost_spc"&&(
            <StabilnostProcesa sviDelovi={sviDelovi} C={C} addToast={addToast}/>
          )}
        </>
        </div>
      )}
    </div>
  );
}
