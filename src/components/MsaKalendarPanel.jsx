import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  ucitajMsaKalendar, sacuvajMsaKalendar, statusMsaKalendara, msaPodsetnici,
} from "../lib/msaKalendar.js";

export default function MsaKalendarPanel({ C, addToast }) {
  const [rows, setRows] = useState([]);
  const [merila, setMerila] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(null);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const [msa, mer] = await Promise.all([
        ucitajMsaKalendar(supabase),
        supabase.from("merila").select("id,naziv,serijski_broj").eq("aktivno", true).order("naziv"),
      ]);
      setRows(msa);
      setMerila(mer.data || []);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const podsetnici = msaPodsetnici(rows, C);
  const INP = {
    width: "100%", background: C.input, border: `1px solid ${C.border}`,
    borderRadius: 6, color: C.tekst, fontSize: 11, padding: "8px 10px",
    boxSizing: "border-box", fontFamily: "inherit",
  };

  const snimi = async () => {
    if (!forma?.merilo_id) return;
    try {
      await sacuvajMsaKalendar(supabase, forma);
      addToast?.("✓ MSA kalendar sačuvan", "uspeh");
      setForma(null);
      ucitaj();
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          KALENDAR MSA (Gage R&R)
          {podsetnici.length > 0 && (
            <span style={{ background: C.zuta, color: "#000", fontSize: 9, borderRadius: 8, padding: "1px 6px", marginLeft: 8 }}>
              {podsetnici.length} podsetnik
            </span>
          )}
        </div>
        <button type="button" onClick={() => setForma({ merilo_id: "", interval_meseci: 12, sledeca_studija: "", karakteristika: "" })}
          style={{ background: C.plava, border: "none", borderRadius: 6, color: "#fff", fontSize: 10, fontWeight: 700, padding: "6px 12px", cursor: "pointer" }}>
          + Planiraj
        </button>
      </div>

      {podsetnici.length > 0 && (
        <div style={{ background: `${C.zuta}18`, border: `1px solid ${C.zuta}55`, borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 11 }}>
          <strong style={{ color: C.zuta }}>Podsetnici (≤30 dana):</strong>
          {podsetnici.map((r) => (
            <div key={r.id} style={{ marginTop: 4, color: C.tekst }}>
              {r.merilo?.naziv} — {r.st.label}
              {r.karakteristika ? ` · ${r.karakteristika}` : ""}
            </div>
          ))}
        </div>
      )}

      {forma && (
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <select value={forma.merilo_id} onChange={(e) => setForma((p) => ({ ...p, merilo_id: Number(e.target.value) }))} style={{ ...INP, marginBottom: 8 }}>
            <option value="">Merilo…</option>
            {merila.map((m) => <option key={m.id} value={m.id}>{m.naziv} {m.serijski_broj ? `(${m.serijski_broj})` : ""}</option>)}
          </select>
          <input type="number" min={1} max={36} value={forma.interval_meseci} onChange={(e) => setForma((p) => ({ ...p, interval_meseci: e.target.value }))}
            placeholder="Interval (meseci)" style={{ ...INP, marginBottom: 8 }} />
          <input type="date" value={forma.sledeca_studija || ""} onChange={(e) => setForma((p) => ({ ...p, sledeca_studija: e.target.value }))}
            style={{ ...INP, marginBottom: 8 }} />
          <input value={forma.karakteristika || ""} onChange={(e) => setForma((p) => ({ ...p, karakteristika: e.target.value }))}
            placeholder="Karakteristika (opciono)" style={{ ...INP, marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={snimi} style={{ flex: 1, background: C.zelena, border: "none", borderRadius: 6, color: "#fff", padding: 8, cursor: "pointer", fontWeight: 700 }}>Sačuvaj</button>
            <button type="button" onClick={() => setForma(null)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.sivi, padding: 8, cursor: "pointer" }}>Otkaži</button>
          </div>
        </div>
      )}

      {loading ? <div style={{ color: C.sivi, fontSize: 12 }}>Učitavanje…</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.length === 0 && <div style={{ color: C.border, fontSize: 11 }}>Nema planiranih MSA studija — dodaj merilo.</div>}
          {rows.map((r) => {
            const st = statusMsaKalendara(r.sledeca_studija, C);
            return (
              <div key={r.id} style={{ background: C.bg, border: `1px solid ${st.boja}44`, borderRadius: 8, padding: 10, fontSize: 11 }}>
                <div style={{ fontWeight: 700, color: C.tekst }}>{r.merilo?.naziv || `#${r.merilo_id}`}</div>
                <div style={{ color: C.sivi, marginTop: 4 }}>
                  Sledeća studija: {r.sledeca_studija || "—"} · <span style={{ color: st.boja }}>{st.label}</span>
                  · interval {r.interval_meseci} mes.
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
