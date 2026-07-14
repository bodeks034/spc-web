import { useState } from "react";
import { SpcOcKrivaGraf } from "../../SpcAnalitikaGrafovi.jsx";

export default function OCKriva({ C }) {
  const [n,     setN]     = useState(50);
  const [ac,    setAc]    = useState(1);
  const [pRozsah] = useState([0,0.01,0.02,0.03,0.05,0.07,0.1,0.15,0.2,0.25,0.3]);

  // P(X <= Ac | n, p) — binomna kumulativna
  const binomCDF = (n, p, ac) => {
    let sum = 0;
    for (let k = 0; k <= ac; k++) {
      let c = 1;
      for (let i = 0; i < k; i++) c = c * (n-i) / (i+1);
      sum += c * Math.pow(p,k) * Math.pow(1-p,n-k);
    }
    return Math.min(1, sum);
  };

  const ocData = pRozsah.map(p => ({
    p:    +(p*100).toFixed(1),
    pa:   +(binomCDF(n,p,ac)*100).toFixed(2),
    pa5:  +(binomCDF(n,p,Math.max(0,ac-1))*100).toFixed(2),
    pa10: +(binomCDF(n,p,ac+1)*100).toFixed(2),
  }));

  const INP_S = {background:C.input,border:`1px solid ${C.border}`,borderRadius:8,
    color:C.tekst,fontSize:13,padding:"9px 10px",outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"};

  return (
    <div style={{padding:18}}>
      <div style={{color:C.sivi,fontSize:10,letterSpacing:1.5,marginBottom:16}}>
        OC KRIVA — OPERATING CHARACTERISTIC (ISO 2859-1)
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20,maxWidth:400}}>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>VELIČINA UZORKA (n)</div>
          <input type="number" min="5" max="500" value={n}
            onChange={e=>setN(Number(e.target.value))} style={INP_S}/>
        </div>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>KRITERIJUM (Ac)</div>
          <input type="number" min="0" max="20" value={ac}
            onChange={e=>setAc(Number(e.target.value))} style={INP_S}/>
        </div>
      </div>
      <div style={{color:C.sivi,fontSize:11,marginBottom:14}}>
        n={n}, Ac={ac} — Verovatnoća prihvatanja lota u zavisnosti od stvarnog % neispravnih
      </div>
      <SpcOcKrivaGraf data={ocData} C={C} ac={ac} height={360} />
      <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,padding:14,marginTop:14}}>
        <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:10}}>KLJUČNE TAČKE</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8}}>
          {ocData.filter((_,i)=>[0,3,5,7,9].includes(i)).map(d=>(
            <div key={d.p} style={{background:C.bg,borderRadius:7,padding:"8px 12px",fontSize:11}}>
              <span style={{color:C.sivi}}>p={d.p}% → </span>
              <span style={{color:d.pa>50?C.zelena:C.crvena,fontWeight:700}}>Pa={d.pa}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── STABILNOST PROCESA ───────────────────────────────────────
