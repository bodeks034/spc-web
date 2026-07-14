import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { ucitajPrikazSliku } from "../lib/slikePaths.js";
import { dijagramSrcZaDeo, dijagramUrlZaPrikaz } from "../lib/voziloDijagramConfig.js";
import CrtezZoomViewer from "./CrtezZoomViewer.jsx";

/** Pregled crteža dela na koraku ID (atributivne). */
export default function AtrCrtezPregled({
  slikaNaziv,
  idDeo,
  C,
  kompakt = false,
  visina = 200,
}) {
  const [url, setUrl] = useState(null);
  const [status, setStatus] = useState("idle");
  const [zoomFull, setZoomFull] = useState(false);

  useEffect(() => {
    if (!slikaNaziv) {
      setUrl(null);
      setStatus(idDeo ? "missing" : "idle");
      return;
    }
    let ok = true;
    setStatus("loading");
    setUrl(null);
    (async () => {
      let u = await ucitajPrikazSliku(supabase, "atributivne", slikaNaziv, idDeo);
      if (!u && idDeo) {
        const altSrc = dijagramSrcZaDeo({ id_deo: idDeo });
        if (altSrc) u = await dijagramUrlZaPrikaz(altSrc, supabase);
      }
      if (!ok) return;
      if (u) {
        setUrl(u);
        setStatus("ok");
      } else {
        setUrl(null);
        setStatus("error");
      }
    })();
    return () => { ok = false; };
  }, [slikaNaziv, idDeo]);

  if (!idDeo) return null;

  const panel = (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: kompakt ? 12 : 8,
      padding: kompakt ? 8 : 6,
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      flex: "0 0 auto",
      flexShrink: 0,
      overflow: "hidden",
    }}>
      <div style={{
        color: C.sivi,
        fontSize: kompakt ? 10 : 9,
        marginBottom: 4,
        textAlign: "center",
        letterSpacing: 0.5,
      }}>
        Crtež dela · zoom · ⛶ ceo ekran
      </div>
      <div style={{
        flex: 1,
        minHeight: visina,
        maxHeight: kompakt ? visina : undefined,
        display: "flex",
        flexDirection: "column",
      }}>
        {status === "loading" && (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            color: C.sivi, fontSize: kompakt ? 12 : 10,
          }}>
            Učitavam crtež…
          </div>
        )}
        {status === "ok" && url && (
          <CrtezZoomViewer
            url={url}
            C={C}
            visina={Math.max(visina - 44, 100)}
            onFullscreen={() => setZoomFull(true)}
          />
        )}
        {status === "missing" && (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            color: C.border, fontSize: kompakt ? 12 : 10, textAlign: "center", padding: 8,
            background: C.input, borderRadius: 6, border: `1px dashed ${C.border}`,
          }}>
            Nema crteža u bazi
          </div>
        )}
        {status === "error" && (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            color: C.zuta, fontSize: kompakt ? 11 : 10, textAlign: "center", padding: 8,
            background: C.input, borderRadius: 6, border: `1px solid ${C.border}`,
            lineHeight: 1.4,
          }}>
            <span>
              <strong style={{ color: C.tekst }}>{slikaNaziv}</strong>
              <br />
              Crtež nije učitan — proveri fajl u Storage-u ili Šifrarnik → slika dela
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {panel}
      {zoomFull && url && (
        <div
          role="presentation"
          onClick={() => setZoomFull(false)}
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
            <CrtezZoomViewer url={url} C={C} onClose={() => setZoomFull(false)} />
          </div>
        </div>
      )}
    </>
  );
}
