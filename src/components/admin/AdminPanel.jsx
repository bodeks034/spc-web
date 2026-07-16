import { useState, useEffect, useCallback, useRef } from "react";
import {
  mirrorKontrolniLogToExcel,
  exportMasterWorkbook,
  importWorkbookToSupabase,
  previewImport,
  readWorkbookFromFile,
  downloadWorkbook,
  EXCEL_BUCKET,
  KONTROLNI_LOG_FILE,
  IMPORT_SHEETS,
} from "../../lib/excelSync.js";
import { mozeDodatiAktivnogRadnika } from "../../lib/licencaMaxKorisnika.js";
import { supabase } from "../../lib/supabaseClient.js";
import { useEkran } from "../../lib/useEkran.js";
import MerljiveExcelPanel from "../../MerljiveExcelPanel.jsx";
import DefinicijaUputstvo from "../DefinicijaUputstvo.jsx";
import LicencaStatusPanel from "../LicencaStatusPanel.jsx";
import OProgramuPanel from "../OProgramuPanel.jsx";
import AdminLozinkaModal from "../AdminLozinkaModal.jsx";
import OfflineSyncPanel from "../OfflineSyncPanel.jsx";
import ErpMonitoringStrip from "../ErpMonitoringStrip.jsx";
import ErpDiffPanel from "../ErpDiffPanel.jsx";
import StatusServera from "../StatusServera.jsx";
import SchemaStatusPanel from "../SchemaStatusPanel.jsx";
import SpcBaselinePanel from "../SpcBaselinePanel.jsx";
import TrasabilitetPanel from "../TrasabilitetPanel.jsx";
import MeriloBarkodUputstvo from "../MeriloBarkodUputstvo.jsx";
import NotifikacijePodesavanja from "../NotifikacijePodesavanja.jsx";
import AutoPravilaPanel from "../AutoPravilaPanel.jsx";
import AutomatizacijaStatusPanel from "../AutomatizacijaStatusPanel.jsx";
import IsoAuditPanel from "./IsoAuditPanel.jsx";
import AutoPravilaPodesavanja from "../AutoPravilaPodesavanja.jsx";
import AdminKalibracijaPanel from "../AdminKalibracijaPanel.jsx";
import AdminPrekidiPanel from "../AdminPrekidiPanel.jsx";
import AdminSpcAlarmiPanel from "../AdminSpcAlarmiPanel.jsx";
import GoLiveChecklistPanel from "../GoLiveChecklistPanel.jsx";
import ZdravljeSistemaKartica from "../ZdravljeSistemaKartica.jsx";
import { Modal } from "../ui/SpcUi.jsx";

function dISO() { return new Date().toISOString().split("T")[0]; }

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
    background: bg, border: "none", borderRadius: 8, color: C.onAkcent,
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

      <DefinicijaUputstvo C={C} variant="admin" />

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
        1. Pokreni <code>26_master_excel_import_rls.sql</code> u Supabase (RLS za uvoz). Ili <code>06_storage_excel_sync.sql</code> (bucket + dozvole).<br/>
        2. Uredi master Excel lokalno → Admin → Uvezi iz Excela.<br/>
        3. CSV skripta (<code>import-all-docs.mjs</code>) i dalje radi paralelno.
      </div>
    </div>
  );
}

