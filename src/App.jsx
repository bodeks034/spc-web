// ============================================================
// SPC ATRIBUTIVNE v3 — Fixes + Crtež dela + SPC karte sa
// pravim crtanjem linija, zoom, pan
// npm install @supabase/supabase-js recharts jspdf html2canvas
// ============================================================
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend, Cell
} from "recharts";

const SUPABASE_URL  = "https://wzxkcomeurogvfisticq.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eGtjb21ldXJvZ3ZmaXN0aWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzM1MDYsImV4cCI6MjA5NTEwOTUwNn0.Oa17CJOr-Zep2UsG5n8N7kehuoJmHanNYaNy4VriDBk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── TEMA ────────────────────────────────────────────────────
const TEME = {
  tamna:  { bg:"#1c2333", panel:"#242e42", border:"#3d4f6a",
    plava:"#58a6ff", zelena:"#3fb950", crvena:"#f85149",
    zuta:"#d29922", narandzasta:"#f0883e", tekst:"#eaf0fb",
    sivi:"#9aa8bc", ljubicasta:"#bc8cff", ok:"#0f2d1a", nok:"#2d1010",
    input:"#1c2333", hover:"#2d3a50", naziv:"tamna" },
  svetla: { bg:"#dde2e8", panel:"#eaeef2", border:"#a8b4c4",
    plava:"#0969da", zelena:"#1a7f37", crvena:"#cf222e",
    zuta:"#9a6700", narandzasta:"#bc4c00", tekst:"#18202e",
    sivi:"#485666", ljubicasta:"#6639ba", ok:"#baeeca", nok:"#f5cccc",
    input:"#d8dde4", hover:"#cdd2da", naziv:"svetla" },
};

function dISO()    { return new Date().toISOString().split("T")[0]; }
function dPrikaz() { return new Date().toLocaleDateString("sr-RS",{day:"2-digit",month:"2-digit",year:"numeric"}); }
function vreme()   { return new Date().toLocaleTimeString("sr-RS",{hour:"2-digit",minute:"2-digit"}); }

// ─── WESTERN ELECTRIC ────────────────────────────────────────
function westernElectric(niz, cl, ucl, lcl) {
  const sigma = (ucl - cl) / 3;
  if (sigma <= 0) return [];
  const flag = new Set(); const n = niz.length;
  for (let i = 0; i < n; i++) {
    const v = niz[i];
    if (v > ucl || v < lcl) flag.add(i);
    if (i >= 8) { const s=niz.slice(i-8,i+1); if(s.every(x=>x>cl)||s.every(x=>x<cl)) s.forEach((_,j)=>flag.add(i-8+j)); }
    if (i >= 5) { const s=niz.slice(i-5,i+1); if(s.every((x,j)=>j===0||x>s[j-1])||s.every((x,j)=>j===0||x<s[j-1])) s.forEach((_,j)=>flag.add(i-5+j)); }
    if (i >= 2) { const s=niz.slice(i-2,i+1); const g=s.filter(x=>x>cl+2*sigma).length,d=s.filter(x=>x<cl-2*sigma).length; if(g>=2||d>=2) s.forEach((_,j)=>flag.add(i-2+j)); }
  }
  return [...flag];
}

// ─── BARCODE HOOK ────────────────────────────────────────────
function useBarcodeScanner(onScan) {
  const buf = useRef(""); const timer = useRef(null);
  useEffect(() => {
    const h = (e) => {
      if (e.key==="Enter"&&buf.current.length>2) { onScan(buf.current.trim()); buf.current=""; return; }
      if (e.key.length===1) { buf.current+=e.key; clearTimeout(timer.current); timer.current=setTimeout(()=>{buf.current="";},100); }
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[onScan]);
}

// ─── OFFLINE QUEUE ────────────────────────────────────────────
function useOfflineQueue() {
  const [online,setOnline] = useState(navigator.onLine);
  const [queue,setQueue]   = useState(()=>{ try{return JSON.parse(localStorage.getItem("spc_q")||"[]");}catch{return [];} });
  useEffect(()=>{
    const on=()=>setOnline(true), off=()=>setOnline(false);
    window.addEventListener("online",on); window.addEventListener("offline",off);
    return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off);};
  },[]);
  const addToQueue = useCallback((r)=>{ const n=[...queue,...r]; setQueue(n); localStorage.setItem("spc_q",JSON.stringify(n)); },[queue]);
  const flushQueue = useCallback(async()=>{
    if(!queue.length||!online) return 0;
    const{error}=await supabase.from("kontrolni_log").insert(queue);
    if(!error){setQueue([]);localStorage.removeItem("spc_q");return queue.length;}
    return 0;
  },[queue,online]);
  return{online,queue,addToQueue,flushQueue};
}

// ─── TOAST ───────────────────────────────────────────────────
function Toast({poruke,C}) {
  return(
    <div style={{position:"fixed",bottom:20,right:20,zIndex:1400,display:"flex",flexDirection:"column",gap:8}}>
      {poruke.map((p,i)=>(
        <div key={i} style={{background:C.panel,border:`1px solid ${p.tip==="uspeh"?C.zelena:p.tip==="greska"?C.crvena:C.border}`,
          borderRadius:8,padding:"10px 16px",fontSize:12,color:C.tekst,
          boxShadow:"0 4px 20px rgba(0,0,0,0.4)",minWidth:220,
          borderLeft:`3px solid ${p.tip==="uspeh"?C.zelena:p.tip==="greska"?C.crvena:C.plava}`}}>
          {p.tekst}
        </div>
      ))}
    </div>
  );
}

// ─── MODAL ───────────────────────────────────────────────────
function Modal({poruka,tip,onOK,onOtkazati,C}) {
  const boja=tip==="uspeh"?C.zelena:tip==="greska"?C.crvena:C.plava;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}}>
      <div style={{background:C.panel,border:`1px solid ${boja}`,borderRadius:12,padding:"30px 34px",maxWidth:420,textAlign:"center"}}>
        <div style={{color:boja,fontSize:28,marginBottom:10}}>{tip==="uspeh"?"✓":tip==="greska"?"✗":"ℹ"}</div>
        <div style={{color:C.tekst,fontSize:13,lineHeight:1.7,marginBottom:20,whiteSpace:"pre-line"}}>{poruka}</div>
        <div style={{display:"flex",gap:8,justifyContent:"center"}}>
          <button onClick={onOK} style={{background:boja,border:"none",borderRadius:6,color:"#fff",fontSize:13,fontWeight:700,padding:"9px 24px",cursor:"pointer"}}>OK</button>
          {onOtkazati&&<button onClick={onOtkazati} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,color:C.sivi,fontSize:12,padding:"9px 16px",cursor:"pointer"}}>Otkaži</button>}
        </div>
      </div>
    </div>
  );
}

// ─── ALARM BANNER ────────────────────────────────────────────
function AlarmBanner({poruka,onClose,C}) {
  return(
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:1500,background:C.crvena,
      padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",
      boxShadow:`0 4px 20px ${C.crvena}60`}}>
      <div style={{color:"#fff",fontWeight:700,fontSize:13,letterSpacing:1}}>🚨 ALARM — {poruka}</div>
      <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.4)",
        borderRadius:5,color:"#fff",fontSize:11,padding:"4px 12px",cursor:"pointer"}}>Potvrdi</button>
    </div>
  );
}

