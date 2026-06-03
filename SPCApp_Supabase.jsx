// ============================================================
// SPC ATRIBUTIVNE — Korak 3: Supabase konekcija
// Zameni SUPABASE_URL i SUPABASE_ANON sa tvojim vrednostima
// ============================================================
import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE KONFIGURACIJA ──────────────────────────────────────────────────
// Nađi ove vrednosti u: Supabase → Settings → API
const SUPABASE_URL  = "https://wzxkcomeurogvfisticq.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eGtjb21ldXJvZ3ZmaXN0aWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzM1MDYsImV4cCI6MjA5NTEwOTUwNn0.Oa17CJOr-Zep2UsG5n8N7kehuoJmHanNYaNy4VriDBk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── HELPER ─────────────────────────────────────────────────────────────────
function danas() {
  return new Date().toISOString().split("T")[0]; // yyyy-mm-dd za Supabase
}
function danasPrikaz() {
  return new Date().toLocaleDateString("sr-RS", {day:"2-digit",month:"2-digit",year:"numeric"});
}

// ─── MODAL ──────────────────────────────────────────────────────────────────
function Modal({ poruka, tip="info", onOK, onOtkazati }) {
  const boja = tip==="uspeh" ? "#238636" : tip==="greska" ? "#f85149" : "#58a6ff";
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
      <div style={{ background:"#161b22", border:`1px solid ${boja}`,
        borderRadius:10, padding:"32px 36px", maxWidth:420, textAlign:"center" }}>
        <div style={{color:boja, fontSize:32, marginBottom:12}}>
          {tip==="uspeh"?"✓":tip==="greska"?"✗":"ℹ"}
        </div>
        <div style={{color:"#f0f6fc", fontSize:14, lineHeight:1.7, marginBottom:24, whiteSpace:"pre-line"}}>{poruka}</div>
        <div style={{display:"flex", gap:10, justifyContent:"center"}}>
          <button onClick={onOK} style={{ background:boja, border:"none", borderRadius:6,
            color:"#fff", fontSize:13, fontWeight:700, padding:"10px 28px", cursor:"pointer" }}>OK</button>
          {onOtkazati && (
            <button onClick={onOtkazati} style={{ background:"#21262d", border:"1px solid #30363d",
              borderRadius:6, color:"#8b949e", fontSize:13, padding:"10px 20px", cursor:"pointer" }}>Otkaži</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN EKRAN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [lozinka, setLozinka]   = useState("");
  const [greska, setGreska]     = useState("");
  const [loading, setLoading]   = useState(false);

  const prijavi = async () => {
    if (!email || !lozinka) { setGreska("Unesite email i lozinku."); return; }
    setLoading(true); setGreska("");
    try {
      // 1. Supabase Auth prijava
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: lozinka });
      if (error) throw error;

      // 2. Uzmi ulogu iz tabele radnici
      const { data: radnik } = await supabase
        .from("radnici")
        .select("ime, uloga")
        .eq("user_id", data.user.id)
        .single();

      onLogin({
        id: data.user.id,
        email: data.user.email,
        ime: radnik?.ime || data.user.email,
        uloga: radnik?.uloga || "kontrolor",
      });
    } catch (err) {
      setGreska(err.message || "Greška pri prijavi.");
    } finally {
      setLoading(false);
    }
  };

  const C = { bg:"#0d1117", panel:"#161b22", border:"#30363d", plava:"#58a6ff",
    tekst:"#f0f6fc", sivi:"#8b949e" };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex",
      alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Mono', monospace" }}>
      <div style={{ background:C.panel, border:`1px solid ${C.border}`,
        borderRadius:12, padding:"48px 40px", width:360, textAlign:"center" }}>
        <div style={{fontSize:36, marginBottom:8}}>⚙️</div>
        <div style={{color:C.plava, fontSize:22, fontWeight:700, letterSpacing:2, marginBottom:4}}>SPC KONTROLA</div>
        <div style={{color:C.sivi, fontSize:11, marginBottom:32, letterSpacing:1}}>ATRIBUTIVNE KARTE · SUPABASE</div>

        <div style={{textAlign:"left", marginBottom:14}}>
          <label style={{color:C.sivi, fontSize:10, letterSpacing:1.5, display:"block", marginBottom:5}}>EMAIL</label>
          <input value={email} onChange={e=>setEmail(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&prijavi()}
            type="email" placeholder="kontrolor@fabrika.com"
            style={{ width:"100%", background:"#0d1117", border:`1px solid ${C.border}`,
              borderRadius:6, color:C.tekst, fontSize:13, padding:"10px 12px",
              boxSizing:"border-box", outline:"none", fontFamily:"inherit" }} />
        </div>

        <div style={{textAlign:"left", marginBottom:8}}>
          <label style={{color:C.sivi, fontSize:10, letterSpacing:1.5, display:"block", marginBottom:5}}>LOZINKA</label>
          <input value={lozinka} onChange={e=>setLozinka(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&prijavi()}
            type="password" placeholder="••••••••"
            style={{ width:"100%", background:"#0d1117", border:`1px solid ${C.border}`,
              borderRadius:6, color:C.tekst, fontSize:13, padding:"10px 12px",
              boxSizing:"border-box", outline:"none", fontFamily:"inherit" }} />
        </div>

        {greska && <div style={{color:"#f85149", fontSize:12, marginBottom:8, textAlign:"left"}}>{greska}</div>}

        <button onClick={prijavi} disabled={loading} style={{
          width:"100%", background: loading ? "#21262d" : "#238636",
          border:"none", borderRadius:6, color:"#fff", fontSize:14,
          fontWeight:700, padding:"12px", cursor: loading?"not-allowed":"pointer",
          letterSpacing:1, marginTop:12,
        }}>{loading ? "Prijavljivanje..." : "PRIJAVA"}</button>

        <div style={{color:"#484f58", fontSize:11, marginTop:20, lineHeight:1.6}}>
          Korisnici se kreiraju u Supabase<br/>Auth → Users → Invite user
        </div>
      </div>
    </div>
  );
}

// ─── GLAVNI UNOS FORMA ───────────────────────────────────────────────────────
function UnosForma({ korisnik, onOdjava }) {
  // ── Lookup podaci (učitavaju se pri startu) ────────────────────────────
  const [sviDelovi, setSviDelovi]       = useState([]);
  const [greskeKat, setGreskeKat]       = useState({});  // { kat: [podkat...] }
  const [loadingInit, setLoadingInit]   = useState(true);
  const [smene] = useState([1,2,3]);

  // ── State trenutnog dela ───────────────────────────────────────────────
  const [idDeo, setIdDeo]         = useState("");
  const [deoInfo, setDeoInfo]     = useState(null);
  const [upozorenje, setUpozorenje] = useState("");

  // ── Unos greške ───────────────────────────────────────────────────────
  const [status, setStatus]         = useState("");
  const [kategorija, setKategorija] = useState("");
  const [podkategorija, setPodkat]  = useState("");
  const [kolicina, setKolicina]     = useState(1);
  const [smena, setSmena]           = useState(1);

  // ── Liste ──────────────────────────────────────────────────────────────
  const [listaGreski, setListaGreski]   = useState([]);
  const [listaPregled, setListaPregled] = useState([]);

  // ── Statistika smene ───────────────────────────────────────────────────
  const [smenaOK, setSmenaOK]     = useState(0);
  const [smenaNOK, setSmenaNOK]   = useState(0);
  const [smenaTotal, setSmenaTotal] = useState(0);

  // ── Progres ────────────────────────────────────────────────────────────
  const [preostalo, setPreostalo] = useState(0);
  const [cilj, setCilj]           = useState(0);

  // ── UI ─────────────────────────────────────────────────────────────────
  const [modal, setModal]   = useState(null);
  const [aktivan, setAktivan] = useState("unos");
  const [saving, setSaving]   = useState(false);
  const [logPodaci, setLogPodaci] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);

  const idRef = useRef(null);

  // ══ INICIJALIZACIJA: učitaj sve delove i greške iz Supabase ════════════
  useEffect(() => {
    async function init() {
      setLoadingInit(true);
      try {
        // Delovi
        const { data: delovi, error: e1 } = await supabase
          .from("delovi")
          .select(`
            id_deo, naziv_dela, slika_naziv, kom_za_kontrolu,
            linija:linije(linija),
            masina:masine(naziv)
          `);
        if (e1) throw e1;
        setSviDelovi(delovi || []);

        // Greške katalog
        const { data: greske, error: e2 } = await supabase
          .from("greske_katalog")
          .select("kategorija, podkategorija")
          .order("kategorija");
        if (e2) throw e2;

        // Grupiši u objekat { kat: [podkat...] }
        const grupisano = {};
        (greske || []).forEach(g => {
          if (!grupisano[g.kategorija]) grupisano[g.kategorija] = [];
          grupisano[g.kategorija].push(g.podkategorija);
        });
        setGreskeKat(grupisano);

        // Učitaj aktivnu smenu iz session storage
        const sacuvanaSmena = sessionStorage.getItem("spc_smena");
        if (sacuvanaSmena) setSmena(Number(sacuvanaSmena));

        // Učitaj statistiku smene
        const stat = JSON.parse(sessionStorage.getItem("spc_smena_stat") || "{}");
        if (stat.ok)    setSmenaOK(stat.ok);
        if (stat.nok)   setSmenaNOK(stat.nok);
        if (stat.total) setSmenaTotal(stat.total);

      } catch (err) {
        setModal({ poruka: `Greška pri učitavanju:\n${err.message}`, tip:"greska" });
      } finally {
        setLoadingInit(false);
        setTimeout(() => idRef.current?.focus(), 100);
      }
    }
    init();
  }, []);

  // Čuvaj statistiku smene u sessionStorage
  useEffect(() => {
    sessionStorage.setItem("spc_smena_stat", JSON.stringify({ok:smenaOK, nok:smenaNOK, total:smenaTotal}));
  }, [smenaOK, smenaNOK, smenaTotal]);

  // ══ ID DEO: pronađi deo + scan istorije ══════════════════════════════
  useEffect(() => {
    if (idDeo.length < 3) { setDeoInfo(null); setUpozorenje(""); return; }

    const nadjen = sviDelovi.find(d => d.id_deo.toUpperCase() === idDeo.toUpperCase());
    if (nadjen) {
      setDeoInfo(nadjen);
      setCilj(nadjen.kom_za_kontrolu || 30);
      setPreostalo(nadjen.kom_za_kontrolu || 30);

      // Scan istorije — najčešća greška za ovaj deo (iz Supabase)
      supabase
        .from("kontrolni_log")
        .select("greska_naziv, podkategorija")
        .eq("id_deo", idDeo.toUpperCase())
        .eq("status", "NOK")
        .then(({ data }) => {
          if (!data || data.length === 0) { setUpozorenje(""); return; }
          const brojac = {};
          data.forEach(r => {
            const k = r.greska_naziv;
            brojac[k] = (brojac[k] || 0) + 1;
          });
          const maxK = Object.entries(brojac).sort((a,b)=>b[1]-a[1])[0];
          if (maxK && maxK[1] >= 2) {
            setUpozorenje(`⚠ ČESTO: ${maxK[0]} (${maxK[1]}x)`);
          } else {
            setUpozorenje("");
          }
        });
    } else {
      setDeoInfo(null);
      setUpozorenje("");
    }
  }, [idDeo, sviDelovi]);

  // ══ DODAJ GREŠKU ═════════════════════════════════════════════════════
  const dodajGresku = () => {
    if (!deoInfo)  { setModal({poruka:"ID dela nije pronađen!", tip:"greska"}); return; }
    if (!status)   { setModal({poruka:"Izaberi STATUS!", tip:"greska"}); return; }
    if (status==="NOK" && (!kategorija || !podkategorija)) {
      setModal({poruka:"Popuni NOK detalje!", tip:"greska"}); return;
    }
    const kat = status==="OK" ? "OK"  : kategorija;
    const pod = status==="OK" ? "-"   : podkategorija;
    setListaGreski(prev => [...prev, { kat, pod, status, kolicina }]);
    setStatus(""); setKategorija(""); setPodkat(""); setKolicina(1);
  };

  // ══ SNIMI DEO (u privremenu listu) ════════════════════════════════════
  const snimiDeo = () => {
    if (listaGreski.length === 0) { setModal({poruka:"Lista je prazna!", tip:"greska"}); return; }
    if (preostalo <= 0)           { setModal({poruka:"Serija je već gotova!", tip:"greska"}); return; }

    let ok = 0, nok = 0;
    const noviPregled = listaGreski.map(s => {
      if (s.status==="NOK") nok += s.kolicina; else ok += s.kolicina;
      return { ...s, idDeo: idDeo.toUpperCase(), datum: danas() };
    });

    setListaPregled(prev => [...prev, ...noviPregled]);
    setSmenaOK(p  => p + ok);
    setSmenaNOK(p => p + nok);
    setSmenaTotal(p => p + 1);
    setPreostalo(p => Math.max(0, p - 1));
    setListaGreski([]);
  };

  // ══ ZAPIŠI U BAZU (Supabase INSERT) ══════════════════════════════════
  const zapisiUBazu = async () => {
    if (listaPregled.length === 0) {
      setModal({poruka:"Lista pregleda je prazna!", tip:"greska"}); return;
    }
    if (preostalo > 0 && korisnik.uloga !== "admin") {
      setModal({poruka:`Serija nije završena (Preostalo: ${preostalo}).\nPotrebna ADMIN autorizacija za prekid.`, tip:"greska"}); return;
    }

    setSaving(true);
    try {
      // Pripremi redove za INSERT
      const redovi = listaPregled.map(s => {
        const jeOK = s.status === "OK";
        return {
          datum:          s.datum,
          smena:          smena,
          id_deo:         s.idDeo,
          naziv_dela:     deoInfo?.naziv_dela || "",
          linija_id:      deoInfo?.linija?.id  || null,
          masina_id:      deoInfo?.masina?.id  || null,
          kontrolor_id:   null,   // mapiraćemo kasnije sa pravim ID-em
          status:         s.status,
          greska_naziv:   s.kat,
          podkategorija:  s.pod,
          kom_nok:        jeOK ? 0 : s.kolicina,
          ok_kolicina:    jeOK ? s.kolicina : 0,
          nok_kolicina:   jeOK ? 0 : s.kolicina,
          ukupno_merenja: s.kolicina,
          potreban_broj:  cilj,
        };
      });

      const { error } = await supabase.from("kontrolni_log").insert(redovi);
      if (error) throw error;

      setModal({
        poruka: `✓ Uspešno sačuvano ${redovi.length} stavki u bazu!`,
        tip: "uspeh",
        onOK: () => { setModal(null); noviNalog(); }
      });

    } catch (err) {
      setModal({ poruka: `Greška pri snimanju:\n${err.message}`, tip:"greska" });
    } finally {
      setSaving(false);
    }
  };

  // ══ UČITAJ LOG iz Supabase ════════════════════════════════════════════
  const ucitajLog = async () => {
    setLoadingLog(true);
    try {
      const { data, error } = await supabase
        .from("kontrolni_log")
        .select("datum, id_deo, naziv_dela, greska_naziv, podkategorija, status, ok_kolicina, nok_kolicina, smena, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setLogPodaci(data || []);
    } catch (err) {
      setModal({ poruka: err.message, tip:"greska" });
    } finally {
      setLoadingLog(false);
    }
  };

  useEffect(() => {
    if (aktivan === "log") ucitajLog();
  }, [aktivan]);

  // ══ NOVI NALOG ════════════════════════════════════════════════════════
  const noviNalog = () => {
    setIdDeo(""); setDeoInfo(null); setUpozorenje("");
    setStatus(""); setKategorija(""); setPodkat(""); setKolicina(1);
    setListaGreski([]); setListaPregled([]);
    setPreostalo(0); setCilj(0);
    setTimeout(() => idRef.current?.focus(), 100);
  };

  // ══ ODJAVA ════════════════════════════════════════════════════════════
  const odjava = async () => {
    await supabase.auth.signOut();
    onOdjava();
  };

  // ─── STILOVI ─────────────────────────────────────────────────────────────
  const C = {
    bg:"#0d1117", panel:"#161b22", border:"#30363d",
    plava:"#58a6ff", zelena:"#3fb950", crvena:"#f85149",
    zuta:"#d29922", tekst:"#f0f6fc", sivi:"#8b949e",
    ok:"#0c2010", nok:"#1a0505",
  };
  const lbl  = { color:C.sivi, fontSize:10, letterSpacing:1.5, marginBottom:4, display:"block" };
  const inp  = { width:"100%", background:"#0d1117", border:`1px solid ${C.border}`,
    borderRadius:6, color:C.tekst, fontSize:13, padding:"9px 11px",
    boxSizing:"border-box", outline:"none", fontFamily:"inherit" };
  const btn  = (bg, dis=false) => ({
    background: dis ? "#21262d" : bg, border:"none", borderRadius:6,
    color: dis ? C.sivi : "#fff", fontSize:12, fontWeight:700,
    padding:"10px 0", cursor: dis?"not-allowed":"pointer",
    letterSpacing:1, width:"100%", opacity: dis ? 0.5 : 1,
    transition:"all 0.15s",
  });

  if (loadingInit) return (
    <div style={{minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center",
      justifyContent:"center", color:C.sivi, fontFamily:"'IBM Plex Mono',monospace", fontSize:13}}>
      Učitavanje podataka iz Supabase...
    </div>
  );

  const podkategorije = greskeKat[kategorija] || [];

  return (
    <div style={{minHeight:"100vh", background:C.bg, fontFamily:"'IBM Plex Mono',monospace", color:C.tekst}}>
      {modal && <Modal poruka={modal.poruka} tip={modal.tip}
        onOK={modal.onOK || (() => setModal(null))} onOtkazati={modal.onOtkazati} />}

      {/* ── HEADER ── */}
      <div style={{background:C.panel, borderBottom:`1px solid ${C.border}`,
        padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", height:50}}>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <span style={{color:C.plava, fontWeight:700, fontSize:14, letterSpacing:2}}>⚙ SPC</span>
          <span style={{color:C.border}}>|</span>
          <span style={{color:C.sivi, fontSize:11}}>ATRIBUTIVNE KARTE</span>
          <span style={{color:C.border}}>|</span>
          <select value={smena} onChange={e=>{setSmena(Number(e.target.value)); sessionStorage.setItem("spc_smena", e.target.value);}}
            style={{background:C.panel, border:`1px solid ${C.border}`, borderRadius:4,
              color:C.tekst, fontSize:11, padding:"3px 8px", cursor:"pointer"}}>
            <option value={1}>Smena 1</option>
            <option value={2}>Smena 2</option>
            <option value={3}>Smena 3</option>
          </select>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <span style={{
            background: korisnik.uloga==="admin" ? "#3d2c00" : "#0c2d48",
            color: korisnik.uloga==="admin" ? C.zuta : C.plava,
            fontSize:9, padding:"3px 10px", borderRadius:20, letterSpacing:1,
          }}>{korisnik.uloga.toUpperCase()}</span>
          <span style={{color:C.sivi, fontSize:11}}>{korisnik.ime}</span>
          <button onClick={odjava} style={{background:"none", border:`1px solid ${C.border}`,
            borderRadius:5, color:C.sivi, fontSize:10, padding:"4px 10px", cursor:"pointer"}}>Odjava</button>
        </div>
      </div>

      {/* ── TABOVI ── */}
      <div style={{display:"flex", borderBottom:`1px solid ${C.border}`, background:C.panel, paddingLeft:20}}>
        {[["unos","UNOS MERENJA"],["log","LOG PREGLED"],["smena","STATISTIKA SMENE"]].map(([tab,lbl]) => (
          <button key={tab} onClick={() => setAktivan(tab)} style={{
            background:"none", border:"none",
            borderBottom: aktivan===tab ? `2px solid ${C.plava}` : "2px solid transparent",
            color: aktivan===tab ? C.plava : C.sivi,
            fontSize:11, fontWeight:700, padding:"11px 18px", cursor:"pointer", letterSpacing:1,
          }}>{lbl}</button>
        ))}
        <div style={{flex:1}}/>
        <span style={{color:C.sivi, fontSize:10, alignSelf:"center", paddingRight:16}}>{danasPrikaz()}</span>
      </div>

      {/* ══ TAB: UNOS ══════════════════════════════════════════════════════ */}
      {aktivan==="unos" && (
        <div style={{display:"grid", gridTemplateColumns:"320px 1fr 250px", height:"calc(100vh - 89px)"}}>

          {/* ── LEVA: ID dela + info ── */}
          <div style={{borderRight:`1px solid ${C.border}`, padding:18, overflowY:"auto", display:"flex", flexDirection:"column", gap:14}}>
            <div>
              <label style={lbl}>ID DELA</label>
              <input ref={idRef} value={idDeo} onChange={e=>setIdDeo(e.target.value.toUpperCase())}
                placeholder="npr. 5501-A"
                style={{...inp,
                  borderColor: deoInfo ? C.zelena : idDeo.length>2 ? C.crvena : C.border,
                  background:  deoInfo ? "#0c2010" : idDeo.length>2 ? "#1a0505" : "#0d1117",
                  fontSize:17, fontWeight:700, letterSpacing:2, textAlign:"center",
                }}
              />
              {upozorenje && (
                <div style={{color:C.crvena, fontSize:11, marginTop:6, padding:"6px 8px", background:"#1a0505", borderRadius:4}}>
                  {upozorenje}
                </div>
              )}
            </div>

            {deoInfo ? (
              <div style={{background:"#0c1a0c", border:`1px solid #2ea04326`, borderRadius:8, padding:13}}>
                <div style={{color:C.zelena, fontWeight:700, fontSize:13, marginBottom:8}}>{deoInfo.naziv_dela}</div>
                {[
                  ["Linija",    deoInfo.linija?.linija || "-"],
                  ["Mašina",    deoInfo.masina?.naziv  || "-"],
                ].map(([l,v]) => (
                  <div key={l} style={{display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4}}>
                    <span style={{color:C.sivi}}>{l}</span>
                    <span style={{color:C.tekst}}>{v}</span>
                  </div>
                ))}
                <div style={{marginTop:10}}>
                  <div style={{display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:4}}>
                    <span style={{color:C.sivi}}>PREOSTALO</span>
                    <span style={{color: preostalo===0?C.zelena:C.zuta, fontWeight:700}}>{preostalo} / {cilj}</span>
                  </div>
                  <div style={{background:"#21262d", borderRadius:4, height:5}}>
                    <div style={{
                      background: preostalo===0 ? C.zelena : C.plava,
                      width:`${cilj>0?((cilj-preostalo)/cilj*100):0}%`,
                      height:5, borderRadius:4, transition:"width 0.3s",
                    }}/>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{background:C.panel, border:`1px dashed ${C.border}`, borderRadius:8,
                padding:28, textAlign:"center", color:C.border, fontSize:11}}>
                Unesi ID dela
              </div>
            )}

            {/* SOP slika placeholder */}
            <div style={{background:C.panel, border:`1px solid ${C.border}`, borderRadius:8,
              flex:1, minHeight:120, display:"flex", alignItems:"center", justifyContent:"center",
              flexDirection:"column", gap:6, color:C.border}}>
              <span style={{fontSize:28}}>🖼</span>
              <span style={{fontSize:10, color:C.sivi}}>SOP SLIKA DELA</span>
            </div>

            <button onClick={noviNalog}
              style={{...btn("#21262d"), border:`1px solid ${C.border}`, color:C.sivi, fontSize:11}}>
              ↺  NOVI NALOG
            </button>
          </div>

          {/* ── SREDINA: Unos greške ── */}
          <div style={{padding:18, overflowY:"auto", display:"flex", flexDirection:"column", gap:12, borderRight:`1px solid ${C.border}`}}>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:10}}>
              <div>
                <label style={lbl}>STATUS</label>
                <select value={status} onChange={e=>{setStatus(e.target.value); if(e.target.value==="OK"){setKategorija("");setPodkat("");}}}
                  style={{...inp,
                    borderColor: status==="OK"?C.zelena:status==="NOK"?C.crvena:C.border,
                    background:  status==="OK"?"#0c2010":status==="NOK"?"#1a0505":"#0d1117",
                    fontWeight:700, fontSize:14, textAlign:"center", cursor:"pointer",
                  }}>
                  <option value="">-- Status --</option>
                  <option value="OK">✓  OK</option>
                  <option value="NOK">✗  NOK</option>
                </select>
              </div>
              <div>
                <label style={lbl}>KOLIČINA</label>
                <select value={kolicina} onChange={e=>setKolicina(Number(e.target.value))}
                  style={{...inp, cursor:"pointer"}}>
                  {Array.from({length:20},(_,i)=>i+1).map(k=><option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={lbl}>KATEGORIJA GREŠKE</label>
              <select value={kategorija} onChange={e=>{setKategorija(e.target.value); setPodkat("");}}
                disabled={status!=="NOK"}
                style={{...inp, opacity:status!=="NOK"?0.4:1, cursor:status!=="NOK"?"not-allowed":"pointer"}}>
                <option value="">-- Izaberi kategoriju --</option>
                {Object.keys(greskeKat).map(k=><option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div>
              <label style={lbl}>PODKATEGORIJA</label>
              <select value={podkategorija} onChange={e=>setPodkat(e.target.value)}
                disabled={!kategorija||status!=="NOK"}
                style={{...inp, opacity:(!kategorija||status!=="NOK")?0.4:1, cursor:(!kategorija||status!=="NOK")?"not-allowed":"pointer"}}>
                <option value="">-- Izaberi podkategoriju --</option>
                {podkategorije.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <button onClick={dodajGresku} disabled={!deoInfo}
              style={{...btn(C.plava, !deoInfo), fontSize:12, padding:"11px"}}>
              + DODAJ U LISTU
            </button>

            {/* Privremena lista */}
            <label style={{...lbl, marginBottom:6}}>PRIVREMENA LISTA ({listaGreski.length})</label>
            <div style={{border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", flex:1, minHeight:80}}>
              {listaGreski.length===0 ? (
                <div style={{padding:20, textAlign:"center", color:C.border, fontSize:11}}>Dodaj stavke</div>
              ) : listaGreski.map((s,i)=>(
                <div key={i} style={{display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"8px 12px", borderBottom:`1px solid ${C.border}`,
                  background:s.status==="OK"?C.ok:C.nok}}>
                  <div style={{display:"flex", gap:8, alignItems:"center"}}>
                    <span style={{color:s.status==="OK"?C.zelena:C.crvena, fontWeight:700, fontSize:11, minWidth:32}}>{s.status}</span>
                    <span style={{color:C.tekst, fontSize:11}}>{s.kat} › {s.pod}</span>
                  </div>
                  <div style={{display:"flex", gap:8, alignItems:"center"}}>
                    <span style={{color:C.sivi, fontSize:11}}>×{s.kolicina}</span>
                    <button onClick={()=>setListaGreski(p=>p.filter((_,j)=>j!==i))}
                      style={{background:"none", border:"none", color:C.crvena, cursor:"pointer", fontSize:13, padding:0}}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={snimiDeo} disabled={listaGreski.length===0}
              style={{...btn(C.zelena, listaGreski.length===0), fontSize:12, padding:"11px",
                boxShadow:listaGreski.length>0?`0 0 14px ${C.zelena}40`:"none"}}>
              ✓  SNIMI DEO
            </button>
          </div>

          {/* ── DESNA: Pregled + snimanje ── */}
          <div style={{padding:18, display:"flex", flexDirection:"column", gap:12, overflowY:"auto"}}>
            <div style={{background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:12}}>
              <div style={{color:C.sivi, fontSize:9, letterSpacing:1, marginBottom:8}}>SMENA TOTALI</div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:5, textAlign:"center"}}>
                {[["MER",smenaTotal,C.plava],["OK",smenaOK,C.zelena],["NOK",smenaNOK,C.crvena]].map(([l,v,b])=>(
                  <div key={l} style={{background:"#0d1117", borderRadius:5, padding:"8px 4px"}}>
                    <div style={{color:b, fontSize:18, fontWeight:700}}>{v}</div>
                    <div style={{color:C.sivi, fontSize:9}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            <label style={{...lbl}}>PREGLED ({listaPregled.length} stavki)</label>
            <div style={{flex:1, border:`1px solid ${C.border}`, borderRadius:8, overflow:"auto", minHeight:80}}>
              {listaPregled.length===0 ? (
                <div style={{padding:20, textAlign:"center", color:C.border, fontSize:11}}>Nema snimljenih</div>
              ) : listaPregled.map((s,i)=>(
                <div key={i} style={{padding:"7px 10px", borderBottom:`1px solid ${C.border}`,
                  background:s.status==="OK"?C.ok:C.nok, fontSize:11}}>
                  <div style={{display:"flex", justifyContent:"space-between"}}>
                    <span style={{color:s.status==="OK"?C.zelena:C.crvena, fontWeight:700}}>{s.status}</span>
                    <span style={{color:C.sivi}}>×{s.kolicina}</span>
                  </div>
                  <div style={{color:C.tekst, marginTop:2}}>{s.kat}</div>
                  <div style={{color:C.sivi}}>{s.pod}</div>
                </div>
              ))}
            </div>

            <button onClick={zapisiUBazu} disabled={listaPregled.length===0||saving}
              style={{...btn("#7c3aed", listaPregled.length===0||saving), fontSize:11, padding:"11px",
                boxShadow:listaPregled.length>0?`0 0 12px #7c3aed40`:"none"}}>
              {saving ? "Snimanje..." : "💾  ZAPIŠI U BAZU"}
            </button>
          </div>
        </div>
      )}

      {/* ══ TAB: LOG PREGLED ═══════════════════════════════════════════════ */}
      {aktivan==="log" && (
        <div style={{padding:20}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
            <span style={{color:C.sivi, fontSize:11}}>Poslednjih 100 unosa iz baze</span>
            <button onClick={ucitajLog} style={{background:C.panel, border:`1px solid ${C.border}`,
              borderRadius:5, color:C.sivi, fontSize:11, padding:"5px 14px", cursor:"pointer"}}>
              ↻ Osveži
            </button>
          </div>
          {loadingLog ? (
            <div style={{textAlign:"center", color:C.sivi, padding:40}}>Učitavanje...</div>
          ) : (
            <div style={{border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden"}}>
              <div style={{display:"grid", gridTemplateColumns:"90px 80px 80px 1fr 1fr 60px 50px 50px",
                background:"#21262d", padding:"9px 14px", fontSize:10, color:C.sivi, gap:8}}>
                <span>DATUM</span><span>ID DEO</span><span>SMENA</span>
                <span>KATEGORIJA</span><span>PODKAT.</span><span>STATUS</span><span>OK</span><span>NOK</span>
              </div>
              {logPodaci.length===0 ? (
                <div style={{padding:40, textAlign:"center", color:C.border, fontSize:12}}>Nema podataka</div>
              ) : logPodaci.map((r,i)=>(
                <div key={i} style={{display:"grid",
                  gridTemplateColumns:"90px 80px 80px 1fr 1fr 60px 50px 50px",
                  padding:"8px 14px", borderTop:`1px solid ${C.border}`,
                  background:r.status==="OK"?"#0c2010":"#1a0505", fontSize:11, gap:8, alignItems:"center"}}>
                  <span style={{color:C.sivi}}>{r.datum}</span>
                  <span style={{color:C.tekst, fontWeight:700}}>{r.id_deo}</span>
                  <span style={{color:C.sivi}}>Smena {r.smena}</span>
                  <span style={{color:C.tekst}}>{r.greska_naziv}</span>
                  <span style={{color:C.sivi}}>{r.podkategorija}</span>
                  <span style={{color:r.status==="OK"?C.zelena:C.crvena, fontWeight:700}}>{r.status}</span>
                  <span style={{color:C.zelena}}>{r.ok_kolicina}</span>
                  <span style={{color:C.crvena}}>{r.nok_kolicina}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: STATISTIKA SMENE ══════════════════════════════════════════ */}
      {aktivan==="smena" && (
        <div style={{padding:24, display:"flex", gap:16, flexWrap:"wrap", alignItems:"flex-start"}}>
          {[
            {lbl:"MERENJA U SMENI", val:smenaTotal,  boja:C.plava},
            {lbl:"OK KOMADA",       val:smenaOK,     boja:C.zelena},
            {lbl:"NOK KOMADA",      val:smenaNOK,    boja:C.crvena},
            {lbl:"RTY %",           val: smenaTotal>0
              ? (smenaOK/(smenaOK+smenaNOK)*100||0).toFixed(1)+"%"
              : "-", boja:C.zuta},
          ].map(({lbl,val,boja})=>(
            <div key={lbl} style={{background:C.panel, border:`1px solid ${boja}30`,
              borderRadius:10, padding:"22px 28px", minWidth:160, textAlign:"center"}}>
              <div style={{color:boja, fontSize:36, fontWeight:700}}>{val}</div>
              <div style={{color:C.sivi, fontSize:10, letterSpacing:1.5, marginTop:6}}>{lbl}</div>
            </div>
          ))}
          {korisnik.uloga==="admin" && (
            <button onClick={()=>{
              setSmenaOK(0); setSmenaNOK(0); setSmenaTotal(0);
              sessionStorage.removeItem("spc_smena_stat");
              setModal({poruka:"Statistika smene nulirana.", tip:"uspeh"});
            }} style={{...btn("#3d2c00"), border:`1px solid ${C.zuta}40`,
              color:C.zuta, fontSize:11, padding:"12px 20px", width:"auto", marginTop:8}}>
              ⚠ RESET SMENE
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [korisnik, setKorisnik] = useState(null);
  const [checking, setChecking] = useState(true);

  // Proveri da li je već ulogovan (Supabase session)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from("radnici").select("ime,uloga").eq("user_id", session.user.id).single()
          .then(({ data: r }) => {
            setKorisnik({
              id: session.user.id,
              email: session.user.email,
              ime: r?.ime || session.user.email,
              uloga: r?.uloga || "kontrolor",
            });
          });
      }
      setChecking(false);
    });
    // Slušaj auth promene
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) setKorisnik(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (checking) return (
    <div style={{minHeight:"100vh", background:"#0d1117", display:"flex", alignItems:"center",
      justifyContent:"center", color:"#8b949e", fontFamily:"monospace"}}>
      Provera sesije...
    </div>
  );

  return korisnik
    ? <UnosForma korisnik={korisnik} onOdjava={() => setKorisnik(null)} />
    : <LoginScreen onLogin={setKorisnik} />;
}
