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
          ["heatmap",    "Heat mapa",   "#f472b6"],
          ["sigma",      "Sigma nivo",  "#a3e635"],
          ["korelacija", "Korelacija",  "#22d3ee"],
          ["poredi",     "Poređenje",   "#a78bfa"],
          ["foto_spc",   "Foto arhiva", "#fb923c"],
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

              {/* Trend upozorenje */}
              <TrendUpozorenje podaci={cd} C={C}/>

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
          {tip==="korelacija"&&(
            <KorelacijaGreskaMasina rawData={rawData} C={C}/>
          )}

          {tip==="poredi"&&(
            <PoredjenjePerioda idDeo={idDeo} C={C} addToast={addToast}/>
          )}
          {tip==="foto_spc"&&(
            <FotoArhiva C={C} addToast={addToast}/>
          )}
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
          {/* Prioritizacija delova */}
          <PrioritizacijaDelova C={C} addToast={addToast}/>
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
  const [pokaziZahtev,setPokaziZahtev] = useState(false);
  const [komentar,setKomentar]     = useState("");
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
      status,kolicina,foto:status==="NOK"?foto:null,komentar:komentar||""}]);
    setStatus("");setKategorija("");setPodkat("");setKolicina(1);setFoto(null);setKomentar("");
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
    if(nok>0) window._vibrirajNOK?.();
    else window._vibrirajOK?.();
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
      nok_kolicina:j?0:s.kolicina,ukupno_merenja:s.kolicina,potreban_broj:cilj,
      komentar:s.komentar||null,};});
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

  const TABOVI=[["unos","UNOS"],["crtez","CRTEŽ"],["log","LOG"],["smena","SMENA"],["karte","SPC KARTE"],["dashboard","DASHBOARD"],["eskalacije","ESKALACIJE"],["8d","8D"],["aql","AQL"],["foto","FOTO"]];

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
      {pokaziZahtev&&<ZahtevPrekid
        korisnik={korisnik} idDeo={idDeo} nazivDela={deoInfo?.naziv_dela||""}
        preostalo={preostalo} cilj={cilj}
        onUspeh={()=>{setPokaziZahtev(false);addToast("✓ Zahtev poslat adminu — čeka odobrenje","uspeh");}}
        onOtkazati={()=>setPokaziZahtev(false)} C={C}
      />}

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

            <div>
              <label style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4,display:"block"}}>
                KOMENTAR (opciono)
              </label>
              <input value={komentar} onChange={e=>setKomentar(e.target.value)}
                placeholder="Npr: alat istrošen..."
                style={{...INP, fontSize:12}}/>
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
                  {s.komentar&&<div style={{color:C.zuta,fontSize:9,marginTop:2}}>💬 {s.komentar}</div>}
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
          <button onClick={()=>generisiIzvestajSmene(korisnik,smena,C)}
            style={{background:"#7c3aed",border:"none",borderRadius:8,
              color:"#fff",fontSize:10,fontWeight:700,padding:"9px 15px",cursor:"pointer",marginTop:4}}>
            📄 Izveštaj smene PDF
          </button>

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
      {tab==="eskalacije" && <EskalacijePanel korisnik={korisnik} C={C}
        addToast={addToast} sviDelovi={sviDelovi}/>}
      {tab==="8d" && <OsmDIzvestaj korisnik={korisnik} C={C}
        addToast={addToast} sviDelovi={sviDelovi}/>}
      {tab==="aql" && <AQLTabela C={C}/>}
      {tab==="foto" && <FotoArhiva C={C} addToast={addToast}/>}
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
    { id:"eskalacije",ikon:"🚨", naziv:"Eskl."   },
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

  useEffect(()=>{ registrujPWA(); },[]);

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

  // Kontrolna lista pre atributivnog unosa
  const [listaOk,setListaOk] = useState(()=>!!sessionStorage.getItem("spc_lista_ok"));
  if(modul==="atributivne"&&!listaOk) return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'IBM Plex Mono',monospace"}}>
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,
        height:52,display:"flex",alignItems:"center",padding:"0 20px",gap:12}}>
        <button onClick={()=>setModul(null)} style={{background:"none",border:"none",
          color:C.sivi,fontSize:14,cursor:"pointer"}}>←</button>
        <span style={{color:C.plava,fontWeight:700,fontSize:13,letterSpacing:2}}>⚙ SPC</span>
      </div>
      <KontrolnaLista korisnik={korisnik}
        smena={Number(sessionStorage.getItem("spc_smena")||1)}
        onZavrsena={()=>{sessionStorage.setItem("spc_lista_ok","1");setListaOk(true);}}
        C={C}/>
    </div>
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

        {/* Zahtevi za prekid */}
        <AdminPrekidiPanel korisnik={korisnik} C={C} addToast={(t,tip)=>{
          // mini toast u admin panelu
          alert(t);
        }}/>

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

// ============================================================
// v8 DODACI — sve nove funkcionalnosti
// ============================================================

// ─── HOOK: Offline cache za karte ────────────────────────────
function useOfflineCache(key, ttlMin=30) {
  const get = () => {
    try {
      const raw = localStorage.getItem(`spc_cache_${key}`);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > ttlMin * 60000) return null;
      return data;
    } catch { return null; }
  };
  const set = (data) => {
    try { localStorage.setItem(`spc_cache_${key}`, JSON.stringify({ data, ts: Date.now() })); }
    catch {}
  };
  const clear = () => localStorage.removeItem(`spc_cache_${key}`);
  return { get, set, clear };
}

