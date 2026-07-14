import { useState, useRef, useEffect, useCallback } from "react";
import {
  parsirajTekstMerila,
  uvozListeUKolone,
  citajSerialMerilo,
  citajBluetoothMerilo,
  pokreniWifiPollingMerilo,
  pokreniWifiWebSocketMerilo,
  indeksSledecePrazno,
  dodajMerenjeUKolonu,
  MERILO_NACINI,
  MERILO_BAUD,
} from "../lib/meriloUvoz.js";
import MeriloBarkodUputstvo from "./MeriloBarkodUputstvo.jsx";

const TEST_MERENJA = ["12.340", "12.355", "12.348", "12.362", "12.351", "12.338", "12.345"];

export default function DigitalnoMeriloPanel({
  C,
  kolone,
  setKolone,
  potrebanBroj,
  aktivnaKolona,
  setAktivnaKolona,
  addToast,
  kompakt,
  onPovezanChange,
  registerStop,
  registerSimuliraj,
  autoSnimi = false,
  onAutoSnimiChange,
  onMerenjeDodato,
}) {
  const [nacin, setNacin] = useState("serial");
  const [paste, setPaste] = useState("");
  const [povezan, setPovezan] = useState(false);
  const [simulacijaAktivan, setSimulacijaAktivan] = useState(false);
  const [statusTekst, setStatusTekst] = useState("");
  const [baud, setBaud] = useState(9600);
  const [wifiUrl, setWifiUrl] = useState(
    () => localStorage.getItem("merilo_wifi_url") || "http://192.168.1.50:8080/reading",
  );
  const [wifiWsUrl, setWifiWsUrl] = useState(
    () => localStorage.getItem("merilo_wifi_ws") || "ws://192.168.1.50:8080/stream",
  );
  const [poslednje, setPoslednje] = useState([]);
  const [pomoc, setPomoc] = useState(false);
  const abortRef = useRef(null);
  const stopWifiRef = useRef(null);
  const testIdxRef = useRef(0);
  const aktivnaRef = useRef(aktivnaKolona);
  aktivnaRef.current = aktivnaKolona;

  const onLinija = useCallback((p) => {
    let sledecaIdx = aktivnaRef.current;
    setKolone((prev) => {
      const idx = aktivnaRef.current >= 0
        ? aktivnaRef.current
        : indeksSledecePrazno(prev, potrebanBroj, 0);
      if (idx < 0) {
        addToast?.("Nema praznih mesta za merenje", "greska");
        return prev;
      }
      const raw = p?.vrednost ?? p;
      const res = dodajMerenjeUKolonu(prev, idx, raw, potrebanBroj);
      if (res.greska) {
        addToast?.(res.greska, "greska");
        return prev;
      }
      const col = res.kolone[idx];
      const merIdx = (col?.merenja?.length || 1) - 1;
      const lastM = col?.merenja?.[merIdx];
      if (lastM && onMerenjeDodato) {
        onMerenjeDodato({
          colIdx: idx,
          merIdx,
          kolona: res.kolona,
          status: res.status,
          raw: lastM.raw,
          dec: lastM.dec,
          k: col,
        });
      }
      sledecaIdx = col?.merenja?.length >= potrebanBroj
        ? indeksSledecePrazno(res.kolone, potrebanBroj, idx + 1)
        : idx;
      setPoslednje((q) => [{ kolona: res.kolona, v: raw, t: Date.now() }, ...q].slice(0, 8));
      addToast?.(`+ ${res.kolona}: ${raw}`, "uspeh");
      return res.kolone;
    });
    if (sledecaIdx >= 0 && sledecaIdx !== aktivnaRef.current) {
      setAktivnaKolona(sledecaIdx);
    }
  }, [potrebanBroj, setKolone, setAktivnaKolona, addToast, onMerenjeDodato]);

  const stopSve = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopWifiRef.current?.();
    stopWifiRef.current = null;
    setPovezan(false);
    setSimulacijaAktivan(false);
    setStatusTekst("");
  }, []);

  useEffect(() => () => stopSve(), [stopSve]);

  const start = async () => {
    stopSve();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    const onStatus = (tip, msg) => setStatusTekst(`${tip}: ${msg}`);
    const onGreska = (msg) => addToast?.(msg, "greska");

    try {
      if (nacin === "serial") {
        setPovezan(true);
        await citajSerialMerilo({
          onLinija,
          onGreska,
          onStatus,
          signal,
          baudRate: baud,
        });
      } else if (nacin === "bluetooth") {
        setPovezan(true);
        await citajBluetoothMerilo({ onLinija, onGreska, onStatus, signal });
      } else if (nacin === "wifi") {
        localStorage.setItem("merilo_wifi_url", wifiUrl);
        setPovezan(true);
        stopWifiRef.current = pokreniWifiPollingMerilo({
          url: wifiUrl,
          onLinija,
          onGreska,
          onStatus,
          signal,
        });
        return;
      } else if (nacin === "wifi_ws") {
        localStorage.setItem("merilo_wifi_ws", wifiWsUrl);
        setPovezan(true);
        stopWifiRef.current = pokreniWifiWebSocketMerilo({
          url: wifiWsUrl,
          onLinija,
          onGreska,
          onStatus,
          signal,
        });
        return;
      } else if (nacin === "simulacija") {
        setPovezan(true);
        setSimulacijaAktivan(true);
        setStatusTekst("simulacija: aktivna");
        addToast?.("Simulacija merila — koristi 📤 u headeru za test vrednosti", "info");
        return;
      }
    } catch (e) {
      if (e.name !== "AbortError" && !String(e.message || "").includes("cancel")) {
        addToast?.(e.message || "Povezivanje prekinuto", "greska");
      }
      stopSve();
    } finally {
      if (nacin === "serial" || nacin === "bluetooth") stopSve();
    }
  };

  const uvozPaste = () => {
    const lista = parsirajTekstMerila(paste);
    if (!lista.length) {
      addToast?.("Nema prepoznatih vrednosti", "greska");
      return;
    }
    let sledecaIdx = aktivnaKolona;
    setKolone((prev) => {
      const { kolone: k, uneto, greske } = uvozListeUKolone(
        prev,
        lista,
        potrebanBroj,
        aktivnaKolona >= 0 ? aktivnaKolona : 0,
      );
      sledecaIdx = indeksSledecePrazno(k, potrebanBroj, 0);
      addToast?.(
        `Uvezeno ${uneto.length} merenja${greske.length ? ` (${greske.length} grešaka)` : ""}`,
        "uspeh",
      );
      setPoslednje(uneto.map((u) => ({ kolona: u.kolona, v: u.vrednost, t: Date.now() })));
      return k;
    });
    if (sledecaIdx >= 0) setAktivnaKolona(sledecaIdx);
    setPaste("");
  };

  const onFajl = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPaste(String(reader.result || ""));
      setNacin("uvoz");
      addToast?.(`Učitan fajl ${f.name} — klikni Uvezi`, "info");
    };
    reader.readAsText(f);
    e.target.value = "";
  };

  const posaljiTestMerenje = useCallback(() => {
    const v = TEST_MERENJA[testIdxRef.current % TEST_MERENJA.length];
    testIdxRef.current += 1;
    onLinija({ vrednost: v });
  }, [onLinija]);

  const povezanAktivan = povezan && nacin !== "uvoz";

  useEffect(() => {
    onPovezanChange?.(povezanAktivan, { simulacija: simulacijaAktivan, nacin });
  }, [povezanAktivan, simulacijaAktivan, nacin, onPovezanChange]);

  useEffect(() => {
    registerStop?.(stopSve);
    return () => registerStop?.(null);
  }, [registerStop, stopSve]);

  useEffect(() => {
    registerSimuliraj?.(simulacijaAktivan ? posaljiTestMerenje : null);
    return () => registerSimuliraj?.(null);
  }, [registerSimuliraj, simulacijaAktivan, posaljiTestMerenje]);

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

  if (povezanAktivan) return null;

  const prikaziUvoz = nacin === "uvoz";
  const prikaziStart = nacin !== "uvoz";

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.plava}40`,
      borderRadius: 8,
      padding: kompakt ? 10 : 12,
      marginBottom: 10,
      flexShrink: 0,
    }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ color: C.plava, fontSize: 9, letterSpacing: 1.2, fontWeight: 700 }}>
          DIGITALNO MERILO · AUTOMATSKI UPIS
        </div>
        <button
          type="button"
          onClick={() => setPomoc((v) => !v)}
          style={{
            background: "none", border: `1px solid ${C.border}`, borderRadius: 4,
            color: C.plava, fontSize: 9, padding: "2px 8px", cursor: "pointer",
          }}
        >
          {pomoc ? "×" : "?"}
        </button>
      </div>

      {pomoc && (
        <div style={{ marginBottom: 8 }}>
          <MeriloBarkodUputstvo C={C} defaultOpen kompakt />
          <div style={{ color: C.sivi, fontSize: 9, lineHeight: 1.5, marginTop: 8, padding: 8, background: C.hover, borderRadius: 6 }}>
            <strong style={{ color: C.tekst }}>USB/Serial:</strong> Chrome/Edge, baud kao na merilu (često 9600).<br />
            <strong style={{ color: C.tekst }}>Bluetooth:</strong> BLE UART — Mitutoyo U-Wave, Mahr i slični wireless moduli.<br />
            <strong style={{ color: C.tekst }}>WiFi:</strong> lokalni gateway koji vraća broj ili JSON (CORS mora dozvoliti app).<br />
            <strong style={{ color: C.tekst }}>Fajl/paste:</strong> izvoz sa merila ili HID wedge (Enter posle broja).
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {MERILO_NACINI.map((n) => (
          <button
            key={n.id}
            type="button"
            title={n.opis}
            onClick={() => setNacin(n.id)}
            style={{
              ...btn,
              borderColor: nacin === n.id ? C.plava : C.border,
              color: nacin === n.id ? C.plava : C.sivi,
              background: nacin === n.id ? `${C.plava}15` : C.hover,
            }}
          >
            {n.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <label style={{ color: C.sivi, fontSize: 9 }}>Aktivna dimenzija:</label>
        <select
          value={aktivnaKolona}
          onChange={(e) => setAktivnaKolona(Number(e.target.value))}
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

      {nacin === "serial" && prikaziStart && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <label style={{ color: C.sivi, fontSize: 9 }}>Baud:</label>
          <select
            value={baud}
            onChange={(e) => setBaud(Number(e.target.value))}
            style={{
              background: C.input, border: `1px solid ${C.border}`, borderRadius: 4,
              color: C.tekst, fontSize: 10, padding: "4px 6px", fontFamily: "inherit",
            }}
          >
            {MERILO_BAUD.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      )}

      {nacin === "wifi" && (
        <div style={{ marginBottom: 8 }}>
          <input
            value={wifiUrl}
            onChange={(e) => setWifiUrl(e.target.value)}
            placeholder="http://192.168.1.50:8080/reading"
            style={{
              width: "100%", boxSizing: "border-box", background: C.input,
              border: `1px solid ${C.border}`, borderRadius: 4, color: C.tekst,
              fontSize: 10, padding: "6px 8px", fontFamily: "inherit",
            }}
          />
        </div>
      )}

      {nacin === "wifi_ws" && (
        <div style={{ marginBottom: 8 }}>
          <input
            value={wifiWsUrl}
            onChange={(e) => setWifiWsUrl(e.target.value)}
            placeholder="ws://192.168.1.50:8080/stream"
            style={{
              width: "100%", boxSizing: "border-box", background: C.input,
              border: `1px solid ${C.border}`, borderRadius: 4, color: C.tekst,
              fontSize: 10, padding: "6px 8px", fontFamily: "inherit",
            }}
          />
        </div>
      )}

      {prikaziStart && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <button
            type="button"
            onClick={start}
            style={{ ...btn, borderColor: C.zelena, color: C.zelena }}
          >
            ▶ Poveži {MERILO_NACINI.find((n) => n.id === nacin)?.label || nacin}
          </button>
          {onAutoSnimiChange && (
            <label style={{
              display: "flex", alignItems: "center", gap: 5,
              fontSize: 9, color: C.sivi, cursor: "pointer", userSelect: "none",
            }}
            >
              <input
                type="checkbox"
                checked={autoSnimi}
                onChange={(e) => onAutoSnimiChange(e.target.checked)}
              />
              Auto u bazu (OK)
            </label>
          )}
        </div>
      )}

      {prikaziUvoz && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <label style={{ ...btn, display: "inline-block" }}>
              📄 Fajl
              <input type="file" accept=".txt,.csv,.dat" onChange={onFajl} style={{ display: "none" }} />
            </label>
          </div>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"Nalepi izvoz sa merila:\n12.345\n12,401\nD1;12.5"}
            style={{
              width: "100%", minHeight: 56, background: C.input, border: `1px solid ${C.border}`,
              borderRadius: 6, color: C.tekst, fontSize: 11, padding: 8, fontFamily: "inherit",
              boxSizing: "border-box", marginBottom: 6,
            }}
          />
          <button
            type="button"
            onClick={uvozPaste}
            style={{ ...btn, background: C.zelena, color: C.onAkcent, border: "none" }}
          >
            Uvezi u kolone
          </button>
        </>
      )}

      {statusTekst && (
        <div style={{ marginTop: 6, fontSize: 9, color: C.sivi }}>{statusTekst}</div>
      )}

      {poslednje.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 9, color: C.sivi }}>
          Poslednje: {poslednje.map((p, i) => (
            <span key={i} style={{ marginRight: 8 }}>{p.kolona}={p.v}</span>
          ))}
        </div>
      )}

      <div style={{ color: C.border, fontSize: 8, marginTop: 8, lineHeight: 1.4 }}>
        Merenja su na ekranu odmah
        {autoSnimi ? " i OK odmah u bazu" : ""}
        ; ostalo (NOK, KPI, zatvaranje serije) — <strong style={{ color: C.tekst }}>Sačuvaj seriju</strong>.
        Chrome/Edge za USB i Bluetooth.
      </div>
    </div>
  );
}