// ─── CRTEŽ DELA (SVG viewer sa zoom/pan + anotacije) ─────────
function CrtezDela({ deoInfo, C }) {
  const [slika, setSlika]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [zoom, setZoom]         = useState(1);
  const [pan, setPan]           = useState({ x:0, y:0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x:0, y:0 });
  const [anotacije, setAnotacije] = useState([]);
  const [dodajeAn, setDodajeAn] = useState(false);
  const [novaAn, setNovaAn]     = useState("");
  const containerRef = useRef(null);
  const fileRef      = useRef(null);

  // Učitaj sliku iz Supabase Storage ako postoji
  useEffect(() => {
    if (!deoInfo?.slika_naziv) { setSlika(null); return; }
    setLoading(true);
    supabase.storage.from("spc-crtezi").createSignedUrl(deoInfo.slika_naziv, 3600)
      .then(({ data, error }) => {
        if (!error && data) setSlika(data.signedUrl);
        else setSlika(null);
      })
      .finally(() => setLoading(false));
  }, [deoInfo?.slika_naziv]);

  // Upload crteža
  const uploadSliku = async (e) => {
    const file = e.target.files[0];
    if (!file || !deoInfo) return;
    const naziv = `${deoInfo.id_deo}_${Date.now()}.${file.name.split(".").pop()}`;
    setLoading(true);
    const { error } = await supabase.storage.from("spc-crtezi").upload(naziv, file, { upsert: true });
    if (!error) {
      // Sačuvaj naziv u tabeli delovi
      await supabase.from("delovi").update({ slika_naziv: naziv }).eq("id_deo", deoInfo.id_deo);
      const { data } = await supabase.storage.from("spc-crtezi").createSignedUrl(naziv, 3600);
      setSlika(data?.signedUrl || null);
    }
    setLoading(false);
  };

  // Zoom wheel
  const onWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.min(5, Math.max(0.3, z - e.deltaY * 0.001)));
  };

  // Pan
  const onMouseDown = (e) => { setDragging(true); setDragStart({x:e.clientX-pan.x,y:e.clientY-pan.y}); };
  const onMouseMove = (e) => { if(dragging) setPan({x:e.clientX-dragStart.x,y:e.clientY-dragStart.y}); };
  const onMouseUp   = ()  => setDragging(false);

  // Klik za anotaciju
  const onKlik = (e) => {
    if (!dodajeAn || !novaAn) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left - pan.x) / zoom);
    const y = ((e.clientY - rect.top  - pan.y) / zoom);
    setAnotacije(prev => [...prev, { x, y, tekst: novaAn, id: Date.now() }]);
    setNovaAn(""); setDodajeAn(false);
  };

  const resetView = () => { setZoom(1); setPan({x:0,y:0}); };

  if (!deoInfo) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",
      height:"100%",color:C.border,flexDirection:"column",gap:8,fontSize:11}}>
      <span style={{fontSize:28}}>📐</span>Unesi ID dela za prikaz crteža
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",gap:0}}>
      {/* Toolbar */}
      <div style={{display:"flex",gap:8,padding:"8px 12px",borderBottom:`1px solid ${C.border}`,
        background:C.panel,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{color:C.sivi,fontSize:10,flex:1}}>
          {deoInfo.slika_naziv || "Nema crteža"}
        </span>
        <button onClick={resetView} style={toolBtn(C)}>⊡ Reset</button>
        <button onClick={()=>setZoom(z=>Math.min(5,z+0.2))} style={toolBtn(C)}>+ Zoom</button>
        <span style={{color:C.sivi,fontSize:10,minWidth:40,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
        <button onClick={()=>setZoom(z=>Math.max(0.3,z-0.2))} style={toolBtn(C)}>− Zoom</button>
        <button onClick={()=>setDodajeAn(!dodajeAn)}
          style={{...toolBtn(C), background:dodajeAn?C.zuta+"30":"none",
            borderColor:dodajeAn?C.zuta:C.border, color:dodajeAn?C.zuta:C.sivi}}>
          ✏ Anotacija
        </button>
        <button onClick={()=>fileRef.current?.click()} style={toolBtn(C)}>📎 Upload</button>
        <input ref={fileRef} type="file" accept="image/*,.pdf,.svg"
          onChange={uploadSliku} style={{display:"none"}}/>
      </div>

      {/* Anotacija input */}
      {dodajeAn && (
        <div style={{padding:"6px 12px",background:C.zuta+"15",borderBottom:`1px solid ${C.zuta}30`,
          display:"flex",gap:8,alignItems:"center"}}>
          <span style={{color:C.zuta,fontSize:10}}>✏ Unesi tekst pa klikni na crtež:</span>
          <input value={novaAn} onChange={e=>setNovaAn(e.target.value)}
            placeholder="npr. LSL = 9.8mm"
            style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:4,
              color:C.tekst,fontSize:11,padding:"4px 8px",outline:"none",flex:1}}/>
          <button onClick={()=>{setDodajeAn(false);setNovaAn("");}}
            style={{background:"none",border:"none",color:C.sivi,cursor:"pointer",fontSize:12}}>✕</button>
        </div>
      )}

      {/* Canvas */}
      <div ref={containerRef} style={{flex:1,overflow:"hidden",position:"relative",
        cursor:dodajeAn?"crosshair":dragging?"grabbing":"grab",
        background:C.bg}}
        onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onClick={onKlik}>

        {loading ? (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",
            height:"100%",color:C.sivi,fontSize:11}}>Učitavanje...</div>
        ) : slika ? (
          <div style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
            transformOrigin:"top left",position:"absolute",userSelect:"none"}}>
            <img src={slika} alt="crtež" draggable={false}
              style={{maxWidth:"100%",display:"block",
                borderRadius:4, boxShadow:"0 2px 12px rgba(0,0,0,0.4)"}}/>
            {/* SVG anotacije */}
            <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",
              pointerEvents:"none",overflow:"visible"}}>
              {anotacije.map(a=>(
                <g key={a.id}>
                  <circle cx={a.x} cy={a.y} r={5} fill={C.crvena} opacity={0.8}/>
                  <rect x={a.x+8} y={a.y-14} width={a.tekst.length*7+8} height={20}
                    fill={C.panel} stroke={C.border} strokeWidth={1} rx={3}/>
                  <text x={a.x+12} y={a.y+1} fontSize={11} fill={C.crvena} fontFamily="monospace">
                    {a.tekst}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        ) : (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",
            height:"100%",flexDirection:"column",gap:12,color:C.border}}>
            <span style={{fontSize:48}}>📐</span>
            <span style={{fontSize:12}}>Nema crteža za {deoInfo.id_deo}</span>
            <button onClick={()=>fileRef.current?.click()}
              style={{background:C.plava,border:"none",borderRadius:6,color:"#fff",
                fontSize:12,fontWeight:700,padding:"9px 20px",cursor:"pointer"}}>
              📎 Dodaj crtež / SOP sliku
            </button>
            <span style={{color:C.sivi,fontSize:10}}>PNG, JPG, SVG, PDF</span>
          </div>
        )}
      </div>

      {/* Info tabla sa SOP podacima */}
      {deoInfo && (
        <div style={{borderTop:`1px solid ${C.border}`,padding:"8px 12px",
          background:C.panel,display:"flex",gap:16,flexWrap:"wrap"}}>
          {[
            ["ID", deoInfo.id_deo],
            ["LSL", deoInfo.lsl||"-"],
            ["USL", deoInfo.usl||"-"],
            ["Target", deoInfo.target||"-"],
            ["Jedinica", deoInfo.jedinica_mere||"-"],
          ].map(([l,v])=>(
            <div key={l} style={{fontSize:10}}>
              <span style={{color:C.sivi}}>{l}: </span>
              <span style={{color:C.tekst,fontWeight:700}}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function toolBtn(C) {
  return { background:"none", border:`1px solid ${C.border}`, borderRadius:5,
    color:C.sivi, fontSize:10, padding:"4px 10px", cursor:"pointer" };
}

// ─── SPC KARTE sa pravim crtanjem ────────────────────────────
function SPCKarte({ sviDelovi, C, addToast }) {
  const [tip,setTip]         = useState("p");
  const [idDeo,setIdDeo]     = useState("");
  const [datumOd,setDatumOd] = useState("");
  const [datumDo,setDatumDo] = useState("");
  const [smena,setSmena]     = useState("");
  const [loading,setLoading] = useState(false);
  const [rawData,setRawData] = useState([]);
  const kartaRef = useRef(null);

  // ── Učitaj sirove podatke ─────────────────────────────────
  const ucitaj = useCallback(async()=>{
    if(!idDeo)return; setLoading(true);
    try{
      let q=supabase.from("kontrolni_log")
        .select("datum,smena,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,podkategorija,masine(naziv),kontrolor:radnici!kontrolni_log_kontrolor_id_fkey(ime)")
        .eq("id_deo",idDeo).order("datum",{ascending:true}).order("created_at",{ascending:true});
      if(datumOd)q=q.gte("datum",datumOd);
      if(datumDo)q=q.lte("datum",datumDo);
      if(smena)  q=q.eq("smena",Number(smena));
      const{data,error}=await q; if(error)throw error;
      setRawData(data||[]);
    }catch(e){addToast(e.message,"greska"); setRawData([]);}
    finally{setLoading(false);}
  },[idDeo,datumOd,datumDo,smena]);

  useEffect(()=>{ucitaj();},[ucitaj]);

  // ── Kalkulacije po danu ───────────────────────────────────
  const grupe = useMemo(()=>{
    const g={};
    rawData.forEach(r=>{
      const k=r.datum;
      if(!g[k])g[k]={datum:k,nok:0,n:0,c:0};
      g[k].nok+=r.nok_kolicina||0;
      g[k].n  +=r.ukupno_merenja||0;
      g[k].c  +=r.kom_nok||0;
    });
    return Object.values(g).sort((a,b)=>a.datum.localeCompare(b.datum));
  },[rawData]);

  const ukNOK = grupe.reduce((s,g)=>s+g.nok,0);
  const ukN   = grupe.reduce((s,g)=>s+g.n,0);
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
        datum:g.datum,
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
        datum:g.datum,
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
        datum:g.datum,
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
        datum:g.datum,
        val:+(g.n>0?g.c/g.n:0).toFixed(4),
        cl: +uBar.toFixed(4),
        ucl:+(uBar+3*Math.sqrt(uBar/Math.max(g.n,1))).toFixed(4),
        lcl:+(Math.max(0,uBar-3*Math.sqrt(uBar/Math.max(g.n,1)))).toFixed(4),
        n:g.n,
      })),
    },
  ],[grupe,rawData,pBar,cBar,uBar,nBar,C]);

  const akt = karte.find(k=>k.id===tip)||karte[0];

  // ── Chart data sa Western Electric ───────────────────────
  const cd = useMemo(()=>{
    if(!akt?.podaci?.length) return [];
    const niz=akt.podaci.map(d=>d.val);
    const first=akt.podaci[0];
    const upoz=new Set(westernElectric(niz,first.cl,first.ucl,first.lcl));
    return akt.podaci.map((d,i)=>({
      ...d,
      label: d.datum?.substring(5)||(d.naziv?.substring(0,8))||"",
      upoz: upoz.has(i),
    }));
  },[akt]);

  const upozoreni = cd.filter(d=>d.upoz);
  const cl=cd[0]?.cl??0, ucl=cd[0]?.ucl??0, lcl=cd[0]?.lcl??0;

  // ── Analiza po smeni ──────────────────────────────────────
  const poSmeni = useMemo(()=>{
    const sm={1:{s:"Smena 1",ok:0,nok:0,n:0},2:{s:"Smena 2",ok:0,nok:0,n:0},3:{s:"Smena 3",ok:0,nok:0,n:0}};
    rawData.forEach(r=>{
      const s=sm[r.smena]; if(!s)return;
      s.ok +=r.ok_kolicina||0;
      s.nok+=r.nok_kolicina||0;
      s.n  +=r.ukupno_merenja||0;
    });
    return Object.values(sm).map(s=>({
      ...s,
      rty: s.n>0?+((s.ok/s.n)*100).toFixed(1):0,
      p:   s.n>0?+((s.nok/s.n)*100).toFixed(2):0,
    }));
  },[rawData]);

  // ── Analiza po grešci (Pareto) ────────────────────────────
  const paretoData = useMemo(()=>{
    const g={};
    rawData.forEach(r=>{
      if(r.greska_naziv&&r.greska_naziv!=="OK")
        g[r.greska_naziv]=(g[r.greska_naziv]||0)+(r.kom_nok||0);
    });
    const sor=Object.entries(g).map(([naziv,count])=>({naziv,count}))
      .sort((a,b)=>b.count-a.count).slice(0,8);
    const uk=sor.reduce((s,d)=>s+d.count,0); let kum=0;
    return sor.map(d=>{kum+=d.count; return{...d,kum:+((kum/uk)*100).toFixed(1)};});
  },[rawData]);

  // ── RTY trend ────────────────────────────────────────────
  const rtyTrend = useMemo(()=>grupe.map(g=>({
    datum: g.datum?.substring(5)||"",
    rty:   g.n>0?+((g.ok||g.n-g.nok)/g.n*100).toFixed(1):0,
    p:     g.n>0?+(g.nok/g.n*100).toFixed(2):0,
  })),[grupe]);

  // ── Eksport PDF ───────────────────────────────────────────
  const exportPDF = async()=>{
    if(!kartaRef.current)return;
    const{default:jsPDF}=await import("jspdf");
    const{default:h2c}=await import("html2canvas");
    const canvas=await h2c(kartaRef.current,{scale:2,useCORS:true});
    const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    const w=pdf.internal.pageSize.getWidth();
    pdf.addImage(canvas.toDataURL("image/png"),"PNG",0,0,w,canvas.height*w/canvas.width);
    pdf.save(`SPC_${idDeo}_${tip}_${dISO()}.pdf`);
  };

  const Dot=(props)=>{
    const{cx,cy,index}=props; const u=cd[index]?.upoz;
    return<circle key={index} cx={cx} cy={cy} r={u?7:4}
      fill={u?C.crvena:akt.boja} stroke={u?"#fff":"none"} strokeWidth={u?2:0} opacity={0.9}/>;
  };
  const INP_S={background:C.input,border:`1px solid ${C.border}`,borderRadius:6,
    color:C.tekst,fontSize:11,padding:"7px 10px",outline:"none",fontFamily:"inherit"};
  const BOJE_P=[C.crvena,C.narandzasta,C.zuta,C.plava,C.ljubicasta,"#22d3ee","#f472b6","#a3e635"];

  return(
    <div style={{padding:18,overflowY:"auto"}} ref={kartaRef}>

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
        <button onClick={ucitaj} disabled={!idDeo||loading}
          style={{background:!idDeo||loading?C.hover:C.plava,border:"none",borderRadius:6,
            color:!idDeo||loading?C.sivi:"#fff",fontSize:11,fontWeight:700,
            padding:"8px 14px",cursor:!idDeo?"not-allowed":"pointer",alignSelf:"flex-end"}}>
          {loading?"...":"↻"}
        </button>
        <button onClick={exportPDF} disabled={!cd.length}
          style={{background:!cd.length?C.hover:"#7c3aed",border:"none",borderRadius:6,
            color:!cd.length?C.sivi:"#fff",fontSize:11,fontWeight:700,
            padding:"8px 12px",cursor:!cd.length?"not-allowed":"pointer",alignSelf:"flex-end"}}>
          📄 PDF
        </button>
        <div style={{flex:1}}/>
        {rawData.length>0&&<span style={{color:C.sivi,fontSize:10,alignSelf:"center"}}>
          {rawData.length} unosa · {grupe.length} dana ·{" "}
          <span style={{color:upozoreni.length>0?C.crvena:C.zelena,fontWeight:700}}>
            {upozoreni.length} van kontrole
          </span>
        </span>}
      </div>

      {/* ── TABOVI KARATA ── */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:16,flexWrap:"wrap"}}>
        {karte.map(k=>(
          <button key={k.id} onClick={()=>setTip(k.id)} style={{
            background:"none",border:"none",
            borderBottom:tip===k.id?`2px solid ${k.boja}`:"2px solid transparent",
            color:tip===k.id?k.boja:C.sivi,
            fontSize:11,fontWeight:700,padding:"8px 14px",cursor:"pointer",letterSpacing:0.5}}>
            {k.naziv}
          </button>
        ))}
        {[
          ["pareto",   "Pareto",      C.zelena],
          ["smena",    "Po smeni",    C.zuta],
          ["masina",   "Po mašini",   C.narandzasta],
          ["operater", "Po operateru",C.ljubicasta],
          ["rty",      "RTY/DPMO",    "#22d3ee"],
          ["heatmap",  "Heat mapa",   "#f472b6"],
          ["sigma",    "Sigma nivo",  "#a3e635"],
        ].map(([id,naziv,boja])=>(
          <button key={id} onClick={()=>setTip(id)} style={{
            background:"none",border:"none",
            borderBottom:tip===id?`2px solid ${boja}`:"2px solid transparent",
            color:tip===id?boja:C.sivi,
            fontSize:11,fontWeight:700,padding:"8px 14px",cursor:"pointer",letterSpacing:0.5}}>
            {naziv}
          </button>
        ))}
      </div>

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
                  ["RTY",ukN>0?((ukN-ukNOK)/ukN*100).toFixed(1)+"%":"-",C.ljubicasta,""],
                  ["DPMO",ukN>0?Math.round(ukNOK/ukN*1e6).toLocaleString():"-","#f472b6",""],
                ].map(([n,v,b,o])=>(
                  <div key={n} style={{background:C.panel,border:`1px solid ${b}25`,borderRadius:8,
                    padding:"9px 12px",textAlign:"center",minWidth:80}}>
                    <div style={{color:C.sivi,fontSize:8,letterSpacing:1.2,marginBottom:2}}>{n}</div>
                    <div style={{color:b,fontSize:16,fontWeight:700}}>{v}</div>
                    {o&&<div style={{color:C.sivi,fontSize:8,marginTop:1}}>{o}</div>}
                  </div>
                ))}
              </div>

              {/* Opis */}
              <div style={{color:C.sivi,fontSize:10,marginBottom:10}}>
                <strong style={{color:akt.boja}}>{akt.naziv}</strong> — {akt.opis}
                {(tip==="p"||tip==="np")&&<> · n̄ = {Math.round(nBar)}</>}
              </div>

              {/* Graf */}
              <ResponsiveContainer width="100%" height={310}>
                <ComposedChart data={cd} margin={{top:8,right:90,bottom:44,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.hover} vertical={false}/>
                  <XAxis dataKey="label" tick={{fill:C.sivi,fontSize:9}} tickLine={false}
                    angle={-40} textAnchor="end" height={52}
                    interval={Math.max(0,Math.floor(cd.length/12)-1)}/>
                  <YAxis tick={{fill:C.sivi,fontSize:10}} tickLine={false} axisLine={false}
                    domain={['auto','auto']} tickFormatter={v=>v+akt.sufiks}/>
                  <Tooltip contentStyle={{background:C.panel,border:`1px solid ${C.border}`,
                    borderRadius:8,fontSize:11,fontFamily:"'IBM Plex Mono',monospace"}}
                    labelStyle={{color:C.sivi}} formatter={(v)=>[v+akt.sufiks]}/>
                  <ReferenceLine y={ucl} stroke={C.crvena} strokeWidth={1.5} strokeDasharray="8 4"
                    label={{value:`UCL=${ucl}${akt.sufiks}`,fill:C.crvena,fontSize:9,position:"right"}}/>
                  <ReferenceLine y={cl} stroke={C.zuta} strokeWidth={1.5} strokeDasharray="4 3"
                    label={{value:`CL=${cl}${akt.sufiks}`,fill:C.zuta,fontSize:9,position:"right"}}/>
                  {lcl>0&&<ReferenceLine y={lcl} stroke={C.zelena} strokeWidth={1.5} strokeDasharray="8 4"
                    label={{value:`LCL=${lcl}${akt.sufiks}`,fill:C.zelena,fontSize:9,position:"right"}}/>}
                  <ReferenceLine y={+(cl+(ucl-cl)*2/3).toFixed(4)}
                    stroke={C.crvena} strokeWidth={0.4} strokeDasharray="2 6" opacity={0.35}
                    label={{value:"2σ",fill:C.crvena,fontSize:8,position:"right",opacity:0.5}}/>
                  <ReferenceLine y={+(cl+(ucl-cl)/3).toFixed(4)}
                    stroke={C.zuta} strokeWidth={0.4} strokeDasharray="2 6" opacity={0.35}
                    label={{value:"1σ",fill:C.zuta,fontSize:8,position:"right",opacity:0.5}}/>
                  {lcl>0&&<>
                    <ReferenceLine y={+(cl-(cl-lcl)*2/3).toFixed(4)}
                      stroke={C.zelena} strokeWidth={0.4} strokeDasharray="2 6" opacity={0.35}/>
                    <ReferenceLine y={+(cl-(cl-lcl)/3).toFixed(4)}
                      stroke={C.zelena} strokeWidth={0.4} strokeDasharray="2 6" opacity={0.35}/>
                  </>}
                  <Line type="monotone" dataKey="val" stroke={akt.boja} strokeWidth={2}
                    dot={<Dot/>} name={akt.naziv} connectNulls activeDot={{r:6}}/>
                </ComposedChart>
              </ResponsiveContainer>

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
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={paretoData} margin={{top:8,right:60,bottom:60,left:10}}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.hover} vertical={false}/>
                      <XAxis dataKey="naziv" tick={{fill:C.sivi,fontSize:9}} tickLine={false}
                        angle={-40} textAnchor="end" height={65}/>
                      <YAxis yAxisId="l" tick={{fill:C.sivi,fontSize:9}} tickLine={false} axisLine={false}/>
                      <YAxis yAxisId="r" orientation="right" tick={{fill:C.sivi,fontSize:9}}
                        tickLine={false} domain={[0,100]} tickFormatter={v=>v+"%"} axisLine={false}/>
                      <Tooltip contentStyle={{background:C.panel,border:`1px solid ${C.border}`,
                        borderRadius:8,fontSize:11}} labelStyle={{color:C.sivi}}/>
                      <Legend wrapperStyle={{color:C.sivi,fontSize:10}}/>
                      <Bar yAxisId="l" dataKey="count" name="Broj grešaka" radius={[4,4,0,0]}>
                        {paretoData.map((_,i)=><Cell key={i} fill={BOJE_P[i%BOJE_P.length]}/>)}
                      </Bar>
                      <Line yAxisId="r" type="monotone" dataKey="kum" stroke={C.zuta}
                        strokeWidth={2} dot={{fill:C.zuta,r:4}} name="Kumulativ %"/>
                      <ReferenceLine yAxisId="r" y={80} stroke={C.sivi} strokeDasharray="4 2"
                        label={{value:"80%",fill:C.sivi,fontSize:9,position:"right"}}/>
                    </ComposedChart>
                  </ResponsiveContainer>
                  {/* Tabela */}
                  <div style={{marginTop:14,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 80px",
                      background:C.hover,padding:"8px 14px",fontSize:9,color:C.sivi,gap:8}}>
                      <span>GREŠKA</span><span>BROJ</span><span>%</span><span>KUMULATIV</span>
                    </div>
                    {paretoData.map((p,i)=>{
                      const uk=paretoData.reduce((s,d)=>s+d.count,0);
                      return(
                        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 80px",
                          padding:"8px 14px",borderTop:`1px solid ${C.border}`,fontSize:11,gap:8}}>
                          <span style={{color:BOJE_P[i%BOJE_P.length],fontWeight:700}}>{p.naziv}</span>
                          <span style={{color:C.tekst}}>{p.count}</span>
                          <span style={{color:C.sivi}}>{uk>0?((p.count/uk)*100).toFixed(1):0}%</span>
                          <span style={{color:C.zuta}}>{p.kum}%</span>
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
                      ["RTY",s.rty+"%",C.zuta],["p",s.p+"%",C.narandzasta]].map(([l,v,b])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",
                        fontSize:11,marginBottom:5}}>
                        <span style={{color:C.sivi}}>{l}</span>
                        <span style={{color:b,fontWeight:700}}>{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={poSmeni} margin={{top:8,right:10,bottom:10,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.hover} vertical={false}/>
                  <XAxis dataKey="s" tick={{fill:C.sivi,fontSize:11}} tickLine={false}/>
                  <YAxis tick={{fill:C.sivi,fontSize:10}} tickLine={false} axisLine={false}/>
                  <Tooltip contentStyle={{background:C.panel,border:`1px solid ${C.border}`,
                    borderRadius:8,fontSize:11}} labelStyle={{color:C.sivi}}/>
                  <Legend wrapperStyle={{color:C.sivi,fontSize:10}}/>
                  <Bar dataKey="ok" fill={C.zelena} name="OK" radius={[4,4,0,0]}/>
                  <Bar dataKey="nok" fill={C.crvena} name="NOK" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── RTY TREND ── */}
          {tip==="rty"&&(
            <div>
              <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
                RTY % I DPMO TREND PO DANU
              </div>
              <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
                {[
                  ["RTY %",ukN>0?((ukN-ukNOK)/ukN*100).toFixed(2)+"%":"-",C.zelena],
                  ["DPMO",ukN>0?Math.round(ukNOK/ukN*1e6).toLocaleString():"-",C.ljubicasta],
                  ["Sigma nivo",ukN>0?(()=>{const p=ukNOK/ukN; const z=p>0?(-2.326*Math.log(p/(1-p))+1.5).toFixed(2):"6.00"; return z+"σ";})():"-","#a3e635"],
                  ["Uk. mereno",ukN,C.plava],
                  ["Uk. NOK",ukNOK,C.crvena],
                ].map(([n,v,b])=>(
                  <div key={n} style={{background:C.panel,border:`1px solid ${b}25`,borderRadius:8,
                    padding:"10px 14px",textAlign:"center",minWidth:100}}>
                    <div style={{color:C.sivi,fontSize:8,letterSpacing:1.2,marginBottom:3}}>{n}</div>
                    <div style={{color:b,fontSize:16,fontWeight:700}}>{v}</div>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={rtyTrend} margin={{top:8,right:70,bottom:44,left:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.hover} vertical={false}/>
                  <XAxis dataKey="datum" tick={{fill:C.sivi,fontSize:9}} tickLine={false}
                    angle={-40} textAnchor="end" height={52}
                    interval={Math.max(0,Math.floor(rtyTrend.length/12)-1)}/>
                  <YAxis yAxisId="l" tick={{fill:C.sivi,fontSize:10}} tickLine={false}
                    axisLine={false} domain={[0,100]} tickFormatter={v=>v+"%"} width={42}/>
                  <YAxis yAxisId="r" orientation="right" tick={{fill:C.sivi,fontSize:10}}
                    tickLine={false} axisLine={false} tickFormatter={v=>v+"%"} width={42}/>
                  <Tooltip contentStyle={{background:C.panel,border:`1px solid ${C.border}`,
                    borderRadius:8,fontSize:11,fontFamily:"monospace"}} labelStyle={{color:C.sivi}}/>
                  <Legend wrapperStyle={{color:C.sivi,fontSize:10}}/>
                  <ReferenceLine yAxisId="l" y={99.38} stroke="#a3e635" strokeDasharray="3 5" opacity={0.6}
                    label={{value:"4σ 99.38%",fill:"#a3e635",fontSize:8,position:"right"}}/>
                  <ReferenceLine yAxisId="l" y={95} stroke={C.zelena} strokeDasharray="4 2"
                    label={{value:"95%",fill:C.zelena,fontSize:8,position:"right"}}/>
                  <ReferenceLine yAxisId="l" y={80} stroke={C.zuta} strokeDasharray="4 2"
                    label={{value:"80%",fill:C.zuta,fontSize:8,position:"right"}}/>
                  <Line yAxisId="l" type="monotone" dataKey="rty" stroke={C.zelena}
                    strokeWidth={2.5} dot={{fill:C.zelena,r:4}} name="RTY %" connectNulls
                    activeDot={{r:7,stroke:C.zelena,strokeWidth:2,fill:C.panel}}/>
                  <Line yAxisId="r" type="monotone" dataKey="p" stroke={C.crvena}
                    strokeWidth={1.5} dot={{fill:C.crvena,r:3}} name="p % NOK" connectNulls
                    strokeDasharray="5 3" activeDot={{r:6}}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── PO MAŠINI ── */}
          {tip==="masina"&&(()=>{
            const poMas={};
            rawData.forEach(r=>{
              const k=r.masine?.naziv||"Nepoznata";
              if(!poMas[k])poMas[k]={naziv:k,ok:0,nok:0,n:0,c:0};
              poMas[k].ok +=r.ok_kolicina||0;
              poMas[k].nok+=r.nok_kolicina||0;
              poMas[k].n  +=r.ukupno_merenja||0;
              poMas[k].c  +=r.kom_nok||0;
            });
            const arr=Object.values(poMas).map(m=>({
              ...m,
              rty:m.n>0?+((m.ok/m.n)*100).toFixed(1):0,
              p:  m.n>0?+((m.nok/m.n)*100).toFixed(2):0,
              dpmo:m.n>0?Math.round((m.nok/m.n)*1e6):0,
            })).sort((a,b)=>b.nok-a.nok);
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
                            ["RTY",m.rty+"%",C.zuta],["DPMO",m.dpmo.toLocaleString(),C.ljubicasta]
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
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={arr} margin={{top:8,right:10,bottom:30,left:10}} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.hover} vertical={false}/>
                        <XAxis dataKey="naziv" tick={{fill:C.sivi,fontSize:10}} tickLine={false}/>
                        <YAxis tick={{fill:C.sivi,fontSize:9}} tickLine={false} axisLine={false}/>
                        <Tooltip contentStyle={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11}} labelStyle={{color:C.sivi}}/>
                        <Legend wrapperStyle={{color:C.sivi,fontSize:10}}/>
                        <Bar dataKey="ok" fill={C.zelena} name="OK" radius={[4,4,0,0]} stackId="a"/>
                        <Bar dataKey="nok" fill={C.crvena} name="NOK" radius={[4,4,0,0]} stackId="a"/>
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                )}
              </div>
            );
          })()}

          {/* ── PO OPERATERU ── */}
          {tip==="operater"&&(()=>{
            const poOp={};
            rawData.forEach(r=>{
              const k=r.kontrolor?.ime||"Nepoznat";
              if(!poOp[k])poOp[k]={ime:k,ok:0,nok:0,n:0,c:0};
              poOp[k].ok +=r.ok_kolicina||0;
              poOp[k].nok+=r.nok_kolicina||0;
              poOp[k].n  +=r.ukupno_merenja||0;
              poOp[k].c  +=r.kom_nok||0;
            });
            const arr=Object.values(poOp).map(o=>({
              ...o,
              rty:o.n>0?+((o.ok/o.n)*100).toFixed(1):0,
              p:  o.n>0?+((o.nok/o.n)*100).toFixed(2):0,
            })).sort((a,b)=>b.nok-a.nok);
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
                        <span>MERENJA</span><span>RTY %</span><span>DPMO</span>
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
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={arr} margin={{top:8,right:10,bottom:40,left:10}}>
                        <CartesianGrid strokeDasharray="3 3" stroke={C.hover} vertical={false}/>
                        <XAxis dataKey="ime" tick={{fill:C.sivi,fontSize:9}} tickLine={false}
                          angle={-30} textAnchor="end" height={50}/>
                        <YAxis tick={{fill:C.sivi,fontSize:9}} tickLine={false} axisLine={false}/>
                        <Tooltip contentStyle={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,fontSize:11}} labelStyle={{color:C.sivi}}/>
                        <Legend wrapperStyle={{color:C.sivi,fontSize:10}}/>
                        <Bar dataKey="ok" fill={C.zelena} name="OK" radius={[3,3,0,0]} stackId="s"/>
                        <Bar dataKey="nok" fill={C.crvena} name="NOK" radius={[3,3,0,0]} stackId="s"/>
                      </BarChart>
                    </ResponsiveContainer>
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
                                fontSize:v>0?8:0,color:"#fff",fontWeight:700,cursor:"default"}}>
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
            const dpmo=ukN>0?ukNOK/ukN*1e6:0;
            // Aproksimacija sigma nivoa iz DPMO
            const sigmaIzDPMO=(d)=>{
              if(d<=0)return 6.0;
              const tbl=[[3.4,6],[233,5],[6210,4],[66807,3],[308538,2],[691462,1]];
              for(const [lim,s] of tbl) if(d<=lim)return s;
              return 1;
            };
            const sigma=sigmaIzDPMO(dpmo);
            const rty=ukN>0?((ukN-ukNOK)/ukN*100):0;

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
                      ["RTY %",rty.toFixed(3)+"%",C.zelena],
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
                    <span>NIVO</span><span>DPMO</span><span>RTY</span><span>OCENA</span>
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
                        {i===trenutniIdx&&<span style={{background:C.plava,color:"#fff",
                          fontSize:9,padding:"1px 6px",borderRadius:10}}>← Vi ste ovde</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────
function Dashboard({C, addToast}) {
  const [podaci,setPodaci]=useState(null); const [loading,setLoading]=useState(true);
  const [period,setPeriod]=useState("7"); const dashRef=useRef(null);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{
        const od=new Date(); od.setDate(od.getDate()-Number(period));
        const{data,error}=await supabase.from("kontrolni_log")
          .select("datum,status,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,smena")
          .gte("datum",od.toISOString().split("T")[0]);
        if(error)throw error;
        if(!data?.length){setPodaci({});return;}

        const ukN=data.reduce((s,r)=>s+(r.ukupno_merenja||0),0);
        const ukNOK=data.reduce((s,r)=>s+(r.nok_kolicina||0),0);
        const ukOK=data.reduce((s,r)=>s+(r.ok_kolicina||0),0);
        const dpmo=ukN>0?Math.round((ukNOK/ukN)*1000000):0;
        const rty=ukN>0?((ukOK/ukN)*100).toFixed(1):"0";

        const gB={};
        data.forEach(r=>{if(r.greska_naziv&&r.greska_naziv!=="OK"){
          gB[r.greska_naziv]=(gB[r.greska_naziv]||0)+(r.kom_nok||0);}});
        const pareto=Object.entries(gB).map(([naziv,count])=>({naziv,count})).sort((a,b)=>b.count-a.count);

        const dani={};
        data.forEach(r=>{if(!dani[r.datum])dani[r.datum]={datum:r.datum,ok:0,nok:0,n:0};
          dani[r.datum].ok+=r.ok_kolicina||0; dani[r.datum].nok+=r.nok_kolicina||0;
          dani[r.datum].n+=r.ukupno_merenja||0;});
        const trend=Object.values(dani).map(d=>({...d,
          rty:d.n>0?+((d.ok/d.n)*100).toFixed(1):0,
          p:d.n>0?+((d.nok/d.n)*100).toFixed(2):0}));

        const sm={1:{s:1,ok:0,nok:0,n:0},2:{s:2,ok:0,nok:0,n:0},3:{s:3,ok:0,nok:0,n:0}};
        data.forEach(r=>{const s=sm[r.smena];if(s){s.ok+=r.ok_kolicina||0;s.nok+=r.nok_kolicina||0;s.n+=r.ukupno_merenja||0;}});

        setPodaci({ukN,ukNOK,ukOK,dpmo,rty,pareto,trend,smene:Object.values(sm)});
      }catch(e){addToast(e.message,"greska");}
      finally{setLoading(false);}
    })();
  },[period]);

  const exportPDF=async()=>{
    if(!dashRef.current)return;
    const{default:jsPDF}=await import("jspdf");
    const{default:h2c}=await import("html2canvas");
    const canvas=await h2c(dashRef.current,{scale:2,useCORS:true});
    const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    const w=pdf.internal.pageSize.getWidth();
    pdf.addImage(canvas.toDataURL("image/png"),"PNG",0,0,w,canvas.height*w/canvas.width);
    pdf.save(`SPC_Dashboard_${dISO()}.pdf`);
  };

  const BOJE=[C.crvena,C.narandzasta,C.zuta,C.plava,C.ljubicasta,"#e8b4b8","#a8d8a8","#b4c8e8","#d4b8e8","#e8d4b8"];

  // Pareto sa kumulativom
  const paretoData=()=>{
    const s=[...(podaci?.pareto||[])].slice(0,10);
    const uk=s.reduce((t,d)=>t+d.count,0); let k=0;
    return s.map(d=>{k+=d.count;return{...d,kumulativ:+((k/uk)*100).toFixed(1)};});
  };

  return(
    <div style={{padding:18}} ref={dashRef}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <span style={{color:C.tekst,fontSize:14,fontWeight:700,letterSpacing:1}}>DASHBOARD</span>
        <div style={{display:"flex",gap:10}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)}
            style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:6,
              color:C.tekst,fontSize:11,padding:"6px 10px",cursor:"pointer",fontFamily:"inherit"}}>
            <option value="1">Danas</option><option value="7">7 dana</option>
            <option value="30">30 dana</option><option value="90">90 dana</option>
          </select>
          <button onClick={exportPDF}
            style={{background:"#7c3aed",border:"none",borderRadius:6,color:"#fff",
              fontSize:11,fontWeight:700,padding:"7px 14px",cursor:"pointer"}}>📄 PDF</button>
        </div>
      </div>

      {loading?(
        <div style={{height:300,display:"flex",alignItems:"center",justifyContent:"center",color:C.sivi,fontSize:12}}>Učitavanje...</div>
      ):!podaci||!podaci.ukN?(
        <div style={{height:300,display:"flex",alignItems:"center",justifyContent:"center",color:C.border,fontSize:12}}>Nema podataka za izabrani period</div>
      ):(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,marginBottom:20}}>
            {[["MERENO",podaci.ukN,C.plava],["OK",podaci.ukOK,C.zelena],["NOK",podaci.ukNOK,C.crvena],
              ["RTY %",podaci.rty+"%",C.zuta],["DPMO",podaci.dpmo.toLocaleString(),C.ljubicasta],
            ].map(([n,v,b])=>(
              <div key={n} style={{background:C.panel,border:`1px solid ${b}25`,borderRadius:10,padding:"14px",textAlign:"center"}}>
                <div style={{color:C.sivi,fontSize:9,letterSpacing:1.2,marginBottom:4}}>{n}</div>
                <div style={{color:b,fontSize:22,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,padding:16}}>
              <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:10}}>RTY % TREND</div>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={podaci.trend} margin={{top:4,right:10,bottom:30,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.hover} vertical={false}/>
                  <XAxis dataKey="datum" tick={{fill:C.sivi,fontSize:8}} tickLine={false} angle={-30} textAnchor="end" height={40}/>
                  <YAxis tick={{fill:C.sivi,fontSize:9}} tickLine={false} domain={[0,100]} tickFormatter={v=>v+"%"} axisLine={false}/>
                  <Tooltip contentStyle={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,fontSize:10}} labelStyle={{color:C.sivi}}/>
                  <ReferenceLine y={95} stroke={C.zelena} strokeDasharray="4 2" label={{value:"95%",fill:C.zelena,fontSize:8}}/>
                  <ReferenceLine y={80} stroke={C.zuta} strokeDasharray="4 2" label={{value:"80%",fill:C.zuta,fontSize:8}}/>
                  <Line type="monotone" dataKey="rty" stroke={C.zelena} strokeWidth={2} dot={{fill:C.zelena,r:3}} name="RTY %"/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,padding:16}}>
              <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:10}}>ANALIZA PO SMENI</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={podaci.smene} margin={{top:4,right:10,bottom:4,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.hover} vertical={false}/>
                  <XAxis dataKey="s" tickFormatter={v=>`Smena ${v}`} tick={{fill:C.sivi,fontSize:10}} tickLine={false}/>
                  <YAxis tick={{fill:C.sivi,fontSize:9}} tickLine={false} axisLine={false}/>
                  <Tooltip contentStyle={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,fontSize:10}} labelStyle={{color:C.sivi}}/>
                  <Legend wrapperStyle={{color:C.sivi,fontSize:9}}/>
                  <Bar dataKey="ok" fill={C.zelena} name="OK" radius={[3,3,0,0]}/>
                  <Bar dataKey="nok" fill={C.crvena} name="NOK" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,padding:16}}>
            <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:12}}>PARETO — TOP 10 GREŠAKA (80/20 pravilo)</div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={paretoData()} margin={{top:8,right:60,bottom:60,left:10}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.hover} vertical={false}/>
                <XAxis dataKey="naziv" tick={{fill:C.sivi,fontSize:9}} tickLine={false} angle={-40} textAnchor="end" height={65}/>
                <YAxis yAxisId="l" tick={{fill:C.sivi,fontSize:9}} tickLine={false} axisLine={false}/>
                <YAxis yAxisId="r" orientation="right" tick={{fill:C.sivi,fontSize:9}} tickLine={false}
                  tickFormatter={v=>v+"%"} domain={[0,100]} axisLine={false}/>
                <Tooltip contentStyle={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,fontSize:10}} labelStyle={{color:C.sivi}}/>
                <Legend wrapperStyle={{color:C.sivi,fontSize:9}}/>
                <Bar yAxisId="l" dataKey="count" name="Broj grešaka" radius={[3,3,0,0]}>
                  {paretoData().map((_,i)=><Cell key={i} fill={BOJE[i%BOJE.length]}/>)}
                </Bar>
                <Line yAxisId="r" type="monotone" dataKey="kumulativ" stroke={C.zuta}
                  strokeWidth={2} dot={{fill:C.zuta,r:3}} name="Kumulativ %"/>
                <ReferenceLine yAxisId="r" y={80} stroke={C.sivi} strokeDasharray="4 2"
                  label={{value:"80%",fill:C.sivi,fontSize:9,position:"right"}}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────
