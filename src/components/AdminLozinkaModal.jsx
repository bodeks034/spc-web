import { useState } from "react";
import {
  posaljiResetLozinkeEmail,
  postaviRadnikLozinku,
  validirajRadnikLozinku,
} from "../lib/adminRadnikLozinka.js";

export default function AdminLozinkaModal({ radnik, supabase, C, onClose, onSacuvano }) {
  const [loz1, setLoz1] = useState("");
  const [loz2, setLoz2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(null);

  const sacuvaj = async () => {
    const greska = validirajRadnikLozinku(loz1, loz2);
    if (greska) {
      setErr(greska);
      return;
    }
    setBusy("sacuvaj");
    setErr("");
    try {
      const data = await postaviRadnikLozinku(supabase, radnik.id, loz1);
      onSacuvano?.(data);
    } catch (e) {
      setErr(e.message || "Greška.");
    } finally {
      setBusy(null);
    }
  };

  const posaljiEmail = async () => {
    setBusy("email");
    setErr("");
    try {
      await posaljiResetLozinkeEmail(supabase, radnik.email);
      onSacuvano?.({
        ok: true,
        emailPoslat: true,
        ime: radnik.ime,
        radnikId: radnik.id,
      });
    } catch (e) {
      setErr(e.message || "Email reset nije uspeo.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2100,
    }}>
      <div style={{
        background: C.panel, border: `1px solid ${C.plava}`, borderRadius: 12,
        padding: "26px 28px", width: 420, maxWidth: "calc(100vw - 32px)",
      }}>
        <div style={{ color: C.plava, fontSize: 12, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
          LOZINKA
        </div>
        <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{radnik.ime}</div>
        <div style={{ color: C.sivi, fontSize: 11, marginBottom: 16 }}>{radnik.email}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
          {[
            ["Nova lozinka", loz1, setLoz1],
            ["Ponovi lozinku", loz2, setLoz2],
          ].map(([label, val, setVal]) => (
            <div key={label}>
              <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2, marginBottom: 4 }}>{label}</div>
              <input
                type="password"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                autoComplete="new-password"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
                  color: C.tekst, fontSize: 13, padding: "10px 12px", outline: "none",
                  fontFamily: "inherit",
                }}
              />
            </div>
          ))}
        </div>

        {err && (
          <div style={{
            color: C.crvena, fontSize: 11, marginBottom: 12, lineHeight: 1.5,
            background: C.nok, padding: "8px 10px", borderRadius: 5, whiteSpace: "pre-line",
          }}>
            {err}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={sacuvaj}
            disabled={!!busy}
            style={{
              background: busy === "sacuvaj" ? C.hover : C.zelena,
              border: "none", borderRadius: 6, color: C.onAkcent,
              fontSize: 12, fontWeight: 700, padding: "10px 16px",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy === "sacuvaj" ? "Čuvanje..." : "✓ Postavi lozinku"}
          </button>
          <button
            type="button"
            onClick={posaljiEmail}
            disabled={!!busy}
            style={{
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 6, color: C.sivi,
              fontSize: 11, padding: "8px 12px",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy === "email" ? "Slanje..." : "Pošalji reset link na email"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={!!busy}
            style={{
              background: "none", border: "none", color: C.sivi,
              fontSize: 11, padding: "4px", cursor: "pointer",
            }}
          >
            Otkaži
          </button>
        </div>
      </div>
    </div>
  );
}
