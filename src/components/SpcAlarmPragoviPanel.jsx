import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  PODRAZUMEVANI_SPC_ALARM_PRAGOVI,
  ucitajSpcAlarmPragove,
  snimiSpcAlarmPragove,
  primerAlarmSerija,
  SPC_ALARM_PRAGOVI_EVENT,
} from "../lib/spcAlarmPragovi.js";

const POLJA = [
  { id: "default", label: "Prazna klasa", hint: "isto kao Critical u šifrarniku" },
  { id: "critical", label: "Critical" },
  { id: "major", label: "Major" },
  { id: "minor", label: "Minor" },
];

const INP = (C) => ({
  background: C.input,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  color: C.tekst,
  fontSize: 12,
  padding: "6px 8px",
  width: 72,
  fontFamily: "inherit",
  boxSizing: "border-box",
});

/**
 * Pragovi SPC alarma na liniji (NOK u seriji po klasi defekta).
 * Šifrarnik → Merljive → SPC alarm %.
 */
export default function SpcAlarmPragoviPanel({ C, addToast, kompakt = false }) {
  const [pragovi, setPragovi] = useState({ ...PODRAZUMEVANI_SPC_ALARM_PRAGOVI });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [izmena, setIzmena] = useState(false);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const p = await ucitajSpcAlarmPragove(supabase);
      setPragovi(p);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail) {
        setPragovi(e.detail);
        setIzmena(false);
      }
    };
    window.addEventListener(SPC_ALARM_PRAGOVI_EVENT, handler);
    return () => window.removeEventListener(SPC_ALARM_PRAGOVI_EVENT, handler);
  }, []);

  const promeni = (id, v) => {
    const n = Math.min(100, Math.max(1, Math.round(Number(v) || PODRAZUMEVANI_SPC_ALARM_PRAGOVI[id])));
    setPragovi((prev) => ({ ...prev, [id]: n }));
    setIzmena(true);
  };

  const sacuvaj = async () => {
    setSaving(true);
    const r = await snimiSpcAlarmPragove(supabase, pragovi);
    setSaving(false);
    setIzmena(false);
    if (r.pragovi) setPragovi(r.pragovi);
    addToast?.(
      r.ok
        ? "✓ Pragovi sačuvani — primenjuju se na celu aplikaciju"
        : (r.error || "Sačuvano lokalno — primenjuje se u ovom pregledaču"),
      r.ok ? "uspeh" : "info",
    );
  };

  const vratiPodrazumevano = () => {
    setPragovi({ ...PODRAZUMEVANI_SPC_ALARM_PRAGOVI });
    setIzmena(true);
  };

  if (loading) {
    return <div style={{ color: C.sivi, fontSize: 11, marginBottom: 16 }}>Učitavam pragove alarma…</div>;
  }

  return (
    <div
      data-testid="spc-alarm-pragovi-panel"
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: kompakt ? 12 : 16,
        marginBottom: 16,
      }}
    >
      <div style={{ color: C.tekst, fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
        SPC alarm — % NOK u seriji
      </div>
      <p style={{ color: C.sivi, fontSize: 10, margin: "0 0 12px", lineHeight: 1.55 }}>
        Podesi samo procenat alarma po klasi defekta. Sačuvano važi za <strong>celu aplikaciju</strong>
        (linija, merljive, analitika) — odmah i u drugim otvorenim tabovima.
        Klasa po dimenziji i dalje ide iz kolone <strong>Klasa</strong> u glavnom unosu.
      </p>

      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        {POLJA.map(({ id, label, hint }) => {
          const prim = primerAlarmSerija(5, pragovi[id]);
          return (
            <div
              key={id}
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "8px 12px",
                fontSize: 11,
                color: C.tekst,
              }}
            >
              <span style={{ minWidth: 100, fontWeight: 600 }}>{label}</span>
              <label style={{ display: "flex", alignItems: "center", gap: 4, color: C.sivi }}>
                ≥
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={pragovi[id]}
                  onChange={(e) => promeni(id, e.target.value)}
                  style={INP(C)}
                  data-testid={`spc-prag-${id}`}
                />
                %
              </label>
              <span style={{ color: C.sivi, fontSize: 10 }}>
                npr. 5 merenja → alarm od {prim.min} NOK ({prim.min}/{prim.n})
                {hint ? ` · ${hint}` : ""}
              </span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          onClick={sacuvaj}
          disabled={saving || !izmena}
          style={{
            background: C.plava,
            border: "none",
            borderRadius: 6,
            color: C.onAkcent,
            fontSize: 11,
            fontWeight: 700,
            padding: "8px 14px",
            cursor: saving || !izmena ? "not-allowed" : "pointer",
            opacity: !izmena ? 0.5 : 1,
          }}
        >
          {saving ? "…" : "Sačuvaj pragove"}
        </button>
        <button
          type="button"
          onClick={vratiPodrazumevano}
          style={{
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.sivi,
            fontSize: 11,
            padding: "8px 12px",
            cursor: "pointer",
          }}
        >
          Podrazumevano (20 / 30 / 40)
        </button>
      </div>
    </div>
  );
}
