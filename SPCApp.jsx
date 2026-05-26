import { useState, useEffect, useCallback } from "react";

// ─── MOCK SUPABASE DATA (zameni sa pravim Supabase klijentom) ──────────────────
const MOCK_DELOVI = [
  { id_deo: "5501-A", naziv_dela: "Nosac",   masina: "M1", linija: "Preseraj",   kontrolor: "PETROVIC DRAGOMIR", radni_nalog: "RN-2024-001", kom_za_kontrolu: 30, slika: null },
  { id_deo: "5502-A", naziv_dela: "Osovina", masina: "M2", linija: "Karoserija", kontrolor: "KIKA KON",          radni_nalog: "RN-2024-002", kom_za_kontrolu: 20, slika: null },
  { id_deo: "5503-A", naziv_dela: "Osovina", masina: "M3", linija: "Montaza",    kontrolor: "MIKA KON",          radni_nalog: "RN-2024-003", kom_za_kontrolu: 25, slika: null },
];

const GRESKE_KATALOG = {
  "LOS VAR":   ["Rupa u varu","Nema vara","Slab var","Prskanje","Rasipanje"],
  "ZAZOR":     ["Prevelik","Premali","Nejednak","Van tolerancije"],
  "POVRSINA":  ["Ogrebotina","Udubljenje","Rdja","Boja","Prevelika","Premala","Ovalnost","Konusnost","Deformacija"],
  "DIMENZIJA": ["Sirina","Duzina","Visina"],
  "VIZUELNO":  ["Ostra ivica","Boja","Krivo"],
  "FUNKCIJA":  ["Blokira"],
  "MONTAZA":   ["Los polozaj","Pogresan deo"],
  "MATERIJAL": ["Mekano","Tvrdo"],
  "PAKOVANJE": ["Osteceno"],
  "OZNAKE":    ["Nedostaje deo"],
};

const KOLICINE = Array.from({length:20}, (_,i) => i+1);

function danas() {
  return new Date().toLocaleDateString("sr-RS", {day:"2-digit",month:"2-digit",year:"numeric"});
}

// ─── KORAK 1: EKRAN ZA PRIJAVU (simulacija) ─────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pin, setPin] = useState("");
  const [greska, setGreska] = useState("");

  const korisnici = {
    "1234": { ime: "PETROVIC DRAGOMIR", uloga: "kontrolor" },
    "5678": { ime: "KIKA KON",          uloga: "kontrolor" },
    "9999": { ime: "Admin",             uloga: "admin"     },
  };

  const prijavi = () => {
    if (korisnici[pin]) { onLogin(korisnici[pin]); }
    else { setGreska("Pogrešan PIN!"); setPin(""); }
  };

  return (
    <div style={{
      minHeight:"100vh", background:"#0d1117",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'IBM Plex Mono', monospace",
    }}>
      <div style={{
        background:"#161b22", border:"1px solid #30363d",
        borderRadius:12, padding:"48px 40px", width:360, textAlign:"center",
      }}>
        <div style={{fontSize:36, marginBottom:8}}>⚙️</div>
        <div style={{color:"#58a6ff", fontSize:22, fontWeight:700, letterSpacing:2, marginBottom:4}}>SPC KONTROLA</div>
        <div style={{color:"#8b949e", fontSize:12, marginBottom:32, letterSpacing:1}}>ATRIBUTIVNE KARTE</div>

        <div style={{color:"#8b949e", fontSize:11, marginBottom:8, textAlign:"left", letterSpacing:1}}>KONTROLOR PIN</div>
        <input
          type="password" value={pin} maxLength={4}
          onChange={e => { setPin(e.target.value); setGreska(""); }}
          onKeyDown={e => e.key==="Enter" && prijavi()}
          placeholder="● ● ● ●"
          style={{
            width:"100%", background:"#0d1117", border:"1px solid #30363d",
            borderRadius:6, color:"#f0f6fc", fontSize:24, padding:"14px 16px",
            textAlign:"center", letterSpacing:8, boxSizing:"border-box",
            outline:"none", marginBottom:8,
          }}
          autoFocus
        />
        {greska && <div style={{color:"#f85149", fontSize:12, marginBottom:8}}>{greska}</div>}
        <button onClick={prijavi} style={{
          width:"100%", background:"#238636", border:"none", borderRadius:6,
          color:"#fff", fontSize:14, fontWeight:700, padding:"12px", cursor:"pointer",
          letterSpacing:1, marginTop:8,
        }}>PRIJAVA</button>

        <div style={{color:"#484f58", fontSize:11, marginTop:24}}>
          Demo: 1234 · 5678 · 9999 (admin)
        </div>
      </div>
    </div>
  );
}

