import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { ucitajPrikazSliku } from "../lib/slikePaths.js";
import CrtezZoomViewer from "./CrtezZoomViewer.jsx";

/** Pregled crteža sa zoom-om i celim ekranom (atributivne / merljive). */
export default function CrtezPregledPanel({
  modul = "atributivne",
  slikaNaziv,
  urlDirect = null,
  idDeo,
  C,
  kompakt = false,
  visina = 200,
  punPanel = false,
  akcent,
}) {
  const boja = akcent || (modul === "merljive" ? C.zelena : C.plava);
  const [url, setUrl] = useState(urlDirect);
  const [status, setStatus] = useState(urlDirect ? "ok" : "idle");
  const [zoomFull, setZoomFull] = useState(false);

  useEffect(() => {
    if (urlDirect) {
      setUrl(urlDirect);
      setStatus(urlDirect ? "ok" : "error");
      return;
    }
    if (!slikaNaziv) {
      setUrl(null);
      setStatus(idDeo ? "missing" : "idle");
      return;
    }
    let ok = true;
    setStatus("loading");
    setUrl(null);
    ucitajPrikazSliku(supabase, modul, slikaNaziv).then((u) => {
      if (!ok) return;
      if (u) {
        setUrl(u);
        setStatus("ok");
      } else {
        setUrl(null);
        setStatus("error");
      }
    });
    return () => { ok = false; };
  }, [slikaNaziv, idDeo, modul, urlDirect]);

  if (!idDeo) return null;

  const imgVisina = punPanel ? Math.max(visina, 180) : visina;

  const panel = (
    <div style={{
      background: C.panel,
      border: `1px solid ${boja}40`,
      borderRadius: kompakt ? 12 : 8,
      padding: kompakt ? 8 : 6,
      display: "flex",
      flexDirection: "column",
      minHeight: punPanel ? imgVisina + 36 : 0,
      flex: punPanel ? "1 1 auto" : "0 0 auto",
    }}>
      <div style={{
        color: C.sivi,
        fontSize: kompakt ? 10 : 9,
        marginBottom: 4,
        textAlign: "center",
        letterSpacing: 0.5,
      }}>
        Crtež · zoom · ⛶ ceo ekran
      </div>
      <div style={{
        flex: 1,
        minHeight: imgVisina,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
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
            visina={imgVisina - 40}
            onFullscreen={() => setZoomFull(true)}
          />
        )}
        {status === "missing" && (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            color: C.border, fontSize: kompakt ? 12 : 10, textAlign: "center", padding: 8,
            background: C.input, borderRadius: 6, border: `1px dashed ${C.border}`,
          }}>
            Nema crteža
          </div>
        )}
        {status === "error" && (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            color: C.zuta, fontSize: kompakt ? 11 : 10, textAlign: "center", padding: 8,
            background: C.input, borderRadius: 6, border: `1px solid ${C.border}`, lineHeight: 1.4,
          }}>
            <span>
              {slikaNaziv && <><strong style={{ color: C.tekst }}>{slikaNaziv}</strong><br /></>}
              Fajl nije učitan
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
