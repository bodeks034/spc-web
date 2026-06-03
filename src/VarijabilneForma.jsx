import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  toDec, isStepen, validirajUnos, proveriOkNok, bojaMerenja,
  svaMerenjaZavrsena, imaBiloSta, grupeMerenja, koloneZaGrupu,
  formatLiveStep, filterKeyUnos,
} from "./lib/varijabilneUtils.js";
import { ucitajUrlSlike, lokalnaPutanjaSlike } from "./lib/slikePaths.js";
import MerljiveSpcKarte from "./MerljiveSpcKarte.jsx";
import MerljiveExcelPanel from "./MerljiveExcelPanel.jsx";

const SUPABASE_URL = "https://wzxkcomeurogvfisticq.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eGtjb21ldXJvZ3ZmaXN0aWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzM1MDYsImV4cCI6MjA5NTEwOTUwNn0.Oa17CJOr-Zep2UsG5n8N7kehuoJmHanNYaNy4VriDBk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

function danasSr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function prazneKolone(n) {
  return koloneZaGrupu([], "", "", n);
}

function CrtezZoomViewer({ url, C, visina, onFullscreen, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const pomerio = useRef(false);
  const downAt = useRef({ x: 0, y: 0 });

  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const btn = {
    background: C.hover,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    color: C.sivi,
    fontSize: 10,
    padding: "3px 9px",
    cursor: "pointer",
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 4, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" style={btn} onClick={() => setZoom(z => Math.min(6, z + 0.25))}>+</button>
        <span style={{ fontSize: 9, color: C.sivi, minWidth: 32, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
        <button type="button" style={btn} onClick={() => setZoom(z => Math.max(0.35, z - 0.25))}>−</button>
        <button type="button" style={btn} onClick={reset}>⊡</button>
        {onFullscreen && (
          <button type="button" style={btn} onClick={onFullscreen} title="Ceo ekran">⛶ Ceo ekran</button>
        )}
        {onClose && (
          <button type="button" style={{ ...btn, marginLeft: "auto", color: C.crvena }} onClick={onClose}>✕ Zatvori</button>
        )}
        {!onClose && onFullscreen && (
          <span style={{ fontSize: 8, color: C.border }}>·</span>
        )}
      </div>
      <div
        onWheel={e => {
          e.preventDefault();
          setZoom(z => Math.min(6, Math.max(0.35, z - e.deltaY * 0.001)));
        }}
        onMouseDown={e => {
          pomerio.current = false;
          downAt.current = { x: e.clientX, y: e.clientY };
          setDrag(true);
          setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }}
        onMouseMove={e => {
          if (!drag) return;
          const dx = e.clientX - downAt.current.x;
          const dy = e.clientY - downAt.current.y;
          if (Math.abs(dx) > 4 || Math.abs(dy) > 4) pomerio.current = true;
          setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }}
        onMouseUp={() => {
          if (drag && !pomerio.current && onFullscreen) onFullscreen();
          setDrag(false);
        }}
        onMouseLeave={() => setDrag(false)}
        title={onFullscreen ? "Klik — ceo ekran · prevuci — pomeri" : undefined}
        style={{
          flex: 1,
          minHeight: visina || 200,
          overflow: "hidden",
          background: C.input,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          cursor: drag ? "grabbing" : onFullscreen ? "pointer" : "grab",
          position: "relative",
          touchAction: "none",
        }}
      >
        <img
          src={url}
          alt="crtež dela"
          draggable={false}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
            maxWidth: "92%",
            maxHeight: "92%",
            objectFit: "contain",
            userSelect: "none",
            pointerEvents: "none",
          }}
          onError={e => { e.target.style.opacity = "0.3"; }}
        />
      </div>
    </div>
  );
}

export default function VarijabilneForma({ korisnik, onOdjava, onNazad, C }) {
  const [tab, setTab] = useState("unos");
  const [toasts, setToasts] = useState([]);
  const [logD, setLogD] = useState([]);
  const [loadLog, setLoadLog] = useState(false);
  const mozeAdmin = korisnik?.uloga === "admin";

  const addToast = useCallback((tekst, tip = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { tekst, tip, id }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  }, []);

  useEffect(() => {
    if (tab !== "log") return;
    let ok = true;
    (async () => {
      setLoadLog(true);
      const { data, error } = await supabase
        .from("merenja_varijabilna")
        .select("datum,smena,id_deo,pozicija,vrednost_raw,status,linija,kontrolor,created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (ok) {
        if (error) addToast(error.message, "greska");
        else setLogD(data || []);
        setLoadLog(false);
      }
    })();
    return () => { ok = false; };
  }, [tab, addToast]);

  const TABOVI = [
    ["unos", "UNOS"],
    ["karte", "SPC KARTE"],
    ["log", "LOG"],
    ...(mozeAdmin ? [["admin", "ADMIN"]] : []),
  ];
  const [datum, setDatum] = useState(danasSr());
  const [smena, setSmena] = useState("1");
  const [idDeo, setIdDeo] = useState("");
  const [radniNalog, setRadniNalog] = useState("");
  const [nazivDela, setNazivDela] = useState("");
  const [kontrolor, setKontrolor] = useState("");
  const [linija, setLinija] = useState("");
  const [masina, setMasina] = useState("");
  const [slika, setSlika] = useState("");
  const [potrebanBroj, setPotrebanBroj] = useState(5);
  const [grupaAB, setGrupaAB] = useState("");
  const [grupe, setGrupe] = useState([]);
  const [kolone, setKolone] = useState(() => prazneKolone(5));
  const [karakteristike, setKarakteristike] = useState([]);
  const [sopMap, setSopMap] = useState({});
  const [ucitava, setUcitava] = useState(true);
  const [greskaDb, setGreskaDb] = useState("");
  const [poruka, setPoruka] = useState("");
  const [snima, setSnima] = useState(false);
  const [sacuvaneGrupe, setSacuvaneGrupe] = useState([]);
  const [urlSlike, setUrlSlike] = useState(null);
  const [zoomSlika, setZoomSlika] = useState(false);

  const prethodniId = useRef("");
  const prethodniAB = useRef("");

  useEffect(() => {
    let ok = true;
    (async () => {
      setUcitava(true);
      setGreskaDb("");
      const [kRes, sRes] = await Promise.all([
        supabase.from("karakteristike_merljive").select("*").order("id"),
        supabase.from("sop_deo_varijabilni").select("*"),
      ]);
      if (!ok) return;
      if (kRes.error || sRes.error) {
        setGreskaDb(
          (kRes.error || sRes.error).message
          + " — pokreni 11_varijabilne_schema.sql i import CSV."
        );
        setUcitava(false);
        return;
      }
      setKarakteristike(kRes.data || []);
      const map = {};
      for (const s of sRes.data || []) {
        map[String(s.id_deo).toUpperCase()] = s;
      }
      setSopMap(map);
      setUcitava(false);
    })();
    return () => { ok = false; };
  }, []);

  const resetKolone = useCallback((broj) => {
    setKolone(prazneKolone(broj));
  }, []);

  const ucitajDeo = useCallback((sID) => {
    const id = String(sID || "").trim().toUpperCase();
    if (!id) return;

    const sop = sopMap[id];
    if (!sop) {
      setPoruka(`ID ${id} nije u SOP listi varijabilnih delova.`);
      return;
    }
    setPoruka("");
    setRadniNalog(sop.radni_nalog || "");
    setNazivDela(sop.naziv_dela || "");
    setKontrolor(sop.kontrolor_ime || korisnik?.ime || "");
    setLinija(sop.linija || "");
    setMasina(sop.masina || "");
    setSlika(sop.slika || "");
    const br = sop.broj_merenja || 5;
    setPotrebanBroj(br);
    setSacuvaneGrupe([]);

    const gs = grupeMerenja(karakteristike, id);
    setGrupe(gs);
    const ab = gs[0] || "";
    setGrupaAB(ab);
    prethodniAB.current = ab;
    setKolone(koloneZaGrupu(karakteristike, id, ab, br));
    prethodniId.current = id;
  }, [sopMap, karakteristike, korisnik]);

  useEffect(() => {
    if (!slika) { setUrlSlike(null); return; }
    let ok = true;
    ucitajUrlSlike(supabase, "merljive", slika).then(url => {
      if (ok) setUrlSlike(url || lokalnaPutanjaSlike("merljive", slika));
    });
    return () => { ok = false; };
  }, [slika]);

  /** Samo redom: A → B. Ručni skok na B dok A nije sačuvana — zabranjeno. */
  const indeksAktivne = grupe.indexOf(grupaAB);
  const mozeNaGrupu = (ab) => {
    const idx = grupe.indexOf(ab);
    if (idx < 0) return false;
    if (idx === indeksAktivne) return true;
    if (idx < indeksAktivne) return sacuvaneGrupe.includes(ab);
    return false;
  };

  const prebaciGrupu = (ab, force = false) => {
    if (!force && ab !== grupaAB) {
      const idxCilj = grupe.indexOf(ab);
      const idxTren = grupe.indexOf(grupaAB);
      if (idxCilj > idxTren && !svaMerenjaZavrsena(kolone, potrebanBroj)) {
        setPoruka(`Završi i sačuvaj seriju ${grupaAB} pre prelaska na ${ab}!`);
        return;
      }
      if (idxCilj > idxTren && !sacuvaneGrupe.includes(grupaAB)) {
        setPoruka(`Prvo sačuvaj seriju ${grupaAB}, pa prelazi na ${ab}.`);
        return;
      }
      if (!mozeNaGrupu(ab)) {
        setPoruka(`Serija ${ab} je još zaključana.`);
        return;
      }
    }
    if (prethodniAB.current && ab !== prethodniAB.current && !force) {
      if (!svaMerenjaZavrsena(kolone, potrebanBroj)) {
        setPoruka("Završi merenja u tekućoj seriji pre promene A/B!");
        return;
      }
    }
    setPoruka("");
    setGrupaAB(ab);
    prethodniAB.current = ab;
    setKolone(koloneZaGrupu(karakteristike, idDeo, ab, potrebanBroj));
  };

  const onIdChange = (v) => {
    const s = String(v || "").trim().toUpperCase();
    if (prethodniId.current && s !== prethodniId.current) {
      if (!svaMerenjaZavrsena(kolone, potrebanBroj)) {
        setPoruka("Moraš završiti sva merenja pre promene ID!");
        setIdDeo(prethodniId.current);
        return;
      }
    }
    setIdDeo(s);
    if (s) ucitajDeo(s);
    else {
      prethodniId.current = "";
      prethodniAB.current = "";
      setGrupe([]);
      setGrupaAB("");
      setSacuvaneGrupe([]);
      resetKolone(5);
    }
  };

  const onGrupaChange = (ab) => prebaciGrupu(ab);

  const mozeSacuvati = useMemo(
    () => svaMerenjaZavrsena(kolone, potrebanBroj) && idDeo,
    [kolone, potrebanBroj, idDeo]
  );
  const mozeObrisati = useMemo(() => imaBiloSta(kolone), [kolone]);

  const dodajMerenje = (idx) => {
    const k = kolone[idx];
    if (!k || k.naziv === "-") return;
    if (k.merenja.length >= potrebanBroj) {
      setPoruka(`Već ste uneli maksimalan broj merenja (${potrebanBroj})!`);
      return;
    }
    const val = validirajUnos(k.input, k.jedinica);
    if (!val.ok) {
      if (val.poruka) setPoruka(val.poruka);
      return;
    }
    setPoruka("");
    const status = proveriOkNok(val.vrednost, k.lslDec, k.uslDec);
    setKolone(prev => {
      const next = [...prev];
      const col = { ...next[idx] };
      col.merenja = [...col.merenja, { raw: val.vrednost, dec: val.dec }];
      if (status === "OK") col.cntOK += 1;
      else col.cntNOK += 1;
      col.input = "";
      col.ukupnoLabel = `${col.merenja.length} / ${potrebanBroj}`;
      next[idx] = col;
      return next;
    });
  };

  const obrisiPoslednje = () => {
    setKolone(prev => prev.map(k => {
      if (k.naziv === "-" || !k.merenja.length) return k;
      const col = { ...k };
      const last = col.merenja[col.merenja.length - 1];
      const st = proveriOkNok(last.raw, col.lslDec, col.uslDec);
      if (st === "OK") col.cntOK = Math.max(0, col.cntOK - 1);
      else col.cntNOK = Math.max(0, col.cntNOK - 1);
      col.merenja = col.merenja.slice(0, -1);
      col.ukupnoLabel = `${col.merenja.length} / ${potrebanBroj}`;
      return col;
    }));
  };

  const parsirajDatum = (d) => {
    const m = String(d).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return new Date().toISOString().slice(0, 10);
  };

  const sacuvaj = async () => {
    if (!mozeSacuvati || snima) return;
    setSnima(true);
    setPoruka("");
    const rows = [];
    for (const k of kolone) {
      if (k.naziv === "-") continue;
      for (const m of k.merenja) {
        rows.push({
          datum: parsirajDatum(datum),
          smena: Number(smena) || 1,
          radni_nalog: radniNalog,
          id_deo: idDeo,
          karakteristika_id: k.id,
          sifra_merenja: grupaAB,
          pozicija: k.naziv,
          vrednost_raw: m.raw,
          vrednost_dec: m.dec,
          status: proveriOkNok(m.raw, k.lslDec, k.uslDec),
          linija,
          kontrolor,
          operater: korisnik?.ime || "",
          merni_instrument: k.instrument,
          masina,
          radnik_id: korisnik?.radnikId || null,
        });
      }
    }
    const { error } = await supabase.from("merenja_varijabilna").insert(rows);
    setSnima(false);
    if (error) {
      setPoruka(error.message);
      return;
    }
    setPoruka(`Podaci za seriju ${grupaAB} su uspešno sačuvani!`);
    setSacuvaneGrupe(prev => [...prev, grupaAB]);

    const idx = grupe.indexOf(grupaAB);
    if (idx >= 0 && idx < grupe.length - 1) {
      const sledeca = grupe[idx + 1];
      prethodniAB.current = "";
      prebaciGrupu(sledeca, true);
      prethodniAB.current = sledeca;
    } else {
      setPoruka("Sva merenja za ovaj ID su kompletirana! Forma se resetuje.");
      setIdDeo("");
      setRadniNalog("");
      setNazivDela("");
      setLinija("");
      setMasina("-");
      setSlika("");
      prethodniId.current = "";
      prethodniAB.current = "";
      setGrupe([]);
      setGrupaAB("");
      setSacuvaneGrupe([]);
      resetKolone(5);
    }
  };

  const POLJE = Math.round(152 * (4 / 3));
  const KOLONE_GAP = 10;
  const slikaSirina = Math.round(Math.round(255 * (4 / 3)) * (4 / 5));

  const metaRed = (naslov, vrednost, accent) => (
    <div style={{ fontSize: 12, marginBottom: 5, lineHeight: 1.3, flexShrink: 0 }}>
      <span style={{ color: C.border, fontSize: 10, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {naslov}
      </span>
      <span style={{ color: accent || C.tekst, fontWeight: accent ? 600 : 400 }}>{vrednost || "—"}</span>
    </div>
  );

  const metaLevoDesno = (levoNaslov, levoVal, desnoNaslov, desnoVal, levoBoja, desnoBoja) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      gap: 8, marginBottom: 5, flexShrink: 0, fontSize: 12, lineHeight: 1.3,
    }}>
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <span style={{ color: C.border, fontSize: 10, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {levoNaslov}
        </span>
        <span style={{ color: levoBoja || C.tekst, fontWeight: 500 }}>{levoVal ?? "—"}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
        <span style={{ color: C.border, fontSize: 10, display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {desnoNaslov}
        </span>
        <span style={{ color: desnoBoja || C.tekst, fontWeight: 500 }}>{desnoVal ?? "—"}</span>
      </div>
    </div>
  );

  const lbl = { display: "block", fontSize: 11, color: C.sivi, marginBottom: 3 };

  const inp = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    padding: "8px 10px",
    fontSize: 13,
    width: "100%",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  const inpMerenje = {
    ...inp,
    padding: "11px 10px",
    minHeight: 46,
    fontSize: 15,
    fontWeight: 600,
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: C.bg,
      fontFamily: "'IBM Plex Mono', monospace",
      color: C.tekst,
    }}>
      {toasts.length > 0 && (
        <div style={{ position: "fixed", top: 12, right: 12, zIndex: 9999, display: "flex", flexDirection: "column", gap: 6 }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              background: t.tip === "greska" ? C.crvena : t.tip === "uspeh" ? C.zelena : C.plava,
              color: "#fff", padding: "10px 14px", borderRadius: 8, fontSize: 11, maxWidth: 320,
              whiteSpace: "pre-wrap", boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}>
              {t.tekst}
            </div>
          ))}
        </div>
      )}

      <div style={{
        background: C.panel, borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div style={{
          padding: "0 16px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={onNazad} style={{ background: "none", border: "none", color: C.sivi, cursor: "pointer" }}>←</button>
            <span style={{ color: C.zelena, fontWeight: 700, fontSize: 13 }}>± VARIJABILNE</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: C.sivi, fontSize: 11 }}>{korisnik?.ime}</span>
            <button type="button" onClick={onOdjava} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, color: C.sivi, fontSize: 10, padding: "3px 10px", cursor: "pointer" }}>Odjava</button>
          </div>
        </div>
        <div style={{ display: "flex", borderTop: `1px solid ${C.border}`, padding: "0 12px", flexWrap: "wrap" }}>
          {TABOVI.map(([id, naziv]) => (
            <button key={id} type="button" onClick={() => setTab(id)} style={{
              background: "none", border: "none",
              borderBottom: tab === id ? `2px solid ${id === "karte" ? C.narandzasta : id === "admin" ? C.zuta : C.zelena}` : "2px solid transparent",
              color: tab === id ? (id === "karte" ? C.narandzasta : id === "admin" ? C.zuta : C.zelena) : C.sivi,
              fontSize: 10, fontWeight: 700, padding: "8px 14px", cursor: "pointer", letterSpacing: 0.5,
            }}>
              {naziv}
            </button>
          ))}
        </div>
      </div>

      {tab === "karte" && (
        <MerljiveSpcKarte C={C} addToast={addToast} korisnik={korisnik} />
      )}

      {tab === "admin" && mozeAdmin && (
        <div style={{ flex: 1, overflow: "auto", padding: 20, maxWidth: 800, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
          <MerljiveExcelPanel C={C} addToast={addToast} />
        </div>
      )}

      {tab === "log" && (
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {loadLog ? (
            <div style={{ color: C.sivi, fontSize: 12 }}>Učitavam log…</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.sivi, textAlign: "left" }}>
                  {["Datum", "Smena", "ID", "Dimenzija", "Vrednost", "Status", "Linija"].map(h => (
                    <th key={h} style={{ padding: "6px 8px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logD.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.hover}` }}>
                    <td style={{ padding: "5px 8px" }}>{r.datum}</td>
                    <td style={{ padding: "5px 8px" }}>{r.smena}</td>
                    <td style={{ padding: "5px 8px" }}>{r.id_deo}</td>
                    <td style={{ padding: "5px 8px" }}>{r.pozicija}</td>
                    <td style={{ padding: "5px 8px" }}>{r.vrednost_raw}</td>
                    <td style={{ padding: "5px 8px", color: r.status === "NOK" ? C.crvena : C.zelena }}>{r.status}</td>
                    <td style={{ padding: "5px 8px" }}>{r.linija}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loadLog && !logD.length && (
            <div style={{ color: C.border, textAlign: "center", padding: 40 }}>Nema unosa</div>
          )}
        </div>
      )}

      {tab === "unos" && (
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "8px 12px 10px",
        minHeight: 0,
        overflow: "hidden",
        boxSizing: "border-box",
      }}>
        {greskaDb && (
          <div style={{ background: C.nok, border: `1px solid ${C.crvena}`, borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 11 }}>
            {greskaDb}
          </div>
        )}
        {ucitava && <div style={{ color: C.sivi, marginBottom: 8, fontSize: 11 }}>Učitavam karakteristike…</div>}
        {poruka && (
          <div style={{
            background: poruka.includes("uspešno") || poruka.includes("kompletirana") ? C.ok : `${C.zuta}20`,
            border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, marginBottom: 8, fontSize: 11,
          }}>
            {poruka}
          </div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 8,
          marginBottom: 6,
          flexShrink: 0,
        }}>
          <label style={lbl}>Datum<input style={inp} value={datum} onChange={e => setDatum(e.target.value)} /></label>
          <label style={lbl}>Smena
            <select style={inp} value={smena} onChange={e => setSmena(e.target.value)}>
              {["1", "2", "3"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={lbl}>ID deo *
            <input style={inp} value={idDeo} onChange={e => onIdChange(e.target.value)} placeholder="5502-A" />
          </label>
          <label style={lbl}>Radni nalog<input style={inp} value={radniNalog} readOnly /></label>
          <label style={lbl}>Naziv dela<input style={inp} value={nazivDela} readOnly /></label>
          <label style={lbl}>Linija<input style={inp} value={linija} readOnly /></label>
          <label style={lbl}>Kontrolor<input style={inp} value={kontrolor} readOnly /></label>
          <label style={lbl}>Mašina<input style={inp} value={masina || "-"} readOnly /></label>
          <label style={lbl}>Serija
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {grupe.map((g) => {
                const idx = grupe.indexOf(g);
                const aktivna = g === grupaAB;
                const zavrsena = sacuvaneGrupe.includes(g);
                const zakljucana = idx > indeksAktivne && !zavrsena;
                return (
                  <button
                    key={g}
                    type="button"
                    disabled={zakljucana}
                    onClick={() => !zakljucana && onGrupaChange(g)}
                    title={zakljucana ? `Prvo završi seriju ${grupe[idx - 1] || "prethodnu"}` : g}
                    style={{
                      ...inp,
                      width: "auto",
                      minWidth: 32,
                      padding: "3px 8px",
                      cursor: zakljucana ? "not-allowed" : "pointer",
                      opacity: zakljucana ? 0.4 : 1,
                      borderColor: aktivna ? C.zelena : zavrsena ? C.plava : C.border,
                      background: aktivna ? `${C.zelena}22` : C.input,
                      fontWeight: aktivna ? 700 : 400,
                    }}
                  >
                    {g}{zavrsena ? " ✓" : ""}
                  </button>
                );
              })}
              {!grupe.length && <span style={{ color: C.sivi, fontSize: 10 }}>—</span>}
            </div>
          </label>
        </div>

        {grupaAB && (
          <div style={{ fontSize: 10, color: C.zuta, marginBottom: 4, flexShrink: 0 }}>
            Serija {grupaAB}: unesi {potrebanBroj} merenja po koloni, pa Sačuvaj.
          </div>
        )}

        {zoomSlika && urlSlike && (
          <div
            role="presentation"
            onClick={() => setZoomSlika(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.88)",
              display: "flex", flexDirection: "column", padding: 16,
            }}
          >
            <div
              role="presentation"
              onClick={e => e.stopPropagation()}
              style={{
                flex: 1, background: C.panel, borderRadius: 10, border: `1px solid ${C.border}`,
                padding: 12, minHeight: 0, display: "flex", flexDirection: "column",
              }}
            >
              <CrtezZoomViewer
                url={urlSlike}
                C={C}
                onClose={() => setZoomSlika(false)}
              />
            </div>
          </div>
        )}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, gap: 8 }}>
        <div style={{
          flex: 1,
          display: "flex",
          gap: 12,
          alignItems: "stretch",
          minHeight: 0,
          overflowX: "auto",
          overflowY: "hidden",
        }}>
          <div style={{
            flex: "0 0 auto",
            display: "grid",
            gridTemplateColumns: `repeat(5, ${POLJE}px)`,
            gap: KOLONE_GAP,
            minHeight: 0,
            alignItems: "stretch",
            alignSelf: "stretch",
          }}>
              {kolone.map((k, i) => (
                <div key={i} style={{
                  background: C.panel,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: 10,
                  opacity: k.naziv === "-" ? 0.4 : 1,
                  width: POLJE,
                  boxSizing: "border-box",
                  height: "100%",
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                }}>
                  {k.naziv !== "-" ? (
                    <>
                      {metaRed("Šta se meri", k.naziv, C.plava)}
                      {k.nazivMere ? metaRed("Nominala / oznaka", k.nazivMere) : null}
                      {metaRed("Merni instrument", k.instrument)}
                      {metaRed("Broj merenja", k.ukupnoLabel, C.zuta)}
                      {metaLevoDesno("LSL", k.lslText, "USL", k.uslText)}
                    </>
                  ) : (
                    <div style={{ color: C.border, fontSize: 11, textAlign: "center", margin: "auto" }}>—</div>
                  )}
                  {k.naziv !== "-" && (
                    <>
                      <div style={{
                        color: C.border, fontSize: 10, textTransform: "uppercase",
                        letterSpacing: 0.5, marginTop: 6, marginBottom: 5, flexShrink: 0,
                      }}>
                        Unos merenja
                      </div>
                      <input
                        style={{
                          ...inpMerenje,
                          marginBottom: 8,
                          flexShrink: 0,
                          background: bojaMerenja(k.input, k.lslDec, k.uslDec, k.jedinica, C),
                        }}
                        value={k.input}
                        onChange={e => {
                          let v = e.target.value;
                          if (isStepen(k.jedinica)) v = formatLiveStep(v);
                          setKolone(prev => {
                            const next = [...prev];
                            next[i] = { ...next[i], input: v };
                            return next;
                          });
                        }}
                        onKeyDown={e => {
                          const f = filterKeyUnos(e.key, k.input, k.jedinica);
                          if (f === null && e.key.length === 1) e.preventDefault();
                          if (e.key === "Enter") { e.preventDefault(); dodajMerenje(i); }
                        }}
                        placeholder={isStepen(k.jedinica) ? "454500" : "0,00"}
                      />
                      <button type="button" onClick={() => dodajMerenje(i)}
                        style={{ width: "100%", background: C.plava, border: "none", borderRadius: 5, color: "#fff", padding: "8px 0", cursor: "pointer", fontSize: 13, marginBottom: 8, flexShrink: 0 }}>
                        + Dodaj
                      </button>
                      {metaLevoDesno("NOK", k.cntNOK, "OK", k.cntOK, C.crvena, C.zelena)}
                      <ul style={{
                        listStyle: "none", padding: 0, margin: "6px 0 0", flex: 1,
                        minHeight: 0, overflow: "auto", fontSize: 12,
                      }}>
                        {k.merenja.map((m, j) => (
                          <li key={j} style={{
                            padding: "1px 0",
                            color: proveriOkNok(m.raw, k.lslDec, k.uslDec) === "OK" ? C.zelena : C.crvena,
                          }}>
                            {m.raw}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ))}
          </div>

          <aside style={{
            flex: `0 0 ${slikaSirina}px`,
            width: slikaSirina,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            alignSelf: "stretch",
            height: "100%",
          }}>
            <div style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              width: slikaSirina,
              height: "100%",
              boxSizing: "border-box",
              padding: 6,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}>
              <div style={{ fontSize: 9, color: C.sivi, marginBottom: 4, textAlign: "center", flexShrink: 0 }}>
                Crtež · klik = ceo ekran
              </div>
              {urlSlike ? (
                <CrtezZoomViewer
                  url={urlSlike}
                  C={C}
                  onFullscreen={() => setZoomSlika(true)}
                />
              ) : (
                <div style={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: C.border,
                  fontSize: 10,
                  textAlign: "center",
                  padding: 8,
                  background: C.input,
                  borderRadius: 6,
                  border: `1px solid ${C.border}`,
                }}>
                  {idDeo ? (slika ? "Nije učitana" : "Nema crteža") : "Unesi ID"}
                </div>
              )}
            </div>
          </aside>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
          <button type="button" disabled={!mozeSacuvati || snima || !!greskaDb} onClick={sacuvaj}
            style={{
              background: mozeSacuvati ? C.zelena : C.hover, border: "none", borderRadius: 6,
              color: "#fff", padding: "10px 18px", cursor: mozeSacuvati ? "pointer" : "not-allowed",
              fontWeight: 700, fontSize: 12,
            }}>
            {snima ? "Snimam…" : "Sačuvaj seriju"}
          </button>
          <button type="button" disabled={!mozeObrisati} onClick={obrisiPoslednje}
            style={{
              background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.tekst, padding: "8px 14px", cursor: mozeObrisati ? "pointer" : "not-allowed",
              fontSize: 11,
            }}>
            Obriši poslednje
          </button>
        </div>
        </div>
      </div>
      )}
    </div>
  );
}
