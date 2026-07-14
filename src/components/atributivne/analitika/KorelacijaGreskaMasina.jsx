import { useState, useEffect, useCallback } from "react";

export default function KorelacijaGreskaMasina({ rawData, C }) {
  if (!rawData?.length) return (
    <div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>Nema podataka</div>
  );

  // Pivot: greška x mašina
  const masine  = [...new Set(rawData.map(r=>r.masina?.naziv||"?"))].filter(Boolean);
  const greske  = [...new Set(rawData.filter(r=>r.greska_naziv&&r.greska_naziv!=="OK")
    .map(r=>r.greska_naziv))].slice(0,8);
  
  const pivot = {};
  greske.forEach(g=>{ pivot[g]={}; masine.forEach(m=>{ pivot[g][m]=0; }); });
  rawData.forEach(r=>{
    if(r.greska_naziv&&r.greska_naziv!=="OK"&&pivot[r.greska_naziv]){
      const m=r.masina?.naziv||"?";
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
