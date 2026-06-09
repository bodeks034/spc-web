// ============================================================
// SPC ATRIBUTIVNE v3 — Fixes + Crtež dela + SPC karte sa
// pravim crtanjem linija, zoom, pan
// npm install @supabase/supabase-js recharts jspdf html2canvas
// ============================================================
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  mirrorKontrolniLogToExcel,
  exportKontrolniLogExcel,
  exportMasterWorkbook,
  importWorkbookToSupabase,
  previewImport,
  readWorkbookFromFile,
  downloadWorkbook,
  EXCEL_BUCKET,
  KONTROLNI_LOG_FILE,
  IMPORT_SHEETS,
} from "./lib/excelSync.js";
import {
  INSPECTION_LEVELS, INSPECTION_TYPES, DEFECT_KLASE, planUzorka, planZaKlasu, aqlOdluka, kombinovanaOdluka,
  DEFAULT_AQL_LOT_SIZE, ucitajAqlLotVelicina, snimiAqlLotVelicina,
  ucitajAqlPodesavanja, snimiAqlPodesavanja, lotVelicinaZaAql,
} from "./lib/aqlIso2859.js";
import {
  westernElectric, aggregateLogRows, groupSpcRows, buildParetoFromLog,
  pendingFromLista, mergeSmenaStat, fetchSmenaStat, fetchAktuelniCilj, fetchDeoStatDanas,
  nokPoAqlKlasi, kreirajAutoEskalaciju, upisiSpcAlarm, chartDataWithWesternElectric,
  calcDPMO, calcRTY,
} from "./lib/spcStats.js";
import { ucitajPrikazSliku, storagePutanjaSlike, STORAGE_BUCKET } from "./lib/slikePaths.js";
import {
  jeKontrolaCelogVozila,
  predlogAtributivnihKarti,
  jeVodicSakriven,
  sakrijVodic,
} from "./lib/spcPredlogKarti.js";
import SpcVodicPredlog, { tabJePreporucen } from "./components/SpcVodicPredlog.jsx";
import SpcKontrolnaGraf from "./components/SpcKontrolnaGraf.jsx";
import {
  SpcParetoGraf, SpcOkNokBarGraf, SpcRtyTrendGraf, SpcRtyJednaLinija,
  SpcOcKrivaGraf, SpcStabilnostGraf,
} from "./components/SpcAnalitikaGrafovi.jsx";
import {
  ComposedChart, BarChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend, Cell
} from "recharts";
import VarijabilneForma from "./VarijabilneForma.jsx";
import UnosPokaYokeKorak from "./components/UnosPokaYokeKorak.jsx";
import AtrCrtezPregled from "./components/AtrCrtezPregled.jsx";
import MerljiveExcelPanel from "./MerljiveExcelPanel.jsx";
import { KontrolnaLista, ZahtevPrekid, ucitajOdobrenPrekid } from "./lib/kontrolaSesije.jsx";
import {
  setListaOkSession,
  clearListaOkSession,
  getListaOkSession,
  procitajSmenuIzStorage,
} from "./lib/kontrolaLista.js";
import SkartDoradaOeePanel, { OeeKpiTab } from "./components/SkartDoradaOeePanel.jsx";
import { podrazumevaniKpiIzListeP } from "./lib/oeeKpi.js";
import { snimiKpiUnos, porukaKpiGreske, fetchKpiUnos, agregirajKpiUnos, dodajKpiBlokPdf } from "./lib/kpiUnos.js";
import { useOfflineQueue } from "./lib/offlineQueue.js";
import { ensureSesija, novaSesija, clearSveSesije, getAktivnaSesija } from "./lib/spcSesija.js";
import SchemaStatusPanel from "./components/SchemaStatusPanel.jsx";
import ZajednickiDashboard from "./components/ZajednickiDashboard.jsx";
import InteligencijaDeoPanel from "./components/InteligencijaDeoPanel.jsx";
import { procitajNavigaciju8d, predloziDodeljenogInzenjera, prefill8dIzEskalacije } from "./lib/eskalacijeHelper.js";
import { fetchPlaniranoKomZaDeo } from "./lib/zajednickiDashboard.js";
import { parsiBarkod, primeniParsiraniBarkod, useBarcodeScanner, idBarkodInputHandleri } from "./lib/barkod.js";
import {
  ucitajAktivniRadniNalog,
  ucitajNalogZaDeoIRn,
  izaberiRadniNalog,
  proveriRadniNalogUpozorenje,
  formatNalogToast,
} from "./lib/radniNalog.js";
import IdDeoBarkodRed from "./components/IdDeoBarkodRed.jsx";
import SmenaIdUnosRed from "./components/SmenaIdUnosRed.jsx";
import {
  ucitajPodesavanjaNotifikacija,
  obradiAlarmeNotifikacije,
  zatraziBrowserDozvolu,
} from "./lib/notifikacije.js";
import NotifikacijePodesavanja from "./components/NotifikacijePodesavanja.jsx";
import MeriloBarkodUputstvo from "./components/MeriloBarkodUputstvo.jsx";
import AdminKalibracijaPanel from "./components/AdminKalibracijaPanel.jsx";
import SpcBaselinePanel from "./components/SpcBaselinePanel.jsx";
import RadniNaloziPanel from "./components/RadniNaloziPanel.jsx";
import {
  ucitajAktivniBaseline,
  primeniBaselineNaPodatke,
  formatBaselineBadge,
} from "./lib/spcBaseline.js";
import OfflineSyncPanel from "./components/OfflineSyncPanel.jsx";
import TrasabilitetPanel from "./components/TrasabilitetPanel.jsx";
import useAdminZahtevNotifikacije from "./hooks/useAdminZahtevNotifikacije.js";
import {
  mozeTabAtributivne, opisUloge, podrazumevaniRezim, mozePrebacivanjeRezima,
  mozeAnalitika, jeLinijaUloga, efektivniRezimRada, jeAdmin, jeKvalitetIliVise,
  jeKontrolorLinija, pocetniKorakUnosAtr,
} from "./lib/uloge.js";
import { useEkran } from "./lib/useEkran.js";
import { stilOmotLinija, onFocusTastatura } from "./layout/tastaturaMobil.js";
import { dp } from "./layout/dp.js";
import { TELEFON } from "./layout/tokens/telefon.js";
import { TABLET } from "./layout/tokens/tablet.js";
import LinijaDonjaTraka, { DugmeTraka } from "./components/LinijaDonjaTraka.jsx";
import LinijaWizardNav, { KORACI_ATRIB_LINIJA, KORACI_ATRIB_KONTROLOR } from "./components/LinijaWizardNav.jsx";
import VoziloZonaNav from "./components/VoziloZonaNav.jsx";
import { dijagramSrcZaDeo } from "./lib/voziloDijagramConfig.js";
import {
  buildGreskeKatalog,
  filtrirajGreskeZaDeo,
  filtrirajKatalogVozilaZaUnos,
} from "./lib/katalogFilter.js";
import { porukaDbGreske } from "./lib/dbGreske.js";
import { supabase } from "./lib/supabaseClient.js";
import useLicencaGate from "./hooks/useLicencaGate.js";
import LicencaBlokada from "./components/LicencaBlokada.jsx";
import LicencaUpozorenje from "./components/LicencaUpozorenje.jsx";
import LicencaStatusPanel from "./components/LicencaStatusPanel.jsx";
import ModulBlokiran from "./components/ModulBlokiran.jsx";
import { modulDozvoljen } from "./lib/licenca.js";
import AppHeader from "./components/AppHeader.jsx";
import LogoFirme from "./components/LogoFirme.jsx";
import BrendingNaslov from "./components/BrendingNaslov.jsx";
import AppFooter from "./components/AppFooter.jsx";
import OProgramuPanel from "./components/OProgramuPanel.jsx";

const RADNIK_SELECT = "ime,uloga,id,user_id,email,aktivan";

function radnikJeAktivan(r) {
  return !!r && r.aktivan !== false;
}

async function nadjiRadnikaPoEmail(supabase, email) {
  const e = (email || "").trim().toLowerCase();
  if (!e) return null;
  const alt = e.includes("@fabrika.com")
    ? e.replace("@fabrika.com", "@fabrika.rs")
    : e.replace("@fabrika.rs", "@fabrika.com");

  for (const em of [e, alt]) {
    const { data } = await supabase.from("radnici")
      .select(RADNIK_SELECT).eq("email", em).maybeSingle();
    if (data) return data;
    const { data: ilike } = await supabase.from("radnici")
      .select(RADNIK_SELECT).ilike("email", em).maybeSingle();
    if (ilike) return ilike;
  }
  return null;
}

async function ucitajRadnika(user) {
  if (!user) return null;
  const email = (user.email || "").trim().toLowerCase();

  let { data: r } = await supabase.from("radnici")
    .select(RADNIK_SELECT).eq("user_id", user.id).maybeSingle();

  if (!r && email) {
    r = await nadjiRadnikaPoEmail(supabase, email);
    if (r) {
      if (!radnikJeAktivan(r)) {
        // deaktiviran — ne povezuj Auth UID
      } else if (!r.user_id) {
        const { error: linkErr } = await supabase.from("radnici")
          .update({ user_id: user.id, email })
          .eq("id", r.id);
        if (!linkErr) r = { ...r, user_id: user.id, email };
      } else if (r.user_id !== user.id) {
        r = null;
      }
    }
  }

  const deaktiviran = !!r && !radnikJeAktivan(r);
  const ulogaRaw = (r?.uloga || "kontrolor").toLowerCase().trim();
  const uloga = ["admin", "kontrolor", "operator", "kvalitet", "sef"].includes(ulogaRaw) ? ulogaRaw : "kontrolor";

  return {
    id: user.id,
    email: user.email,
    ime: r?.ime || user.email?.split("@")[0] || "Korisnik",
    uloga,
    radnikId: deaktiviran ? null : (r?.id ?? null),
    deaktiviran,
    userLinked: !!r?.user_id,
  };
}

function ocistiRedZaInsert(row) {
  const { id, created_at, ...rest } = row;
  return rest;
}

function ocistiUnosDraft() {
  localStorage.removeItem("spc_draft_id");
  localStorage.removeItem("spc_draft_g");
  localStorage.removeItem("spc_draft_p");
  localStorage.removeItem("spc_rn");
  clearSveSesije();
}

function normalizujUlogu(uloga) {
  return (uloga || "kontrolor").toLowerCase().trim();
}

// ─── TEMA ────────────────────────────────────────────────────
const TEME = {
  tamna:  { bg:"#1c2333", panel:"#242e42", border:"#3d4f6a",
    plava:"#58a6ff", zelena:"#3fb950", crvena:"#f85149",
    zuta:"#d29922", narandzasta:"#f0883e", tekst:"#eaf0fb",
    sivi:"#9aa8bc", ljubicasta:"#bc8cff", ok:"#0f2d1a", nok:"#2d1010",
    input:"#1c2333", hover:"#2d3a50", naziv:"tamna" },
  svetla: { bg:"#dde2e8", panel:"#eaeef2", border:"#a8b4c4",
    plava:"#0969da", zelena:"#1a7f37", crvena:"#cf222e",
    zuta:"#9a6700", narandzasta:"#bc4c00", tekst:"#18202e",
    sivi:"#485666", ljubicasta:"#6639ba", ok:"#baeeca", nok:"#f5cccc",
    input:"#d8dde4", hover:"#cdd2da", naziv:"svetla" },
};

function dISO()    { return new Date().toISOString().split("T")[0]; }
function dPrikaz() { return new Date().toLocaleDateString("sr-RS",{day:"2-digit",month:"2-digit",year:"numeric"}); }

function lokacijaDela(deo, linije, masine) {
  if (!deo) return { linija: "-", masina: "-" };
  const linija = deo.linija?.linija
    ?? linije?.find(l => l.id === deo.linija_id)?.linija
    ?? "-";
  const masina = deo.masina?.naziv
    ?? masine?.find(m => m.id === deo.masina_id)?.naziv
    ?? "-";
  return { linija, masina };
}

function vreme()   { return new Date().toLocaleTimeString("sr-RS",{hour:"2-digit",minute:"2-digit"}); }

function mozeAdmin(uloga) {
  return normalizujUlogu(uloga) === "admin";
}

// ─── TOAST ───────────────────────────────────────────────────
function Toast({poruke,C}) {
  return(
    <div style={{position:"fixed",bottom:20,right:20,zIndex:1400,display:"flex",flexDirection:"column",gap:8}}>
      {poruke.map((p,i)=>(
        <div key={i} style={{background:C.panel,border:`1px solid ${p.tip==="uspeh"?C.zelena:p.tip==="greska"?C.crvena:C.border}`,
          borderRadius:8,padding:"10px 16px",fontSize:12,color:C.tekst,
          boxShadow:"0 4px 20px rgba(0,0,0,0.4)",minWidth:220,
          borderLeft:`3px solid ${p.tip==="uspeh"?C.zelena:p.tip==="greska"?C.crvena:C.plava}`}}>
          {p.tekst}
        </div>
      ))}
    </div>
  );
}

// ─── MODAL ───────────────────────────────────────────────────
function Modal({poruka,tip,onOK,onOtkazati,okTekst="OK",C}) {
  const boja=tip==="uspeh"?C.zelena:tip==="greska"?C.crvena:C.plava;
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}}>
      <div style={{background:C.panel,border:`1px solid ${boja}`,borderRadius:12,padding:"30px 34px",maxWidth:420,textAlign:"center"}}>
        <div style={{color:boja,fontSize:28,marginBottom:10}}>{tip==="uspeh"?"✓":tip==="greska"?"✗":"ℹ"}</div>
        <div style={{color:C.tekst,fontSize:13,lineHeight:1.7,marginBottom:20,whiteSpace:"pre-line"}}>{poruka}</div>
        <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={onOK} style={{background:boja,border:"none",borderRadius:6,color:"#fff",fontSize:13,fontWeight:700,padding:"9px 24px",cursor:"pointer"}}>{okTekst}</button>
          {onOtkazati&&<button onClick={onOtkazati} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,color:C.sivi,fontSize:12,padding:"9px 16px",cursor:"pointer"}}>Otkaži</button>}
        </div>
      </div>
    </div>
  );
}

// ─── ALARM BANNER ────────────────────────────────────────────
function AlarmBanner({poruka,onClose,C}) {
  return(
    <div style={{position:"fixed",top:0,left:0,right:0,zIndex:1500,background:C.crvena,
      padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",
      boxShadow:`0 4px 20px ${C.crvena}60`}}>
      <div style={{color:"#fff",fontWeight:700,fontSize:13,letterSpacing:1}}>🚨 ALARM — {poruka}</div>
      <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"1px solid rgba(255,255,255,0.4)",
        borderRadius:5,color:"#fff",fontSize:11,padding:"4px 12px",cursor:"pointer"}}>Potvrdi</button>
    </div>
  );
}

