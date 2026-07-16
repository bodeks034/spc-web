import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { normalizujPrefill8d } from "../../lib/eskalacijeHelper.js";
import { poveziOsmd } from "../../lib/ncrCapa.js";
import { exportOsmdIzvestajPdf, osmdPayloadIzForme, statusNaziv8d, stampajOsmdIzvestaj, exportOsmdIzvestajWord } from "../../lib/osmdIzvestajPdf.js";
import OsmdEditor, { OsmdScrollOkvir } from "../OsmdEditor.jsx";
import { resetujKešPredloga } from "../../lib/predloziIzBaze.js";
import { prefillPfmeaCpIz8d } from "../../lib/osmdPfmeaCpBridge.js";
import { ucitajPfmeaCpPaketZa8d } from "../../lib/osmdPfmeaCpPaket.js";
import { exportKvalitetPaketZip } from "../../lib/kvalitetPaket.js";

export default function OsmDIzvestaj({ korisnik, C, addToast, sviDelovi, prefill, onPrefillUsed, onOtvoriPfmeaCp }) {
  const [izvestaji, setIzvestaji] = useState([]);
  const [aktivni,   setAktivni]   = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(()=>{
    supabase.from("osmd_izvestaji")
      .select("*,kreirao:radnici!osmd_izvestaji_kreirao_id_fkey(ime)")
      .order("created_at",{ascending:false})
      .then(({data})=>{ setIzvestaji(data||[]); setLoading(false); });
  },[]);

  useEffect(() => {
    if (!prefill) return;
    setAktivni(normalizujPrefill8d(prefill));
    onPrefillUsed?.();
  }, [prefill]); // eslint-disable-line

  const sacuvaj = async (form) => {
    const payload = osmdPayloadIzForme(form);
    const isNew = !form.id;
    const op = isNew
      ? supabase.from("osmd_izvestaji").insert({ ...payload, kreirao_id: korisnik.radnikId })
          .select("*,kreirao:radnici!osmd_izvestaji_kreirao_id_fkey(ime)").single()
      : supabase.from("osmd_izvestaji").update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", form.id)
          .select("*,kreirao:radnici!osmd_izvestaji_kreirao_id_fkey(ime)").single();
    const { data, error } = await op;
    if (!error) {
      resetujKešPredloga();
      setIzvestaji(p=>isNew?[data,...p]:p.map(i=>i.id===data.id?data:i));
      setAktivni(data);
      if (form.ncr_id) {
        try {
          await poveziOsmd(supabase, form.ncr_id, data.id);
        } catch { /* ne blokira čuvanje 8D */ }
      }
      addToast(`✓ 8D izveštaj ${isNew?"kreiran":"sačuvan"}`, "uspeh");
      return data;
    }
    addToast(error.message,"greska");
    return null;
  };

  const otvoriPfmeaCp = async (form) => {
    if (!onOtvoriPfmeaCp) {
      addToast?.("PFMEA/CP modul nije dostupan.", "greska");
      return;
    }
    let f = form;
    if (!f?.id) {
      f = await sacuvaj(form);
      if (!f) return;
    }
    const prefillPfmea = prefillPfmeaCpIz8d(f);
    if (!prefillPfmea?.pfmea?.redovi?.length && !prefillPfmea?.controlPlan?.redovi?.length) {
      addToast?.("Nema dovoljno podataka u 8D za prenos — popunite defekt, D4 ili D6.", "greska");
      return;
    }
    onOtvoriPfmeaCp(prefillPfmea);
  };

  const exportPDF8D = async (izv) => {
    try {
      await exportOsmdIzvestajPdf(izv, { naslov: "8D izveštaj o problemu", prefiksFajla: "8D" });
    } catch (e) {
      console.error(e);
      addToast(e?.message || "PDF nije mogao da se generiše", "greska");
    }
  };

  const stampaj8D = async (izv) => {
    try {
      await stampajOsmdIzvestaj(izv, { naslov: "8D izveštaj o problemu" });
    } catch (e) {
      addToast(e?.message || "Štampa nije uspela", "greska");
    }
  };

  const exportWord8D = (izv) => {
    try {
      exportOsmdIzvestajWord(izv, { naslov: "8D izveštaj o problemu", prefiksFajla: "8D" });
      addToast("✓ Word dokument preuzet", "uspeh");
    } catch (e) {
      addToast(e?.message || "Word izvoz nije uspeo", "greska");
    }
  };

  const exportPaketZip = async (form) => {
    let f = form;
    if (!f?.id) {
      f = await sacuvaj(form);
      if (!f) return;
    }
    try {
      const { dokument } = await ucitajPfmeaCpPaketZa8d(supabase, {
        osmdId: f.id,
        broj8d: f.broj_8d,
        idDeo: f.id_deo,
      });
      await exportKvalitetPaketZip(f, dokument);
      addToast("✓ Paket preuzet (ZIP: Word 8D + RPN + Excel PFMEA/CP)", "uspeh");
    } catch (e) {
      console.error(e);
      addToast(e?.message || "Paket nije mogao da se generiše", "greska");
    }
  };

  if (aktivni !== null) {
    return <OsmdEditor izvestaj={aktivni} sviDelovi={sviDelovi}
      onSacuvaj={sacuvaj} onNazad={()=>setAktivni(null)}
      onPDF={exportPDF8D} onWord={exportWord8D} onStampaj={stampaj8D}
      onOtvoriPfmeaCp={onOtvoriPfmeaCp ? otvoriPfmeaCp : undefined}
      onExportPaket={exportPaketZip} supabase={supabase}
      C={C} addToast={addToast}/>;
  }

  return (
    <OsmdScrollOkvir>
    <div style={{ padding: 18, maxWidth: 820, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,gap:8,flexWrap:"wrap"}}>
        <div style={{color:C.tekst,fontSize:14,fontWeight:700,letterSpacing:1}}>8D IZVEŠTAJI</div>
        <button type="button" onClick={()=>setAktivni({})}
          style={{background:C.plava,border:"none",borderRadius:8,color: C.onAkcent,
            fontSize:12,fontWeight:700,padding:"9px 16px",cursor:"pointer"}}>
          + Novi 8D
        </button>
      </div>
      {loading?<div style={{color:C.sivi,fontSize:12,padding:20}}>Učitavanje...</div>
       :!izvestaji.length?(
        <div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>
          Nema izveštaja
        </div>
      ):izvestaji.map(i=>(
        <div key={i.id} onClick={()=>setAktivni(i)}
          style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,
            padding:16,marginBottom:10,cursor:"pointer",transition:"border-color 0.2s"}}
          onMouseEnter={e=>e.currentTarget.style.borderColor=C.plava}
          onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,gap:8,flexWrap:"wrap"}}>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{color:C.tekst,fontWeight:700,fontSize:13}}>
                {i.broj_8d || i.id_deo || "8D"}
              </span>
              {i.broj_reklamacije && (
                <span style={{color:C.sivi,fontSize:10}}>· {i.broj_reklamacije}</span>
              )}
              <span style={{background:i.status==="zavrsen"?`${C.zelena}20`:`${C.zuta}20`,
                color:i.status==="zavrsen"?C.zelena:C.zuta,fontSize:9,
                padding:"2px 8px",borderRadius:10}}>{statusNaziv8d(i.status)}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => stampaj8D(i)}
                style={{background:"none",border:`1px solid ${C.border}`,borderRadius:5,
                  color:C.sivi,fontSize:10,padding:"3px 10px",cursor:"pointer"}}>
                Štampaj
              </button>
              <button type="button" onClick={() => exportPDF8D(i)}
                style={{background:"none",border:`1px solid ${C.plava}55`,borderRadius:5,
                  color:C.plava,fontSize:10,padding:"3px 10px",cursor:"pointer",fontWeight:700}}>
                PDF
              </button>
            </div>
          </div>
          <div style={{color:C.sivi,fontSize:11}}>{i.d2_opis_problema?.substring(0,80)||"—"}</div>
          <div style={{color:C.border,fontSize:10,marginTop:4}}>
            {i.kreirao?.ime} · {new Date(i.created_at).toLocaleDateString("sr-RS")}
          </div>
        </div>
      ))}
    </div>
    </OsmdScrollOkvir>
  );
}