// ─── ZAHTEV ZA PREKID ────────────────────────────────────────
function ZahtevPrekid({ korisnik, idDeo, nazivDela, preostalo, cilj, onUspeh, onOtkazati, C }) {
  const [razlog, setRazlog] = useState("");
  const [loading, setLoading] = useState(false);

  const posalji = async () => {
    if (!razlog.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("prekidi_zahtevi").insert({
        operater_id: korisnik.radnikId,
        id_deo:      idDeo,
        naziv_dela:  nazivDela,
        preostalo,
        cilj,
        razlog:      razlog.trim(),
        status:      "ceka",
      });
      if (error) throw error;
      onUspeh();
    } catch(e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}}>
      <div style={{background:C.panel,border:`1px solid ${C.zuta}`,borderRadius:12,
        padding:"28px 32px",maxWidth:420,width:"90%"}}>
        <div style={{color:C.zuta,fontSize:20,marginBottom:10}}>⚠</div>
        <div style={{color:C.tekst,fontSize:15,fontWeight:700,marginBottom:6}}>
          Zahtev za prekid merenja
        </div>
        <div style={{color:C.sivi,fontSize:12,marginBottom:16,lineHeight:1.6}}>
          Deo: <strong style={{color:C.tekst}}>{idDeo} — {nazivDela}</strong><br/>
          Preostalo: <strong style={{color:C.crvena}}>{preostalo} / {cilj}</strong>
        </div>
        <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:6}}>RAZLOG PREKIDA</div>
        <textarea value={razlog} onChange={e=>setRazlog(e.target.value)}
          placeholder="Npr: alat istrošen, materijal loš, vanredna situacija..."
          rows={3}
          style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:8,
            color:C.tekst,fontSize:13,padding:"10px 12px",boxSizing:"border-box",
            outline:"none",fontFamily:"inherit",resize:"none"}}/>
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={posalji} disabled={!razlog.trim()||loading}
            style={{flex:1,background:razlog.trim()&&!loading?C.zuta:C.hover,border:"none",
              borderRadius:8,color:razlog.trim()?"#000":"#666",fontSize:13,fontWeight:700,
              padding:"12px",cursor:razlog.trim()?"pointer":"not-allowed"}}>
            {loading?"Šalje se...":"📤 Pošalji zahtev adminu"}
          </button>
          <button onClick={onOtkazati}
            style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,
              color:C.sivi,fontSize:13,padding:"12px 16px",cursor:"pointer"}}>
            Otkaži
          </button>
        </div>
        <div style={{color:C.sivi,fontSize:10,marginTop:10,textAlign:"center"}}>
          Admin će dobiti notifikaciju i odobriti ili odbiti zahtev
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN: Panel za odobrenje prekida ───────────────────────
function AdminPrekidiPanel({ korisnik, C, addToast }) {
  const [zahtevi, setZahtevi] = useState([]);
  const [loading, setLoading] = useState(true);

  const ucitaj = async () => {
    const { data } = await supabase.from("prekidi_zahtevi")
      .select("*,operater:radnici!prekidi_zahtevi_operater_id_fkey(ime)")
      .eq("status","ceka")
      .order("created_at",{ascending:false});
    setZahtevi(data||[]);
    setLoading(false);
  };

  useEffect(()=>{ ucitaj(); },[]);

  // Real-time — novi zahtevi
  useEffect(()=>{
    const ch = supabase.channel("prekidi_admin")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"prekidi_zahtevi"},
        payload => {
          addToast(`📤 Novi zahtev: ${payload.new.id_deo} — ${payload.new.razlog?.substring(0,30)}...`,"greska");
          ucitaj();
        });
    ch.subscribe();
    return () => supabase.removeChannel(ch);
  },[]);

  const odluci = async (id, odluka, napomena="") => {
    await supabase.from("prekidi_zahtevi").update({
      status:   odluka,
      admin_id: korisnik.radnikId,
      napomena,
      updated_at: new Date().toISOString(),
    }).eq("id",id);
    addToast(odluka==="odobreno"?"✓ Prekid odobren":"✗ Zahtev odbijen",
      odluka==="odobreno"?"uspeh":"greska");
    ucitaj();
  };

  return (
    <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{color:C.tekst,fontSize:13,fontWeight:700,letterSpacing:1}}>
          ZAHTEVI ZA PREKID
          {zahtevi.length>0&&<span style={{background:C.crvena,color:"#fff",fontSize:10,
            borderRadius:10,padding:"1px 7px",marginLeft:8}}>{zahtevi.length}</span>}
        </div>
        <button onClick={ucitaj} style={{background:"none",border:`1px solid ${C.border}`,
          borderRadius:5,color:C.sivi,fontSize:10,padding:"4px 10px",cursor:"pointer"}}>
          ↻ Osveži
        </button>
      </div>
      {loading?<div style={{color:C.sivi,fontSize:12}}>Učitavanje...</div>
       :zahtevi.length===0?(
        <div style={{color:C.border,fontSize:12,textAlign:"center",padding:"20px 0"}}>
          Nema aktivnih zahteva ✓
        </div>
      ):zahtevi.map(z=>(
        <div key={z.id} style={{background:C.bg,border:`1px solid ${C.zuta}40`,
          borderRadius:10,padding:14,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <div>
              <span style={{color:C.tekst,fontWeight:700,fontSize:13}}>{z.id_deo}</span>
              <span style={{color:C.sivi,fontSize:11,marginLeft:8}}>{z.naziv_dela}</span>
            </div>
            <span style={{color:C.sivi,fontSize:10}}>
              {new Date(z.created_at).toLocaleTimeString("sr-RS",{hour:"2-digit",minute:"2-digit"})}
            </span>
          </div>
          <div style={{color:C.sivi,fontSize:11,marginBottom:4}}>
            Operater: <strong style={{color:C.tekst}}>{z.operater?.ime||"?"}</strong>
            {" · "}Preostalo: <strong style={{color:C.crvena}}>{z.preostalo}/{z.cilj}</strong>
          </div>
          <div style={{color:C.zuta,fontSize:12,marginBottom:12,
            background:C.zuta+"15",padding:"6px 10px",borderRadius:6}}>
            "{z.razlog}"
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>odluci(z.id,"odobreno")}
              style={{flex:1,background:C.zelena,border:"none",borderRadius:8,
                color:"#fff",fontSize:12,fontWeight:700,padding:"9px",cursor:"pointer"}}>
              ✓ Odobri prekid
            </button>
            <button onClick={()=>odluci(z.id,"odbijeno","Nastavi merenje")}
              style={{flex:1,background:C.crvena,border:"none",borderRadius:8,
                color:"#fff",fontSize:12,fontWeight:700,padding:"9px",cursor:"pointer"}}>
              ✗ Odbij
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── POREĐENJE PERIODA ────────────────────────────────────────
function PoredjenjePerioda({ idDeo, C, addToast }) {
  const [podaci, setPodaci] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod]   = useState("7");

  const ucitaj = useCallback(async () => {
    if (!idDeo) return;
    setLoading(true);
    try {
      const danas = new Date();
      const od1 = new Date(danas); od1.setDate(od1.getDate()-Number(period));
      const od2 = new Date(od1);   od2.setDate(od2.getDate()-Number(period));

      const fmt = d => d.toISOString().split("T")[0];

      const [r1, r2] = await Promise.all([
        supabase.from("kontrolni_log").select("ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok")
          .eq("id_deo",idDeo).gte("datum",fmt(od1)).lte("datum",fmt(danas)),
        supabase.from("kontrolni_log").select("ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok")
          .eq("id_deo",idDeo).gte("datum",fmt(od2)).lt("datum",fmt(od1)),
      ]);

      const calc = (rows) => {
        const n   = rows.reduce((s,r)=>s+(r.ukupno_merenja||0),0);
        const nok = rows.reduce((s,r)=>s+(r.nok_kolicina||0),0);
        const ok  = rows.reduce((s,r)=>s+(r.ok_kolicina||0),0);
        return {
          n, nok, ok,
          rty:  n>0?((ok/n)*100).toFixed(2):0,
          p:    n>0?((nok/n)*100).toFixed(3):0,
          dpmo: n>0?Math.round((nok/n)*1e6):0,
        };
      };

      setPodaci({ tek: calc(r1.data||[]), prev: calc(r2.data||[]),
        label1: `Poslednjih ${period} dana`, label2: `Prethodnih ${period} dana` });
    } catch(e) { addToast(e.message,"greska"); }
    finally { setLoading(false); }
  },[idDeo, period]);

  useEffect(()=>{ ucitaj(); },[ucitaj]);

  const arrow = (tek, prev, veci_je_losi=true) => {
    if (!prev || prev==0) return "";
    const diff = tek - prev;
    if (Math.abs(diff) < 0.01) return <span style={{color:"#888"}}> =</span>;
    const gore = diff > 0;
    const losi = veci_je_losi ? gore : !gore;
    return <span style={{color:losi?C.crvena:C.zelena,fontSize:12}}>
      {" "}{gore?"↑":"↓"} {Math.abs(diff).toFixed(1)}
    </span>;
  };

  if (!idDeo) return null;

  return (
    <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,padding:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2}}>POREĐENJE PERIODA</div>
        <select value={period} onChange={e=>setPeriod(e.target.value)}
          style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:6,
            color:C.tekst,fontSize:11,padding:"4px 8px",cursor:"pointer",fontFamily:"inherit"}}>
          <option value="7">7 dana</option>
          <option value="14">14 dana</option>
          <option value="30">30 dana</option>
        </select>
      </div>
      {loading ? <div style={{color:C.sivi,fontSize:12,textAlign:"center",padding:16}}>Učitavanje...</div>
       : !podaci ? null : (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[
            ["RTY %", podaci.tek.rty, podaci.prev.rty, false, "%"],
            ["NOK",   podaci.tek.nok, podaci.prev.nok, true,  ""],
            ["DPMO",  podaci.tek.dpmo,podaci.prev.dpmo,true,  ""],
            ["Mereno",podaci.tek.n,   podaci.prev.n,   false, ""],
          ].map(([naziv,tek,prev,veciLosi,suf])=>(
            <div key={naziv} style={{background:C.bg,borderRadius:8,padding:"10px 12px"}}>
              <div style={{color:C.sivi,fontSize:9,letterSpacing:1,marginBottom:4}}>{naziv}</div>
              <div style={{fontSize:18,fontWeight:700,color:C.tekst}}>
                {tek}{suf} {arrow(Number(tek),Number(prev),veciLosi)}
              </div>
              <div style={{color:C.border,fontSize:10,marginTop:2}}>
                prev: {prev}{suf}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TREND UPOZORENJE ─────────────────────────────────────────
function TrendUpozorenje({ podaci, C }) {
  // Detektuje negativan trend pre nego što se probije UCL
  if (!podaci?.length || podaci.length < 5) return null;

  const posl5 = podaci.slice(-5).map(d=>d.val||d.p||0);
  const rastuci = posl5.every((v,i) => i===0||v>=posl5[i-1]);
  const prosek5 = posl5.reduce((s,v)=>s+v,0)/5;
  const prosekSvi = podaci.reduce((s,d)=>s+(d.val||d.p||0),0)/podaci.length;
  const porast = prosek5 > prosekSvi * 1.15;

  if (!rastuci && !porast) return null;

  return (
    <div style={{background:C.zuta+"18",border:`1px solid ${C.zuta}50`,
      borderRadius:8,padding:"10px 14px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
      <span style={{fontSize:18}}>📈</span>
      <div>
        <div style={{color:C.zuta,fontSize:12,fontWeight:700,marginBottom:2}}>
          TREND UPOZORENJE — proces se pogoršava
        </div>
        <div style={{color:C.sivi,fontSize:11}}>
          {rastuci&&"Poslednjih 5 tačaka uzastopno raste. "}
          {porast&&`Prosek posled. 5 dana (${prosek5.toFixed(2)}) je >15% iznad ukupnog proseka (${prosekSvi.toFixed(2)}).`}
          {" Preduzeti korektivnu akciju pre nego što se probije UCL."}
        </div>
      </div>
    </div>
  );
}

// ─── KORELACIJA GREŠKA-MAŠINA ────────────────────────────────
function KorelacijaGreskaMasina({ rawData, C }) {
  if (!rawData?.length) return (
    <div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>Nema podataka</div>
  );

  // Pivot: greška x mašina
  const masine  = [...new Set(rawData.map(r=>r.masine?.naziv||"?"))].filter(Boolean);
  const greske  = [...new Set(rawData.filter(r=>r.greska_naziv&&r.greska_naziv!=="OK")
    .map(r=>r.greska_naziv))].slice(0,8);
  
  const pivot = {};
  greske.forEach(g=>{ pivot[g]={}; masine.forEach(m=>{ pivot[g][m]=0; }); });
  rawData.forEach(r=>{
    if(r.greska_naziv&&r.greska_naziv!=="OK"&&pivot[r.greska_naziv]){
      const m=r.masine?.naziv||"?";
      pivot[r.greska_naziv][m]=(pivot[r.greska_naziv][m]||0)+(r.kom_nok||0);
    }
  });

  const maxVal = Math.max(...greske.flatMap(g=>masine.map(m=>pivot[g]?.[m]||0)));

  const getCellBg = (v) => {
    if (v===0) return C.hover;
    const i = v/Math.max(maxVal,1);
    if (i<0.25) return C.zelena+"50";
    if (i<0.5)  return C.zuta+"70";
    if (i<0.75) return C.narandzasta+"80";
    return C.crvena+"90";
  };

  return (
    <div>
      <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
        KORELACIJA GREŠKA × MAŠINA
      </div>
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"collapse",width:"100%",fontSize:11}}>
          <thead>
            <tr>
              <th style={{color:C.sivi,padding:"8px 12px",textAlign:"left",
                borderBottom:`1px solid ${C.border}`,fontWeight:400}}>Greška</th>
              {masine.map(m=>(
                <th key={m} style={{color:C.sivi,padding:"8px 10px",fontWeight:400,
                  borderBottom:`1px solid ${C.border}`,textAlign:"center",minWidth:70}}>{m}</th>
              ))}
              <th style={{color:C.sivi,padding:"8px 10px",fontWeight:400,
                borderBottom:`1px solid ${C.border}`,textAlign:"center"}}>Ukupno</th>
            </tr>
          </thead>
          <tbody>
            {greske.map(g=>{
              const uk=masine.reduce((s,m)=>s+(pivot[g]?.[m]||0),0);
              return(
                <tr key={g}>
                  <td style={{color:C.tekst,padding:"8px 12px",
                    borderBottom:`1px solid ${C.border}`,fontWeight:500}}>{g}</td>
                  {masine.map(m=>{
                    const v=pivot[g]?.[m]||0;
                    return(
                      <td key={m} style={{padding:"6px 10px",textAlign:"center",
                        background:getCellBg(v),borderBottom:`1px solid ${C.border}`,
                        color:v>0?C.tekst:C.border,fontWeight:v>0?700:400,
                        border:`1px solid ${C.bg}`}}>
                        {v>0?v:"—"}
                      </td>
                    );
                  })}
                  <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,
                    color:C.tekst,borderBottom:`1px solid ${C.border}`}}>{uk}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{color:C.sivi,fontSize:10,marginTop:8}}>
        Tamnije = više grešaka. Identifikuje koji mašina pravi koje greške.
      </div>
    </div>
  );
}

// ─── PRIORITIZACIJA DELOVA ───────────────────────────────────
function PrioritizacijaDelova({ C, addToast }) {
  const [podaci, setPodaci] = useState([]);
  const [loading, setLoading] = useState(true);
  const cache = useOfflineCache("prioritizacija", 15);

  useEffect(()=>{
    const cached = cache.get();
    if (cached) { setPodaci(cached); setLoading(false); return; }

    (async()=>{
      try {
        const od = new Date(); od.setDate(od.getDate()-7);
        const { data } = await supabase.from("kontrolni_log")
          .select("id_deo,naziv_dela,ok_kolicina,nok_kolicina,ukupno_merenja,datum")
          .gte("datum", od.toISOString().split("T")[0]);

        const mapa = {};
        (data||[]).forEach(r=>{
          if(!mapa[r.id_deo]) mapa[r.id_deo]={id_deo:r.id_deo,naziv:r.naziv_dela,
            ok:0,nok:0,n:0,dani:new Set()};
          mapa[r.id_deo].ok  +=r.ok_kolicina||0;
          mapa[r.id_deo].nok +=r.nok_kolicina||0;
          mapa[r.id_deo].n   +=r.ukupno_merenja||0;
          mapa[r.id_deo].dani.add(r.datum);
        });

        const arr = Object.values(mapa).map(d=>{
          const rty = d.n>0?(d.ok/d.n)*100:100;
          const p   = d.n>0?(d.nok/d.n)*100:0;
          const dpmo= d.n>0?Math.round((d.nok/d.n)*1e6):0;
          // Skor prioriteta: viši = hitnije (0-100)
          const skor = Math.min(100, p*5 + (dpmo/10000)*2 + (rty<80?30:rty<90?15:0));
          return { ...d, rty:rty.toFixed(1), p:p.toFixed(2), dpmo, skor:Math.round(skor),
            dani_aktivni: d.dani.size };
        }).sort((a,b)=>b.skor-a.skor);

        cache.set(arr);
        setPodaci(arr);
      } catch(e) { addToast(e.message,"greska"); }
      finally { setLoading(false); }
    })();
  },[]);

  const getHitnost = (skor) => {
    if (skor>=70) return ["KRITIČNO",  C.crvena];
    if (skor>=40) return ["VISOKO",    C.narandzasta];
    if (skor>=20) return ["SREDNJE",   C.zuta];
    return             ["NISKO",      C.zelena];
  };

  return (
    <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
      <div style={{color:C.tekst,fontSize:13,fontWeight:700,marginBottom:4,letterSpacing:1}}>
        PRIORITIZACIJA — koji deo zahteva pažnju
      </div>
      <div style={{color:C.sivi,fontSize:10,marginBottom:14}}>
        Bazirano na poslednjih 7 dana · kešira se 15 min
      </div>
      {loading ? <div style={{color:C.sivi,fontSize:12}}>Učitavanje...</div>
       : !podaci.length ? <div style={{color:C.border,fontSize:12}}>Nema podataka za 7 dana</div>
       : podaci.map((d,i)=>{
        const [label,boja] = getHitnost(d.skor);
        return(
          <div key={d.id_deo} style={{display:"flex",alignItems:"center",gap:12,
            padding:"10px 0",borderBottom:i<podaci.length-1?`1px solid ${C.border}`:"none"}}>
            <div style={{width:36,height:36,borderRadius:8,background:`${boja}20`,
              border:`1px solid ${boja}50`,display:"flex",alignItems:"center",
              justifyContent:"center",fontSize:13,fontWeight:700,color:boja,flexShrink:0}}>
              {d.skor}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                <span style={{color:C.tekst,fontWeight:700,fontSize:12}}>{d.id_deo}</span>
                <span style={{color:C.sivi,fontSize:11,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.naziv}</span>
                <span style={{background:`${boja}20`,color:boja,fontSize:9,fontWeight:700,
                  padding:"1px 7px",borderRadius:10,letterSpacing:0.5,flexShrink:0}}>
                  {label}
                </span>
              </div>
              <div style={{display:"flex",gap:12,fontSize:10}}>
                <span style={{color:C.sivi}}>RTY: <strong style={{color:
                  d.rty>=95?C.zelena:d.rty>=80?C.zuta:C.crvena}}>{d.rty}%</strong></span>
                <span style={{color:C.sivi}}>p: <strong style={{color:C.tekst}}>{d.p}%</strong></span>
                <span style={{color:C.sivi}}>DPMO: <strong style={{color:C.tekst}}>
                  {d.dpmo.toLocaleString()}</strong></span>
                <span style={{color:C.border}}>{d.dani_aktivni} dana aktivno</span>
              </div>
              <div style={{background:C.hover,borderRadius:2,height:3,marginTop:5}}>
                <div style={{background:boja,width:`${d.skor}%`,height:3,
                  borderRadius:2,transition:"width 0.5s"}}/>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── IZVEŠTAJ SMENE PDF ───────────────────────────────────────
async function generisiIzvestajSmene(korisnik, smena, C) {
  const danas = new Date().toISOString().split("T")[0];
  
  // Učitaj podatke smene
  const { data } = await supabase.from("kontrolni_log")
    .select("*").eq("datum",danas).eq("smena",smena)
    .order("created_at",{ascending:true});

  if (!data?.length) { alert("Nema podataka za ovu smenu danas."); return; }

  const n   = data.reduce((s,r)=>s+(r.ukupno_merenja||0),0);
  const nok = data.reduce((s,r)=>s+(r.nok_kolicina||0),0);
  const ok  = data.reduce((s,r)=>s+(r.ok_kolicina||0),0);
  const rty = n>0?((ok/n)*100).toFixed(2):0;
  const dpmo= n>0?Math.round((nok/n)*1e6):0;

  // Pareto
  const gB={};
  data.forEach(r=>{if(r.greska_naziv&&r.greska_naziv!=="OK")
    gB[r.greska_naziv]=(gB[r.greska_naziv]||0)+(r.nok_kolicina||0);});
  const topGreske=Object.entries(gB).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  const W = pdf.internal.pageSize.getWidth();

  // Header
  pdf.setFillColor(28,35,51);
  pdf.rect(0,0,W,40,`F`);
  pdf.setTextColor(88,166,255);
  pdf.setFontSize(18); pdf.setFont("helvetica","bold");
  pdf.text("SPC KONTROLA KVALITETA", 14,15);
  pdf.setTextColor(200,210,230);
  pdf.setFontSize(11); pdf.setFont("helvetica","normal");
  pdf.text(`IZVEŠTAJ SMENE ${smena} · ${danas}`, 14,25);
  pdf.text(`Generisao: ${korisnik.ime}`, 14,33);

  // KPI
  pdf.setTextColor(30,32,36);
  let y=55;
  pdf.setFontSize(13); pdf.setFont("helvetica","bold");
  pdf.text("STATISTIKE SMENE",14,y); y+=8;

  const kpi=[
    ["Ukupno mereno",n,""],
    ["OK komada",ok,""],
    ["NOK komada",nok,""],
    ["RTY %",rty,"%"],
    ["DPMO",dpmo.toLocaleString(),""],
  ];

  kpi.forEach(([naziv,vrednost,suf],i)=>{
    const x = 14 + (i%3)*62;
    const yy = y + Math.floor(i/3)*22;
    pdf.setFillColor(240,244,248);
    pdf.rect(x,yy,58,18,`F`);
    pdf.setFontSize(8); pdf.setFont("helvetica","normal");
    pdf.setTextColor(100,110,120);
    pdf.text(naziv,x+4,yy+7);
    pdf.setFontSize(14); pdf.setFont("helvetica","bold");
    pdf.setTextColor(30,32,36);
    pdf.text(`${vrednost}${suf}`,x+4,yy+15);
  });
  y+=50;

  // Top greške
  if (topGreske.length) {
    pdf.setFontSize(13); pdf.setFont("helvetica","bold");
    pdf.setTextColor(30,32,36);
    pdf.text("TOP GREŠKE",14,y); y+=8;
    topGreske.forEach(([naziv,count],i)=>{
      pdf.setFontSize(10); pdf.setFont("helvetica","normal");
      pdf.setTextColor(60,70,80);
      pdf.text(`${i+1}. ${naziv}`,14,y);
      pdf.text(`${count} kom`,150,y);
      const maxW = 80;
      const bar = Math.min((count/topGreske[0][1])*maxW, maxW);
      pdf.setFillColor(88,166,255);
      pdf.rect(80,y-4,bar,5,`F`);
      y+=8;
    });
  }

  // Tabela unosa
  y+=5;
  pdf.setFontSize(13); pdf.setFont("helvetica","bold");
  pdf.setTextColor(30,32,36);
  pdf.text("UNOSI SMENE",14,y); y+=8;

  pdf.setFontSize(8); pdf.setFont("helvetica","bold");
  pdf.setTextColor(100,110,120);
  ["ID DELA","NAZIV","GREŠKA","STATUS","NOK"].forEach((h,i)=>{
    pdf.text(h, [14,40,90,140,170][i], y);
  });
  y+=5;
  pdf.setDrawColor(200,210,220);
  pdf.line(14,y,195,y); y+=3;

  pdf.setFont("helvetica","normal"); pdf.setTextColor(30,32,36);
  data.slice(0,25).forEach(r=>{
    if (y>270) { pdf.addPage(); y=20; }
    pdf.text((r.id_deo||"").substring(0,10),14,y);
    pdf.text((r.naziv_dela||"").substring(0,18),40,y);
    pdf.text((r.greska_naziv||"").substring(0,18),90,y);
    r.status==="NOK"
      ? pdf.setTextColor(207,34,46)
      : pdf.setTextColor(26,127,55);
    pdf.text(r.status||"",140,y);
    pdf.setTextColor(30,32,36);
    pdf.text(String(r.nok_kolicina||0),170,y);
    y+=6;
  });

  pdf.save(`Izvestaj_Smena${smena}_${danas}.pdf`);
}

// ============================================================
// v9 FINALNA VERZIJA — sve funkcionalnosti atributivnih
// ============================================================

// ─── PWA SERVICE WORKER REGISTRACIJA ─────────────────────────
// Pozovi jednom u App() useEffect
function registrujPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
  // Vibration API za NOK feedback
  if ('vibrate' in navigator) {
    window._vibrirajNOK = () => navigator.vibrate([100,50,100]);
    window._vibrirajOK  = () => navigator.vibrate([50]);
  }
}

// ─── AQL ACCEPTANCE SAMPLING ────────────────────────────────
function AQLTabela({ C }) {
  const [velicina, setVelicina] = useState(500);
  const [nivo,     setNivo]     = useState("II");
  const [aql,      setAql]      = useState("1.0");

  // ISO 2859-1 slovne oznake po veličini lota i nivou inspekcije
  const getSlovnaOznaka = (n, nivo) => {
    const tab = {
      "I":  [[2,"A"],[8,"B"],[15,"C"],[25,"D"],[50,"E"],[90,"F"],[150,"G"],
             [280,"H"],[500,"J"],[1200,"K"],[3200,"L"],[10000,"M"],[35000,"N"],[150000,"P"],[500001,"Q"]],
      "II": [[2,"A"],[8,"B"],[15,"C"],[25,"D"],[50,"E"],[90,"F"],[150,"G"],
             [280,"H"],[500,"J"],[1200,"K"],[3200,"L"],[10000,"M"],[35000,"N"],[150000,"P"],[500001,"Q"]],
      "III":[[2,"B"],[8,"C"],[15,"D"],[25,"E"],[50,"F"],[90,"G"],[150,"H"],
             [280,"J"],[500,"K"],[1200,"L"],[3200,"M"],[10000,"N"],[35000,"P"],[150000,"Q"],[500001,"R"]],
    };
    const rows = tab[nivo] || tab["II"];
    for (const [lim, slovo] of rows) if (n <= lim) return slovo;
    return "Q";
  };

  // Veličina uzorka i kriterijumi (norma)
  const getUzorak = (slovo) => {
    const tab = {
      A:2, B:3, C:5, D:8, E:13, F:20, G:32,
      H:50, J:80, K:125, L:200, M:315, N:500, P:800, Q:1250, R:2000,
    };
    return tab[slovo] || 0;
  };

  // Ac/Re po AQL nivou i slovnoj oznaci (pojednostavljena tabela)
  const getAcRe = (slovo, aql) => {
    const tab = {
      "0.065": {A:[0,1],B:[0,1],C:[0,1],D:[0,1],E:[0,1],F:[0,1],G:[1,2],H:[1,2],J:[1,2],K:[2,3],L:[3,4],M:[5,6],N:[7,8],P:[10,11],Q:[14,15]},
      "0.1":   {A:[0,1],B:[0,1],C:[0,1],D:[0,1],E:[0,1],F:[1,2],G:[1,2],H:[1,2],J:[2,3],K:[3,4],L:[5,6],M:[7,8],N:[10,11],P:[14,15],Q:[21,22]},
      "0.25":  {A:[0,1],B:[0,1],C:[0,1],D:[0,1],E:[1,2],F:[1,2],G:[2,3],H:[3,4],J:[5,6],K:[7,8],L:[10,11],M:[14,15],N:[21,22],P:[21,22],Q:[21,22]},
      "0.4":   {A:[0,1],B:[0,1],C:[0,1],D:[1,2],E:[1,2],F:[2,3],G:[3,4],H:[5,6],J:[7,8],K:[10,11],L:[14,15],M:[21,22],N:[21,22],P:[21,22],Q:[21,22]},
      "0.65":  {A:[0,1],B:[0,1],C:[1,2],D:[1,2],E:[2,3],F:[3,4],G:[5,6],H:[7,8],J:[10,11],K:[14,15],L:[21,22],M:[21,22],N:[21,22],P:[21,22],Q:[21,22]},
      "1.0":   {A:[0,1],B:[1,2],C:[1,2],D:[2,3],E:[3,4],F:[5,6],G:[7,8],H:[10,11],J:[14,15],K:[21,22],L:[21,22],M:[21,22],N:[21,22],P:[21,22],Q:[21,22]},
      "1.5":   {A:[0,1],B:[1,2],C:[2,3],D:[3,4],E:[5,6],F:[7,8],G:[10,11],H:[14,15],J:[21,22],K:[21,22],L:[21,22],M:[21,22],N:[21,22],P:[21,22],Q:[21,22]},
      "2.5":   {A:[1,2],B:[2,3],C:[3,4],D:[5,6],E:[7,8],F:[10,11],G:[14,15],H:[21,22],J:[21,22],K:[21,22],L:[21,22],M:[21,22],N:[21,22],P:[21,22],Q:[21,22]},
      "4.0":   {A:[1,2],B:[3,4],C:[5,6],D:[7,8],E:[10,11],F:[14,15],G:[21,22],H:[21,22],J:[21,22],K:[21,22],L:[21,22],M:[21,22],N:[21,22],P:[21,22],Q:[21,22]},
      "6.5":   {A:[2,3],B:[5,6],C:[7,8],D:[10,11],E:[14,15],F:[21,22],G:[21,22],H:[21,22],J:[21,22],K:[21,22],L:[21,22],M:[21,22],N:[21,22],P:[21,22],Q:[21,22]},
    };
    return tab[aql]?.[slovo] || [null,null];
  };

  const slovo    = getSlovnaOznaka(velicina, nivo);
  const n        = getUzorak(slovo);
  const [ac, re] = getAcRe(slovo, aql);

  const AQL_NIVOI  = ["0.065","0.1","0.25","0.4","0.65","1.0","1.5","2.5","4.0","6.5"];
  const INP_S = {background:C.input,border:`1px solid ${C.border}`,borderRadius:8,
    color:C.tekst,fontSize:13,padding:"10px 12px",outline:"none",fontFamily:"inherit"};

  return (
    <div style={{padding:18}}>
      <div style={{color:C.sivi,fontSize:10,letterSpacing:1.5,marginBottom:16}}>
        AQL ACCEPTANCE SAMPLING — ISO 2859-1
      </div>

      {/* Unos */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:6}}>VELIČINA LOTA</div>
          <input type="number" value={velicina} onChange={e=>setVelicina(Number(e.target.value))}
            min={2} style={{...INP_S,width:"100%",boxSizing:"border-box"}}/>
        </div>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:6}}>NIVO INSPEKCIJE</div>
          <select value={nivo} onChange={e=>setNivo(e.target.value)}
            style={{...INP_S,width:"100%",boxSizing:"border-box",cursor:"pointer"}}>
            <option value="I">I — Smanjena</option>
            <option value="II">II — Normalna</option>
            <option value="III">III — Pojačana</option>
          </select>
        </div>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:6}}>AQL %</div>
          <select value={aql} onChange={e=>setAql(e.target.value)}
            style={{...INP_S,width:"100%",boxSizing:"border-box",cursor:"pointer"}}>
            {AQL_NIVOI.map(a=><option key={a} value={a}>{a}%</option>)}
          </select>
        </div>
      </div>

      {/* Rezultat */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          ["SLOVNA OZNAKA",   slovo,           C.plava],
          ["VELIČINA UZORKA", n,               C.zelena],
          ["Ac (prihvati ≤)", ac ?? "—",       C.zelena],
          ["Re (odbaci ≥)",   re ?? "—",       C.crvena],
        ].map(([naziv,vrednost,boja])=>(
          <div key={naziv} style={{background:C.panel,border:`1px solid ${boja}30`,
            borderRadius:10,padding:"14px",textAlign:"center"}}>
            <div style={{color:C.sivi,fontSize:9,letterSpacing:1.2,marginBottom:5}}>{naziv}</div>
            <div style={{color:boja,fontSize:28,fontWeight:700}}>{vrednost}</div>
          </div>
        ))}
      </div>

      {/* Tumačenje */}
      <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:16}}>
        <div style={{color:C.tekst,fontSize:12,fontWeight:700,marginBottom:8}}>TUMAČENJE</div>
        <div style={{color:C.sivi,fontSize:12,lineHeight:1.8}}>
          Za lot od <strong style={{color:C.tekst}}>{velicina.toLocaleString()}</strong> komada,
          nivo inspekcije <strong style={{color:C.tekst}}>{nivo}</strong>,
          AQL <strong style={{color:C.tekst}}>{aql}%</strong>:<br/>
          → Uzmi <strong style={{color:C.zelena,fontSize:14}}>{n}</strong> komada na kontrolu<br/>
          → Ako je NOK ≤ <strong style={{color:C.zelena}}>{ac ?? "—"}</strong> → <span style={{color:C.zelena,fontWeight:700}}>PRIHVATI lot</span><br/>
          → Ako je NOK ≥ <strong style={{color:C.crvena}}>{re ?? "—"}</strong> → <span style={{color:C.crvena,fontWeight:700}}>ODBACI lot</span>
        </div>
      </div>

      {/* Tabela svih AQL nivoa za ovu veličinu */}
      <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:10}}>
        PREGLED ZA LOT {velicina.toLocaleString()} — NIVO {nivo} — SVE AQL VREDNOSTI
      </div>
      <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"80px 80px 80px 80px",
          background:C.hover,padding:"9px 14px",fontSize:9,color:C.sivi,gap:8,letterSpacing:1}}>
          <span>AQL %</span><span>UZORAK</span><span>Ac</span><span>Re</span>
        </div>
        {AQL_NIVOI.map(a=>{
          const sl2 = getSlovnaOznaka(velicina, nivo);
          const n2  = getUzorak(sl2);
          const [a2,r2] = getAcRe(sl2, a);
          const aktivan = a===aql;
          return(
            <div key={a} onClick={()=>setAql(a)} style={{display:"grid",
              gridTemplateColumns:"80px 80px 80px 80px",
              padding:"9px 14px",borderTop:`1px solid ${C.border}`,
              fontSize:12,gap:8,cursor:"pointer",
              background:aktivan?`${C.plava}15`:C.bg}}>
              <span style={{color:aktivan?C.plava:C.tekst,fontWeight:aktivan?700:400}}>{a}%</span>
              <span style={{color:C.tekst}}>{n2}</span>
              <span style={{color:C.zelena,fontWeight:700}}>{a2??"-"}</span>
              <span style={{color:C.crvena,fontWeight:700}}>{r2??"-"}</span>
            </div>
          );
        })}
      </div>
      <div style={{color:C.border,fontSize:10,marginTop:8}}>
        ISO 2859-1 · Jednokratno uzorkovanje · Normalna inspekcija
      </div>
    </div>
  );
}

