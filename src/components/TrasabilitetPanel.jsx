import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { ucitajTrasabilitet, preuzmiTrasabilitetPdf } from "../lib/trasabilitetIzvestaj.js";
import { getAktivnaSesija } from "../lib/spcSesija.js";

export default function TrasabilitetPanel({ C, addToast, modul = "merljive" }) {
  const [idDeo, setIdDeo] = useState("");
  const [koristiSesiju, setKoristiSesiju] = useState(true);
  const [podaci, setPodaci] = useState(null);
  const [loading, setLoading] = useState(false);

  const ucitaj = async () => {
    if (!idDeo.trim()) {
      addToast?.("Unesite ID dela", "greska");
      return;
    }
    setLoading(true);
    const sesija = koristiSesiju ? getAktivnaSesija(modul)?.sesija_id : null;
    const r = await ucitajTrasabilitet(supabase, { idDeo: idDeo.trim(), sesijaId: sesija });
    setLoading(false);
    if (r.greska) {
      addToast?.(r.greska, "greska");
      setPodaci(null);
      return;
    }
    setPodaci(r);
  };

  const INP = {
    background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.tekst, fontSize: 12, padding: "8px 10px", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, maxWidth: 720,
    }}>
      <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>
        TRASABILITET IZVEŠTAJ
      </div>
      <p style={{ color: C.sivi, fontSize: 10, lineHeight: 1.5, marginBottom: 12 }}>
        Pregled merenja, KPI i atributivnog loga za ID delo. PDF za kupca / audit.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input style={{ ...INP, flex: "1 1 160px" }} value={idDeo}
          onChange={e => setIdDeo(e.target.value.toUpperCase())} placeholder="ID delo" />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.sivi }}>
          <input type="checkbox" checked={koristiSesiju} onChange={e => setKoristiSesiju(e.target.checked)} />
          Samo aktivna sesija
        </label>
        <button type="button" onClick={ucitaj} disabled={loading}
          style={{
            background: C.plava, border: "none", borderRadius: 6, color: "#fff",
            padding: "8px 16px", fontWeight: 700, fontSize: 11, cursor: "pointer",
          }}>
          {loading ? "…" : "Učitaj"}
        </button>
        {podaci && (
          <button type="button" onClick={() => preuzmiTrasabilitetPdf(podaci, C)}
            style={{
              background: C.zelena, border: "none", borderRadius: 6, color: "#fff",
              padding: "8px 16px", fontWeight: 700, fontSize: 11, cursor: "pointer",
            }}>
            PDF
          </button>
        )}
      </div>

      {podaci && (
        <div style={{ fontSize: 10, color: C.tekst, lineHeight: 1.6 }}>
          <div><strong>Merenja:</strong> {podaci.merenja.length}</div>
          <div><strong>KPI:</strong> {podaci.kpi.length}</div>
          <div><strong>Kontrolni log:</strong> {podaci.log.length}</div>
          {podaci.sesijaId && <div style={{ color: C.sivi }}>Sesija: {podaci.sesijaId}</div>}
        </div>
      )}
    </div>
  );
}
