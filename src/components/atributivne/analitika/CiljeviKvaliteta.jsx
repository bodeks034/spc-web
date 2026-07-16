import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import { statAtributivneRedovi } from "../../../lib/atributivneAgregacija.js";
import { LAB_FPY_PCT, LAB_FPY_CILJ } from "../../../lib/rtyFpy.js";
import { stampajEkran, preuzmiEkranPdf } from "../../../lib/listaEkranIzvoz.js";
import { stampajCiljevi, preuzmiCiljeviPdf } from "../../../lib/ciljeviPdf.js";
import ListaIzvozDugmad from "../../ListaIzvozDugmad.jsx";

export default function CiljeviKvaliteta({ C, addToast, sviDelovi }) {
  const [ciljevi,  setCiljevi]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [forma,    setForma]    = useState(false);
  const [busyEkran, setBusyEkran] = useState(false);
  const [busyForma, setBusyForma] = useState(false);
  const izvozRef = useRef(null);
  const [aktuelni, setAktuelni] = useState({id_deo:"",rty_cilj:95,dpmo_cilj:50000,p_cilj:5.0,napomena:""});
  const [ostvaren, setOstvaren] = useState({});

  useEffect(()=>{
    Promise.all([
      supabase.from("ciljevi").select("*").order("vazi_od",{ascending:false}),
    ]).then(([c])=>{ setCiljevi(c.data||[]); setLoading(false); });
    // Učitaj ostvareno za sve delove - poslednih 30 dana
    const od = new Date(); od.setDate(od.getDate()-30);
    supabase.from("kontrolni_log")
      .select("id_deo,ok_kolicina,nok_kolicina,ukupno_merenja,inspekcija_id,sesija_id,created_at,id,datum,smena")
      .gte("datum", od.toISOString().split("T")[0])
      .then(({data})=>{
        const mapa={};
        (data||[]).forEach(r=>{
          if(!mapa[r.id_deo])mapa[r.id_deo]=[];
          mapa[r.id_deo].push(r);
        });
        const rez={};
        Object.entries(mapa).forEach(([id,rows])=>{
          const d = statAtributivneRedovi(rows);
          rez[id]={
            rty:  d.n>0?d.rty.toFixed(1):null,
            dpmo: d.n>0?d.dpmo:null,
            p:    d.n>0?d.p.toFixed(2):null,
          };
        });
        setOstvaren(rez);
      });
  },[]);

  const snimi = async () => {
    const { data, error } = await supabase.from("ciljevi").insert({
      ...aktuelni, vazi_od: new Date().toISOString().split("T")[0]
    }).select().single();
    if (!error) {
      setCiljevi(p=>[data,...p]); setForma(false);
      addToast("✓ Cilj postavljen","uspeh");
    } else addToast(error.message,"greska");
  };

  const INP = {width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:8,
    color:C.tekst,fontSize:13,padding:"10px 12px",boxSizing:"border-box",outline:"none",fontFamily:"inherit"};

  const getIndikator = (ostvarena, cilj, manji_je_bolji=false) => {
    if (ostvarena === null || ostvarena === undefined) return null;
    const v = parseFloat(ostvarena);
    const c = parseFloat(cilj);
    if (manji_je_bolji) return v <= c ? C.zelena : v <= c*1.2 ? C.zuta : C.crvena;
    return v >= c ? C.zelena : v >= c*0.9 ? C.zuta : C.crvena;
  };

  const exportOpts = { naslov: "Ciljevi kvaliteta", ostvaren };

  const stampajEkranFn = async () => {
    if (!ciljevi.length) { addToast?.("Nema ciljeva za štampu", "greska"); return; }
    try {
      await stampajEkran(izvozRef.current, { naslov: exportOpts.naslov, bgColor: C.bg });
    } catch (e) {
      addToast?.(e.message || "Štampa greška", "greska");
    }
  };

  const exportPdfEkran = async () => {
    if (!ciljevi.length) { addToast?.("Nema ciljeva za PDF", "greska"); return; }
    setBusyEkran(true);
    try {
      await preuzmiEkranPdf(izvozRef.current, {
        naslov: exportOpts.naslov,
        prefiksFajla: "Ciljevi",
        bgColor: C.bg,
      });
      addToast?.("✓ PDF preuzet", "uspeh");
    } catch (e) {
      addToast?.(e.message || "PDF greška", "greska");
    } finally {
      setBusyEkran(false);
    }
  };

  const stampajFormaFn = () => {
    if (!ciljevi.length) { addToast?.("Nema ciljeva za štampu", "greska"); return; }
    try {
      stampajCiljevi(ciljevi, exportOpts);
    } catch (e) {
      addToast?.(e.message || "Štampa greška", "greska");
    }
  };

  const exportPdfForma = async () => {
    if (!ciljevi.length) { addToast?.("Nema ciljeva za PDF", "greska"); return; }
    setBusyForma(true);
    try {
      await preuzmiCiljeviPdf(ciljevi, exportOpts);
      addToast?.("✓ PDF preuzet", "uspeh");
    } catch (e) {
      addToast?.(e.message || "PDF greška", "greska");
    } finally {
      setBusyForma(false);
    }
  };

  return (
    <div ref={izvozRef} style={{padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,gap:8,flexWrap:"wrap"}}>
        <div style={{color:C.tekst,fontSize:14,fontWeight:700,letterSpacing:1}}>CILJEVI KVALITETA</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <ListaIzvozDugmad
            C={C}
            disabled={!ciljevi.length || loading}
            busyEkran={busyEkran}
            busyForma={busyForma}
            akcent={C.plava}
            onStampajEkran={stampajEkranFn}
            onPdfEkran={exportPdfEkran}
            onStampajForma={stampajFormaFn}
            onPdfForma={exportPdfForma}
          />
          <button type="button" onClick={()=>setForma(true)}
            style={{background:C.zelena,border:"none",borderRadius:8,color: C.onAkcent,
              fontSize:12,fontWeight:700,padding:"9px 16px",cursor:"pointer"}}>
            + Postavi cilj
          </button>
        </div>
      </div>

      {forma && (
        <div style={{background:C.panel,border:`1px solid ${C.zelena}40`,borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{color:C.tekst,fontSize:13,fontWeight:700,marginBottom:12}}>Novi cilj kvaliteta</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>ID DELA</div>
              <select value={aktuelni.id_deo} onChange={e=>setAktuelni(p=>({...p,id_deo:e.target.value}))}
                style={{...INP,cursor:"pointer"}}>
                <option value="">-- Izaberi --</option>
                {sviDelovi.map(d=><option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>)}
              </select>
            </div>
            <div>
              <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>{LAB_FPY_CILJ}</div>
              <input type="number" min="0" max="100" step="0.1"
                value={aktuelni.rty_cilj} onChange={e=>setAktuelni(p=>({...p,rty_cilj:e.target.value}))} style={INP}/>
            </div>
            <div>
              <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>DPMO CILJ</div>
              <input type="number" min="0"
                value={aktuelni.dpmo_cilj} onChange={e=>setAktuelni(p=>({...p,dpmo_cilj:e.target.value}))} style={INP}/>
            </div>
            <div>
              <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>p CILJ %</div>
              <input type="number" min="0" max="100" step="0.01"
                value={aktuelni.p_cilj} onChange={e=>setAktuelni(p=>({...p,p_cilj:e.target.value}))} style={INP}/>
            </div>
          </div>
          <input value={aktuelni.napomena} onChange={e=>setAktuelni(p=>({...p,napomena:e.target.value}))}
            placeholder="Napomena..." style={{...INP,marginBottom:10}}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={snimi} disabled={!aktuelni.id_deo}
              style={{flex:1,background:aktuelni.id_deo?C.zelena:C.hover,border:"none",borderRadius:8,
                color:aktuelni.id_deo? C.onAkcent:C.sivi,fontSize:13,fontWeight:700,padding:"11px",cursor:"pointer"}}>
              Postavi cilj
            </button>
            <button onClick={()=>setForma(false)} style={{background:"none",border:`1px solid ${C.border}`,
              borderRadius:8,color:C.sivi,fontSize:13,padding:"11px 16px",cursor:"pointer"}}>Otkaži</button>
          </div>
        </div>
      )}

      {loading ? <div style={{color:C.sivi,fontSize:12,padding:20}}>Učitavanje...</div>
       : !ciljevi.length ? (
        <div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>Nema postavljenih ciljeva</div>
      ) : ciljevi.map(c => {
        const ost = ostvaren[c.id_deo] || {};
        return (
          <div key={c.id} style={{background:C.panel,border:`1px solid ${C.border}`,
            borderRadius:12,padding:16,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <span style={{color:C.tekst,fontWeight:700,fontSize:14}}>{c.id_deo}</span>
                <span style={{color:C.sivi,fontSize:11,marginLeft:8}}>od {c.vazi_od}</span>
              </div>
              {c.napomena && <span style={{color:C.border,fontSize:11}}>{c.napomena}</span>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {[
                [LAB_FPY_PCT, c.rty_cilj+"%", ost.rty, false],
                ["DPMO",  c.dpmo_cilj,    ost.dpmo, true],
                ["p %",   c.p_cilj+"%",   ost.p,    true],
              ].map(([naziv, cilj, ostvareno, manjiBolje]) => {
                const boja = getIndikator(ostvareno, parseFloat(cilj), manjiBolje);
                return (
                  <div key={naziv} style={{background:C.bg,borderRadius:8,padding:"10px 12px"}}>
                    <div style={{color:C.sivi,fontSize:9,letterSpacing:1,marginBottom:4}}>{naziv}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                      <div>
                        <div style={{color:C.border,fontSize:9,marginBottom:2}}>Cilj: {cilj}</div>
                        <div style={{color:boja||C.tekst,fontSize:16,fontWeight:700}}>
                          {ostvareno !== null && ostvareno !== undefined ? ostvareno+(naziv==="DPMO"?"":"") : "—"}
                        </div>
                      </div>
                      {boja && <span style={{fontSize:16}}>{boja===C.zelena?"✓":boja===C.zuta?"~":"✗"}</span>}
                    </div>
                    {ostvareno !== null && (
                      <div style={{background:C.hover,borderRadius:2,height:3,marginTop:6}}>
                        <div style={{background:boja,borderRadius:2,height:3,
                          width:`${Math.min(100, manjiBolje
                            ? Math.max(0,(1-parseFloat(ostvareno)/parseFloat(cilj))*100)
                            : Math.min(100,(parseFloat(ostvareno)/parseFloat(cilj))*100)
                          )}%`,transition:"width 0.5s"}}/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── IZVEŠTAJ ZA KUPCA ────────────────────────────────────────