// ─── KONTROLNA LISTA PRE SMENE ───────────────────────────────
function KontrolnaLista({ korisnik, smena, onZavrsena, C }) {
  const [stavke,    setStavke]    = useState([]);
  const [checklist, setChecklist] = useState({});
  const [napomena,  setNapomena]  = useState("");
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [vec_uradjena, setVecUradjena] = useState(false);

  useEffect(()=>{
    (async()=>{
      // Provjeri da li je već uradjena za ovu smenu danas
      const danas = new Date().toISOString().split("T")[0];
      const { data: log } = await supabase.from("kontrolna_lista_log")
        .select("id,zavrsena").eq("radnik_id",korisnik.radnikId)
        .eq("smena",smena).eq("datum",danas).eq("zavrsena",true).maybeSingle();

      if (log) { setVecUradjena(true); setLoading(false); return; }

      const { data } = await supabase.from("kontrolna_lista_stavke")
        .select("*").eq("aktivna",true).order("redosled");
      setStavke(data||[]);
      setLoading(false);
    })();
  },[]);

  const toggle = (id) => setChecklist(p=>({...p,[id]:!p[id]}));

  const ukupno    = stavke.length;
  const potvrdjeno = Object.values(checklist).filter(Boolean).length;
  const procenat  = ukupno>0?Math.round(potvrdjeno/ukupno*100):0;

  const snimi = async () => {
    if (potvrdjeno < ukupno) return;
    setSaving(true);
    const { error } = await supabase.from("kontrolna_lista_log").insert({
      radnik_id:   korisnik.radnikId,
      smena,
      stavke_json: checklist,
      napomena:    napomena||null,
      zavrsena:    true,
    });
    setSaving(false);
    if (!error) onZavrsena();
  };

  const kategorije = [...new Set(stavke.map(s=>s.kategorija))];

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",
      minHeight:"60vh",color:C.sivi,fontSize:13}}>Učitavanje...</div>
  );

  if (vec_uradjena) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",minHeight:"60vh",gap:16,padding:24}}>
      <div style={{fontSize:60}}>✅</div>
      <div style={{color:C.zelena,fontSize:20,fontWeight:700}}>Lista potvrđena</div>
      <div style={{color:C.sivi,fontSize:13}}>Kontrolna lista za Smenu {smena} je već popunjena danas.</div>
      <button onClick={onZavrsena} style={{background:C.plava,border:"none",borderRadius:10,
        color:"#fff",fontSize:14,fontWeight:700,padding:"12px 28px",cursor:"pointer"}}>
        Nastavi →
      </button>
    </div>
  );

  return (
    <div style={{padding:"16px 16px 100px",display:"flex",flexDirection:"column",gap:16,
      maxWidth:600,margin:"0 auto"}}>
      <div style={{textAlign:"center"}}>
        <div style={{color:C.tekst,fontSize:18,fontWeight:700,marginBottom:4}}>
          📋 Kontrolna lista pre smene
        </div>
        <div style={{color:C.sivi,fontSize:12}}>Smena {smena} · {new Date().toLocaleDateString("sr-RS")}</div>
      </div>

      {/* Progres */}
      <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,padding:14}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:8}}>
          <span style={{color:C.sivi}}>Potvrđeno</span>
          <span style={{color:procenat===100?C.zelena:C.zuta,fontWeight:700}}>
            {potvrdjeno} / {ukupno}
          </span>
        </div>
        <div style={{background:C.hover,borderRadius:4,height:8}}>
          <div style={{background:procenat===100?C.zelena:C.plava,
            width:`${procenat}%`,height:8,borderRadius:4,transition:"width 0.3s"}}/>
        </div>
      </div>

      {/* Stavke po kategorijama */}
      {kategorije.map(kat=>(
        <div key={kat} style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
          <div style={{background:C.hover,padding:"10px 16px",
            color:C.sivi,fontSize:10,fontWeight:700,letterSpacing:1.5}}>
            {kat}
          </div>
          {stavke.filter(s=>s.kategorija===kat).map(s=>(
            <div key={s.id} onClick={()=>toggle(s.id)}
              style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",
                borderTop:`1px solid ${C.border}`,cursor:"pointer",
                background:checklist[s.id]?`${C.zelena}10`:"transparent",
                transition:"background 0.2s"}}>
              <div style={{width:24,height:24,borderRadius:6,flexShrink:0,
                border:`2px solid ${checklist[s.id]?C.zelena:C.border}`,
                background:checklist[s.id]?C.zelena:"transparent",
                display:"flex",alignItems:"center",justifyContent:"center",
                transition:"all 0.2s"}}>
                {checklist[s.id]&&<span style={{color:"#fff",fontSize:14,fontWeight:700}}>✓</span>}
              </div>
              <span style={{color:checklist[s.id]?C.sivi:C.tekst,fontSize:13,
                textDecoration:checklist[s.id]?"line-through":"none"}}>
                {s.stavka}
              </span>
            </div>
          ))}
        </div>
      ))}

      {/* Napomena */}
      <div>
        <div style={{color:C.sivi,fontSize:10,letterSpacing:1.5,marginBottom:6}}>
          NAPOMENA (opciono)
        </div>
        <textarea value={napomena} onChange={e=>setNapomena(e.target.value)}
          placeholder="Posebni uslovi, problemi uočeni..."
          rows={3}
          style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,
            borderRadius:10,color:C.tekst,fontSize:13,padding:"12px",
            boxSizing:"border-box",outline:"none",fontFamily:"inherit",resize:"none"}}/>
      </div>

      {/* Potvrdi */}
      <button onClick={snimi} disabled={potvrdjeno<ukupno||saving}
        style={{background:potvrdjeno===ukupno?C.zelena:C.hover,border:"none",borderRadius:12,
          color:potvrdjeno===ukupno?"#fff":C.sivi,fontSize:16,fontWeight:700,
          padding:"18px",cursor:potvrdjeno<ukupno?"not-allowed":"pointer",
          boxShadow:potvrdjeno===ukupno?`0 0 20px ${C.zelena}40`:"none",
          transition:"all 0.3s"}}>
        {saving?"Snimanje..."
         :potvrdjeno===ukupno?"✓ Potvrdi i nastavi sa radom"
         :`Potvrdi još ${ukupno-potvrdjeno} stavki`}
      </button>
    </div>
  );
}

