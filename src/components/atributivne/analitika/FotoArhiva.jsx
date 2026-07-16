import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient.js";

export default function FotoArhiva({ C, addToast }) {
  const [podaci,   setPodaci]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("");
  const [uvecana,  setUvecana]  = useState(null);

  useEffect(()=>{
    supabase.from("kontrolni_log")
      .select("id,datum,id_deo,naziv_dela,greska_naziv,podkategorija,komentar,nok_kolicina,foto")
      .eq("status","NOK")
      .order("created_at",{ascending:false}).limit(150)
      .then(({data})=>{
        const rows = (data || []).filter((p) => p.foto || String(p.komentar || "").trim());
        setPodaci(rows);
        setLoading(false);
      });
  },[]);

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
            {uvecana.foto && (
              <img src={uvecana.foto} alt="NOK" style={{
                width: "100%", borderRadius: 8, marginTop: 10, maxHeight: 280, objectFit: "contain",
              }} />
            )}
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
        FOTO ARHIVA GREŠAKA — NOK sa foto / komentarom
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
            borderRadius:20,color:!filter? C.onAkcent:C.sivi,fontSize:11,padding:"5px 14px",cursor:"pointer"}}>
          Sve ({podaci.length})
        </button>
        {greske.slice(0,6).map(g=>(
          <button key={g} onClick={()=>setFilter(g)}
            style={{background:filter===g?C.crvena:"none",border:`1px solid ${filter===g?C.crvena:C.border}`,
              borderRadius:20,color:filter===g? C.onAkcent:C.sivi,fontSize:11,
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
                marginBottom:10,fontSize:32,overflow:"hidden"}}>
                {p.foto
                  ? <img src={p.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : "⚠"}
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

// ============================================================
// v10: Kalibracija merila, Ciljevi kvaliteta,
//      Radni nalozi, Izveštaj za kupca, Export Excel,
//      OC kriva, Stabilnost procesa
// ============================================================

// ─── KALIBRACIJA MERILA ───────────────────────────────────────
