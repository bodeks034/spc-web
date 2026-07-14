import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { supabase } from "../../../lib/supabaseClient.js";
import { jeKontrolaCelogVozila, predlogAtributivnihKarti, jeVodicSakriven, sakrijVodic } from "../../../lib/spcPredlogKarti.js";
import { predloziGrupisanjeSpc, groupSpcRows, chartDataWithWesternElectric } from "../../../lib/spcStats.js";
import SpcVodicPredlog, { tabJePreporucen } from "../../SpcVodicPredlog.jsx";

function MobilneKarte({ sviDelovi, C, addToast }) {
  const [tip,setTip]         = useState("p");
  const [idDeo,setIdDeo]     = useState("");
  const [loading,setLoading] = useState(false);
  const [vodicSakrij,setVodicSakrij] = useState(false);
  const [rawLog,setRawLog] = useState([]);
  const [pD,setPD] = useState([]); const [cD,setCD]=useState([]); const [uD,setUD]=useState([]);
  const prevIdDeoRef = useRef("");

  const deoIzabran = useMemo(() => sviDelovi.find(d => d.id_deo === idDeo), [sviDelovi, idDeo]);
  const predlog = useMemo(
    () => predlogAtributivnihKarti({ deo: deoIzabran, rawData: rawLog, grupisanje: "dan" }),
    [deoIzabran, rawLog],
  );

  useEffect(() => {
    setVodicSakrij(jeVodicSakriven("atr_mob", idDeo));
  }, [idDeo]);

  useEffect(() => {
    if (!idDeo || idDeo === prevIdDeoRef.current) return;
    prevIdDeoRef.current = idDeo;
    const prvi = predlog?.stavke?.[0]?.id;
    if (prvi && ["p", "u", "c"].includes(prvi)) setTip(prvi);
  }, [idDeo, predlog]);

  const zatvoriVodic = () => {
    sakrijVodic("atr_mob", idDeo);
    setVodicSakrij(true);
  };

  const ucitaj = useCallback(async () => {
    if (!idDeo) return; setLoading(true);
    const selectFull = "datum,smena,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,inspekcija_id,sesija_id,created_at,id_deo,id";
    const selectBase = "datum,smena,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,sesija_id,created_at,id_deo,id";
    try {
      let { data, error } = await supabase.from("kontrolni_log")
        .select(selectFull)
        .eq("id_deo", idDeo)
        .order("datum", { ascending: true })
        .order("created_at", { ascending: true });
      if (error && /inspekcija_id/i.test(error.message)) {
        ({ data, error } = await supabase.from("kontrolni_log")
          .select(selectBase)
          .eq("id_deo", idDeo)
          .order("datum", { ascending: true })
          .order("created_at", { ascending: true }));
      }
      if (error) throw error;
      setRawLog(data || []);
      if (!data?.length) { setPD([]); setCD([]); setUD([]); return; }

      const mobGrup = predloziGrupisanjeSpc(data, {
        vozilo: jeKontrolaCelogVozila(deoIzabran),
      });
      const sg = groupSpcRows(data, mobGrup);
      const ukNOK = sg.reduce((s, g) => s + g.nok, 0);
      const ukN = sg.reduce((s, g) => s + g.n, 0);
      const pBar = ukN > 0 ? ukNOK / ukN : 0;
      const cBar = sg.length > 0 ? sg.reduce((s, g) => s + g.c, 0) / sg.length : 0;
      const uBar = ukN > 0 ? sg.reduce((s, g) => s + g.c, 0) / ukN : 0;

      setPD(sg.map(g => ({
        datum: g.datum,
        label: g.label || g.datum?.substring(5) || "",
        p: g.n > 0 ? g.nok / g.n : 0,
        p_bar: pBar,
        nok_total: g.nok,
        n_total: g.n,
        ucl: pBar + 3 * Math.sqrt(pBar * (1 - pBar) / Math.max(g.n, 1)),
        lcl: Math.max(0, pBar - 3 * Math.sqrt(pBar * (1 - pBar) / Math.max(g.n, 1))),
      })));
      const cgr = {};
      data.forEach(r => {
        const k = `${r.datum}|${r.greska_naziv || ""}`;
        if (!cgr[k]) cgr[k] = { datum: r.datum, naziv: r.greska_naziv || "sve", c: 0 };
        cgr[k].c += r.kom_nok || 0;
      });
      setCD(Object.values(cgr).sort((a, b) => a.datum.localeCompare(b.datum)).map(g => ({
        ...g,
        label: g.naziv?.substring(0, 8) || g.datum?.substring(5) || "",
        c_bar: cBar,
        ucl: cBar + 3 * Math.sqrt(Math.max(cBar, 0.001)),
        lcl: Math.max(0, cBar - 3 * Math.sqrt(Math.max(cBar, 0.001))),
      })));
      setUD(sg.map(g => ({
        datum: g.datum,
        label: g.label || g.datum?.substring(5) || "",
        u: g.n > 0 ? g.c / g.n : 0,
        u_bar: uBar,
        n: g.n,
        ucl: uBar + 3 * Math.sqrt(uBar / Math.max(g.n, 1)),
        lcl: Math.max(0, uBar - 3 * Math.sqrt(uBar / Math.max(g.n, 1))),
      })));
    } catch(e) { addToast(e.message,"greska"); }
    finally { setLoading(false); }
  },[idDeo, deoIzabran, addToast]);

  useEffect(()=>{ ucitaj(); },[ucitaj]);

  const karte=[
    {id:"p",naziv:"p",boja:C.plava,podaci:pD,dKey:"p",clKey:"p_bar",
     fmt:v=>+(v*100).toFixed(2),sufiks:"%"},
    {id:"c",naziv:"C",boja:C.narandzasta,podaci:cD,dKey:"c",clKey:"c_bar",
     fmt:v=>+v.toFixed(1),sufiks:""},
    {id:"u",naziv:"u",boja:C.ljubicasta,podaci:uD,dKey:"u",clKey:"u_bar",
     fmt:v=>+v.toFixed(3),sufiks:""},
  ];
  const akt=karte.find(k=>k.id===tip);
  const cdRaw=(akt?.podaci||[]).map((d,i)=>({
    ...d,
    label:d.label||d.datum?.substring(5)||d.naziv?.substring(0,8)||`#${i+1}`,
    val:Number(d[akt.dKey]),
    cl:Number(d[akt.clKey]),
    ucl:Number(d.ucl),
    lcl:Number(Math.max(d.lcl||0,0)),
  }));
  const cd=chartDataWithWesternElectric(cdRaw, {
    obrazacPravila: cdRaw.length >= 8,
  }).map(d=>({
    ...d,
    val:akt.fmt(d.val),
    cl:akt.fmt(d.cl),
    ucl:akt.fmt(d.ucl),
    lcl:akt.fmt(d.lcl),
  }));
  const upozoreni=cd.filter(d=>d.upoz);
  const cl=cd[0]?.cl??0,ucl=cd[0]?.ucl??0,lcl=cd[0]?.lcl??0;
  const Dot=(props)=>{const{cx,cy,index}=props;const u=cd[index]?.upoz;
    return<circle key={index} cx={cx} cy={cy} r={u?8:5}
      fill={u?C.crvena:akt?.boja} stroke={u? C.onAkcent:"none"} strokeWidth={u?2:0}/>;};

  const INP_S={background:C.input,border:`1px solid ${C.border}`,borderRadius:8,
    color:C.tekst,fontSize:14,padding:"12px 14px",outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"};

  return (
    <div style={{padding:"14px 14px 100px", display:"flex", flexDirection:"column", gap:14}}>
      {/* Filter */}
      <div>
        <div style={{color:C.sivi,fontSize:10,letterSpacing:1.5,marginBottom:6}}>ID DELA</div>
        <select value={idDeo} onChange={e=>setIdDeo(e.target.value)} style={{...INP_S,cursor:"pointer"}}>
          <option value="">-- Izaberi deo --</option>
          {sviDelovi.map(d=><option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>)}
        </select>
      </div>

      {idDeo && !vodicSakrij && (
        <SpcVodicPredlog C={C} predlog={predlog} tip={tip} setTip={setTip} onZatvori={zatvoriVodic} kompakt />
      )}

      {/* Tip karte */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {karte.map(k=>{
          const preporuka = tabJePreporucen(predlog, k.id);
          return (
          <button key={k.id} onClick={()=>setTip(k.id)} style={{
            background:tip===k.id?`${k.boja}20`:"none",
            border:`2px solid ${tip===k.id?k.boja:preporuka?`${C.plava}55`:C.border}`,
            borderRadius:10,color:tip===k.id?k.boja:C.sivi,
            fontSize:15,fontWeight:700,padding:"12px",cursor:"pointer"}}>
            {k.naziv}-karta{preporuka ? " ★" : ""}
          </button>
        );})}
      </div>

      {!idDeo ? (
        <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",
          flexDirection:"column",gap:8,color:C.border}}>
          <span style={{fontSize:36}}>📊</span>
          <span style={{fontSize:13}}>Izaberi deo</span>
        </div>
      ) : loading ? (
        <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",
          color:C.sivi,fontSize:13}}>Učitavanje...</div>
      ) : cd.length===0 ? (
        <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",
          color:C.border,fontSize:13}}>Nema podataka</div>
      ) : (
        <>
          {/* KPI row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {[["CL",`${cl}${akt.sufiks}`,C.zuta],
              ["UCL",`${ucl}${akt.sufiks}`,C.crvena],
              ["VAN K.",upozoreni.length,upozoreni.length>0?C.crvena:C.zelena]
            ].map(([n,v,b])=>(
              <div key={n} style={{background:C.panel,border:`1px solid ${b}25`,
                borderRadius:10,padding:"10px",textAlign:"center"}}>
                <div style={{color:C.sivi,fontSize:9,letterSpacing:1,marginBottom:3}}>{n}</div>
                <div style={{color:b,fontSize:18,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>

          {/* Graf — viši na mobu */}
          <div style={{background:C.panel,border:`1px solid ${C.border}`,
            borderRadius:12,padding:"14px 6px 8px"}}>
            <div style={{color:akt.boja,fontSize:12,fontWeight:700,
              letterSpacing:1,paddingLeft:10,marginBottom:8}}>
              {akt.naziv}-karta · {idDeo}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={cd} margin={{top:6,right:50,bottom:30,left:2}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.hover} vertical={false}/>
                <XAxis dataKey="label" tick={{fill:C.sivi,fontSize:8}} tickLine={false}
                  angle={-45} textAnchor="end" height={40}
                  interval={Math.max(0,Math.floor(cd.length/6)-1)}/>
                <YAxis tick={{fill:C.sivi,fontSize:9}} tickLine={false} axisLine={false}
                  tickFormatter={v=>v+akt.sufiks} width={38}/>
                <Tooltip
                  contentStyle={{background:C.panel,border:`1px solid ${C.border}`,
                    borderRadius:8,fontSize:12,fontFamily:"monospace"}}
                  labelStyle={{color:C.sivi}}
                  formatter={(v)=>[v+akt.sufiks]}/>
                <ReferenceLine y={ucl} stroke={C.crvena} strokeDasharray="6 3" strokeWidth={1.5}
                  label={{value:`UCL`,fill:C.crvena,fontSize:9,position:"right"}}/>
                <ReferenceLine y={cl} stroke={C.zuta} strokeDasharray="4 2"
                  label={{value:`CL`,fill:C.zuta,fontSize:9,position:"right"}}/>
                {lcl>0 && <ReferenceLine y={lcl} stroke={C.zelena} strokeDasharray="6 3" strokeWidth={1.5}
                  label={{value:`LCL`,fill:C.zelena,fontSize:9,position:"right"}}/>}
                <Line type="monotone" dataKey="val" stroke={akt.boja} strokeWidth={2.5}
                  dot={<Dot/>} name={`${akt.naziv}-karta`} connectNulls activeDot={{r:8}}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Upozorenja */}
          {upozoreni.length>0 && (
            <div style={{background:C.nok,border:`1px solid ${C.crvena}30`,
              borderRadius:10,padding:"12px 14px"}}>
              <div style={{color:C.crvena,fontSize:13,fontWeight:700,marginBottom:6}}>
                ⚠ {upozoreni.length} tačaka van kontrole
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {upozoreni.map((d,i)=>(
                  <span key={i} style={{background:`${C.crvena}20`,border:`1px solid ${C.crvena}40`,
                    borderRadius:6,padding:"3px 10px",fontSize:11,color:C.crvena}}>
                    {d.label}: {d.val}{akt.sufiks}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MobilneKarte;
