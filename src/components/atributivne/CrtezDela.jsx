import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { ucitajPrikazSliku, storagePutanjaSlike, STORAGE_BUCKET } from "../../lib/slikePaths.js";

function toolBtn(C) {
  return {
    background: "none",
    border: `1px solid ${C.border}`,
    borderRadius: 5,
    color: C.sivi,
    fontSize: 10,
    padding: "4px 10px",
    cursor: "pointer",
  };
}

export default function CrtezDela({ deoInfo, C, onNazad, onSlikaSnimljena, addToast }) {
  const [slika, setSlika] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | missing | error
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [anotacije, setAnotacije] = useState([]);
  const [dodajeAn, setDodajeAn] = useState(false);
  const [novaAn, setNovaAn] = useState("");
  const [uploading, setUploading] = useState(false);
  const containerRef = useRef(null);
  const fileRef = useRef(null);

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
    const url = await ucitajPrikazSliku(supabase, "atributivne", deoInfo.slika_naziv, deoInfo.id_deo);
    if (url) {
      setSlika(url);
      setStatus("ok");
    } else {
      setSlika(null);
      setStatus("error");
    }
  }, [deoInfo]);

  useEffect(() => {
    ucitajCrtez();
  }, [ucitajCrtez]);

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

  const onWheel = (e) => {
    e.preventDefault();
    setZoom((z) => Math.min(5, Math.max(0.3, z - e.deltaY * 0.001)));
  };

  const onMouseDown = (e) => {
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const onMouseMove = (e) => {
    if (dragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onMouseUp = () => setDragging(false);

  const onKlik = (e) => {
    if (!dodajeAn || !novaAn) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    setAnotacije((prev) => [...prev, { x, y, tekst: novaAn, id: Date.now() }]);
    setNovaAn("");
    setDodajeAn(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const loading = status === "loading" || uploading;
  const prikaziUvoz = status === "missing" || status === "error";

  const panelUvoz = () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        flexDirection: "column",
        gap: 12,
        padding: 24,
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: 48 }}>📐</span>
      {status === "error" ? (
        <>
          <div style={{ color: C.zuta, fontSize: 13, fontWeight: 700 }}>Crtež nije pronađen</div>
          <div style={{ color: C.sivi, fontSize: 11, maxWidth: 360, lineHeight: 1.5 }}>
            U bazi je <strong style={{ color: C.tekst }}>{deoInfo.slika_naziv}</strong>, ali fajl nije u Storage-u ni u
            <code>public/slike/atributivne/</code>. Uvezi sliku ručno.
          </div>
        </>
      ) : (
        <>
          <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700 }}>Nema crteža za {deoInfo.id_deo}</div>
          <div style={{ color: C.sivi, fontSize: 11 }}>Uvezi SOP sliku / crtež dela.</div>
        </>
      )}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        style={{
          background: C.plava,
          border: "none",
          borderRadius: 8,
          color: C.onAkcent,
          fontSize: 13,
          fontWeight: 700,
          padding: "11px 22px",
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {uploading ? "Uvozim…" : "📎 Uvezi crtež ručno"}
      </button>
      <span style={{ color: C.sivi, fontSize: 10 }}>PNG, JPG, WEBP, SVG</span>
      {onNazad && (
        <button
          type="button"
          onClick={onNazad}
          style={{
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.sivi,
            fontSize: 12,
            padding: "9px 18px",
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          ← Nazad na UNOS
        </button>
      )}
    </div>
  );

  if (!deoInfo) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: C.border,
          flexDirection: "column",
          gap: 8,
          fontSize: 11,
        }}
      >
        <span style={{ fontSize: 28 }}>📐</span>
        <span>Unesi ID dela za prikaz crteža</span>
        {onNazad && (
          <button
            type="button"
            onClick={onNazad}
            style={{
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.sivi,
              fontSize: 11,
              padding: "8px 14px",
              cursor: "pointer",
            }}
          >
            ← Nazad na UNOS
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "8px 12px",
          borderBottom: `1px solid ${C.border}`,
          background: C.panel,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: C.sivi, fontSize: 10, flex: 1 }}>{deoInfo.slika_naziv || "Nema crteža"}</span>
        <button onClick={resetView} style={toolBtn(C)}>⊡ Reset</button>
        <button onClick={() => setZoom((z) => Math.min(5, z + 0.2))} style={toolBtn(C)}>+ Zoom</button>
        <span style={{ color: C.sivi, fontSize: 10, minWidth: 40, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))} style={toolBtn(C)}>− Zoom</button>
        <button
          onClick={() => setDodajeAn(!dodajeAn)}
          style={{
            ...toolBtn(C),
            background: dodajeAn ? `${C.zuta}30` : "none",
            borderColor: dodajeAn ? C.zuta : C.border,
            color: dodajeAn ? C.zuta : C.sivi,
          }}
        >
          ✏ Anotacija
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={loading} style={toolBtn(C)}>
          {uploading ? "Uvoz…" : "📎 Uvezi ručno"}
        </button>
        {onNazad && <button type="button" onClick={onNazad} style={toolBtn(C)}>← UNOS</button>}
        <input ref={fileRef} type="file" accept="image/*,.svg,.webp" onChange={uploadSliku} style={{ display: "none" }} />
      </div>

      {dodajeAn && (
        <div
          style={{
            padding: "6px 12px",
            background: `${C.zuta}15`,
            borderBottom: `1px solid ${C.zuta}30`,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span style={{ color: C.zuta, fontSize: 10 }}>✏ Unesi tekst pa klikni na crtež:</span>
          <input
            value={novaAn}
            onChange={(e) => setNovaAn(e.target.value)}
            placeholder="npr. LSL = 9.8mm"
            style={{
              background: C.input,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              color: C.tekst,
              fontSize: 11,
              padding: "4px 8px",
              outline: "none",
              flex: 1,
            }}
          />
          <button onClick={() => { setDodajeAn(false); setNovaAn(""); }} style={{ background: "none", border: "none", color: C.sivi, cursor: "pointer", fontSize: 12 }}>✕</button>
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          cursor: dodajeAn ? "crosshair" : dragging ? "grabbing" : "grab",
          background: C.bg,
        }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onClick={onKlik}
      >
        {status === "loading" ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.sivi, fontSize: 11 }}>
            Učitavanje crteža…
          </div>
        ) : prikaziUvoz ? (
          panelUvoz()
        ) : slika && status === "ok" ? (
          <div style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, transformOrigin: "top left", position: "absolute", userSelect: "none" }}>
            <img
              src={slika}
              alt="crtež"
              draggable={false}
              onError={() => { setSlika(null); setStatus("error"); }}
              style={{ maxWidth: "100%", display: "block", borderRadius: 4, boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
            />
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
              {anotacije.map((a) => (
                <g key={a.id}>
                  <circle cx={a.x} cy={a.y} r={5} fill={C.crvena} opacity={0.8} />
                  <rect x={a.x + 8} y={a.y - 14} width={a.tekst.length * 7 + 8} height={20} fill={C.panel} stroke={C.border} strokeWidth={1} rx={3} />
                  <text x={a.x + 12} y={a.y + 1} fontSize={11} fill={C.crvena} fontFamily="monospace">{a.tekst}</text>
                </g>
              ))}
            </svg>
          </div>
        ) : panelUvoz()}
      </div>

      {deoInfo && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "8px 12px", background: C.panel, display: "flex", gap: 16, flexWrap: "wrap" }}>
          {[
            ["ID", deoInfo.id_deo],
            ["Kontrola", deoInfo.karakteristika || "-"],
            ["Napomena", deoInfo.napomena || "-"],
          ].map(([l, v]) => (
            <div key={l} style={{ fontSize: 10 }}>
              <span style={{ color: C.sivi }}>{l}: </span>
              <span style={{ color: C.tekst, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
