import { useState, useEffect } from "react";
import { aggregateLogRows } from "../../../lib/spcStats.js";
import { LAB_FPY_PCT, LAB_FPY_TREND } from "../../../lib/rtyFpy.js";
import { SpcRtyJednaLinija } from "../../SpcAnalitikaGrafovi.jsx";
import { supabase } from "../../../lib/supabaseClient.js";

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
          .select("datum,status,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,smena,inspekcija_id,sesija_id,created_at,id_deo,id")
          .gte("datum",od.toISOString().split("T")[0]);
        if(error)throw error;
        if(!data?.length){setPodaci({});return;}
        setPodaci(aggregateLogRows(data) || {});
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
            borderRadius:8,color:period===v? C.onAkcent:C.sivi,
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
              [LAB_FPY_PCT,     podaci.rty+"%",           C.zelena],
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

          <SpcRtyJednaLinija data={podaci.trend} C={C} height={200} xKey="datum" naslov={LAB_FPY_TREND} />

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

export default MobilniDashboard;
