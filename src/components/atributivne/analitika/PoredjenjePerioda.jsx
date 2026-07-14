import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import { aggregateLogRows } from "../../../lib/spcStats.js";
import { statAtributivneRedovi } from "../../../lib/atributivneAgregacija.js";

export default function PoredjenjePerioda({ idDeo, C, addToast }) {
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
        supabase.from("kontrolni_log").select("ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,inspekcija_id,sesija_id,created_at,id_deo,datum,smena,id")
          .eq("id_deo",idDeo).gte("datum",fmt(od1)).lte("datum",fmt(danas)),
        supabase.from("kontrolni_log").select("ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,inspekcija_id,sesija_id,created_at,id_deo,datum,smena,id")
          .eq("id_deo",idDeo).gte("datum",fmt(od2)).lt("datum",fmt(od1)),
      ]);

      const calc = (rows) => {
        const d = statAtributivneRedovi(rows || []);
        return {
          n: d.n,
          nok: d.nok,
          ok: d.ok,
          rty: d.n > 0 ? d.rty.toFixed(2) : 0,
          p: d.n > 0 ? d.p.toFixed(3) : 0,
          dpmo: d.dpmo,
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
            [LAB_FPY_PCT, podaci.tek.rty, podaci.prev.rty, false, "%"],
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
