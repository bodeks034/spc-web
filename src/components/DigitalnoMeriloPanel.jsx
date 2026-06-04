import { useState, useRef, useEffect, useCallback } from "react";
import {
  parsirajTekstMerila,
  uvozListeUKolone,
  citajSerialMerilo,
  indeksSledecePrazno,
  dodajMerenjeUKolonu,
} from "../lib/meriloUvoz.js";
import MeriloBarkodUputstvo from "./MeriloBarkodUputstvo.jsx";

const BAUD_OPCIJE = [4800, 9600, 19200, 38400, 115200];

export default function DigitalnoMeriloPanel({
  C,
  kolone,
  setKolone,
  potrebanBroj,
  aktivnaKolona,
  setAktivnaKolona,
  addToast,
  kompakt,
}) {
  const [paste, setPaste] = useState("");
  const [serialAktivan, setSerialAktivan] = useState(false);
  const [baud, setBaud] = useState(9600);
  const [poslednje, setPoslednje] = useState([]);
  const [pomoc, setPomoc] = useState(false);
  const abortRef = useRef(null);
  const aktivnaRef = useRef(aktivnaKolona);
  aktivnaRef.current = aktivnaKolona;

  const koloneMer = kolone.filter(k => k.naziv !== "-");

  useEffect(() => () => {
    abortRef.current?.abort();
  }, []);

  const onLinija = useCallback((p) => {
    setKolone(prev => {
      const idx = aktivnaRef.current >= 0
        ? aktivnaRef.current
        : indeksSledecePrazno(prev, potrebanBroj, 0);
      if (idx < 0) {
        addToast?.("Nema praznih mesta za merenje", "greska");
        return prev;
      }
      const res = dodajMerenjeUKolonu(prev, idx, p.vrednost, potrebanBroj);
      if (res.greska) {
        addToast?.(res.greska, "greska");
        return prev;
      }
      setPoslednje(q => [{ kolona: res.kolona, v: p.vrednost, t: Date.now() }, ...q].slice(0, 8));
      addToast?.(`+ ${res.kolona}: ${p.vrednost}`, "uspeh");
      return res.kolone;
    });
  }, [potrebanBroj, setKolone, addToast]);

  const uvozPaste = () => {
    const lista = parsirajTekstMerila(paste);
    if (!lista.length) {
      addToast?.("Nema prepoznatih vrednosti", "greska");
      return;
    }
    setKolone(prev => {
      const { kolone: k, uneto, greske } = uvozListeUKolone(
        prev,
        lista,
        potrebanBroj,
        aktivnaKolona >= 0 ? aktivnaKolona : 0,
      );
      addToast?.(`Uvezeno ${uneto.length} merenja${greske.length ? ` (${greske.length} grešaka)` : ""}`, "uspeh");
      setPoslednje(uneto.map(u => ({ kolona: u.kolona, v: u.vrednost, t: Date.now() })));
      return k;
    });
    setPaste("");
  };

  const onFajl = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPaste(String(reader.result || ""));
      addToast?.(`Učitan fajl ${f.name} — klikni Uvezi`, "info");
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  const startSerial = async () => {
    if (!navigator.serial) {
      addToast?.("Web Serial: koristi Chrome ili Edge na HTTPS/localhost", "greska");
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setSerialAktivan(true);
    try {
      await citajSerialMerilo({
        onLinija: onLinija,
        onGreska: msg => addToast?.(msg, "greska"),
        signal: abortRef.current.signal,
        baudRate: baud,
      });
    } catch (e) {
      if (e.name !== "AbortError" && !e.message?.includes("cancel")) {
        addToast?.(e.message || "Serial prekinut", "greska");
      }
    } finally {
      setSerialAktivan(false);
    }
  };

  const stopSerial = () => {
    abortRef.current?.abort();
    setSerialAktivan(false);
  };

  const btn = {
    background: C.hover,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 10,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.plava}40`,
      borderRadius: 8,
      padding: kompakt ? 10 : 12,
      marginBottom: 10,
      flexShrink: 0,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ color: C.plava, fontSize: 9, letterSpacing: 1.2 }}>
          DIGITALNO MERILO · USB / SERIAL · UVOZ
        </div>
        <button
          type="button"
          onClick={() => setPomoc(v => !v)}
          style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: 4,
            color: C.plava, fontSize: 9, padding: "2px 8px", cursor: "pointer",
          }}
        >
          {pomoc ? "Sakrij uputstvo" : "Uputstvo"}
        </button>
      </div>
      {pomoc && <div style={{ marginBottom: 8 }}><MeriloBarkodUputstvo C={C} defaultOpen kompakt /></div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <label style={{ color: C.sivi, fontSize: 9 }}>Aktivna dimenzija:</label>
        <select
          value={aktivnaKolona}
          onChange={e => setAktivnaKolona(Number(e.target.value))}
          style={{
            background: C.input, border: `1px solid ${C.border}`, borderRadius: 4,
            color: C.tekst, fontSize: 10, padding: "4px 8px", fontFamily: "inherit",
          }}
        >
          <option value={-1}>Auto (sledeća prazna)</option>
          {kolone.map((k, i) => k.naziv !== "-" && (
            <option key={i} value={i}>
              {k.naziv} ({k.merenja.length}/{potrebanBroj})
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
        <label style={{ color: C.sivi, fontSize: 9 }}>Baud:</label>
        <select
          value={baud}
          disabled={serialAktivan}
          onChange={e => setBaud(Number(e.target.value))}
          style={{
            background: C.input, border: `1px solid ${C.border}`, borderRadius: 4,
            color: C.tekst, fontSize: 10, padding: "4px 6px", fontFamily: "inherit",
          }}
        >
          {BAUD_OPCIJE.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        {!serialAktivan ? (
          <button type="button" style={{ ...btn, borderColor: C.zelena, color: C.zelena }} onClick={startSerial}>
            ▶ Poveži serial
          </button>
        ) : (
          <button type="button" style={{ ...btn, borderColor: C.crvena, color: C.crvena }} onClick={stopSerial}>
            ■ Prekini serial
          </button>
        )}
        <label style={{ ...btn, display: "inline-block" }}>
          📄 Fajl
          <input type="file" accept=".txt,.csv,.dat" onChange={onFajl} style={{ display: "none" }} />
        </label>
      </div>

      <textarea
        value={paste}
        onChange={e => setPaste(e.target.value)}
        placeholder={"Nalepi izvoz sa merila:\n12.345\n12,401\nD1;12.5"}
        style={{
          width: "100%", minHeight: 56, background: C.input, border: `1px solid ${C.border}`,
          borderRadius: 6, color: C.tekst, fontSize: 11, padding: 8, fontFamily: "inherit",
          boxSizing: "border-box", marginBottom: 6,
        }}
      />
      <button type="button" onClick={uvozPaste} style={{ ...btn, background: C.zelena, color: "#fff", border: "none" }}>
        Uvezi u kolone
      </button>

      {poslednje.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 9, color: C.sivi }}>
          Poslednje: {poslednje.map((p, i) => (
            <span key={i} style={{ marginRight: 8 }}>{p.kolona}={p.v}</span>
          ))}
        </div>
      )}

      <div style={{ color: C.border, fontSize: 8, marginTop: 8, lineHeight: 1.4 }}>
        Merenja su na ekranu odmah; u Supabase idu posle <strong style={{ color: C.tekst }}>Sačuvaj seriju</strong>.
        SPC karte (tab Merljive) koriste ta sačuvana merenja. Serial: Chrome/Edge, baud kao na merilu.
      </div>
    </div>
  );
}