// ─── CRTEŽ DELA (SVG viewer sa zoom/pan + anotacije) ─────────
function CrtezDela({ deoInfo, C, onNazad, onSlikaSnimljena, addToast }) {
  const [slika, setSlika]       = useState(null);
  const [status, setStatus]     = useState("idle"); // idle | loading | ok | missing | error
  const [zoom, setZoom]         = useState(1);
  const [pan, setPan]           = useState({ x:0, y:0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x:0, y:0 });
  const [anotacije, setAnotacije] = useState([]);
  const [dodajeAn, setDodajeAn] = useState(false);
  const [novaAn, setNovaAn]     = useState("");
  const [uploading, setUploading] = useState(false);
  const containerRef = useRef(null);
  const fileRef      = useRef(null);

  const ucitajCrtez = useCallback(async () => {
    if (!deoInfo) {
      setSlika(null);
      setStatus("idle");
      return;
    }
    if (!deoInfo.slika_naziv) {
      setSlika(null);
      setStatus("missing");
      return;
    }
    setStatus("loading");
    setSlika(null);
    const url = await ucitajPrikazSliku(supabase, "atributivne", deoInfo.slika_naziv);
    if (url) {
      setSlika(url);
      setStatus("ok");
    } else {
      setSlika(null);
      setStatus("error");
    }
  }, [deoInfo]);

  useEffect(() => { ucitajCrtez(); }, [ucitajCrtez]);

  const uploadSliku = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !deoInfo) return;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const naziv = storagePutanjaSlike("atributivne", `${deoInfo.id_deo}.${ext}`);
    setUploading(true);
    try {
      const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(naziv, file, { upsert: true });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("delovi").update({ slika_naziv: naziv }).eq("id_deo", deoInfo.id_deo);
      if (dbErr) throw dbErr;
      onSlikaSnimljena?.(naziv);
      const url = await ucitajPrikazSliku(supabase, "atributivne", naziv);
      if (url) {
        setSlika(url);
        setStatus("ok");
        addToast?.("✓ Crtež uvezen i sačuvan", "uspeh");
      } else {
        setStatus("error");
        addToast?.("Fajl je uploadovan, ali pregled nije učitan — osveži stranicu.", "greska");
      }
    } catch (err) {
      setStatus("error");
      addToast?.(err.message || "Greška pri uvozu crteža", "greska");
    } finally {
      setUploading(false);
    }
  };

  // Zoom wheel
  const onWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.min(5, Math.max(0.3, z - e.deltaY * 0.001)));
  };

  // Pan
  const onMouseDown = (e) => { setDragging(true); setDragStart({x:e.clientX-pan.x,y:e.clientY-pan.y}); };
  const onMouseMove = (e) => { if(dragging) setPan({x:e.clientX-dragStart.x,y:e.clientY-dragStart.y}); };
  const onMouseUp   = ()  => setDragging(false);

  // Klik za anotaciju
  const onKlik = (e) => {
    if (!dodajeAn || !novaAn) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left - pan.x) / zoom);
    const y = ((e.clientY - rect.top  - pan.y) / zoom);
    setAnotacije(prev => [...prev, { x, y, tekst: novaAn, id: Date.now() }]);
    setNovaAn(""); setDodajeAn(false);
  };

  const resetView = () => { setZoom(1); setPan({x:0,y:0}); };

  const loading = status === "loading" || uploading;
  const prikaziUvoz = status === "missing" || status === "error";

  const panelUvoz = () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "100%", flexDirection: "column", gap: 12, padding: 24, textAlign: "center" }}>
      <span style={{ fontSize: 48 }}>📐</span>
      {status === "error" ? (
        <>
          <div style={{ color: C.zuta, fontSize: 13, fontWeight: 700 }}>Crtež nije pronađen</div>
          <div style={{ color: C.sivi, fontSize: 11, maxWidth: 360, lineHeight: 1.5 }}>
            U bazi je <strong style={{ color: C.tekst }}>{deoInfo.slika_naziv}</strong>, ali fajl nije u Storage-u
            ni u <code>public/slike/atributivne/</code>. Uvezi sliku ručno.
          </div>
        </>
      ) : (
        <>
          <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700 }}>Nema crteža za {deoInfo.id_deo}</div>
          <div style={{ color: C.sivi, fontSize: 11 }}>Uvezi SOP sliku / crtež dela.</div>
        </>
      )}
      <button type="button" onClick={() => fileRef.current?.click()} disabled={loading}
        style={{ background: C.plava, border: "none", borderRadius: 8, color: "#fff",
          fontSize: 13, fontWeight: 700, padding: "11px 22px", cursor: loading ? "wait" : "pointer" }}>
        {uploading ? "Uvozim…" : "📎 Uvezi crtež ručno"}
      </button>
      <span style={{ color: C.sivi, fontSize: 10 }}>PNG, JPG, WEBP, SVG</span>
      {onNazad && (
        <button type="button" onClick={onNazad}
          style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.sivi, fontSize: 12, padding: "9px 18px", cursor: "pointer", marginTop: 4 }}>
          ← Nazad na UNOS
        </button>
      )}
    </div>
  );

  if (!deoInfo) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",
      height:"100%",color:C.border,flexDirection:"column",gap:8,fontSize:11}}>
      <span style={{fontSize:28}}>📐</span>
      <span>Unesi ID dela za prikaz crteža</span>
      {onNazad && (
        <button type="button" onClick={onNazad}
          style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.sivi, fontSize: 11, padding: "8px 14px", cursor: "pointer" }}>
          ← Nazad na UNOS
        </button>
      )}
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",gap:0}}>
      {/* Toolbar */}
      <div style={{display:"flex",gap:8,padding:"8px 12px",borderBottom:`1px solid ${C.border}`,
        background:C.panel,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{color:C.sivi,fontSize:10,flex:1}}>
          {deoInfo.slika_naziv || "Nema crteža"}
        </span>
        <button onClick={resetView} style={toolBtn(C)}>⊡ Reset</button>
        <button onClick={()=>setZoom(z=>Math.min(5,z+0.2))} style={toolBtn(C)}>+ Zoom</button>
        <span style={{color:C.sivi,fontSize:10,minWidth:40,textAlign:"center"}}>{Math.round(zoom*100)}%</span>
        <button onClick={()=>setZoom(z=>Math.max(0.3,z-0.2))} style={toolBtn(C)}>− Zoom</button>
        <button onClick={()=>setDodajeAn(!dodajeAn)}
          style={{...toolBtn(C), background:dodajeAn?C.zuta+"30":"none",
            borderColor:dodajeAn?C.zuta:C.border, color:dodajeAn?C.zuta:C.sivi}}>
          ✏ Anotacija
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={loading} style={toolBtn(C)}>
          {uploading ? "Uvoz…" : "📎 Uvezi ručno"}
        </button>
        {onNazad && (
          <button type="button" onClick={onNazad} style={toolBtn(C)}>← UNOS</button>
        )}
        <input ref={fileRef} type="file" accept="image/*,.svg,.webp"
          onChange={uploadSliku} style={{display:"none"}}/>
      </div>

      {/* Anotacija input */}
      {dodajeAn && (
        <div style={{padding:"6px 12px",background:C.zuta+"15",borderBottom:`1px solid ${C.zuta}30`,
          display:"flex",gap:8,alignItems:"center"}}>
          <span style={{color:C.zuta,fontSize:10}}>✏ Unesi tekst pa klikni na crtež:</span>
          <input value={novaAn} onChange={e=>setNovaAn(e.target.value)}
            placeholder="npr. LSL = 9.8mm"
            style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:4,
              color:C.tekst,fontSize:11,padding:"4px 8px",outline:"none",flex:1}}/>
          <button onClick={()=>{setDodajeAn(false);setNovaAn("");}}
            style={{background:"none",border:"none",color:C.sivi,cursor:"pointer",fontSize:12}}>✕</button>
        </div>
      )}

      {/* Canvas */}
      <div ref={containerRef} style={{flex:1,overflow:"hidden",position:"relative",
        cursor:dodajeAn?"crosshair":dragging?"grabbing":"grab",
        background:C.bg}}
        onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onClick={onKlik}>

        {status === "loading" ? (
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",
            height:"100%",color:C.sivi,fontSize:11}}>Učitavanje crteža…</div>
        ) : prikaziUvoz ? (
          panelUvoz()
        ) : slika && status === "ok" ? (
          <div style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
            transformOrigin:"top left",position:"absolute",userSelect:"none"}}>
            <img src={slika} alt="crtež" draggable={false}
              onError={() => { setSlika(null); setStatus("error"); }}
              style={{maxWidth:"100%",display:"block",
                borderRadius:4, boxShadow:"0 2px 12px rgba(0,0,0,0.4)"}}/>
            {/* SVG anotacije */}
            <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",
              pointerEvents:"none",overflow:"visible"}}>
              {anotacije.map(a=>(
                <g key={a.id}>
                  <circle cx={a.x} cy={a.y} r={5} fill={C.crvena} opacity={0.8}/>
                  <rect x={a.x+8} y={a.y-14} width={a.tekst.length*7+8} height={20}
                    fill={C.panel} stroke={C.border} strokeWidth={1} rx={3}/>
                  <text x={a.x+12} y={a.y+1} fontSize={11} fill={C.crvena} fontFamily="monospace">
                    {a.tekst}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        ) : (
          panelUvoz()
        )}
      </div>

      {/* Info tabla sa SOP podacima */}
      {deoInfo && (
        <div style={{borderTop:`1px solid ${C.border}`,padding:"8px 12px",
          background:C.panel,display:"flex",gap:16,flexWrap:"wrap"}}>
          {[
            ["ID", deoInfo.id_deo],
            ["Kontrola", deoInfo.karakteristika||"-"],
            ["Napomena", deoInfo.napomena||"-"],
          ].map(([l,v])=>(
            <div key={l} style={{fontSize:10}}>
              <span style={{color:C.sivi}}>{l}: </span>
              <span style={{color:C.tekst,fontWeight:700}}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function toolBtn(C) {
  return { background:"none", border:`1px solid ${C.border}`, borderRadius:5,
    color:C.sivi, fontSize:10, padding:"4px 10px", cursor:"pointer" };
}

// ─── SPC KARTE sa pravim crtanjem ────────────────────────────
function SPCKarte({ sviDelovi, C, addToast, korisnik, onOtvori8D }) {
  const [tip,setTip]         = useState("p");
  const [idDeo,setIdDeo]     = useState("");
  const [datumOd,setDatumOd] = useState("");
  const [datumDo,setDatumDo] = useState("");
  const [smena,setSmena]     = useState("");
  const [masinaId,setMasinaId] = useState("");
  const [grupisanje,setGrupisanje] = useState("dan");
  const [loading,setLoading] = useState(false);
  const [rawData,setRawData] = useState([]);
  const [masineList,setMasineList] = useState([]);
  const [vodicSakrij,setVodicSakrij] = useState(false);
  const [baselineAktivan, setBaselineAktivan] = useState(null);
  const kartaRef = useRef(null);
  const alarmPoslat = useRef(new Set());
  const prevIdDeoRef = useRef("");

  const deoIzabran = useMemo(() => sviDelovi.find(d => d.id_deo === idDeo), [sviDelovi, idDeo]);
  const predlog = useMemo(
    () => predlogAtributivnihKarti({ deo: deoIzabran, rawData, grupisanje }),
    [deoIzabran, rawData, grupisanje],
  );

  useEffect(() => {
    setVodicSakrij(jeVodicSakriven("atr", idDeo));
  }, [idDeo]);

  useEffect(() => {
    if (!idDeo || idDeo === prevIdDeoRef.current) return;
    prevIdDeoRef.current = idDeo;
    const prvi = predlog?.stavke?.[0]?.id;
    if (prvi) setTip(prvi);
  }, [idDeo, predlog]);

  const zatvoriVodic = () => {
    sakrijVodic("atr", idDeo);
    setVodicSakrij(true);
  };

  useEffect(() => {
    supabase.from("masine").select("id,naziv").then(({ data }) => setMasineList(data || []));
  }, []);

  const ucitaj = useCallback(async()=>{
    if(!idDeo)return; setLoading(true);
    try{
      let q=supabase.from("kontrolni_log")
        .select("datum,smena,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,podkategorija,masina_id,masina:masine(naziv),kontrolor:radnici!kontrolni_log_kontrolor_id_fkey(ime)")
        .eq("id_deo",idDeo).order("datum",{ascending:true}).order("created_at",{ascending:true});
      if(datumOd)q=q.gte("datum",datumOd);
      if(datumDo)q=q.lte("datum",datumDo);
      if(smena)  q=q.eq("smena",Number(smena));
      if(masinaId) q=q.eq("masina_id",Number(masinaId));
      const{data,error}=await q; if(error)throw error;
      setRawData(data||[]);
    }catch(e){addToast(e.message,"greska"); setRawData([]);}
    finally{setLoading(false);}
  },[idDeo,datumOd,datumDo,smena,masinaId,addToast]);

  useEffect(()=>{ucitaj();},[ucitaj]);

  useEffect(() => {
    if (!idDeo || !tip) {
      setBaselineAktivan(null);
      return undefined;
    }
    let alive = true;
    (async () => {
      try {
        const b = await ucitajAktivniBaseline(supabase, { idDeo, tipKarte: tip });
        if (alive) setBaselineAktivan(b);
      } catch {
        if (alive) setBaselineAktivan(null);
      }
    })();
    return () => { alive = false; };
  }, [idDeo, tip]);

  const grupe = useMemo(() => groupSpcRows(rawData, grupisanje), [rawData, grupisanje]);

  const ukNOK = grupe.reduce((s,g)=>s+g.nok,0);
  const ukN   = grupe.reduce((s,g)=>s+g.n,0);
  const pBar  = ukN>0?ukNOK/ukN:0;
  const cBar  = grupe.length>0?grupe.reduce((s,g)=>s+g.c,0)/grupe.length:0;
  const uBar  = ukN>0?grupe.reduce((s,g)=>s+g.c,0)/ukN:0;
  const nBar  = grupe.length>0?ukN/grupe.length:1; // prosečna veličina podgrupe za np/nC

  // ── 5 KARATA ─────────────────────────────────────────────
  const karte = useMemo(()=>[
    {
      id:"p", naziv:"p-Karta", opis:"Proporcija neispravnih · varijabilno n",
      boja:C.plava, sufiks:"%",
      podaci: grupe.map(g=>({
        datum:g.datum, label:g.label,
        val:+(g.n>0?(g.nok/g.n)*100:0).toFixed(3),
        cl: +(pBar*100).toFixed(3),
        ucl:+((pBar+3*Math.sqrt(pBar*(1-pBar)/Math.max(g.n,1)))*100).toFixed(3),
        lcl:+(Math.max(0,pBar-3*Math.sqrt(pBar*(1-pBar)/Math.max(g.n,1)))*100).toFixed(3),
        n:g.n, nok:g.nok,
      })),
    },
    {
      id:"np", naziv:"np-Karta", opis:"Broj neispravnih · konstantno n",
      boja:"#22d3ee", sufiks:"",
      podaci: grupe.map(g=>({
        datum:g.datum, label:g.label,
        val:+g.nok.toFixed(0),
        cl: +(pBar*nBar).toFixed(2),
        ucl:+(pBar*nBar+3*Math.sqrt(pBar*(1-pBar)*nBar)).toFixed(2),
        lcl:+(Math.max(0,pBar*nBar-3*Math.sqrt(pBar*(1-pBar)*nBar))).toFixed(2),
        n:g.n, nok:g.nok,
      })),
    },
    {
      id:"c", naziv:"C-Karta", opis:"Ukupan broj grešaka · konstantno n",
      boja:C.narandzasta, sufiks:"",
      podaci: (()=>{
        const cgr={};
        rawData.forEach(r=>{
          const k=`${r.datum}|${r.greska_naziv||"sve"}`;
          if(!cgr[k])cgr[k]={datum:r.datum,naziv:r.greska_naziv||"sve",c:0};
          cgr[k].c+=r.kom_nok||0;
        });
        return Object.values(cgr).sort((a,b)=>a.datum.localeCompare(b.datum)).map(g=>({
          datum:g.datum, naziv:g.naziv,
          val:+g.c.toFixed(0),
          cl: +cBar.toFixed(2),
          ucl:+(cBar+3*Math.sqrt(Math.max(cBar,0.001))).toFixed(2),
          lcl:+(Math.max(0,cBar-3*Math.sqrt(Math.max(cBar,0.001)))).toFixed(2),
        }));
      })(),
    },
    {
      id:"nc", naziv:"nC-Karta", opis:"Ukupan broj grešaka po periodu · konstantno n",
      boja:"#f472b6", sufiks:"",
      podaci: grupe.map(g=>({
        datum:g.datum, label:g.label,
        val:+g.c.toFixed(0),
        cl: +cBar.toFixed(2),
        ucl:+(cBar+3*Math.sqrt(Math.max(cBar,0.001))).toFixed(2),
        lcl:+(Math.max(0,cBar-3*Math.sqrt(Math.max(cBar,0.001)))).toFixed(2),
      })),
    },
    {
      id:"u", naziv:"u-Karta", opis:"Grešaka po komadu · varijabilno n",
      boja:C.ljubicasta, sufiks:"",
      podaci: grupe.map(g=>({
        datum:g.datum, label:g.label,
        val:+(g.n>0?g.c/g.n:0).toFixed(4),
        cl: +uBar.toFixed(4),
        ucl:+(uBar+3*Math.sqrt(uBar/Math.max(g.n,1))).toFixed(4),
        lcl:+(Math.max(0,uBar-3*Math.sqrt(uBar/Math.max(g.n,1)))).toFixed(4),
        n:g.n,
      })),
    },
  ],[grupe,rawData,pBar,cBar,uBar,nBar,C]);

  const akt = karte.find(k=>k.id===tip)||karte[0];

  const cd = useMemo(() => {
    if (!akt?.podaci?.length) return [];
    const pod = akt.podaci.map(d => ({
      ...d,
      label: d.label || d.datum?.substring(5) || (d.naziv?.substring(0, 8)) || "",
    }));
    return primeniBaselineNaPodatke(pod, baselineAktivan).podaci;
  }, [akt, baselineAktivan]);

  useEffect(() => {
    if (!idDeo || !cd.length || !korisnik?.radnikId) return;
    const upoz = cd.filter(d => d.upoz);
    if (!upoz.length) return;
    const key = `${idDeo}-${tip}-${upoz.length}`;
    if (alarmPoslat.current.has(key)) return;
    alarmPoslat.current.add(key);
    (async () => {
      try {
        const pos = upoz[upoz.length - 1];
        await upisiSpcAlarm(supabase, {
          id_deo: idDeo,
          datum: dISO(),
          tip_karte: tip,
          pravilo: "Western Electric",
          vrednost: pos.val,
          ucl: pos.ucl,
          lcl: pos.lcl,
        });
        await kreirajAutoEskalaciju(supabase, {
          id_deo: idDeo,
          opis: `SPC ${tip}-karta: ${upoz.length} tačka van kontrole (Western Electric)`,
          prioritet: "kriticno",
          kreirao_id: korisnik.radnikId,
          prefiks: "AUTO-SPC",
        });
        addToast(`⚠ SPC alarm: ${upoz.length} tačka van kontrole`, "greska");
      } catch { /* spc_alarmi možda nije migriran */ }
    })();
  }, [cd, idDeo, tip, korisnik?.radnikId, addToast]);

  const upozoreni = cd.filter(d=>d.upoz);
  const cl = cd.length ? +(cd.reduce((s,d)=>s+d.cl,0)/cd.length).toFixed(4) : 0;
  const ucl = cd.length ? +(cd.reduce((s,d)=>s+d.ucl,0)/cd.length).toFixed(4) : 0;
  const lcl = cd.length ? +(cd.reduce((s,d)=>s+d.lcl,0)/cd.length).toFixed(4) : 0;

  // ── Analiza po smeni ──────────────────────────────────────
  const poSmeni = useMemo(()=>{
    const sm={1:{s:"Smena 1",ok:0,nok:0,n:0},2:{s:"Smena 2",ok:0,nok:0,n:0},3:{s:"Smena 3",ok:0,nok:0,n:0}};
    rawData.forEach(r=>{
      const s=sm[r.smena]; if(!s)return;
      s.ok +=r.ok_kolicina||0;
      s.nok+=r.nok_kolicina||0;
      s.n  +=r.ukupno_merenja||0;
    });
    return Object.values(sm).map(s=>({
      ...s,
      rty: s.n>0?+((s.ok/s.n)*100).toFixed(1):0,
      p:   s.n>0?+((s.nok/s.n)*100).toFixed(2):0,
    }));
  },[rawData]);

  const paretoData = useMemo(() => buildParetoFromLog(rawData, 8), [rawData]);

  // ── RTY trend ────────────────────────────────────────────
  const rtyTrend = useMemo(()=>grupe.map(g=>({
    datum: g.label||g.datum?.substring(5)||"",
    rty:   g.n>0?+((g.ok/g.n)*100).toFixed(1):0,
    p:     g.n>0?+(g.nok/g.n*100).toFixed(2):0,
  })),[grupe]);

  // ── Eksport PDF ───────────────────────────────────────────
  const exportPDF = async()=>{
    if(!kartaRef.current)return;
    const{default:jsPDF}=await import("jspdf");
    const{default:h2c}=await import("html2canvas");
    const canvas=await h2c(kartaRef.current,{scale:2,useCORS:true});
    const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    const w=pdf.internal.pageSize.getWidth();
    pdf.addImage(canvas.toDataURL("image/png"),"PNG",0,0,w,canvas.height*w/canvas.width);
    pdf.save(`SPC_${idDeo}_${tip}_${dISO()}.pdf`);
  };

  const INP_S={background:C.input,border:`1px solid ${C.border}`,borderRadius:6,
    color:C.tekst,fontSize:11,padding:"7px 10px",outline:"none",fontFamily:"inherit"};
  const BOJE_P=[C.crvena,C.narandzasta,C.zuta,C.plava,C.ljubicasta,"#22d3ee","#f472b6","#a3e635"];

  return(
    <div style={{padding:18,overflowY:"auto"}} ref={kartaRef}>

      {/* ── FILTERI ── */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4}}>ID DELA</div>
          <select value={idDeo} onChange={e=>setIdDeo(e.target.value)}
            style={{...INP_S,minWidth:170,cursor:"pointer"}}>
            <option value="">-- Izaberi deo --</option>
            {sviDelovi.map(d=><option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>)}
          </select>
        </div>
        {[["OD","date",datumOd,setDatumOd],["DO","date",datumDo,setDatumDo]].map(([l,t,v,s])=>(
          <div key={l}>
            <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4}}>{l}</div>
            <input type={t} value={v} onChange={e=>s(e.target.value)} style={INP_S}/>
          </div>
        ))}
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4}}>SMENA</div>
          <select value={smena} onChange={e=>setSmena(e.target.value)} style={{...INP_S,cursor:"pointer"}}>
            <option value="">Sve</option>
            <option value="1">1</option><option value="2">2</option><option value="3">3</option>
          </select>
        </div>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4}}>MAŠINA</div>
          <select value={masinaId} onChange={e=>setMasinaId(e.target.value)} style={{...INP_S,cursor:"pointer"}}>
            <option value="">Sve</option>
            {masineList.map(m=><option key={m.id} value={m.id}>{m.naziv}</option>)}
          </select>
        </div>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4}}>GRUPIŠI</div>
          <select value={grupisanje} onChange={e=>setGrupisanje(e.target.value)} style={{...INP_S,cursor:"pointer"}}>
            <option value="dan">Po danu</option>
            <option value="smena">Po smeni</option>
            <option value="dan_smena">Dan + smena</option>
          </select>
        </div>
        <button onClick={ucitaj} disabled={!idDeo||loading}
          style={{background:!idDeo||loading?C.hover:C.plava,border:"none",borderRadius:6,
            color:!idDeo||loading?C.sivi:"#fff",fontSize:11,fontWeight:700,
            padding:"8px 14px",cursor:!idDeo?"not-allowed":"pointer",alignSelf:"flex-end"}}>
          {loading?"...":"↻"}
        </button>
        <button onClick={exportPDF} disabled={!cd.length}
          style={{background:!cd.length?C.hover:"#7c3aed",border:"none",borderRadius:6,
            color:!cd.length?C.sivi:"#fff",fontSize:11,fontWeight:700,
            padding:"8px 12px",cursor:!cd.length?"not-allowed":"pointer",alignSelf:"flex-end"}}>
          📄 PDF
        </button>
        <button onClick={()=>exportExcel(idDeo,datumOd,datumDo,addToast)} disabled={!rawData.length}
          style={{background:!rawData.length?C.hover:C.zelena,border:"none",borderRadius:6,
            color:!rawData.length?C.sivi:"#fff",fontSize:11,fontWeight:700,
            padding:"8px 12px",cursor:!rawData.length?"not-allowed":"pointer",alignSelf:"flex-end"}}>
          📊 Excel
        </button>
        <div style={{flex:1}}/>
        {rawData.length>0&&<span style={{color:C.sivi,fontSize:10,alignSelf:"center"}}>
          {rawData.length} unosa · {grupe.length} dana ·{" "}
          <span style={{color:upozoreni.length>0?C.crvena:C.zelena,fontWeight:700}}>
            {upozoreni.length} van kontrole
          </span>
        </span>}
      </div>

      {idDeo && !vodicSakrij && (
        <SpcVodicPredlog C={C} predlog={predlog} tip={tip} setTip={setTip} onZatvori={zatvoriVodic} />
      )}

      {/* ── TABOVI KARATA ── */}
      <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,marginBottom:16,flexWrap:"wrap"}}>
        {karte.map(k=>{
          const preporuka = tabJePreporucen(predlog, k.id);
          return (
          <button key={k.id} onClick={()=>setTip(k.id)} style={{
            background:"none",border:"none",
            borderBottom:tip===k.id?`2px solid ${k.boja}`:"2px solid transparent",
            color:tip===k.id?k.boja:C.sivi,
            fontSize:11,fontWeight:700,padding:"8px 14px",cursor:"pointer",letterSpacing:0.5,
            boxShadow: preporuka && tip !== k.id ? `inset 0 -1px 0 ${C.plava}55` : "none"}}>
            {k.naziv}{preporuka ? <span style={{ color: C.plava, fontSize: 8, marginLeft: 3 }}>★</span> : null}
          </button>
        );})}
        {[
          ["pareto",   "Pareto",      C.zelena],
          ["smena",    "Po smeni",    C.zuta],
          ["masina",   "Po mašini",   C.narandzasta],
          ["operater", "Po operateru",C.ljubicasta],
          ["rty",      "RTY/DPMO",    "#22d3ee"],
          ["heatmap",    "Heat mapa",   "#f472b6"],
          ["sigma",      "Sigma nivo",  "#a3e635"],
          ["korelacija", "Korelacija",  "#22d3ee"],
          ["poredi",     "Poređenje",   "#a78bfa"],
          ["foto_spc",   "Foto arhiva", "#fb923c"],
          ["oc_spc",    "OC kriva",    "#a3e635"],
          ["stabilnost_spc","Stabilnost","#f472b6"],
        ].map(([id,naziv,boja])=>{
          const preporuka = tabJePreporucen(predlog, id);
          return (
          <button key={id} onClick={()=>setTip(id)} style={{
            background:"none",border:"none",
            borderBottom:tip===id?`2px solid ${boja}`:"2px solid transparent",
            color:tip===id?boja:C.sivi,
            fontSize:11,fontWeight:700,padding:"8px 14px",cursor:"pointer",letterSpacing:0.5,
            boxShadow: preporuka && tip !== id ? `inset 0 -1px 0 ${C.plava}55` : "none"}}>
            {naziv}{preporuka ? <span style={{ color: C.plava, fontSize: 8, marginLeft: 3 }}>★</span> : null}
          </button>
        );})}
      </div>

      {!idDeo?(
        <div style={{height:350,display:"flex",alignItems:"center",justifyContent:"center",
          flexDirection:"column",gap:10,color:C.border}}>
          <span style={{fontSize:36}}>📊</span>
          <span style={{fontSize:12}}>Izaberi ID dela</span>
        </div>
      ):loading?(
        <div style={{height:350,display:"flex",alignItems:"center",justifyContent:"center",
          color:C.sivi,fontSize:12}}>Učitavanje...</div>
      ):rawData.length===0?(
        <div style={{height:350,display:"flex",alignItems:"center",justifyContent:"center",
          color:C.border,fontSize:12}}>Nema podataka</div>
      ):(
        <>
          {/* ── SPC KARTE (p, np, C, nC, u) ── */}
          {["p","np","c","nc","u"].includes(tip)&&(
            <>
              {/* KPI row */}
              <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
                {[
                  ["CL",`${cl}${akt.sufiks}`,C.zuta,"Centralna linija"],
                  ["UCL",`${ucl}${akt.sufiks}`,C.crvena,"+3σ"],
                  ["LCL",`${lcl}${akt.sufiks}`,C.zelena,"-3σ"],
                  ["TAČAKA",cd.length,C.plava,""],
                  ["VAN K.",upozoreni.length,upozoreni.length>0?C.crvena:C.zelena,
                   upozoreni.length>0?"⚠":"✓ OK"],
                  ["RTY",ukN>0?((ukN-ukNOK)/ukN*100).toFixed(1)+"%":"-",C.ljubicasta,""],
                  ["DPMO",ukN>0?Math.round(ukNOK/ukN*1e6).toLocaleString():"-","#f472b6",""],
                ].map(([n,v,b,o])=>(
                  <div key={n} style={{background:C.panel,border:`1px solid ${b}25`,borderRadius:8,
                    padding:"10px 14px",textAlign:"center",minWidth:84}}>
                    <div style={{color:C.sivi,fontSize:9,letterSpacing:1.2,marginBottom:3}}>{n}</div>
                    <div style={{color:b,fontSize:17,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{v}</div>
                    {o&&<div style={{color:C.sivi,fontSize:8,marginTop:1}}>{o}</div>}
                  </div>
                ))}
              </div>

              {/* Trend upozorenje */}
              <TrendUpozorenje podaci={cd} C={C}/>

              {/* Opis */}
              <div style={{color:C.sivi,fontSize:10,marginBottom:10}}>
                <strong style={{color:akt.boja}}>{akt.naziv}</strong> — {akt.opis}
                {(tip==="p"||tip==="np")&&<> · n̄ = {Math.round(nBar)}</>}
              </div>

              {baselineAktivan && (
                <div style={{
                  background: `${C.zuta}18`,
                  border: `1px solid ${C.zuta}50`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  marginBottom: 12,
                  color: C.zuta,
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  📌 {formatBaselineBadge(baselineAktivan)}
                  {baselineAktivan.napomena ? (
                    <span style={{ color: C.sivi, fontWeight: 400 }}> · {baselineAktivan.napomena}</span>
                  ) : null}
                </div>
              )}

              <SpcKontrolnaGraf
                podaci={cd}
                bojaLinije={akt.boja}
                C={C}
                sufiks={akt.sufiks}
                naslovKarte={akt.naziv}
                height={400}
                formatVrednost={(v) => (Number.isFinite(v) ? String(v) : "—")}
              />

              {/* Upozorenja */}
              {upozoreni.length>0&&(
                <div style={{marginTop:12,background:C.nok,border:`1px solid ${C.crvena}30`,
                  borderRadius:8,padding:"10px 14px"}}>
                  <div style={{color:C.crvena,fontSize:11,fontWeight:700,marginBottom:5}}>
                    ⚠ WESTERN ELECTRIC — {upozoreni.length} tačaka van statističke kontrole
                  </div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {upozoreni.map((d,i)=>(
                      <span key={i} style={{background:C.crvena+"20",border:`1px solid ${C.crvena}40`,
                        borderRadius:4,padding:"2px 8px",fontSize:10,color:C.crvena}}>
                        {d.label}: {d.val}{akt.sufiks}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* WE pravila */}
              <div style={{marginTop:14,background:C.panel,border:`1px solid ${C.border}`,
                borderRadius:8,padding:"10px 14px"}}>
                <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:8}}>
                  WESTERN ELECTRIC PRAVILA (ISO 8258)
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                  {[["P1","1 tačka van UCL/LCL (3σ)"],["P2","9 uzastopnih na istoj strani CL"],
                    ["P3","6 uzastopnih u trendu"],["P4","2/3 uzastopnih van 2σ iste strane"]
                  ].map(([p,o])=>(
                    <div key={p} style={{display:"flex",gap:6,fontSize:10}}>
                      <span style={{color:C.crvena,fontWeight:700,minWidth:22}}>{p}:</span>
                      <span style={{color:C.sivi}}>{o}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── PARETO ── */}
          {tip==="pareto"&&(
            <div>
              <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
                PARETO DIJAGRAM — TOP GREŠKE (80/20 pravilo)
              </div>
              {!paretoData.length?(
                <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",
                  color:C.border,fontSize:12}}>Nema NOK podataka</div>
              ):(
                <>
                  <SpcParetoGraf data={paretoData} C={C} height={340} boje={BOJE_P} kumKey="kum" />
                  {/* Tabela */}
                  <div style={{marginTop:14,border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 80px",
                      background:C.hover,padding:"8px 14px",fontSize:9,color:C.sivi,gap:8}}>
                      <span>GREŠKA</span><span>BROJ</span><span>%</span><span>KUMULATIV</span>
                    </div>
                    {paretoData.map((p,i)=>{
                      const uk=paretoData.reduce((s,d)=>s+d.count,0);
                      return(
                        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 80px 80px 80px auto",
                          padding:"8px 14px",borderTop:`1px solid ${C.border}`,fontSize:11,gap:8,alignItems:"center"}}>
                          <span style={{color:BOJE_P[i%BOJE_P.length],fontWeight:700}}>{p.naziv}</span>
                          <span style={{color:C.tekst}}>{p.count}</span>
                          <span style={{color:C.sivi}}>{uk>0?((p.count/uk)*100).toFixed(1):0}%</span>
                          <span style={{color:C.zuta}}>{p.kum}%</span>
                          {onOtvori8D && (
                            <button type="button" onClick={()=>onOtvori8D({
                              id_deo: idDeo,
                              greska: p.naziv,
                              count: p.count,
                              opis: `Pareto: ${p.naziv} — ${p.count} grešaka (${p.kum}% kumulativ) za ${idDeo}`,
                            })}
                              style={{background:"none",border:`1px solid ${C.plava}`,borderRadius:5,
                                color:C.plava,fontSize:9,padding:"3px 8px",cursor:"pointer",whiteSpace:"nowrap"}}>
                              8D →
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── PO SMENI ── */}
          {tip==="smena"&&(
            <div>
              <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
                ANALIZA PO SMENI
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
                {poSmeni.map(s=>(
                  <div key={s.s} style={{background:C.panel,border:`1px solid ${C.border}`,
                    borderRadius:10,padding:16,textAlign:"center"}}>
                    <div style={{color:C.plava,fontSize:14,fontWeight:700,marginBottom:10}}>{s.s}</div>
                    {[["OK",s.ok,C.zelena],["NOK",s.nok,C.crvena],
                      ["RTY",s.rty+"%",C.zuta],["p",s.p+"%",C.narandzasta]].map(([l,v,b])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",
                        fontSize:11,marginBottom:5}}>
                        <span style={{color:C.sivi}}>{l}</span>
                        <span style={{color:b,fontWeight:700}}>{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <SpcOkNokBarGraf data={poSmeni} C={C} height={300} xKey="s" stacked={false} naslov="OK / NOK po smeni" />
            </div>
          )}

          {/* ── RTY TREND ── */}
          {tip==="rty"&&(
            <div>
              <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
                RTY % I DPMO TREND PO DANU
              </div>
              <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
                {[
                  ["RTY %",ukN>0?((ukN-ukNOK)/ukN*100).toFixed(2)+"%":"-",C.zelena],
                  ["DPMO",ukN>0?Math.round(ukNOK/ukN*1e6).toLocaleString():"-",C.ljubicasta],
                  ["Sigma nivo",ukN>0?(()=>{const p=ukNOK/ukN; const z=p>0?(-2.326*Math.log(p/(1-p))+1.5).toFixed(2):"6.00"; return z+"σ";})():"-","#a3e635"],
                  ["Uk. mereno",ukN,C.plava],
                  ["Uk. NOK",ukNOK,C.crvena],
                ].map(([n,v,b])=>(
                  <div key={n} style={{background:C.panel,border:`1px solid ${b}25`,borderRadius:8,
                    padding:"10px 14px",textAlign:"center",minWidth:100}}>
                    <div style={{color:C.sivi,fontSize:8,letterSpacing:1.2,marginBottom:3}}>{n}</div>
                    <div style={{color:b,fontSize:16,fontWeight:700}}>{v}</div>
                  </div>
                ))}
              </div>
              <SpcRtyTrendGraf data={rtyTrend} C={C} height={360} xKey="datum" />
            </div>
          )}

          {/* ── PO MAŠINI ── */}
          {tip==="masina"&&(()=>{
            const poMas={};
            rawData.forEach(r=>{
              const k=r.masina?.naziv||"Nepoznata";
              if(!poMas[k])poMas[k]={naziv:k,ok:0,nok:0,n:0,c:0};
              poMas[k].ok +=r.ok_kolicina||0;
              poMas[k].nok+=r.nok_kolicina||0;
              poMas[k].n  +=r.ukupno_merenja||0;
              poMas[k].c  +=r.kom_nok||0;
            });
            const arr=Object.values(poMas).map(m=>({
              ...m,
              rty:m.n>0?+((m.ok/m.n)*100).toFixed(1):0,
              p:  m.n>0?+((m.nok/m.n)*100).toFixed(2):0,
              dpmo:m.n>0?Math.round((m.nok/m.n)*1e6):0,
            })).sort((a,b)=>b.nok-a.nok);
            const BOJE=[C.plava,C.zelena,C.narandzasta,C.ljubicasta,"#22d3ee","#f472b6"];
            return(
              <div>
                <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
                  ANALIZA PO MAŠINI
                </div>
                {!arr.length?<div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>
                  Nema podataka — mašine nisu dodeljene delovima
                </div>:(
                  <>
                    <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(arr.length,4)},1fr)`,gap:10,marginBottom:20}}>
                      {arr.map((m,i)=>(
                        <div key={m.naziv} style={{background:C.panel,border:`1px solid ${BOJE[i%BOJE.length]}30`,borderRadius:10,padding:14}}>
                          <div style={{color:BOJE[i%BOJE.length],fontWeight:700,fontSize:14,marginBottom:8}}>{m.naziv}</div>
                          {[["OK",m.ok,C.zelena],["NOK",m.nok,C.crvena],
                            ["RTY",m.rty+"%",C.zuta],["DPMO",m.dpmo.toLocaleString(),C.ljubicasta]
                          ].map(([l,v,b])=>(
                            <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                              <span style={{color:C.sivi}}>{l}</span>
                              <span style={{color:b,fontWeight:700}}>{v}</span>
                            </div>
                          ))}
                          <div style={{marginTop:8,background:C.hover,borderRadius:3,height:5}}>
                            <div style={{background:m.rty>95?C.zelena:m.rty>80?C.zuta:C.crvena,
                              width:`${m.rty}%`,height:5,borderRadius:3}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                    <SpcOkNokBarGraf data={arr} C={C} height={280} xKey="naziv" naslov="OK / NOK po mašini" />
                  </>
                )}
              </div>
            );
          })()}

          {/* ── PO OPERATERU ── */}
          {tip==="operater"&&(()=>{
            const poOp={};
            rawData.forEach(r=>{
              const k=r.kontrolor?.ime||"Nepoznat";
              if(!poOp[k])poOp[k]={ime:k,ok:0,nok:0,n:0,c:0};
              poOp[k].ok +=r.ok_kolicina||0;
              poOp[k].nok+=r.nok_kolicina||0;
              poOp[k].n  +=r.ukupno_merenja||0;
              poOp[k].c  +=r.kom_nok||0;
            });
            const arr=Object.values(poOp).map(o=>({
              ...o,
              rty:o.n>0?+((o.ok/o.n)*100).toFixed(1):0,
              p:  o.n>0?+((o.nok/o.n)*100).toFixed(2):0,
            })).sort((a,b)=>b.nok-a.nok);
            const BOJE=[C.plava,C.narandzasta,C.ljubicasta,C.zelena,"#22d3ee","#f472b6"];
            return(
              <div>
                <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
                  ANALIZA PO OPERATERU / KONTROLORU
                </div>
                {!arr.length?<div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>
                  Nema podataka
                </div>:(
                  <>
                    <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",marginBottom:20}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 70px 70px 70px 80px 80px",
                        background:C.hover,padding:"9px 14px",fontSize:9,color:C.sivi,gap:8,letterSpacing:1}}>
                        <span>IME</span><span>OK</span><span>NOK</span>
                        <span>MERENJA</span><span>RTY %</span><span>DPMO</span>
                      </div>
                      {arr.map((o,i)=>(
                        <div key={o.ime} style={{display:"grid",
                          gridTemplateColumns:"1fr 70px 70px 70px 80px 80px",
                          padding:"10px 14px",borderTop:`1px solid ${C.border}`,
                          fontSize:12,gap:8,alignItems:"center"}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:BOJE[i%BOJE.length],flexShrink:0}}/>
                            <span style={{color:C.tekst,fontWeight:700}}>{o.ime}</span>
                          </div>
                          <span style={{color:C.zelena}}>{o.ok}</span>
                          <span style={{color:C.crvena,fontWeight:o.nok>0?700:400}}>{o.nok}</span>
                          <span style={{color:C.sivi}}>{o.n}</span>
                          <div>
                            <span style={{color:o.rty>95?C.zelena:o.rty>80?C.zuta:C.crvena,fontWeight:700}}>
                              {o.rty}%
                            </span>
                            <div style={{background:C.hover,borderRadius:2,height:3,marginTop:3}}>
                              <div style={{background:o.rty>95?C.zelena:o.rty>80?C.zuta:C.crvena,
                                width:`${o.rty}%`,height:3,borderRadius:2}}/>
                            </div>
                          </div>
                          <span style={{color:C.ljubicasta,fontSize:11}}>
                            {o.n>0?Math.round((o.nok/o.n)*1e6).toLocaleString():"-"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <SpcOkNokBarGraf data={arr} C={C} height={280} xKey="ime" naslov="OK / NOK po operateru" />
                  </>
                )}
              </div>
            );
          })()}

          {/* ── HEAT MAPA ── */}
          {tip==="heatmap"&&(()=>{
            // NOK po dan/smena matrica
            const matrix={};
            const dani=[];
            rawData.forEach(r=>{
              if(!matrix[r.datum]){ matrix[r.datum]={};dani.push(r.datum); }
              const s=`Smena ${r.smena||1}`;
              matrix[r.datum][s]=(matrix[r.datum][s]||0)+(r.nok_kolicina||0);
            });
            const unikDani=[...new Set(dani)].sort().slice(-30); // poslednih 30 dana
            const smene=["Smena 1","Smena 2","Smena 3"];
            const maxVal=unikDani.reduce((mx,d)=>
              Math.max(mx,...smene.map(s=>matrix[d]?.[s]||0)),0);
            const getColor=(v)=>{
              if(v===0)return C.hover;
              const int=Math.min(v/Math.max(maxVal,1),1);
              if(int<0.33)return C.zelena+"80";
              if(int<0.66)return C.zuta+"90";
              return C.crvena+(Math.round(128+int*127).toString(16).padStart(2,"0"));
            };
            return(
              <div>
                <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
                  HEAT MAPA NOK — PO DANU I SMENI (poslednih 30 dana)
                </div>
                <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center"}}>
                  <span style={{color:C.sivi,fontSize:10}}>0</span>
                  {[C.hover,C.zelena+"80",C.zuta+"90",C.crvena+"aa",C.crvena].map((c,i)=>(
                    <div key={i} style={{width:20,height:14,background:c,borderRadius:2}}/>
                  ))}
                  <span style={{color:C.sivi,fontSize:10}}>max ({maxVal})</span>
                </div>
                <div style={{overflowX:"auto"}}>
                  <div style={{display:"grid",
                    gridTemplateColumns:`80px repeat(${unikDani.length},1fr)`,
                    gap:2,minWidth:400}}>
                    <div/>{unikDani.map(d=>(
                      <div key={d} style={{color:C.sivi,fontSize:8,textAlign:"center",
                        transform:"rotate(-60deg)",transformOrigin:"bottom center",
                        height:40,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
                        {d.substring(5)}
                      </div>
                    ))}
                    {smene.map(s=>(
                      <>
                        <div key={s} style={{color:C.sivi,fontSize:10,display:"flex",
                          alignItems:"center",paddingRight:8}}>{s}</div>
                        {unikDani.map(d=>{
                          const v=matrix[d]?.[s]||0;
                          return(
                            <div key={d+s} title={`${d} ${s}: ${v} NOK`}
                              style={{background:getColor(v),borderRadius:3,height:22,
                                display:"flex",alignItems:"center",justifyContent:"center",
                                fontSize:v>0?8:0,color:"#fff",fontWeight:700,cursor:"default"}}>
                              {v>0?v:""}
                            </div>
                          );
                        })}
                      </>
                    ))}
                  </div>
                </div>
                <div style={{marginTop:16,color:C.sivi,fontSize:10}}>
                  Tamnije = više NOK. Hover na ćeliju za detalje.
                </div>
              </div>
            );
          })()}

          {/* ── SIGMA NIVO ── */}
          {tip==="sigma"&&(()=>{
            const dpmo=ukN>0?ukNOK/ukN*1e6:0;
            // Aproksimacija sigma nivoa iz DPMO
            const sigmaIzDPMO=(d)=>{
              if(d<=0)return 6.0;
              const tbl=[[3.4,6],[233,5],[6210,4],[66807,3],[308538,2],[691462,1]];
              for(const [lim,s] of tbl) if(d<=lim)return s;
              return 1;
            };
            const sigma=sigmaIzDPMO(dpmo);
            const rty=ukN>0?((ukN-ukNOK)/ukN*100):0;

            // Benchmark tabela
            const bench=[
              {nivo:"6σ",dpmo:"3.4",rty:"99.9997%",opis:"World class"},
              {nivo:"5σ",dpmo:"233",rty:"99.977%",opis:"Odlično"},
              {nivo:"4σ",dpmo:"6,210",rty:"99.38%",opis:"Dobro"},
              {nivo:"3σ",dpmo:"66,807",rty:"93.32%",opis:"Prosečno"},
              {nivo:"2σ",dpmo:"308,538",rty:"69.15%",opis:"Loše"},
              {nivo:"1σ",dpmo:"691,462",rty:"30.85%",opis:"Kritično"},
            ];
            const trenutniIdx=Math.max(0,6-Math.ceil(sigma));

            return(
              <div>
                <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:16}}>
                  SIGMA NIVO PROCESA
                </div>
                {/* Gauge */}
                <div style={{display:"flex",gap:16,marginBottom:24,flexWrap:"wrap",alignItems:"center"}}>
                  <div style={{background:C.panel,border:`2px solid ${
                    sigma>=5?C.zelena:sigma>=4?C.zuta:sigma>=3?C.narandzasta:C.crvena}`,
                    borderRadius:16,padding:"24px 32px",textAlign:"center",minWidth:160}}>
                    <div style={{color:C.sivi,fontSize:10,letterSpacing:1.5,marginBottom:6}}>SIGMA NIVO</div>
                    <div style={{color:sigma>=5?C.zelena:sigma>=4?C.zuta:sigma>=3?C.narandzasta:C.crvena,
                      fontSize:52,fontWeight:700,lineHeight:1}}>{sigma.toFixed(1)}σ</div>
                    <div style={{color:C.sivi,fontSize:11,marginTop:6}}>
                      {sigma>=5?"World class":sigma>=4?"Odlično":sigma>=3?"Dobro":sigma>=2?"Ispod proseka":"Kritično"}
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10,flex:1,minWidth:200}}>
                    {[
                      ["DPMO",Math.round(dpmo).toLocaleString(),C.ljubicasta],
                      ["RTY %",rty.toFixed(3)+"%",C.zelena],
                      ["Uk. NOK",ukNOK,C.crvena],
                      ["Uk. mereno",ukN,C.plava],
                    ].map(([n,v,b])=>(
                      <div key={n} style={{display:"flex",justifyContent:"space-between",
                        background:C.panel,borderRadius:8,padding:"10px 14px"}}>
                        <span style={{color:C.sivi,fontSize:11}}>{n}</span>
                        <span style={{color:b,fontWeight:700,fontSize:13}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sigma skala vizualna */}
                <div style={{background:C.panel,borderRadius:10,padding:16,marginBottom:16}}>
                  <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:10}}>SIGMA SKALA</div>
                  <div style={{display:"flex",height:20,borderRadius:6,overflow:"hidden",marginBottom:8}}>
                    {[C.crvena,C.narandzasta,C.zuta,"#84cc16",C.zelena,"#06b6d4"].map((c,i)=>(
                      <div key={i} style={{flex:1,background:c,
                        opacity:i+1<=Math.floor(sigma)?1:0.2,
                        borderRight:i<5?`1px solid ${C.bg}`:""}}/>
                    ))}
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.sivi}}>
                    {["1σ","2σ","3σ","4σ","5σ","6σ"].map(s=><span key={s}>{s}</span>)}
                  </div>
                </div>

                {/* Benchmark tabela */}
                <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
                  <div style={{display:"grid",gridTemplateColumns:"60px 100px 100px 1fr",
                    background:C.hover,padding:"8px 14px",fontSize:9,color:C.sivi,gap:8,letterSpacing:1}}>
                    <span>NIVO</span><span>DPMO</span><span>RTY</span><span>OCENA</span>
                  </div>
                  {bench.map((b,i)=>(
                    <div key={b.nivo} style={{display:"grid",
                      gridTemplateColumns:"60px 100px 100px 1fr",
                      padding:"9px 14px",borderTop:`1px solid ${C.border}`,
                      background:i===trenutniIdx?C.plava+"15":"transparent",
                      fontSize:12,gap:8,alignItems:"center"}}>
                      <span style={{color:i===trenutniIdx?C.plava:C.tekst,fontWeight:700}}>{b.nivo}</span>
                      <span style={{color:C.sivi}}>{b.dpmo}</span>
                      <span style={{color:C.sivi}}>{b.rty}</span>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{color:C.sivi,fontSize:11}}>{b.opis}</span>
                        {i===trenutniIdx&&<span style={{background:C.plava,color:"#fff",
                          fontSize:9,padding:"1px 6px",borderRadius:10}}>← Vi ste ovde</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          {tip==="korelacija"&&(
            <KorelacijaGreskaMasina rawData={rawData} C={C}/>
          )}

          {tip==="poredi"&&(
            <PoredjenjePerioda idDeo={idDeo} C={C} addToast={addToast}/>
          )}
          {tip==="foto_spc"&&(
            <FotoArhiva C={C} addToast={addToast}/>
          )}
          {tip==="oc_spc"&&(
            <OCKriva C={C}/>
          )}
          {tip==="stabilnost_spc"&&(
            <StabilnostProcesa sviDelovi={sviDelovi} C={C} addToast={addToast}/>
          )}
        </>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────
function Dashboard({C, addToast}) {
  const [podaci,setPodaci]=useState(null); const [loading,setLoading]=useState(true);
  const [period,setPeriod]=useState("7"); const dashRef=useRef(null);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const od = new Date();
      od.setDate(od.getDate() - Number(period));
      const { data, error } = await supabase.from("kontrolni_log")
        .select("datum,status,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,smena")
        .gte("datum", od.toISOString().split("T")[0]);
      if (error) throw error;
      setPodaci(aggregateLogRows(data) || {});
    } catch (e) { addToast(e.message, "greska"); }
    finally { setLoading(false); }
  }, [period, addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  useEffect(() => {
    const ch = supabase.channel("dash_rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "kontrolni_log" }, () => ucitaj())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [ucitaj]);

  const exportPDF=async()=>{
    if(!dashRef.current)return;
    const{default:jsPDF}=await import("jspdf");
    const{default:h2c}=await import("html2canvas");
    const canvas=await h2c(dashRef.current,{scale:2,useCORS:true});
    const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
    const w=pdf.internal.pageSize.getWidth();
    pdf.addImage(canvas.toDataURL("image/png"),"PNG",0,0,w,canvas.height*w/canvas.width);
    pdf.save(`SPC_Dashboard_${dISO()}.pdf`);
  };

  const BOJE=[C.crvena,C.narandzasta,C.zuta,C.plava,C.ljubicasta,"#e8b4b8","#a8d8a8","#b4c8e8","#d4b8e8","#e8d4b8"];

  // Pareto sa kumulativom
  const paretoData=()=>{
    const s=[...(podaci?.pareto||[])].slice(0,10);
    const uk=s.reduce((t,d)=>t+d.count,0); let k=0;
    return s.map(d=>{k+=d.count;return{...d,kumulativ:+((k/uk)*100).toFixed(1)};});
  };

  return(
    <div style={{padding:18}} ref={dashRef}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <span style={{color:C.tekst,fontSize:14,fontWeight:700,letterSpacing:1}}>DASHBOARD</span>
        <div style={{display:"flex",gap:10}}>
          <select value={period} onChange={e=>setPeriod(e.target.value)}
            style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:6,
              color:C.tekst,fontSize:11,padding:"6px 10px",cursor:"pointer",fontFamily:"inherit"}}>
            <option value="1">Danas</option><option value="7">7 dana</option>
            <option value="30">30 dana</option><option value="90">90 dana</option>
          </select>
          <button onClick={exportPDF}
            style={{background:"#7c3aed",border:"none",borderRadius:6,color:"#fff",
              fontSize:11,fontWeight:700,padding:"7px 14px",cursor:"pointer"}}>📄 PDF</button>
        </div>
      </div>

      {loading?(
        <div style={{height:300,display:"flex",alignItems:"center",justifyContent:"center",color:C.sivi,fontSize:12}}>Učitavanje...</div>
      ):!podaci||!podaci.ukN?(
        <div style={{height:300,display:"flex",alignItems:"center",justifyContent:"center",color:C.border,fontSize:12}}>Nema podataka za izabrani period</div>
      ):(
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,marginBottom:20}}>
            {[["MERENO",podaci.ukN,C.plava],["OK",podaci.ukOK,C.zelena],["NOK",podaci.ukNOK,C.crvena],
              ["RTY %",podaci.rty+"%",C.zuta],["DPMO",podaci.dpmo.toLocaleString(),C.ljubicasta],
            ].map(([n,v,b])=>(
              <div key={n} style={{background:C.panel,border:`1px solid ${b}25`,borderRadius:10,padding:"14px",textAlign:"center"}}>
                <div style={{color:C.sivi,fontSize:9,letterSpacing:1.2,marginBottom:4}}>{n}</div>
                <div style={{color:b,fontSize:22,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <SpcRtyJednaLinija data={podaci.trend} C={C} height={220} xKey="datum" naslov="RTY % trend" />
            <SpcOkNokBarGraf
              data={podaci.smene.map(s => ({ ...s, label: `Smena ${s.s}` }))}
              C={C}
              height={220}
              xKey="label"
              stacked={false}
              naslov="Analiza po smeni"
            />
          </div>

          <SpcParetoGraf
            data={paretoData()}
            C={C}
            height={300}
            boje={BOJE}
            kumKey="kumulativ"
            countKey="count"
          />

          {/* Prioritizacija delova */}
          <PrioritizacijaDelova C={C} addToast={addToast}/>
        </>
      )}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────
function Login({onLogin,C}) {
  const [email,setEmail]=useState(""); const [loz,setLoz]=useState("");
  const [err,setErr]=useState(""); const [load,setLoad]=useState(false);
  const [inputsReady,setInputsReady]=useState(false);

  useEffect(() => {
    setEmail("");
    setLoz("");
    setErr("");
    setInputsReady(false);
    const t = setTimeout(() => setInputsReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  const prijavi=async()=>{
    if(!email||!loz){setErr("Unesite email i lozinku.");return;}
    setLoad(true);setErr("");
    try{
      const{data,error}=await supabase.auth.signInWithPassword({email,password:loz});
      if(error)throw error;
      const k = await ucitajRadnika(data.user);
      if (!k.radnikId) {
        await supabase.auth.signOut();
        setErr(k.deaktiviran
          ? `Nalog ${email} je deaktiviran. Kontaktirajte administratora.`
          : `Korisnik ${email} nije u tabeli radnici. Proverite Supabase → radnici ili pokrenite import.`);
        return;
      }
      ocistiUnosDraft();
      onLogin(k);
    }catch(e){setErr(e.message==="Invalid login credentials"?"Pogrešan email ili lozinka.":e.message||"Greška.");}
    finally{setLoad(false);}
  };
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:"'IBM Plex Mono',monospace"}}>
      <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:14,
        padding:"36px 32px 28px",width:400,maxWidth:"calc(100vw - 32px)",
        boxShadow:C.naziv==="tamna"?"0 20px 60px rgba(0,0,0,0.5)":"0 8px 30px rgba(0,0,0,0.12)"}}>
        <div style={{marginBottom:28}}>
          <BrendingNaslov C={C} varijanta="login" />
        </div>
        <form autoComplete="off" onSubmit={e=>{e.preventDefault();prijavi();}}>
        {[["EMAIL","spc-login-email","text",email,setEmail,"","off"],
          ["LOZINKA","spc-login-pass","password",loz,setLoz,"","new-password"]].map(([l,name,t,v,s,ph,ac])=>(
          <div key={name} style={{textAlign:"left",marginBottom:14}}>
            <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>{l}</div>
            <input
              name={name}
              id={name}
              value={v}
              onChange={e=>s(e.target.value)}
              readOnly={!inputsReady}
              onFocus={e=>{ if(!inputsReady) setInputsReady(true); e.target.readOnly=false; }}
              type={t}
              placeholder={ph}
              autoComplete={ac}
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              style={{width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,
                color:C.tekst,fontSize:13,padding:"10px 12px",boxSizing:"border-box",
                outline:"none",fontFamily:"inherit"}}/>
          </div>
        ))}
        {err&&<div style={{color:C.crvena,fontSize:11,marginBottom:10,textAlign:"left",
          background:C.nok,padding:"7px 10px",borderRadius:5}}>{err}</div>}
        <button type="submit" disabled={load}
          style={{width:"100%",background:load?C.hover:C.zelena,border:"none",borderRadius:6,
            color:load?C.sivi:"#fff",fontSize:13,fontWeight:700,padding:"12px",
            cursor:load?"not-allowed":"pointer",letterSpacing:1,marginTop:4}}>
          {load?"Prijavljivanje...":"PRIJAVA"}
        </button>
        </form>
        <div style={{ textAlign: "center" }}>
          <AppFooter C={C} prikaziAutora />
        </div>
      </div>
    </div>
  );
}

// ─── UNOS: ciljevi vs stvarno + AQL serija ───────────────────
function UnosCiljBanner({ idDeo, listaP, C }) {
  const [cilj, setCilj] = useState(null);
  const [ost, setOst] = useState(null);

  useEffect(() => {
    if (!idDeo || idDeo.length < 3) { setCilj(null); setOst(null); return; }
    (async () => {
      const [c, s] = await Promise.all([
        fetchAktuelniCilj(supabase, idDeo.toUpperCase()),
        fetchDeoStatDanas(supabase, idDeo.toUpperCase(), dISO()),
      ]);
      setCilj(c);
      setOst(s);
    })();
  }, [idDeo, listaP.length]);

  if (!cilj || !ost) return null;
  const pend = pendingFromLista(listaP);
  const ok = ost.ok + pend.ok;
  const nok = ost.nok + pend.nok;
  const n = ok + nok;
  if (n < 3) return null;
  const rty = calcRTY(ok, n);
  const dpmo = calcDPMO(nok, n);
  const rtyLo = cilj.rty_cilj != null && rty < Number(cilj.rty_cilj);
  const dpmoHi = cilj.dpmo_cilj != null && dpmo > Number(cilj.dpmo_cilj);
  if (!rtyLo && !dpmoHi) return null;

  return (
    <div style={{ background: C.nok, border: `1px solid ${C.crvena}50`, borderRadius: 8,
      padding: "10px 12px", marginBottom: 8, fontSize: 10, lineHeight: 1.55 }}>
      <div style={{ color: C.crvena, fontWeight: 700, marginBottom: 4 }}>⚠ Van cilja kvaliteta (danas)</div>
      <div style={{ color: C.tekst }}>
        Cilj: RTY ≥ {cilj.rty_cilj}% · DPMO ≤ {Number(cilj.dpmo_cilj).toLocaleString()}
      </div>
      <div style={{ color: C.sivi, marginTop: 3 }}>
        Stvarno: RTY {rty}% {rtyLo && <span style={{ color: C.crvena }}>↓</span>}
        {" · "}DPMO {dpmo.toLocaleString()} {dpmoHi && <span style={{ color: C.crvena }}>↑</span>}
      </div>
    </div>
  );
}

function UnosAqlPanel({
  lotVelicina,
  onLotVelicinaChange,
  listaG,
  listaP,
  C,
  kompakt = false,
  uskiPanel = false,
  lotIzvor = "rucno",
  radniNalog = "",
  idDeo = "",
  onOtvoriAqlTab,
}) {
  const [podesavanja, setPodesavanja] = useState(() => ucitajAqlPodesavanja());
  const { nivo, tipInspekcije, aqlPoKlasi } = podesavanja;

  useEffect(() => {
    setPodesavanja(ucitajAqlPodesavanja());
  }, [idDeo, radniNalog]);

  const azurirajPodesavanja = useCallback((patch) => {
    setPodesavanja((prev) => snimiAqlPodesavanja({ ...prev, ...patch }));
  }, []);

  const stavke = useMemo(() => [...(listaG || []), ...(listaP || [])], [listaG, listaP]);
  const nokKlase = useMemo(() => nokPoAqlKlasi(stavke), [stavke]);
  const velicina = Math.max(2, lotVelicina || DEFAULT_AQL_LOT_SIZE);
  const lotIzRn = lotIzvor === "rn";
  const lotLabel = lotIzRn
    ? `RN ${radniNalog || "—"}`
    : lotIzvor === "plan"
      ? "planirano"
      : lotIzvor === "deo"
        ? `deo ${idDeo || "—"}`
        : "ručno";
  const lotReadonly = lotIzRn || lotIzvor === "plan" || lotIzvor === "deo";

  const inpAql = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: uskiPanel ? 4 : 5,
    color: C.tekst,
    fontSize: uskiPanel ? 9 : 10,
    padding: uskiPanel ? "3px 4px" : "4px 6px",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  };

  const planovi = useMemo(() =>
    DEFECT_KLASE.map(k => {
      const aql = aqlPoKlasi[k.id] ?? k.defaultAql;
      const plan = planZaKlasu(velicina, nivo, aql, tipInspekcije);
      const nok = nokKlase[k.id] || 0;
      return { ...k, aql, plan, nok, odluka: aqlOdluka(nok, plan.ac, plan.re, plan.fullInspection, tipInspekcije === "Smanjena") };
    }), [velicina, nivo, tipInspekcije, aqlPoKlasi, nokKlase]);

  const konacna = kombinovanaOdluka(Object.fromEntries(planovi.map(p => [p.id, p.odluka])));
  const boja = konacna.boja === "zelena" ? C.zelena : konacna.boja === "crvena" ? C.crvena
    : konacna.boja === "zuta" ? C.zuta : C.sivi;
  const uzorak = planUzorka(velicina, nivo);
  const ukNok = Object.values(nokKlase).reduce((a, b) => a + b, 0);

  const pad = uskiPanel ? 6 : kompakt ? 10 : 10;
  const fsLab = uskiPanel ? 7 : kompakt ? 8 : 9;
  const fsVal = uskiPanel ? 9 : kompakt ? 10 : 11;
  const gridGap = uskiPanel ? 3 : kompakt ? 6 : 8;
  const omotAql = {
    marginLeft: uskiPanel ? -8 : 0,
    width: uskiPanel ? "calc(100% + 8px)" : "100%",
    boxSizing: "border-box",
  };

  const lotPolje = lotReadonly ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ color: C.sivi, fontSize: 8, letterSpacing: 0.8 }}>LOT</span>
      <div style={{
        ...inpAql,
        background: C.panel,
        color: C.tekst,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        minHeight: 24,
      }}>
        {velicina.toLocaleString()}
      </div>
    </div>
  ) : (
    <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ color: C.sivi, fontSize: 8, letterSpacing: 0.8 }}>LOT</span>
      <input
        type="number"
        min={2}
        value={velicina}
        onChange={e => onLotVelicinaChange?.(snimiAqlLotVelicina(e.target.value))}
        style={inpAql}
      />
    </label>
  );

  const bojaKlase = { critical: C.crvena, major: C.narandzasta, minor: C.plava };
  const odlukaBoja = (o) => (
    o.boja === "zelena" ? C.zelena : o.boja === "crvena" ? C.crvena : o.boja === "zuta" ? C.zuta : C.sivi
  );

  return (
    <div style={{
      ...omotAql,
      background: C.panel,
      border: `1px solid ${boja}40`,
      borderRadius: kompakt || uskiPanel ? 8 : 10,
      padding: uskiPanel ? "8px 4px 8px 2px" : kompakt ? 10 : pad,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: kompakt ? 6 : 8,
        marginBottom: uskiPanel ? 6 : kompakt ? 8 : 10,
      }}>
        <div>
          <div style={{ color: C.sivi, fontSize: fsLab, letterSpacing: uskiPanel ? 0.6 : 1.2 }}>AQL · {lotLabel}</div>
          <div style={{ color: C.tekst, fontSize: uskiPanel ? 9 : kompakt ? 10 : 11, marginTop: 2 }}>
            Lot {velicina.toLocaleString()} · kod {uzorak.slovo} · ref. n={uzorak.n}
          </div>
        </div>
        <div style={{
          background: `${boja}18`,
          border: `1px solid ${boja}50`,
          borderRadius: 8,
          padding: uskiPanel ? "4px 6px" : kompakt ? "6px 10px" : "8px 12px",
          color: boja,
          fontWeight: 700,
          fontSize: uskiPanel ? 9 : kompakt ? 11 : 13,
        }}>
          {konacna.tekst}
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: gridGap,
        marginBottom: uskiPanel ? 6 : kompakt ? 8 : 10,
      }}>
        {lotPolje}
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ color: C.sivi, fontSize: uskiPanel ? 7 : kompakt ? 9 : 8, letterSpacing: 0.8 }}>NIVO</span>
          <select value={nivo} onChange={e => azurirajPodesavanja({ nivo: e.target.value })} style={inpAql}>
            {INSPECTION_LEVELS.filter(l => l.grupa === "general").map(l =>
              <option key={l.id} value={l.id}>{l.id}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ color: C.sivi, fontSize: uskiPanel ? 7 : kompakt ? 9 : 8, letterSpacing: 0.8 }}>TIP</span>
          <select value={tipInspekcije} onChange={e => azurirajPodesavanja({ tipInspekcije: e.target.value })} style={inpAql}>
            {INSPECTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
          </select>
        </label>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: gridGap,
        marginBottom: onOtvoriAqlTab ? (uskiPanel ? 6 : kompakt ? 8 : 10) : 0,
      }}>
        {planovi.map((p) => {
          const bk = bojaKlase[p.id];
          const ob = odlukaBoja(p.odluka);
          return (
            <div
              key={p.id}
              style={{
                background: C.bg,
                border: `1px solid ${bk}45`,
                borderRadius: uskiPanel ? 6 : 8,
                padding: uskiPanel ? "6px 2px" : kompakt ? "8px 6px" : "10px 8px",
                textAlign: "center",
                minWidth: 0,
              }}
            >
              <div style={{ color: bk, fontSize: uskiPanel ? 8 : kompakt ? 10 : 11, fontWeight: 700 }}>{p.naziv}</div>
              <div style={{ color: C.sivi, fontSize: uskiPanel ? 7 : kompakt ? 8 : 9, marginTop: 2 }}>AQL {p.aql}%</div>
              <div style={{ color: C.tekst, fontSize: uskiPanel ? 11 : kompakt ? 13 : 15, fontWeight: 700, margin: uskiPanel ? "4px 0 2px" : "6px 0 2px" }}>
                n={p.plan.n}
              </div>
              <div style={{ color: C.sivi, fontSize: uskiPanel ? 7 : kompakt ? 9 : 10, lineHeight: 1.25 }}>
                {p.plan.fullInspection ? "100%" : `Ac${p.plan.ac} Re${p.plan.re}`}
              </div>
              <div style={{
                color: p.nok > 0 ? C.crvena : C.tekst,
                fontSize: uskiPanel ? 11 : kompakt ? 14 : 16,
                fontWeight: 700,
                marginTop: uskiPanel ? 4 : 6,
              }}>
                NOK {p.nok}
              </div>
              <div style={{ color: ob, fontSize: uskiPanel ? 7 : kompakt ? 9 : 10, fontWeight: 700, marginTop: uskiPanel ? 2 : 4 }}>
                {p.odluka.tekst}
              </div>
            </div>
          );
        })}
      </div>

      {stavke.length > 0 && (
        <div style={{ fontSize: kompakt ? 8 : 9, color: C.sivi, textAlign: "center", marginBottom: onOtvoriAqlTab ? 6 : 0 }}>
          NOK iz {stavke.length} stavki liste (C/M/m po kategoriji greške)
        </div>
      )}

      {onOtvoriAqlTab && (
        <button type="button" onClick={onOtvoriAqlTab}
          style={{
            background: C.hover,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.plava,
            fontSize: kompakt ? 9 : 10,
            fontWeight: 700,
            padding: kompakt ? "8px 10px" : "8px 12px",
            cursor: "pointer",
            width: "100%",
          }}>
          🧮 Ručni AQL kalkulator (bez ID/RN) →
        </button>
      )}
    </div>
  );
}

// ─── GLAVNA FORMA ─────────────────────────────────────────────
function GlavnaForma({ korisnik, onOdjava, onNazad, C, setC, rezimRada = "analitika", onPromeniRezim, nav8dTick = 0, licenca = null }) {
  const ekran = useEkran();
  const jeLinija = rezimRada === "linija";
  const koristiMobLinija = jeLinija && ekran.linijaUredjaj;
  const koristiMobAnalitika = !jeLinija && (ekran.mob || ekran.tablet);
  const koristiMobUnos = koristiMobLinija || koristiMobAnalitika;
  const kontrolorLinija = jeKontrolorLinija(korisnik?.uloga, rezimRada);
  const LEva_W = "220px";
  const H = 1.5;
  const [sviDelovi,setSviDelovi] = useState([]);
  const [linije,setLinije]       = useState([]);
  const [masine,setMasine]       = useState([]);
  const [greskeKatalogRows, setGreskeKatalogRows] = useState([]);
  const [voziloKatalogRows,setVoziloKatalogRows] = useState([]);
  const [loadInit,setLoadInit]   = useState(true);
  const [idDeo,setIdDeo]         = useState("");
  const [deoInfo,setDeoInfo]     = useState(null);
  const [upoz,setUpoz]           = useState("");
  const [status,setStatus]       = useState("");
  const [kategorija,setKategorija] = useState("");
  const [podkat,setPodkat]         = useState("");
  const [defekt,setDefekt]         = useState("");
  const [voziloZona,setVoziloZona] = useState(null);
  const [kolicina,setKolicina]     = useState(1);
  const [smena,setSmena]           = useState(()=>Number(localStorage.getItem("spc_smena")||sessionStorage.getItem("spc_smena")||1));
  const [listaG,setListaG]         = useState([]);
  const [listaP,setListaP]         = useState([]);
  const [dbSmena,setDbSmena]       = useState({ ok: 0, nok: 0, merenja: 0 });
  const [nalogInfo,setNalogInfo]   = useState(null);
  const [prekidOdobrenId,setPrekidOdobrenId] = useState(null);
  const [preostalo,setPreostalo]   = useState(0);
  const [cilj,setCilj]             = useState(0);
  const [modal,setModal]           = useState(null);
  const [alarm,setAlarm]           = useState(null);
  const [tab,setTab]               = useState("unos");
  const [osmdPrefill,setOsmdPrefill] = useState(null);
  const primeniNavigaciju8d = () => {
    const { tab: tab8d, prefill } = procitajNavigaciju8d();
    if (tab8d && mozeTabAtributivne(tab8d, korisnik.uloga, rezimRada)) setTab(tab8d);
    if (prefill) setOsmdPrefill(prefill);
  };
  useEffect(() => { primeniNavigaciju8d(); }, [nav8dTick]); // eslint-disable-line
  const [saving,setSaving]         = useState(false);
  const [logD,setLogD]             = useState([]);
  const [loadLog,setLoadLog]       = useState(false);
  const [toasts,setToasts]         = useState([]);
  const [foto,setFoto]             = useState(null);
  const [pokaziZahtev,setPokaziZahtev] = useState(false);
  const [unosKorakAtr, setUnosKorakAtr] = useState("poka");
  const [kontrolnaListaOk, setKontrolnaListaOk] = useState(false);
  const prethodniIdAtr = useRef("");
  const prethodnaSmenaAtr = useRef(smena);
  const barkodRnRef = useRef("");
  const [komentar,setKomentar]     = useState("");
  const [radniNalog,setRadniNalog] = useState("");
  const [kpiSerija, setKpiSerija] = useState(() => podrazumevaniKpiIzListeP([]));
  const fotoRef = useRef(null);
  const idRef   = useRef(null);

  const addToast = useCallback((tekst,tip="info")=>{
    const id=Date.now(); setToasts(p=>[...p,{tekst,tip,id}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4500);
  },[]);

  const onFlushed = useCallback((res) => {
    if (res.syncedJobs > 0) {
      addToast(`✓ Sinhronizovano ${res.syncedJobs} offline paketa (${res.syncedRows} stavki)`, "uspeh");
    }
  }, [addToast]);

  const {
    online, queue, counts: offlineCounts, flushQueue,
    addAtributivneBatch,
  } = useOfflineQueue(supabase, {
    mirrorKontrolniLog: mirrorKontrolniLogToExcel,
    onFlushed,
  });

  const voziloMode = jeKontrolaCelogVozila(deoInfo);
  const voziloDijagramSrc = useMemo(() => dijagramSrcZaDeo(deoInfo), [deoInfo]);
  const voziloFormaEkran = voziloMode && deoInfo && unosKorakAtr === "forma";
  const prikaziLokaciju = !voziloMode;
  const pendingStat = useMemo(() => pendingFromLista(listaP), [listaP]);
  const smenaStat = useMemo(() => mergeSmenaStat(dbSmena, pendingStat), [dbSmena, pendingStat]);
  const smenaOK = smenaStat.ok;
  const smenaNOK = smenaStat.nok;
  const smenaTotal = smenaStat.merenja;
  const [lotAql, setLotAql] = useState(() => ucitajAqlLotVelicina());
  const [lotAqlIzvor, setLotAqlIzvor] = useState("rucno");
  const promeniLotAql = useCallback((n) => {
    const v = snimiAqlLotVelicina(n);
    setLotAql(v);
    setLotAqlIzvor("rucno");
    return v;
  }, []);

  useEffect(() => {
    if (idDeo.length < 3) return;
    let alive = true;

    (async () => {
      let nalog = nalogInfo;
      const rn = String(radniNalog || "").trim().toUpperCase();
      if (rn && (!nalog || nalog.broj_naloga !== rn)) {
        nalog = await ucitajNalogZaDeoIRn(supabase, idDeo, rn);
      }
      if (!alive) return;
      const { velicina, izvor } = lotVelicinaZaAql({
        nalog,
        deo: deoInfo,
        planiranoKom: kpiSerija?.planirano_kom,
      });
      setLotAql(velicina);
      setLotAqlIzvor(izvor);
    })();

    return () => { alive = false; };
  }, [idDeo, radniNalog, nalogInfo, deoInfo, kpiSerija?.planirano_kom]);

  useEffect(() => {
    if (!listaP.length) return;
    const base = podrazumevaniKpiIzListeP(listaP);
    setKpiSerija(prev => ({
      ...base,
      dorada: prev?.dorada ?? base.dorada,
      skart: prev?.skart ?? base.skart,
      ok_nakon_dorade: prev?.ok_nakon_dorade ?? base.ok_nakon_dorade,
      planirano_min: prev?.planirano_min ?? base.planirano_min,
      zastoj_min: prev?.zastoj_min ?? base.zastoj_min,
    }));
  }, [listaP]);
  const { linija: linijaNaziv, masina: masinaNaziv } = lokacijaDela(deoInfo, linije, masine);
  const koristiDefekte = voziloMode;

  const onVoziloZonaChange = useCallback((zonaId) => {
    setVoziloZona(zonaId);
    setKategorija("");
    setPodkat("");
    setDefekt("");
  }, []);

  const greskeZaDeo = useMemo(
    () => buildGreskeKatalog(filtrirajGreskeZaDeo(greskeKatalogRows, deoInfo)),
    [greskeKatalogRows, deoInfo],
  );

  const voziloKatPoZoni = useMemo(() => {
    if (!voziloMode || !voziloZona) return { gr: {}, df: {} };
    const rows = filtrirajKatalogVozilaZaUnos(voziloKatalogRows, deoInfo, voziloZona);
    return buildGreskeKatalog(rows);
  }, [voziloMode, voziloZona, voziloKatalogRows, deoInfo]);

  const greskeZaUnos = voziloMode ? voziloKatPoZoni.gr : greskeZaDeo.gr;
  const defektiZaUnos = voziloMode ? voziloKatPoZoni.df : greskeZaDeo.df;

  useEffect(() => {
    if (!koristiDefekte) setDefekt("");
  }, [deoInfo?.id_deo, koristiDefekte]);

  const proveriPrekid = useCallback(async () => {
    try {
      const id = await ucitajOdobrenPrekid(supabase, {
        radnikId: korisnik?.radnikId,
        idDeo,
      });
      setPrekidOdobrenId(id);
    } catch {
      setPrekidOdobrenId(null);
    }
  }, [idDeo, korisnik?.radnikId]);

  useEffect(() => { proveriPrekid(); }, [proveriPrekid]);

  const prethodniPrekid = useRef(null);
  useEffect(() => {
    if (prekidOdobrenId && !prethodniPrekid.current) {
      addToast("✓ Admin je odobrio prekid serije — možete zapisati u bazu", "uspeh");
    }
    prethodniPrekid.current = prekidOdobrenId;
  }, [prekidOdobrenId, addToast]);

  useEffect(() => {
    if (!korisnik?.radnikId) return;
    const ch = supabase.channel("prekidi_kontrolor")
      .on("postgres_changes", { event: "*", schema: "public", table: "prekidi_zahtevi" },
        () => proveriPrekid())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [korisnik?.radnikId, proveriPrekid]);

  /** Ako realtime ne stigne, povremeno proveri odobrenje dok serija nije završena. */
  useEffect(() => {
    if (!idDeo || idDeo.length < 3 || preostalo <= 0 || prekidOdobrenId) return;
    const t = setInterval(() => proveriPrekid(), 4000);
    return () => clearInterval(t);
  }, [idDeo, preostalo, prekidOdobrenId, proveriPrekid]);

  useEffect(() => {
    const osvezi = () => {
      if (document.visibilityState === "visible") proveriPrekid();
    };
    document.addEventListener("visibilitychange", osvezi);
    window.addEventListener("focus", proveriPrekid);
    return () => {
      document.removeEventListener("visibilitychange", osvezi);
      window.removeEventListener("focus", proveriPrekid);
    };
  }, [proveriPrekid]);

  // Init
  useEffect(()=>{
    (async()=>{
      try{
        const [{ data: d }, { data: lin }, { data: mas }, { data: g }, { data: gv }] = await Promise.all([
          supabase.from("delovi")
            .select("id_deo,naziv_dela,kom_za_kontrolu,karakteristika,slika_naziv,napomena,linija_id,masina_id,tip_kontrole,vozilo_katalog_id,greska_katalog_id,linija:linije(linija,id),masina:masine(naziv,id)")
            .eq("aktivan", true),
          supabase.from("linije").select("id,linija"),
          supabase.from("masine").select("id,naziv"),
          supabase.from("greske_katalog").select("kategorija,podkategorija,defekt,id_deo,katalog_id").order("kategorija"),
          supabase.from("katalog_gresaka_vozilo").select("vozilo_id,kategorija,podkategorija,defekt").order("kategorija"),
        ]);
        setSviDelovi(d || []);
        setLinije(lin || []);
        setMasine(mas || []);
        setGreskeKatalogRows(g || []);
        setVoziloKatalogRows(gv || []);
      }catch(e){addToast(e.message,"greska");}
      finally{setLoadInit(false);setTimeout(()=>idRef.current?.focus(),100);}

      const ch=supabase.channel("spc_rt")
        .on("postgres_changes",{event:"INSERT",schema:"public",table:"kontrolni_log"},payload=>{
          const r=payload.new;
          if(r.status==="NOK") addToast(`🔴 NOK: ${r.id_deo} — ${r.greska_naziv} ×${r.nok_kolicina}`,"greska");
        }).subscribe();
      return()=>supabase.removeChannel(ch);
    })();
  },[]);

  const osveziSmenaStat = useCallback(async () => {
    try {
      const stat = await fetchSmenaStat(supabase, { datum: dISO(), smena });
      setDbSmena(stat);
    } catch { /* offline */ }
  }, [smena]);

  useEffect(() => { osveziSmenaStat(); }, [osveziSmenaStat]);

  useEffect(() => {
    const ch = supabase.channel("spc_smena_rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "kontrolni_log" },
        () => osveziSmenaStat())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [osveziSmenaStat]);

  useEffect(() => {
    if (idDeo.length < 3) return;
    ensureSesija({ modul: "atributivne", idDeo, smena, radniNalog });
  }, [idDeo, smena, radniNalog]);

  useEffect(() => {
    if (idDeo.length < 3) return;
    fetchPlaniranoKomZaDeo(supabase, idDeo).then(plan => {
      if (plan > 0) setKpiSerija(p => ({ ...p, planirano_kom: plan }));
    });
  }, [idDeo, nalogInfo?.broj_naloga]);

  useEffect(()=>{ localStorage.setItem("spc_smena", String(smena)); sessionStorage.setItem("spc_smena", String(smena)); },[smena]);

  useEffect(() => {
    const sm = Number(smena);
    const idZaListu = jeLinija && deoInfo ? String(idDeo || "").trim().toUpperCase() : null;

    if (jeLinija && !idZaListu) {
      setKontrolnaListaOk(false);
      return;
    }

    setKontrolnaListaOk(getListaOkSession("atributivne", sm, idZaListu));
  }, [smena, idDeo, deoInfo, jeLinija]);

  const obradiBarkodSken = useCallback((raw) => {
    const parsed = parsiBarkod(raw);
    const res = primeniParsiraniBarkod(parsed, {
      postaviId: (id) => {
        barkodRnRef.current = parsed?.radni_nalog
          ? String(parsed.radni_nalog).trim().toUpperCase()
          : "";
        setIdDeo(id);
        setTimeout(() => idRef.current?.blur(), 50);
      },
      postaviSmena: (s) => {
        setSmena(Number(s));
        localStorage.setItem("spc_smena", s);
      },
    });
    if (!res) return;
    addToast(
      `📷 Skenirano: ${res.id}${res.radni_nalog ? ` · ${res.radni_nalog}` : ""}`,
      "uspeh",
    );
    window._vibrirajOK?.();
  }, [addToast]);

  useBarcodeScanner(useCallback((raw) => {
    obradiBarkodSken(raw);
  }, [obradiBarkodSken]));

  const idBarkodPolje = useMemo(
    () => idBarkodInputHandleri(obradiBarkodSken, { postaviId: setIdDeo, upperCase: true }),
    [obradiBarkodSken],
  );

  useEffect(() => {
    if (!deoInfo) return;
    if (smena !== prethodnaSmenaAtr.current) {
      setUnosKorakAtr(pocetniKorakUnosAtr(korisnik?.uloga, rezimRada, { voziloMode }));
      prethodnaSmenaAtr.current = smena;
    }
  }, [smena, deoInfo, korisnik?.uloga, rezimRada, voziloMode]);

  // ID deo lookup + barkod auto-popunjavanje
  useEffect(()=>{
    if(idDeo.length<3){setDeoInfo(null);setUpoz("");prethodniIdAtr.current="";return;}
    const idNorm = idDeo.toUpperCase();
    const n=sviDelovi.find(d=>d.id_deo.toUpperCase()===idNorm);
    if(n){
      const voziloDeo = jeKontrolaCelogVozila(n);
      setDeoInfo(prev => (prev?.id_deo?.toUpperCase() === idNorm ? prev : n));
      setCilj(n.kom_za_kontrolu||30);setPreostalo(n.kom_za_kontrolu||30);
      const noviDeo = idNorm !== prethodniIdAtr.current.toUpperCase();
      if (noviDeo) {
        setUnosKorakAtr(pocetniKorakUnosAtr(korisnik?.uloga, rezimRada, { voziloMode: voziloDeo }));
        setVoziloZona(null);
        prethodniIdAtr.current = idDeo;
      }

      const eksplicitniRn = barkodRnRef.current;
      barkodRnRef.current = "";
      if (noviDeo) setRadniNalog("");

      // Paralelno: najčešće greške + aktivni radni nalog za deo
      Promise.all([
        supabase.from("kontrolni_log")
          .select("greska_naziv").eq("id_deo",idDeo.toUpperCase()).eq("status","NOK")
          .order("created_at",{ascending:false}).limit(100),
        ucitajAktivniRadniNalog(supabase, idDeo),
      ]).then(([{data:greske}, nalog])=>{
        if(greske?.length){
          const b={};greske.forEach(r=>{b[r.greska_naziv]=(b[r.greska_naziv]||0)+1;});
          const mx=Object.entries(b).sort((a,bb)=>bb[1]-a[1])[0];
          if(mx&&mx[1]>=2) setUpoz(`⚠ ČESTO: ${mx[0]} (${mx[1]}x)`); else setUpoz("");
        } else setUpoz("");
        setNalogInfo(nalog || null);
        const rn = izaberiRadniNalog({ eksplicitni: eksplicitniRn, izBaze: nalog });
        if (rn) {
          setRadniNalog(rn);
          if (noviDeo && nalog && !eksplicitniRn && rn === nalog.broj_naloga) {
            addToast(`📋 ${formatNalogToast(nalog)}`, "info");
          }
        }
      });
    }else if (prethodniIdAtr.current.toUpperCase() !== idNorm) {
      setDeoInfo(null);setUpoz("");prethodniIdAtr.current="";
    }
  },[idDeo,sviDelovi,korisnik?.uloga,rezimRada]); // eslint-disable-line

  const dodajGresku=()=>{
    if(!deoInfo){setModal({poruka:"ID dela nije pronađen!",tip:"greska"});return;}
    if(!status) {setModal({poruka:"Izaberi STATUS!",tip:"greska"});return;}
    if(status==="NOK"&&voziloMode&&!voziloZona){setModal({poruka:"Izaberi zonu vozila na dijagramu!",tip:"greska"});return;}
    if(status==="NOK"&&(!kategorija||!podkat)){setModal({poruka:"Popuni NOK detalje!",tip:"greska"});return;}
    if(status==="NOK"&&koristiDefekte&&!defekt){setModal({poruka:"Izaberi DEFEKT (kontrola vozila)!",tip:"greska"});return;}
    const defektUnos = status==="OK" ? "-" : (koristiDefekte ? defekt : podkat);
    setListaG(p=>[...p,{kat:status==="OK"?"OK":kategorija,pod:status==="OK"?"-":podkat,
      defekt:defektUnos,status,kolicina,foto:status==="NOK"?foto:null,komentar:komentar||""}]);
    setStatus("");setKategorija("");setPodkat("");setDefekt("");setKolicina(1);setFoto(null);setKomentar("");
  };

  const snimiDeo=()=>{
    if(!listaG.length){setModal({poruka:"Lista je prazna!",tip:"greska"});return;}
    if(preostalo<=0) {setModal({poruka:"Serija je već gotova!",tip:"greska"});return;}
    let ok=0,nok=0;
    const np=listaG.map(s=>{if(s.status==="NOK")nok+=s.kolicina;else ok+=s.kolicina;
      return{...s,idDeo:idDeo.toUpperCase(),datum:dISO(),vreme:vreme()};});
    setListaP(p=>[...p,...np]);
    setPreostalo(p=>Math.max(0,p-1));setListaG([]);
    addToast(`✓ Sačuvano (OK:${ok} NOK:${nok})`,"uspeh");
    if(nok>0) window._vibrirajNOK?.();
    else window._vibrirajOK?.();
  };

  const zapisi=async()=>{
    if(saving) return;
    if(!listaP.length){setModal({poruka:"Lista pregleda je prazna!",tip:"greska"});return;}
    const mozeBezPreostalog = mozeAdmin(korisnik.uloga) || prekidOdobrenId;
    if(preostalo>0 && !mozeBezPreostalog){
      setModal({
        poruka:`Serija nije završena (preostalo ${preostalo} od ${cilj}).\n\nKontrolor mora poslati zahtev adminu za prekid merenja.`,
        tip:"greska",
        okTekst:"📤 Pošalji zahtev adminu",
        onOK:()=>{setModal(null);setPokaziZahtev(true);},
        onOtkazati:()=>setModal(null),
      });
      return;
    }
    if(!korisnik.radnikId){
      setModal({poruka:"Nalog nije povezan sa tabelom radnici (nema radnik ID).\nProverite email u Auth i u radnici.csv, pa se ponovo ulogujte.",tip:"greska"});
      return;
    }
    const rnUpoz = await proveriRadniNalogUpozorenje(supabase, { idDeo, radniNalog });
    if (rnUpoz) addToast(`⚠ ${rnUpoz}`, "greska");

    setSaving(true);
    const sesija_id = ensureSesija({ modul: "atributivne", idDeo, smena, radniNalog });
    const redovi=listaP.map(s=>{const j=s.status==="OK";return ocistiRedZaInsert({
      datum:s.datum,smena,radni_nalog:radniNalog||null,id_deo:s.idDeo,naziv_dela:deoInfo?.naziv_dela||"",
      linija_id:deoInfo?.linija?.id||null,masina_id:deoInfo?.masina?.id||null,
      kontrolor_id:korisnik.radnikId,operater_id:korisnik.uloga==="operator"?korisnik.radnikId:null,
      status:s.status,
      greska_naziv:s.kat,podkategorija:s.pod,defekt:s.defekt||null,
      kom_nok:j?0:s.kolicina,ok_kolicina:j?s.kolicina:0,
      nok_kolicina:j?0:s.kolicina,ukupno_merenja:s.kolicina,potreban_broj:cilj,
      komentar:s.komentar||null,
      sesija_id,
    });});
    const kpiPayload = {
      modul: "atributivne",
      datum: dISO(),
      smena,
      id_deo: idDeo,
      serija: null,
      radni_nalog: radniNalog,
      sesija_id,
      kpi: kpiSerija,
    };
    try{
      if(!online){
        addAtributivneBatch({ logRows: redovi, kpi: kpiPayload, sesija_id });
        addToast(`📶 Offline: paket u redu (${redovi.length} stavki + KPI)`,"info");
        setListaP([]);setListaG([]);noviNalog();
        return;
      }
      const{error}=await supabase.from("kontrolni_log").insert(redovi);
      if(error)throw error;
      const { error: errKpi } = await snimiKpiUnos(supabase, kpiPayload);
      if (errKpi) addToast(porukaKpiGreske(errKpi), "greska");
      const mirror = await mirrorKontrolniLogToExcel(supabase, redovi);
      if (mirror.storage) addToast("📊 Excel kopija ažurirana (Supabase Storage)","info");
      else if (mirror.download) addToast("📊 Excel kopija preuzeta lokalno","info");
      const nok=redovi.filter(r=>r.status==="NOK").length,uk=redovi.length;
      const nokKom=redovi.reduce((s,r)=>s+(r.nok_kolicina||0),0);
      const okKom=redovi.reduce((s,r)=>s+(r.ok_kolicina||0),0);
      if(uk>0&&(nok/uk)>0.1) setAlarm(`p = ${((nok/uk)*100).toFixed(1)}% NOK za ${deoInfo?.naziv_dela}`);
      if (uk > 0 && nokKom / (nokKom + okKom) > 0.1) {
        const settings = await ucitajPodesavanjaNotifikacija(supabase);
        await obradiAlarmeNotifikacije(supabase, [{
          id: `nok_serija_${idDeo}_${dISO()}`,
          nivo: "visok",
          naslov: `Visok NOK: ${idDeo}`,
          opis: `${((nokKom / (nokKom + okKom)) * 100).toFixed(1)}% NOK — ${deoInfo?.naziv_dela || ""}`,
        }], settings);
        try {
          await kreirajAutoEskalaciju(supabase, {
            id_deo: idDeo.toUpperCase(),
            opis: `Visok NOK u seriji (${((nokKom / (nokKom + okKom)) * 100).toFixed(1)}%) — ${deoInfo?.naziv_dela || idDeo}`,
            prioritet: "visok",
            kreirao_id: korisnik.radnikId,
            prefiks: "AUTO-NOK",
          });
          addToast("📢 Auto-eskalacija kreirana (visok NOK)", "info");
        } catch { /* */ }
      }
      await osveziSmenaStat();
      if (prekidOdobrenId) {
        await supabase.from("prekidi_zahtevi").update({
          status: "zatvoren",
          updated_at: new Date().toISOString(),
        }).eq("id", prekidOdobrenId);
        setPrekidOdobrenId(null);
      }
      setListaP([]);
      setListaG([]);
      setModal({poruka:`✓ Sačuvano ${redovi.length} stavki u bazu!`,tip:"uspeh",
        onOK:()=>{setModal(null);noviNalog();}});
    }catch(e){addToast(porukaDbGreske(e),"greska");}
    finally{setSaving(false);}
  };

  const ucitajLog=async()=>{
    setLoadLog(true);
    try{
      const{data,error}=await supabase.from("kontrolni_log")
        .select("datum,id_deo,naziv_dela,greska_naziv,podkategorija,status,ok_kolicina,nok_kolicina,smena,created_at")
        .order("created_at",{ascending:false}).limit(150);
      if(error)throw error; setLogD(data||[]);
    }catch(e){addToast(e.message,"greska");}
    finally{setLoadLog(false);}
  };
  useEffect(()=>{if(tab==="log")ucitajLog();},[tab]);

  const noviNalog=()=>{
    novaSesija({ modul: "atributivne", idDeo: "", smena, radniNalog: "" });
    setIdDeo("");setDeoInfo(null);setUpoz("");setStatus("");
    setUnosKorakAtr(pocetniKorakUnosAtr(korisnik?.uloga, rezimRada, { voziloMode: false }));
    setKategorija("");setPodkat("");setDefekt("");setKolicina(1);
    setListaG([]);setListaP([]);setPreostalo(0);setCilj(0);setFoto(null);
    setKomentar("");setRadniNalog("");setNalogInfo(null);setPrekidOdobrenId(null);
    setVoziloZona(null);
    setKpiSerija(podrazumevaniKpiIzListeP([]));
    setTimeout(()=>idRef.current?.focus(),100);
  };

  const odjava=async()=>{ocistiUnosDraft();await supabase.auth.signOut();onOdjava();};

  const LBL={color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4,display:"block"};
  const INP={width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,
    color:C.tekst,fontSize:12,padding:"9px 11px",boxSizing:"border-box",outline:"none",fontFamily:"inherit"};
  const BTN=(bg,dis=false)=>({background:dis?C.hover:bg,border:"none",borderRadius:6,
    color:dis?C.sivi:"#fff",fontSize:12,fontWeight:700,padding:"10px 0",
    cursor:dis?"not-allowed":"pointer",letterSpacing:1,width:"100%",opacity:dis?0.5:1,transition:"all 0.15s"});

  const TABOVI=[
    ["unos","UNOS"],["crtez","CRTEŽ"],["log","LOG"],["smena","SMENA"],["karte","SPC KARTE"],
    ["dashboard","DASHBOARD"],["stanje","STANJE"],["eskalacije","ESKALACIJE"],["8d","8D"],["aql","AQL"],
    ["foto","FOTO"],["oee","OEE"],["kalibracija","MERILA"],["ciljevi","CILJEVI"],["nalozi","NALOZI"],
    ["kupac","KUPAC"],["oc","OC KRIVA"],["stabilnost","STABILNOST"],
    ["trasabilitet","TRASABILITET"],
    ...(mozeAdmin(korisnik.uloga)?[["admin","ADMIN"]]:[]),
  ].filter(([id]) => mozeTabAtributivne(id, korisnik.uloga, rezimRada));

  useEffect(() => {
    if (!mozeTabAtributivne(tab, korisnik.uloga, rezimRada)) setTab("unos");
  }, [tab, korisnik.uloga, rezimRada]);

  const punPristupTabovima = mozeAdmin(korisnik.uloga) || jeKvalitetIliVise(korisnik.uloga);

  useEffect(() => {
    if (!jeLinija || punPristupTabovima) return;
    if (tab !== "unos" && tab !== "log") setTab("unos");
  }, [jeLinija, tab, punPristupTabovima]);

  if(loadInit)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",color:C.sivi,fontFamily:"'IBM Plex Mono',monospace",fontSize:12}}>
      Učitavanje...
    </div>
  );

  const zavrsiKontrolnuListuAtr = () => {
    const idZaListu = jeLinija && deoInfo ? String(idDeo || "").trim().toUpperCase() : null;
    setKontrolnaListaOk(true);
    setListaOkSession("atributivne", Number(smena), idZaListu);
  };

  const trebaCekListaAtr = tab === "unos" && !kontrolnaListaOk && (jeLinija ? !!deoInfo : true);

  if (trebaCekListaAtr) {
    const idZaListu = jeLinija && deoInfo ? String(idDeo || "").trim().toUpperCase() : null;
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono', monospace" }}>
        <AppHeader
          korisnik={korisnik}
          onOdjava={onOdjava}
          onNazad={onNazad}
          C={C}
          onToggleTema={() => setC(p => p.naziv === "tamna" ? TEME.svetla : TEME.tamna)}
          temaTamna={C.naziv === "tamna"}
        />
        <KontrolnaLista
          korisnik={korisnik}
          smena={Number(smena)}
          idDeo={idZaListu}
          naslovModul="Atributivne"
          onZavrsena={zavrsiKontrolnuListuAtr}
          C={C}
        />
      </div>
    );
  }

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'IBM Plex Mono',monospace",color:C.tekst}}>
      {modal&&<Modal poruka={modal.poruka} tip={modal.tip} okTekst={modal.okTekst}
        onOK={modal.onOK||(()=>setModal(null))} onOtkazati={modal.onOtkazati} C={C}/>}
      {alarm&&<AlarmBanner poruka={alarm} onClose={()=>setAlarm(null)} C={C}/>}
      <Toast poruke={toasts} C={C}/>
      {pokaziZahtev&&<ZahtevPrekid
        korisnik={korisnik} idDeo={String(idDeo||"").toUpperCase()} nazivDela={deoInfo?.naziv_dela||""}
        preostalo={preostalo} cilj={cilj}
        onUspeh={()=>{setPokaziZahtev(false);proveriPrekid();addToast("✓ Zahtev poslat adminu — čeka odobrenje","uspeh");}}
        onOtkazati={()=>setPokaziZahtev(false)} C={C}
      />}

      <AppHeader
        korisnik={korisnik}
        onOdjava={odjava}
        onNazad={onNazad}
        C={C}
        onToggleTema={() => setC(p => p.naziv === "tamna" ? TEME.svetla : TEME.tamna)}
        temaTamna={C.naziv === "tamna"}
        desnoExtra={(
          <>
            {(ekran.mob || ekran.tablet) && (
              <span title={online ? "Online" : `Offline (${offlineCounts.total})`} style={{ flexShrink: 0, display: "flex" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%",
                  background: online ? C.zelena : C.crvena, display: "inline-block" }} />
              </span>
            )}
            {jeLinija && koristiMobLinija && mozeTabAtributivne("log", korisnik.uloga, rezimRada) && (
              <button
                type="button"
                onClick={() => setTab(tab === "log" ? "unos" : "log")}
                style={{
                  background: tab === "log" ? `${C.plava}22` : C.hover,
                  border: `1px solid ${tab === "log" ? C.plava : C.border}`,
                  borderRadius: 5, color: tab === "log" ? C.plava : C.sivi,
                  fontSize: 8, padding: "1px 5px", cursor: "pointer", fontWeight: 700, flexShrink: 0,
                }}
              >
                {tab === "log" ? "←" : "LOG"}
              </button>
            )}
            {mozePrebacivanjeRezima(korisnik.uloga) && typeof onPromeniRezim === "function" && (
              <button
                type="button"
                onClick={() => onPromeniRezim(jeLinija ? "analitika" : "linija")}
                title={jeLinija ? "Analitika" : "Linija"}
                style={{
                  background: jeLinija ? `${C.zelena}22` : `${C.plava}22`,
                  border: `1px solid ${jeLinija ? C.zelena : C.plava}`,
                  borderRadius: 5, color: jeLinija ? C.zelena : C.plava,
                  fontSize: 8, padding: "1px 5px", cursor: "pointer", fontWeight: 700, flexShrink: 0,
                }}
              >
                {(ekran.mob || ekran.tablet) ? (jeLinija ? "📊" : "🏭") : (jeLinija ? "📊 Analitika" : "🏭 Linija")}
              </button>
            )}
          </>
        )}
        trakaIspod={(ekran.mob || ekran.tablet) ? null : (
          <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`,
            padding: "6px 20px", display: "flex", alignItems: "center", gap: 10, fontSize: 10 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, color: C.sivi }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%",
                background: online ? C.zelena : C.crvena, display: "inline-block" }} />
              {online ? "Online" : `Offline (${offlineCounts.total} pak.)`}
              {getAktivnaSesija("atributivne")?.sesija_id && (
                <span style={{ color: C.border, fontSize: 8, marginLeft: 4 }}
                  title={getAktivnaSesija("atributivne").sesija_id}>· sesija</span>
              )}
            </span>
            {tab !== "unos" && (
              <>
                <span style={{ color: C.border }}>|</span>
                <select value={smena}
                  onChange={e => { setSmena(Number(e.target.value)); localStorage.setItem("spc_smena", e.target.value); }}
                  style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4,
                    color: C.tekst, fontSize: 10, padding: "2px 8px", cursor: "pointer" }}>
                  <option value={1}>Smena 1</option>
                  <option value={2}>Smena 2</option>
                  <option value={3}>Smena 3</option>
                </select>
              </>
            )}
          </div>
        )}
      />

      {/* TABOVI — analitika (sve uloge) ili linija desktop / admin+kvalitet na tel/tablet */}
      {(punPristupTabovima || !jeLinija || !ekran.linijaUredjaj) && TABOVI.length > 1 && (
      <div style={{
        display: "flex",
        borderBottom: `1px solid ${C.border}`,
        background: C.panel,
        paddingLeft: (ekran.mob || ekran.tablet) ? 6 : 18,
        flexWrap: "nowrap",
        overflowX: (ekran.mob || ekran.tablet) ? "auto" : "visible",
        WebkitOverflowScrolling: "touch",
      }}>
        {TABOVI.map(([id,n])=>(
          <button key={id} type="button" onClick={()=>setTab(id)} style={{
            background:"none",border:"none", flexShrink: 0,
            borderBottom:tab===id?`2px solid ${id==="dashboard"?C.zelena:id==="karte"?C.narandzasta:id==="crtez"?C.ljubicasta:id==="stanje"?C.ljubicasta:id==="admin"?C.zuta:C.plava}`:"2px solid transparent",
            color:tab===id?(id==="dashboard"?C.zelena:id==="karte"?C.narandzasta:id==="crtez"?C.ljubicasta:id==="stanje"?C.ljubicasta:id==="admin"?C.zuta:C.plava):C.sivi,
            fontSize:(ekran.mob || ekran.tablet) ? 9 : 10,fontWeight:700,padding:(ekran.mob || ekran.tablet) ? "8px 10px" : "10px 14px",cursor:"pointer",letterSpacing:1}}>
            {n}
            {id==="unos"&&listaP.length>0&&<span style={{background:C.plava,color:"#fff",fontSize:8,borderRadius:10,padding:"1px 5px",marginLeft:5}}>{listaP.length}</span>}
          </button>
        ))}
        <div style={{flex:1,minWidth:8}}/>
        {!(ekran.mob || ekran.tablet) && (
          <span style={{color:C.sivi,fontSize:9,alignSelf:"center",paddingRight:12,flexShrink:0}}>{dPrikaz()}</span>
        )}
      </div>
      )}

            {/* ══ UNOS ══ */}
      {tab==="unos" && koristiMobUnos && (
        <MobilniUnos
          linijaMode={jeLinija}
          kontrolorLinija={kontrolorLinija}
          smena={smena}
          radniNalog={radniNalog}
          setRadniNalog={setRadniNalog}
          unosKorakAtr={unosKorakAtr}
          setUnosKorakAtr={setUnosKorakAtr}
          linijaNaziv={linijaNaziv}
          masinaNaziv={masinaNaziv}
          korisnikIme={korisnik?.ime}
          idDeo={idDeo} setIdDeo={setIdDeo} deoInfo={deoInfo} upoz={upoz}
          prikaziLokaciju={prikaziLokaciju}
          status={status} setStatus={setStatus}
          kategorija={kategorija} setKategorija={setKategorija}
          podkat={podkat} setPodkat={setPodkat}
          defekt={defekt} setDefekt={setDefekt}
          kolicina={kolicina} setKolicina={setKolicina}
          greskeKat={greskeZaUnos}
          defektiMap={defektiZaUnos}
          koristiDefekte={koristiDefekte}
          voziloMode={voziloMode}
          voziloZona={voziloZona}
          onVoziloZonaChange={onVoziloZonaChange}
          listaG={listaG} setListaG={setListaG}
          listaP={listaP} setListaP={setListaP}
          preostalo={preostalo} cilj={cilj}
          prekidOdobrenId={prekidOdobrenId}
          onZahtevPrekid={()=>setPokaziZahtev(true)}
          korisnik={korisnik}
          smenaOK={smenaOK} smenaNOK={smenaNOK} smenaTotal={smenaTotal}
          lotVelicina={lotAql}
          lotIzvor={lotAqlIzvor}
          onLotVelicinaChange={promeniLotAql}
          onOtvoriAqlTab={mozeTabAtributivne("aql", korisnik.uloga, rezimRada) ? () => setTab("aql") : undefined}
          setSmena={setSmena}
          dodajGresku={dodajGresku} snimiDeo={snimiDeo} zapisi={zapisi}
          noviNalog={noviNalog} saving={saving} online={online} offlineQueueTotal={offlineCounts.total} C={C}
          kpiSerija={kpiSerija} setKpiSerija={setKpiSerija}
          kontrolnaListaOk={kontrolnaListaOk}
          idRef={idRef}
          onBarkodSken={obradiBarkodSken}
        />
      )}
      {tab==="unos" && !koristiMobUnos && (
        <div style={{
          display:"grid",
          gridTemplateColumns: !deoInfo
            ? `${LEva_W} 1fr`
            : voziloFormaEkran
              ? `${LEva_W} minmax(480px, 1.35fr) minmax(280px, 0.65fr) 235px`
              : (voziloMode || unosKorakAtr === "forma" ? `${LEva_W} 1fr 235px` : `${LEva_W} 1fr`),
          height:"calc(100vh - 89px)",
        }}>
          {/* Leva */}
          <div style={{borderRight:`1px solid ${C.border}`,padding:Math.round(8*H),overflowY:"auto",display:"flex",flexDirection:"column",gap:Math.round(8*H)}}>
            <div>
              <IdDeoBarkodRed
                C={C}
                akcent={C.plava}
                onBarkodSken={obradiBarkodSken}
                lblStyle={{ ...LBL, fontSize: Math.round(8 * H), letterSpacing: 1, marginBottom: 4 }}
                idLabel="ID deo"
                kompaktRed
                sirinaBarkod={Math.round(44 * H)}
                unosStil={{
                  borderRadius: 6,
                  padding: `${Math.round(6 * H)}px ${Math.round(4 * H)}px`,
                  fontSize: Math.round(12 * H),
                }}
              >
                <input
                  ref={idRef}
                  value={idDeo}
                  {...idBarkodPolje}
                  placeholder="5501-A"
                  title="Ručni unos, USB čitač (fokus u polje) ili veb kamera"
                  style={{
                    ...INP,
                    borderColor: deoInfo ? C.zelena : idDeo.length > 2 ? C.crvena : C.border,
                    background: deoInfo ? C.ok : idDeo.length > 2 ? C.nok : C.input,
                    fontSize: Math.round(12 * H),
                    fontWeight: 700,
                    letterSpacing: 1,
                    textAlign: "center",
                    padding: `${Math.round(6 * H)}px ${Math.round(4 * H)}px`,
                  }}
                />
              </IdDeoBarkodRed>
              <label style={{ ...LBL, fontSize: Math.round(8 * H), letterSpacing: 1, marginTop: Math.round(6 * H), display: "block" }}>
                Smena
                <select
                  value={smena}
                  onChange={e => {
                    setSmena(Number(e.target.value));
                    localStorage.setItem("spc_smena", e.target.value);
                  }}
                  style={{
                    ...INP,
                    marginTop: 4,
                    fontSize: Math.round(11 * H),
                    padding: `${Math.round(6 * H)}px ${Math.round(4 * H)}px`,
                    cursor: "pointer",
                  }}
                >
                  {[1, 2, 3].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>

            {deoInfo && (
              <div style={{background:C.ok,border:`1px solid ${C.zelena}26`,borderRadius:6,padding:Math.round(6*H)}}>
                <div style={{color:C.zelena,fontWeight:700,fontSize:Math.round(9*H),marginBottom:Math.round(4*H),lineHeight:1.3}}>{deoInfo.naziv_dela}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:Math.round(4*H),marginBottom:Math.round(4*H)}}>
                  {[
                    ...(prikaziLokaciju ? [["Linija", linijaNaziv], ["Mašina", masinaNaziv]] : []),
                    ["Kontrola", deoInfo.karakteristika || "-"],
                    ["Napomena", deoInfo.napomena || "-"],
                  ].map(([l, v]) => (
                    <div key={l} style={{background:C.panel,borderRadius:4,padding:`${Math.round(4*H)}px ${Math.round(5*H)}px`}}>
                      <div style={{color:C.sivi,fontSize:Math.round(7*H),marginBottom:2}}>{l}</div>
                      <div style={{color:C.tekst,fontSize:Math.round(8*H),fontWeight:700,lineHeight:1.3}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:Math.round(4*H)}}>
                  <div style={{color:C.sivi,fontSize:Math.round(7*H),letterSpacing:1,marginBottom:2}}>RN</div>
                  <input value={radniNalog} onChange={e=>setRadniNalog(e.target.value.toUpperCase())}
                    placeholder="RN-001"
                    style={{width:"100%",background:C.bg,border:`1px solid ${C.border}`,borderRadius:4,
                      color:C.tekst,fontSize:Math.round(9*H),padding:`${Math.round(4*H)}px ${Math.round(5*H)}px`,boxSizing:"border-box",
                      outline:"none",fontFamily:"inherit"}}/>
                </div>
                <div style={{marginTop:Math.round(6*H)}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:Math.round(8*H),marginBottom:2}}>
                    <span style={{color:C.sivi}}>PREOST.</span>
                    <span style={{color:preostalo===0?C.zelena:C.zuta,fontWeight:700}}>{preostalo}/{cilj}</span>
                  </div>
                  <div style={{background:C.hover,borderRadius:3,height:Math.round(4*H)}}>
                    <div style={{background:preostalo===0?C.zelena:C.plava,width:`${cilj>0?(cilj-preostalo)/cilj*100:0}%`,
                      height:Math.round(4*H),borderRadius:3,transition:"width 0.3s"}}/>
                  </div>
                </div>
              </div>
            )}

            {deoInfo && (
              <AtrCrtezPregled
                slikaNaziv={deoInfo.slika_naziv}
                idDeo={String(idDeo || "").toUpperCase()}
                C={C}
                kompakt
                visina={Math.round(120 * H)}
              />
            )}

            {upoz&&<div style={{color:C.crvena,fontSize:Math.round(8*H),padding:`${Math.round(4*H)}px ${Math.round(6*H)}px`,background:C.nok,borderRadius:4,lineHeight:1.3}}>{upoz}</div>}
            <UnosCiljBanner idDeo={idDeo} listaP={[...listaP,...listaG]} C={C}/>
            <UnosAqlPanel
              lotVelicina={lotAql}
              lotIzvor={lotAqlIzvor}
              radniNalog={radniNalog}
              idDeo={idDeo}
              onLotVelicinaChange={promeniLotAql}
              onOtvoriAqlTab={mozeTabAtributivne("aql", korisnik.uloga, rezimRada) ? () => setTab("aql") : undefined}
              listaG={listaG}
              listaP={listaP}
              C={C}
              kompakt
              uskiPanel
            />

            <button onClick={noviNalog}
              style={{...BTN(C.hover),border:`1px solid ${C.border}`,color:C.sivi,fontSize:Math.round(8*H),padding:`${Math.round(6*H)}px ${Math.round(4*H)}px`,marginTop:"auto"}}>
              ↺ NOVI
            </button>
          </div>

          {deoInfo && unosKorakAtr !== "forma" && (
            <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
              {kontrolorLinija && (
                <LinijaWizardNav
                  korak={unosKorakAtr}
                  koraci={KORACI_ATRIB_KONTROLOR}
                  C={C}
                  akcent={C.plava}
                />
              )}

              {unosKorakAtr === "poka" && (
                <div style={{
                  padding: 14,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  flex: 1,
                }}>
                  <UnosPokaYokeKorak
                    C={C}
                    modul="atributivne"
                    akcent={C.plava}
                    idDeo={String(idDeo || "").toUpperCase()}
                    nazivDela={deoInfo?.naziv_dela}
                    radniNalog={radniNalog}
                    linija={linijaNaziv}
                    masina={masinaNaziv}
                    kontrolor={korisnik?.ime}
                    kontrolnaListaOk={kontrolnaListaOk}
                    onDalje={() => setUnosKorakAtr("forma")}
                    daljeLabel="Unos OK/NOK →"
                  />
                </div>
              )}
            </div>
          )}

          {deoInfo && unosKorakAtr !== "forma" && voziloMode && (
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", borderLeft: `1px solid ${C.border}` }}>
              <label style={LBL}>PREGLED ({listaP.length})</label>
              <div style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "auto", minHeight: 60 }}>
                {!listaP.length ? (
                  <div style={{ padding: 14, textAlign: "center", color: C.border, fontSize: 10 }}>Nema snimljenih</div>
                ) : listaP.map((s, i) => (
                  <div key={i} style={{ padding: "6px 9px", borderBottom: `1px solid ${C.border}`,
                    background: s.status === "OK" ? C.ok : C.nok, fontSize: 10 }}>
                    <div style={{ color: s.status === "OK" ? C.zelena : C.crvena, fontWeight: 700 }}>{s.status}</div>
                    <div style={{ color: C.tekst }}>{s.kat}</div>
                    <div style={{ color: C.sivi, fontSize: 9 }}>{s.pod}{s.defekt && s.defekt !== "-" ? ` › ${s.defekt}` : ""}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deoInfo && unosKorakAtr === "forma" && (
          <>
          {voziloFormaEkran && (
            <div style={{
              padding: "10px 12px",
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              borderRight: `1px solid ${C.border}`,
            }}>
              <VoziloZonaNav
                izabranaZona={voziloZona}
                onZonaChange={onVoziloZonaChange}
                diagramSrc={voziloDijagramSrc}
                velicina="veliki"
                C={C}
              />
            </div>
          )}
          {/* Sredina — forma unosa */}
          <div style={{padding:14,overflowY:"auto",display:"flex",flexDirection:"column",gap:9,borderRight:`1px solid ${C.border}`}}>
            {kontrolorLinija && (
              <LinijaWizardNav
                korak="unos"
                koraci={KORACI_ATRIB_KONTROLOR}
                C={C}
                akcent={C.plava}
              />
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              <div>
                <label style={LBL}>STATUS</label>
                <select value={status} onChange={e=>{setStatus(e.target.value);if(e.target.value==="OK"){setKategorija("");setPodkat("");setDefekt("");}}}
                  style={{...INP,borderColor:status==="OK"?C.zelena:status==="NOK"?C.crvena:C.border,
                    background:status==="OK"?C.ok:status==="NOK"?C.nok:C.input,
                    fontWeight:700,fontSize:13,textAlign:"center",cursor:"pointer"}}>
                  <option value="">-- Status --</option>
                  <option value="OK">✓  OK</option><option value="NOK">✗  NOK</option>
                </select>
              </div>
              <div>
                <label style={LBL}>KOLIČINA</label>
                <select value={kolicina} onChange={e=>setKolicina(Number(e.target.value))} style={{...INP,cursor:"pointer"}}>
                  {Array.from({length:20},(_,i)=>i+1).map(k=><option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={LBL}>KATEGORIJA GREŠKE</label>
              <select value={kategorija} onChange={e=>{setKategorija(e.target.value);setPodkat("");setDefekt("");}}
                disabled={status!=="NOK"||(voziloMode&&!voziloZona)}
                style={{...INP,opacity:(status!=="NOK"||(voziloMode&&!voziloZona))?0.4:1,cursor:(status!=="NOK"||(voziloMode&&!voziloZona))?"not-allowed":"pointer"}}>
                <option value="">{voziloMode&&!voziloZona?"— prvo izaberi zonu —":"-- Izaberi kategoriju --"}</option>
                {Object.keys(greskeZaUnos).map(k=><option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div>
              <label style={LBL}>PODKATEGORIJA</label>
              <select value={podkat} onChange={e=>{setPodkat(e.target.value);setDefekt("");}}
                disabled={!kategorija||status!=="NOK"}
                style={{...INP,opacity:(!kategorija||status!=="NOK")?0.4:1,cursor:(!kategorija||status!=="NOK")?"not-allowed":"pointer"}}>
                <option value="">-- Izaberi podkategoriju --</option>
                {(greskeZaUnos[kategorija]||[]).map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label style={LBL}>
                DEFEKT
                {!koristiDefekte && (
                  <span style={{color:C.sivi,fontWeight:400,letterSpacing:0,marginLeft:6}}>
                    (samo kontrola celog vozila)
                  </span>
                )}
              </label>
              <select value={defekt} onChange={e=>setDefekt(e.target.value)}
                disabled={!koristiDefekte||!kategorija||!podkat||status!=="NOK"}
                style={{...INP,
                  opacity:(!koristiDefekte||!kategorija||!podkat||status!=="NOK")?0.35:1,
                  cursor:(!koristiDefekte||!kategorija||!podkat||status!=="NOK")?"not-allowed":"pointer",
                  background:!koristiDefekte?C.hover:C.input,
                  color:!koristiDefekte?C.sivi:C.tekst}}>
                <option value="">{koristiDefekte ? "-- Izaberi defekt --" : "— nije potrebno —"}</option>
                {koristiDefekte && ((defektiZaUnos[kategorija]||{})[podkat]||[]).map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4,display:"block"}}>
                KOMENTAR (opciono)
              </label>
              <input value={komentar} onChange={e=>setKomentar(e.target.value)}
                placeholder="Npr: alat istrošen..."
                style={{...INP, fontSize:12}}/>
            </div>

            <button onClick={dodajGresku} disabled={!deoInfo}
              style={{...BTN(C.plava,!deoInfo),fontSize:13,padding:"14px",fontWeight:700}}>
              + DODAJ U LISTU
            </button>

            <label style={{...LBL,marginBottom:3}}>PRIVREMENA LISTA ({listaG.length})</label>
            <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden",flex:1,minHeight:60,maxHeight:250,overflowY:"auto"}}>
              {!listaG.length?<div style={{padding:14,textAlign:"center",color:C.border,fontSize:10}}>Dodaj stavke</div>
               :listaG.map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"7px 10px",borderBottom:`1px solid ${C.border}`,background:s.status==="OK"?C.ok:C.nok}}>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    {s.foto&&<span style={{fontSize:10}}>📷</span>}
                    <span style={{color:s.status==="OK"?C.zelena:C.crvena,fontWeight:700,fontSize:10,minWidth:28}}>{s.status}</span>
                    <span style={{color:C.tekst,fontSize:10}}>{s.kat} › {s.pod}{s.defekt&&s.defekt!=="-"?` › ${s.defekt}`:""}</span>
                  </div>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    <span style={{color:C.sivi,fontSize:10}}>×{s.kolicina}</span>
                    <button onClick={()=>setListaG(p=>p.filter((_,j)=>j!==i))}
                      style={{background:"none",border:"none",color:C.crvena,cursor:"pointer",fontSize:12,padding:0}}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={snimiDeo} disabled={!listaG.length}
              style={{...BTN(C.zelena,!listaG.length),fontSize:11,padding:"10px",
                boxShadow:listaG.length?`0 0 12px ${C.zelena}40`:"none"}}>
              ✓  SNIMI DEO
            </button>
          </div>

          {/* Desna */}
          <div style={{padding:14,display:"flex",flexDirection:"column",gap:10,overflowY:"auto",position:"relative"}}>
            {listaP.length > 0 && (
              <button onClick={zapisi} disabled={saving}
                style={{
                  ...BTN("#7c3aed", !listaP.length || saving),
                  fontSize: 11,
                  padding: "10px 12px",
                  boxShadow: listaP.length ? `0 0 12px #7c3aed50` : "none",
                  position: "sticky",
                  top: 0,
                  zIndex: 5,
                  flexShrink: 0,
                }}>
                {saving ? "Snimanje..." : (online ? `💾 ZAPIŠI (${listaP.length})` : "📶 OFFLINE")}
              </button>
            )}
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:10}}>
              <div style={{color:C.sivi,fontSize:9,letterSpacing:1,marginBottom:5}}>SMENA TOTALI</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,textAlign:"center"}}>
                {[["MER",smenaTotal,C.plava],["OK",smenaOK,C.zelena],["NOK",smenaNOK,C.crvena]].map(([l,v,b])=>(
                  <div key={l} style={{background:C.bg,borderRadius:5,padding:"6px 2px"}}>
                    <div style={{color:b,fontSize:16,fontWeight:700}}>{v}</div>
                    <div style={{color:C.sivi,fontSize:8}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:7,textAlign:"center",fontSize:11,borderTop:`1px solid ${C.border}`,paddingTop:7}}>
                <span style={{color:C.zuta,fontWeight:700}}>
                  RTY: {smenaStat.rty > 0 ? smenaStat.rty.toFixed(1) : "—"}%
                </span>
                <span style={{color:C.sivi,fontSize:9,marginLeft:10}}>
                  DPMO: {smenaStat.dpmo > 0 ? smenaStat.dpmo.toLocaleString() : "—"}
                </span>
              </div>
              <div style={{color:C.sivi,fontSize:8,marginTop:4,textAlign:"center"}}>iz baze · {dISO()} · S{smena}</div>
            </div>

            <label style={LBL}>PREGLED ({listaP.length})</label>
            <div style={{flex:1,border:`1px solid ${C.border}`,borderRadius:8,overflow:"auto",minHeight:60}}>
              {!listaP.length?<div style={{padding:14,textAlign:"center",color:C.border,fontSize:10}}>Nema snimljenih</div>
               :listaP.map((s,i)=>(
                <div key={i} style={{padding:"6px 9px",borderBottom:`1px solid ${C.border}`,
                  background:s.status==="OK"?C.ok:C.nok,fontSize:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{color:s.status==="OK"?C.zelena:C.crvena,fontWeight:700}}>{s.status}</span>
                    <div style={{display:"flex",gap:3,alignItems:"center"}}>
                      {s.foto&&<span style={{fontSize:9}}>📷</span>}
                      <span style={{color:C.sivi}}>×{s.kolicina}</span>
                    </div>
                  </div>
                  <div style={{color:C.tekst}}>{s.kat}</div>
                  <div style={{color:C.sivi,fontSize:9}}>{s.pod}{s.defekt&&s.defekt!=="-"?` › ${s.defekt}`:""} · {s.vreme}</div>
                  {s.komentar&&<div style={{color:C.zuta,fontSize:9,marginTop:2}}>💬 {s.komentar}</div>}
                </div>
              ))}
            </div>

            {!online&&offlineCounts.total>0&&(
              <div style={{background:"#3d2c00",border:`1px solid ${C.zuta}30`,borderRadius:5,
                padding:"7px 10px",fontSize:10,color:C.zuta}}>
                📶 {offlineCounts.total} paketa u offline redu ({offlineCounts.stavki} stavki)
              </div>
            )}

            {preostalo>0 && prekidOdobrenId && (
              <div style={{background:C.ok,border:`1px solid ${C.zelena}`,borderRadius:6,
                padding:"8px 10px",fontSize:10,color:C.zelena,fontWeight:700,textAlign:"center"}}>
                ✓ Prekid odobren — možete zapisati seriju
              </div>
            )}

            {preostalo>0 && !prekidOdobrenId && !mozeAdmin(korisnik.uloga) && listaP.length>0 && (
              <button type="button" onClick={()=>setPokaziZahtev(true)}
                style={{...BTN(C.zuta),fontSize:10,padding:"8px",
                  border:`1px solid ${C.zuta}`,color:"#000"}}>
                ⚠ Zahtev za prekid ({preostalo} preostalo)
              </button>
            )}

            {listaP.length > 0 && (
              <SkartDoradaOeePanel
                C={C}
                kompakt
                vrednosti={kpiSerija}
                onChange={setKpiSerija}
                podnaslov="Snima se uz Zapiši u bazu"
              />
            )}
          </div>
          </>
          )}
        </div>
      )}

      {/* ══ CRTEŽ ══ */}
      {tab==="crtez"&&(
        <div style={{height:"calc(100vh - 89px)"}}>
          <CrtezDela
            deoInfo={deoInfo}
            C={C}
            addToast={addToast}
            onNazad={() => setTab("unos")}
            onSlikaSnimljena={(naziv) => {
              setDeoInfo(d => d ? { ...d, slika_naziv: naziv } : d);
              setSviDelovi(prev => prev.map(d =>
                d.id_deo === deoInfo?.id_deo ? { ...d, slika_naziv: naziv } : d
              ));
            }}
          />
        </div>
      )}

      {/* ══ LOG ══ */}
      {tab==="log"&&(
        <div style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
            <span style={{color:C.sivi,fontSize:10}}>Poslednjih 150 unosa</span>
            <button onClick={ucitajLog} style={{background:C.panel,border:`1px solid ${C.border}`,
              borderRadius:5,color:C.sivi,fontSize:10,padding:"4px 12px",cursor:"pointer"}}>↻ Osveži</button>
          </div>
          {loadLog?<div style={{textAlign:"center",color:C.sivi,padding:30,fontSize:11}}>Učitavanje...</div>:(
            <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"90px 70px 55px 1fr 1fr 55px 38px 38px",
                background:C.hover,padding:"8px 12px",fontSize:9,color:C.sivi,gap:6}}>
                <span>DATUM</span><span>ID DEO</span><span>SMENA</span><span>KATEGORIJA</span>
                <span>PODKAT.</span><span>STATUS</span><span>OK</span><span>NOK</span>
              </div>
              {!logD.length?<div style={{padding:28,textAlign:"center",color:C.border,fontSize:11}}>Nema podataka</div>
               :logD.map((r,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"90px 70px 55px 1fr 1fr 55px 38px 38px",
                  padding:"7px 12px",borderTop:`1px solid ${C.border}`,
                  background:r.status==="OK"?C.ok:C.nok,fontSize:10,gap:6,alignItems:"center"}}>
                  <span style={{color:C.sivi}}>{r.datum}</span>
                  <span style={{color:C.tekst,fontWeight:700}}>{r.id_deo}</span>
                  <span style={{color:C.sivi}}>{r.smena}</span>
                  <span style={{color:C.tekst}}>{r.greska_naziv}</span>
                  <span style={{color:C.sivi}}>{r.podkategorija}</span>
                  <span style={{color:r.status==="OK"?C.zelena:C.crvena,fontWeight:700}}>{r.status}</span>
                  <span style={{color:C.zelena}}>{r.ok_kolicina}</span>
                  <span style={{color:C.crvena}}>{r.nok_kolicina}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ SMENA ══ */}
      {tab==="smena"&&(
        <div style={{padding:20,display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}>
          {[["MERENJA",smenaTotal,C.plava],["OK",smenaOK,C.zelena],["NOK",smenaNOK,C.crvena],
            ["RTY %",smenaStat.rty > 0 ? smenaStat.rty.toFixed(1)+"%" : "-",C.zuta],
            ["DPMO",smenaStat.dpmo > 0 ? smenaStat.dpmo.toLocaleString() : "-",C.ljubicasta],
          ].map(([l,v,b])=>(
            <div key={l} style={{background:C.panel,border:`1px solid ${b}30`,borderRadius:10,
              padding:"18px 22px",minWidth:130,textAlign:"center"}}>
              <div style={{color:b,fontSize:28,fontWeight:700}}>{v}</div>
              <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginTop:5}}>{l}</div>
            </div>
          ))}
          <button onClick={()=>generisiIzvestajSmene(korisnik,smena,C,smenaStat)}
            style={{background:"#7c3aed",border:"none",borderRadius:8,
              color:"#fff",fontSize:10,fontWeight:700,padding:"9px 15px",cursor:"pointer",marginTop:4}}>
            📄 Izveštaj smene PDF
          </button>

          {korisnik.uloga==="admin"&&(
            <div style={{color:C.sivi,fontSize:10,marginTop:8,maxWidth:280,lineHeight:1.5}}>
              Statistika smene se računa iz <strong>kontrolni_log</strong> (datum + smena). Nema lokalnog reset-a.
            </div>
          )}
        </div>
      )}

      {tab==="admin" && mozeAdmin(korisnik.uloga) && (
        <AdminPanel korisnik={korisnik} onNazad={()=>setTab("unos")} C={C} uGravnojFormi />
      )}

      {tab==="karte" && (ekran.mob
        ? <MobilneKarte sviDelovi={sviDelovi} C={C} addToast={addToast}/>
        : <SPCKarte sviDelovi={sviDelovi} C={C} addToast={addToast} korisnik={korisnik}
            onOtvori8D={(d)=>{ setOsmdPrefill(d); setTab("8d"); }}/>)}
      {tab==="dashboard" && (ekran.mob
        ? <MobilniDashboard C={C} addToast={addToast}/>
        : <Dashboard C={C} addToast={addToast}/>)}
      {tab==="stanje" && (
        <InteligencijaDeoPanel
          C={C}
          korisnik={korisnik}
          addToast={addToast}
          sviDelovi={sviDelovi}
          defaultIdDeo={idDeo || ""}
          onOtvori8D={(e) => {
            setOsmdPrefill(prefill8dIzEskalacije(e));
            setTab("8d");
          }}
        />
      )}
      {tab==="eskalacije" && <EskalacijePanel korisnik={korisnik} C={C}
        addToast={addToast} sviDelovi={sviDelovi}
        onOtvori8D={(e) => {
          setOsmdPrefill(prefill8dIzEskalacije(e));
          setTab("8d");
        }}/>}
      {tab==="8d" && <OsmDIzvestaj korisnik={korisnik} C={C}
        addToast={addToast} sviDelovi={sviDelovi}
        prefill={osmdPrefill} onPrefillUsed={()=>setOsmdPrefill(null)}/>}
      {tab==="aql" && <AQLTabela C={C}/>}
      {tab==="foto"        && <FotoArhiva C={C} addToast={addToast}/>}
      {tab==="oee"         && <OeeKpiTab C={C} modul="atributivne" addToast={addToast} idDeoFilter={idDeo || undefined}/>}
      {tab==="kalibracija" && <KalibracijaMerila korisnik={korisnik} C={C} addToast={addToast}/>}
      {tab==="ciljevi"     && <CiljeviKvaliteta C={C} addToast={addToast} sviDelovi={sviDelovi}/>}
      {tab==="nalozi"      && <RadniNaloziPanel C={C} addToast={addToast} sviDelovi={sviDelovi}/>}
      {tab==="kupac"       && <IzvestajKupac C={C} addToast={addToast}/>}
      {tab==="oc"          && <OCKriva C={C}/>}
      {tab==="stabilnost"  && <StabilnostProcesa sviDelovi={sviDelovi} C={C} addToast={addToast}/>}
      {tab==="trasabilitet" && (
        <div style={{ padding: 20, overflow: "auto" }}>
          <TrasabilitetPanel C={C} addToast={addToast} modul="atributivne" />
        </div>
      )}
    </div>
  );
}

// ============================================================
// MOBILNA NAVIGACIJA — bottom tab bar (analitika mobil)
// ============================================================
function MobilnaNavigacija({ tab, setTab, listaP, offlineQueueTotal, C }) {
  const TABS = [
    { id:"unos",      ikon:"⌨",  naziv:"Unos"    },
    { id:"karte",     ikon:"📊", naziv:"Karte"   },
    { id:"dashboard", ikon:"📈", naziv:"Dash"    },
    { id:"eskalacije",ikon:"🚨", naziv:"Eskl."   },
    { id:"smena",     ikon:"🕐", naziv:"Smena"   },
  ];
  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:900,
      background:C.panel, borderTop:`1px solid ${C.border}`,
      display:"flex", paddingBottom:"env(safe-area-inset-bottom,0px)",
    }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          flex:1, background:"none", border:"none", cursor:"pointer",
          padding:"10px 4px 8px", display:"flex", flexDirection:"column",
          alignItems:"center", gap:3, position:"relative",
        }}>
          <span style={{ fontSize:20, lineHeight:1 }}>{t.ikon}</span>
          <span style={{
            fontSize:9, fontWeight:tab===t.id?700:400, letterSpacing:0.5,
            color: tab===t.id ? C.plava : C.sivi,
          }}>{t.naziv}</span>
          {tab===t.id && (
            <div style={{position:"absolute",top:0,left:"25%",right:"25%",
              height:2,background:C.plava,borderRadius:1}}/>
          )}
          {t.id==="unos" && listaP.length > 0 && (
            <div style={{position:"absolute",top:6,right:"20%",
              background:C.plava,color:"#fff",fontSize:8,fontWeight:700,
              borderRadius:8,padding:"0 4px",minWidth:14,textAlign:"center",lineHeight:"14px"}}>
              {listaP.length}
            </div>
          )}
          {t.id==="unos" && offlineQueueTotal > 0 && (
            <div style={{position:"absolute",top:6,left:"20%",
              background:C.zuta,color:"#000",fontSize:8,fontWeight:700,
              borderRadius:8,padding:"0 4px",minWidth:14,textAlign:"center",lineHeight:"14px"}}>
              {offlineQueueTotal}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MOBILNI UNOS — 3-koračni stepper (najvažniji ekran)
// ════════════════════════════════════════════════════════════
function MobilniUnos({
  linijaMode = false,
  kontrolorLinija = false,
  smena = 1,
  setSmena,
  radniNalog = "",
  setRadniNalog,
  unosKorakAtr,
  setUnosKorakAtr,
  korisnikIme,
  idDeo, setIdDeo, deoInfo, upoz,
  linijaNaziv, masinaNaziv, prikaziLokaciju = true,
  status, setStatus,
  kategorija, setKategorija,
  podkat, setPodkat,
  defekt, setDefekt,
  kolicina, setKolicina,
  greskeKat,
  defektiMap,
  koristiDefekte,
  voziloMode = false,
  voziloZona = null,
  onVoziloZonaChange,
  listaG, setListaG,
  listaP, setListaP,
  preostalo, cilj,
  prekidOdobrenId, onZahtevPrekid, korisnik,
  smenaOK, smenaNOK, smenaTotal,
  lotVelicina, lotIzvor = "rucno", onLotVelicinaChange, onOtvoriAqlTab,
  dodajGresku, snimiDeo, zapisi,
  noviNalog, saving, online, offlineQueueTotal, C,
  kpiSerija, setKpiSerija,
  kontrolnaListaOk = true,
  idRef,
  onBarkodSken,
}) {
  const ekran = useEkran();
  const voziloDijagramSrc = useMemo(() => dijagramSrcZaDeo(deoInfo), [deoInfo]);
  const [korak, setKorak] = useState(1);
  const ukupnoKoraka = 4;
  const korakPoka = 2;
  const korakUnos = 3;
  const korakLista = 4;
  const wizardKoraci = kontrolorLinija ? KORACI_ATRIB_KONTROLOR : KORACI_ATRIB_LINIJA;

  const idBarkodPolje = useMemo(
    () => (onBarkodSken
      ? idBarkodInputHandleri(onBarkodSken, { postaviId: setIdDeo, upperCase: true })
      : { onChange: (e) => setIdDeo(e.target.value.toUpperCase()) }),
    [onBarkodSken, setIdDeo],
  );

  useEffect(() => { if (idDeo.length < 3) setKorak(1); }, [idDeo]);

  useEffect(() => {
    if (idDeo.length < 3 || !voziloMode) return;
    setKorak(korakUnos);
  }, [idDeo, voziloMode, korakUnos]);

  const korakWizardId = linijaMode
    ? (korak === 1 ? "id" : korak === 2 ? "poka" : korak === 3 ? "unos" : kontrolorLinija ? "snimi" : "lista")
    : null;

  const analitikaKompakt = !linijaMode && (ekran.mob || ekran.tablet);
  const prikaziCrtezMob = ekran.mob || ekran.tablet || ekran.linijaUredjaj;
  const unosIdKompakt = analitikaKompakt || (linijaMode && prikaziCrtezMob);
  const analitikaInpStil = {
    borderRadius: unosIdKompakt && linijaMode ? 12 : 10,
    padding: linijaMode && ekran.linijaUredjaj
      ? "18px 12px"
      : ekran.tablet ? "10px 8px" : "8px 6px",
    fontSize: linijaMode && ekran.linijaUredjaj
      ? 22
      : ekran.tablet ? 16 : 14,
  };
  const analitikaSirine = {
    smena: ekran.tablet || ekran.linijaUredjaj ? 52 : 44,
    barkod: ekran.tablet || ekran.linijaUredjaj ? 44 : 36,
    crtez: ekran.tablet || ekran.linijaUredjaj ? 44 : 36,
  };

  const analitikaUnosRed = ({ autoFocus = false, bezRef = false } = {}) => (
    <SmenaIdUnosRed
      C={C}
      akcent={C.plava}
      smena={String(smena)}
      setSmena={(v) => setSmena?.(Number(v))}
      onBarkodSken={onBarkodSken}
      lblStyle={{ fontSize: ekran.tablet || ekran.linijaUredjaj ? 10 : 9, marginBottom: 2 }}
      inpStyle={analitikaInpStil}
      sirinaSmena={analitikaSirine.smena}
      sirinaBarkod={analitikaSirine.barkod}
      sirinaCrtez={analitikaSirine.crtez}
      prikaziCrtez={false}
      idLabel="ID deo"
    >
      <input
        ref={bezRef ? undefined : idRef}
        value={idDeo}
        {...idBarkodPolje}
        onFocus={onFocusTastatura}
        placeholder="5501-A"
        autoFocus={autoFocus}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: C.input,
          border: `1px solid ${deoInfo ? C.zelena : idDeo.length > 2 ? C.crvena : C.border}`,
          color: C.tekst,
          outline: "none",
          fontFamily: "inherit",
          fontWeight: 700,
          letterSpacing: 1,
          textAlign: "center",
          ...analitikaInpStil,
        }}
      />
    </SmenaIdUnosRed>
  );

  const INP = {
    width:"100%", background:C.input, border:`1px solid ${C.border}`,
    borderRadius: linijaMode ? 12 : 10, color:C.tekst,
    fontSize: linijaMode && ekran.linijaUredjaj ? 18 : 16,
    padding: linijaMode ? "16px 14px" : "14px",
    boxSizing:"border-box", outline:"none", fontFamily:"inherit",
  };
  const BIG_BTN = (bg, dis=false) => ({
    background:dis?C.hover:bg, border:"none", borderRadius: linijaMode ? 14 : 12,
    color:dis?C.sivi:"#fff", fontSize: linijaMode ? 18 : 16, fontWeight:700,
    padding: linijaMode ? "20px" : "18px", cursor:dis?"not-allowed":"pointer",
    width:"100%", opacity:dis?0.5:1,
  });
  const LBL = {
    color:C.sivi, fontSize: linijaMode ? 12 : 11,
    letterSpacing:1.3, marginBottom:8, display:"block",
  };

  const progresBar = (trenutni) => (
    <div style={{display:"flex", gap:5}}>
      {Array.from({ length: ukupnoKoraka }, (_, i) => i + 1).map(k => (
        <div key={k} style={{flex:1, height: linijaMode ? 5 : 4, borderRadius:2,
          background: k <= trenutni ? C.plava : C.hover}}/>
      ))}
    </div>
  );

  const omot = (children, trenutni, naslov) => (
    <div style={linijaMode ? {
      ...stilOmotLinija(ekran, { skrol: true }),
      background: C.bg,
    } : {
      padding: unosIdKompakt ? "10px 12px 80px" : "16px 16px 100px",
      display: "flex",
      flexDirection: "column",
      gap: unosIdKompakt ? 8 : 16,
      minHeight: "calc(100dvh - 89px)",
      background: C.bg,
      boxSizing: "border-box",
    }}>
      {linijaMode && (
        <LinijaWizardNav
          korak={korakWizardId}
          koraci={wizardKoraci}
          C={C}
          akcent={C.plava}
          kompakt
        />
      )}
      {!linijaMode && progresBar(trenutni)}
      {!linijaMode && (
        <div style={{color:C.sivi, fontSize:11, textAlign:"center", letterSpacing:1}}>
          {naslov}
        </div>
      )}
      {children}
    </div>
  );

  // ─ Korak 1: ID dela ─────────────────────────────────────
  if (korak === 1) return omot(
    <>
      {unosIdKompakt ? analitikaUnosRed({ autoFocus: true }) : (
        <>
          <IdDeoBarkodRed
            C={C}
            akcent={C.plava}
            onBarkodSken={onBarkodSken}
            lblStyle={LBL}
            idLabel="ID deo"
            kompaktRed
            sirinaBarkod={linijaMode ? 52 : 44}
            unosStil={{ borderRadius: linijaMode ? 12 : 10, padding: "22px 14px", fontSize: 28 }}
          >
            <input
              ref={idRef}
              value={idDeo}
              {...idBarkodPolje}
              onFocus={onFocusTastatura}
              placeholder="npr. 5501-A"
              autoFocus
              style={{
                ...INP,
                width: "100%",
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: 4,
                textAlign: "center",
                padding: "22px 14px",
                borderColor: deoInfo ? C.zelena : idDeo.length > 2 ? C.crvena : C.border,
                background: deoInfo ? C.ok : idDeo.length > 2 ? C.nok : C.input,
              }}
            />
          </IdDeoBarkodRed>

          <label style={LBL}>Smena
            <select
              value={smena}
              onChange={e => {
                const v = Number(e.target.value);
                setSmena?.(v);
                localStorage.setItem("spc_smena", String(v));
              }}
              onFocus={onFocusTastatura}
              style={{ ...INP, fontSize: linijaMode ? 16 : 14, padding: linijaMode ? "14px" : "12px" }}
            >
              {[1, 2, 3].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </>
      )}

      {deoInfo ? (
        <div style={{
          background: C.ok,
          border: `1px solid ${C.zelena}30`,
          borderRadius: unosIdKompakt ? 10 : 14,
          padding: unosIdKompakt ? 10 : 16,
        }}>
          <div style={{ color: C.zelena, fontWeight: 700, fontSize: unosIdKompakt ? 14 : 18, marginBottom: unosIdKompakt ? 6 : 12 }}>
            ✓ {deoInfo.naziv_dela}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: unosIdKompakt ? 6 : 8 }}>
            {[
              ...(prikaziLokaciju ? [["Linija", linijaNaziv], ["Mašina", masinaNaziv]] : []),
              ["Kontrola", deoInfo.karakteristika || "-"],
              ["Napomena", deoInfo.napomena || "-"],
            ].map(([l, v]) => (
              <div key={l} style={{ background: C.panel, borderRadius: 8, padding: unosIdKompakt ? "6px 8px" : "10px 12px" }}>
                <div style={{ color: C.sivi, fontSize: unosIdKompakt ? 9 : 10, marginBottom: 2 }}>{l}</div>
                <div style={{ color: C.tekst, fontSize: unosIdKompakt ? 12 : 14, fontWeight: 700 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: unosIdKompakt ? 8 : 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              fontSize: unosIdKompakt ? 10 : 11, color: C.sivi, marginBottom: 4 }}>
              <span>Preostalo</span>
              <span style={{ color: preostalo === 0 ? C.zelena : C.zuta, fontWeight: 700 }}>
                {preostalo} / {cilj}
              </span>
            </div>
            <div style={{ background: C.hover, borderRadius: 4, height: unosIdKompakt ? 6 : 8 }}>
              <div style={{
                background: preostalo === 0 ? C.zelena : C.plava,
                width: `${cilj > 0 ? (cilj - preostalo) / cilj * 100 : 0}%`,
                height: unosIdKompakt ? 6 : 8,
                borderRadius: 4,
                transition: "width 0.4s",
              }}/>
            </div>
          </div>
        </div>
      ) : null}

      {deoInfo && prikaziCrtezMob && (
        <AtrCrtezPregled
          slikaNaziv={deoInfo.slika_naziv}
          idDeo={String(idDeo || "").toUpperCase()}
          C={C}
          kompakt
          visina={ekran.tablet
            ? dp(TABLET.crtezVisinaDno, ekran)
            : dp(TELEFON.crtezVisinaDno, ekran)}
        />
      )}

      {upoz && (
        <div style={{ color: C.crvena, fontSize: unosIdKompakt ? 11 : 12, padding: unosIdKompakt ? "8px 10px" : "10px 12px",
          background: C.nok, borderRadius: 8, lineHeight: 1.5 }}>{upoz}</div>
      )}
      <UnosCiljBanner idDeo={idDeo} listaP={listaP} C={C}/>

      <UnosAqlPanel
        lotVelicina={lotVelicina}
        lotIzvor={lotIzvor}
        radniNalog={radniNalog}
        idDeo={idDeo}
        onLotVelicinaChange={onLotVelicinaChange}
        onOtvoriAqlTab={onOtvoriAqlTab}
        listaG={listaG}
        listaP={listaP}
        C={C}
        kompakt={unosIdKompakt}
      />

      <div style={{flex:1}}/>

      <button onClick={()=>setKorak(korakPoka)} disabled={!deoInfo}
        style={{...BIG_BTN(C.plava,!deoInfo), fontSize:18}}>
        Poka-yoke →
      </button>
      <button onClick={noviNalog}
        style={{background:"none", border:`1px solid ${C.border}`, borderRadius:10,
          color:C.sivi, fontSize:14, padding:"14px", cursor:"pointer", width:"100%"}}>
        ↺ Novi nalog
      </button>
    </>,
    1,
    `KORAK 1 / ${ukupnoKoraka} — ID DELA`,
  );

  // ─ Korak 2: Poka-yoke ────────────────────────────────────
  if (korak === korakPoka) return omot(
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <UnosPokaYokeKorak
        C={C}
        modul="atributivne"
        akcent={C.plava}
        idDeo={String(idDeo || "").toUpperCase()}
        nazivDela={deoInfo?.naziv_dela}
        radniNalog={radniNalog}
        linija={linijaNaziv}
        masina={masinaNaziv}
        kontrolor={korisnikIme}
        kontrolnaListaOk={kontrolnaListaOk}
        onDalje={() => { setUnosKorakAtr?.("forma"); setKorak(korakUnos); }}
        daljeLabel="Unos OK/NOK →"
      />
    </div>,
    korakPoka,
    "POKA-YOKE",
  );

  // ─ Unos greške ───────────────────────────────────────────
  if (korak === korakUnos) {
    const dodajDis = !status || (status === "NOK" && (
      voziloMode && !voziloZona || !kategorija || !podkat || (koristiDefekte && !defekt)
    ));
    const dodajUGresku = () => { dodajGresku(); setKorak(korakLista); };
    const bojaDodaj = status === "OK" ? C.zelena : status === "NOK" ? C.crvena : C.hover;

    return (
    <>
    <div style={linijaMode ? {
      ...stilOmotLinija(ekran, { skrol: true }),
      gap: 14,
      background: C.bg,
      paddingBottom: 96,
    } : {
      padding: "16px 16px 100px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
      minHeight: "calc(100dvh - 89px)",
      background: C.bg,
      boxSizing: "border-box",
    }}>

      {linijaMode && (
        <LinijaWizardNav korak="unos" koraci={wizardKoraci} C={C} akcent={C.plava} kompakt />
      )}

      {analitikaKompakt && deoInfo && analitikaUnosRed({ bezRef: true })}

      {/* Progres + navigacija */}
      {!linijaMode && (
      <div style={{display:"flex", gap:5}}>
        {Array.from({ length: ukupnoKoraka }, (_, i) => i + 1).map(k => (
          <div key={k} style={{flex:1,height:4,borderRadius:2,background:k<=korak?C.plava:C.hover}}/>
        ))}
      </div>
      )}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <button onClick={()=>setKorak(korakPoka)} style={{background:"none",border:"none",
          color:C.sivi,fontSize:14,cursor:"pointer",padding:0}}>← Nazad</button>
        <span style={{color:C.sivi,fontSize:11,letterSpacing:1}}>
          KORAK {korakUnos} / {ukupnoKoraka}
        </span>
        <span style={{color:C.zelena,fontWeight:700,fontSize:13}}>{idDeo}</span>
      </div>

      {voziloMode && onVoziloZonaChange && (
        <div style={{ marginBottom: 4 }}>
          <VoziloZonaNav
            izabranaZona={voziloZona}
            onZonaChange={onVoziloZonaChange}
            diagramSrc={voziloDijagramSrc}
            velicina="veliki"
            C={C}
          />
        </div>
      )}

      {/* STATUS — ogromna dugmad */}
      <div>
        <label style={LBL}>STATUS</label>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
          {["OK","NOK"].map(s => (
            <button key={s} onClick={()=>{setStatus(s); if(s==="OK"){setKategorija("");setPodkat("");setDefekt("");}}}
              style={{
                background: status===s?(s==="OK"?C.zelena:C.crvena):"none",
                border:`2px solid ${status===s?(s==="OK"?C.zelena:C.crvena):C.border}`,
                borderRadius:14, color:status===s?"#fff":C.sivi,
                fontSize:22, fontWeight:700, padding:"22px 0", cursor:"pointer",
                transition:"all 0.2s",
              }}>
              {s==="OK" ? "✓ OK" : "✗ NOK"}
            </button>
          ))}
        </div>
      </div>

      {/* KOLIČINA — +/- stepper */}
      <div>
        <label style={LBL}>KOLIČINA</label>
        <div style={{display:"flex", alignItems:"stretch", border:`1px solid ${C.border}`,
          borderRadius:12, overflow:"hidden", height:60}}>
          <button onClick={()=>setKolicina(k=>Math.max(1,k-1))}
            style={{background:C.panel,border:"none",color:C.tekst,fontSize:28,
              padding:"0 24px",cursor:"pointer",fontWeight:300}}>−</button>
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:32,fontWeight:700,color:C.tekst,background:C.input}}>{kolicina}</div>
          <button onClick={()=>setKolicina(k=>Math.min(50,k+1))}
            style={{background:C.panel,border:"none",color:C.tekst,fontSize:28,
              padding:"0 24px",cursor:"pointer",fontWeight:300}}>+</button>
        </div>
      </div>

      {/* KATEGORIJA — lista dugmadi, samo za NOK */}
      {status==="NOK" && (
        <div>
          <label style={LBL}>KATEGORIJA GREŠKE</label>
          {voziloMode && !voziloZona ? (
            <div style={{background:C.hover,border:`1px dashed ${C.border}`,borderRadius:10,
              padding:"14px 16px",color:C.sivi,fontSize:13,textAlign:"center"}}>
              Prvo izaberi zonu na dijagramu vozila
            </div>
          ) : (
          <div style={{display:"flex", flexDirection:"column", gap:6, maxHeight:220, overflowY:"auto"}}>
            {Object.keys(greskeKat).map(k => (
              <button key={k} onClick={()=>{setKategorija(k);setPodkat("");setDefekt("");}}
                style={{
                  background:kategorija===k?`${C.crvena}18`:C.panel,
                  border:`1px solid ${kategorija===k?C.crvena:C.border}`,
                  borderRadius:10, color:kategorija===k?C.crvena:C.tekst,
                  fontSize:15, fontWeight:kategorija===k?700:400,
                  padding:"14px 16px", cursor:"pointer", textAlign:"left",
                  transition:"all 0.15s",
                }}>{k}</button>
            ))}
          </div>
          )}
        </div>
      )}

      {/* PODKATEGORIJA — chip-ovi */}
      {status==="NOK" && kategorija && (
        <div>
          <label style={LBL}>PODKATEGORIJA</label>
          <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
            {(greskeKat[kategorija]||[]).map(p => (
              <button key={p} onClick={()=>{setPodkat(p);setDefekt("");}}
                style={{
                  background:podkat===p?C.crvena:"none",
                  border:`1px solid ${podkat===p?C.crvena:C.border}`,
                  borderRadius:20, color:podkat===p?"#fff":C.tekst,
                  fontSize:13, padding:"9px 16px", cursor:"pointer",
                  transition:"all 0.15s",
                }}>{p}</button>
            ))}
          </div>
        </div>
      )}

      {status==="NOK" && kategorija && podkat && (
        <div style={{opacity:koristiDefekte?1:0.45}}>
          <label style={LBL}>
            DEFEKT
            {!koristiDefekte && (
              <span style={{fontWeight:400, marginLeft:6}}>(samo kontrola celog vozila)</span>
            )}
          </label>
          {koristiDefekte ? (
            <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
              {(((defektiMap[kategorija]||{})[podkat])||[]).map(d => (
                <button key={d} onClick={()=>setDefekt(d)}
                  style={{
                    background:defekt===d?C.crvena:"none",
                    border:`1px solid ${defekt===d?C.crvena:C.border}`,
                    borderRadius:20, color:defekt===d?"#fff":C.tekst,
                    fontSize:13, padding:"9px 16px", cursor:"pointer",
                    transition:"all 0.15s",
                  }}>{d}</button>
              ))}
            </div>
          ) : (
            <div style={{background:C.hover,border:`1px dashed ${C.border}`,borderRadius:10,
              padding:"14px 16px",color:C.sivi,fontSize:13,textAlign:"center"}}>
              Za pojedinačne delove koristi samo kategoriju i podkategoriju
            </div>
          )}
        </div>
      )}

      {!linijaMode && <div style={{ flex: 1 }} />}

      {!linijaMode && (
        <button
          onClick={dodajUGresku}
          disabled={dodajDis}
          style={{ ...BIG_BTN(bojaDodaj, dodajDis), fontSize: 17 }}>
          + Dodaj u listu
        </button>
      )}
    </div>
    {linijaMode && (
      <LinijaDonjaTraka ekran={ekran} C={C} rezerva={false}>
        <DugmeTraka boja={bojaDodaj} onClick={dodajUGresku} disabled={dodajDis}>
          + Dodaj u listu
        </DugmeTraka>
      </LinijaDonjaTraka>
    )}
    </>
    );
  }

  // ─ Lista + snimi ─────────────────────────────────────────
  if (korak !== korakLista) return null;

  const dugmeZapisiGore = listaP.length > 0 && (
    <div style={{ display: "flex", justifyContent: "flex-end", position: "sticky", top: 0, zIndex: 10, marginBottom: 2 }}>
      <button onClick={zapisi} disabled={saving}
        style={{
          ...BIG_BTN("#7c3aed", saving),
          width: "auto",
          fontSize: 14,
          padding: "12px 18px",
          boxShadow: `0 0 14px #7c3aed45`,
        }}>
        {saving ? "Snimanje..." : `💾 Zapiši (${listaP.length})`}
      </button>
    </div>
  );

  return linijaMode ? omot(
    <>
      {dugmeZapisiGore}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8}}>
        {[
          ["OK",    listaG.filter(s=>s.status==="OK").reduce((s,d)=>s+d.kolicina,0),  C.zelena],
          ["NOK",   listaG.filter(s=>s.status==="NOK").reduce((s,d)=>s+d.kolicina,0), C.crvena],
          ["STAVKI",listaG.length,                                                      C.plava],
        ].map(([l,v,b]) => (
          <div key={l} style={{background:C.panel,border:`1px solid ${b}25`,
            borderRadius:10,padding:"12px",textAlign:"center"}}>
            <div style={{color:b,fontSize:24,fontWeight:700}}>{v}</div>
            <div style={{color:C.sivi,fontSize:10,marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>

      {/* Lista stavki */}
      <div style={{flex:1, border:`1px solid ${C.border}`, borderRadius:12,
        overflow:"auto", maxHeight:320}}>
        {!listaG.length ? (
          <div style={{padding:28,textAlign:"center",color:C.border,fontSize:13}}>
            Lista je prazna — idi na Korak 2
          </div>
        ) : listaG.map((s,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",padding:"14px 16px",
            borderBottom:`1px solid ${C.border}`,background:s.status==="OK"?C.ok:C.nok}}>
            <div style={{flex:1}}>
              <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:4}}>
                {s.foto && <span style={{fontSize:14}}>📷</span>}
                <span style={{color:s.status==="OK"?C.zelena:C.crvena,
                  fontWeight:700,fontSize:16}}>
                  {s.status} ×{s.kolicina}
                </span>
              </div>
              <div style={{color:C.sivi,fontSize:12}}>{s.kat} › {s.pod}{s.defekt&&s.defekt!=="-"?` › ${s.defekt}`:""}</div>
            </div>
            <button onClick={()=>setListaG(p=>p.filter((_,j)=>j!==i))}
              style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,
                color:C.crvena,fontSize:20,padding:"8px 14px",cursor:"pointer"}}>✕</button>
          </div>
        ))}
      </div>

      {/* Snimi deo */}
      <button onClick={snimiDeo} disabled={!listaG.length}
        style={{...BIG_BTN(C.zelena,!listaG.length), fontSize:17,
          boxShadow:listaG.length?`0 0 20px ${C.zelena}40`:"none"}}>
        ✓ Snimi deo
      </button>

      {listaP.length > 0 && (
        <div style={{background:C.ok,border:`1px solid ${C.zelena}40`,borderRadius:10,
          padding:"10px 14px",fontSize:12,color:C.zelena,textAlign:"center"}}>
          ✓ {listaP.length} stavki spremno za zapis u bazu
        </div>
      )}

      {listaP.length > 0 && preostalo>0 && prekidOdobrenId && (
        <div style={{background:C.ok,border:`1px solid ${C.zelena}`,borderRadius:10,
          padding:"12px",fontSize:13,color:C.zelena,fontWeight:700,textAlign:"center"}}>
          ✓ Prekid odobren — možete zapisati
        </div>
      )}

      {listaP.length > 0 && preostalo>0 && !prekidOdobrenId && !mozeAdmin(korisnik?.uloga) && (
        <button type="button" onClick={onZahtevPrekid}
          style={{...BIG_BTN(C.zuta), fontSize:15, color:"#000"}}>
          ⚠ Zahtev za prekid ({preostalo} preostalo)
        </button>
      )}

      {listaP.length > 0 && setKpiSerija && (
        <SkartDoradaOeePanel
          C={C}
          kompakt
          vrednosti={kpiSerija}
          onChange={setKpiSerija}
          podnaslov="Uz Zapiši u bazu"
        />
      )}

      {/* Offline indikator */}
      {!online && offlineQueueTotal > 0 && (
        <div style={{background:"#3d2c00",border:`1px solid ${C.zuta}40`,
          borderRadius:8,padding:"10px 14px",fontSize:12,color:C.zuta,textAlign:"center"}}>
          📶 Offline — {offlineQueueTotal} paketa u redu
        </div>
      )}

      <button onClick={() => setKorak(korakUnos)}
        style={{background:"none", border:`1px solid ${C.border}`, borderRadius:10,
          color:C.sivi, fontSize:14, padding:"12px", cursor:"pointer", width:"100%"}}>
        ← Dodaj još stavki
      </button>
    </>,
    korakLista,
    `KORAK ${korakLista} / ${ukupnoKoraka}`,
  ) : (
    <div style={{padding:"16px 16px 100px", display:"flex", flexDirection:"column",
      gap:14, minHeight:"calc(100dvh - 89px)", background:C.bg}}>
      <div style={{display:"flex", gap:5}}>
        {Array.from({ length: ukupnoKoraka }, (_, i) => i + 1).map(k => (
          <div key={k} style={{flex:1,height:4,borderRadius:2,
            background:k<=korak?C.zelena:C.hover}}/>
        ))}
      </div>
      {analitikaKompakt && deoInfo && analitikaUnosRed({ bezRef: true })}
      {dugmeZapisiGore}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <button onClick={()=>setKorak(korakUnos)}
          style={{background:"none",border:"none",color:C.sivi,fontSize:14,cursor:"pointer",padding:0}}>
          ← Dodaj još
        </button>
        <span style={{color:C.sivi,fontSize:11,letterSpacing:1}}>KORAK {korakLista} / {ukupnoKoraka}</span>
        <span style={{color:preostalo===0?C.zelena:C.zuta,fontWeight:700,fontSize:13}}>
          {preostalo} preostalo
        </span>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8}}>
        {[
          ["OK",    listaG.filter(s=>s.status==="OK").reduce((s,d)=>s+d.kolicina,0),  C.zelena],
          ["NOK",   listaG.filter(s=>s.status==="NOK").reduce((s,d)=>s+d.kolicina,0), C.crvena],
          ["STAVKI",listaG.length,                                                      C.plava],
        ].map(([l,v,b]) => (
          <div key={l} style={{background:C.panel,border:`1px solid ${b}25`,
            borderRadius:10,padding:"12px",textAlign:"center"}}>
            <div style={{color:b,fontSize:24,fontWeight:700}}>{v}</div>
            <div style={{color:C.sivi,fontSize:10,marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{flex:1, border:`1px solid ${C.border}`, borderRadius:12,
        overflow:"auto", maxHeight:320}}>
        {!listaG.length ? (
          <div style={{padding:28,textAlign:"center",color:C.border,fontSize:13}}>
            Lista je prazna — idi na Korak 2
          </div>
        ) : listaG.map((s,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",padding:"14px 16px",
            borderBottom:`1px solid ${C.border}`,background:s.status==="OK"?C.ok:C.nok}}>
            <div style={{flex:1}}>
              <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:4}}>
                {s.foto && <span style={{fontSize:14}}>📷</span>}
                <span style={{color:s.status==="OK"?C.zelena:C.crvena,
                  fontWeight:700,fontSize:16}}>
                  {s.status} ×{s.kolicina}
                </span>
              </div>
              <div style={{color:C.sivi,fontSize:12}}>{s.kat} › {s.pod}{s.defekt&&s.defekt!=="-"?` › ${s.defekt}`:""}</div>
            </div>
            <button onClick={()=>setListaG(p=>p.filter((_,j)=>j!==i))}
              style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,
                color:C.crvena,fontSize:20,padding:"8px 14px",cursor:"pointer"}}>✕</button>
          </div>
        ))}
      </div>
      <button onClick={snimiDeo} disabled={!listaG.length}
        style={{...BIG_BTN(C.zelena,!listaG.length), fontSize:17,
          boxShadow:listaG.length?`0 0 20px ${C.zelena}40`:"none"}}>
        ✓ Snimi deo
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MOBILNI SPC KARTE — vertikalni layout, swipe između karata
// ════════════════════════════════════════════════════════════
function MobilneKarte({ sviDelovi, C, addToast }) {
  const [tip,setTip]         = useState("p");
  const [idDeo,setIdDeo]     = useState("");
  const [loading,setLoading] = useState(false);
  const [vodicSakrij,setVodicSakrij] = useState(false);
  const [rawLog,setRawLog] = useState([]);
  const [pD,setPD] = useState([]); const [cD,setCD]=useState([]); const [uD,setUD]=useState([]);
  const prevIdDeoRef = useRef("");

  const deoIzabran = useMemo(() => sviDelovi.find(d => d.id_deo === idDeo), [sviDelovi, idDeo]);
  const predlog = useMemo(
    () => predlogAtributivnihKarti({ deo: deoIzabran, rawData: rawLog, grupisanje: "dan" }),
    [deoIzabran, rawLog],
  );

  useEffect(() => {
    setVodicSakrij(jeVodicSakriven("atr_mob", idDeo));
  }, [idDeo]);

  useEffect(() => {
    if (!idDeo || idDeo === prevIdDeoRef.current) return;
    prevIdDeoRef.current = idDeo;
    const prvi = predlog?.stavke?.[0]?.id;
    if (prvi && ["p", "u", "c"].includes(prvi)) setTip(prvi);
  }, [idDeo, predlog]);

  const zatvoriVodic = () => {
    sakrijVodic("atr_mob", idDeo);
    setVodicSakrij(true);
  };

  const ucitaj = useCallback(async () => {
    if (!idDeo) return; setLoading(true);
    try {
      const {data,error} = await supabase.from("kontrolni_log")
        .select("datum,smena,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv")
        .eq("id_deo",idDeo).order("datum",{ascending:true});
      if (error) throw error;
      setRawLog(data || []);
      if (!data?.length) { setPD([]); setCD([]); setUD([]); return; }

      const gr={};
      data.forEach(r=>{const k=r.datum;if(!gr[k])gr[k]={datum:k,nok:0,n:0,c:0};
        gr[k].nok+=r.nok_kolicina||0;gr[k].n+=r.ukupno_merenja||0;gr[k].c+=r.kom_nok||0;});
      const sg=Object.values(gr).sort((a,b)=>a.datum.localeCompare(b.datum));
      const ukNOK=sg.reduce((s,g)=>s+g.nok,0),ukN=sg.reduce((s,g)=>s+g.n,0);
      const pBar=ukN>0?ukNOK/ukN:0,cBar=sg.length>0?sg.reduce((s,g)=>s+g.c,0)/sg.length:0;
      const uBar=ukN>0?sg.reduce((s,g)=>s+g.c,0)/ukN:0;

      setPD(sg.map(g=>({datum:g.datum,p:g.n>0?g.nok/g.n:0,p_bar:pBar,nok_total:g.nok,n_total:g.n,
        ucl:pBar+3*Math.sqrt(pBar*(1-pBar)/Math.max(g.n,1)),
        lcl:Math.max(0,pBar-3*Math.sqrt(pBar*(1-pBar)/Math.max(g.n,1))),})));
      const cgr={};
      data.forEach(r=>{const k=`${r.datum}|${r.greska_naziv||""}`;
        if(!cgr[k])cgr[k]={datum:r.datum,naziv:r.greska_naziv||"sve",c:0};cgr[k].c+=r.kom_nok||0;});
      setCD(Object.values(cgr).sort((a,b)=>a.datum.localeCompare(b.datum)).map(g=>({
        ...g,c_bar:cBar,ucl:cBar+3*Math.sqrt(Math.max(cBar,0.001)),
        lcl:Math.max(0,cBar-3*Math.sqrt(Math.max(cBar,0.001))),})));
      setUD(sg.map(g=>({datum:g.datum,u:g.n>0?g.c/g.n:0,u_bar:uBar,n:g.n,
        ucl:uBar+3*Math.sqrt(uBar/Math.max(g.n,1)),
        lcl:Math.max(0,uBar-3*Math.sqrt(uBar/Math.max(g.n,1))),})));
    } catch(e) { addToast(e.message,"greska"); }
    finally { setLoading(false); }
  },[idDeo]);

  useEffect(()=>{ ucitaj(); },[ucitaj]);

  const karte=[
    {id:"p",naziv:"p",boja:C.plava,podaci:pD,dKey:"p",clKey:"p_bar",
     fmt:v=>+(v*100).toFixed(2),sufiks:"%"},
    {id:"c",naziv:"C",boja:C.narandzasta,podaci:cD,dKey:"c",clKey:"c_bar",
     fmt:v=>+v.toFixed(1),sufiks:""},
    {id:"u",naziv:"u",boja:C.ljubicasta,podaci:uD,dKey:"u",clKey:"u_bar",
     fmt:v=>+v.toFixed(3),sufiks:""},
  ];
  const akt=karte.find(k=>k.id===tip);
  const cd=(akt?.podaci||[]).map((d,i,arr)=>{
    const niz=arr.map(x=>x[akt.dKey]);
    const up=new Set(westernElectric(niz,d[akt.clKey],d.ucl,Math.max(d.lcl||0,0)));
    return{...d,label:d.datum?.substring(5)||"",val:akt.fmt(d[akt.dKey]),
      cl:akt.fmt(d[akt.clKey]),ucl:akt.fmt(d.ucl),lcl:akt.fmt(Math.max(d.lcl||0,0)),
      upoz:up.has(i)};
  });
  const upozoreni=cd.filter(d=>d.upoz);
  const cl=cd[0]?.cl??0,ucl=cd[0]?.ucl??0,lcl=cd[0]?.lcl??0;
  const Dot=(props)=>{const{cx,cy,index}=props;const u=cd[index]?.upoz;
    return<circle key={index} cx={cx} cy={cy} r={u?8:5}
      fill={u?C.crvena:akt?.boja} stroke={u?"#fff":"none"} strokeWidth={u?2:0}/>;};

  const INP_S={background:C.input,border:`1px solid ${C.border}`,borderRadius:8,
    color:C.tekst,fontSize:14,padding:"12px 14px",outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"};

  return (
    <div style={{padding:"14px 14px 100px", display:"flex", flexDirection:"column", gap:14}}>
      {/* Filter */}
      <div>
        <div style={{color:C.sivi,fontSize:10,letterSpacing:1.5,marginBottom:6}}>ID DELA</div>
        <select value={idDeo} onChange={e=>setIdDeo(e.target.value)} style={{...INP_S,cursor:"pointer"}}>
          <option value="">-- Izaberi deo --</option>
          {sviDelovi.map(d=><option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>)}
        </select>
      </div>

      {idDeo && !vodicSakrij && (
        <SpcVodicPredlog C={C} predlog={predlog} tip={tip} setTip={setTip} onZatvori={zatvoriVodic} kompakt />
      )}

      {/* Tip karte */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {karte.map(k=>{
          const preporuka = tabJePreporucen(predlog, k.id);
          return (
          <button key={k.id} onClick={()=>setTip(k.id)} style={{
            background:tip===k.id?`${k.boja}20`:"none",
            border:`2px solid ${tip===k.id?k.boja:preporuka?`${C.plava}55`:C.border}`,
            borderRadius:10,color:tip===k.id?k.boja:C.sivi,
            fontSize:15,fontWeight:700,padding:"12px",cursor:"pointer"}}>
            {k.naziv}-karta{preporuka ? " ★" : ""}
          </button>
        );})}
      </div>

      {!idDeo ? (
        <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",
          flexDirection:"column",gap:8,color:C.border}}>
          <span style={{fontSize:36}}>📊</span>
          <span style={{fontSize:13}}>Izaberi deo</span>
        </div>
      ) : loading ? (
        <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",
          color:C.sivi,fontSize:13}}>Učitavanje...</div>
      ) : cd.length===0 ? (
        <div style={{height:200,display:"flex",alignItems:"center",justifyContent:"center",
          color:C.border,fontSize:13}}>Nema podataka</div>
      ) : (
        <>
          {/* KPI row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {[["CL",`${cl}${akt.sufiks}`,C.zuta],
              ["UCL",`${ucl}${akt.sufiks}`,C.crvena],
              ["VAN K.",upozoreni.length,upozoreni.length>0?C.crvena:C.zelena]
            ].map(([n,v,b])=>(
              <div key={n} style={{background:C.panel,border:`1px solid ${b}25`,
                borderRadius:10,padding:"10px",textAlign:"center"}}>
                <div style={{color:C.sivi,fontSize:9,letterSpacing:1,marginBottom:3}}>{n}</div>
                <div style={{color:b,fontSize:18,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>

          {/* Graf — viši na mobu */}
          <div style={{background:C.panel,border:`1px solid ${C.border}`,
            borderRadius:12,padding:"14px 6px 8px"}}>
            <div style={{color:akt.boja,fontSize:12,fontWeight:700,
              letterSpacing:1,paddingLeft:10,marginBottom:8}}>
              {akt.naziv}-karta · {idDeo}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={cd} margin={{top:6,right:50,bottom:30,left:2}}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.hover} vertical={false}/>
                <XAxis dataKey="label" tick={{fill:C.sivi,fontSize:8}} tickLine={false}
                  angle={-45} textAnchor="end" height={40}
                  interval={Math.max(0,Math.floor(cd.length/6)-1)}/>
                <YAxis tick={{fill:C.sivi,fontSize:9}} tickLine={false} axisLine={false}
                  tickFormatter={v=>v+akt.sufiks} width={38}/>
                <Tooltip
                  contentStyle={{background:C.panel,border:`1px solid ${C.border}`,
                    borderRadius:8,fontSize:12,fontFamily:"monospace"}}
                  labelStyle={{color:C.sivi}}
                  formatter={(v)=>[v+akt.sufiks]}/>
                <ReferenceLine y={ucl} stroke={C.crvena} strokeDasharray="6 3" strokeWidth={1.5}
                  label={{value:`UCL`,fill:C.crvena,fontSize:9,position:"right"}}/>
                <ReferenceLine y={cl} stroke={C.zuta} strokeDasharray="4 2"
                  label={{value:`CL`,fill:C.zuta,fontSize:9,position:"right"}}/>
                {lcl>0 && <ReferenceLine y={lcl} stroke={C.zelena} strokeDasharray="6 3" strokeWidth={1.5}
                  label={{value:`LCL`,fill:C.zelena,fontSize:9,position:"right"}}/>}
                <Line type="monotone" dataKey="val" stroke={akt.boja} strokeWidth={2.5}
                  dot={<Dot/>} name={`${akt.naziv}-karta`} connectNulls activeDot={{r:8}}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Upozorenja */}
          {upozoreni.length>0 && (
            <div style={{background:C.nok,border:`1px solid ${C.crvena}30`,
              borderRadius:10,padding:"12px 14px"}}>
              <div style={{color:C.crvena,fontSize:13,fontWeight:700,marginBottom:6}}>
                ⚠ {upozoreni.length} tačaka van kontrole
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {upozoreni.map((d,i)=>(
                  <span key={i} style={{background:`${C.crvena}20`,border:`1px solid ${C.crvena}40`,
                    borderRadius:6,padding:"3px 10px",fontSize:11,color:C.crvena}}>
                    {d.label}: {d.val}{akt.sufiks}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MOBILNI DASHBOARD — kartice pa grafovi vertikalno
// ════════════════════════════════════════════════════════════
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
          .select("datum,status,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,smena")
          .gte("datum",od.toISOString().split("T")[0]);
        if(error)throw error;
        if(!data?.length){setPodaci({});return;}

        const ukN=data.reduce((s,r)=>s+(r.ukupno_merenja||0),0);
        const ukNOK=data.reduce((s,r)=>s+(r.nok_kolicina||0),0);
        const ukOK=data.reduce((s,r)=>s+(r.ok_kolicina||0),0);
        const gB={};
        data.forEach(r=>{if(r.greska_naziv&&r.greska_naziv!=="OK")
          gB[r.greska_naziv]=(gB[r.greska_naziv]||0)+(r.kom_nok||0);});
        const pareto=Object.entries(gB).map(([naziv,count])=>({naziv:naziv.substring(0,12),count}))
          .sort((a,b)=>b.count-a.count).slice(0,6);
        const dani={};
        data.forEach(r=>{if(!dani[r.datum])dani[r.datum]={datum:r.datum,ok:0,nok:0,n:0};
          dani[r.datum].ok+=r.ok_kolicina||0;dani[r.datum].nok+=r.nok_kolicina||0;dani[r.datum].n+=r.ukupno_merenja||0;});
        const trend=Object.values(dani).map(d=>({
          datum:d.datum.substring(5),
          rty:d.n>0?+((d.ok/d.n)*100).toFixed(1):0}));

        setPodaci({ukN,ukNOK,ukOK,
          dpmo:ukN>0?Math.round((ukNOK/ukN)*1e6):0,
          rty:ukN>0?((ukOK/ukN)*100).toFixed(1):"0",
          pareto,trend});
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
            borderRadius:8,color:period===v?"#fff":C.sivi,
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
              ["RTY %",     podaci.rty+"%",           C.zelena],
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

          <SpcRtyJednaLinija data={podaci.trend} C={C} height={200} xKey="datum" naslov="RTY % trend" />

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

// ════════════════════════════════════════════════════════════

// ─── ROOT ─────────────────────────────────────────────────────

export default function App() {
  const licenca = useLicencaGate();
  const [korisnik,setKorisnik] = useState(null);
  const [checking,setChecking] = useState(true);
  const [modul,setModul]       = useState(null); // null=pocetni, "atributivne","varijabilne","admin"
  const [C,setC]               = useState(()=>{
    const saved=localStorage.getItem("spc_tema");
    return saved==="svetla"?TEME.svetla:TEME.tamna;
  });
  // Mora biti na vrhu — Rules of Hooks
  const [listaOk,setListaOk]   = useState(false);
  const [listaOkVar,setListaOkVar] = useState(false);

  useEffect(() => {
    if (modul === null) {
      setListaOk(false);
      setListaOkVar(false);
    }
  }, [modul]);

  useEffect(() => {
    if (modul !== "atributivne" && modul !== "varijabilne") return;
    const sm = Number(localStorage.getItem("spc_smena") || sessionStorage.getItem("spc_smena") || 1);
    if (jeLinijaUloga(korisnik?.uloga)) {
      if (modul === "atributivne") setListaOk(true);
      else setListaOkVar(true);
      return;
    }
    if (modul === "atributivne") {
      setListaOk(getListaOkSession("atributivne", sm));
    } else {
      setListaOkVar(getListaOkSession("varijabilne", sm));
    }
  }, [modul, korisnik?.uloga]);

  const [loginKey,setLoginKey] = useState(0);
  const [nav8dTick, setNav8dTick] = useState(0);
  const otvori8dIzvana = (esk) => {
    sessionStorage.setItem("spc_8d_prefill", JSON.stringify(prefill8dIzEskalacije(esk)));
    sessionStorage.setItem("spc_tab_atr", "8d");
    if (modul === "atributivne") setNav8dTick(t => t + 1);
    else setModul("atributivne");
  };
  const [rezimRada, setRezimRada] = useState(() =>
    sessionStorage.getItem("spc_rezim_rada") || "linija",
  );

  useEffect(() => {
    if (!korisnik) return;
    if (jeLinijaUloga(korisnik.uloga)) {
      setRezimRada("linija");
      sessionStorage.setItem("spc_rezim_rada", "linija");
      return;
    }
    const saved = sessionStorage.getItem("spc_rezim_rada");
    if (!saved) {
      const r = podrazumevaniRezim(korisnik.uloga);
      setRezimRada(r);
      sessionStorage.setItem("spc_rezim_rada", r);
    }
  }, [korisnik]);

  const promeniRezim = (novi) => {
    if (!korisnik || !mozePrebacivanjeRezima(korisnik.uloga)) return;
    setRezimRada(novi);
    sessionStorage.setItem("spc_rezim_rada", novi);
  };

  const aktivniRezim = korisnik
    ? efektivniRezimRada(korisnik.uloga, rezimRada)
    : rezimRada;

  useEffect(()=>{localStorage.setItem("spc_tema",C.naziv);},[C]);

  useEffect(()=>{ registrujPWA(); },[]);

  useAdminZahtevNotifikacije({
    supabase,
    korisnik,
    enabled: !!korisnik && jeAdmin(korisnik.uloga),
  });

  useEffect(()=>{
    supabase.auth.getSession().then(async ({data:{session}})=>{
      if(session){
        ocistiUnosDraft();
        const k = await ucitajRadnika(session.user);
        if (!k?.radnikId) {
          await supabase.auth.signOut();
          setKorisnik(null);
        } else {
          setKorisnik(k);
        }
      }
      setChecking(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      if(!session){
        setKorisnik(null);
        setModul(null);
        setLoginKey(k=>k+1);
      }
    });
    return()=>subscription.unsubscribe();
  },[]);

  const odjava = async () => {
    await supabase.auth.signOut();
    ocistiUnosDraft();
    setKorisnik(null);
    setModul(null);
    setLoginKey(k=>k+1);
  };

  if (licenca.ucitava || checking) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",color:C.sivi,fontFamily:"monospace",fontSize:12}}>
      {licenca.ucitava ? "Provera licence..." : "Provera sesije..."}
    </div>
  );

  if (!licenca.ok) {
    return <LicencaBlokada poruka={licenca.poruka} kod={licenca.kod} C={C} />;
  }

  if(!korisnik) return <Login key={loginKey} onLogin={setKorisnik} C={C}/>;

  if(!modul) return (
    <>
      <LicencaUpozorenje licenca={licenca} C={C} />
      <PocetniEkran
        korisnik={korisnik}
        licenca={licenca}
        onIzbor={setModul}
        onOdjava={odjava}
        C={C} setC={setC}
        rezimRada={aktivniRezim}
        onPromeniRezim={promeniRezim}
        onOtvori8D={otvori8dIzvana}
      />
    </>
  );

  if (modul === "atributivne" && !modulDozvoljen(licenca, "atributivne")) {
    return (
      <ModulBlokiran nazivModula="Atributivne kontrole" C={C} onNazad={() => setModul(null)} />
    );
  }
  if (modul === "varijabilne" && !modulDozvoljen(licenca, "varijabilne")) {
    return (
      <ModulBlokiran nazivModula="Merljive (varijabilne)" C={C} onNazad={() => setModul(null)} />
    );
  }
  if (modul === "admin" && !modulDozvoljen(licenca, "admin")) {
    return (
      <ModulBlokiran nazivModula="Admin panel" C={C} onNazad={() => setModul(null)} />
    );
  }

  // Kontrolna lista pre atributivnog unosa (analitika — po smeni; linija — posle izbora ID dela)
  if(modul==="atributivne"&&!listaOk&&!jeLinijaUloga(korisnik?.uloga)) return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'IBM Plex Mono',monospace"}}>
      <AppHeader
        korisnik={korisnik}
        onOdjava={odjava}
        onNazad={() => setModul(null)}
        C={C}
        onToggleTema={() => setC(p => p.naziv === "tamna" ? TEME.svetla : TEME.tamna)}
        temaTamna={C.naziv === "tamna"}
      />
      <KontrolnaLista korisnik={korisnik}
        smena={Number(localStorage.getItem("spc_smena")||1)}
        naslovModul="Atributivne"
        onZavrsena={()=>{
          const sm = Number(localStorage.getItem("spc_smena") || sessionStorage.getItem("spc_smena") || 1);
          setListaOkSession("atributivne", sm);
          setListaOk(true);
        }}
        C={C}/>
    </div>
  );

  if(modul==="varijabilne"&&!listaOkVar&&!jeLinijaUloga(korisnik?.uloga)) return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'IBM Plex Mono',monospace"}}>
      <AppHeader
        korisnik={korisnik}
        onOdjava={odjava}
        onNazad={() => setModul(null)}
        C={C}
        onToggleTema={() => setC(p => p.naziv === "tamna" ? TEME.svetla : TEME.tamna)}
        temaTamna={C.naziv === "tamna"}
      />
      <KontrolnaLista korisnik={korisnik}
        smena={Number(localStorage.getItem("spc_smena")||sessionStorage.getItem("spc_smena")||1)}
        naslovModul="Merljive"
        akcent={C.zelena}
        onZavrsena={()=>{
          const sm = Number(localStorage.getItem("spc_smena") || sessionStorage.getItem("spc_smena") || 1);
          setListaOkSession("varijabilne", sm);
          setListaOkVar(true);
        }}
        C={C}/>
    </div>
  );

  if(modul==="admin") return (
    mozeAdmin(korisnik.uloga) ? (
    <>
      <LicencaUpozorenje licenca={licenca} C={C} />
      <AdminPanel
        korisnik={korisnik}
        licenca={licenca}
        onNazad={()=>setModul(null)}
        C={C}
      />
    </>
    ) : (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"monospace",color:C.tekst}}>
      <div style={{fontSize:48}}>🔒</div>
      <div>Nemate pristup Admin panelu.</div>
      <button onClick={()=>setModul(null)} style={{background:C.plava,border:"none",borderRadius:8,
        color:"#fff",padding:"10px 20px",cursor:"pointer"}}>← Nazad</button>
    </div>
    )
  );

  if(modul==="atributivne") return (
    <GlavnaForma
      korisnik={korisnik}
      onOdjava={odjava}
      onNazad={()=>setModul(null)}
      C={C} setC={setC}
      rezimRada={aktivniRezim}
      onPromeniRezim={promeniRezim}
      nav8dTick={nav8dTick}
      licenca={licenca}
    />
  );

  if(modul==="varijabilne") return (
    <VarijabilneForma
      korisnik={korisnik}
      onOdjava={odjava}
      onNazad={()=>setModul(null)}
      C={C}
      onToggleTema={() => setC(p => p.naziv === "tamna" ? TEME.svetla : TEME.tamna)}
      temaTamna={C.naziv === "tamna"}
      rezimRada={aktivniRezim}
      onPromeniRezim={promeniRezim}
      unosRezim={sessionStorage.getItem("spc_mer_unos_rezim") === "digital" ? "digital" : "rucni"}
      onOtvori8D={otvori8dIzvana}
      licenca={licenca}
    />
  );

  return null;
}

// ============================================================
// POČETNI EKRAN — izbor modula nakon logovanja
// ============================================================
function PocetniEkran({ korisnik, licenca, onIzbor, onOdjava, C, setC, rezimRada, onPromeniRezim, onOtvori8D }) {
  const ekran = useEkran();

  const MODULI = [
    {
      id: "atributivne",
      ikon: "✗✓",
      naziv: "Atributivne kontrole",
      opis: "OK/NOK unos · p, C, u, np, nC karte · Pareto · DPMO",
      boja: C.plava,
      dostupan: modulDozvoljen(licenca, "atributivne"),
      blokPoruka: "Nije u licenci",
    },
    {
      id: "varijabilne",
      ikon: "⌨",
      naziv: "Varijabilne — ručni unos",
      opis: "Kucanje merenja · X̄/R karte · Cp/Cpk",
      boja: C.zelena,
      dostupan: modulDozvoljen(licenca, "varijabilne"),
      rezim: "rucni",
      blokPoruka: "Nije u licenci",
    },
    {
      id: "varijabilne",
      ikon: "📟",
      naziv: "Varijabilne — digitalni unos",
      opis: "Digitalna merila · USB / paste · serije A/B",
      boja: C.zelena,
      dostupan: modulDozvoljen(licenca, "varijabilne"),
      rezim: "digital",
      key: "varijabilne-digital",
      blokPoruka: "Nije u licenci",
    },
    ...(mozeAdmin(korisnik.uloga) ? [{
      id: "admin",
      ikon: "🔧",
      naziv: "Admin Panel",
      opis: "Excel ↔ Supabase · radnici · prekidi · reset smene",
      boja: C.zuta,
      dostupan: modulDozvoljen(licenca, "admin"),
      key: "admin",
      blokPoruka: "Nije u licenci",
    }] : []),
  ];

  return (
    <div style={{
      minHeight:"100vh", background:C.bg,
      fontFamily:"'IBM Plex Mono',monospace", color:C.tekst,
      display:"flex", flexDirection:"column",
    }}>
      <AppHeader
        korisnik={korisnik}
        onOdjava={onOdjava}
        C={C}
        onToggleTema={() => setC(p => p.naziv === "tamna" ? TEME.svetla : TEME.tamna)}
        temaTamna={C.naziv === "tamna"}
      />

      {/* Sadržaj */}
      <div style={{
        flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"flex-start",
        padding: ekran.mob ? "16px 12px 32px" : "24px 24px 40px",
        gap: ekran.mob ? 20 : 28,
        overflowY: "auto",
      }}>
        <div style={{ width: "100%", maxWidth: 960 }}>
          <BrendingNaslov
            C={C}
            varijanta={ekran.mob ? "kompakt" : "pocetna"}
            dobrodoslica={korisnik.ime}
          />
        </div>

        <ZajednickiDashboard
          C={C}
          kompakt
          korisnik={korisnik}
          onOtvori8D={mozeAnalitika(korisnik.uloga) ? onOtvori8D : undefined}
        />

        {licenca && !jeLinijaUloga(korisnik.uloga) && (
          <div style={{ width: "100%", maxWidth: 960 }}>
            <LicencaStatusPanel licenca={licenca} C={C} kompakt />
          </div>
        )}

        {mozePrebacivanjeRezima(korisnik.uloga) && typeof onPromeniRezim === "function" && (
          <div style={{
            display: "flex", gap: 8, width: "100%", maxWidth: 960,
            justifyContent: ekran.mob ? "stretch" : "flex-end",
          }}>
            {["linija", "analitika"].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => onPromeniRezim(r)}
                style={{
                  flex: ekran.mob ? 1 : undefined,
                  background: rezimRada === r ? (r === "linija" ? `${C.zelena}22` : `${C.plava}22`) : C.panel,
                  border: `2px solid ${rezimRada === r ? (r === "linija" ? C.zelena : C.plava) : C.border}`,
                  borderRadius: 10, padding: "10px 16px", cursor: "pointer",
                  color: rezimRada === r ? C.tekst : C.sivi,
                  fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                }}
              >
                {r === "linija" ? "🏭 Modul 1 — Linija" : "📊 Modul 2 — Analitika"}
              </button>
            ))}
          </div>
        )}

        <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2, width: "100%", maxWidth: 960 }}>
          MODULI
        </div>

        <div style={{
          display:"grid",
          gridTemplateColumns: ekran.mob ? "1fr" : "repeat(2, 1fr)",
          gap:16, width:"100%", maxWidth:960,
        }}>
          {MODULI.map(m => (
            <button key={m.key || m.id} onClick={()=>{
              if (!m.dostupan) return;
              if (m.rezim) sessionStorage.setItem("spc_mer_unos_rezim", m.rezim);
              onIzbor(m.id);
            }}
              style={{
                background:C.panel,
                border:`2px solid ${m.dostupan?m.boja+"50":C.border}`,
                borderRadius:16,
                padding: ekran.mob?"24px 20px":"32px 28px",
                cursor:m.dostupan?"pointer":"not-allowed",
                textAlign:"left",
                transition:"all 0.2s",
                opacity:m.dostupan?1:0.5,
                position:"relative",
                overflow:"hidden",
              }}
              onMouseEnter={e=>{if(m.dostupan)e.currentTarget.style.borderColor=m.boja;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=m.dostupan?m.boja+"50":C.border;}}
            >
              {/* Pozadinska dekoracija */}
              <div style={{
                position:"absolute", top:-20, right:-20,
                fontSize:80, opacity:0.05, lineHeight:1,
              }}>{m.ikon}</div>

              <div style={{
                color:m.boja, fontSize: ekran.mob?28:36,
                fontWeight:700, marginBottom:12, letterSpacing:-1,
              }}>{m.ikon}</div>

              <div style={{color:C.tekst, fontSize: ekran.mob?15:17,
                fontWeight:700, marginBottom:8, letterSpacing:0.5}}>
                {m.naziv}
              </div>

              <div style={{color:C.sivi, fontSize: ekran.mob?11:12, lineHeight:1.6}}>
                {m.opis}
              </div>

              {!m.dostupan && (
                <div style={{
                  marginTop:12, background:C.zuta+"20",
                  border:`1px solid ${C.zuta}40`,
                  borderRadius:6, padding:"4px 10px",
                  color:C.zuta, fontSize:10, display:"inline-block",
                }}>{m.blokPoruka || "Nije dostupno"}</div>
              )}

              {m.dostupan && (
                <div style={{
                  marginTop:14, color:m.boja,
                  fontSize:12, fontWeight:700, letterSpacing:1,
                }}>Otvori →</div>
              )}
            </button>
          ))}
        </div>

        {licenca && jeLinijaUloga(korisnik.uloga) && (
          <div style={{ width: "100%", maxWidth: 960 }}>
            <LicencaStatusPanel licenca={licenca} C={C} kompakt />
          </div>
        )}

        <AppFooter C={C} kompakt prikaziAutora />
      </div>
    </div>
  );
}

// ─── ADMIN: EXCEL ↔ SUPABASE ─────────────────────────────────
function AdminExcelPanel({ C, addToast }) {
  const [wb, setWb] = useState(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState([]);
  const [busy, setBusy] = useState("");
  const fileRef = useRef(null);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("učitavanje");
    try {
      const book = await readWorkbookFromFile(file);
      setWb(book);
      setFileName(file.name);
      setPreview(previewImport(book));
    } catch (err) {
      addToast(err.message, "greska");
    } finally {
      setBusy("");
      e.target.value = "";
    }
  };

  const uvoz = async () => {
    if (!wb) return;
    setBusy("uvoz");
    try {
      const results = await importWorkbookToSupabase(supabase, wb);
      const ok = results.filter(r => r.status === "ok");
      const msg = ok.length
        ? ok.map(r => `${r.sheet}: ${r.count} redova`).join("\n")
        : "Nijedan sheet nije uvezen — proveri nazive tabova u Excelu.";
      addToast(`✓ Uvoz završen\n${msg}`, ok.length ? "uspeh" : "greska");
    } catch (err) {
      addToast(err.message, "greska");
    } finally {
      setBusy("");
    }
  };

  const izvozSve = async () => {
    setBusy("izvoz");
    try {
      const book = await exportMasterWorkbook(supabase);
      downloadWorkbook(book, `SPC_master_${dISO()}.xlsx`);
      addToast("✓ Master Excel preuzet", "uspeh");
    } catch (err) {
      addToast(err.message, "greska");
    } finally {
      setBusy("");
    }
  };

  const preuzmiLogMirror = async () => {
    setBusy("mirror");
    try {
      const { data, error } = await supabase.storage.from(EXCEL_BUCKET).download(KONTROLNI_LOG_FILE);
      if (error) throw new Error("Nema kopije u Storage-u — prvo snimi unos iz aplikacije.");
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = KONTROLNI_LOG_FILE;
      a.click();
      URL.revokeObjectURL(url);
      addToast("✓ Excel kopija kontrolni_log preuzeta", "uspeh");
    } catch (err) {
      addToast(err.message, "greska");
    } finally {
      setBusy("");
    }
  };

  const BTN = (bg) => ({
    background: bg, border: "none", borderRadius: 8, color: "#fff",
    fontSize: 12, fontWeight: 700, padding: "10px 18px", cursor: busy ? "wait" : "pointer",
    opacity: busy ? 0.6 : 1,
  });

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.plava}40`, borderRadius: 12, padding: 20 }}>
      <div style={{ color: C.plava, fontSize: 13, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>
        EXCEL ↔ SUPABASE
      </div>
      <div style={{ color: C.sivi, fontSize: 11, marginBottom: 16, lineHeight: 1.7 }}>
        Svaki unos u aplikaciji ide u <strong style={{ color: C.tekst }}>Supabase</strong> i istovremeno u Excel kopiju
        (<code>{EXCEL_BUCKET}/{KONTROLNI_LOG_FILE}</code>).
        Šifrarnike uvozi iz Excel fajla sa tabovima: {IMPORT_SHEETS.map(s => s.sheet).join(", ")}.
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <button onClick={izvozSve} disabled={!!busy} style={BTN(C.plava)}>
          ⬇ Preuzmi master Excel
        </button>
        <button onClick={preuzmiLogMirror} disabled={!!busy} style={BTN(C.zelena)}>
          ⬇ Preuzmi kontrolni_log kopiju
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={!!busy} style={BTN(C.narandzasta)}>
          ⬆ Uvezi iz Excela
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onFile} style={{ display: "none" }} />
      </div>

      {fileName && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ color: C.tekst, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{fileName}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
            {preview.map(p => (
              <div key={p.sheet} style={{ display: "flex", justifyContent: "space-between", color: C.sivi }}>
                <span>{p.sheet}</span>
                <span style={{ color: p.mappedCount ? C.zelena : C.crvena }}>
                  {p.mappedCount ? `${p.mappedCount} redova` : (p.rawCount ? "mapiranje?" : "nema taba")}
                </span>
              </div>
            ))}
          </div>
          <button onClick={uvoz} disabled={!!busy || !preview.some(p => p.mappedCount > 0)}
            style={{ ...BTN(C.zelena), marginTop: 12, width: "100%" }}>
            {busy === "uvoz" ? "Uvoz..." : "✓ Uvezi u Supabase"}
          </button>
        </div>
      )}

      <div style={{ color: C.sivi, fontSize: 10, lineHeight: 1.6 }}>
        1. Pokreni <code>06_storage_excel_sync.sql</code> u Supabase (bucket + dozvole).<br/>
        2. Uredi master Excel lokalno → Admin → Uvezi iz Excela.<br/>
        3. CSV skripta (<code>import-all-docs.mjs</code>) i dalje radi paralelno.
      </div>
    </div>
  );
}

// ============================================================
// ADMIN PANEL
// ============================================================
function AdminPanel({ korisnik, licenca, onNazad, C, uGravnojFormi = false }) {
  const [radnici,setRadnici]   = useState([]);
  const [loading,setLoading]   = useState(true);
  const [modal,setModal]       = useState(null);
  const [novoIme,setNovoIme]   = useState("");
  const [noviEmail,setNoviEmail] = useState("");
  const [novaUloga,setNovaUloga] = useState("kontrolor");
  const ekran = useEkran();

  useEffect(()=>{
    supabase.from("radnici").select("id,ime,uloga,user_id,email,aktivan").order("ime")
      .then(({data})=>{ setRadnici(data||[]); setLoading(false); });
  },[]);

  const promeniAktivan = async (id, aktivan) => {
    if (!aktivan && id === korisnik.radnikId) {
      setModal({ poruka: "Ne možete deaktivirati sopstveni nalog.", tip: "greska" });
      return;
    }
    const { error } = await supabase.from("radnici").update({ aktivan }).eq("id", id);
    if (error) {
      setModal({ poruka: error.message, tip: "greska" });
      return;
    }
    const ime = radnici.find(r => r.id === id)?.ime || "Radnik";
    setRadnici(p => p.map(r => r.id === id ? { ...r, aktivan } : r));
    setModal({
      poruka: aktivan
        ? `✓ ${ime} ponovo aktiviran — može da se uloguje.`
        : `✓ ${ime} deaktiviran — ne može da se uloguje dok se ne aktivira.`,
      tip: "uspeh",
    });
  };

  const oslobodiAuth = async (id) => {
    await supabase.from("radnici").update({ user_id: null }).eq("id", id);
    setRadnici(p => p.map(r => r.id === id ? { ...r, user_id: null } : r));
    setModal({ poruka: "✓ Auth veza uklonjena — radnik se ponovo povezuje pri sledećoj prijavi.", tip: "uspeh" });
  };

  const resetSmenu = async () => {
    setModal({poruka:"Statistika smene se računa iz kontrolni_log po datumu i smeni — nema lokalnog reset-a.",tip:"info"});
  };

  const promeniUlogu = async (id, uloga) => {
    await supabase.from("radnici").update({uloga}).eq("id",id);
    setRadnici(p=>p.map(r=>r.id===id?{...r,uloga}:r));
  };

  const dodajRadnika = async () => {
    const ime = novoIme.trim();
    const email = noviEmail.trim().toLowerCase();
    if (!ime) {
      setModal({ poruka: "Unesite ime i prezime.", tip: "greska" });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setModal({ poruka: "Unesite ispravan email — isti kao u Supabase Auth.", tip: "greska" });
      return;
    }
    const { data, error } = await supabase.from("radnici")
      .insert({ ime: ime.toUpperCase(), uloga: novaUloga, email, aktivan: true })
      .select().single();
    if (error) {
      setModal({ poruka: error.message, tip: "greska" });
      return;
    }
    setRadnici(p => [...p, data]);
    setNovoIme("");
    setNoviEmail("");
    setModal({
      poruka: `✓ ${data.ime} dodat (${data.uloga}).\nEmail: ${email}\n\nU Supabase Auth kreiraj korisnika sa istim emailom — pri loginu se automatski povezuje.`,
      tip: "uspeh",
    });
  };

  const INP = {
    background:C.input, border:`1px solid ${C.border}`, borderRadius:8,
    color:C.tekst, fontSize:13, padding:"10px 12px",
    outline:"none", fontFamily:"inherit",
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'IBM Plex Mono',monospace",color:C.tekst}}>
      {modal&&<Modal poruka={modal.poruka} tip={modal.tip} onOK={()=>setModal(null)} C={C}/>}

      {/* Header */}
      <div style={{background:C.panel,borderBottom:`1px solid ${C.border}`,
        padding:"0 20px",height:52,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onNazad} style={{background:"none",border:"none",
            color:C.sivi,fontSize:14,cursor:"pointer",padding:0}}>← {uGravnojFormi?"Unos":"Nazad"}</button>
          <span style={{color:C.border}}>|</span>
          <span style={{color:C.zuta,fontWeight:700,fontSize:13,letterSpacing:1}}>🔧 ADMIN PANEL</span>
        </div>
        <span style={{color:C.sivi,fontSize:10}}>{korisnik.ime}</span>
      </div>

      <div style={{padding: ekran.mob?"16px":"24px", display:"flex", flexDirection:"column", gap:20, maxWidth:800, margin:"0 auto"}}>

        {licenca && <LicencaStatusPanel licenca={licenca} C={C} />}
        <OProgramuPanel licenca={licenca} C={C} />

        {/* Reset smene — samo pravi admin */}
        {korisnik.uloga==="admin" && (
        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
          <div style={{color:C.tekst,fontSize:13,fontWeight:700,marginBottom:6,letterSpacing:1}}>
            RESET SMENE
          </div>
          <div style={{color:C.sivi,fontSize:11,marginBottom:14,lineHeight:1.6}}>
            Nulira statistiku smene (OK/NOK/Merenja) za sve korisnike.
            Koristiti na početku nove smene.
          </div>
          <button onClick={resetSmenu} style={{
            background:"#3d2c00",border:`1px solid ${C.zuta}40`,borderRadius:8,
            color:C.zuta,fontSize:12,fontWeight:700,padding:"10px 20px",cursor:"pointer",
          }}>⚠ Reset smene</button>
        </div>
        )}

        {/* Dodaj radnika — samo admin */}
        {korisnik.uloga==="admin" && (
        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
          <div style={{color:C.tekst,fontSize:13,fontWeight:700,marginBottom:14,letterSpacing:1}}>
            DODAJ RADNIKA
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <input value={novoIme} onChange={e=>setNovoIme(e.target.value)}
                placeholder="Ime i prezime"
                style={{...INP,flex:1,minWidth:180}}/>
              <input value={noviEmail} onChange={e=>setNoviEmail(e.target.value)}
                type="email"
                placeholder="email@fabrika.com"
                autoComplete="off"
                style={{...INP,flex:1,minWidth:200}}/>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <select value={novaUloga} onChange={e=>setNovaUloga(e.target.value)}
              style={{...INP,cursor:"pointer",flex:1,minWidth:160}}>
              <option value="operator">Operator</option>
              <option value="kontrolor">Kontrolor</option>
              <option value="kvalitet">Inženjer kvaliteta</option>
              <option value="sef">Šef / menadžment</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={dodajRadnika}
              style={{background:C.zelena,border:"none",borderRadius:8,
                color:"#fff",fontSize:12,fontWeight:700,padding:"10px 20px",cursor:"pointer"}}>
              + Dodaj
            </button>
            </div>
          </div>
          <div style={{color:C.sivi,fontSize:10,marginTop:8,lineHeight:1.5}}>
            Email mora biti isti u Auth (Authentication → Users) i u tabeli radnici.
            Inženjeri: uloga <strong style={{color:C.tekst}}>kvalitet</strong> ili <strong style={{color:C.tekst}}>sef</strong>.
          </div>
        </div>
        )}

        {/* Lista radnika */}
        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
          <div style={{color:C.tekst,fontSize:13,fontWeight:700,marginBottom:14,letterSpacing:1}}>
            RADNICI ({radnici.length})
          </div>
          {loading ? (
            <div style={{color:C.sivi,fontSize:12}}>Učitavanje...</div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {radnici.map(r=>{
                const aktivan = r.aktivan !== false;
                return (
                <div key={r.id} style={{
                  display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"10px 14px",background:C.bg,borderRadius:8,
                  border:`1px solid ${aktivan ? C.border : C.crvena + "55"}`,
                  flexWrap:"wrap",gap:8,opacity:aktivan?1:0.75,
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <span style={{color:C.tekst,fontSize:13,fontWeight:700}}>{r.ime}</span>
                    <span style={{
                      background:r.uloga==="admin"?"#3d2c00":r.uloga==="kontrolor"?"#0c2d48":"#0c2010",
                      color:r.uloga==="admin"?C.zuta:r.uloga==="kontrolor"?C.plava:C.zelena,
                      fontSize:9,padding:"2px 8px",borderRadius:20,letterSpacing:1,
                    }}>{r.uloga.toUpperCase()}</span>
                    {!aktivan && (
                      <span style={{
                        background:"#3d1010",color:C.crvena,
                        fontSize:9,padding:"2px 8px",borderRadius:20,letterSpacing:1,
                      }}>DEAKTIVIRAN</span>
                    )}
                    {r.email&&<span style={{color:C.sivi,fontSize:9}}>{r.email}</span>}
                    {!r.user_id
                      ? <span style={{color:C.crvena,fontSize:9}}>⚠ Nema Auth UID</span>
                      : <span style={{color:C.zelena,fontSize:9}}>✓ Auth povezan</span>}
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <select value={r.uloga} onChange={e=>promeniUlogu(r.id,e.target.value)}
                    disabled={!aktivan}
                    style={{background:C.input,border:`1px solid ${C.border}`,borderRadius:6,
                      color:C.tekst,fontSize:11,padding:"4px 8px",cursor:aktivan?"pointer":"not-allowed",
                      fontFamily:"inherit",opacity:aktivan?1:0.5}}>
                    <option value="operator">Operator</option>
                    <option value="kontrolor">Kontrolor</option>
                    <option value="kvalitet">Kvalitet</option>
                    <option value="sef">Šef</option>
                    <option value="admin">Admin</option>
                  </select>
                  {korisnik.uloga==="admin" && (
                    <button type="button" onClick={()=>promeniAktivan(r.id, !aktivan)}
                      style={{
                        background:aktivan?"#3d1010":"#0c2010",
                        border:`1px solid ${aktivan ? C.crvena + "55" : C.zelena + "55"}`,
                        borderRadius:6,color:aktivan?C.crvena:C.zelena,
                        fontSize:9,padding:"4px 8px",cursor:"pointer",fontWeight:700,
                      }}>
                      {aktivan ? "Deaktiviraj" : "Aktiviraj"}
                    </button>
                  )}
                  {r.user_id && aktivan && (
                    <button type="button" onClick={()=>oslobodiAuth(r.id)}
                      style={{background:"none",border:`1px solid ${C.border}`,borderRadius:6,
                        color:C.sivi,fontSize:9,padding:"4px 8px",cursor:"pointer"}}>
                      Reset Auth
                    </button>
                  )}
                  </div>
                </div>
              );})}
            </div>
          )}
        </div>

        <OfflineSyncPanel
          supabase={supabase}
          C={C}
          addToast={(t, tip) => setModal({ poruka: t, tip: tip || "info" })}
          onSync={(res) => {
            if (res.syncedJobs > 0) {
              setModal({ poruka: `Sinhronizovano ${res.syncedJobs} paketa`, tip: "uspeh" });
            }
          }}
          mirrorKontrolniLog={mirrorKontrolniLogToExcel}
        />
        <SchemaStatusPanel C={C} />
        <SpcBaselinePanel
          C={C}
          korisnik={korisnik}
          modul="atributivne"
          addToast={(t, tip) => setModal({ poruka: t, tip: tip || "info" })}
        />
        <TrasabilitetPanel C={C} addToast={(t, tip) => setModal({ poruka: t, tip: tip || "info" })} modul="atributivne" />
        <MeriloBarkodUputstvo C={C} />
        <NotifikacijePodesavanja C={C} addToast={(t, tip) => setModal({ poruka: t, tip: tip || "info" })} />

        {/* Excel ↔ Supabase — atributivne */}
        <AdminExcelPanel C={C} addToast={(t, tip) => setModal({ poruka: t, tip: tip || "info" })} />

        {/* Excel ↔ Supabase — merljive / varijabilne */}
        <MerljiveExcelPanel C={C} addToast={(t, tip) => setModal({ poruka: t, tip: tip || "info" })} />

        {/* Zahtevi za prekid */}
        <AdminPrekidiPanel korisnik={korisnik} C={C} addToast={(t,tip)=>{
          // mini toast u admin panelu
          alert(t);
        }}/>

        <AdminKalibracijaPanel korisnik={korisnik} C={C} addToast={(t, tip) => {
          alert(t);
        }} />

        {/* Statistike sistema */}
        <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
          <div style={{color:C.tekst,fontSize:13,fontWeight:700,marginBottom:14,letterSpacing:1}}>
            STATISTIKE SISTEMA
          </div>
          <AdminStatistike C={C}/>
        </div>
      </div>
    </div>
  );
}

function AdminStatistike({C}) {
  const [stat,setStat] = useState(null);
  useEffect(()=>{
    Promise.all([
      supabase.from("kontrolni_log").select("id",{count:"exact",head:true}),
      supabase.from("delovi").select("id",{count:"exact",head:true}),
      supabase.from("radnici").select("id",{count:"exact",head:true}),
      supabase.from("kontrolni_log").select("id",{count:"exact",head:true})
        .gte("datum",new Date().toISOString().split("T")[0]),
    ]).then(([log,del,rad,danas])=>{
      setStat({
        ukupnoUnosa: log.count||0,
        ukupnoDelova: del.count||0,
        ukupnoRadnika: rad.count||0,
        unosaDanas: danas.count||0,
      });
    });
  },[]);

  if(!stat) return <div style={{color:C.sivi,fontSize:12}}>Učitavanje...</div>;

  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
      {[
        ["UNOSA DANAS",  stat.unosaDanas,  C.zelena],
        ["UK. UNOSA",    stat.ukupnoUnosa, C.plava],
        ["DELOVA",       stat.ukupnoDelova,C.narandzasta],
        ["RADNIKA",      stat.ukupnoRadnika,C.ljubicasta],
      ].map(([n,v,b])=>(
        <div key={n} style={{background:C.bg,border:`1px solid ${b}25`,
          borderRadius:10,padding:"14px",textAlign:"center"}}>
          <div style={{color:b,fontSize:24,fontWeight:700}}>{v}</div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.2,marginTop:4}}>{n}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// v8 DODACI — sve nove funkcionalnosti
// ============================================================

// ─── HOOK: Offline cache za karte ────────────────────────────
function useOfflineCache(key, ttlMin=30) {
  const get = () => {
    try {
      const raw = localStorage.getItem(`spc_cache_${key}`);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > ttlMin * 60000) return null;
      return data;
    } catch { return null; }
  };
  const set = (data) => {
    try { localStorage.setItem(`spc_cache_${key}`, JSON.stringify({ data, ts: Date.now() })); }
    catch {}
  };
  const clear = () => localStorage.removeItem(`spc_cache_${key}`);
  return { get, set, clear };
}

// ─── ADMIN: Panel za odobrenje prekida ───────────────────────
function AdminPrekidiPanel({ korisnik, C, addToast }) {
  const [zahtevi, setZahtevi] = useState([]);
  const [loading, setLoading] = useState(true);

  const ucitaj = async () => {
    const { data } = await supabase.from("prekidi_zahtevi")
      .select("*,operater:radnici!prekidi_zahtevi_operater_id_fkey(ime)")
      .eq("status","ceka")
      .order("created_at",{ascending:false});
    setZahtevi(data||[]);
    setLoading(false);
  };

  useEffect(()=>{ ucitaj(); },[]);

  // Real-time — novi zahtevi
  useEffect(()=>{
    const ch = supabase.channel("prekidi_admin")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"prekidi_zahtevi"},
        payload => {
          addToast(`📤 Novi zahtev: ${payload.new.id_deo} — ${payload.new.razlog?.substring(0,30)}...`,"greska");
          ucitaj();
        })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"prekidi_zahtevi"},
        () => ucitaj());
    ch.subscribe();
    return () => supabase.removeChannel(ch);
  },[]);

  const odluci = async (id, odluka, napomena="") => {
    const { error } = await supabase.from("prekidi_zahtevi").update({
      status:   odluka,
      admin_id: korisnik.radnikId,
      napomena,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) {
      addToast(error.message, "greska");
      return;
    }
    addToast(odluka==="odobreno"?"✓ Prekid odobren":"✗ Zahtev odbijen",
      odluka==="odobreno"?"uspeh":"greska");
    ucitaj();
  };

  return (
    <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:12,padding:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{color:C.tekst,fontSize:13,fontWeight:700,letterSpacing:1}}>
          ZAHTEVI ZA PREKID
          {zahtevi.length>0&&<span style={{background:C.crvena,color:"#fff",fontSize:10,
            borderRadius:10,padding:"1px 7px",marginLeft:8}}>{zahtevi.length}</span>}
        </div>
        <button onClick={ucitaj} style={{background:"none",border:`1px solid ${C.border}`,
          borderRadius:5,color:C.sivi,fontSize:10,padding:"4px 10px",cursor:"pointer"}}>
          ↻ Osveži
        </button>
      </div>
      {loading?<div style={{color:C.sivi,fontSize:12}}>Učitavanje...</div>
       :zahtevi.length===0?(
        <div style={{color:C.border,fontSize:12,textAlign:"center",padding:"20px 0"}}>
          Nema aktivnih zahteva ✓
        </div>
      ):zahtevi.map(z=>(
        <div key={z.id} style={{background:C.bg,border:`1px solid ${C.zuta}40`,
          borderRadius:10,padding:14,marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <div>
              <span style={{color:C.tekst,fontWeight:700,fontSize:13}}>{z.id_deo}</span>
              <span style={{color:C.sivi,fontSize:11,marginLeft:8}}>{z.naziv_dela}</span>
            </div>
            <span style={{color:C.sivi,fontSize:10}}>
              {new Date(z.created_at).toLocaleTimeString("sr-RS",{hour:"2-digit",minute:"2-digit"})}
            </span>
          </div>
          <div style={{color:C.sivi,fontSize:11,marginBottom:4}}>
            Operater: <strong style={{color:C.tekst}}>{z.operater?.ime||"?"}</strong>
            {" · "}Preostalo: <strong style={{color:C.crvena}}>{z.preostalo}/{z.cilj}</strong>
          </div>
          <div style={{color:C.zuta,fontSize:12,marginBottom:12,
            background:C.zuta+"15",padding:"6px 10px",borderRadius:6}}>
            "{z.razlog}"
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>odluci(z.id,"odobreno")}
              style={{flex:1,background:C.zelena,border:"none",borderRadius:8,
                color:"#fff",fontSize:12,fontWeight:700,padding:"9px",cursor:"pointer"}}>
              ✓ Odobri prekid
            </button>
            <button onClick={()=>odluci(z.id,"odbijeno","Nastavi merenje")}
              style={{flex:1,background:C.crvena,border:"none",borderRadius:8,
                color:"#fff",fontSize:12,fontWeight:700,padding:"9px",cursor:"pointer"}}>
              ✗ Odbij
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── POREĐENJE PERIODA ────────────────────────────────────────
function PoredjenjePerioda({ idDeo, C, addToast }) {
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
        supabase.from("kontrolni_log").select("ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok")
          .eq("id_deo",idDeo).gte("datum",fmt(od1)).lte("datum",fmt(danas)),
        supabase.from("kontrolni_log").select("ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok")
          .eq("id_deo",idDeo).gte("datum",fmt(od2)).lt("datum",fmt(od1)),
      ]);

      const calc = (rows) => {
        const n   = rows.reduce((s,r)=>s+(r.ukupno_merenja||0),0);
        const nok = rows.reduce((s,r)=>s+(r.nok_kolicina||0),0);
        const ok  = rows.reduce((s,r)=>s+(r.ok_kolicina||0),0);
        return {
          n, nok, ok,
          rty:  n>0?((ok/n)*100).toFixed(2):0,
          p:    n>0?((nok/n)*100).toFixed(3):0,
          dpmo: n>0?Math.round((nok/n)*1e6):0,
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
            ["RTY %", podaci.tek.rty, podaci.prev.rty, false, "%"],
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
function TrendUpozorenje({ podaci, C }) {
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
function KorelacijaGreskaMasina({ rawData, C }) {
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
function PrioritizacijaDelova({ C, addToast }) {
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
          .select("id_deo,naziv_dela,ok_kolicina,nok_kolicina,ukupno_merenja,datum")
          .gte("datum", od.toISOString().split("T")[0]);

        const mapa = {};
        (data||[]).forEach(r=>{
          if(!mapa[r.id_deo]) mapa[r.id_deo]={id_deo:r.id_deo,naziv:r.naziv_dela,
            ok:0,nok:0,n:0,dani:new Set()};
          mapa[r.id_deo].ok  +=r.ok_kolicina||0;
          mapa[r.id_deo].nok +=r.nok_kolicina||0;
          mapa[r.id_deo].n   +=r.ukupno_merenja||0;
          mapa[r.id_deo].dani.add(r.datum);
        });

        const arr = Object.values(mapa).map(d=>{
          const rty = d.n>0?(d.ok/d.n)*100:100;
          const p   = d.n>0?(d.nok/d.n)*100:0;
          const dpmo= d.n>0?Math.round((d.nok/d.n)*1e6):0;
          // Skor prioriteta: viši = hitnije (0-100)
          const skor = Math.min(100, p*5 + (dpmo/10000)*2 + (rty<80?30:rty<90?15:0));
          return { ...d, rty:rty.toFixed(1), p:p.toFixed(2), dpmo, skor:Math.round(skor),
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
                <span style={{color:C.sivi}}>RTY: <strong style={{color:
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

// ─── IZVEŠTAJ SMENE PDF ───────────────────────────────────────
async function generisiIzvestajSmene(korisnik, smena, C) {
  const danas = new Date().toISOString().split("T")[0];
  
  // Učitaj podatke smene
  const { data } = await supabase.from("kontrolni_log")
    .select("*").eq("datum",danas).eq("smena",smena)
    .order("created_at",{ascending:true});

  if (!data?.length) { alert("Nema podataka za ovu smenu danas."); return; }

  const n   = data.reduce((s,r)=>s+(r.ukupno_merenja||0),0);
  const nok = data.reduce((s,r)=>s+(r.nok_kolicina||0),0);
  const ok  = data.reduce((s,r)=>s+(r.ok_kolicina||0),0);
  const rty = n>0?((ok/n)*100).toFixed(2):0;
  const dpmo= n>0?Math.round((nok/n)*1e6):0;

  // Pareto
  const gB={};
  data.forEach(r=>{if(r.greska_naziv&&r.greska_naziv!=="OK")
    gB[r.greska_naziv]=(gB[r.greska_naziv]||0)+(r.nok_kolicina||0);});
  const topGreske=Object.entries(gB).sort((a,b)=>b[1]-a[1]).slice(0,5);

  let kpiAgg = null;
  try {
    const kpiRows = await fetchKpiUnos(supabase, {
      modul: "atributivne",
      datum: danas,
      smena,
    });
    kpiAgg = agregirajKpiUnos(kpiRows);
  } catch { /* */ }

  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
  const W = pdf.internal.pageSize.getWidth();

  // Header
  pdf.setFillColor(28,35,51);
  pdf.rect(0,0,W,40,`F`);
  pdf.setTextColor(88,166,255);
  pdf.setFontSize(18); pdf.setFont("helvetica","bold");
  pdf.text("SPC KONTROLA KVALITETA", 14,15);
  pdf.setTextColor(200,210,230);
  pdf.setFontSize(11); pdf.setFont("helvetica","normal");
  pdf.text(`IZVEŠTAJ SMENE ${smena} · ${danas}`, 14,25);
  pdf.text(`Generisao: ${korisnik.ime}`, 14,33);

  // KPI
  pdf.setTextColor(30,32,36);
  let y=55;
  pdf.setFontSize(13); pdf.setFont("helvetica","bold");
  pdf.text("STATISTIKE SMENE",14,y); y+=8;

  const kpi=[
    ["Ukupno mereno",n,""],
    ["OK komada",ok,""],
    ["NOK komada",nok,""],
    ["RTY %",rty,"%"],
    ["DPMO",dpmo.toLocaleString(),""],
  ];

  kpi.forEach(([naziv,vrednost,suf],i)=>{
    const x = 14 + (i%3)*62;
    const yy = y + Math.floor(i/3)*22;
    pdf.setFillColor(240,244,248);
    pdf.rect(x,yy,58,18,`F`);
    pdf.setFontSize(8); pdf.setFont("helvetica","normal");
    pdf.setTextColor(100,110,120);
    pdf.text(naziv,x+4,yy+7);
    pdf.setFontSize(14); pdf.setFont("helvetica","bold");
    pdf.setTextColor(30,32,36);
    pdf.text(`${vrednost}${suf}`,x+4,yy+15);
  });
  y+=50;

  if (kpiAgg) {
    y = dodajKpiBlokPdf(pdf, y, kpiAgg);
  }

  // Top greške
  if (topGreske.length) {
    pdf.setFontSize(13); pdf.setFont("helvetica","bold");
    pdf.setTextColor(30,32,36);
    pdf.text("TOP GREŠKE",14,y); y+=8;
    topGreske.forEach(([naziv,count],i)=>{
      pdf.setFontSize(10); pdf.setFont("helvetica","normal");
      pdf.setTextColor(60,70,80);
      pdf.text(`${i+1}. ${naziv}`,14,y);
      pdf.text(`${count} kom`,150,y);
      const maxW = 80;
      const bar = Math.min((count/topGreske[0][1])*maxW, maxW);
      pdf.setFillColor(88,166,255);
      pdf.rect(80,y-4,bar,5,`F`);
      y+=8;
    });
  }

  // Tabela unosa
  y+=5;
  pdf.setFontSize(13); pdf.setFont("helvetica","bold");
  pdf.setTextColor(30,32,36);
  pdf.text("UNOSI SMENE",14,y); y+=8;

  pdf.setFontSize(8); pdf.setFont("helvetica","bold");
  pdf.setTextColor(100,110,120);
  ["ID DELA","NAZIV","GREŠKA","STATUS","NOK"].forEach((h,i)=>{
    pdf.text(h, [14,40,90,140,170][i], y);
  });
  y+=5;
  pdf.setDrawColor(200,210,220);
  pdf.line(14,y,195,y); y+=3;

  pdf.setFont("helvetica","normal"); pdf.setTextColor(30,32,36);
  data.slice(0,25).forEach(r=>{
    if (y>270) { pdf.addPage(); y=20; }
    pdf.text((r.id_deo||"").substring(0,10),14,y);
    pdf.text((r.naziv_dela||"").substring(0,18),40,y);
    pdf.text((r.greska_naziv||"").substring(0,18),90,y);
    r.status==="NOK"
      ? pdf.setTextColor(207,34,46)
      : pdf.setTextColor(26,127,55);
    pdf.text(r.status||"",140,y);
    pdf.setTextColor(30,32,36);
    pdf.text(String(r.nok_kolicina||0),170,y);
    y+=6;
  });

  pdf.save(`Izvestaj_Smena${smena}_${danas}.pdf`);
}

// ============================================================
// v9 FINALNA VERZIJA — sve funkcionalnosti atributivnih
// ============================================================

// ─── PWA SERVICE WORKER REGISTRACIJA ─────────────────────────
// Pozovi jednom u App() useEffect
function registrujPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }
  // Vibration API za NOK feedback
  if ('vibrate' in navigator) {
    window._vibrirajNOK = () => navigator.vibrate([100,50,100]);
    window._vibrirajOK  = () => navigator.vibrate([50]);
  }
}

// ─── AQL ACCEPTANCE SAMPLING ────────────────────────────────
function AQLTabela({ C }) {
  const [velicina, setVelicina] = useState(() => ucitajAqlLotVelicina());
  const promeniVelicinu = (n) => setVelicina(snimiAqlLotVelicina(n));
  const [podesavanja, setPodesavanja] = useState(() => ucitajAqlPodesavanja());
  const { nivo, tipInspekcije, aqlPoKlasi } = podesavanja;

  const azurirajPodesavanja = useCallback((patch) => {
    setPodesavanja((prev) => snimiAqlPodesavanja({ ...prev, ...patch }));
  }, []);
  const [nokPoKlasi, setNokPoKlasi] = useState(() =>
    Object.fromEntries(DEFECT_KLASE.map(k => [k.id, 0]))
  );

  const uzorak = planUzorka(velicina, nivo);
  const { slovo } = uzorak;

  const planovi = useMemo(() =>
    DEFECT_KLASE.map(k => {
      const plan = planZaKlasu(velicina, nivo, aqlPoKlasi[k.id], tipInspekcije);
      const nok = nokPoKlasi[k.id];
      return {
        ...k,
        plan,
        nok,
        odluka: aqlOdluka(nok, plan.ac, plan.re, plan.fullInspection, tipInspekcije === "Smanjena"),
      };
    }),
  [velicina, nivo, tipInspekcije, aqlPoKlasi, nokPoKlasi]);

  const refN = Math.max(...planovi.map(p => p.plan.n || 0), uzorak.n);

  const odlukeMap = Object.fromEntries(planovi.map(p => [p.id, p.odluka]));
  const konacna = kombinovanaOdluka(odlukeMap);
  const bojaKonacna = konacna.boja === "zelena" ? C.zelena : konacna.boja === "crvena" ? C.crvena : konacna.boja === "zuta" ? C.zuta : C.sivi;

  const bojaKlase = { critical: C.crvena, major: C.narandzasta, minor: C.plava };

  const INP_S = { background:C.input, border:`1px solid ${C.border}`, borderRadius:8,
    color:C.tekst, fontSize:13, padding:"10px 12px", outline:"none", fontFamily:"inherit",
    width:"100%", boxSizing:"border-box" };

  const setNok = (id, v, maxN) => setNokPoKlasi(p => ({ ...p, [id]: Math.max(0, Math.min(maxN, v)) }));
  const setAql = (id, v) => azurirajPodesavanja({
    aqlPoKlasi: { ...aqlPoKlasi, [id]: v },
  });

  return (
    <div style={{ padding:18, maxWidth:820, margin:"0 auto" }}>
      <div style={{ color:C.sivi, fontSize:10, letterSpacing:1.5, marginBottom:8 }}>
        AQL KALKULATOR — ANSI/ASQ Z1.4
      </div>
      <div style={{ color:C.tekst, fontSize:13, marginBottom:14, lineHeight:1.65 }}>
        Isti kalkulator kao Excel workbook AQL_Kalkulator.xlsm — Table I, II-A/II-B, strelice, Critical AQL&nbsp;0 = 100% inspekcija.
      </div>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
        marginBottom: 16,
        padding: "12px 14px",
        background: `${C.plava}12`,
        border: `1px solid ${C.plava}35`,
        borderRadius: 10,
      }}>
        <div style={{ flex: 1, minWidth: 200, fontSize: 11, color: C.sivi, lineHeight: 1.5 }}>
          <strong style={{ color: C.tekst }}>Ručni proračun</strong> — nezavisno od ID dela i RN.
          Na unosu lot dolazi iz naloga; ovde lot i NOK unosite sami za „what-if“ analizu.
        </div>
        <button
          type="button"
          onClick={() => {
            promeniVelicinu(DEFAULT_AQL_LOT_SIZE);
            setNokPoKlasi(Object.fromEntries(DEFECT_KLASE.map((k) => [k.id, 0])));
          }}
          style={{
            background: C.plava,
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            padding: "10px 16px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          🧮 Novi ručni proračun
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:20 }}>
        <div>
          <div style={{ color:C.sivi, fontSize:9, letterSpacing:1.5, marginBottom:6 }}>VELIČINA LOTA</div>
          <input type="number" value={velicina} min={2}
            onChange={e => promeniVelicinu(e.target.value)} style={INP_S}/>
        </div>
        <div>
          <div style={{ color:C.sivi, fontSize:9, letterSpacing:1.5, marginBottom:6 }}>NIVO INSPEKCIJE</div>
          <select value={nivo} onChange={e => azurirajPodesavanja({ nivo: e.target.value })} style={{ ...INP_S, cursor:"pointer" }}>
            <optgroup label="Opšti nivoi">
              {INSPECTION_LEVELS.filter(l => l.grupa === "general").map(l =>
                <option key={l.id} value={l.id}>{l.label}</option>)}
            </optgroup>
            <optgroup label="Specijalni nivoi">
              {INSPECTION_LEVELS.filter(l => l.grupa === "special").map(l =>
                <option key={l.id} value={l.id}>{l.label}</option>)}
            </optgroup>
          </select>
        </div>
        <div>
          <div style={{ color:C.sivi, fontSize:9, letterSpacing:1.5, marginBottom:6 }}>TIP INSPEKCIJE</div>
          <select value={tipInspekcije} onChange={e => azurirajPodesavanja({ tipInspekcije: e.target.value })}
            style={{ ...INP_S, cursor:"pointer" }}>
            {INSPECTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:22 }}>
        {[
          ["KOD (Table I)", slovo, C.plava],
          ["REF. n", refN, C.zelena],
          ["NIVO", uzorak.nivoGrupa === "special" ? "Specijalan" : "Opšti", C.ljubicasta],
        ].map(([lbl, val, boja]) => (
          <div key={lbl} style={{ background:C.panel, border:`1px solid ${boja}35`, borderRadius:10,
            padding:"14px 10px", textAlign:"center" }}>
            <div style={{ color:C.sivi, fontSize:8, letterSpacing:1.2, marginBottom:5 }}>{lbl}</div>
            <div style={{ color:boja, fontSize:24, fontWeight:700 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Critical / Major / Minor */}
      <div style={{ color:C.sivi, fontSize:10, letterSpacing:1.3, marginBottom:10 }}>
        KLASE DEFEKATA — različiti AQL; n može varirati (Table II strelice)
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
        {planovi.map(p => {
          const boja = bojaKlase[p.id];
          const od = p.odluka;
          const odBoja = od.boja === "zelena" ? C.zelena : od.boja === "crvena" ? C.crvena : od.boja === "zuta" ? C.zuta : C.sivi;
          const maxN = p.plan.n || refN;
          const acDisp = p.plan.fullInspection ? "100%" : (p.plan.ac >= 0 ? p.plan.ac : "N/A");
          const reDisp = p.plan.fullInspection ? "100%" : (p.plan.re >= 0 ? p.plan.re : "N/A");
          return (
            <div key={p.id} style={{ background:C.panel, border:`1px solid ${boja}40`, borderRadius:12, padding:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                flexWrap:"wrap", gap:10, marginBottom:12 }}>
                <div>
                  <div style={{ color:boja, fontSize:15, fontWeight:700 }}>{p.naziv}</div>
                  <div style={{ color:C.sivi, fontSize:11, marginTop:3 }}>{p.opis}</div>
                  {p.plan.fullInspection && (
                    <div style={{ color:C.crvena, fontSize:11, marginTop:4, fontWeight:600 }}>
                      100% inspekcija — nijedan defekt nije dozvoljen
                    </div>
                  )}
                  {p.plan.msg && !p.plan.fullInspection && (
                    <div style={{ color:C.ljubicasta, fontSize:10, marginTop:4 }}>Strelica: {p.plan.msg}</div>
                  )}
                  {od.napomena && (
                    <div style={{ color:C.narandzasta, fontSize:10, marginTop:4 }}>{od.napomena}</div>
                  )}
                </div>
                <div style={{ background:`${odBoja}20`, border:`1px solid ${odBoja}`, borderRadius:8,
                  padding:"6px 14px", color:odBoja, fontSize:12, fontWeight:700 }}>
                  {od.tekst}
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:10 }}>
                <div>
                  <div style={{ color:C.sivi, fontSize:9, marginBottom:4 }}>AQL %</div>
                  <select value={aqlPoKlasi[p.id]} onChange={e => setAql(p.id, e.target.value)}
                    style={{ ...INP_S, cursor:"pointer", fontSize:12 }}>
                    {p.aqlOpcije.map(a => <option key={a} value={a}>{a === "0" ? "0 (100%)" : `${a}%`}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ color:C.sivi, fontSize:9, marginBottom:4 }}>Kod / n</div>
                  <div style={{ fontSize:14, fontWeight:700, padding:"10px 0" }}>
                    <span style={{ color:C.plava }}>{p.plan.slovo}</span>
                    <span style={{ color:C.sivi, margin:"0 4px" }}>·</span>
                    <span style={{ color:C.zelena }}>{maxN}</span>
                    {velicina > 0 && maxN > 0 && (
                      <span style={{ color:C.sivi, fontSize:10, marginLeft:4 }}>
                        ({((maxN / velicina) * 100).toFixed(2)}%)
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ color:C.sivi, fontSize:9, marginBottom:4 }}>Ac ≤ / Re ≥</div>
                  <div style={{ fontSize:16, fontWeight:700, padding:"10px 0" }}>
                    <span style={{ color:C.zelena }}>{acDisp}</span>
                    <span style={{ color:C.sivi, margin:"0 6px" }}>/</span>
                    <span style={{ color:C.crvena }}>{reDisp}</span>
                  </div>
                </div>
                <div>
                  <div style={{ color:C.sivi, fontSize:9, marginBottom:4 }}>Pronađeno NOK</div>
                  <div style={{ display:"flex", alignItems:"stretch", border:`1px solid ${C.border}`,
                    borderRadius:8, overflow:"hidden", maxWidth:140 }}>
                    <button type="button" onClick={() => setNok(p.id, p.nok - 1, maxN)}
                      style={{ background:C.hover, border:"none", color:C.tekst, fontSize:18,
                        padding:"6px 12px", cursor:"pointer" }}>−</button>
                    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:18, fontWeight:700, background:C.input }}>{p.nok}</div>
                    <button type="button" onClick={() => setNok(p.id, p.nok + 1, maxN)}
                      style={{ background:C.hover, border:"none", color:C.tekst, fontSize:18,
                        padding:"6px 12px", cursor:"pointer" }}>+</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Konačna odluka lota */}
      <div style={{ background:`${bojaKonacna}15`, border:`2px solid ${bojaKonacna}`,
        borderRadius:12, padding:"20px 18px", textAlign:"center", marginBottom:20 }}>
        <div style={{ color:C.sivi, fontSize:10, letterSpacing:1.5, marginBottom:8 }}>KONAČNA ODLUKA LOTA</div>
        <div style={{ color:bojaKonacna, fontSize:26, fontWeight:700, letterSpacing:1 }}>{konacna.tekst}</div>
        <div style={{ color:C.sivi, fontSize:12, marginTop:8, lineHeight:1.5 }}>{konacna.razlog}</div>
        <div style={{ color:C.sivi, fontSize:11, marginTop:10 }}>
          Ukupno NOK: {Object.values(nokPoKlasi).reduce((a, b) => a + b, 0)} · Tip: {tipInspekcije}
        </div>
      </div>

      <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:16, marginBottom:16 }}>
        <div style={{ color:C.tekst, fontSize:12, fontWeight:700, marginBottom:8 }}>PRAVILO (Excel VBA)</div>
        <div style={{ color:C.sivi, fontSize:12, lineHeight:1.85 }}>
          1. Kod slovo iz Table I: <strong style={{ color:C.plava }}>{slovo}</strong> ({uzorak.nivoLabel}).<br/>
          2. Ac/Re iz Table II-A / II-B / II-C (Normalna / Pojačana / Smanjena), sa strelicama ↑↓.<br/>
          3. Smanjena: manji uzorak (n iz II-C, npr. kod L → n=80 umesto 200).<br/>
          4. Critical AQL&nbsp;0 → 100% inspekcija, 0 defekata dozvoljeno.<br/>
          5. Smanjena †: Ac &lt; NOK &lt; Re → prihvati lot, sledeći lot Normalna.<br/>
          6. <span style={{ color:C.zelena }}>PRIHVATI</span> ako NOK ≤ Ac; inače <span style={{ color:C.crvena }}>ODBACI</span>.
        </div>
      </div>

      <div style={{ color:C.sivi, fontSize:10, letterSpacing:1.2, marginBottom:10 }}>
        PREGLED · LOT {velicina.toLocaleString()}
      </div>
      <div style={{ border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"80px 70px 50px 50px 50px 50px 50px",
          background:C.hover, padding:"9px 14px", fontSize:9, color:C.sivi, gap:8 }}>
          <span>Klasa</span><span>AQL</span><span>Kod</span><span>n</span><span>Ac</span><span>Re</span><span>NOK</span>
        </div>
        {planovi.map(p => (
          <div key={p.id} style={{ display:"grid", gridTemplateColumns:"80px 70px 50px 50px 50px 50px 50px",
            padding:"10px 14px", borderTop:`1px solid ${C.border}`, fontSize:12, gap:8, alignItems:"center" }}>
            <span style={{ color:bojaKlase[p.id], fontWeight:700 }}>{p.naziv}</span>
            <span style={{ color:C.tekst }}>{aqlPoKlasi[p.id]}{aqlPoKlasi[p.id] !== "0" ? "%" : ""}</span>
            <span style={{ color:C.plava }}>{p.plan.slovo}</span>
            <span style={{ color:C.zelena }}>{p.plan.n}</span>
            <span style={{ color:C.zelena, fontWeight:700 }}>
              {p.plan.fullInspection ? "100%" : (p.plan.ac >= 0 ? p.plan.ac : "—")}
            </span>
            <span style={{ color:C.crvena, fontWeight:700 }}>
              {p.plan.fullInspection ? "100%" : (p.plan.re >= 0 ? p.plan.re : "—")}
            </span>
            <span style={{ color:C.tekst }}>{p.nok}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ESKALACIJE ───────────────────────────────────────────────
function EskalacijePanel({ korisnik, C, addToast, sviDelovi, onOtvori8D }) {
  const [eskalacije, setEskalacije] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [forma,      setForma]      = useState(null); // null | 'nova' | {id}
  const [radnici,    setRadnici]    = useState([]);
  const [filter,     setFilter]     = useState("sve");

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

  const filtrirane = eskalacije.filter(e=>filter==="sve"||e.status===filter);

  const PRIORITET_BOJA = {kriticno:C.crvena,visok:C.narandzasta,srednji:C.zuta,nizak:C.zelena};
  const STATUS_BOJA    = {otvoren:C.crvena,u_toku:C.zuta,zatvoren:C.zelena};

  if (forma==="nova") return (
    <NovaEskalacija korisnik={korisnik} sviDelovi={sviDelovi} radnici={radnici}
      onSnimi={novaEskalacija} onOtkazati={()=>setForma(null)} C={C}/>
  );

  return (
    <div style={{padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{color:C.tekst,fontSize:14,fontWeight:700,letterSpacing:1}}>ESKALACIJE</div>
        <button onClick={()=>setForma("nova")}
          style={{background:C.crvena,border:"none",borderRadius:8,color:"#fff",
            fontSize:12,fontWeight:700,padding:"9px 16px",cursor:"pointer"}}>
          + Nova eskalacija
        </button>
      </div>

      {/* Filter */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["sve","Sve"],["otvoren","Otvorene"],["u_toku","U toku"],["zatvoren","Zatvorene"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} style={{
            background:filter===v?C.plava:"none",border:`1px solid ${filter===v?C.plava:C.border}`,
            borderRadius:8,color:filter===v?"#fff":C.sivi,fontSize:11,
            padding:"6px 14px",cursor:"pointer"}}>
            {l}
            {v!=="sve"&&<span style={{marginLeft:4,color:filter===v?"rgba(255,255,255,0.7)":C.border}}>
              ({eskalacije.filter(e=>e.status===v).length})
            </span>}
          </button>
        ))}
      </div>

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
                <button onClick={()=>azuriraj(e.id,{status:"u_toku"})}
                  style={{background:C.zuta+"20",border:`1px solid ${C.zuta}40`,borderRadius:7,
                    color:C.zuta,fontSize:11,fontWeight:700,padding:"6px 14px",cursor:"pointer"}}>
                  → Preuzmi
                </button>
              )}
              <button onClick={()=>{
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
              borderRadius:8,color:!form.id_deo||!form.opis?C.sivi:"#fff",
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

// ─── 8D IZVEŠTAJ ─────────────────────────────────────────────
function OsmDIzvestaj({ korisnik, C, addToast, sviDelovi, prefill, onPrefillUsed }) {
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
    setAktivni({
      id_deo: prefill.id_deo || "",
      d2_opis_problema: prefill.opis || prefill.d2_opis_problema || "",
      d3_privremena_akcija: prefill.d3_privremena_akcija || "",
      d5_korektivna: prefill.d5_korektivna || prefill.korektivna_akcija || "",
    });
    onPrefillUsed?.();
  }, [prefill]); // eslint-disable-line

  const sacuvaj = async (form) => {
    const isNew = !form.id;
    const op = isNew
      ? supabase.from("osmd_izvestaji").insert({...form,kreirao_id:korisnik.radnikId})
          .select("*,kreirao:radnici!osmd_izvestaji_kreirao_id_fkey(ime)").single()
      : supabase.from("osmd_izvestaji").update({...form,updated_at:new Date().toISOString()})
          .eq("id",form.id)
          .select("*,kreirao:radnici!osmd_izvestaji_kreirao_id_fkey(ime)").single();
    const { data, error } = await op;
    if (!error) {
      setIzvestaji(p=>isNew?[data,...p]:p.map(i=>i.id===data.id?data:i));
      setAktivni(data);
      addToast(`✓ 8D izveštaj ${isNew?"kreiran":"sačuvan"}`, "uspeh");
    } else addToast(error.message,"greska");
  };

  const exportPDF8D = async (izv) => {
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
    const W = pdf.internal.pageSize.getWidth();
    pdf.setFillColor(28,35,51);
    pdf.rect(0,0,W,30,"F");
    pdf.setTextColor(88,166,255); pdf.setFontSize(16); pdf.setFont("helvetica","bold");
    pdf.text("8D IZVEŠTAJ O PROBLEMU",14,12);
    pdf.setTextColor(200,210,230); pdf.setFontSize(10); pdf.setFont("helvetica","normal");
    pdf.text(`${izv.id_deo} · ${new Date(izv.created_at).toLocaleDateString("sr-RS")}`,14,22);
    let y=40;
    const D_LABELE = ["D1 Tim","D2 Opis problema","D3 Privremena akcija",
      "D4 Uzrok","D5 Korektivna akcija","D6 Implementacija","D7 Prevencija","D8 Zaključak"];
    const D_POLJA  = ["d1_tim","d2_opis_problema","d3_privremena_akcija",
      "d4_uzrok","d5_korektivna","d6_implementacija","d7_prevencija","d8_zakljucak"];
    D_LABELE.forEach((lab,i)=>{
      if(y>260){pdf.addPage();y=20;}
      pdf.setFillColor(240,244,248); pdf.rect(14,y,W-28,6,"F");
      pdf.setFontSize(9); pdf.setFont("helvetica","bold"); pdf.setTextColor(80,100,120);
      pdf.text(lab.toUpperCase(),16,y+4.5);
      y+=8;
      pdf.setFontSize(10); pdf.setFont("helvetica","normal"); pdf.setTextColor(30,32,36);
      const tekst = izv[D_POLJA[i]]||"—";
      const linije = pdf.splitTextToSize(tekst, W-28);
      pdf.text(linije,14,y);
      y += linije.length*5+4;
    });
    pdf.save(`8D_${izv.id_deo}_${new Date(izv.created_at).toISOString().split("T")[0]}.pdf`);
  };

  const POLJA_8D = [
    {key:"d1_tim",           label:"D1 — Tim",                ph:"Navedi članove tima i voditelja..."},
    {key:"d2_opis_problema",  label:"D2 — Opis problema",       ph:"Ko, šta, kada, gde, koliko, trend..."},
    {key:"d3_privremena_akcija",label:"D3 — Privremena akcija", ph:"Šta je urađeno odmah da zaštiti kupca..."},
    {key:"d4_uzrok",          label:"D4 — Uzrok (5×Zašto)",     ph:"Zašto1? → Zašto2? → ... → Koren uzroka..."},
    {key:"d5_korektivna",     label:"D5 — Korektivna akcija",   ph:"Šta će eliminisati uzrok..."},
    {key:"d6_implementacija", label:"D6 — Implementacija",      ph:"Ko, šta, do kada..."},
    {key:"d7_prevencija",     label:"D7 — Prevencija",          ph:"Kako sprečiti sličan problem u budućnosti..."},
    {key:"d8_zakljucak",      label:"D8 — Zaključak i čestitke",ph:"Timski doprinos, napomena..."},
  ];

  if (aktivni !== null) {
    return <Editor8D izvestaj={aktivni} sviDelovi={sviDelovi} polja={POLJA_8D}
      onSacuvaj={sacuvaj} onNazad={()=>setAktivni(null)}
      onPDF={exportPDF8D} C={C}/>;
  }

  return (
    <div style={{padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{color:C.tekst,fontSize:14,fontWeight:700,letterSpacing:1}}>8D IZVEŠTAJI</div>
        <button onClick={()=>setAktivni({})}
          style={{background:C.plava,border:"none",borderRadius:8,color:"#fff",
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
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{color:C.tekst,fontWeight:700,fontSize:13}}>{i.id_deo}</span>
              <span style={{background:i.status==="zavrsен"?`${C.zelena}20`:`${C.zuta}20`,
                color:i.status==="zavrsen"?C.zelena:C.zuta,fontSize:9,
                padding:"2px 8px",borderRadius:10}}>{i.status.replace("_"," ")}</span>
            </div>
            <button onClick={e=>{e.stopPropagation();exportPDF8D(i);}}
              style={{background:"none",border:`1px solid ${C.border}`,borderRadius:5,
                color:C.sivi,fontSize:10,padding:"3px 10px",cursor:"pointer"}}>
              📄 PDF
            </button>
          </div>
          <div style={{color:C.sivi,fontSize:11}}>{i.d2_opis_problema?.substring(0,80)||"—"}</div>
          <div style={{color:C.border,fontSize:10,marginTop:4}}>
            {i.kreirao?.ime} · {new Date(i.created_at).toLocaleDateString("sr-RS")}
          </div>
        </div>
      ))}
    </div>
  );
}

function Editor8D({ izvestaj, sviDelovi, polja, onSacuvaj, onNazad, onPDF, C }) {
  const [form, setForm] = useState({
    id:          izvestaj.id||null,
    id_deo:      izvestaj.id_deo||"",
    naziv_dela:  izvestaj.naziv_dela||"",
    status:      izvestaj.status||"u_izradi",
    d1_tim:               izvestaj.d1_tim||"",
    d2_opis_problema:     izvestaj.d2_opis_problema||"",
    d3_privremena_akcija: izvestaj.d3_privremena_akcija||"",
    d4_uzrok:             izvestaj.d4_uzrok||"",
    d5_korektivna:        izvestaj.d5_korektivna||"",
    d6_implementacija:    izvestaj.d6_implementacija||"",
    d7_prevencija:        izvestaj.d7_prevencija||"",
    d8_zakljucak:         izvestaj.d8_zakljucak||"",
  });

  const INP = {width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:8,
    color:C.tekst,fontSize:13,padding:"10px 12px",boxSizing:"border-box",
    outline:"none",fontFamily:"inherit"};
  const popunjeno = polja.filter(p=>form[p.key]?.trim()).length;

  return (
    <div style={{padding:18,maxWidth:680}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <button onClick={onNazad} style={{background:"none",border:"none",
          color:C.sivi,fontSize:14,cursor:"pointer",padding:0}}>← Nazad</button>
        <div style={{color:C.tekst,fontSize:13,fontWeight:700}}>8D Izveštaj</div>
        <button onClick={()=>onPDF(form)}
          style={{background:"#7c3aed",border:"none",borderRadius:7,color:"#fff",
            fontSize:11,fontWeight:700,padding:"7px 14px",cursor:"pointer"}}>
          📄 PDF
        </button>
      </div>

      {/* ID dela */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>ID DELA</div>
          <select value={form.id_deo} onChange={e=>{
            const d=sviDelovi.find(d=>d.id_deo===e.target.value);
            setForm(p=>({...p,id_deo:e.target.value,naziv_dela:d?.naziv_dela||""}));
          }} style={{...INP,cursor:"pointer"}}>
            <option value="">-- Izaberi --</option>
            {sviDelovi.map(d=><option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>)}
          </select>
        </div>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>STATUS</div>
          <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}
            style={{...INP,cursor:"pointer"}}>
            <option value="u_izradi">U izradi</option>
            <option value="pregled">Na pregledu</option>
            <option value="zavrsen">Završen</option>
          </select>
        </div>
      </div>

      {/* Progres */}
      <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,
        padding:"10px 14px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
        <div style={{flex:1,background:C.hover,borderRadius:3,height:6}}>
          <div style={{background:C.plava,width:`${(popunjeno/8)*100}%`,
            height:6,borderRadius:3,transition:"width 0.3s"}}/>
        </div>
        <span style={{color:C.sivi,fontSize:11}}>{popunjeno}/8 polja</span>
      </div>

      {/* D1-D8 polja */}
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {polja.map((p,i)=>(
          <div key={p.key}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
              <span style={{background:form[p.key]?.trim()?C.zelena:C.hover,
                color:form[p.key]?.trim()?"#fff":C.sivi,
                fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:6,
                minWidth:24,textAlign:"center"}}>{i+1}</span>
              <span style={{color:C.tekst,fontSize:12,fontWeight:600}}>{p.label}</span>
            </div>
            <textarea value={form[p.key]||""} onChange={e=>setForm(pr=>({...pr,[p.key]:e.target.value}))}
              placeholder={p.ph} rows={3}
              style={{...INP,resize:"vertical",minHeight:70}}/>
          </div>
        ))}
      </div>

      <button onClick={()=>onSacuvaj(form)} style={{
        width:"100%",background:C.plava,border:"none",borderRadius:10,color:"#fff",
        fontSize:14,fontWeight:700,padding:"14px",cursor:"pointer",marginTop:16,
        boxShadow:`0 0 16px ${C.plava}40`}}>
        💾 Sačuvaj 8D izveštaj
      </button>
    </div>
  );
}

// ─── FOTO ARHIVA GREŠAKA ─────────────────────────────────────
function FotoArhiva({ C, addToast }) {
  const [podaci,   setPodaci]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("");
  const [uvecana,  setUvecana]  = useState(null);

  useEffect(()=>{
    supabase.from("kontrolni_log")
      .select("id,datum,id_deo,naziv_dela,greska_naziv,podkategorija,komentar,nok_kolicina")
      .eq("status","NOK").not("komentar","is",null).neq("komentar","")
      .order("created_at",{ascending:false}).limit(100)
      .then(({data})=>{ setPodaci(data||[]); setLoading(false); });
  },[]);

  // Za slike iz Supabase Storage — za sada prikazujemo komentare kao katalog
  const filtrirani = filter
    ? podaci.filter(p=>p.greska_naziv?.toLowerCase().includes(filter.toLowerCase())
        || p.id_deo?.toLowerCase().includes(filter.toLowerCase()))
    : podaci;

  const greske = [...new Set(podaci.map(p=>p.greska_naziv).filter(Boolean))];

  return (
    <div style={{padding:18}}>
      {uvecana&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",
          zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
          onClick={()=>setUvecana(null)}>
          <div style={{background:C.panel,borderRadius:12,padding:20,maxWidth:500,width:"100%"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
              <span style={{color:C.crvena,fontWeight:700,fontSize:14}}>{uvecana.greska_naziv}</span>
              <button onClick={()=>setUvecana(null)} style={{background:"none",border:"none",
                color:C.sivi,fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            {[["ID dela",uvecana.id_deo],["Naziv",uvecana.naziv_dela],
              ["Greška",uvecana.greska_naziv],["Podkat.",uvecana.podkategorija],
              ["Datum",uvecana.datum],["Količina",uvecana.nok_kolicina],
            ].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",
                fontSize:12,marginBottom:6}}>
                <span style={{color:C.sivi}}>{l}</span>
                <span style={{color:C.tekst,fontWeight:500}}>{v}</span>
              </div>
            ))}
            {uvecana.komentar&&(
              <div style={{background:C.zuta+"15",border:`1px solid ${C.zuta}30`,
                borderRadius:8,padding:"10px 12px",marginTop:10,color:C.tekst,fontSize:12}}>
                💬 {uvecana.komentar}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:14}}>
        FOTO ARHIVA GREŠAKA — NOK sa komentarima
      </div>

      {/* Filter */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <input value={filter} onChange={e=>setFilter(e.target.value)}
          placeholder="Pretraži po grešci ili ID dela..."
          style={{flex:1,background:C.input,border:`1px solid ${C.border}`,borderRadius:8,
            color:C.tekst,fontSize:12,padding:"9px 12px",outline:"none",fontFamily:"inherit",
            minWidth:200}}/>
        {filter&&<button onClick={()=>setFilter("")}
          style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,
            color:C.sivi,fontSize:12,padding:"9px 12px",cursor:"pointer"}}>✕</button>}
      </div>

      {/* Kategorije */}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        <button onClick={()=>setFilter("")}
          style={{background:!filter?C.plava:"none",border:`1px solid ${!filter?C.plava:C.border}`,
            borderRadius:20,color:!filter?"#fff":C.sivi,fontSize:11,padding:"5px 14px",cursor:"pointer"}}>
          Sve ({podaci.length})
        </button>
        {greske.slice(0,6).map(g=>(
          <button key={g} onClick={()=>setFilter(g)}
            style={{background:filter===g?C.crvena:"none",border:`1px solid ${filter===g?C.crvena:C.border}`,
              borderRadius:20,color:filter===g?"#fff":C.sivi,fontSize:11,
              padding:"5px 14px",cursor:"pointer"}}>
            {g}
          </button>
        ))}
      </div>

      {loading?<div style={{color:C.sivi,fontSize:12,textAlign:"center",padding:40}}>Učitavanje...</div>
       :!filtrirani.length?(
        <div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>
          {filter?"Nema rezultata za pretragu":"Nema NOK unosa sa komentarima"}
        </div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
          {filtrirani.map(p=>(
            <div key={p.id} onClick={()=>setUvecana(p)}
              style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:10,
                padding:14,cursor:"pointer",transition:"border-color 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor=C.crvena}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
              <div style={{background:`${C.crvena}15`,borderRadius:8,height:80,
                display:"flex",alignItems:"center",justifyContent:"center",
                marginBottom:10,fontSize:32}}>
                ⚠
              </div>
              <div style={{color:C.crvena,fontWeight:700,fontSize:12,marginBottom:4}}>
                {p.greska_naziv}
              </div>
              <div style={{color:C.sivi,fontSize:10,marginBottom:4}}>{p.id_deo}</div>
              <div style={{color:C.border,fontSize:9}}>{p.datum} · ×{p.nok_kolicina}</div>
              {p.komentar&&(
                <div style={{color:C.zuta,fontSize:10,marginTop:6,
                  overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  💬 {p.komentar}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// v10: Kalibracija merila, Ciljevi kvaliteta,
//      Radni nalozi, Izveštaj za kupca, Export Excel,
//      OC kriva, Stabilnost procesa
// ============================================================

// ─── KALIBRACIJA MERILA ───────────────────────────────────────
function KalibracijaMerila({ korisnik, C, addToast }) {
  const [merila,    setMerila]    = useState([]);
  const [forma,     setForma]     = useState(null); // null|'novo_merilo'|{merilo}
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState("sva"); // sva|uskoro|istekla
  const DANA_UPOZORENJE = 30;

  useEffect(() => { ucitaj(); }, []);

  const ucitaj = async () => {
    const { data } = await supabase.from("merila")
      .select("*,kalibracije(datum_kal,sledeca_kal,rezultat,sertifikat_br,napomena)")
      .eq("aktivno", true).order("naziv");
    setMerila(data || []); setLoading(false);
  };

  const getDani = (sledeca) => {
    if (!sledeca) return null;
    return Math.ceil((new Date(sledeca) - new Date()) / 86400000);
  };

  const getStatus = (m) => {
    const kal = m.kalibracije?.sort((a,b) => new Date(b.datum_kal)-new Date(a.datum_kal))[0];
    if (!kal) return { label:"NIJE KALIBRISANO", boja:C.crvena, dani:null };
    const dani = getDani(kal.sledeca_kal);
    if (dani === null) return { label:"NEMA DATUMA", boja:C.sivi, dani:null };
    if (dani < 0)   return { label:`ISTEKLO ${Math.abs(dani)}d`, boja:C.crvena, dani };
    if (dani < DANA_UPOZORENJE) return { label:`USKORO ${dani}d`, boja:C.zuta, dani };
    return { label:`OK ${dani}d`, boja:C.zelena, dani };
  };

  const filtrirani = merila.filter(m => {
    const s = getStatus(m);
    if (filter === "istekla") return s.dani !== null && s.dani < 0;
    if (filter === "uskoro")  return s.dani !== null && s.dani >= 0 && s.dani < DANA_UPOZORENJE;
    return true;
  });

  const dodajMerilo = async (form) => {
    const { data, error } = await supabase.from("merila").insert(form)
      .select("*,kalibracije(datum_kal,sledeca_kal,rezultat)").single();
    if (!error) { setMerila(p => [data, ...p]); setForma(null); addToast("✓ Merilo dodato", "uspeh"); }
    else addToast(error.message, "greska");
  };

  const dodajKalibraciju = async (merilo_id, form) => {
    const { error } = await supabase.from("kalibracije").insert({ ...form, merilo_id });
    if (!error) { addToast("✓ Kalibracija evidentirana", "uspeh"); ucitaj(); setForma(null); }
    else addToast(error.message, "greska");
  };

  const isteklo  = merila.filter(m => getStatus(m).dani !== null && getStatus(m).dani < 0).length;
  const uskoro   = merila.filter(m => { const d = getStatus(m).dani; return d !== null && d >= 0 && d < DANA_UPOZORENJE; }).length;

  const INP = { width:"100%", background:C.input, border:`1px solid ${C.border}`, borderRadius:8,
    color:C.tekst, fontSize:13, padding:"10px 12px", boxSizing:"border-box",
    outline:"none", fontFamily:"inherit" };

  if (forma === "novo_merilo") return (
    <div style={{padding:18, maxWidth:520}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <button onClick={()=>setForma(null)} style={{background:"none",border:"none",color:C.sivi,fontSize:14,cursor:"pointer"}}>←</button>
        <span style={{color:C.tekst,fontSize:14,fontWeight:700}}>Novo merilo</span>
      </div>
      <NovoMeriloForma onSnimi={dodajMerilo} onOtkazati={()=>setForma(null)} C={C} INP={INP}/>
    </div>
  );

  if (forma?.tip === "kalibracija") return (
    <div style={{padding:18, maxWidth:520}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <button onClick={()=>setForma(null)} style={{background:"none",border:"none",color:C.sivi,fontSize:14,cursor:"pointer"}}>←</button>
        <span style={{color:C.tekst,fontSize:14,fontWeight:700}}>Nova kalibracija — {forma.merilo.naziv}</span>
      </div>
      <NovaKalibracijaForma onSnimi={(f)=>dodajKalibraciju(forma.merilo.id,f)}
        onOtkazati={()=>setForma(null)} C={C} INP={INP}/>
    </div>
  );

  return (
    <div style={{padding:18}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{color:C.tekst,fontSize:14,fontWeight:700,letterSpacing:1}}>
          KALIBRACIJA MERILA
          {isteklo>0 && <span style={{background:C.crvena,color:"#fff",fontSize:10,
            borderRadius:10,padding:"1px 7px",marginLeft:8}}>{isteklo} isteklo</span>}
          {uskoro>0  && <span style={{background:C.zuta,color:"#000",fontSize:10,
            borderRadius:10,padding:"1px 7px",marginLeft:6}}>{uskoro} uskoro</span>}
        </div>
        <button onClick={()=>setForma("novo_merilo")}
          style={{background:C.plava,border:"none",borderRadius:8,color:"#fff",
            fontSize:12,fontWeight:700,padding:"9px 16px",cursor:"pointer"}}>
          + Novo merilo
        </button>
      </div>

      {/* Filter */}
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        {[["sva","Sva"],["uskoro",`Uskoro (${uskoro})`],["istekla",`Istekla (${isteklo})`]].map(([v,l])=>(
          <button key={v} onClick={()=>setFilter(v)} style={{
            background:filter===v?C.plava:"none", border:`1px solid ${filter===v?C.plava:C.border}`,
            borderRadius:8, color:filter===v?"#fff":C.sivi, fontSize:11,
            padding:"6px 14px", cursor:"pointer"}}>
            {l}
          </button>
        ))}
      </div>

      {loading ? <div style={{color:C.sivi,fontSize:12,padding:20}}>Učitavanje...</div>
       : !filtrirani.length ? (
        <div style={{color:C.border,fontSize:12,textAlign:"center",padding:40}}>
          {filter==="sva" ? "Nema merila — dodaj prvo merilo" : "Nema merila u ovom filteru"}
        </div>
      ) : filtrirani.map(m => {
        const stat = getStatus(m);
        const posKal = m.kalibracije?.sort((a,b)=>new Date(b.datum_kal)-new Date(a.datum_kal))[0];
        return (
          <div key={m.id} style={{background:C.panel, border:`1px solid ${stat.boja}30`,
            borderRadius:12, padding:16, marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{color:C.tekst,fontWeight:700,fontSize:14}}>📏 {m.naziv}</span>
                  {m.serijski_broj && <span style={{color:C.border,fontSize:11}}>S/N: {m.serijski_broj}</span>}
                </div>
                <div style={{display:"flex",gap:12,fontSize:11,color:C.sivi}}>
                  {m.tip && <span>{m.tip}</span>}
                  {m.lokacija && <span>📍 {m.lokacija}</span>}
                  {m.opseg_min!=null && <span>Opseg: {m.opseg_min}–{m.opseg_max} {m.jedinica}</span>}
                </div>
              </div>
              <span style={{background:`${stat.boja}20`,color:stat.boja,fontSize:10,fontWeight:700,
                padding:"4px 10px",borderRadius:10,letterSpacing:0.5,flexShrink:0}}>
                {stat.label}
              </span>
            </div>
            {posKal && (
              <div style={{display:"flex",gap:16,fontSize:11,color:C.sivi,marginBottom:10}}>
                <span>Posl. kal: <strong style={{color:C.tekst}}>{posKal.datum_kal}</strong></span>
                <span>Sledeća: <strong style={{color:stat.boja}}>{posKal.sledeca_kal}</strong></span>
                {posKal.sertifikat_br && <span>Cert: {posKal.sertifikat_br}</span>}
              </div>
            )}
            <button onClick={()=>setForma({tip:"kalibracija",merilo:m})}
              style={{background:`${C.zelena}20`,border:`1px solid ${C.zelena}40`,borderRadius:7,
                color:C.zelena,fontSize:11,fontWeight:700,padding:"6px 14px",cursor:"pointer"}}>
              + Evidentiraj kalibraciju
            </button>
          </div>
        );
      })}
    </div>
  );
}

function NovoMeriloForma({ onSnimi, onOtkazati, C, INP }) {
  const [f,setF] = useState({naziv:"",serijski_broj:"",tip:"",opseg_min:"",opseg_max:"",jedinica:"mm",lokacija:""});
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {[["NAZIV MERILA","naziv","text","npr. Mikrometar 0-25mm"],
        ["SERIJSKI BROJ","serijski_broj","text",""],
        ["TIP","tip","text","Mikrometar, Čigra, Pomično..."],
        ["LOKACIJA","lokacija","text","Linija 1, Skladište..."]
      ].map(([l,k,t,ph])=>(
        <div key={k}>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>{l}</div>
          <input type={t} value={f[k]} onChange={e=>setF(p=>({...p,[k]:e.target.value}))}
            placeholder={ph} style={INP}/>
        </div>
      ))}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 80px",gap:10}}>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>OPSEG MIN</div>
          <input type="number" value={f.opseg_min} onChange={e=>setF(p=>({...p,opseg_min:e.target.value}))} style={INP}/>
        </div>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>OPSEG MAX</div>
          <input type="number" value={f.opseg_max} onChange={e=>setF(p=>({...p,opseg_max:e.target.value}))} style={INP}/>
        </div>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>JEDINICA</div>
          <input value={f.jedinica} onChange={e=>setF(p=>({...p,jedinica:e.target.value}))} style={INP}/>
        </div>
      </div>
      <div style={{display:"flex",gap:10,marginTop:4}}>
        <button onClick={()=>onSnimi(f)} disabled={!f.naziv}
          style={{flex:1,background:f.naziv?C.zelena:C.hover,border:"none",borderRadius:8,
            color:f.naziv?"#fff":C.sivi,fontSize:13,fontWeight:700,padding:"12px",cursor:"pointer"}}>
          Snimi merilo
        </button>
        <button onClick={onOtkazati} style={{background:"none",border:`1px solid ${C.border}`,
          borderRadius:8,color:C.sivi,fontSize:13,padding:"12px 16px",cursor:"pointer"}}>Otkaži</button>
      </div>
    </div>
  );
}

function NovaKalibracijaForma({ onSnimi, onOtkazati, C, INP }) {
  const danas = new Date().toISOString().split("T")[0];
  const za12m = new Date(); za12m.setFullYear(za12m.getFullYear()+1);
  const [f,setF] = useState({datum_kal:danas, sledeca_kal:za12m.toISOString().split("T")[0],
    izvrsio:"", sertifikat_br:"", rezultat:"prolaz", napomena:""});
  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>DATUM KALIBRACIJE</div>
          <input type="date" value={f.datum_kal} onChange={e=>setF(p=>({...p,datum_kal:e.target.value}))} style={INP}/>
        </div>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>SLEDEĆA KALIBRACIJA</div>
          <input type="date" value={f.sledeca_kal} onChange={e=>setF(p=>({...p,sledeca_kal:e.target.value}))} style={INP}/>
        </div>
      </div>
      {[["IZVRŠIO","izvrsio","Ime laboratorije ili osobe"],
        ["BROJ SERTIFIKATA","sertifikat_br","CAL-2024-001"]
      ].map(([l,k,ph])=>(
        <div key={k}>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>{l}</div>
          <input value={f[k]} onChange={e=>setF(p=>({...p,[k]:e.target.value}))} placeholder={ph} style={INP}/>
        </div>
      ))}
      <div>
        <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>REZULTAT</div>
        <select value={f.rezultat} onChange={e=>setF(p=>({...p,rezultat:e.target.value}))}
          style={{...INP,cursor:"pointer"}}>
          <option value="prolaz">✓ Prolaz</option>
          <option value="uslovni">⚠ Uslovni prolaz</option>
          <option value="pad">✗ Pad</option>
        </select>
      </div>
      <div>
        <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>NAPOMENA</div>
        <textarea value={f.napomena} onChange={e=>setF(p=>({...p,napomena:e.target.value}))}
          rows={2} style={{...INP,resize:"none"}}/>
      </div>
      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>onSnimi(f)}
          style={{flex:1,background:C.zelena,border:"none",borderRadius:8,color:"#fff",
            fontSize:13,fontWeight:700,padding:"12px",cursor:"pointer"}}>
          Evidentiraj
        </button>
        <button onClick={onOtkazati} style={{background:"none",border:`1px solid ${C.border}`,
          borderRadius:8,color:C.sivi,fontSize:13,padding:"12px 16px",cursor:"pointer"}}>Otkaži</button>
      </div>
    </div>
  );
}

// ─── CILJEVI KVALITETA ────────────────────────────────────────
function CiljeviKvaliteta({ C, addToast, sviDelovi }) {
  const [ciljevi,  setCiljevi]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [forma,    setForma]    = useState(false);
  const [aktuelni, setAktuelni] = useState({id_deo:"",rty_cilj:95,dpmo_cilj:50000,p_cilj:5.0,napomena:""});
  const [ostvaren, setOstvaren] = useState({});

  useEffect(()=>{
    Promise.all([
      supabase.from("ciljevi").select("*").order("vazi_od",{ascending:false}),
    ]).then(([c])=>{ setCiljevi(c.data||[]); setLoading(false); });
    // Učitaj ostvareno za sve delove - poslednih 30 dana
    const od = new Date(); od.setDate(od.getDate()-30);
    supabase.from("kontrolni_log")
      .select("id_deo,ok_kolicina,nok_kolicina,ukupno_merenja")
      .gte("datum", od.toISOString().split("T")[0])
      .then(({data})=>{
        const mapa={};
        (data||[]).forEach(r=>{
          if(!mapa[r.id_deo])mapa[r.id_deo]={n:0,nok:0,ok:0};
          mapa[r.id_deo].n  +=r.ukupno_merenja||0;
          mapa[r.id_deo].nok+=r.nok_kolicina||0;
          mapa[r.id_deo].ok +=r.ok_kolicina||0;
        });
        const rez={};
        Object.entries(mapa).forEach(([id,d])=>{
          rez[id]={
            rty:  d.n>0?((d.ok/d.n)*100).toFixed(1):null,
            dpmo: d.n>0?Math.round((d.nok/d.n)*1e6):null,
            p:    d.n>0?((d.nok/d.n)*100).toFixed(2):null,
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

  return (
    <div style={{padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{color:C.tekst,fontSize:14,fontWeight:700,letterSpacing:1}}>CILJEVI KVALITETA</div>
        <button onClick={()=>setForma(true)}
          style={{background:C.zelena,border:"none",borderRadius:8,color:"#fff",
            fontSize:12,fontWeight:700,padding:"9px 16px",cursor:"pointer"}}>
          + Postavi cilj
        </button>
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
              <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>RTY CILJ %</div>
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
                color:aktuelni.id_deo?"#fff":C.sivi,fontSize:13,fontWeight:700,padding:"11px",cursor:"pointer"}}>
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
                ["RTY %", c.rty_cilj+"%", ost.rty, false],
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
function IzvestajKupac({ C, addToast }) {
  const [kupci,   setKupci]   = useState([]);
  const [kupac,   setKupac]   = useState("");
  const [period,  setPeriod]  = useState("30");
  const [podaci,  setPodaci]  = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    supabase.from("kupci").select("id,naziv").eq("aktivan",true)
      .then(({data})=>setKupci(data||[]));
  },[]);

  const ucitaj = async () => {
    if (!kupac) return;
    setLoading(true);
    try {
      const od = new Date(); od.setDate(od.getDate()-Number(period));
      // Nađi naloge za ovog kupca
      const { data: nalozi } = await supabase.from("radni_nalozi")
        .select("id_deo,naziv_dela,broj_naloga,kolicina")
        .eq("kupac",kupac);
      const idDeoList = [...new Set((nalozi||[]).map(n=>n.id_deo))];
      if (!idDeoList.length) { setPodaci({nalozi:[],log:[],stat:{}}); setLoading(false); return; }
      const { data: log } = await supabase.from("kontrolni_log")
        .select("datum,id_deo,naziv_dela,ok_kolicina,nok_kolicina,ukupno_merenja,greska_naziv,status")
        .in("id_deo",idDeoList).gte("datum",od.toISOString().split("T")[0]);
      const n   = (log||[]).reduce((s,r)=>s+(r.ukupno_merenja||0),0);
      const nok = (log||[]).reduce((s,r)=>s+(r.nok_kolicina||0),0);
      const ok  = (log||[]).reduce((s,r)=>s+(r.ok_kolicina||0),0);
      setPodaci({ nalozi:nalozi||[], log:log||[],
        stat:{ n, nok, ok, rty:n>0?((ok/n)*100).toFixed(2):"—",
          dpmo:n>0?Math.round((nok/n)*1e6):"—" } });
    } catch(e){ addToast(e.message,"greska"); }
    finally{ setLoading(false); }
  };

  const exportPDF = async () => {
    if (!podaci) return;
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
    const W = pdf.internal.pageSize.getWidth();
    pdf.setFillColor(28,35,51); pdf.rect(0,0,W,35,"F");
    pdf.setTextColor(88,166,255); pdf.setFontSize(16); pdf.setFont("helvetica","bold");
    pdf.text("IZVEŠTAJ KVALITETA ZA KUPCA",14,14);
    pdf.setTextColor(200,210,230); pdf.setFontSize(11); pdf.setFont("helvetica","normal");
    pdf.text(`Kupac: ${kupac} · Period: ${period} dana · Datum: ${new Date().toLocaleDateString("sr-RS")}`,14,26);
    let y=45;
    pdf.setTextColor(30,32,36); pdf.setFontSize(12); pdf.setFont("helvetica","bold");
    pdf.text("STATISTIKE PERIODA",14,y); y+=8;
    const kpi=[["Mereno",podaci.stat.n,""],["OK",podaci.stat.ok,""],
      ["NOK",podaci.stat.nok,""],["RTY",podaci.stat.rty,"%"],["DPMO",podaci.stat.dpmo,""]];
    kpi.forEach(([n,v,s],i)=>{
      const x=14+(i%4)*46;
      const yy=y+Math.floor(i/4)*22;
      pdf.setFillColor(240,244,248); pdf.rect(x,yy,42,18,"F");
      pdf.setFontSize(8); pdf.setFont("helvetica","normal"); pdf.setTextColor(100,110,120);
      pdf.text(n,x+3,yy+7);
      pdf.setFontSize(13); pdf.setFont("helvetica","bold"); pdf.setTextColor(30,32,36);
      pdf.text(`${v}${s}`,x+3,yy+15);
    });
    pdf.save(`Izvestaj_${kupac}_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const INP_S = {background:C.input,border:`1px solid ${C.border}`,borderRadius:8,
    color:C.tekst,fontSize:13,padding:"10px 12px",outline:"none",fontFamily:"inherit"};

  return (
    <div style={{padding:18}}>
      <div style={{color:C.tekst,fontSize:14,fontWeight:700,letterSpacing:1,marginBottom:16}}>
        IZVEŠTAJ ZA KUPCA
      </div>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div style={{flex:1,minWidth:200}}>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>KUPAC</div>
          <select value={kupac} onChange={e=>setKupac(e.target.value)}
            style={{...INP_S,width:"100%",cursor:"pointer"}}>
            <option value="">-- Izaberi kupca --</option>
            {kupci.map(k=><option key={k.id} value={k.naziv}>{k.naziv}</option>)}
          </select>
        </div>
        <div>
          <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:5}}>PERIOD</div>
          <select value={period} onChange={e=>setPeriod(e.target.value)}
            style={{...INP_S,cursor:"pointer"}}>
            <option value="7">7 dana</option><option value="30">30 dana</option>
            <option value="90">90 dana</option><option value="365">Godišnji</option>
          </select>
        </div>
        <button onClick={ucitaj} disabled={!kupac||loading}
          style={{background:!kupac?C.hover:C.plava,border:"none",borderRadius:8,
            color:!kupac?C.sivi:"#fff",fontSize:12,fontWeight:700,
            padding:"11px 18px",cursor:!kupac?"not-allowed":"pointer"}}>
          {loading?"...":"Generiši"}
        </button>
        {podaci && (
          <button onClick={exportPDF}
            style={{background:"#7c3aed",border:"none",borderRadius:8,color:"#fff",
              fontSize:12,fontWeight:700,padding:"11px 14px",cursor:"pointer"}}>
            📄 PDF
          </button>
        )}
      </div>
      {podaci && (
        <>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))",gap:10,marginBottom:16}}>
            {[["MERENO",podaci.stat.n,C.plava],["OK",podaci.stat.ok,C.zelena],
              ["NOK",podaci.stat.nok,C.crvena],["RTY %",podaci.stat.rty+"%",C.zuta],
              ["DPMO",podaci.stat.dpmo,C.ljubicasta]
            ].map(([n,v,b])=>(
              <div key={n} style={{background:C.panel,border:`1px solid ${b}25`,borderRadius:10,
                padding:"12px",textAlign:"center"}}>
                <div style={{color:C.sivi,fontSize:9,letterSpacing:1,marginBottom:3}}>{n}</div>
                <div style={{color:b,fontSize:20,fontWeight:700}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,marginBottom:10}}>
            RADNI NALOZI ({podaci.nalozi.length})
          </div>
          <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"120px 80px 1fr 80px",
              background:C.hover,padding:"8px 14px",fontSize:9,color:C.sivi,gap:8}}>
              <span>NALOG</span><span>ID DELA</span><span>NAZIV</span><span>KOL.</span>
            </div>
            {podaci.nalozi.map(n=>(
              <div key={n.id} style={{display:"grid",gridTemplateColumns:"120px 80px 1fr 80px",
                padding:"8px 14px",borderTop:`1px solid ${C.border}`,fontSize:11,gap:8}}>
                <span style={{color:C.plava,fontWeight:700}}>{n.broj_naloga}</span>
                <span style={{color:C.tekst}}>{n.id_deo}</span>
                <span style={{color:C.sivi}}>{n.naziv_dela}</span>
                <span style={{color:C.tekst}}>{n.kolicina}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── EXPORT U EXCEL ───────────────────────────────────────────
async function exportExcel(idDeo, datumOd, datumDo, addToast) {
  try {
    const wb = await exportKontrolniLogExcel(supabase, idDeo, datumOd, datumDo);
    if (!wb) { addToast("Nema podataka za export", "greska"); return; }
    downloadWorkbook(wb, `SPC_${idDeo}_${datumOd || "sve"}_${datumDo || ""}.xlsx`);
    addToast("✓ Exportovano u Excel (.xlsx)", "uspeh");
  } catch (e) { addToast(e.message, "greska"); }
}

// ─── OC KRIVA ─────────────────────────────────────────────────
function OCKriva({ C }) {
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
function StabilnostProcesa({ sviDelovi, C, addToast }) {
  const [idDeo,   setIdDeo]   = useState("");
  const [podaci,  setPodaci]  = useState(null);
  const [loading, setLoading] = useState(false);

  const analiziraj = useCallback(async () => {
    if (!idDeo) return; setLoading(true);
    try {
      const { data, error } = await supabase.from("kontrolni_log")
        .select("datum,nok_kolicina,ukupno_merenja")
        .eq("id_deo",idDeo).order("datum",{ascending:true});
      if (error) throw error;
      if (!data?.length) { setPodaci(null); setLoading(false); return; }

      // Grupiši po datumu
      const gr = {};
      data.forEach(r => {
        if (!gr[r.datum]) gr[r.datum] = {datum:r.datum,nok:0,n:0};
        gr[r.datum].nok += r.nok_kolicina||0;
        gr[r.datum].n   += r.ukupno_merenja||0;
      });
      const niz = Object.values(gr).sort((a,b)=>a.datum.localeCompare(b.datum))
        .map(d => ({datum:d.datum,p:d.n>0?(d.nok/d.n)*100:0}));

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
            color:!idDeo?C.sivi:"#fff",fontSize:11,fontWeight:700,
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
