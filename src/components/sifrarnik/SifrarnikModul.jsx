import { useState, useCallback } from "react";
import AppHeader from "../AppHeader.jsx";
import SifrarnikHub from "./SifrarnikHub.jsx";

/**
 * Modul 0 — šifrarnik (master podaci pre unosa i analitike).
 */
export default function SifrarnikModul({ korisnik, onNazad, onOdjava, C, onToggleTema, temaTamna }) {
  const [toast, setToast] = useState(null);

  const addToast = useCallback((tekst, tip = "info") => {
    setToast({ tekst, tip });
    window.setTimeout(() => setToast(null), 4500);
  }, []);

  const bojaToast = toast?.tip === "uspeh" ? C.zelena : toast?.tip === "greska" ? C.crvena : C.plava;

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono', monospace",
      display: "flex", flexDirection: "column",
    }}>
      <AppHeader
        korisnik={korisnik}
        onOdjava={onOdjava}
        onNazad={onNazad}
        C={C}
        onToggleTema={onToggleTema}
        temaTamna={temaTamna}
        desnoExtra={
          <span style={{ color: "#a78bfa", fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>MODUL 0 — ŠIFRARNIK</span>
        }
      />

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <SifrarnikHub C={C} addToast={addToast} korisnik={korisnik} />
      </div>

      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: C.panel, border: `1px solid ${bojaToast}`,
          borderRadius: 8, padding: "12px 20px", color: C.tekst, fontSize: 11,
          maxWidth: "min(90vw, 480px)", whiteSpace: "pre-wrap", zIndex: 9999,
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        }}>
          {toast.tekst}
        </div>
      )}
    </div>
  );
}
