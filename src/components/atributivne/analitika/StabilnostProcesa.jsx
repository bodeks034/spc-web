import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import { statAtributivneRedovi, agregirajAtributivnePoKljuču } from "../../../lib/atributivneAgregacija.js";
import { SpcStabilnostGraf } from "../../SpcAnalitikaGrafovi.jsx";

export default function StabilnostProcesa({ sviDelovi, C, addToast }) {
  const [idDeo,   setIdDeo]   = useState("");
  const [podaci,  setPodaci]  = useState(null);
  const [loading, setLoading] = useState(false);

  const analiziraj = useCallback(async () => {
    if (!idDeo) return; setLoading(true);
    try {
      const { data, error } = await supabase.from("kontrolni_log")
        .select("datum,nok_kolicina,ok_kolicina,ukupno_merenja,inspekcija_id,sesija_id,created_at,id_deo,id,smena")
        .eq("id_deo",idDeo).order("datum",{ascending:true});
      if (error) throw error;
      if (!data?.length) { setPodaci(null); setLoading(false); return; }

      const niz = [...agregirajAtributivnePoKljuču(data, r => r.datum).entries()]
        .map(([datum, rows]) => {
          const d = statAtributivneRedovi(rows);
          return { datum, p: d.n > 0 ? (d.nok / d.n) * 100 : 0 };
        })
        .sort((a, b) => a.datum.localeCompare(b.datum));

      if (niz.length < 6) { setPodaci({niz, shift:null, msg:"Premalo podataka (min 6 dana)"}); setLoading(false); return; }

      const polovina = Math.floor(niz.length/2);
      const prv = niz.slice(0,polovina).map(d=>d.p);
      const drg = niz.slice(polovina).map(d=>d.p);
      const mean = arr => arr.reduce((s,v)=>s+v,0)/arr.length;
      const m1 = mean(prv), m2 = mean(drg);
      const std = arr => { const m=mean(arr); return Math.sqrt(arr.reduce((s,v)=>s+(v-m)**2,0)/arr.length); };
      const s1 = std(prv)||0.001;
      // t-test aproksimacija
      const t = Math.abs(m2-m1) / (s1 * Math.sqrt(2/polovina));
      const shift = t > 2.0; // p < 0.05 aproksimacija

      // Moving range za detekciju promene
      const mr = niz.slice(1).map((d,i)=>Math.abs(d.p-niz[i].p));
      const mrBar = mean(mr)||0.001;
      const uclMR = 3.267 * mrBar;
      const tackeProboja = mr.filter(v=>v>uclMR).length;

      setPodaci({ niz, shift, m1:m1.toFixed(2), m2:m2.toFixed(2),
        razlika:(m2-m1).toFixed(2), tackeProboja,
        msg: shift
          ? `⚠ DETEKTOVANA PROMENA PROCESA — prosek se promenio sa ${m1.toFixed(2)}% na ${m2.toFixed(2)}% (razlika: ${(m2-m1).toFixed(2)}%)`
          : `✓ Proces stabilan — nema statistički značajne promene` });
    } catch(e) { addToast(e.message,"greska"); }
    finally { setLoading(false); }
  },[idDeo]);

  useEffect(()=>{analiziraj();},[analiziraj]);

  const INP_S = {background:C.input,border:`1px solid ${C.border}`,borderRadius:8,
    color:C.tekst,fontSize:11,padding:"7px 10px",outline:"none",fontFamily:"inherit"};

  return (
    <div style={{padding:18}}>
      <div style={{color:C.sivi,fontSize:10,letterSpacing:1.5,marginBottom:14}}>
        STABILNOST PROCESA — detekcija promene kroz vreme
      </div>
      <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"flex-end"}}>
        <div style={{flex:1}}>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>ID DELA</div>
          <select value={idDeo} onChange={e=>setIdDeo(e.target.value)}
            style={{...INP_S,width:"100%",cursor:"pointer"}}>
            <option value="">-- Izaberi deo --</option>
            {sviDelovi.map(d=><option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>)}
          </select>
        </div>
        <button onClick={analiziraj} disabled={!idDeo||loading}
          style={{background:!idDeo?C.hover:C.plava,border:"none",borderRadius:8,
            color:!idDeo?C.sivi: C.onAkcent,fontSize:11,fontWeight:700,
            padding:"8px 14px",cursor:!idDeo?"not-allowed":"pointer"}}>
          {loading?"...":"↻"}
        </button>
      </div>
      {!idDeo ? (
        <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",
          color:C.border,flexDirection:"column",gap:8}}>
          <span style={{fontSize:32}}>📉</span>
          <span style={{fontSize:12}}>Izaberi deo za analizu stabilnosti</span>
        </div>
      ) : loading ? (
        <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",color:C.sivi,fontSize:12}}>
          Analiza...
        </div>
      ) : !podaci ? (
        <div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>Nema podataka</div>
      ) : (
        <>
          {/* Status poruka */}
          <div style={{background:podaci.shift?`${C.crvena}18`:`${C.zelena}18`,
            border:`1px solid ${podaci.shift?C.crvena:C.zelena}40`,
            borderRadius:10,padding:"12px 16px",marginBottom:16}}>
            <div style={{color:podaci.shift?C.crvena:C.zelena,fontSize:13,fontWeight:700}}>
              {podaci.msg}
            </div>
            {podaci.tackeProboja > 0 && (
              <div style={{color:C.zuta,fontSize:11,marginTop:4}}>
                Moving Range: {podaci.tackeProboja} tačaka van UCL
              </div>
            )}
          </div>

          {/* Poređenje */}
          {podaci.shift !== null && (
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
              {[
                ["1. polovina",    podaci.m1+"%",    C.plava],
                ["2. polovina",    podaci.m2+"%",    podaci.shift?C.crvena:C.zelena],
                ["Razlika",`${podaci.razlika>0?"+":""}${podaci.razlika}%`,
                  Math.abs(podaci.razlika)>2?C.crvena:C.zelena],
              ].map(([n,v,b])=>(
                <div key={n} style={{background:C.panel,border:`1px solid ${b}25`,
                  borderRadius:10,padding:"12px",textAlign:"center"}}>
                  <div style={{color:C.sivi,fontSize:9,letterSpacing:1,marginBottom:3}}>{n}</div>
                  <div style={{color:b,fontSize:18,fontWeight:700}}>{v}</div>
                </div>
              ))}
            </div>
          )}

          <SpcStabilnostGraf podaci={podaci} C={C} height={320} />
        </>
      )}
    </div>
  );
}
