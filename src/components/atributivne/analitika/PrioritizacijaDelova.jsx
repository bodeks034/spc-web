import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import { statAtributivneRedovi } from "../../../lib/atributivneAgregacija.js";
import { useOfflineCache } from "./useOfflineCache.js";

export default function PrioritizacijaDelova({ C, addToast }) {
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
          .select("id_deo,naziv_dela,ok_kolicina,nok_kolicina,ukupno_merenja,datum,inspekcija_id,sesija_id,created_at,id,smena")
          .gte("datum", od.toISOString().split("T")[0]);

        const mapa = {};
        (data||[]).forEach(r=>{
          if(!mapa[r.id_deo]) mapa[r.id_deo]={id_deo:r.id_deo,naziv:r.naziv_dela,rows:[],dani:new Set()};
          mapa[r.id_deo].rows.push(r);
          mapa[r.id_deo].dani.add(r.datum);
        });

        const arr = Object.values(mapa).map(d=>{
          const st = statAtributivneRedovi(d.rows);
          const rty = st.n>0?st.rty:100;
          const p = st.p;
          const dpmo = st.dpmo;
          const skor = Math.min(100, p*5 + (dpmo/10000)*2 + (rty<80?30:rty<90?15:0));
          return { id_deo: d.id_deo, naziv: d.naziv, ok: st.ok, nok: st.nok, n: st.n,
            rty:rty.toFixed(1), p:p.toFixed(2), dpmo, skor:Math.round(skor),
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
                <span style={{color:C.sivi}}>{LAB_FPY_KRATKO}: <strong style={{color:
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
