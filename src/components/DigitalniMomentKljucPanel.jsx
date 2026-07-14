import { useState, useRef, useEffect, useCallback } from "react";
import {
  MOMENT_KLJUC_BAUD,
  MOMENT_KLJUC_NACINI,
  citajSerialMomentKljuc,
  citajBluetoothMomentKljuc,
  pokreniWifiPollingMomentKljuc,
  pokreniWifiWebSocketMomentKljuc,
  parsirajOdcitavanjeMomentKljuca,
  parsirajTekstMomentKljuca,
} from "../lib/momentKljucUvoz.js";
import { MOMENT_VENDOR_NAZIV } from "../lib/momentKljuc.js";
import { PRIKAZ_EKRANA_KLJUCA } from "../lib/momentDijagramHotspot.js";
import { lokalnaPutanjaMomentDijagram } from "../lib/crtezAssets.js";

export default function DigitalniMomentKljucPanel({
  C,
  addToast,
  kompakt,
  vendorProfil = "generic",
  ciljNm = null,
  onOdcitavanje,
  onPovezanChange,
  autoSnimi = false,
  onAutoSnimiChange,
  suzi = false,
  prikaziRucniUvoz = false,
  bezZaglavlja = false,
}) {
  const [sakrijPanel, setSakrijPanel] = useState(suzi);
  const [nacin, setNacin] = useState(() => (kompakt ? "uvoz" : "serial"));
  const [baud, setBaud] = useState(9600);
  const [wifiUrl, setWifiUrl] = useState(() => localStorage.getItem("moment_wifi_url") || "http://192.168.1.50:8080/torque");
  const [wifiWsUrl, setWifiWsUrl] = useState(() => localStorage.getItem("moment_wifi_ws") || "ws://192.168.1.50:8080/stream");
  const [povezan, setPovezan] = useState(false);
  const [statusTekst, setStatusTekst] = useState("");
  const [paste, setPaste] = useState("");
  const [poslednje, setPoslednje] = useState([]);
  const [pomoc, setPomoc] = useState(false);
  const abortRef = useRef(null);
  const stopWifiRef = useRef(null);
  const simIntervalRef = useRef(null);

  const vendor = vendorProfil || "generic";

  const primiOdcitavanje = useCallback((p) => {
    if (p?.nm == null) return;
    setPoslednje((q) => [{ nm: p.nm, ugao: p.ugao, t: Date.now(), raw: p.raw }, ...q].slice(0, 6));
    onOdcitavanje?.(p);
    addToast?.(`Ključ: ${p.nm} Nm${p.ugao != null ? ` · ${p.ugao}°` : ""}`, "uspeh");
  }, [onOdcitavanje, addToast]);

  const stopSve = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopWifiRef.current?.();
    stopWifiRef.current = null;
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setPovezan(false);
    setStatusTekst("");
    onPovezanChange?.(false, null);
  }, [onPovezanChange]);

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
        onPovezanChange?.(true, "serial");
        await citajSerialMomentKljuc({
          onOdcitavanje: primiOdcitavanje,
          onGreska,
          onStatus,
          signal,
          baudRate: baud,
          vendorProfil: vendor,
        });
      } else if (nacin === "bluetooth") {
        setPovezan(true);
        onPovezanChange?.(true, "bluetooth");
        await citajBluetoothMomentKljuc({
          onOdcitavanje: primiOdcitavanje,
          onGreska,
          onStatus,
          signal,
          vendorProfil: vendor,
        });
      } else if (nacin === "wifi") {
        localStorage.setItem("moment_wifi_url", wifiUrl);
        setPovezan(true);
        onPovezanChange?.(true, "wifi");
        stopWifiRef.current = pokreniWifiPollingMomentKljuc({
          url: wifiUrl,
          onOdcitavanje: primiOdcitavanje,
          onGreska,
          onStatus,
          signal,
          vendorProfil: vendor,
        });
        return;
      } else if (nacin === "wifi_ws") {
        localStorage.setItem("moment_wifi_ws", wifiWsUrl);
        setPovezan(true);
        onPovezanChange?.(true, "wifi_ws");
        stopWifiRef.current = pokreniWifiWebSocketMomentKljuc({
          url: wifiWsUrl,
          onOdcitavanje: primiOdcitavanje,
          onGreska,
          onStatus,
          signal,
          vendorProfil: vendor,
        });
        return;
      } else if (nacin === "simulacija") {
        setPovezan(true);
        onPovezanChange?.(true, "simulacija");
        setStatusTekst("simulacija: aktivna");
        const baza = Number(ciljNm) || 40;
        simIntervalRef.current = setInterval(() => {
          if (signal.aborted) return;
          const odst = (Math.random() - 0.5) * (baza * 0.08);
          primiOdcitavanje({
            nm: Math.round((baza + odst) * 10) / 10,
            ugao: Math.random() > 0.7 ? 90 : null,
            status: "OK",
            raw: "SIM",
            vendor: "simulacija",
          });
        }, 4000);
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
    const lista = parsirajTekstMomentKljuca(paste, vendor);
    if (!lista.length) {
      const jedan = parsirajOdcitavanjeMomentKljuca(paste, vendor);
      if (jedan) {
        primiOdcitavanje(jedan);
        setPaste("");
        return;
      }
      addToast?.("Nema prepoznatih Nm vrednosti", "greska");
      return;
    }
    const poslednji = lista[lista.length - 1];
    primiOdcitavanje(poslednji);
    setPaste("");
  };

  const onFajl = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPaste(String(reader.result || ""));
      addToast?.(`Učitan ${f.name} — klikni Uvezi`, "info");
    };
    reader.readAsText(f);
    e.target.value = "";
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

  const akcent = C.ljubicasta || "#a78bfa";

  if (povezan && nacin !== "uvoz") {
    return (
      <div style={{
        background: `${akcent}12`,
        border: `1px solid ${akcent}55`,
        borderRadius: 8,
        padding: kompakt ? 4 : 8,
        marginBottom: suzi ? 3 : 10,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
        flexShrink: 0,
      }}
      >
        <div style={{ color: akcent, fontSize: 10, fontWeight: 700 }}>
          ● KLJUČ ({MOMENT_KLJUC_NACINI.find((n) => n.id === nacin)?.label || nacin})
          {statusTekst && <span style={{ color: C.sivi, fontWeight: 400 }}> · {statusTekst}</span>}
        </div>
        <button type="button" onClick={stopSve} style={{ ...btn, borderColor: C.crvena, color: C.crvena, padding: "4px 8px" }}>
          Prekini
        </button>
      </div>
    );
  }

  if (suzi && sakrijPanel) {
    return (
      <button
        type="button"
        onClick={() => setSakrijPanel(false)}
        style={{
          background: C.panel,
          border: `1px solid ${akcent}40`,
          borderRadius: 6,
          color: akcent,
          fontSize: 10,
          fontWeight: 700,
          padding: "4px 8px",
          cursor: "pointer",
          textAlign: "left",
          flexShrink: 0,
        }}
      >
        🔌 Poveži momentni ključ ▼
      </button>
    );
  }

  return (
    <div style={{
      background: bezZaglavlja ? "transparent" : C.panel,
      border: bezZaglavlja ? "none" : `1px solid ${akcent}40`,
      borderRadius: bezZaglavlja ? 0 : 8,
      padding: bezZaglavlja ? 0 : (kompakt ? 8 : 12),
      marginBottom: bezZaglavlja ? 0 : (suzi ? 4 : 10),
      flexShrink: suzi ? 0 : undefined,
    }}
    >
      {!bezZaglavlja && (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ color: akcent, fontSize: 9, letterSpacing: 0.8, fontWeight: 700 }}>
          AUTOMATSKI UPIS · KLJUČ
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {suzi && (
            <button type="button" onClick={() => setSakrijPanel(true)}
              style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 4, color: C.sivi, fontSize: 9, padding: "2px 6px", cursor: "pointer" }}>
              ▲
            </button>
          )}
          <button type="button" onClick={() => setPomoc((v) => !v)}
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 4, color: akcent, fontSize: 9, padding: "2px 6px", cursor: "pointer" }}>
            {pomoc ? "×" : "?"}
          </button>
        </div>
      </div>
      )}
      {bezZaglavlja && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
          <button type="button" onClick={() => setPomoc((v) => !v)}
            style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 4, color: akcent, fontSize: 9, padding: "2px 6px", cursor: "pointer" }}>
            {pomoc ? "×" : "?"}
          </button>
        </div>
      )}

      {pomoc && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ color: C.sivi, fontSize: 9, lineHeight: 1.5, marginBottom: 8, padding: 8, background: C.hover, borderRadius: 6 }}>
            <strong style={{ color: C.tekst }}>USB/Serial:</strong> Chrome/Edge, baud kao na ključu (često 9600).<br />
            <strong style={{ color: C.tekst }}>Bluetooth:</strong> BLE UART — Atlas, Bosch, Stahlwille sa wireless modulom.<br />
            <strong style={{ color: C.tekst }}>WiFi:</strong> lokalni gateway koji vraća Nm (JSON ili tekst). CORS mora dozvoliti aplikaciju.<br />
            <strong style={{ color: C.tekst }}>Fajl:</strong> izvoz u <code>moment-drop\izvoz\</code> — uvezi ovde.<br />
            Vendor profil: <strong>{MOMENT_VENDOR_NAZIV[vendor] || vendor}</strong> — parser prilagođen formatu.
          </div>
          <div style={{ color: C.plava, fontSize: 9, fontWeight: 700, marginBottom: 6, letterSpacing: 0.4 }}>
            KAKO OPERATER VIDI EKRAN KLJUČA
          </div>
          <img
            src={lokalnaPutanjaMomentDijagram(PRIKAZ_EKRANA_KLJUCA)}
            alt="Prikaz ekrana digitalnog ključa"
            style={{ width: "100%", borderRadius: 6, border: `1px solid ${C.border}` }}
          />
          <div style={{ color: C.sivi, fontSize: 8, marginTop: 6, lineHeight: 1.4 }}>
            JOB + korak, cilj/ostvareno Nm, traka tolerancije, OK/NOK signal. Kod NOK ključ ne dozvoljava sledeći korak (VSK/KSK).
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {MOMENT_KLJUC_NACINI.map((n) => (
          <button
            key={n.id}
            type="button"
            title={n.opis}
            onClick={() => setNacin(n.id)}
            style={{
              ...btn,
              borderColor: nacin === n.id ? akcent : C.border,
              color: nacin === n.id ? akcent : C.sivi,
              background: nacin === n.id ? `${akcent}15` : C.hover,
            }}
          >
            {n.label}
          </button>
        ))}
      </div>

      {nacin === "serial" && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
          <label style={{ color: C.sivi, fontSize: 9 }}>Baud:</label>
          <select value={baud} onChange={(e) => setBaud(Number(e.target.value))}
            style={{ background: C.input, border: `1px solid ${C.border}`, borderRadius: 4, color: C.tekst, fontSize: 10, padding: "4px 6px" }}>
            {MOMENT_KLJUC_BAUD.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <button type="button" onClick={start} style={{ ...btn, borderColor: C.zelena, color: C.zelena }}>▶ Poveži USB</button>
        </div>
      )}

      {nacin === "bluetooth" && (
        <button type="button" onClick={start} style={{ ...btn, borderColor: C.plava, color: C.plava, marginBottom: 8 }}>
          ▶ Poveži Bluetooth
        </button>
      )}

      {nacin === "wifi" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <input value={wifiUrl} onChange={(e) => setWifiUrl(e.target.value)} placeholder="http://IP:port/torque"
            style={{ flex: 1, minWidth: 200, background: C.input, border: `1px solid ${C.border}`, borderRadius: 6, color: C.tekst, fontSize: 10, padding: "6px 8px" }} />
          <button type="button" onClick={start} style={{ ...btn, borderColor: C.plava, color: C.plava }}>▶ Poll</button>
        </div>
      )}

      {nacin === "wifi_ws" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <input value={wifiWsUrl} onChange={(e) => setWifiWsUrl(e.target.value)} placeholder="ws://IP:port/stream"
            style={{ flex: 1, minWidth: 200, background: C.input, border: `1px solid ${C.border}`, borderRadius: 6, color: C.tekst, fontSize: 10, padding: "6px 8px" }} />
          <button type="button" onClick={start} style={{ ...btn, borderColor: C.plava, color: C.plava }}>▶ WebSocket</button>
        </div>
      )}

      {nacin === "simulacija" && (
        <button type="button" onClick={start} style={{ ...btn, borderColor: C.zuta, color: C.zuta, marginBottom: 8 }}>
          ▶ Simulacija (test)
        </button>
      )}

      {(nacin === "uvoz" || nacin === "serial" || (prikaziRucniUvoz && !povezan && kompakt)) && !suzi && (
        <>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 4, fontWeight: 600 }}>
            Izvoz sa ključa (paste / fajl) — ili unesite Nm u polje iznad
          </div>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"Izvoz sa ključa:\n45.2\nTORQUE=45.2;ANGLE=90\n{\"torque\":45.2,\"angle\":90}"}
            style={{
              width: "100%", minHeight: 52, background: C.input, border: `1px solid ${C.border}`,
              borderRadius: 6, color: C.tekst, fontSize: 10, padding: 8, fontFamily: "monospace", boxSizing: "border-box", marginBottom: 6,
            }}
          />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={uvozPaste} style={{ ...btn, background: C.zelena, color: C.onAkcent, border: "none" }}>Uvezi Nm</button>
            <label style={{ ...btn, display: "inline-block" }}>
              📄 Fajl
              <input type="file" accept=".txt,.csv,.json,.log" onChange={onFajl} style={{ display: "none" }} />
            </label>
          </div>
        </>
      )}

      {prikaziRucniUvoz && kompakt && !povezan && nacin !== "uvoz" && nacin !== "serial" && (
        <div style={{
          marginBottom: 8,
          padding: "6px 8px",
          background: C.hover,
          borderRadius: 6,
          fontSize: 9,
          color: C.sivi,
          lineHeight: 1.4,
        }}>
          Bez povezanog ključa: unesite <strong style={{ color: C.tekst }}>Nm</strong> u ručno polje iznad
          ili izaberite tab <strong style={{ color: C.tekst }}>Fajl / paste</strong>.
        </div>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: suzi ? 6 : 10, fontSize: 9, color: C.sivi, cursor: "pointer" }}>
        <input type="checkbox" checked={autoSnimi} onChange={(e) => onAutoSnimiChange?.(e.target.checked)} />
        Auto-snimi kad je OK
      </label>

      {poslednje.length > 0 && !suzi && (
        <div style={{ marginTop: 8, fontSize: 9, color: C.sivi }}>
          Poslednje: {poslednje.map((p, i) => (
            <span key={i} style={{ marginRight: 10 }}>{p.nm} Nm{p.ugao != null ? ` / ${p.ugao}°` : ""}</span>
          ))}
        </div>
      )}
    </div>
  );
}
