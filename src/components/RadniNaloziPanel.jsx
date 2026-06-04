import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";

export default function RadniNaloziPanel({ C, addToast, sviDelovi }) {
  const [nalozi,  setNalozi]  = useState([]);
  const [kupci,   setKupci]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma,   setForma]   = useState(false);
  const [filter,  setFilter]  = useState("aktivan");
  const [csv,     setCsv]     = useState(null);
  const [nov, setNov] = useState({
    broj_naloga:"",id_deo:"",naziv_dela:"",kolicina:"",
    kupac:"",rok_isporuke:"",napomena:""
  });

  useEffect(()=>{
    Promise.all([
      supabase.from("radni_nalozi").select("*").order("created_at",{ascending:false}),
      supabase.from("kupci").select("id,naziv").eq("aktivan",true),
    ]).then(([n,k])=>{ setNalozi(n.data||[]); setKupci(k.data||[]); setLoading(false); });
  },[]);

  const snimi = async () => {
    if (!nov.broj_naloga || !nov.id_deo) return;
    const { data, error } = await supabase.from("radni_nalozi").insert(nov).select().single();
    if (!error) {
      setNalozi(p=>[data,...p]); setForma(false);
      addToast("✓ Radni nalog dodat","uspeh");
      setNov({broj_naloga:"",id_deo:"",naziv_dela:"",kolicina:"",kupac:"",rok_isporuke:"",napomena:""});
    } else addToast(error.message,"greska");
  };

  const uvozCSV = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split("\n").filter(l=>l.trim());
      const header = lines[0].split(",").map(h=>h.trim().toLowerCase());
      const redovi = lines.slice(1).map(l => {
        const vals = l.split(",");
        const obj = {};
        header.forEach((h,i) => obj[h] = vals[i]?.trim()||"");
        return obj;
      }).filter(r=>r.broj_naloga);
      setCsv(redovi);
    };
    reader.readAsText(file);
  };

  const uvozSnimi = async () => {
    if (!csv?.length) return;
    const { error } = await supabase.from("radni_nalozi").insert(csv);
    if (!error) {
      addToast(`✓ Uvezeno ${csv.length} naloga`,"uspeh");
      setCsv(null);
      const { data } = await supabase.from("radni_nalozi").select("*").order("created_at",{ascending:false});
      setNalozi(data||[]);
    } else addToast(error.message,"greska");
  };

  const statusBoja = {aktivan:C.zelena,zavrsen:C.sivi,otkazan:C.crvena};
  const filtrirani = nalozi.filter(n=>filter==="svi"||n.status===filter);

  const INP = {width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:8,
    color:C.tekst,fontSize:13,padding:"10px 12px",boxSizing:"border-box",outline:"none",fontFamily:"inherit"};

  return (
    <div style={{padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div style={{color:C.tekst,fontSize:14,fontWeight:700,letterSpacing:1}}>RADNI NALOZI</div>
        <div style={{display:"flex",gap:8}}>
          <label style={{background:C.hover,border:`1px solid ${C.border}`,borderRadius:8,
            color:C.sivi,fontSize:12,fontWeight:700,padding:"9px 14px",cursor:"pointer"}}>
            📎 CSV uvoz
            <input type="file" accept=".csv" onChange={uvozCSV} style={{display:"none"}}/>
          </label>
          <button onClick={()=>setForma(true)}
            style={{background:C.plava,border:"none",borderRadius:8,color:"#fff",
              fontSize:12,fontWeight:700,padding:"9px 16px",cursor:"pointer"}}>
            + Novi nalog
          </button>
        </div>
      </div>

      {/* CSV preview */}
      {csv && (
        <div style={{background:"#0c2d48",border:`1px solid ${C.plava}40`,borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{color:C.plava,fontSize:12,fontWeight:700,marginBottom:8}}>
            📋 CSV uvoz — {csv.length} naloga
          </div>
          <div style={{color:C.sivi,fontSize:11,marginBottom:10}}>
            Kolone: {Object.keys(csv[0]).join(", ")}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={uvozSnimi} style={{background:C.plava,border:"none",borderRadius:7,
              color:"#fff",fontSize:12,fontWeight:700,padding:"8px 16px",cursor:"pointer"}}>
              ✓ Uvezi {csv.length} naloga
            </button>
            <button onClick={()=>setCsv(null)} style={{background:"none",border:`1px solid ${C.border}`,
              borderRadius:7,color:C.sivi,fontSize:12,padding:"8px 14px",cursor:"pointer"}}>
              Otkaži
            </button>
          </div>
          <div style={{color:C.border,fontSize:10,marginTop:8}}>
            Format: broj_naloga, id_deo, naziv_dela, kolicina, kupac, rok_isporuke
          </div>
        </div>
      )}

      {/* Nova forma */}
      {forma && (
        <div style={{background:C.panel,border:`1px solid ${C.plava}30`,borderRadius:12,padding:16,marginBottom:14}}>
          <div style={{color:C.tekst,fontSize:13,fontWeight:700,marginBottom:12}}>Novi radni nalog</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            {[["BROJ NALOGA","broj_naloga","RN-2024-001"],
              ["KUPAC","kupac",""],
              ["KOLIČINA","kolicina",""],
              ["ROK ISPORUKE","rok_isporuke",""]
            ].map(([l,k,ph])=>(
              <div key={k}>
                <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>{l}</div>
                {k==="rok_isporuke"
                  ? <input type="date" value={nov[k]} onChange={e=>setNov(p=>({...p,[k]:e.target.value}))} style={INP}/>
                  : k==="kupac"
                  ? <select value={nov[k]} onChange={e=>setNov(p=>({...p,[k]:e.target.value}))} style={{...INP,cursor:"pointer"}}>
                      <option value="">-- Izaberi --</option>
                      {kupci.map(k=><option key={k.id} value={k.naziv}>{k.naziv}</option>)}
                    </select>
                  : <input value={nov[k]} onChange={e=>setNov(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={INP}/>
                }
              </div>
            ))}
          </div>
          <div style={{marginBottom:10}}>
            <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>ID DELA</div>
            <select value={nov.id_deo} onChange={e=>{
              const d=sviDelovi.find(d=>d.id_deo===e.target.value);
              setNov(p=>({...p,id_deo:e.target.value,naziv_dela:d?.naziv_dela||""}));
            }} style={{...INP,cursor:"pointer"}}>
              <option value="">-- Izaberi deo --</option>
              {sviDelovi.map(d=><option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={snimi} disabled={!nov.broj_naloga||!nov.id_deo}
              style={{flex:1,background:nov.broj_naloga&&nov.id_deo?C.plava:C.hover,border:"none",
                borderRadius:8,color:nov.broj_naloga&&nov.id_deo?"#fff":C.sivi,
                fontSize:13,fontWeight:700,padding:"11px",cursor:"pointer"}}>
              Snimi
            </button>
            <button onClick={()=>setForma(false)} style={{background:"none",border:`1px solid ${C.border}`,
              borderRadius:8,color:C.sivi,fontSize:13,padding:"11px 16px",cursor:"pointer"}}>Otkaži</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{display:"flex",gap:8,marginBottom:14}}>
        {[["aktivan","Aktivni"],["zavrsen","Završeni"],["otkazan","Otkazani"],["svi","Svi"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} style={{
            background:filter===v?C.plava:"none",border:`1px solid ${filter===v?C.plava:C.border}`,
            borderRadius:8,color:filter===v?"#fff":C.sivi,fontSize:11,padding:"6px 14px",cursor:"pointer"}}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <div style={{color:C.sivi,fontSize:12,padding:20}}>Učitavanje...</div>
       : !filtrirani.length ? (
        <div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>Nema naloga</div>
      ) : (
        <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"120px 80px 1fr 80px 100px 80px",
            background:C.hover,padding:"9px 14px",fontSize:9,color:C.sivi,gap:8,letterSpacing:1}}>
            <span>BROJ NALOGA</span><span>ID DELA</span><span>NAZIV</span>
            <span>KOL.</span><span>KUPAC</span><span>STATUS</span>
          </div>
          {filtrirani.map(n=>(
            <div key={n.id} style={{display:"grid",
              gridTemplateColumns:"120px 80px 1fr 80px 100px 80px",
              padding:"9px 14px",borderTop:`1px solid ${C.border}`,
              fontSize:11,gap:8,alignItems:"center"}}>
              <span style={{color:C.plava,fontWeight:700}}>{n.broj_naloga}</span>
              <span style={{color:C.tekst}}>{n.id_deo}</span>
              <span style={{color:C.sivi,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.naziv_dela}</span>
              <span style={{color:C.tekst}}>{n.kolicina}</span>
              <span style={{color:C.sivi}}>{n.kupac||"—"}</span>
              <span style={{color:statusBoja[n.status]||C.sivi,fontWeight:700,fontSize:10}}>
                {n.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}