// ─── MODAL ZA POTVRDU (zamena za MsgBox) ────────────────────────────────────
function Modal({ poruka, tip="info", onOK, onOtkazati }) {
  const boja = tip==="uspeh" ? "#238636" : tip==="greska" ? "#f85149" : "#58a6ff";
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
      display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000,
    }}>
      <div style={{
        background:"#161b22", border:`1px solid ${boja}`, borderRadius:10,
        padding:"32px 36px", maxWidth:420, textAlign:"center",
      }}>
        <div style={{color:boja, fontSize:32, marginBottom:12}}>
          {tip==="uspeh"?"✓" : tip==="greska"?"✗" : "ℹ"}
        </div>
        <div style={{color:"#f0f6fc", fontSize:15, lineHeight:1.6, marginBottom:24}}>{poruka}</div>
        <div style={{display:"flex", gap:10, justifyContent:"center"}}>
          <button onClick={onOK} style={{
            background:boja, border:"none", borderRadius:6,
            color:"#fff", fontSize:13, fontWeight:700, padding:"10px 28px", cursor:"pointer",
          }}>OK</button>
          {onOtkazati && (
            <button onClick={onOtkazati} style={{
              background:"#21262d", border:"1px solid #30363d", borderRadius:6,
              color:"#8b949e", fontSize:13, padding:"10px 20px", cursor:"pointer",
            }}>Otkaži</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── GLAVNI UNOS FORMA ───────────────────────────────────────────────────────
function UnosForma({ korisnik, onOdjava }) {
  // State podataka dela
  const [idDeo, setIdDeo]     = useState("");
  const [deoInfo, setDeoInfo] = useState(null);
  const [upozorenje, setUpozorenje] = useState("");

  // State stavki
  const [status, setStatus]           = useState("");
  const [kategorija, setKategorija]   = useState("");
  const [podkategorija, setPodkat]    = useState("");
  const [kolicina, setKolicina]       = useState(1);

  // Liste
  const [listaGreski, setListaGreski]   = useState([]);   // privremena (lstGreske)
  const [listaPregled, setListaPregled] = useState([]);   // snimljene (lstPregled)

  // Statistika smene
  const [smenaOK, setSmenaOK]   = useState(0);
  const [smenaNOK, setSmenaNOK] = useState(0);
  const [smenaTotal, setSmenaTotal] = useState(0);

  // Preostalo
  const [preostalo, setPreostalo] = useState(0);
  const [cilj, setCilj]           = useState(0);

  // UI state
  const [modal, setModal] = useState(null);
  const [aktivan, setAktivan] = useState("unos"); // tab

  // ── ID DEO promena (zamena za txtIDDeo_Change) ──────────────────────────
  useEffect(() => {
    if (idDeo.length < 3) { setDeoInfo(null); setUpozorenje(""); return; }
    const nadjen = MOCK_DELOVI.find(d => d.id_deo.toUpperCase() === idDeo.toUpperCase());
    if (nadjen) {
      setDeoInfo(nadjen);
      setCilj(nadjen.kom_za_kontrolu);
      setPreostalo(nadjen.kom_za_kontrolu);
      // Scan istorije (u pravoj verziji - Supabase upit)
      const ceste = listaPregled.filter(l => l.idDeo===idDeo && l.status==="NOK");
      if (ceste.length >= 2) setUpozorenje(`⚠ ČESTO: ${ceste[0]?.greska} (${ceste.length}x)`);
      else setUpozorenje("");
    } else {
      setDeoInfo(null);
      setUpozorenje("");
    }
  }, [idDeo]);

  // ── Dodaj grešku (zamena za btnDodajGresku_Click) ──────────────────────
  const dodajGresku = () => {
    if (!deoInfo) { setModal({poruka:"ID dela nije pronađen!", tip:"greska"}); return; }
    if (!status) { setModal({poruka:"Izaberi STATUS!", tip:"greska"}); return; }
    if (status==="NOK" && (!kategorija || !podkategorija)) {
      setModal({poruka:"Popuni NOK detalje (kategorija i podkategorija)!", tip:"greska"}); return;
    }
    const kat = status==="OK" ? "OK" : kategorija;
    const pod = status==="OK" ? "-"  : podkategorija;
    setListaGreski(prev => [...prev, { kat, pod, status, kolicina }]);
    setStatus(""); setKategorija(""); setPodkat(""); setKolicina(1);
  };

  // ── Snimi deo (zamena za btnSnimiDeo_Click) ─────────────────────────────
  const snimiDeo = () => {
    if (listaGreski.length===0) { setModal({poruka:"Lista je prazna! Dodaj bar jednu stavku.", tip:"greska"}); return; }
    if (preostalo <= 0) { setModal({poruka:"Serija je već gotova!", tip:"greska"}); return; }

    let ok=0, nok=0;
    const noviPregled = listaGreski.map(s => {
      if (s.status==="NOK") nok+=s.kolicina; else ok+=s.kolicina;
      return { ...s, idDeo: idDeo, datum: danas() };
    });

    setListaPregled(prev => [...prev, ...noviPregled]);
    setSmenaOK(p => p+ok);
    setSmenaNOK(p => p+nok);
    setSmenaTotal(p => p+1);
    setPreostalo(p => Math.max(0, p-1));
    setListaGreski([]);
  };

  // ── Zapiši u bazu (zamena za btnZapisiUBazu_Click) ──────────────────────
  const zapisiUBazu = () => {
    if (listaPregled.length===0) { setModal({poruka:"Lista pregleda je prazna!", tip:"greska"}); return; }
    if (preostalo > 0 && korisnik.uloga !== "admin") {
      setModal({poruka:`Serija nije završena (Preostalo: ${preostalo}). Potrebna ADMIN autorizacija.`, tip:"greska"}); return;
    }
    // U pravoj verziji: Supabase INSERT u kontrolni_log
    setModal({
      poruka:"Podaci uspešno arhivirani u bazu! ✓",
      tip:"uspeh",
      onOK: () => { setModal(null); noviNalog(); }
    });
  };

  // ── Novi nalog ───────────────────────────────────────────────────────────
  const noviNalog = () => {
    setIdDeo(""); setDeoInfo(null); setUpozorenje("");
    setStatus(""); setKategorija(""); setPodkat(""); setKolicina(1);
    setListaGreski([]); setListaPregled([]);
    setPreostalo(0); setCilj(0);
  };

  const C = { // boje
    bg: "#0d1117", panel: "#161b22", border: "#30363d",
    plava: "#58a6ff", zelena: "#3fb950", crvena: "#f85149",
    zuta: "#d29922", tekst: "#f0f6fc", sivi: "#8b949e",
    ok: "#1a4428", nok: "#3d1c1c",
  };

  const labelStyle = { color: C.sivi, fontSize: 10, letterSpacing: 1.5, marginBottom: 4, display:"block" };
  const inputStyle = {
    width:"100%", background:"#0d1117", border:`1px solid ${C.border}`,
    borderRadius:6, color:C.tekst, fontSize:13, padding:"9px 11px",
    boxSizing:"border-box", outline:"none", fontFamily:"inherit",
  };
  const selectStyle = { ...inputStyle, cursor:"pointer" };
  const btnStyle = (bg, disabled=false) => ({
    background: disabled ? "#21262d" : bg, border:"none", borderRadius:6,
    color: disabled ? C.sivi : "#fff", fontSize:12, fontWeight:700,
    padding:"10px 0", cursor: disabled?"not-allowed":"pointer",
    letterSpacing:1, width:"100%", opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'IBM Plex Mono', monospace", color:C.tekst }}>
      {modal && <Modal poruka={modal.poruka} tip={modal.tip}
        onOK={modal.onOK || (() => setModal(null))}
        onOtkazati={modal.onOtkazati}
      />}

      {/* ── HEADER ── */}
      <div style={{ background:C.panel, borderBottom:`1px solid ${C.border}`, padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between", height:52 }}>
        <div style={{display:"flex", alignItems:"center", gap:16}}>
          <span style={{color:C.plava, fontWeight:700, fontSize:15, letterSpacing:2}}>⚙ SPC</span>
          <span style={{color:C.border}}>|</span>
          <span style={{color:C.sivi, fontSize:12}}>ATRIBUTIVNE KARTE</span>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:16}}>
          <span style={{
            background: korisnik.uloga==="admin" ? "#3d2c00" : "#0c2d48",
            color: korisnik.uloga==="admin" ? C.zuta : C.plava,
            fontSize:10, padding:"3px 10px", borderRadius:20, letterSpacing:1,
          }}>{korisnik.uloga.toUpperCase()}</span>
          <span style={{color:C.sivi, fontSize:12}}>{korisnik.ime}</span>
          <button onClick={onOdjava} style={{
            background:"none", border:`1px solid ${C.border}`, borderRadius:6,
            color:C.sivi, fontSize:11, padding:"5px 12px", cursor:"pointer",
          }}>Odjava</button>
        </div>
      </div>

      {/* ── TABOVI ── */}
      <div style={{display:"flex", borderBottom:`1px solid ${C.border}`, paddingLeft:24, background:C.panel}}>
        {["unos","log","smena"].map(tab => (
          <button key={tab} onClick={() => setAktivan(tab)} style={{
            background:"none", border:"none", borderBottom: aktivan===tab ? `2px solid ${C.plava}` : "2px solid transparent",
            color: aktivan===tab ? C.plava : C.sivi, fontSize:12, fontWeight:700,
            padding:"12px 20px", cursor:"pointer", letterSpacing:1,
          }}>{tab==="unos"?"UNOS MERENJA":tab==="log"?"LOG PREGLED":"STATISTIKA SMENE"}</button>
        ))}
        <div style={{flex:1}}/>
        <div style={{display:"flex", alignItems:"center", gap:8, paddingRight:8}}>
          <span style={{color:C.sivi, fontSize:11}}>{danas()}</span>
        </div>
      </div>

      {/* ══ TAB: UNOS ══════════════════════════════════════════════════════ */}
      {aktivan==="unos" && (
        <div style={{display:"grid", gridTemplateColumns:"340px 1fr 260px", gap:0, height:"calc(100vh - 89px)"}}>

          {/* ── LEVA KOLONA: ID + info dela ── */}
          <div style={{borderRight:`1px solid ${C.border}`, padding:20, overflowY:"auto", display:"flex", flexDirection:"column", gap:16}}>

            {/* ID dela */}
            <div>
              <label style={labelStyle}>ID DELA</label>
              <input value={idDeo} onChange={e=>setIdDeo(e.target.value.toUpperCase())}
                placeholder="npr. 5501-A"
                style={{
                  ...inputStyle,
                  borderColor: deoInfo ? C.zelena : idDeo.length>2 ? C.crvena : C.border,
                  background: deoInfo ? "#0c2010" : idDeo.length>2 ? "#1a0505" : "#0d1117",
                  fontSize:18, fontWeight:700, letterSpacing:2, textAlign:"center",
                }}
              />
              {upozorenje && <div style={{color:C.crvena, fontSize:11, marginTop:6, padding:"6px 8px", background:"#1a0505", borderRadius:4}}>⚠ {upozorenje}</div>}
            </div>

            {/* Info dela */}
            {deoInfo ? (
              <div style={{background:"#0c1a0c", border:`1px solid #2ea04326`, borderRadius:8, padding:14, display:"flex", flexDirection:"column", gap:8}}>
                <div style={{color:C.zelena, fontWeight:700, fontSize:13}}>{deoInfo.naziv_dela}</div>
                {[
                  ["Radni nalog", deoInfo.radni_nalog],
                  ["Linija",      deoInfo.linija],
                  ["Mašina",      deoInfo.masina],
                  ["Kontrolor",   deoInfo.kontrolor],
                ].map(([lbl, val]) => (
                  <div key={lbl} style={{display:"flex", justifyContent:"space-between", fontSize:11}}>
                    <span style={{color:C.sivi}}>{lbl}</span>
                    <span style={{color:C.tekst}}>{val}</span>
                  </div>
                ))}

                {/* Progres bar */}
                <div style={{marginTop:4}}>
                  <div style={{display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:4}}>
                    <span style={{color:C.sivi}}>PREOSTALO</span>
                    <span style={{color: preostalo===0 ? C.zelena : C.zuta, fontWeight:700}}>
                      {preostalo} / {cilj}
                    </span>
                  </div>
                  <div style={{background:"#21262d", borderRadius:4, height:6}}>
                    <div style={{
                      background: preostalo===0 ? C.zelena : C.plava,
                      width:`${cilj>0 ? ((cilj-preostalo)/cilj*100) : 0}%`,
                      height:6, borderRadius:4, transition:"width 0.3s",
                    }}/>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{background:"#161b22", border:`1px dashed ${C.border}`, borderRadius:8, padding:32, textAlign:"center", color:C.sivi, fontSize:12}}>
                Skenaj ili unesi ID dela
              </div>
            )}

            {/* Slika placeholder */}
            <div style={{
              background:"#161b22", border:`1px solid ${C.border}`, borderRadius:8,
              height:160, display:"flex", alignItems:"center", justifyContent:"center",
              color:C.border, fontSize:24, flexDirection:"column", gap:8,
            }}>
              <span>🖼</span>
              <span style={{fontSize:10, color:C.sivi}}>SOP SLIKA DELA</span>
              {deoInfo?.slika && <img src={deoInfo.slika} alt="deo" style={{maxHeight:140, maxWidth:"100%"}}/>}
            </div>

            {/* Dugmad */}
            <div style={{display:"flex", flexDirection:"column", gap:8, marginTop:"auto"}}>
              <button onClick={noviNalog} style={{...btnStyle("#21262d"), border:`1px solid ${C.border}`, color:C.sivi}}>
                ↺  NOVI NALOG
              </button>
              {korisnik.uloga==="admin" && (
                <button style={{...btnStyle("#3d2c00"), border:`1px solid ${C.zuta}40`, color:C.zuta, fontSize:11}}>
                  🔧 ADMIN PANEL
                </button>
              )}
            </div>
          </div>

          {/* ── SREDNJA KOLONA: Unos greški ── */}
          <div style={{padding:20, overflowY:"auto", display:"flex", flexDirection:"column", gap:14}}>

            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
              {/* Status */}
              <div>
                <label style={labelStyle}>STATUS</label>
                <select value={status} onChange={e=>{ setStatus(e.target.value); if(e.target.value==="OK"){setKategorija("");setPodkat("");} }}
                  style={{...selectStyle, borderColor: status==="OK"?C.zelena : status==="NOK"?C.crvena : C.border,
                    background: status==="OK"?"#0c2010" : status==="NOK"?"#1a0505" : "#0d1117",
                    fontWeight:700, fontSize:15, textAlign:"center",
                  }}>
                  <option value="">-- Izaberi --</option>
                  <option value="OK">✓  OK</option>
                  <option value="NOK">✗  NOK</option>
                </select>
              </div>

              {/* Količina */}
              <div>
                <label style={labelStyle}>KOLIČINA</label>
                <select value={kolicina} onChange={e=>setKolicina(Number(e.target.value))} style={selectStyle}>
                  {KOLICINE.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>

            {/* Kategorija */}
            <div>
              <label style={labelStyle}>KATEGORIJA GREŠKE</label>
              <select value={kategorija} onChange={e=>{setKategorija(e.target.value); setPodkat("");}}
                disabled={status!=="NOK"}
                style={{...selectStyle, opacity:status!=="NOK"?0.4:1}}>
                <option value="">-- Izaberi kategoriju --</option>
                {Object.keys(GRESKE_KATALOG).map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            {/* Podkategorija */}
            <div>
              <label style={labelStyle}>PODKATEGORIJA</label>
              <select value={podkategorija} onChange={e=>setPodkat(e.target.value)}
                disabled={!kategorija || status!=="NOK"}
                style={{...selectStyle, opacity:(!kategorija||status!=="NOK")?0.4:1}}>
                <option value="">-- Izaberi podkategoriju --</option>
                {(GRESKE_KATALOG[kategorija]||[]).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Dodaj button */}
            <button onClick={dodajGresku} disabled={!deoInfo}
              style={{...btnStyle(C.plava, !deoInfo), fontSize:13, padding:"12px"}}>
              + DODAJ U LISTU
            </button>

            {/* Lista grešaka (lstGreske) */}
            <div style={{flex:1}}>
              <label style={{...labelStyle, marginBottom:8}}>PRIVREMENA LISTA ({listaGreski.length})</label>
              <div style={{border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", minHeight:80}}>
                {listaGreski.length===0 ? (
                  <div style={{padding:20, textAlign:"center", color:C.border, fontSize:12}}>Prazno — dodaj stavke</div>
                ) : listaGreski.map((s,i) => (
                  <div key={i} style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"8px 12px", borderBottom:`1px solid ${C.border}`,
                    background: s.status==="OK" ? C.ok : C.nok,
                  }}>
                    <div style={{display:"flex", gap:8, alignItems:"center"}}>
                      <span style={{
                        color: s.status==="OK" ? C.zelena : C.crvena,
                        fontWeight:700, fontSize:11, minWidth:32,
                      }}>{s.status}</span>
                      <span style={{color:C.tekst, fontSize:12}}>{s.kat} › {s.pod}</span>
                    </div>
                    <div style={{display:"flex", gap:8, alignItems:"center"}}>
                      <span style={{color:C.sivi, fontSize:11}}>×{s.kolicina}</span>
                      <button onClick={() => setListaGreski(prev=>prev.filter((_,j)=>j!==i))}
                        style={{background:"none",border:"none",color:C.crvena,cursor:"pointer",fontSize:14,padding:0}}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Snimi deo */}
            <button onClick={snimiDeo} disabled={listaGreski.length===0}
              style={{
                ...btnStyle(C.zelena, listaGreski.length===0),
                fontSize:13, padding:"12px",
                boxShadow: listaGreski.length>0 ? `0 0 16px ${C.zelena}40` : "none",
              }}>
              ✓  SNIMI DEO
            </button>
          </div>

          {/* ── DESNA KOLONA: Pregled + snimanje ── */}
          <div style={{borderLeft:`1px solid ${C.border}`, padding:20, display:"flex", flexDirection:"column", gap:14, overflowY:"auto"}}>

            {/* Stats smene - mini */}
            <div style={{background:C.panel, border:`1px solid ${C.border}`, borderRadius:8, padding:12}}>
              <div style={{color:C.sivi, fontSize:10, letterSpacing:1, marginBottom:8}}>SMENA TOTALI</div>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, textAlign:"center"}}>
                {[["MERENJA", smenaTotal, C.plava], ["OK", smenaOK, C.zelena], ["NOK", smenaNOK, C.crvena]].map(([lbl,val,boja])=>(
                  <div key={lbl} style={{background:"#0d1117", borderRadius:6, padding:8}}>
                    <div style={{color:boja, fontSize:16, fontWeight:700}}>{val}</div>
                    <div style={{color:C.sivi, fontSize:9, letterSpacing:1}}>{lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lista pregleda */}
            <label style={{...labelStyle}}>PREGLED ({listaPregled.length} stavki)</label>
            <div style={{flex:1, border:`1px solid ${C.border}`, borderRadius:8, overflow:"auto", minHeight:100}}>
              {listaPregled.length===0 ? (
                <div style={{padding:20, textAlign:"center", color:C.border, fontSize:11}}>Nema snimljenih stavki</div>
              ) : listaPregled.map((s,i) => (
                <div key={i} style={{
                  padding:"7px 10px", borderBottom:`1px solid ${C.border}`,
                  background: s.status==="OK" ? C.ok : C.nok,
                  fontSize:11,
                }}>
                  <div style={{display:"flex", justifyContent:"space-between"}}>
                    <span style={{color: s.status==="OK" ? C.zelena : C.crvena, fontWeight:700}}>{s.status}</span>
                    <span style={{color:C.sivi}}>×{s.kolicina}</span>
                  </div>
                  <div style={{color:C.tekst, marginTop:2}}>{s.kat}</div>
                  <div style={{color:C.sivi}}>{s.pod}</div>
                </div>
              ))}
            </div>

            {/* Zapiši u bazu */}
            <button onClick={zapisiUBazu} disabled={listaPregled.length===0}
              style={{
                ...btnStyle("#7c3aed", listaPregled.length===0),
                fontSize:12, padding:"12px",
                boxShadow: listaPregled.length>0 ? "0 0 16px #7c3aed40" : "none",
              }}>
              💾  ZAPIŠI U BAZU
            </button>
          </div>
        </div>
      )}

      {/* ══ TAB: LOG PREGLED ═══════════════════════════════════════════════ */}
      {aktivan==="log" && (
        <div style={{padding:24}}>
          <div style={{color:C.sivi, fontSize:12, marginBottom:16}}>
            Ukupno snimljenih stavki u ovoj sesiji: <strong style={{color:C.tekst}}>{listaPregled.length}</strong>
          </div>
          <div style={{border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden"}}>
            <div style={{display:"grid", gridTemplateColumns:"80px 1fr 1fr 60px 60px", background:"#21262d", padding:"10px 14px", fontSize:11, color:C.sivi, gap:8}}>
              <span>DATUM</span><span>ID DEO</span><span>KATEGORIJA</span><span>STATUS</span><span>KOL.</span>
            </div>
            {listaPregled.length===0 ? (
              <div style={{padding:40, textAlign:"center", color:C.border, fontSize:12}}>Nema podataka za prikaz</div>
            ) : listaPregled.map((s,i) => (
              <div key={i} style={{
                display:"grid", gridTemplateColumns:"80px 1fr 1fr 60px 60px",
                padding:"9px 14px", borderTop:`1px solid ${C.border}`,
                background: s.status==="OK" ? "#0c2010" : "#1a0505", fontSize:12, gap:8,
              }}>
                <span style={{color:C.sivi}}>{s.datum}</span>
                <span style={{color:C.tekst}}>{s.idDeo}</span>
                <span style={{color:C.tekst}}>{s.kat} › {s.pod}</span>
                <span style={{color:s.status==="OK"?C.zelena:C.crvena, fontWeight:700}}>{s.status}</span>
                <span style={{color:C.sivi}}>×{s.kolicina}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ TAB: STATISTIKA SMENE ══════════════════════════════════════════ */}
      {aktivan==="smena" && (
        <div style={{padding:24, display:"flex", gap:20, flexWrap:"wrap"}}>
          {[
            {lbl:"UKUPNO MERENJA", val:smenaTotal, boja:C.plava},
            {lbl:"OK KOMADA",      val:smenaOK,    boja:C.zelena},
            {lbl:"NOK KOMADA",     val:smenaNOK,   boja:C.crvena},
            {lbl:"RTY %",          val:smenaTotal>0?((smenaOK/(smenaOK+smenaNOK)*100)||0).toFixed(1)+"%" : "-", boja:C.zuta},
          ].map(({lbl,val,boja})=>(
            <div key={lbl} style={{
              background:C.panel, border:`1px solid ${boja}30`,
              borderRadius:10, padding:"24px 32px", minWidth:180, textAlign:"center",
            }}>
              <div style={{color:boja, fontSize:40, fontWeight:700}}>{val}</div>
              <div style={{color:C.sivi, fontSize:11, letterSpacing:1.5, marginTop:6}}>{lbl}</div>
            </div>
          ))}
          {korisnik.uloga==="admin" && (
            <button onClick={()=>{
              setSmenaOK(0); setSmenaNOK(0); setSmenaTotal(0);
              setModal({poruka:"Statistika smene nulirana.", tip:"uspeh"});
            }} style={{
              ...btnStyle("#3d2c00"), border:`1px solid ${C.zuta}40`,
              color:C.zuta, fontSize:12, padding:"12px 24px", width:"auto", marginTop:"auto",
            }}>⚠ RESET SMENE (Admin)</button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function App() {
  const [korisnik, setKorisnik] = useState(null);
  return korisnik
    ? <UnosForma korisnik={korisnik} onOdjava={() => setKorisnik(null)} />
    : <LoginScreen onLogin={setKorisnik} />;
}