function Login({onLogin,C}) {
  const [email,setEmail]=useState(""); const [loz,setLoz]=useState("");
  const [err,setErr]=useState(""); const [load,setLoad]=useState(false);
  const prijavi=async()=>{
    if(!email||!loz){setErr("Unesite email i lozinku.");return;}
    setLoad(true);setErr("");
    try{
      const{data,error}=await supabase.auth.signInWithPassword({email,password:loz});
      if(error)throw error;
      const{data:r}=await supabase.from("radnici").select("ime,uloga,id").eq("user_id",data.user.id).single();
      onLogin({id:data.user.id,email:data.user.email,
        ime:r?.ime||data.user.email.split("@")[0],uloga:r?.uloga||"kontrolor",radnikId:r?.id});
    }catch(e){setErr(e.message==="Invalid login credentials"?"Pogrešan email ili lozinka.":e.message||"Greška.");}
    finally{setLoad(false);}
  };
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:"'IBM Plex Mono',monospace"}}>
      <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:14,
        padding:"46px 40px",width:340,textAlign:"center",
        boxShadow:C.naziv==="tamna"?"0 20px 60px rgba(0,0,0,0.5)":"0 8px 30px rgba(0,0,0,0.12)"}}>
        <div style={{fontSize:36,marginBottom:8}}>⚙️</div>
        <div style={{color:C.plava,fontSize:20,fontWeight:700,letterSpacing:2,marginBottom:4}}>SPC KONTROLA</div>
        <div style={{color:C.sivi,fontSize:10,marginBottom:30,letterSpacing:1}}>ATRIBUTIVNE KARTE</div>
        {[["EMAIL","email","text",email,setEmail,"kontrolor@fabrika.rs"],
          ["LOZINKA","password","password",loz,setLoz,"••••••••"]].map(([l,n,t,v,s,ph])=>(
          <div key={n} style={{textAlign:"left",marginBottom:14}}>
            <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>{l}</div>
            <input value={v} onChange={e=>s(e.target.value)} onKeyDown={e=>e.key==="Enter"&&prijavi()}
              type={t} placeholder={ph}
              style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,
                color:C.tekst,fontSize:13,padding:"10px 12px",boxSizing:"border-box",
                outline:"none",fontFamily:"inherit"}}/>
          </div>
        ))}
        {err&&<div style={{color:C.crvena,fontSize:11,marginBottom:10,textAlign:"left",
          background:C.nok,padding:"7px 10px",borderRadius:5}}>{err}</div>}
        <button onClick={prijavi} disabled={load}
          style={{width:"100%",background:load?C.hover:C.zelena,border:"none",borderRadius:6,
            color:load?C.sivi:"#fff",fontSize:13,fontWeight:700,padding:"12px",
            cursor:load?"not-allowed":"pointer",letterSpacing:1,marginTop:4}}>
          {load?"Prijavljivanje...":"PRIJAVA"}
        </button>
        <div style={{color:C.sivi,fontSize:10,marginTop:20,lineHeight:1.6}}>
          Korisnici se kreiraju u Supabase<br/>
          Auth → Users → Add user
        </div>
      </div>
    </div>
  );
}