function AdminPanel({ korisnik, licenca, onNazad, C, uGravnojFormi = false }) {
  const [radnici,setRadnici]   = useState([]);
  const [loading,setLoading]   = useState(true);
  const [modal,setModal]       = useState(null);
  const [novoIme,setNovoIme]   = useState("");
  const [noviEmail,setNoviEmail] = useState("");
  const [novaUloga,setNovaUloga] = useState("kontrolor");
  const [lozinkaRadnik,setLozinkaRadnik] = useState(null);
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

  const onSacuvanaLozinka = (data) => {
    setLozinkaRadnik(null);
    if (data.userId) {
      setRadnici(p => p.map(r => r.id === data.radnikId ? { ...r, user_id: data.userId } : r));
    }
    if (data.emailPoslat) {
      setModal({
        poruka: `✓ Reset link poslat na ${data.ime} (${radnici.find(r => r.id === data.radnikId)?.email || "email"}).`,
        tip: "uspeh",
      });
      return;
    }
    setModal({
      poruka: data.relinked
        ? `✓ Lozinka postavljena za ${data.ime}.\nAuth nalog je automatski povezan (email već postojao u Auth).`
        : data.created
        ? `✓ Auth nalog kreiran i lozinka postavljena za ${data.ime}.\nRadnik se može odmah ulogovati.`
        : `✓ Nova lozinka postavljena za ${data.ime}.`,
      tip: "uspeh",
    });
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
    const kvota = await mozeDodatiAktivnogRadnika(supabase, licenca?.max_korisnika);
    if (!kvota.ok) {
      setModal({ poruka: kvota.poruka, tip: "greska" });
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
      poruka: `✓ ${data.ime} dodat (${data.uloga}).\nEmail: ${email}\n\nKlikni „Lozinka“ pored radnika da postaviš lozinku (ili se automatski povezuje pri loginu ako Auth nalog već postoji).`,
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
      {lozinkaRadnik && (
        <AdminLozinkaModal
          radnik={lozinkaRadnik}
          supabase={supabase}
          C={C}
          onClose={() => setLozinkaRadnik(null)}
          onSacuvano={onSacuvanaLozinka}
        />
      )}

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
            STATISTIKA SMENE
          </div>
          <div style={{color:C.sivi,fontSize:11,lineHeight:1.6}}>
            Statistika smene (OK/NOK/Merenja) računa se iz baze po <strong>datumu i smeni</strong> —
            nema lokalnog reset-a. Nova smena = novi datum ili izbor smene u aplikaciji.
          </div>
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
                color: C.onAkcent,fontSize:12,fontWeight:700,padding:"10px 20px",cursor:"pointer"}}>
              + Dodaj
            </button>
            </div>
          </div>
          <div style={{color:C.sivi,fontSize:10,marginTop:8,lineHeight:1.5}}>
            Email mora biti isti u Auth (Authentication → Users) i u tabeli radnici.
            Inženjeri: uloga <strong style={{color:C.tekst}}>kvalitet</strong> ili <strong style={{color:C.tekst}}>sef</strong>.
            <br />
            Deaktivacija ovde ostaje u bazi — Excel/CSV uvoz više ne aktivira radnike automatski (kolona „aktivan“ menja status samo ako piše eksplicitno DA ili NE).
            <br />
            Lozinku menjaš dugmetom <strong style={{ color: C.tekst }}>Lozinka</strong> pored svakog radnika.
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
                  {korisnik.uloga==="admin" && r.email && (
                    <button type="button" onClick={() => setLozinkaRadnik(r)}
                      style={{
                        background: "#0c2d48",
                        border: `1px solid ${C.plava}55`,
                        borderRadius: 6, color: C.plava,
                        fontSize: 9, padding: "4px 8px", cursor: "pointer", fontWeight: 700,
                      }}>
                      Lozinka
                    </button>
                  )}
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

        <ZdravljeSistemaKartica C={C} korisnik={korisnik} />
        <GoLiveChecklistPanel
          C={C}
          addToast={(t, tip) => setModal({ poruka: t, tip: tip || "info" })}
        />
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
        <ErpMonitoringStrip
          C={C}
          addToast={(t, tip) => setModal({ poruka: t, tip: tip || "info" })}
        />
        <ErpDiffPanel C={C} />
        <StatusServera C={C} />
        <AutomatizacijaStatusPanel C={C} />
        <IsoAuditPanel C={C} addToast={(t, tip) => setModal({ poruka: t, tip: tip || "info" })} />
        <SchemaStatusPanel C={C} />
        <SpcBaselinePanel
          C={C}
          korisnik={korisnik}
          modul="atributivne"
          addToast={(t, tip) => setModal({ poruka: t, tip: tip || "info" })}
        />
        <TrasabilitetPanel C={C} addToast={(t, tip) => setModal({ poruka: t, tip: tip || "info" })} modul="atributivne" />
        <MeriloBarkodUputstvo C={C} />
        <AutoPravilaPanel C={C} podrazumevanoOtvoren />
        <AutoPravilaPodesavanja C={C} addToast={(t, tip) => setModal({ poruka: t, tip: tip || "info" })} />
        <NotifikacijePodesavanja C={C} addToast={(t, tip) => setModal({ poruka: t, tip: tip || "info" })} />

        {/* Excel ↔ Supabase — atributivne */}
        <AdminExcelPanel C={C} addToast={(t, tip) => setModal({ poruka: t, tip: tip || "info" })} />

        {/* Excel ↔ Supabase — merljive / varijabilne */}
        <MerljiveExcelPanel C={C} addToast={(t, tip) => setModal({ poruka: t, tip: tip || "info" })} />

        {/* SPC alarmi — blokada linije */}
        <AdminSpcAlarmiPanel korisnik={korisnik} C={C} addToast={(t, tip) => {
          alert(t);
        }} />

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

function AdminStatistike({ C }) {
  const [stat, setStat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [osvezeno, setOsvezeno] = useState(null);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    const danas = new Date().toISOString().split("T")[0];
    try {
      const [
        logRes, delRes, radRes, logDanasRes,
        merRes, merDanasRes, kpiDanasRes,
      ] = await Promise.all([
        supabase.from("kontrolni_log").select("id", { count: "exact", head: true }),
        supabase.from("delovi").select("id", { count: "exact", head: true }),
        supabase.from("radnici").select("id", { count: "exact", head: true }),
        supabase.from("kontrolni_log").select("id", { count: "exact", head: true }).gte("datum", danas),
        supabase.from("merenja_varijabilna").select("id", { count: "exact", head: true }),
        supabase.from("merenja_varijabilna").select("id", { count: "exact", head: true }).gte("datum", danas),
        supabase.from("kpi_unos").select("id", { count: "exact", head: true }).gte("datum", danas),
      ]);

      const ukMer = merRes.count ?? 0;
      const ukLog = logRes.count ?? 0;
      const danasMer = merDanasRes.count ?? 0;
      const danasLog = logDanasRes.count ?? 0;

      setStat({
        ukupnoUnosa: ukLog + ukMer,
        ukupnoDelova: delRes.count ?? 0,
        ukupnoRadnika: radRes.count ?? 0,
        unosaDanas: danasLog + danasMer,
        merljivaDanas: danasMer,
        atributivnoDanas: danasLog,
        kpiDanas: kpiDanasRes.count ?? 0,
      });
      setOsvezeno(new Date());
    } catch (e) {
      console.error("AdminStatistike:", e?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ucitaj();
    const iv = setInterval(ucitaj, 30000);
    const onVis = () => {
      if (document.visibilityState === "visible") ucitaj();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [ucitaj]);

  if (loading && !stat) {
    return <div style={{ color: C.sivi, fontSize: 12 }}>Učitavanje…</div>;
  }

  if (!stat) {
    return (
      <div style={{ color: C.sivi, fontSize: 12 }}>
        Nije moguće učitati statistiku.
        <button type="button" onClick={ucitaj} style={{
          marginLeft: 8, background: C.plava, border: "none", borderRadius: 6,
          color: C.onAkcent, fontSize: 10, padding: "4px 10px", cursor: "pointer",
        }}>Pokušaj ponovo</button>
      </div>
    );
  }

  const vreme = osvezeno
    ? osvezeno.toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: C.sivi, fontSize: 10 }}>Osveženo: {vreme} · auto 30s</span>
        <button type="button" onClick={ucitaj} disabled={loading} style={{
          background: C.plava, border: "none", borderRadius: 6,
          color: C.onAkcent, fontSize: 10, fontWeight: 700, padding: "6px 12px",
          cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "Osvežavam…" : "↻ Osveži"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10 }}>
        {[
          ["UNOSA DANAS", stat.unosaDanas, C.zelena],
          ["MERLJIVA DANAS", stat.merljivaDanas, C.plava],
          ["ATR. DANAS", stat.atributivnoDanas, C.narandzasta],
          ["KPI DANAS", stat.kpiDanas, C.ljubicasta],
          ["UK. UNOSA", stat.ukupnoUnosa, C.plava],
          ["DELOVA", stat.ukupnoDelova, C.narandzasta],
          ["RADNIKA", stat.ukupnoRadnika, C.zuta],
        ].map(([n, v, b]) => (
          <div key={n} style={{
            background: C.bg, border: `1px solid ${b}25`,
            borderRadius: 10, padding: "14px", textAlign: "center",
          }}>
            <div style={{ color: b, fontSize: 24, fontWeight: 700 }}>{v}</div>
            <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2, marginTop: 4 }}>{n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminPanel;
