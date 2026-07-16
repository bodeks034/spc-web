import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { predloziDodeljenogInzenjera } from "../../lib/eskalacijeHelper.js";
import { procitajNavigacijuEskalacije } from "../../lib/workflowAkcije.js";
import { normalizujIdDeo } from "../../lib/idDeoUtil.js";
import { stampajEkran, preuzmiEkranPdf } from "../../lib/listaEkranIzvoz.js";
import { stampajEskalacije, preuzmiEskalacijePdf } from "../../lib/eskalacijePdf.js";
import ListaIzvozDugmad from "../ListaIzvozDugmad.jsx";

export default function EskalacijePanel({ korisnik, C, addToast, sviDelovi, onOtvori8D }) {
  const [eskalacije, setEskalacije] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [forma,      setForma]      = useState(null); // null | 'nova' | {id}
  const [radnici,    setRadnici]    = useState([]);
  const [filter,     setFilter]     = useState("sve");
  const [idDeoFilter, setIdDeoFilter] = useState("");
  const [busyEkran, setBusyEkran] = useState(false);
  const [busyForma, setBusyForma] = useState(false);
  const izvozRef = useRef(null);

  useEffect(() => {
    const nav = procitajNavigacijuEskalacije();
    if (nav?.idDeo) setIdDeoFilter(normalizujIdDeo(nav.idDeo));
    if (nav?.statusFilter) setFilter(nav.statusFilter);
  }, []);

  useEffect(()=>{
    Promise.all([
      supabase.from("eskalacije")
        .select("*,kreirao:radnici!eskalacije_kreirao_id_fkey(ime),dodeljen:radnici!eskalacije_dodeljen_id_fkey(ime)")
        .order("created_at",{ascending:false}),
      supabase.from("radnici").select("id,ime,uloga"),
    ]).then(([e,r])=>{
      setEskalacije(e.data||[]);
      setRadnici(r.data||[]);
      setLoading(false);
    });
  },[]);

  const novaEskalacija = async (form) => {
    let payload = { ...form, kreirao_id: korisnik.radnikId };
    if (!payload.dodeljen_id) {
      const { dodeljen_id } = await predloziDodeljenogInzenjera(supabase);
      payload.dodeljen_id = dodeljen_id;
    }
    const { data, error } = await supabase.from("eskalacije").insert(payload)
      .select("*,kreirao:radnici!eskalacije_kreirao_id_fkey(ime),dodeljen:radnici!eskalacije_dodeljen_id_fkey(ime)").single();
    if (!error) {
      setEskalacije(p=>[data,...p]);
      setForma(null);
      const dodeljen = data.dodeljen?.ime ? ` Dodeljeno: ${data.dodeljen.ime}.` : "";
      addToast(`✓ Eskalacija kreirana.${dodeljen}`,"uspeh");
    } else addToast(error.message,"greska");
  };

  const azuriraj = async (id, izmene) => {
    const { data, error } = await supabase.from("eskalacije").update({
      ...izmene,
      ...(izmene.status==="zatvoren"?{zatvoreno_at:new Date().toISOString()}:{}),
    }).eq("id",id)
      .select("*,kreirao:radnici!eskalacije_kreirao_id_fkey(ime),dodeljen:radnici!eskalacije_dodeljen_id_fkey(ime)")
      .single();
    if (!error) {
      setEskalacije(p=>p.map(e=>e.id===id?data:e));
      addToast("✓ Ažurirano","uspeh");
    }
  };

  const filtrirane = eskalacije.filter((e) => {
    if (filter !== "sve" && e.status !== filter) return false;
    if (idDeoFilter && normalizujIdDeo(e.id_deo) !== idDeoFilter) return false;
    return true;
  });

  const exportOpts = {
    filter,
    idDeo: idDeoFilter,
    naslov: idDeoFilter ? `Eskalacije — ${idDeoFilter}` : "Eskalacije",
  };

  const stampajEkranFn = async () => {
    if (!filtrirane.length) { addToast?.("Nema eskalacija za štampu", "greska"); return; }
    try {
      await stampajEkran(izvozRef.current, { naslov: exportOpts.naslov, bgColor: C.bg });
    } catch (e) {
      addToast?.(e.message || "Štampa greška", "greska");
    }
  };

  const exportPdfEkran = async () => {
    if (!filtrirane.length) { addToast?.("Nema eskalacija za PDF", "greska"); return; }
    setBusyEkran(true);
    try {
      await preuzmiEkranPdf(izvozRef.current, {
        naslov: exportOpts.naslov,
        prefiksFajla: "Eskalacije",
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
    if (!filtrirane.length) { addToast?.("Nema eskalacija za štampu", "greska"); return; }
    try {
      stampajEskalacije(filtrirane, exportOpts);
    } catch (e) {
      addToast?.(e.message || "Štampa greška", "greska");
    }
  };

  const exportPdfForma = async () => {
    if (!filtrirane.length) { addToast?.("Nema eskalacija za PDF", "greska"); return; }
    setBusyForma(true);
    try {
      await preuzmiEskalacijePdf(filtrirane, exportOpts);
      addToast?.("✓ PDF preuzet", "uspeh");
    } catch (e) {
      addToast?.(e.message || "PDF greška", "greska");
    } finally {
      setBusyForma(false);
    }
  };

  const PRIORITET_BOJA = {kriticno:C.crvena,visok:C.narandzasta,srednji:C.zuta,nizak:C.zelena};
  const STATUS_BOJA    = {otvoren:C.crvena,u_toku:C.zuta,zatvoren:C.zelena};

  if (forma==="nova") return (
    <div style={{
      flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch",
    }}>
      <NovaEskalacija korisnik={korisnik} sviDelovi={sviDelovi} radnici={radnici}
        onSnimi={novaEskalacija} onOtkazati={()=>setForma(null)} C={C}/>
    </div>
  );

  return (
    <div ref={izvozRef} style={{
      padding: 18,
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      height: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8,flexShrink:0}}>
        <div style={{color:C.tekst,fontSize:14,fontWeight:700,letterSpacing:1}}>
          ESKALACIJE
          {idDeoFilter && (
            <span style={{ color: C.plava, fontSize: 10, marginLeft: 8, fontWeight: 600 }}>
              · {idDeoFilter}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {idDeoFilter && (
            <button type="button" onClick={() => setIdDeoFilter("")}
              style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.sivi, fontSize: 10, padding: "6px 10px", cursor: "pointer" }}>
              ✕ filter dela
            </button>
          )}
          <ListaIzvozDugmad
            C={C}
            disabled={!filtrirane.length || loading}
            busyEkran={busyEkran}
            busyForma={busyForma}
            akcent={C.plava}
            onStampajEkran={stampajEkranFn}
            onPdfEkran={exportPdfEkran}
            onStampajForma={stampajFormaFn}
            onPdfForma={exportPdfForma}
          />
        <button type="button" onClick={()=>setForma("nova")}
          style={{background:C.crvena,border:"none",borderRadius:8,color: C.onAkcent,
            fontSize:12,fontWeight:700,padding:"9px 16px",cursor:"pointer"}}>
          + Nova eskalacija
        </button>
        </div>
      </div>

      {/* Filter */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexShrink:0,flexWrap:"wrap"}}>
        {[["sve","Sve"],["otvoren","Otvorene"],["u_toku","U toku"],["zatvoren","Zatvorene"]].map(([v,l])=>(
          <button key={v} type="button" onClick={()=>setFilter(v)} style={{
            background:filter===v?C.plava:"none",border:`1px solid ${filter===v?C.plava:C.border}`,
            borderRadius:8,color:filter===v? C.onAkcent:C.sivi,fontSize:11,
            padding:"6px 14px",cursor:"pointer"}}>
            {l}
            {v!=="sve"&&<span style={{marginLeft:4,color:filter===v?"rgba(255,255,255,0.7)":C.border}}>
              ({eskalacije.filter(e=>e.status===v).length})
            </span>}
          </button>
        ))}
      </div>

      <div style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        paddingBottom: 12,
      }}>
      {loading ? <div style={{color:C.sivi,fontSize:12,padding:20}}>Učitavanje...</div>
       : !filtrirane.length ? (
        <div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>
          Nema eskalacija
        </div>
      ) : filtrirane.map(e=>(
        <div key={e.id} style={{background:C.panel,border:`1px solid ${PRIORITET_BOJA[e.prioritet]}30`,
          borderRadius:12,padding:16,marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                <span style={{color:C.tekst,fontWeight:700,fontSize:13}}>{e.id_deo}</span>
                <span style={{background:`${PRIORITET_BOJA[e.prioritet]}20`,
                  color:PRIORITET_BOJA[e.prioritet],fontSize:9,fontWeight:700,
                  padding:"2px 8px",borderRadius:10,letterSpacing:0.5}}>
                  {e.prioritet.toUpperCase()}
                </span>
                <span style={{background:`${STATUS_BOJA[e.status]}20`,
                  color:STATUS_BOJA[e.status],fontSize:9,fontWeight:700,
                  padding:"2px 8px",borderRadius:10,letterSpacing:0.5}}>
                  {e.status.replace("_"," ").toUpperCase()}
                </span>
                {e.rok&&new Date(e.rok)<new Date()&&e.status!=="zatvoren"&&(
                  <span style={{color:C.crvena,fontSize:9}}>⚠ PREKORAČEN ROK</span>
                )}
              </div>
              <div style={{color:C.sivi,fontSize:12,marginBottom:4}}>{e.opis}</div>
              <div style={{display:"flex",gap:12,fontSize:10,color:C.border}}>
                <span>Kreirao: {e.kreirao?.ime||"?"}</span>
                {e.dodeljen&&<span>Dodeljen: {e.dodeljen.ime}</span>}
                {e.rok&&<span>Rok: {e.rok}</span>}
              </div>
            </div>
          </div>

          {e.korektivna_akcija&&(
            <div style={{background:C.zelena+"15",border:`1px solid ${C.zelena}30`,
              borderRadius:6,padding:"8px 12px",marginBottom:10,fontSize:11,color:C.sivi}}>
              <strong style={{color:C.zelena}}>Korektivna akcija:</strong> {e.korektivna_akcija}
            </div>
          )}

          {e.status!=="zatvoren"&&(
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
              {onOtvori8D && (
                <button type="button" onClick={()=>onOtvori8D(e)}
                  style={{background:C.plava+"20",border:`1px solid ${C.plava}40`,borderRadius:7,
                    color:C.plava,fontSize:11,fontWeight:700,padding:"6px 14px",cursor:"pointer"}}>
                  8D →
                </button>
              )}
              {e.status==="otvoren"&&(
                <button type="button" onClick={()=>azuriraj(e.id,{status:"u_toku"})}
                  style={{background:C.zuta+"20",border:`1px solid ${C.zuta}40`,borderRadius:7,
                    color:C.zuta,fontSize:11,fontWeight:700,padding:"6px 14px",cursor:"pointer"}}>
                  → Preuzmi
                </button>
              )}
              <button type="button" onClick={()=>{
                const akcija = prompt("Unesi korektivnu akciju:");
                if (akcija) azuriraj(e.id,{status:"zatvoren",korektivna_akcija:akcija});
              }} style={{background:C.zelena+"20",border:`1px solid ${C.zelena}40`,borderRadius:7,
                color:C.zelena,fontSize:11,fontWeight:700,padding:"6px 14px",cursor:"pointer"}}>
                ✓ Zatvori
              </button>
            </div>
          )}
        </div>
      ))}
      </div>
    </div>
  );
}

function NovaEskalacija({ korisnik, sviDelovi, radnici, onSnimi, onOtkazati, C }) {
  const [form, setForm] = useState({
    id_deo:"", naziv_dela:"", tip:"ucl_probijen",
    opis:"", prioritet:"visok", dodeljen_id:"", rok:"",
  });
  const [dodeljenAuto, setDodeljenAuto] = useState("");
  useEffect(() => {
    predloziDodeljenogInzenjera(supabase).then(({ dodeljen_id, dodeljen_ime }) => {
      if (dodeljen_id) {
        setForm(p => p.dodeljen_id ? p : { ...p, dodeljen_id });
        setDodeljenAuto(dodeljen_ime || "");
      }
    }).catch(() => {});
  }, []);
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));
  const INP = {width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:8,
    color:C.tekst,fontSize:13,padding:"10px 12px",boxSizing:"border-box",
    outline:"none",fontFamily:"inherit"};
  return (
    <div style={{padding:18,maxWidth:560}}>
      <div style={{color:C.tekst,fontSize:14,fontWeight:700,marginBottom:16}}>
        Nova eskalacija
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>ID DELA</div>
            <select value={form.id_deo} onChange={e=>{
              const d=sviDelovi.find(d=>d.id_deo===e.target.value);
              upd("id_deo",e.target.value); upd("naziv_dela",d?.naziv_dela||"");
            }} style={{...INP,cursor:"pointer"}}>
              <option value="">-- Izaberi --</option>
              {sviDelovi.map(d=><option key={d.id_deo} value={d.id_deo}>{d.id_deo}</option>)}
            </select>
          </div>
          <div>
            <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>PRIORITET</div>
            <select value={form.prioritet} onChange={e=>upd("prioritet",e.target.value)}
              style={{...INP,cursor:"pointer"}}>
              <option value="kriticno">🔴 Kritično</option>
              <option value="visok">🟠 Visok</option>
              <option value="srednji">🟡 Srednji</option>
              <option value="nizak">🟢 Nizak</option>
            </select>
          </div>
        </div>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>OPIS PROBLEMA</div>
          <textarea value={form.opis} onChange={e=>upd("opis",e.target.value)}
            placeholder="Detaljno opiši problem..." rows={3}
            style={{...INP,resize:"none"}}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <div>
            <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>DODELI</div>
            <select value={form.dodeljen_id} onChange={e=>upd("dodeljen_id",e.target.value)}
              style={{...INP,cursor:"pointer"}}>
              <option value="">-- Izaberi --</option>
              {radnici.filter(r=>["kvalitet","sef","admin","kontrolor"].includes((r.uloga||"").toLowerCase()))
                .map(r=><option key={r.id} value={r.id}>{r.ime} ({r.uloga})</option>)}
            </select>
            {dodeljenAuto && !form.dodeljen_id && (
              <div style={{color:C.sivi,fontSize:9,marginTop:4}}>Predlog: {dodeljenAuto}</div>
            )}
          </div>
          <div>
            <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>ROK</div>
            <input type="date" value={form.rok} onChange={e=>upd("rok",e.target.value)}
              style={INP}/>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <button onClick={()=>onSnimi(form)} disabled={!form.id_deo||!form.opis}
            style={{flex:1,background:!form.id_deo||!form.opis?C.hover:C.crvena,border:"none",
              borderRadius:8,color:!form.id_deo||!form.opis?C.sivi: C.onAkcent,
              fontSize:13,fontWeight:700,padding:"12px",cursor:"pointer"}}>
            Kreiraj eskalaciju
          </button>
          <button onClick={onOtkazati}
            style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,
              color:C.sivi,fontSize:13,padding:"12px 16px",cursor:"pointer"}}>Otkaži</button>
        </div>
      </div>
    </div>
  );
}
