import { useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { posaljiZahtevKalibracije } from "../lib/kalibracijaOdobrenje.js";

export default function ZahtevKalibracija({
  korisnik,
  idDeo,
  nazivDela,
  instrumenti,
  onUspeh,
  onOtkazati,
  C,
}) {
  const [razlog, setRazlog] = useState("");
  const [loading, setLoading] = useState(false);

  const posalji = async () => {
    if (!razlog.trim()) return;
    setLoading(true);
    try {
      await posaljiZahtevKalibracije(supabase, {
        operaterId: korisnik.radnikId,
        operaterIme: korisnik.ime,
        idDeo,
        nazivDela,
        instrumenti,
        razlog: razlog.trim(),
      });
      onUspeh?.();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
    }}>
      <div style={{
        background: C.panel, border: `1px solid ${C.crvena}`, borderRadius: 12,
        padding: "28px 32px", maxWidth: 420, width: "90%",
      }}>
        <div style={{ color: C.crvena, fontSize: 20, marginBottom: 10 }}>⚠</div>
        <div style={{ color: C.tekst, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
          Zahtev za merenje (kalibracija istekla)
        </div>
        <div style={{ color: C.sivi, fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
          Deo: <strong style={{ color: C.tekst }}>{idDeo}{nazivDela ? ` — ${nazivDela}` : ""}</strong>
          {instrumenti && (
            <>
              <br />
              Merila: <strong style={{ color: C.crvena }}>{instrumenti}</strong>
            </>
          )}
        </div>
        <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.2, marginBottom: 6 }}>
          RAZLOG / OBAVEŠTENJE ZA ADMINA
        </div>
        <textarea
          value={razlog}
          onChange={e => setRazlog(e.target.value)}
          placeholder="Npr. hitna proizvodnja, kalibracija zakazana sutra, zamensko merilo..."
          rows={3}
          style={{
            width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.tekst, fontSize: 13, padding: "10px 12px", boxSizing: "border-box",
            outline: "none", fontFamily: "inherit", resize: "none",
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={posalji}
            disabled={!razlog.trim() || loading}
            style={{
              flex: 1,
              background: razlog.trim() && !loading ? C.crvena : C.hover,
              border: "none", borderRadius: 8,
              color: razlog.trim() ? "#fff" : "#666",
              fontSize: 13, fontWeight: 700, padding: "12px",
              cursor: razlog.trim() ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Šalje se..." : "📤 Pošalji adminu"}
          </button>
          <button
            type="button"
            onClick={onOtkazati}
            style={{
              background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.sivi, fontSize: 13, padding: "12px 16px", cursor: "pointer",
            }}
          >
            Otkaži
          </button>
        </div>
        <div style={{ color: C.sivi, fontSize: 10, marginTop: 10, textAlign: "center" }}>
          Admin odobrava na bilo kom uređaju — ovaj ekran se osvežava automatski
        </div>
      </div>
    </div>
  );
}
