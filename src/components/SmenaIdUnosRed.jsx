import { useState, useEffect } from "react";
import IdDeoBarkodRed from "./IdDeoBarkodRed.jsx";
import CrtezZoomViewer from "./CrtezZoomViewer.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { ucitajPrikazSliku } from "../lib/slikePaths.js";

function visinaPolja(unosStil = {}) {
  if (unosStil.height) return unosStil.height;
  if (unosStil.minHeight) return unosStil.minHeight;
  const fs = Number(unosStil.fontSize) || 14;
  const pad = unosStil.padding;
  if (typeof pad === "string") {
    const p = pad.split(/\s+/).map((x) => parseFloat(x));
    const gore = p[0] || 0;
    const dole = p.length > 2 ? p[2] : p[0];
    return Math.ceil(gore + dole + fs * 1.15);
  }
  return 40;
}

function CrtezDugme({
  C,
  visina,
  sirina,
  urlCrtez,
  slikaNaziv,
  modulCrtez,
  onCrtezClick,
}) {
  const [url, setUrl] = useState(urlCrtez || null);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (urlCrtez) {
      setUrl(urlCrtez);
      return undefined;
    }
    if (!slikaNaziv || !modulCrtez) {
      setUrl(null);
      return undefined;
    }
    let alive = true;
    ucitajPrikazSliku(supabase, modulCrtez, slikaNaziv).then((u) => {
      if (alive) setUrl(u || null);
    });
    return () => { alive = false; };
  }, [urlCrtez, slikaNaziv, modulCrtez]);

  const otvori = () => {
    if (onCrtezClick) {
      onCrtezClick();
      return;
    }
    if (url) setZoom(true);
  };

  const aktivan = !!(url || onCrtezClick);

  return (
    <>
      <button
        type="button"
        onClick={otvori}
        disabled={!aktivan}
        title={aktivan ? "Crtež dela" : "Nema crteža"}
        style={{
          flex: `0 0 ${sirina}px`,
          width: sirina,
          minWidth: sirina,
          height: visina,
          minHeight: visina,
          padding: 0,
          border: `1px solid ${aktivan ? C.zelena + "55" : C.border}`,
          borderRadius: 8,
          background: aktivan ? C.panel : C.hover,
          cursor: aktivan ? "pointer" : "not-allowed",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: aktivan ? 1 : 0.45,
          touchAction: "manipulation",
        }}
      >
        {url ? (
          <img
            src={url}
            alt=""
            draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: Math.round(sirina * 0.42), lineHeight: 1 }}>📐</span>
        )}
      </button>
      {zoom && url && (
        <div
          role="presentation"
          onClick={() => setZoom(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2000,
            background: "rgba(0,0,0,0.88)",
            display: "flex",
            flexDirection: "column",
            padding: 16,
          }}
        >
          <div
            role="presentation"
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              background: C.panel,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              padding: 12,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CrtezZoomViewer url={url} C={C} onClose={() => setZoom(false)} />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Jedan red: Smena | ID deo + barkod/kamera | crtež (opciono).
 * Admin/analitika — telefon i tablet.
 */
export default function SmenaIdUnosRed({
  C,
  akcent = C?.plava,
  smena,
  setSmena,
  onBarkodSken,
  lblStyle,
  inpStyle = {},
  children,
  idLabel = "ID deo",
  sirinaBarkod = 36,
  sirinaCrtez = 36,
  sirinaSmena = 48,
  urlCrtez,
  slikaNaziv,
  modulCrtez,
  onCrtezClick,
  prikaziCrtez = true,
  onSmenaChange,
}) {
  const lbl = {
    color: C.sivi,
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 2,
    display: "block",
    ...lblStyle,
  };
  const visina = visinaPolja(inpStyle);
  const inpPolje = {
    width: "100%",
    boxSizing: "border-box",
    background: C.input,
    border: `1px solid ${C.border}`,
    color: C.tekst,
    outline: "none",
    fontFamily: "inherit",
    ...inpStyle,
    height: visina,
    minHeight: visina,
    maxHeight: visina,
  };

  const promeniSmenu = (e) => {
    const v = e.target.value;
    setSmena?.(v);
    onSmenaChange?.(v);
    localStorage.setItem("spc_smena", String(v));
    sessionStorage.setItem("spc_smena", String(v));
  };

  const imaCrtez = prikaziCrtez && (urlCrtez || slikaNaziv || onCrtezClick);

  return (
    <div style={{
      display: "flex",
      gap: 6,
      alignItems: "flex-end",
      width: "100%",
      minWidth: 0,
      flexShrink: 0,
    }}>
      <label style={{
        flex: `0 0 ${sirinaSmena}px`,
        minWidth: sirinaSmena,
        margin: 0,
      }}>
        <span style={lbl}>Smena</span>
        <select
          value={smena}
          onChange={promeniSmenu}
          style={{
            ...inpPolje,
            padding: "0 4px",
            cursor: "pointer",
            textAlign: "center",
            fontWeight: 700,
          }}
        >
          {["1", "2", "3"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <div style={{ flex: 1, minWidth: 0 }}>
        <IdDeoBarkodRed
          C={C}
          akcent={akcent}
          onBarkodSken={onBarkodSken}
          lblStyle={{ ...lbl, marginBottom: lbl.marginBottom ?? 2 }}
          idLabel={idLabel}
          barkodLabel="📷"
          kompaktRed
          sirinaBarkod={sirinaBarkod}
          razmakKolona={4}
          unosStil={inpStyle}
        >
          {children}
        </IdDeoBarkodRed>
      </div>

      {imaCrtez && (
        <CrtezDugme
          C={C}
          visina={visina}
          sirina={sirinaCrtez}
          urlCrtez={urlCrtez}
          slikaNaziv={slikaNaziv}
          modulCrtez={modulCrtez}
          onCrtezClick={onCrtezClick}
        />
      )}
    </div>
  );
}