// ─── ESKALACIJE ───────────────────────────────────────────────
function EskalacijePanel({ korisnik, C, addToast, sviDelovi }) {
  const [eskalacije, setEskalacije] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [forma,      setForma]      = useState(null); // null | 'nova' | {id}
  const [radnici,    setRadnici]    = useState([]);
  const [filter,     setFilter]     = useState("sve");

  useEffect(()=>{
    Promise.all([
      supabase.from("eskalacije")
        .select("*,kreirao:radnici!eskalacije_kreirao_id_fkey(ime),dodeljen:radnici!eskalacije_dodeljen_id_fkey(ime)")
        .order("created_at",{ascending:false}),
      supabase.from("radnici").select("id,ime,uloga"),
    ]).then(([e,r])=>{
      setEskalacije(e.data||[]);
      setRadnici(r.data||[]);
      setLoading(false);
    });
  },[]);

  const novaEskalacija = async (form) => {
    const { data, error } = await supabase.from("eskalacije").insert({
      ...form, kreirao_id: korisnik.radnikId,
    }).select("*,kreirao:radnici!eskalacije_kreirao_id_fkey(ime),dodeljen:radnici!eskalacije_dodeljen_id_fkey(ime)").single();
    if (!error) {
      setEskalacije(p=>[data,...p]);
      setForma(null);
      addToast("✓ Eskalacija kreirana","uspeh");
    } else addToast(error.message,"greska");
  };

  const azuriraj = async (id, izmene) => {
    const { data, error } = await supabase.from("eskalacije").update({
      ...izmene,
      ...(izmene.status==="zatvoren"?{zatvoreno_at:new Date().toISOString()}:{}),
    }).eq("id",id)
      .select("*,kreirao:radnici!eskalacije_kreirao_id_fkey(ime),dodeljen:radnici!eskalacije_dodeljen_id_fkey(ime)")
      .single();
    if (!error) {
      setEskalacije(p=>p.map(e=>e.id===id?data:e));
      addToast("✓ Ažurirano","uspeh");
    }
  };

  const filtrirane = eskalacije.filter(e=>filter==="sve"||e.status===filter);

  const PRIORITET_BOJA = {kriticno:C.crvena,visok:C.narandzasta,srednji:C.zuta,nizak:C.zelena};
  const STATUS_BOJA    = {otvoren:C.crvena,u_toku:C.zuta,zatvoren:C.zelena};

  if (forma==="nova") return (
    <NovaEskalacija korisnik={korisnik} sviDelovi={sviDelovi} radnici={radnici}
      onSnimi={novaEskalacija} onOtkazati={()=>setForma(null)} C={C}/>
  );

  return (
    <div style={{padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{color:C.tekst,fontSize:14,fontWeight:700,letterSpacing:1}}>ESKALACIJE</div>
        <button onClick={()=>setForma("nova")}
          style={{background:C.crvena,border:"none",borderRadius:8,color:"#fff",
            fontSize:12,fontWeight:700,padding:"9px 16px",cursor:"pointer"}}>
          + Nova eskalacija
        </button>
      </div>

      {/* Filter */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["sve","Sve"],["otvoren","Otvorene"],["u_toku","U toku"],["zatvoren","Zatvorene"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} style={{
            background:filter===v?C.plava:"none",border:`1px solid ${filter===v?C.plava:C.border}`,
            borderRadius:8,color:filter===v?"#fff":C.sivi,fontSize:11,
            padding:"6px 14px",cursor:"pointer"}}>
            {l}
            {v!=="sve"&&<span style={{marginLeft:4,color:filter===v?"rgba(255,255,255,0.7)":C.border}}>
              ({eskalacije.filter(e=>e.status===v).length})
            </span>}
          </button>
        ))}
      </div>

      {loading ? <div style={{color:C.sivi,fontSize:12,padding:20}}>Učitavanje...</div>
       : !filtrirane.length ? (
        <div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>
          Nema eskalacija
        </div>
      ) : filtrirane.map(e=>(
        <div key={e.id} style={{background:C.panel,border:`1px solid ${PRIORITET_BOJA[e.prioritet]}30`,
          borderRadius:12,padding:16,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                <span style={{color:C.tekst,fontWeight:700,fontSize:13}}>{e.id_deo}</span>
                <span style={{background:`${PRIORITET_BOJA[e.prioritet]}20`,
                  color:PRIORITET_BOJA[e.prioritet],fontSize:9,fontWeight:700,
                  padding:"2px 8px",borderRadius:10,letterSpacing:0.5}}>
                  {e.prioritet.toUpperCase()}
                </span>
                <span style={{background:`${STATUS_BOJA[e.status]}20`,
                  color:STATUS_BOJA[e.status],fontSize:9,fontWeight:700,
                  padding:"2px 8px",borderRadius:10,letterSpacing:0.5}}>
                  {e.status.replace("_"," ").toUpperCase()}
                </span>
                {e.rok&&new Date(e.rok)<new Date()&&e.status!=="zatvoren"&&(
                  <span style={{color:C.crvena,fontSize:9}}>⚠ PREKORAČEN ROK</span>
                )}
              </div>
              <div style={{color:C.sivi,fontSize:12,marginBottom:4}}>{e.opis}</div>
              <div style={{display:"flex",gap:12,fontSize:10,color:C.border}}>
                <span>Kreirao: {e.kreirao?.ime||"?"}</span>
                {e.dodeljen&&<span>Dodeljen: {e.dodeljen.ime}</span>}
                {e.rok&&<span>Rok: {e.rok}</span>}
              </div>
            </div>
          </div>

          {e.korektivna_akcija&&(
            <div style={{background:C.zelena+"15",border:`1px solid ${C.zelena}30`,
              borderRadius:6,padding:"8px 12px",marginBottom:10,fontSize:11,color:C.sivi}}>
              <strong style={{color:C.zelena}}>Korektivna akcija:</strong> {e.korektivna_akcija}
            </div>
          )}

          {e.status!=="zatvoren"&&(
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
              {e.status==="otvoren"&&(
                <button onClick={()=>azuriraj(e.id,{status:"u_toku"})}
                  style={{background:C.zuta+"20",border:`1px solid ${C.zuta}40`,borderRadius:7,
                    color:C.zuta,fontSize:11,fontWeight:700,padding:"6px 14px",cursor:"pointer"}}>
                  → Preuzmi
                </button>
              )}
              <button onClick={()=>{
                const akcija = prompt("Unesi korektivnu akciju:");
                if (akcija) azuriraj(e.id,{status:"zatvoren",korektivna_akcija:akcija});
              }} style={{background:C.zelena+"20",border:`1px solid ${C.zelena}40`,borderRadius:7,
                color:C.zelena,fontSize:11,fontWeight:700,padding:"6px 14px",cursor:"pointer"}}>
                ✓ Zatvori
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function NovaEskalacija({ korisnik, sviDelovi, radnici, onSnimi, onOtkazati, C }) {
  const [form, setForm] = useState({
    id_deo:"", naziv_dela:"", tip:"ucl_probijen",
    opis:"", prioritet:"visok", dodeljen_id:"", rok:"",
  });
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));
  const INP = {width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:8,
    color:C.tekst,fontSize:13,padding:"10px 12px",boxSizing:"border-box",
    outline:"none",fontFamily:"inherit"};
  return (
    <div style={{padding:18,maxWidth:560}}>
      <div style={{color:C.tekst,fontSize:14,fontWeight:700,marginBottom:16}}>
        Nova eskalacija
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>ID DELA</div>
            <select value={form.id_deo} onChange={e=>{
              const d=sviDelovi.find(d=>d.id_deo===e.target.value);
              upd("id_deo",e.target.value); upd("naziv_dela",d?.naziv_dela||"");
            }} style={{...INP,cursor:"pointer"}}>
              <option value="">-- Izaberi --</option>
              {sviDelovi.map(d=><option key={d.id_deo} value={d.id_deo}>{d.id_deo}</option>)}
            </select>
          </div>
          <div>
            <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>PRIORITET</div>
            <select value={form.prioritet} onChange={e=>upd("prioritet",e.target.value)}
              style={{...INP,cursor:"pointer"}}>
              <option value="kriticno">🔴 Kritično</option>
              <option value="visok">🟠 Visok</option>
              <option value="srednji">🟡 Srednji</option>
              <option value="nizak">🟢 Nizak</option>
            </select>
          </div>
        </div>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>OPIS PROBLEMA</div>
          <textarea value={form.opis} onChange={e=>upd("opis",e.target.value)}
            placeholder="Detaljno opiši problem..." rows={3}
            style={{...INP,resize:"none"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>DODELI</div>
            <select value={form.dodeljen_id} onChange={e=>upd("dodeljen_id",e.target.value)}
              style={{...INP,cursor:"pointer"}}>
              <option value="">-- Izaberi --</option>
              {radnici.map(r=><option key={r.id} value={r.id}>{r.ime}</option>)}
            </select>
          </div>
          <div>
            <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>ROK</div>
            <input type="date" value={form.rok} onChange={e=>upd("rok",e.target.value)}
              style={INP}/>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <button onClick={()=>onSnimi(form)} disabled={!form.id_deo||!form.opis}
            style={{flex:1,background:!form.id_deo||!form.opis?C.hover:C.crvena,border:"none",
              borderRadius:8,color:!form.id_deo||!form.opis?C.sivi:"#fff",
              fontSize:13,fontWeight:700,padding:"12px",cursor:"pointer"}}>
            Kreiraj eskalaciju
          </button>
          <button onClick={onOtkazati}
            style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,
              color:C.sivi,fontSize:13,padding:"12px 16px",cursor:"pointer"}}>Otkaži</button>
        </div>
      </div>
    </div>
  );
}

// ─── 8D IZVEŠTAJ ─────────────────────────────────────────────
function OsmDIzvestaj({ korisnik, C, addToast, sviDelovi }) {
  const [izvestaji, setIzvestaji] = useState([]);
  const [aktivni,   setAktivni]   = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(()=>{
    supabase.from("osmD_izvestaji")
      .select("*,kreirao:radnici!osmD_izvestaji_kreirao_id_fkey(ime)")
      .order("created_at",{ascending:false})
      .then(({data})=>{ setIzvestaji(data||[]); setLoading(false); });
  },[]);

  const sacuvaj = async (form) => {
    const isNew = !form.id;
    const op = isNew
      ? supabase.from("osmD_izvestaji").insert({...form,kreirao_id:korisnik.radnikId})
          .select("*,kreirao:radnici!osmD_izvestaji_kreirao_id_fkey(ime)").single()
      : supabase.from("osmD_izvestaji").update({...form,updated_at:new Date().toISOString()})
          .eq("id",form.id)
          .select("*,kreirao:radnici!osmD_izvestaji_kreirao_id_fkey(ime)").single();
    const { data, error } = await op;
    if (!error) {
      setIzvestaji(p=>isNew?[data,...p]:p.map(i=>i.id===data.id?data:i));
      setAktivni(data);
      addToast(`✓ 8D izveštaj ${isNew?"kreiran":"sačuvan"}`, "uspeh");
    } else addToast(error.message,"greska");
  };

  const exportPDF8D = async (izv) => {
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
    const W = pdf.internal.pageSize.getWidth();
    pdf.setFillColor(28,35,51);
    pdf.rect(0,0,W,30,"F");
    pdf.setTextColor(88,166,255); pdf.setFontSize(16); pdf.setFont("helvetica","bold");
    pdf.text("8D IZVEŠTAJ O PROBLEMU",14,12);
    pdf.setTextColor(200,210,230); pdf.setFontSize(10); pdf.setFont("helvetica","normal");
    pdf.text(`${izv.id_deo} · ${new Date(izv.created_at).toLocaleDateString("sr-RS")}`,14,22);
    let y=40;
    const D_LABELE = ["D1 Tim","D2 Opis problema","D3 Privremena akcija",
      "D4 Uzrok","D5 Korektivna akcija","D6 Implementacija","D7 Prevencija","D8 Zaključak"];
    const D_POLJA  = ["d1_tim","d2_opis_problema","d3_privremena_akcija",
      "d4_uzrok","d5_korektivna","d6_implementacija","d7_prevencija","d8_zakljucak"];
    D_LABELE.forEach((lab,i)=>{
      if(y>260){pdf.addPage();y=20;}
      pdf.setFillColor(240,244,248); pdf.rect(14,y,W-28,6,"F");
      pdf.setFontSize(9); pdf.setFont("helvetica","bold"); pdf.setTextColor(80,100,120);
      pdf.text(lab.toUpperCase(),16,y+4.5);
      y+=8;
      pdf.setFontSize(10); pdf.setFont("helvetica","normal"); pdf.setTextColor(30,32,36);
      const tekst = izv[D_POLJA[i]]||"—";
      const linije = pdf.splitTextToSize(tekst, W-28);
      pdf.text(linije,14,y);
      y += linije.length*5+4;
    });
    pdf.save(`8D_${izv.id_deo}_${new Date(izv.created_at).toISOString().split("T")[0]}.pdf`);
  };

  const POLJA_8D = [
    {key:"d1_tim",           label:"D1 — Tim",                ph:"Navedi članove tima i voditelja..."},
    {key:"d2_opis_problema",  label:"D2 — Opis problema",       ph:"Ko, šta, kada, gde, koliko, trend..."},
    {key:"d3_privremena_akcija",label:"D3 — Privremena akcija", ph:"Šta je urađeno odmah da zaštiti kupca..."},
    {key:"d4_uzrok",          label:"D4 — Uzrok (5×Zašto)",     ph:"Zašto1? → Zašto2? → ... → Koren uzroka..."},
    {key:"d5_korektivna",     label:"D5 — Korektivna akcija",   ph:"Šta će eliminisati uzrok..."},
    {key:"d6_implementacija", label:"D6 — Implementacija",      ph:"Ko, šta, do kada..."},
    {key:"d7_prevencija",     label:"D7 — Prevencija",          ph:"Kako sprečiti sličan problem u budućnosti..."},
    {key:"d8_zakljucak",      label:"D8 — Zaključak i čestitke",ph:"Timski doprinos, napomena..."},
  ];

  if (aktivni !== null) {
    return <Editor8D izvestaj={aktivni} sviDelovi={sviDelovi} polja={POLJA_8D}
      onSacuvaj={sacuvaj} onNazad={()=>setAktivni(null)}
      onPDF={exportPDF8D} C={C}/>;
  }

  return (
    <div style={{padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{color:C.tekst,fontSize:14,fontWeight:700,letterSpacing:1}}>8D IZVEŠTAJI</div>
        <button onClick={()=>setAktivni({})}
          style={{background:C.plava,border:"none",borderRadius:8,color:"#fff",
            fontSize:12,fontWeight:700,padding:"9px 16px",cursor:"pointer"}}>
          + Novi 8D
        </button>
      </div>
      {loading?<div style={{color:C.sivi,fontSize:12,padding:20}}>Učitavanje...</div>
       :!izvestaji.length?(
        <div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>
          Nema izveštaja
        </div>
      ):izvestaji.map(i=>(
        <div key={i.id} onClick={()=>setAktivni(i)}
          style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,
            padding:16,marginBottom:10,cursor:"pointer",transition:"border-color 0.2s"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor=C.plava}
          onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{color:C.tekst,fontWeight:700,fontSize:13}}>{i.id_deo}</span>
              <span style={{background:i.status==="zavrsен"?`${C.zelena}20`:`${C.zuta}20`,
                color:i.status==="zavrsen"?C.zelena:C.zuta,fontSize:9,
                padding:"2px 8px",borderRadius:10}}>{i.status.replace("_"," ")}</span>
            </div>
            <button onClick={e=>{e.stopPropagation();exportPDF8D(i);}}
              style={{background:"none",border:`1px solid ${C.border}`,borderRadius:5,
                color:C.sivi,fontSize:10,padding:"3px 10px",cursor:"pointer"}}>
              📄 PDF
            </button>
          </div>
          <div style={{color:C.sivi,fontSize:11}}>{i.d2_opis_problema?.substring(0,80)||"—"}</div>
          <div style={{color:C.border,fontSize:10,marginTop:4}}>
            {i.kreirao?.ime} · {new Date(i.created_at).toLocaleDateString("sr-RS")}
          </div>
        </div>
      ))}
    </div>
  );
}

function Editor8D({ izvestaj, sviDelovi, polja, onSacuvaj, onNazad, onPDF, C }) {
  const [form, setForm] = useState({
    id:          izvestaj.id||null,
    id_deo:      izvestaj.id_deo||"",
    naziv_dela:  izvestaj.naziv_dela||"",
    status:      izvestaj.status||"u_izradi",
    d1_tim:               izvestaj.d1_tim||"",
    d2_opis_problema:     izvestaj.d2_opis_problema||"",
    d3_privremena_akcija: izvestaj.d3_privremena_akcija||"",
    d4_uzrok:             izvestaj.d4_uzrok||"",
    d5_korektivna:        izvestaj.d5_korektivna||"",
    d6_implementacija:    izvestaj.d6_implementacija||"",
    d7_prevencija:        izvestaj.d7_prevencija||"",
    d8_zakljucak:         izvestaj.d8_zakljucak||"",
  });

  const INP = {width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:8,
    color:C.tekst,fontSize:13,padding:"10px 12px",boxSizing:"border-box",
    outline:"none",fontFamily:"inherit"};
  const popunjeno = polja.filter(p=>form[p.key]?.trim()).length;

  return (
    <div style={{padding:18,maxWidth:680}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <button onClick={onNazad} style={{background:"none",border:"none",
          color:C.sivi,fontSize:14,cursor:"pointer",padding:0}}>← Nazad</button>
        <div style={{color:C.tekst,fontSize:13,fontWeight:700}}>8D Izveštaj</div>
        <button onClick={()=>onPDF(form)}
          style={{background:"#7c3aed",border:"none",borderRadius:7,color:"#fff",
            fontSize:11,fontWeight:700,padding:"7px 14px",cursor:"pointer"}}>
          📄 PDF
        </button>
      </div>

      {/* ID dela */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>ID DELA</div>
          <select value={form.id_deo} onChange={e=>{
            const d=sviDelovi.find(d=>d.id_deo===e.target.value);
            setForm(p=>({...p,id_deo:e.target.value,naziv_dela:d?.naziv_dela||""}));
          }} style={{...INP,cursor:"pointer"}}>
            <option value="">-- Izaberi --</option>
            {sviDelovi.map(d=><option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>)}
          </select>
        </div>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>STATUS</div>
          <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}
            style={{...INP,cursor:"pointer"}}>
            <option value="u_izradi">U izradi</option>
            <option value="pregled">Na pregledu</option>
            <option value="zavrsen">Završen</option>
          </select>
        </div>
      </div>

      {/* Progres */}
      <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,
        padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
        <div style={{flex:1,background:C.hover,borderRadius:3,height:6}}>
          <div style={{background:C.plava,width:`${(popunjeno/8)*100}%`,
            height:6,borderRadius:3,transition:"width 0.3s"}}/>
        </div>
        <span style={{color:C.sivi,fontSize:11}}>{popunjeno}/8 polja</span>
      </div>

      {/* D1-D8 polja */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {polja.map((p,i)=>(
          <div key={p.key}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
              <span style={{background:form[p.key]?.trim()?C.zelena:C.hover,
                color:form[p.key]?.trim()?"#fff":C.sivi,
                fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:6,
                minWidth:24,textAlign:"center"}}>{i+1}</span>
              <span style={{color:C.tekst,fontSize:12,fontWeight:600}}>{p.label}</span>
            </div>
            <textarea value={form[p.key]||""} onChange={e=>setForm(pr=>({...pr,[p.key]:e.target.value}))}
              placeholder={p.ph} rows={3}
              style={{...INP,resize:"vertical",minHeight:70}}/>
          </div>
        ))}
      </div>

      <button onClick={()=>onSacuvaj(form)} style={{
        width:"100%",background:C.plava,border:"none",borderRadius:10,color:"#fff",
        fontSize:14,fontWeight:700,padding:"14px",cursor:"pointer",marginTop:16,
        boxShadow:`0 0 16px ${C.plava}40`}}>
        💾 Sačuvaj 8D izveštaj
      </button>
    </div>
  );
}

// ─── FOTO ARHIVA GREŠAKA ─────────────────────────────────────
function FotoArhiva({ C, addToast }) {
  const [podaci,   setPodaci]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("");
  const [uvecana,  setUvecana]  = useState(null);

  useEffect(()=>{
    supabase.from("kontrolni_log")
      .select("id,datum,id_deo,naziv_dela,greska_naziv,podkategorija,komentar,nok_kolicina")
      .eq("status","NOK").not("komentar","is",null).neq("komentar","")
      .order("created_at",{ascending:false}).limit(100)
      .then(({data})=>{ setPodaci(data||[]); setLoading(false); });
  },[]);

  // Za slike iz Supabase Storage — za sada prikazujemo komentare kao katalog
  const filtrirani = filter
    ? podaci.filter(p=>p.greska_naziv?.toLowerCase().includes(filter.toLowerCase())
        || p.id_deo?.toLowerCase().includes(filter.toLowerCase()))
    : podaci;

  const greske = [...new Set(podaci.map(p=>p.greska_naziv).filter(Boolean))];

  return (
    <div style={{padding:18}}>
      {uvecana&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",
          zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
          onClick={()=>setUvecana(null)}>
          <div style={{background:C.panel,borderRadius:12,padding:20,maxWidth:500,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <span style={{color:C.crvena,fontWeight:700,fontSize:14}}>{uvecana.greska_naziv}</span>
              <button onClick={()=>setUvecana(null)} style={{background:"none",border:"none",
                color:C.sivi,fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            {[["ID dela",uvecana.id_deo],["Naziv",uvecana.naziv_dela],
              ["Greška",uvecana.greska_naziv],["Podkat.",uvecana.podkategorija],
              ["Datum",uvecana.datum],["Količina",uvecana.nok_kolicina],
            ].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",
                fontSize:12,marginBottom:6}}>
                <span style={{color:C.sivi}}>{l}</span>
                <span style={{color:C.tekst,fontWeight:500}}>{v}</span>
              </div>
            ))}
            {uvecana.komentar&&(
              <div style={{background:C.zuta+"15",border:`1px solid ${C.zuta}30`,
                borderRadius:8,padding:"10px 12px",marginTop:10,color:C.tekst,fontSize:12}}>
                💬 {uvecana.komentar}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
        FOTO ARHIVA GREŠAKA — NOK sa komentarima
      </div>

      {/* Filter */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <input value={filter} onChange={e=>setFilter(e.target.value)}
          placeholder="Pretraži po grešci ili ID dela..."
          style={{flex:1,background:C.input,border:`1px solid ${C.border}`,borderRadius:8,
            color:C.tekst,fontSize:12,padding:"9px 12px",outline:"none",fontFamily:"inherit",
            minWidth:200}}/>
        {filter&&<button onClick={()=>setFilter("")}
          style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,
            color:C.sivi,fontSize:12,padding:"9px 12px",cursor:"pointer"}}>✕</button>}
      </div>

      {/* Kategorije */}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        <button onClick={()=>setFilter("")}
          style={{background:!filter?C.plava:"none",border:`1px solid ${!filter?C.plava:C.border}`,
            borderRadius:20,color:!filter?"#fff":C.sivi,fontSize:11,padding:"5px 14px",cursor:"pointer"}}>
          Sve ({podaci.length})
        </button>
        {greske.slice(0,6).map(g=>(
          <button key={g} onClick={()=>setFilter(g)}
            style={{background:filter===g?C.crvena:"none",border:`1px solid ${filter===g?C.crvena:C.border}`,
              borderRadius:20,color:filter===g?"#fff":C.sivi,fontSize:11,
              padding:"5px 14px",cursor:"pointer"}}>
            {g}
          </button>
        ))}
      </div>

      {loading?<div style={{color:C.sivi,fontSize:12,textAlign:"center",padding:40}}>Učitavanje...</div>
       :!filtrirani.length?(
        <div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>
          {filter?"Nema rezultata za pretragu":"Nema NOK unosa sa komentarima"}
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
          {filtrirani.map(p=>(
            <div key={p.id} onClick={()=>setUvecana(p)}
              style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,
                padding:14,cursor:"pointer",transition:"border-color 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.crvena}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{background:`${C.crvena}15`,borderRadius:8,height:80,
                display:"flex",alignItems:"center",justifyContent:"center",
                marginBottom:10,fontSize:32}}>
                ⚠
              </div>
              <div style={{color:C.crvena,fontWeight:700,fontSize:12,marginBottom:4}}>
                {p.greska_naziv}
              </div>
              <div style={{color:C.sivi,fontSize:10,marginBottom:4}}>{p.id_deo}</div>
              <div style={{color:C.border,fontSize:9}}>{p.datum} · ×{p.nok_kolicina}</div>
              {p.komentar&&(
                <div style={{color:C.zuta,fontSize:10,marginTop:6,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  💬 {p.komentar}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
