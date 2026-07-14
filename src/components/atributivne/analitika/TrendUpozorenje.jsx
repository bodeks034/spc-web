import { useState, useEffect, useCallback } from "react";

export default function TrendUpozorenje({ podaci, C }) {
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