// ─── GLAVNA FORMA ─────────────────────────────────────────────
function GlavnaForma({korisnik,onOdjava,onNazad,C,setC}) {
  const ekran = useEkran();
  const [sviDelovi,setSviDelovi] = useState([]);
  const [greskeKat,setGreskeKat] = useState({});
  const [loadInit,setLoadInit]   = useState(true);
  const [idDeo,setIdDeo]         = useState(()=>localStorage.getItem("spc_draft_id")||"");
  const [deoInfo,setDeoInfo]     = useState(null);
  const [upoz,setUpoz]           = useState("");
  const [status,setStatus]       = useState("");
  const [kategorija,setKategorija] = useState("");
  const [podkat,setPodkat]         = useState("");
  const [kolicina,setKolicina]     = useState(1);
  const [smena,setSmena]           = useState(()=>Number(sessionStorage.getItem("spc_smena")||1));
  const [listaG,setListaG]         = useState(()=>{ try{return JSON.parse(localStorage.getItem("spc_draft_g")||"[]");}catch{return[];} });
  const [listaP,setListaP]         = useState(()=>{ try{return JSON.parse(localStorage.getItem("spc_draft_p")||"[]");}catch{return[];} });
  const [smenaOK,setSmenaOK]       = useState(0);
  const [smenaNOK,setSmenaNOK]     = useState(0);
  const [smenaTotal,setSmenaTotal] = useState(0);
  const [preostalo,setPreostalo]   = useState(0);
  const [cilj,setCilj]             = useState(0);
  const [modal,setModal]           = useState(null);
  const [alarm,setAlarm]           = useState(null);
  const [tab,setTab]               = useState("unos");
  const [saving,setSaving]         = useState(false);
  const [logD,setLogD]             = useState([]);
  const [loadLog,setLoadLog]       = useState(false);
  const [toasts,setToasts]         = useState([]);
  const [foto,setFoto]             = useState(null);
  const fotoRef = useRef(null);
  const idRef   = useRef(null);
  const {online,queue,addToQueue,flushQueue} = useOfflineQueue();

  const addToast = useCallback((tekst,tip="info")=>{
    const id=Date.now(); setToasts(p=>[...p,{tekst,tip,id}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4500);
  },[]);

  // Auto-save drafts
  useEffect(()=>{ localStorage.setItem("spc_draft_id",idDeo); },[idDeo]);
  useEffect(()=>{ localStorage.setItem("spc_draft_g",JSON.stringify(listaG)); },[listaG]);
  useEffect(()=>{ localStorage.setItem("spc_draft_p",JSON.stringify(listaP)); },[listaP]);

  // Init
  useEffect(()=>{
    (async()=>{
      try{
        const{data:d}=await supabase.from("delovi")
          .select("id_deo,naziv_dela,kom_za_kontrolu,lsl,usl,target,jedinica_mere,slika_naziv,linija:linije(linija,id),masina:masine(naziv,id)");
        setSviDelovi(d||[]);
        const{data:g}=await supabase.from("greske_katalog").select("kategorija,podkategorija").order("kategorija");
        const gr={};(g||[]).forEach(r=>{if(!gr[r.kategorija])gr[r.kategorija]=[];gr[r.kategorija].push(r.podkategorija);});
        setGreskeKat(gr);
        const stat=JSON.parse(sessionStorage.getItem("spc_stat")||"{}");
        if(stat.ok)setSmenaOK(stat.ok); if(stat.nok)setSmenaNOK(stat.nok); if(stat.total)setSmenaTotal(stat.total);
        if(listaG.length>0) addToast(`📋 Draft učitan: ${listaG.length} stavki`,"info");
      }catch(e){addToast(e.message,"greska");}
      finally{setLoadInit(false);setTimeout(()=>idRef.current?.focus(),100);}

      // Real-time
      const ch=supabase.channel("spc_rt")
        .on("postgres_changes",{event:"INSERT",schema:"public",table:"kontrolni_log"},payload=>{
          const r=payload.new;
          if(r.status==="NOK") addToast(`🔴 NOK: ${r.id_deo} — ${r.greska_naziv} ×${r.nok_kolicina}`,"greska");
        }).subscribe();
      return()=>supabase.removeChannel(ch);
    })();
  },[]);

  // Flush offline queue
  useEffect(()=>{
    if(online&&queue.length>0) flushQueue().then(n=>{ if(n>0) addToast(`✓ ${n} offline unosa sinhronizovano!`,"uspeh"); });
  },[online]);

  useEffect(()=>{ sessionStorage.setItem("spc_stat",JSON.stringify({ok:smenaOK,nok:smenaNOK,total:smenaTotal})); },[smenaOK,smenaNOK,smenaTotal]);

  useBarcodeScanner(useCallback((kod)=>{ setIdDeo(kod.toUpperCase()); addToast(`📷 Skenirano: ${kod}`,"info"); },[]));

  // ID deo lookup
  useEffect(()=>{
    if(idDeo.length<3){setDeoInfo(null);setUpoz("");return;}
    const n=sviDelovi.find(d=>d.id_deo.toUpperCase()===idDeo.toUpperCase());
    if(n){
      setDeoInfo(n);setCilj(n.kom_za_kontrolu||30);setPreostalo(n.kom_za_kontrolu||30);
      supabase.from("kontrolni_log").select("greska_naziv").eq("id_deo",idDeo.toUpperCase()).eq("status","NOK")
        .then(({data})=>{
          if(!data?.length){setUpoz("");return;}
          const b={};data.forEach(r=>{b[r.greska_naziv]=(b[r.greska_naziv]||0)+1;});
          const mx=Object.entries(b).sort((a,bb)=>bb[1]-a[1])[0];
          if(mx&&mx[1]>=2) setUpoz(`⚠ ČESTO: ${mx[0]} (${mx[1]}x)`); else setUpoz("");
        });
    }else{setDeoInfo(null);setUpoz("");}
  },[idDeo,sviDelovi]);

  const dodajGresku=()=>{
    if(!deoInfo){setModal({poruka:"ID dela nije pronađen!",tip:"greska"});return;}
    if(!status) {setModal({poruka:"Izaberi STATUS!",tip:"greska"});return;}
    if(status==="NOK"&&(!kategorija||!podkat)){setModal({poruka:"Popuni NOK detalje!",tip:"greska"});return;}
    setListaG(p=>[...p,{kat:status==="OK"?"OK":kategorija,pod:status==="OK"?"-":podkat,
      status,kolicina,foto:status==="NOK"?foto:null}]);
    setStatus("");setKategorija("");setPodkat("");setKolicina(1);setFoto(null);
  };

  const snimiDeo=()=>{
    if(!listaG.length){setModal({poruka:"Lista je prazna!",tip:"greska"});return;}
    if(preostalo<=0) {setModal({poruka:"Serija je već gotova!",tip:"greska"});return;}
    let ok=0,nok=0;
    const np=listaG.map(s=>{if(s.status==="NOK")nok+=s.kolicina;else ok+=s.kolicina;
      return{...s,idDeo:idDeo.toUpperCase(),datum:dISO(),vreme:vreme()};});
    setListaP(p=>[...p,...np]);
    setSmenaOK(p=>p+ok);setSmenaNOK(p=>p+nok);setSmenaTotal(p=>p+1);
    setPreostalo(p=>Math.max(0,p-1));setListaG([]);
    addToast(`✓ Sačuvano (OK:${ok} NOK:${nok})`,"uspeh");
  };

  const zapisi=async()=>{
    if(!listaP.length){setModal({poruka:"Lista pregleda je prazna!",tip:"greska"});return;}
    if(preostalo>0&&korisnik.uloga!=="admin"){
      setModal({poruka:`Serija nije završena (Preostalo: ${preostalo}).\nPotrebna ADMIN autorizacija.`,tip:"greska"});return;}
    setSaving(true);
    const redovi=listaP.map(s=>{const j=s.status==="OK";return{
      datum:s.datum,smena,id_deo:s.idDeo,naziv_dela:deoInfo?.naziv_dela||"",
      linija_id:deoInfo?.linija?.id||null,masina_id:deoInfo?.masina?.id||null,
      kontrolor_id:korisnik.radnikId||null,status:s.status,
      greska_naziv:s.kat,podkategorija:s.pod,
      kom_nok:j?0:s.kolicina,ok_kolicina:j?s.kolicina:0,
      nok_kolicina:j?0:s.kolicina,ukupno_merenja:s.kolicina,potreban_broj:cilj,};});
    try{
      if(!online){addToQueue(redovi);addToast(`📶 Offline: ${redovi.length} u redu`,"info");
        setListaP([]);setListaG([]);noviNalog();return;}
      const{error}=await supabase.from("kontrolni_log").insert(redovi);
      if(error)throw error;
      const nok=redovi.filter(r=>r.status==="NOK").length,uk=redovi.length;
      if(uk>0&&(nok/uk)>0.1) setAlarm(`p = ${((nok/uk)*100).toFixed(1)}% NOK za ${deoInfo?.naziv_dela}`);
      localStorage.removeItem("spc_draft_p");localStorage.removeItem("spc_draft_g");
      setModal({poruka:`✓ Sačuvano ${redovi.length} stavki u bazu!`,tip:"uspeh",
        onOK:()=>{setModal(null);noviNalog();}});
    }catch(e){addToast(e.message,"greska");}
    finally{setSaving(false);}
  };

  const ucitajLog=async()=>{
    setLoadLog(true);
    try{
      const{data,error}=await supabase.from("kontrolni_log")
        .select("datum,id_deo,naziv_dela,greska_naziv,podkategorija,status,ok_kolicina,nok_kolicina,smena,created_at")
        .order("created_at",{ascending:false}).limit(150);
      if(error)throw error; setLogD(data||[]);
    }catch(e){addToast(e.message,"greska");}
    finally{setLoadLog(false);}
  };
  useEffect(()=>{if(tab==="log")ucitajLog();},[tab]);

  const noviNalog=()=>{
    setIdDeo("");setDeoInfo(null);setUpoz("");setStatus("");
    setKategorija("");setPodkat("");setKolicina(1);
    setListaG([]);setListaP([]);setPreostalo(0);setCilj(0);setFoto(null);
    localStorage.removeItem("spc_draft_id");localStorage.removeItem("spc_draft_g");
    setTimeout(()=>idRef.current?.focus(),100);
  };

  const odjava=async()=>{await supabase.auth.signOut();onOdjava();};

  const LBL={color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4,display:"block"};
  const INP={width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,
    color:C.tekst,fontSize:12,padding:"9px 11px",boxSizing:"border-box",outline:"none",fontFamily:"inherit"};
  const BTN=(bg,dis=false)=>({background:dis?C.hover:bg,border:"none",borderRadius:6,
    color:dis?C.sivi:"#fff",fontSize:12,fontWeight:700,padding:"10px 0",
    cursor:dis?"not-allowed":"pointer",letterSpacing:1,width:"100%",opacity:dis?0.5:1,transition:"all 0.15s"});

  const TABOVI=[["unos","UNOS"],["crtez","CRTEŽ"],["log","LOG"],["smena","SMENA"],["karte","SPC KARTE"],["dashboard","DASHBOARD"]];

  if(loadInit)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",color:C.sivi,fontFamily:"'IBM Plex Mono',monospace",fontSize:12}}>
      Učitavanje...
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'IBM Plex Mono',monospace",color:C.tekst}}>
      {modal&&<Modal poruka={modal.poruka} tip={modal.tip} onOK={modal.onOK||(()=>setModal(null))} onOtkazati={modal.onOtkazati} C={C}/>}
      {alarm&&<AlarmBanner poruka={alarm} onClose={()=>setAlarm(null)} C={C}/>}
      <Toast poruke={toasts} C={C}/>

      {/* HEADER */}
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,
        padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between",height:48,gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {onNazad&&<button onClick={onNazad} style={{background:"none",border:"none",
            color:C.sivi,fontSize:13,cursor:"pointer",padding:"0 8px 0 0"}}>←</button>}
          <span style={{color:C.plava,fontWeight:700,fontSize:13,letterSpacing:2}}>⚙ SPC</span>
          <span style={{color:C.border}}>|</span>
          <span style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.sivi}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:online?C.zelena:C.crvena,display:"inline-block"}}/>
            {online?`Online`:`Offline (${queue.length})`}
          </span>
          <span style={{color:C.border}}>|</span>
          <select value={smena} onChange={e=>{setSmena(Number(e.target.value));sessionStorage.setItem("spc_smena",e.target.value);}}
            style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:4,
              color:C.tekst,fontSize:10,padding:"2px 8px",cursor:"pointer"}}>
            <option value={1}>Smena 1</option><option value={2}>Smena 2</option><option value={3}>Smena 3</option>
          </select>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setC(p=>p.naziv==="tamna"?TEME.svetla:TEME.tamna)}
            style={{background:C.hover,border:`1px solid ${C.border}`,borderRadius:5,
              color:C.sivi,fontSize:11,padding:"4px 10px",cursor:"pointer"}}>
            {C.naziv==="tamna"?"☀️":"🌙"}
          </button>
          <span style={{background:korisnik.uloga==="admin"?"#3d2c00":"#0c2d48",
            color:korisnik.uloga==="admin"?C.zuta:C.plava,
            fontSize:9,padding:"2px 8px",borderRadius:20,letterSpacing:1}}>
            {korisnik.uloga.toUpperCase()}</span>
          <span style={{color:C.sivi,fontSize:10}}>{korisnik.ime}</span>
          <button onClick={odjava} style={{background:"none",border:`1px solid ${C.border}`,
            borderRadius:5,color:C.sivi,fontSize:10,padding:"3px 10px",cursor:"pointer"}}>Odjava</button>
        </div>
      </div>

      {/* TABOVI */}
      {!ekran.mob && (
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,background:C.panel,paddingLeft:18}}>
        {TABOVI.map(([id,n])=>(
          <button key={id} onClick={()=>setTab(id)} style={{
            background:"none",border:"none",
            borderBottom:tab===id?`2px solid ${id==="dashboard"?C.zelena:id==="karte"?C.narandzasta:id==="crtez"?C.ljubicasta:C.plava}`:"2px solid transparent",
            color:tab===id?(id==="dashboard"?C.zelena:id==="karte"?C.narandzasta:id==="crtez"?C.ljubicasta:C.plava):C.sivi,
            fontSize:10,fontWeight:700,padding:"10px 14px",cursor:"pointer",letterSpacing:1}}>
            {n}
            {id==="unos"&&listaP.length>0&&<span style={{background:C.plava,color:"#fff",fontSize:8,borderRadius:10,padding:"1px 5px",marginLeft:5}}>{listaP.length}</span>}
          </button>
        ))}
        <div style={{flex:1}}/><span style={{color:C.sivi,fontSize:9,alignSelf:"center",paddingRight:12}}>{dPrikaz()}</span>
      </div>
      )}

            {/* ══ UNOS ══ */}
      {tab==="unos" && ekran.mob && (
        <MobilniUnos
          idDeo={idDeo} setIdDeo={setIdDeo} deoInfo={deoInfo} upoz={upoz}
          status={status} setStatus={setStatus}
          kategorija={kategorija} setKategorija={setKategorija}
          podkat={podkat} setPodkat={setPodkat}
          kolicina={kolicina} setKolicina={setKolicina}
          greskeKat={greskeKat}
          listaG={listaG} setListaG={setListaG}
          listaP={listaP} setListaP={setListaP}
          preostalo={preostalo} cilj={cilj}
          smenaOK={smenaOK} smenaNOK={smenaNOK} smenaTotal={smenaTotal}
          foto={foto} setFoto={setFoto} fotoRef={fotoRef}
          dodajGresku={dodajGresku} snimiDeo={snimiDeo} zapisi={zapisi}
          noviNalog={noviNalog} saving={saving} online={online} queue={queue} C={C}
          idRef={idRef}
        />
      )}
      {tab==="unos" && !ekran.mob && (
        <div style={{display:"grid",gridTemplateColumns:"280px 1fr 235px",height:"calc(100vh - 89px)"}}>
          {/* Leva */}
          <div style={{borderRight:`1px solid ${C.border}`,padding:14,overflowY:"auto",display:"flex",flexDirection:"column",gap:11}}>
            <div>
              <label style={LBL}>ID DELA <span style={{color:C.border,fontWeight:400}}>(skeniraj ili unesi)</span></label>
              <input ref={idRef} value={idDeo} onChange={e=>setIdDeo(e.target.value.toUpperCase())}
                placeholder="npr. 5501-A"
                style={{...INP,borderColor:deoInfo?C.zelena:idDeo.length>2?C.crvena:C.border,
                  background:deoInfo?C.ok:idDeo.length>2?C.nok:C.input,
                  fontSize:15,fontWeight:700,letterSpacing:2,textAlign:"center"}}/>
              {upoz&&<div style={{color:C.crvena,fontSize:10,marginTop:4,padding:"5px 8px",background:C.nok,borderRadius:4}}>{upoz}</div>}
            </div>

            {deoInfo?(
              <div style={{background:C.ok,border:`1px solid ${C.zelena}26`,borderRadius:8,padding:11}}>
                <div style={{color:C.zelena,fontWeight:700,fontSize:12,marginBottom:5}}>{deoInfo.naziv_dela}</div>
                {[["Linija",deoInfo.linija?.linija||"-"],["Mašina",deoInfo.masina?.naziv||"-"],
                  ["LSL",deoInfo.lsl||"-"],["USL",deoInfo.usl||"-"],
                  ["Target",deoInfo.target?`${deoInfo.target} ${deoInfo.jedinica_mere||""}`:"-"],
                ].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}>
                    <span style={{color:C.sivi}}>{l}</span><span style={{color:C.tekst,fontWeight:l==="LSL"||l==="USL"?700:400}}>{v}</span>
                  </div>
                ))}
                <div style={{marginTop:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,marginBottom:3}}>
                    <span style={{color:C.sivi}}>PREOSTALO</span>
                    <span style={{color:preostalo===0?C.zelena:C.zuta,fontWeight:700}}>{preostalo}/{cilj}</span>
                  </div>
                  <div style={{background:C.hover,borderRadius:3,height:5}}>
                    <div style={{background:preostalo===0?C.zelena:C.plava,width:`${cilj>0?(cilj-preostalo)/cilj*100:0}%`,
                      height:5,borderRadius:3,transition:"width 0.3s"}}/>
                  </div>
                </div>
              </div>
            ):(
              <div style={{background:C.panel,border:`1px dashed ${C.border}`,borderRadius:8,
                padding:20,textAlign:"center",color:C.border,fontSize:10}}>Unesi ID dela</div>
            )}

            {/* Foto */}
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:10}}>
              <div style={{color:C.sivi,fontSize:9,letterSpacing:1,marginBottom:6}}>FOTO GREŠKE</div>
              {foto?(
                <div style={{position:"relative"}}>
                  <img src={foto} alt="greška" style={{width:"100%",borderRadius:5,maxHeight:110,objectFit:"cover"}}/>
                  <button onClick={()=>setFoto(null)} style={{position:"absolute",top:3,right:3,
                    background:C.crvena,border:"none",borderRadius:3,color:"#fff",fontSize:10,padding:"1px 6px",cursor:"pointer"}}>✕</button>
                </div>
              ):(
                <div onClick={()=>fotoRef.current?.click()} style={{height:70,display:"flex",alignItems:"center",
                  justifyContent:"center",color:C.border,flexDirection:"column",gap:3,fontSize:10,
                  border:`1px dashed ${C.border}`,borderRadius:5,cursor:"pointer"}}>
                  📷 Fotografiši grešku
                </div>
              )}
              <input ref={fotoRef} type="file" accept="image/*" capture="environment" onChange={e=>{
                const f=e.target.files[0]; if(!f)return;
                const r=new FileReader(); r.onload=ev=>setFoto(ev.target.result); r.readAsDataURL(f);
              }} style={{display:"none"}}/>
            </div>

            <button onClick={noviNalog}
              style={{...BTN(C.hover),border:`1px solid ${C.border}`,color:C.sivi,fontSize:10,marginTop:"auto"}}>
              ↺ NOVI NALOG
            </button>
          </div>

          {/* Sredina */}
          <div style={{padding:14,overflowY:"auto",display:"flex",flexDirection:"column",gap:9,borderRight:`1px solid ${C.border}`}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              <div>
                <label style={LBL}>STATUS</label>
                <select value={status} onChange={e=>{setStatus(e.target.value);if(e.target.value==="OK"){setKategorija("");setPodkat("");}}}
                  style={{...INP,borderColor:status==="OK"?C.zelena:status==="NOK"?C.crvena:C.border,
                    background:status==="OK"?C.ok:status==="NOK"?C.nok:C.input,
                    fontWeight:700,fontSize:13,textAlign:"center",cursor:"pointer"}}>
                  <option value="">-- Status --</option>
                  <option value="OK">✓  OK</option><option value="NOK">✗  NOK</option>
                </select>
              </div>
              <div>
                <label style={LBL}>KOLIČINA</label>
                <select value={kolicina} onChange={e=>setKolicina(Number(e.target.value))} style={{...INP,cursor:"pointer"}}>
                  {Array.from({length:20},(_,i)=>i+1).map(k=><option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={LBL}>KATEGORIJA GREŠKE</label>
              <select value={kategorija} onChange={e=>{setKategorija(e.target.value);setPodkat("");}}
                disabled={status!=="NOK"}
                style={{...INP,opacity:status!=="NOK"?0.4:1,cursor:status!=="NOK"?"not-allowed":"pointer"}}>
                <option value="">-- Izaberi kategoriju --</option>
                {Object.keys(greskeKat).map(k=><option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div>
              <label style={LBL}>PODKATEGORIJA</label>
              <select value={podkat} onChange={e=>setPodkat(e.target.value)}
                disabled={!kategorija||status!=="NOK"}
                style={{...INP,opacity:(!kategorija||status!=="NOK")?0.4:1,cursor:(!kategorija||status!=="NOK")?"not-allowed":"pointer"}}>
                <option value="">-- Izaberi podkategoriju --</option>
                {(greskeKat[kategorija]||[]).map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <button onClick={dodajGresku} disabled={!deoInfo}
              style={{...BTN(C.plava,!deoInfo),fontSize:11,padding:"10px"}}>
              + DODAJ U LISTU
            </button>

            <label style={{...LBL,marginBottom:3}}>PRIVREMENA LISTA ({listaG.length})</label>
            <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden",flex:1,minHeight:60,maxHeight:250,overflowY:"auto"}}>
              {!listaG.length?<div style={{padding:14,textAlign:"center",color:C.border,fontSize:10}}>Dodaj stavke</div>
               :listaG.map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"7px 10px",borderBottom:`1px solid ${C.border}`,background:s.status==="OK"?C.ok:C.nok}}>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    {s.foto&&<span style={{fontSize:10}}>📷</span>}
                    <span style={{color:s.status==="OK"?C.zelena:C.crvena,fontWeight:700,fontSize:10,minWidth:28}}>{s.status}</span>
                    <span style={{color:C.tekst,fontSize:10}}>{s.kat} › {s.pod}</span>
                  </div>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    <span style={{color:C.sivi,fontSize:10}}>×{s.kolicina}</span>
                    <button onClick={()=>setListaG(p=>p.filter((_,j)=>j!==i))}
                      style={{background:"none",border:"none",color:C.crvena,cursor:"pointer",fontSize:12,padding:0}}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={snimiDeo} disabled={!listaG.length}
              style={{...BTN(C.zelena,!listaG.length),fontSize:11,padding:"10px",
                boxShadow:listaG.length?`0 0 12px ${C.zelena}40`:"none"}}>
              ✓  SNIMI DEO
            </button>
          </div>

          {/* Desna */}
          <div style={{padding:14,display:"flex",flexDirection:"column",gap:10,overflowY:"auto"}}>
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:10}}>
              <div style={{color:C.sivi,fontSize:9,letterSpacing:1,marginBottom:5}}>SMENA TOTALI</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,textAlign:"center"}}>
                {[["MER",smenaTotal,C.plava],["OK",smenaOK,C.zelena],["NOK",smenaNOK,C.crvena]].map(([l,v,b])=>(
                  <div key={l} style={{background:C.bg,borderRadius:5,padding:"6px 2px"}}>
                    <div style={{color:b,fontSize:16,fontWeight:700}}>{v}</div>
                    <div style={{color:C.sivi,fontSize:8}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:7,textAlign:"center",fontSize:11,borderTop:`1px solid ${C.border}`,paddingTop:7}}>
                <span style={{color:C.zuta,fontWeight:700}}>
                  RTY: {smenaTotal>0?((smenaOK/(smenaOK+smenaNOK)*100)||0).toFixed(1):"—"}%
                </span>
                <span style={{color:C.sivi,fontSize:9,marginLeft:10}}>
                  DPMO: {smenaTotal>0?Math.round(((smenaNOK/(smenaOK+smenaNOK))||0)*1e6).toLocaleString():"—"}
                </span>
              </div>
            </div>

            <label style={LBL}>PREGLED ({listaP.length})</label>
            <div style={{flex:1,border:`1px solid ${C.border}`,borderRadius:8,overflow:"auto",minHeight:60}}>
              {!listaP.length?<div style={{padding:14,textAlign:"center",color:C.border,fontSize:10}}>Nema snimljenih</div>
               :listaP.map((s,i)=>(
                <div key={i} style={{padding:"6px 9px",borderBottom:`1px solid ${C.border}`,
                  background:s.status==="OK"?C.ok:C.nok,fontSize:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{color:s.status==="OK"?C.zelena:C.crvena,fontWeight:700}}>{s.status}</span>
                    <div style={{display:"flex",gap:3,alignItems:"center"}}>
                      {s.foto&&<span style={{fontSize:9}}>📷</span>}
                      <span style={{color:C.sivi}}>×{s.kolicina}</span>
                    </div>
                  </div>
                  <div style={{color:C.tekst}}>{s.kat}</div>
                  <div style={{color:C.sivi,fontSize:9}}>{s.pod} · {s.vreme}</div>
                </div>
              ))}
            </div>

            {!online&&queue.length>0&&(
              <div style={{background:"#3d2c00",border:`1px solid ${C.zuta}30`,borderRadius:5,
                padding:"7px 10px",fontSize:10,color:C.zuta}}>
                📶 {queue.length} stavki u offline redu
              </div>
            )}

            <button onClick={zapisi} disabled={!listaP.length||saving}
              style={{...BTN("#7c3aed",!listaP.length||saving),fontSize:11,padding:"10px",
                boxShadow:listaP.length?`0 0 10px #7c3aed40`:"none"}}>
              {saving?"Snimanje...":(online?"💾  ZAPIŠI U BAZU":"📶  OFFLINE QUEUE")}
            </button>
          </div>
        </div>
      )}

      {/* ══ CRTEŽ ══ */}
      {tab==="crtez"&&(
        <div style={{height:"calc(100vh - 89px)"}}>
          <CrtezDela deoInfo={deoInfo} C={C}/>
        </div>
      )}

      {/* ══ LOG ══ */}
      {tab==="log"&&(
        <div style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
            <span style={{color:C.sivi,fontSize:10}}>Poslednjih 150 unosa</span>
            <button onClick={ucitajLog} style={{background:C.panel,border:`1px solid ${C.border}`,
              borderRadius:5,color:C.sivi,fontSize:10,padding:"4px 12px",cursor:"pointer"}}>↻ Osveži</button>
          </div>
          {loadLog?<div style={{textAlign:"center",color:C.sivi,padding:30,fontSize:11}}>Učitavanje...</div>:(
            <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"90px 70px 55px 1fr 1fr 55px 38px 38px",
                background:C.hover,padding:"8px 12px",fontSize:9,color:C.sivi,gap:6}}>
                <span>DATUM</span><span>ID DEO</span><span>SMENA</span><span>KATEGORIJA</span>
                <span>PODKAT.</span><span>STATUS</span><span>OK</span><span>NOK</span>
              </div>
              {!logD.length?<div style={{padding:28,textAlign:"center",color:C.border,fontSize:11}}>Nema podataka</div>
               :logD.map((r,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"90px 70px 55px 1fr 1fr 55px 38px 38px",
                  padding:"7px 12px",borderTop:`1px solid ${C.border}`,
                  background:r.status==="OK"?C.ok:C.nok,fontSize:10,gap:6,alignItems:"center"}}>
                  <span style={{color:C.sivi}}>{r.datum}</span>
                  <span style={{color:C.tekst,fontWeight:700}}>{r.id_deo}</span>
                  <span style={{color:C.sivi}}>{r.smena}</span>
                  <span style={{color:C.tekst}}>{r.greska_naziv}</span>
                  <span style={{color:C.sivi}}>{r.podkategorija}</span>
                  <span style={{color:r.status==="OK"?C.zelena:C.crvena,fontWeight:700}}>{r.status}</span>
                  <span style={{color:C.zelena}}>{r.ok_kolicina}</span>
                  <span style={{color:C.crvena}}>{r.nok_kolicina}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ SMENA ══ */}
      {tab==="smena"&&(
        <div style={{padding:20,display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}>
          {[["MERENJA",smenaTotal,C.plava],["OK",smenaOK,C.zelena],["NOK",smenaNOK,C.crvena],
            ["RTY %",smenaTotal>0?((smenaOK/(smenaOK+smenaNOK)*100||0).toFixed(1)+"%"):"-",C.zuta],
            ["DPMO",smenaTotal>0?Math.round(((smenaNOK/(smenaOK+smenaNOK))||0)*1e6).toLocaleString():"-",C.ljubicasta],
          ].map(([l,v,b])=>(
            <div key={l} style={{background:C.panel,border:`1px solid ${b}30`,borderRadius:10,
              padding:"18px 22px",minWidth:130,textAlign:"center"}}>
              <div style={{color:b,fontSize:28,fontWeight:700}}>{v}</div>
              <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginTop:5}}>{l}</div>
            </div>
          ))}
          {korisnik.uloga==="admin"&&(
            <button onClick={()=>{setSmenaOK(0);setSmenaNOK(0);setSmenaTotal(0);
              sessionStorage.removeItem("spc_stat");addToast("Statistika smene nulirana.","uspeh");}}
              style={{background:"#3d2c00",border:`1px solid ${C.zuta}40`,borderRadius:8,
                color:C.zuta,fontSize:10,fontWeight:700,padding:"9px 15px",cursor:"pointer",marginTop:4}}>
              ⚠ RESET SMENE
            </button>
          )}
        </div>
      )}

      {tab==="karte" && (ekran.mob
        ? <MobilneKarte sviDelovi={sviDelovi} C={C} addToast={addToast}/>
        : <SPCKarte sviDelovi={sviDelovi} C={C} addToast={addToast}/>)}
      {tab==="dashboard" && (ekran.mob
        ? <MobilniDashboard C={C} addToast={addToast}/>
        : <Dashboard C={C} addToast={addToast}/>)}
      {ekran.mob && (
        <MobilnaNavigacija tab={tab} setTab={setTab}
          listaP={listaP} queue={queue} C={C}/>
      )}
    </div>
  );
}

// ============================================================
// RESPONSIVE PATCH za SPCApp_v3.jsx
// 
// UPUTSTVO ZA INTEGRACIJU:
// 1. Na vrh App.jsx dodaj useEkran hook (ispod importa)
// 2. U GlavnaForma dodaj: const ekran = useEkran();
// 3. Zameni svaki tab sadržaj sa responsive verzijama ispod
// 4. Zameni TABOVI navigaciju sa MobilnaNavigacija na dnu
// ============================================================

// ════════════════════════════════════════════════════════════
// HOOK — detektuje veličinu ekrana
// ════════════════════════════════════════════════════════════
function useEkran() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return { mob: w < 640, tablet: w < 1024, desk: w >= 1024, w };
}

// ════════════════════════════════════════════════════════════
// MOBILNA NAVIGACIJA — bottom tab bar (kao mobilne app)
// ════════════════════════════════════════════════════════════
function MobilnaNavigacija({ tab, setTab, listaP, queue, C }) {
  const TABS = [
    { id:"unos",      ikon:"⌨",  naziv:"Unos"    },
    { id:"karte",     ikon:"📊", naziv:"Karte"   },
    { id:"dashboard", ikon:"📈", naziv:"Dash"    },
    { id:"log",       ikon:"📋", naziv:"Log"     },
    { id:"smena",     ikon:"🕐", naziv:"Smena"   },
  ];
  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:900,
      background:C.panel, borderTop:`1px solid ${C.border}`,
      display:"flex", paddingBottom:"env(safe-area-inset-bottom,0px)",
    }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          flex:1, background:"none", border:"none", cursor:"pointer",
          padding:"10px 4px 8px", display:"flex", flexDirection:"column",
          alignItems:"center", gap:3, position:"relative",
        }}>
          <span style={{ fontSize:20, lineHeight:1 }}>{t.ikon}</span>
          <span style={{
            fontSize:9, fontWeight:tab===t.id?700:400, letterSpacing:0.5,
            color: tab===t.id ? C.plava : C.sivi,
          }}>{t.naziv}</span>
          {tab===t.id && (
            <div style={{position:"absolute",top:0,left:"25%",right:"25%",
              height:2,background:C.plava,borderRadius:1}}/>
          )}
          {t.id==="unos" && listaP.length > 0 && (
            <div style={{position:"absolute",top:6,right:"20%",
              background:C.plava,color:"#fff",fontSize:8,fontWeight:700,
              borderRadius:8,padding:"0 4px",minWidth:14,textAlign:"center",lineHeight:"14px"}}>
              {listaP.length}
            </div>
          )}
          {t.id==="unos" && queue.length > 0 && (
            <div style={{position:"absolute",top:6,left:"20%",
              background:C.zuta,color:"#000",fontSize:8,fontWeight:700,
              borderRadius:8,padding:"0 4px",minWidth:14,textAlign:"center",lineHeight:"14px"}}>
              {queue.length}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MOBILNI UNOS — 3-koračni stepper (najvažniji ekran)
// ════════════════════════════════════════════════════════════
function MobilniUnos({
  idDeo, setIdDeo, deoInfo, upoz,
  status, setStatus,
  kategorija, setKategorija,
  podkat, setPodkat,
  kolicina, setKolicina,
  greskeKat,
  listaG, setListaG,
  listaP, setListaP,
  preostalo, cilj,
  smenaOK, smenaNOK, smenaTotal,
  foto, setFoto, fotoRef,
  dodajGresku, snimiDeo, zapisi,
  noviNalog, saving, online, queue, C,
  idRef,
}) {
  const [korak, setKorak] = useState(1);

  const INP = {
    width:"100%", background:C.input, border:`1px solid ${C.border}`,
    borderRadius:10, color:C.tekst, fontSize:16, padding:"14px",
    boxSizing:"border-box", outline:"none", fontFamily:"inherit",
  };
  const BIG_BTN = (bg, dis=false) => ({
    background:dis?C.hover:bg, border:"none", borderRadius:12,
    color:dis?C.sivi:"#fff", fontSize:16, fontWeight:700,
    padding:"18px", cursor:dis?"not-allowed":"pointer",
    width:"100%", opacity:dis?0.5:1,
  });
  const LBL = { color:C.sivi, fontSize:11, letterSpacing:1.3, marginBottom:8, display:"block" };

  // ─ Korak 1: ID dela ─────────────────────────────────────
  if (korak === 1) return (
    <div style={{padding:"16px 16px 100px", display:"flex", flexDirection:"column",
      gap:16, minHeight:"calc(100dvh - 89px)", background:C.bg}}>

      {/* Progres */}
      <div style={{display:"flex", gap:5}}>
        {[1,2,3].map(k => (
          <div key={k} style={{flex:1, height:4, borderRadius:2,
            background: k<=korak?C.plava:C.hover}}/>
        ))}
      </div>
      <div style={{color:C.sivi, fontSize:11, textAlign:"center", letterSpacing:1}}>
        KORAK 1 / 3 — ID DELA
      </div>

      {/* ID input */}
      <div>
        <label style={LBL}>ID DELA <span style={{color:C.border, fontWeight:400}}>(ili skeniraj)</span></label>
        <input
          ref={idRef}
          value={idDeo}
          onChange={e => setIdDeo(e.target.value.toUpperCase())}
          placeholder="npr. 5501-A"
          autoFocus
          style={{
            ...INP,
            fontSize:28, fontWeight:700, letterSpacing:4, textAlign:"center",
            padding:"22px 14px",
            borderColor: deoInfo?C.zelena:idDeo.length>2?C.crvena:C.border,
            background:  deoInfo?C.ok:idDeo.length>2?C.nok:C.input,
          }}
        />
        {upoz && (
          <div style={{color:C.crvena,fontSize:12,marginTop:8,padding:"10px 12px",
            background:C.nok,borderRadius:8,lineHeight:1.5}}>{upoz}</div>
        )}
      </div>

      {/* Info dela */}
      {deoInfo ? (
        <div style={{background:C.ok, border:`1px solid ${C.zelena}30`, borderRadius:14, padding:16}}>
          <div style={{color:C.zelena, fontWeight:700, fontSize:18, marginBottom:12}}>
            ✓ {deoInfo.naziv_dela}
          </div>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
            {[
              ["Linija",    deoInfo.linija?.linija||"-"],
              ["Mašina",    deoInfo.masina?.naziv||"-"],
              ["LSL",       deoInfo.lsl||"-"],
              ["USL",       deoInfo.usl||"-"],
            ].map(([l,v]) => (
              <div key={l} style={{background:C.panel, borderRadius:8, padding:"10px 12px"}}>
                <div style={{color:C.sivi, fontSize:10, marginBottom:3}}>{l}</div>
                <div style={{color:C.tekst, fontSize:14, fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:12}}>
            <div style={{display:"flex", justifyContent:"space-between",
              fontSize:11, color:C.sivi, marginBottom:5}}>
              <span>Preostalo</span>
              <span style={{color:preostalo===0?C.zelena:C.zuta, fontWeight:700}}>
                {preostalo} / {cilj}
              </span>
            </div>
            <div style={{background:C.hover, borderRadius:4, height:8}}>
              <div style={{
                background:preostalo===0?C.zelena:C.plava,
                width:`${cilj>0?(cilj-preostalo)/cilj*100:0}%`,
                height:8, borderRadius:4, transition:"width 0.4s",
              }}/>
            </div>
          </div>
        </div>
      ) : (
        <div style={{background:C.panel, border:`2px dashed ${C.border}`,
          borderRadius:14, padding:36, textAlign:"center"}}>
          <div style={{fontSize:48, marginBottom:8}}>📷</div>
          <div style={{color:C.sivi, fontSize:13}}>Skeniraj barkod ili unesi ID dela</div>
        </div>
      )}

      {/* Statistike smene — mini */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8}}>
        {[["MER",smenaTotal,C.plava],["OK",smenaOK,C.zelena],["NOK",smenaNOK,C.crvena]].map(([l,v,b])=>(
          <div key={l} style={{background:C.panel,border:`1px solid ${b}20`,
            borderRadius:10,padding:"12px",textAlign:"center"}}>
            <div style={{color:b,fontSize:22,fontWeight:700}}>{v}</div>
            <div style={{color:C.sivi,fontSize:10,marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{flex:1}}/>

      <button onClick={()=>setKorak(2)} disabled={!deoInfo}
        style={{...BIG_BTN(C.plava,!deoInfo), fontSize:18}}>
        Nastavi →
      </button>
      <button onClick={noviNalog}
        style={{background:"none", border:`1px solid ${C.border}`, borderRadius:10,
          color:C.sivi, fontSize:14, padding:"14px", cursor:"pointer", width:"100%"}}>
        ↺ Novi nalog
      </button>
    </div>
  );

  // ─ Korak 2: Unos greške ─────────────────────────────────
  if (korak === 2) return (
    <div style={{padding:"16px 16px 100px", display:"flex", flexDirection:"column",
      gap:14, minHeight:"calc(100dvh - 89px)", background:C.bg}}>

      {/* Progres + navigacija */}
      <div style={{display:"flex", gap:5}}>
        {[1,2,3].map(k=>(<div key={k} style={{flex:1,height:4,borderRadius:2,background:k<=korak?C.plava:C.hover}}/>))}
      </div>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <button onClick={()=>setKorak(1)} style={{background:"none",border:"none",
          color:C.sivi,fontSize:14,cursor:"pointer",padding:0}}>← Nazad</button>
        <span style={{color:C.sivi,fontSize:11,letterSpacing:1}}>KORAK 2 / 3</span>
        <span style={{color:C.zelena,fontWeight:700,fontSize:13}}>{idDeo}</span>
      </div>

      {/* STATUS — ogromna dugmad */}
      <div>
        <label style={LBL}>STATUS</label>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
          {["OK","NOK"].map(s => (
            <button key={s} onClick={()=>{setStatus(s); if(s==="OK"){setKategorija("");setPodkat("");}}}
              style={{
                background: status===s?(s==="OK"?C.zelena:C.crvena):"none",
                border:`2px solid ${status===s?(s==="OK"?C.zelena:C.crvena):C.border}`,
                borderRadius:14, color:status===s?"#fff":C.sivi,
                fontSize:22, fontWeight:700, padding:"22px 0", cursor:"pointer",
                transition:"all 0.2s",
              }}>
              {s==="OK" ? "✓ OK" : "✗ NOK"}
            </button>
          ))}
        </div>
      </div>

      {/* KOLIČINA — +/- stepper */}
      <div>
        <label style={LBL}>KOLIČINA</label>
        <div style={{display:"flex", alignItems:"stretch", border:`1px solid ${C.border}`,
          borderRadius:12, overflow:"hidden", height:60}}>
          <button onClick={()=>setKolicina(k=>Math.max(1,k-1))}
            style={{background:C.panel,border:"none",color:C.tekst,fontSize:28,
              padding:"0 24px",cursor:"pointer",fontWeight:300}}>−</button>
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:32,fontWeight:700,color:C.tekst,background:C.input}}>{kolicina}</div>
          <button onClick={()=>setKolicina(k=>Math.min(50,k+1))}
            style={{background:C.panel,border:"none",color:C.tekst,fontSize:28,
              padding:"0 24px",cursor:"pointer",fontWeight:300}}>+</button>
        </div>
      </div>

      {/* KATEGORIJA — lista dugmadi, samo za NOK */}
      {status==="NOK" && (
        <div>
          <label style={LBL}>KATEGORIJA GREŠKE</label>
          <div style={{display:"flex", flexDirection:"column", gap:6, maxHeight:220, overflowY:"auto"}}>
            {Object.keys(greskeKat).map(k => (
              <button key={k} onClick={()=>{setKategorija(k);setPodkat("");}}
                style={{
                  background:kategorija===k?`${C.crvena}18`:C.panel,
                  border:`1px solid ${kategorija===k?C.crvena:C.border}`,
                  borderRadius:10, color:kategorija===k?C.crvena:C.tekst,
                  fontSize:15, fontWeight:kategorija===k?700:400,
                  padding:"14px 16px", cursor:"pointer", textAlign:"left",
                  transition:"all 0.15s",
                }}>{k}</button>
            ))}
          </div>
        </div>
      )}

      {/* PODKATEGORIJA — chip-ovi */}
      {status==="NOK" && kategorija && (
        <div>
          <label style={LBL}>PODKATEGORIJA</label>
          <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
            {(greskeKat[kategorija]||[]).map(p => (
              <button key={p} onClick={()=>setPodkat(p)}
                style={{
                  background:podkat===p?C.crvena:"none",
                  border:`1px solid ${podkat===p?C.crvena:C.border}`,
                  borderRadius:20, color:podkat===p?"#fff":C.tekst,
                  fontSize:13, padding:"9px 16px", cursor:"pointer",
                  transition:"all 0.15s",
                }}>{p}</button>
            ))}
          </div>
        </div>
      )}

      {/* FOTO — samo za NOK */}
      {status==="NOK" && (
        <div>
          <label style={LBL}>FOTO GREŠKE (opciono)</label>
          {foto ? (
            <div style={{position:"relative"}}>
              <img src={foto} alt="greška"
                style={{width:"100%",borderRadius:10,maxHeight:160,objectFit:"cover"}}/>
              <button onClick={()=>setFoto(null)} style={{
                position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.6)",
                border:"none",borderRadius:6,color:"#fff",fontSize:13,
                padding:"5px 12px",cursor:"pointer"}}>✕</button>
            </div>
          ) : (
            <button onClick={()=>fotoRef.current?.click()}
              style={{...BIG_BTN(C.hover), border:`1px solid ${C.border}`,
                color:C.sivi, fontSize:15}}>
              📷 Fotografiši grešku
            </button>
          )}
          <input ref={fotoRef} type="file" accept="image/*" capture="environment"
            onChange={e=>{const f=e.target.files[0];if(!f)return;
              const r=new FileReader();r.onload=ev=>setFoto(ev.target.result);r.readAsDataURL(f);}}
            style={{display:"none"}}/>
        </div>
      )}

      <div style={{flex:1}}/>

      <button
        onClick={()=>{ dodajGresku(); setKorak(3); }}
        disabled={!status||(status==="NOK"&&(!kategorija||!podkat))}
        style={{...BIG_BTN(
          status==="OK"?C.zelena:status==="NOK"?C.crvena:C.hover,
          !status||(status==="NOK"&&(!kategorija||!podkat))
        ), fontSize:17}}>
        + Dodaj u listu
      </button>
    </div>
  );

  // ─ Korak 3: Lista + snimi ────────────────────────────────
  return (
    <div style={{padding:"16px 16px 100px", display:"flex", flexDirection:"column",
      gap:14, minHeight:"calc(100dvh - 89px)", background:C.bg}}>

      <div style={{display:"flex", gap:5}}>
        {[1,2,3].map(k=>(<div key={k} style={{flex:1,height:4,borderRadius:2,
          background:k<=korak?C.zelena:C.hover}}/>))}
      </div>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <button onClick={()=>setKorak(2)}
          style={{background:"none",border:"none",color:C.sivi,fontSize:14,cursor:"pointer",padding:0}}>
          ← Dodaj još
        </button>
        <span style={{color:C.sivi,fontSize:11,letterSpacing:1}}>KORAK 3 / 3</span>
        <span style={{color:preostalo===0?C.zelena:C.zuta,fontWeight:700,fontSize:13}}>
          {preostalo} preostalo
        </span>
      </div>

      {/* Sumarni KPI */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8}}>
        {[
          ["OK",    listaG.filter(s=>s.status==="OK").reduce((s,d)=>s+d.kolicina,0),  C.zelena],
          ["NOK",   listaG.filter(s=>s.status==="NOK").reduce((s,d)=>s+d.kolicina,0), C.crvena],
          ["STAVKI",listaG.length,                                                      C.plava],
        ].map(([l,v,b]) => (
          <div key={l} style={{background:C.panel,border:`1px solid ${b}25`,
            borderRadius:10,padding:"12px",textAlign:"center"}}>
            <div style={{color:b,fontSize:24,fontWeight:700}}>{v}</div>
            <div style={{color:C.sivi,fontSize:10,marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Lista stavki */}
      <div style={{flex:1, border:`1px solid ${C.border}`, borderRadius:12,
        overflow:"auto", maxHeight:320}}>
        {!listaG.length ? (
          <div style={{padding:28,textAlign:"center",color:C.border,fontSize:13}}>
            Lista je prazna — idi na Korak 2
          </div>
        ) : listaG.map((s,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",padding:"14px 16px",
            borderBottom:`1px solid ${C.border}`,background:s.status==="OK"?C.ok:C.nok}}>
            <div style={{flex:1}}>
              <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:4}}>
                {s.foto && <span style={{fontSize:14}}>📷</span>}
                <span style={{color:s.status==="OK"?C.zelena:C.crvena,
                  fontWeight:700,fontSize:16}}>
                  {s.status} ×{s.kolicina}
                </span>
              </div>
              <div style={{color:C.sivi,fontSize:12}}>{s.kat} › {s.pod}</div>
            </div>
            <button onClick={()=>setListaG(p=>p.filter((_,j)=>j!==i))}
              style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,
                color:C.crvena,fontSize:20,padding:"8px 14px",cursor:"pointer"}}>✕</button>
          </div>
        ))}
      </div>

      {/* Snimi deo */}
      <button onClick={()=>{snimiDeo(); setKorak(1);}} disabled={!listaG.length}
        style={{...BIG_BTN(C.zelena,!listaG.length), fontSize:17,
          boxShadow:listaG.length?`0 0 20px ${C.zelena}40`:"none"}}>
        ✓ Snimi deo
      </button>

      {/* Zapiši u bazu — vidljivo tek kad ima snimljenih */}
      {listaP.length > 0 && (
        <button onClick={zapisi} disabled={saving}
          style={{...BIG_BTN("#7c3aed",saving), fontSize:16,
            boxShadow:`0 0 16px #7c3aed40`}}>
          {saving ? "Snimanje..." : `💾 Zapiši u bazu (${listaP.length})`}
        </button>
      )}

      {/* Offline indikator */}
      {!online && queue.length>0 && (
        <div style={{background:"#3d2c00",border:`1px solid ${C.zuta}40`,
          borderRadius:8,padding:"10px 14px",fontSize:12,color:C.zuta,textAlign:"center"}}>
          📶 Offline — {queue.length} u redu čekanja
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MOBILNI SPC KARTE — vertikalni layout, swipe između karata
// ════════════════════════════════════════════════════════════
function MobilneKarte({ sviDelovi, C, addToast }) {
  const [tip,setTip]         = useState("p");
  const [idDeo,setIdDeo]     = useState("");
  const [loading,setLoading] = useState(false);
  const [pD,setPD] = useState([]); const [cD,setCD]=useState([]); const [uD,setUD]=useState([]);

  const ucitaj = useCallback(async () => {
    if (!idDeo) return; setLoading(true);
    try {
      const {data,error} = await supabase.from("kontrolni_log")
        .select("datum,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv")
        .eq("id_deo",idDeo).order("datum",{ascending:true});
      if (error) throw error;
      if (!data?.length) { setPD([]); setCD([]); setUD([]); return; }

      const gr={};
      data.forEach(r=>{const k=r.datum;if(!gr[k])gr[k]={datum:k,nok:0,n:0,c:0};
        gr[k].nok+=r.nok_kolicina||0;gr[k].n+=r.ukupno_merenja||0;gr[k].c+=r.kom_nok||0;});
      const sg=Object.values(gr).sort((a,b)=>a.datum.localeCompare(b.datum));
      const ukNOK=sg.reduce((s,g)=>s+g.nok,0),ukN=sg.reduce((s,g)=>s+g.n,0);
      const pBar=ukN>0?ukNOK/ukN:0,cBar=sg.length>0?sg.reduce((s,g)=>s+g.c,0)/sg.length:0;
      const uBar=ukN>0?sg.reduce((s,g)=>s+g.c,0)/ukN:0;

      setPD(sg.map(g=>({datum:g.datum,p:g.n>0?g.nok/g.n:0,p_bar:pBar,nok_total:g.nok,n_total:g.n,
        ucl:pBar+3*Math.sqrt(pBar*(1-pBar)/Math.max(g.n,1)),
        lcl:Math.max(0,pBar-3*Math.sqrt(pBar*(1-pBar)/Math.max(g.n,1))),})));
      const cgr={};
      data.forEach(r=>{const k=`${r.datum}|${r.greska_naziv||""}`;
        if(!cgr[k])cgr[k]={datum:r.datum,naziv:r.greska_naziv||"sve",c:0};cgr[k].c+=r.kom_nok||0;});
      setCD(Object.values(cgr).sort((a,b)=>a.datum.localeCompare(b.datum)).map(g=>({
        ...g,c_bar:cBar,ucl:cBar+3*Math.sqrt(Math.max(cBar,0.001)),
        lcl:Math.max(0,cBar-3*Math.sqrt(Math.max(cBar,0.001))),})));
      setUD(sg.map(g=>({datum:g.datum,u:g.n>0?g.c/g.n:0,u_bar:uBar,n:g.n,
        ucl:uBar+3*Math.sqrt(uBar/Math.max(g.n,1)),
        lcl:Math.max(0,uBar-3*Math.sqrt(uBar/Math.max(g.n,1))),})));
    } catch(e) { addToast(e.message,"greska"); }
    finally { setLoading(false); }
  },[idDeo]);

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
  const cd=(akt?.podaci||[]).map((d,i,arr)=>{
    const niz=arr.map(x=>x[akt.dKey]);
    const up=new Set(westernElectric(niz,d[akt.clKey],d.ucl,Math.max(d.lcl||0,0)));
    return{...d,label:d.datum?.substring(5)||"",val:akt.fmt(d[akt.dKey]),
      cl:akt.fmt(d[akt.clKey]),ucl:akt.fmt(d.ucl),lcl:akt.fmt(Math.max(d.lcl||0,0)),
      upoz:up.has(i)};
  });
  const upozoreni=cd.filter(d=>d.upoz);
  const cl=cd[0]?.cl??0,ucl=cd[0]?.ucl??0,lcl=cd[0]?.lcl??0;
  const Dot=(props)=>{const{cx,cy,index}=props;const u=cd[index]?.upoz;
    return<circle key={index} cx={cx} cy={cy} r={u?8:5}
      fill={u?C.crvena:akt?.boja} stroke={u?"#fff":"none"} strokeWidth={u?2:0}/>;};

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

      {/* Tip karte */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {karte.map(k=>(
          <button key={k.id} onClick={()=>setTip(k.id)} style={{
            background:tip===k.id?`${k.boja}20`:"none",
            border:`2px solid ${tip===k.id?k.boja:C.border}`,
            borderRadius:10,color:tip===k.id?k.boja:C.sivi,
            fontSize:15,fontWeight:700,padding:"12px",cursor:"pointer"}}>
            {k.naziv}-karta
          </button>
        ))}
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

// ════════════════════════════════════════════════════════════
// MOBILNI DASHBOARD — kartice pa grafovi vertikalno
// ════════════════════════════════════════════════════════════
function MobilniDashboard({ C, addToast }) {
  const [podaci,setPodaci] = useState(null);
  const [loading,setLoading] = useState(true);
  const [period,setPeriod] = useState("7");

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{
        const od=new Date(); od.setDate(od.getDate()-Number(period));
        const{data,error}=await supabase.from("kontrolni_log")
          .select("datum,status,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,smena")
          .gte("datum",od.toISOString().split("T")[0]);
        if(error)throw error;
        if(!data?.length){setPodaci({});return;}

        const ukN=data.reduce((s,r)=>s+(r.ukupno_merenja||0),0);
        const ukNOK=data.reduce((s,r)=>s+(r.nok_kolicina||0),0);
        const ukOK=data.reduce((s,r)=>s+(r.ok_kolicina||0),0);
        const gB={};
        data.forEach(r=>{if(r.greska_naziv&&r.greska_naziv!=="OK")
          gB[r.greska_naziv]=(gB[r.greska_naziv]||0)+(r.kom_nok||0);});
        const pareto=Object.entries(gB).map(([naziv,count])=>({naziv:naziv.substring(0,12),count}))
          .sort((a,b)=>b.count-a.count).slice(0,6);
        const dani={};
        data.forEach(r=>{if(!dani[r.datum])dani[r.datum]={datum:r.datum,ok:0,nok:0,n:0};
          dani[r.datum].ok+=r.ok_kolicina||0;dani[r.datum].nok+=r.nok_kolicina||0;dani[r.datum].n+=r.ukupno_merenja||0;});
        const trend=Object.values(dani).map(d=>({
          datum:d.datum.substring(5),
          rty:d.n>0?+((d.ok/d.n)*100).toFixed(1):0}));

        setPodaci({ukN,ukNOK,ukOK,
          dpmo:ukN>0?Math.round((ukNOK/ukN)*1e6):0,
          rty:ukN>0?((ukOK/ukN)*100).toFixed(1):"0",
          pareto,trend});
      }catch(e){addToast(e.message,"greska");}
      finally{setLoading(false);}
    })();
  },[period]);

  const BOJE=[C.crvena,C.narandzasta,C.zuta,C.plava,C.ljubicasta,"#e8b4b8"];

  return(
    <div style={{padding:"14px 14px 100px",display:"flex",flexDirection:"column",gap:14}}>
      {/* Period filter */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
        {[["1","Danas"],["7","7 dana"],["30","30d"],["90","90d"]].map(([v,l])=>(
          <button key={v} onClick={()=>setPeriod(v)} style={{
            background:period===v?C.plava:"none",
            border:`1px solid ${period===v?C.plava:C.border}`,
            borderRadius:8,color:period===v?"#fff":C.sivi,
            fontSize:12,padding:"10px 4px",cursor:"pointer",fontWeight:period===v?700:400}}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",
          color:C.sivi,fontSize:13}}>Učitavanje...</div>
      ) : !podaci?.ukN ? (
        <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",
          color:C.border,fontSize:13}}>Nema podataka</div>
      ) : (
        <>
          {/* KPI kartice — 2x2 grid */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {[
              ["MERENO",    podaci.ukN,              C.plava],
              ["RTY %",     podaci.rty+"%",           C.zelena],
              ["NOK",       podaci.ukNOK,             C.crvena],
              ["DPMO",      podaci.dpmo.toLocaleString(), C.ljubicasta],
            ].map(([n,v,b])=>(
              <div key={n} style={{background:C.panel,border:`1px solid ${b}25`,
                borderRadius:12,padding:"16px",textAlign:"center"}}>
                <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:6}}>{n}</div>
                <div style={{color:b,fontSize:28,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>

          {/* RTY trend */}
          <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 6px 8px"}}>
            <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,paddingLeft:10,marginBottom:8}}>
              RTY % TREND
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={podaci.trend} margin={{top:4,right:10,bottom:28,left:2}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.hover} vertical={false}/>
                <XAxis dataKey="datum" tick={{fill:C.sivi,fontSize:8}} tickLine={false}
                  angle={-35} textAnchor="end" height={36}/>
                <YAxis tick={{fill:C.sivi,fontSize:9}} tickLine={false} axisLine={false}
                  domain={[0,100]} tickFormatter={v=>v+"%"} width={32}/>
                <Tooltip contentStyle={{background:C.panel,border:`1px solid ${C.border}`,
                  borderRadius:8,fontSize:12}} labelStyle={{color:C.sivi}}/>
                <ReferenceLine y={95} stroke={C.zelena} strokeDasharray="4 2"
                  label={{value:"95%",fill:C.zelena,fontSize:9,position:"right"}}/>
                <ReferenceLine y={80} stroke={C.zuta} strokeDasharray="4 2"
                  label={{value:"80%",fill:C.zuta,fontSize:9,position:"right"}}/>
                <Line type="monotone" dataKey="rty" stroke={C.zelena} strokeWidth={2.5}
                  dot={{fill:C.zelena,r:4}} name="RTY %"/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Pareto - horizontalni bar (lakši za čitanje na mob) */}
          <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
            <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:12}}>
              TOP GREŠKE (PARETO)
            </div>
            {podaci.pareto.map((p,i)=>{
              const max=podaci.pareto[0]?.count||1;
              return(
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                    <span style={{color:C.tekst}}>{p.naziv}</span>
                    <span style={{color:BOJE[i],fontWeight:700}}>{p.count}</span>
                  </div>
                  <div style={{background:C.hover,borderRadius:4,height:10}}>
                    <div style={{background:BOJE[i],borderRadius:4,height:10,
                      width:`${(p.count/max)*100}%`,transition:"width 0.5s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════

// ─── ROOT ─────────────────────────────────────────────────────

// ============================================================
// VARIJABILNE VELIČINE — placeholder, biće implementirano
// sa upload drugog Excel fajla
// ============================================================
function VarijabilneForma({ korisnik, onOdjava, onNazad, C, setC }) {
  const ekran = useEkran();
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'IBM Plex Mono',monospace",color:C.tekst}}>
      {/* Header */}
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,
        padding:"0 20px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onNazad} style={{background:"none",border:"none",
            color:C.sivi,fontSize:14,cursor:"pointer",padding:0}}>←</button>
          <span style={{color:C.border}}>|</span>
          <span style={{color:C.zelena,fontWeight:700,fontSize:13,letterSpacing:2}}>± VARIJABILNE</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setC(p=>p.naziv==="tamna"?TEME.svetla:TEME.tamna)}
            style={{background:C.hover,border:`1px solid ${C.border}`,borderRadius:5,
              color:C.sivi,fontSize:11,padding:"4px 10px",cursor:"pointer"}}>
            {C.naziv==="tamna"?"☀️":"🌙"}
          </button>
          <span style={{color:C.sivi,fontSize:11}}>{korisnik.ime}</span>
          <button onClick={onOdjava} style={{background:"none",border:`1px solid ${C.border}`,
            borderRadius:5,color:C.sivi,fontSize:10,padding:"3px 10px",cursor:"pointer"}}>Odjava</button>
        </div>
      </div>

      {/* Sadržaj */}
      <div style={{
        display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",minHeight:"calc(100vh - 52px)",
        padding:24,gap:24,textAlign:"center",
      }}>
        <div style={{fontSize:64}}>±</div>
        <div style={{color:C.tekst,fontSize:22,fontWeight:700,letterSpacing:1}}>
          Varijabilne veličine
        </div>
        <div style={{color:C.sivi,fontSize:13,maxWidth:400,lineHeight:1.7}}>
          Modul za merljive veličine je u pripremi.
          Uključivaće X̄/R karte, X̄/S karte, Cp/Cpk/Pp/Ppk indekse,
          histogram normalnosti i Gage R&R analizu.
        </div>
        <div style={{display:"grid",gridTemplateColumns: ekran.mob?"1fr 1fr":"repeat(4,1fr)",
          gap:12,marginTop:8}}>
          {[
            ["X̄/R karte","Srednja vrednost i raspon",C.zelena],
            ["Cp / Cpk","Sposobnost procesa",C.plava],
            ["Histogram","Raspodela merenja",C.narandzasta],
            ["Gage R&R","Merenje sistema",C.ljubicasta],
          ].map(([n,o,b])=>(
            <div key={n} style={{background:C.panel,border:`1px solid ${b}30`,
              borderRadius:10,padding:"16px 12px",textAlign:"center"}}>
              <div style={{color:b,fontSize:16,fontWeight:700,marginBottom:4}}>{n}</div>
              <div style={{color:C.sivi,fontSize:10}}>{o}</div>
            </div>
          ))}
        </div>
        <div style={{background:C.zuta+"20",border:`1px solid ${C.zuta}40`,
          borderRadius:8,padding:"10px 20px",color:C.zuta,fontSize:11}}>
          Uploadujte Excel fajl sa varijabilnim veličinama za aktivaciju
        </div>
        <button onClick={onNazad}
          style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,
            color:C.sivi,fontSize:13,padding:"12px 28px",cursor:"pointer"}}>
          ← Nazad na početni ekran
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [korisnik,setKorisnik] = useState(null);
  const [checking,setChecking] = useState(true);
  const [modul,setModul]       = useState(null); // null=pocetni, "atributivne","varijabilne","admin"
  const [C,setC]               = useState(()=>{
    const saved=localStorage.getItem("spc_tema");
    return saved==="svetla"?TEME.svetla:TEME.tamna;
  });

  useEffect(()=>{localStorage.setItem("spc_tema",C.naziv);},[C]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      if(session){
        supabase.from("radnici").select("ime,uloga,id").eq("user_id",session.user.id).single()
          .then(({data:r})=>{
            setKorisnik({id:session.user.id,email:session.user.email,
              ime:r?.ime||session.user.email.split("@")[0],
              uloga:r?.uloga||"kontrolor",radnikId:r?.id});
          });
      }
      setChecking(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      if(!session){setKorisnik(null);setModul(null);}
    });
    return()=>subscription.unsubscribe();
  },[]);

  const odjava = async () => {
    await supabase.auth.signOut();
    setKorisnik(null);
    setModul(null);
  };

  if(checking)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",color:C.sivi,fontFamily:"monospace",fontSize:12}}>
      Provera sesije...
    </div>
  );

  if(!korisnik) return <Login onLogin={setKorisnik} C={C}/>;

  if(!modul) return (
    <PocetniEkran
      korisnik={korisnik}
      onIzbor={setModul}
      onOdjava={odjava}
      C={C} setC={setC}
    />
  );

  if(modul==="admin") return (
    <AdminPanel
      korisnik={korisnik}
      onNazad={()=>setModul(null)}
      C={C}
    />
  );

  if(modul==="atributivne") return (
    <GlavnaForma
      korisnik={korisnik}
      onOdjava={odjava}
      onNazad={()=>setModul(null)}
      C={C} setC={setC}
    />
  );

  if(modul==="varijabilne") return (
    <VarijabilneForma
      korisnik={korisnik}
      onOdjava={odjava}
      onNazad={()=>setModul(null)}
      C={C} setC={setC}
    />
  );

  return null;
}

// ============================================================
// POČETNI EKRAN — izbor modula nakon logovanja
// ============================================================
function PocetniEkran({ korisnik, onIzbor, onOdjava, C, setC }) {
  const ekran = useEkran();

  const MODULI = [
    {
      id: "atributivne",
      ikon: "✗✓",
      naziv: "Atributivne kontrole",
      opis: "OK/NOK unos · p, C, u, np, nC karte · Pareto · DPMO",
      boja: C.plava,
      dostupan: true,
    },
    {
      id: "varijabilne",
      ikon: "±",
      naziv: "Varijabilne veličine",
      opis: "Merljive vrednosti · X̄/R karte · Cp/Cpk · Histogram",
      boja: C.zelena,
      dostupan: true,
    },
  ];

  return (
    <div style={{
      minHeight:"100vh", background:C.bg,
      fontFamily:"'IBM Plex Mono',monospace", color:C.tekst,
      display:"flex", flexDirection:"column",
    }}>
      {/* Header */}
      <div style={{
        background:C.panel, borderBottom:`1px solid ${C.border}`,
        padding:"0 20px", height:52,
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{color:C.plava, fontWeight:700, fontSize:14, letterSpacing:2}}>⚙ SPC</span>
          <span style={{color:C.border}}>|</span>
          <span style={{color:C.sivi, fontSize:10}}>KONTROLA KVALITETA</span>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <button onClick={()=>setC(p=>p.naziv==="tamna"?TEME.svetla:TEME.tamna)}
            style={{background:C.hover,border:`1px solid ${C.border}`,borderRadius:5,
              color:C.sivi,fontSize:11,padding:"4px 10px",cursor:"pointer"}}>
            {C.naziv==="tamna"?"☀️":"🌙"}
          </button>
          <span style={{
            background:korisnik.uloga==="admin"?"#3d2c00":"#0c2d48",
            color:korisnik.uloga==="admin"?C.zuta:C.plava,
            fontSize:9,padding:"2px 8px",borderRadius:20,letterSpacing:1,
          }}>{korisnik.uloga.toUpperCase()}</span>
          <span style={{color:C.sivi,fontSize:11}}>{korisnik.ime}</span>
          <button onClick={onOdjava} style={{background:"none",border:`1px solid ${C.border}`,
            borderRadius:5,color:C.sivi,fontSize:10,padding:"3px 10px",cursor:"pointer"}}>
            Odjava
          </button>
        </div>
      </div>

      {/* Sadržaj */}
      <div style={{
        flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding: ekran.mob ? "24px 16px" : "40px 24px",
        gap:32,
      }}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize: ekran.mob?32:48, marginBottom:8}}>⚙️</div>
          <div style={{color:C.tekst, fontSize: ekran.mob?20:28, fontWeight:700, letterSpacing:2, marginBottom:6}}>
            SPC KONTROLA
          </div>
          <div style={{color:C.sivi, fontSize:12, letterSpacing:1}}>
            Dobrodošli, {korisnik.ime}
          </div>
        </div>

        {/* Moduli */}
        <div style={{
          display:"grid",
          gridTemplateColumns: ekran.mob ? "1fr" : "1fr 1fr",
          gap:16, width:"100%", maxWidth:640,
        }}>
          {MODULI.map(m => (
            <button key={m.id} onClick={()=>m.dostupan&&onIzbor(m.id)}
              style={{
                background:C.panel,
                border:`2px solid ${m.dostupan?m.boja+"50":C.border}`,
                borderRadius:16,
                padding: ekran.mob?"24px 20px":"32px 28px",
                cursor:m.dostupan?"pointer":"not-allowed",
                textAlign:"left",
                transition:"all 0.2s",
                opacity:m.dostupan?1:0.5,
                position:"relative",
                overflow:"hidden",
              }}
              onMouseEnter={e=>{if(m.dostupan)e.currentTarget.style.borderColor=m.boja;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=m.dostupan?m.boja+"50":C.border;}}
            >
              {/* Pozadinska dekoracija */}
              <div style={{
                position:"absolute", top:-20, right:-20,
                fontSize:80, opacity:0.05, lineHeight:1,
              }}>{m.ikon}</div>

              <div style={{
                color:m.boja, fontSize: ekran.mob?28:36,
                fontWeight:700, marginBottom:12, letterSpacing:-1,
              }}>{m.ikon}</div>

              <div style={{color:C.tekst, fontSize: ekran.mob?15:17,
                fontWeight:700, marginBottom:8, letterSpacing:0.5}}>
                {m.naziv}
              </div>

              <div style={{color:C.sivi, fontSize: ekran.mob?11:12, lineHeight:1.6}}>
                {m.opis}
              </div>

              {!m.dostupan && (
                <div style={{
                  marginTop:12, background:C.zuta+"20",
                  border:`1px solid ${C.zuta}40`,
                  borderRadius:6, padding:"4px 10px",
                  color:C.zuta, fontSize:10, display:"inline-block",
                }}>Uskoro</div>
              )}

              {m.dostupan && (
                <div style={{
                  marginTop:14, color:m.boja,
                  fontSize:12, fontWeight:700, letterSpacing:1,
                }}>Otvori →</div>
              )}
            </button>
          ))}
        </div>

        {/* Admin panel dugme */}
        {korisnik.uloga==="admin" && (
          <button onClick={()=>onIzbor("admin")}
            style={{
              background:"none", border:`1px solid ${C.zuta}40`,
              borderRadius:10, padding:"12px 28px",
              color:C.zuta, fontSize:12, fontWeight:700,
              cursor:"pointer", letterSpacing:1,
            }}>
            🔧 Admin Panel
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ADMIN PANEL
// ============================================================
function AdminPanel({ korisnik, onNazad, C }) {
  const [radnici,setRadnici]   = useState([]);
  const [loading,setLoading]   = useState(true);
  const [modal,setModal]       = useState(null);
  const [novoIme,setNovoIme]   = useState("");
  const [novaUloga,setNovaUloga] = useState("kontrolor");
  const ekran = useEkran();

  useEffect(()=>{
    supabase.from("radnici").select("id,ime,uloga,user_id").order("ime")
      .then(({data})=>{ setRadnici(data||[]); setLoading(false); });
  },[]);

  const resetSmenu = async () => {
    sessionStorage.removeItem("spc_stat");
    sessionStorage.removeItem("spc_smena");
    setModal({poruka:"✓ Statistika smene nulirana za sve korisnike.",tip:"uspeh"});
  };

  const promeniUlogu = async (id, uloga) => {
    await supabase.from("radnici").update({uloga}).eq("id",id);
    setRadnici(p=>p.map(r=>r.id===id?{...r,uloga}:r));
  };

  const dodajRadnika = async () => {
    if (!novoIme.trim()) return;
    const {data,error} = await supabase.from("radnici")
      .insert({ime:novoIme.toUpperCase(),uloga:novaUloga})
      .select().single();
    if (!error) {
      setRadnici(p=>[...p,data]);
      setNovoIme("");
      setModal({poruka:`✓ Radnik ${novoIme.toUpperCase()} dodat.`,tip:"uspeh"});
    }
  };

  const INP = {
    background:C.input, border:`1px solid ${C.border}`, borderRadius:8,
    color:C.tekst, fontSize:13, padding:"10px 12px",
    outline:"none", fontFamily:"inherit",
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'IBM Plex Mono',monospace",color:C.tekst}}>
      {modal&&<Modal poruka={modal.poruka} tip={modal.tip} onOK={()=>setModal(null)} C={C}/>}

      {/* Header */}
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,
        padding:"0 20px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onNazad} style={{background:"none",border:"none",
            color:C.sivi,fontSize:14,cursor:"pointer",padding:0}}>← Nazad</button>
          <span style={{color:C.border}}>|</span>
          <span style={{color:C.zuta,fontWeight:700,fontSize:13,letterSpacing:1}}>🔧 ADMIN PANEL</span>
        </div>
        <span style={{color:C.sivi,fontSize:10}}>{korisnik.ime}</span>
      </div>

      <div style={{padding: ekran.mob?"16px":"24px", display:"flex", flexDirection:"column", gap:20, maxWidth:800, margin:"0 auto"}}>

        {/* Reset smene */}
        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
          <div style={{color:C.tekst,fontSize:13,fontWeight:700,marginBottom:6,letterSpacing:1}}>
            RESET SMENE
          </div>
          <div style={{color:C.sivi,fontSize:11,marginBottom:14,lineHeight:1.6}}>
            Nulira statistiku smene (OK/NOK/Merenja) za sve korisnike.
            Koristiti na početku nove smene.
          </div>
          <button onClick={resetSmenu} style={{
            background:"#3d2c00",border:`1px solid ${C.zuta}40`,borderRadius:8,
            color:C.zuta,fontSize:12,fontWeight:700,padding:"10px 20px",cursor:"pointer",
          }}>⚠ Reset smene</button>
        </div>

        {/* Dodaj radnika */}
        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
          <div style={{color:C.tekst,fontSize:13,fontWeight:700,marginBottom:14,letterSpacing:1}}>
            DODAJ RADNIKA
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <input value={novoIme} onChange={e=>setNovoIme(e.target.value)}
              placeholder="Ime i prezime"
              style={{...INP,flex:1,minWidth:180}}/>
            <select value={novaUloga} onChange={e=>setNovaUloga(e.target.value)}
              style={{...INP,cursor:"pointer"}}>
              <option value="operator">Operator</option>
              <option value="kontrolor">Kontrolor</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={dodajRadnika}
              style={{background:C.zelena,border:"none",borderRadius:8,
                color:"#fff",fontSize:12,fontWeight:700,padding:"10px 20px",cursor:"pointer"}}>
              + Dodaj
            </button>
          </div>
          <div style={{color:C.sivi,fontSize:10,marginTop:8}}>
            Napomena: korisnik mora biti kreiran i u Supabase Auth (Authentication → Users)
          </div>
        </div>

        {/* Lista radnika */}
        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
          <div style={{color:C.tekst,fontSize:13,fontWeight:700,marginBottom:14,letterSpacing:1}}>
            RADNICI ({radnici.length})
          </div>
          {loading ? (
            <div style={{color:C.sivi,fontSize:12}}>Učitavanje...</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {radnici.map(r=>(
                <div key={r.id} style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"10px 14px",background:C.bg,borderRadius:8,
                  border:`1px solid ${C.border}`,flexWrap:"wrap",gap:8,
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <span style={{color:C.tekst,fontSize:13,fontWeight:700}}>{r.ime}</span>
                    <span style={{
                      background:r.uloga==="admin"?"#3d2c00":r.uloga==="kontrolor"?"#0c2d48":"#0c2010",
                      color:r.uloga==="admin"?C.zuta:r.uloga==="kontrolor"?C.plava:C.zelena,
                      fontSize:9,padding:"2px 8px",borderRadius:20,letterSpacing:1,
                    }}>{r.uloga.toUpperCase()}</span>
                    {!r.user_id&&<span style={{color:C.crvena,fontSize:9}}>⚠ Nije u Auth</span>}
                  </div>
                  <select value={r.uloga} onChange={e=>promeniUlogu(r.id,e.target.value)}
                    style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:6,
                      color:C.tekst,fontSize:11,padding:"4px 8px",cursor:"pointer",fontFamily:"inherit"}}>
                    <option value="operator">Operator</option>
                    <option value="kontrolor">Kontrolor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statistike sistema */}
        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
          <div style={{color:C.tekst,fontSize:13,fontWeight:700,marginBottom:14,letterSpacing:1}}>
            STATISTIKE SISTEMA
          </div>
          <AdminStatistike C={C}/>
        </div>
      </div>
    </div>
  );
}

function AdminStatistike({C}) {
  const [stat,setStat] = useState(null);
  useEffect(()=>{
    Promise.all([
      supabase.from("kontrolni_log").select("id",{count:"exact",head:true}),
      supabase.from("delovi").select("id",{count:"exact",head:true}),
      supabase.from("radnici").select("id",{count:"exact",head:true}),
      supabase.from("kontrolni_log").select("id",{count:"exact",head:true})
        .gte("datum",new Date().toISOString().split("T")[0]),
    ]).then(([log,del,rad,danas])=>{
      setStat({
        ukupnoUnosa: log.count||0,
        ukupnoDelova: del.count||0,
        ukupnoRadnika: rad.count||0,
        unosaDanas: danas.count||0,
      });
    });
  },[]);

  if(!stat) return <div style={{color:C.sivi,fontSize:12}}>Učitavanje...</div>;

  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
      {[
        ["UNOSA DANAS",  stat.unosaDanas,  C.zelena],
        ["UK. UNOSA",    stat.ukupnoUnosa, C.plava],
        ["DELOVA",       stat.ukupnoDelova,C.narandzasta],
        ["RADNIKA",      stat.ukupnoRadnika,C.ljubicasta],
      ].map(([n,v,b])=>(
        <div key={n} style={{background:C.bg,border:`1px solid ${b}25`,
          borderRadius:10,padding:"14px",textAlign:"center"}}>
          <div style={{color:b,fontSize:24,fontWeight:700}}>{v}</div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.2,marginTop:4}}>{n}</div>
        </div>
      ))}
    </div>
  );
}
