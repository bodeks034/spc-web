import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  idleMinuta,
  listaRadnikaSaPin,
  proveriPinRadnika,
  korisnikIzRadnika,
} from "../lib/tabletPin.js";

/**
 * Idle zaključavanje + brza smena operatera PIN-om (isti Auth nalog tableta).
 */
export default function TabletZakljucaj({
  C,
  korisnik,
  zakljucano,
  onOtkljucaj,
  onPromeniRadnika,
  onZatraziZakljucaj,
}) {
  const [pin, setPin] = useState("");
  const [greska, setGreska] = useState("");
  const [busy, setBusy] = useState(false);
  const [lista, setLista] = useState([]);
  const [izabraniId, setIzabraniId] = useState(null);
  const [rezim, setRezim] = useState("otkljucaj"); // otkljucaj | smena

  useEffect(() => {
    if (!korisnik || !onZatraziZakljucaj) return undefined;
    const ms = idleMinuta() * 60 * 1000;
    let t = setTimeout(() => onZatraziZakljucaj(), ms);
    const reset = () => {
      clearTimeout(t);
      t = setTimeout(() => onZatraziZakljucaj(), ms);
    };
    const ev = ["pointerdown", "keydown", "touchstart"];
    ev.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(t);
      ev.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [korisnik?.radnikId, onZatraziZakljucaj, zakljucano]);

  useEffect(() => {
    if (!zakljucano) return;
    setPin("");
    setGreska("");
    setRezim("otkljucaj");
    setIzabraniId(korisnik?.radnikId || null);
    listaRadnikaSaPin(supabase)
      .then(setLista)
      .catch(() => setLista([]));
  }, [zakljucano, korisnik?.radnikId]);

  if (!zakljucano) return null;

  const potvrdi = async () => {
    setBusy(true);
    setGreska("");
    try {
      const id = rezim === "smena" ? izabraniId : korisnik?.radnikId;
      if (!id) throw new Error("Izaberite radnika.");
      const radnik = await proveriPinRadnika(supabase, id, pin);
      const { data: { session } } = await supabase.auth.getSession();
      const k = korisnikIzRadnika(radnik, session?.user);
      if (rezim === "smena" && Number(id) !== Number(korisnik?.radnikId)) {
        onPromeniRadnika?.(k);
      }
      onOtkljucaj?.(k);
      setPin("");
    } catch (e) {
      setGreska(e.message || "PIN greška");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(0,0,0,0.72)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, fontFamily: "'IBM Plex Mono',monospace",
    }}>
      <div style={{
        width: "100%", maxWidth: 360, background: C.panel,
        border: `1px solid ${C.border}`, borderRadius: 14, padding: 20,
      }}>
        <div style={{ color: C.tekst, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          🔒 Tablet zaključan
        </div>
        <div style={{ color: C.sivi, fontSize: 11, marginBottom: 14 }}>
          {rezim === "otkljucaj"
            ? `Unesite PIN za: ${korisnik?.ime || "operater"}`
            : "Izaberite radnika i unesite PIN"}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button type="button" onClick={() => setRezim("otkljucaj")}
            style={{
              flex: 1, padding: "8px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${rezim === "otkljucaj" ? C.plava : C.border}`,
              background: rezim === "otkljucaj" ? `${C.plava}22` : C.hover,
              color: C.tekst, fontSize: 11, fontWeight: 700,
            }}>
            Otključaj
          </button>
          <button type="button" onClick={() => setRezim("smena")}
            style={{
              flex: 1, padding: "8px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${rezim === "smena" ? C.plava : C.border}`,
              background: rezim === "smena" ? `${C.plava}22` : C.hover,
              color: C.tekst, fontSize: 11, fontWeight: 700,
            }}>
            Promeni operatera
          </button>
        </div>

        {rezim === "smena" && (
          <select
            value={izabraniId || ""}
            onChange={(e) => setIzabraniId(Number(e.target.value) || null)}
            style={{
              width: "100%", marginBottom: 10, padding: "10px",
              background: C.input, border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.tekst, fontSize: 13,
            }}
          >
            <option value="">— izaberi —</option>
            {lista.map((r) => (
              <option key={r.id} value={r.id}>{r.ime} ({r.uloga})</option>
            ))}
          </select>
        )}

        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="PIN (4–6 cifara)"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          onKeyDown={(e) => { if (e.key === "Enter") potvrdi(); }}
          style={{
            width: "100%", padding: "12px", boxSizing: "border-box",
            background: C.input, border: `1px solid ${C.border}`,
            borderRadius: 8, color: C.tekst, fontSize: 18, letterSpacing: 4,
            textAlign: "center", marginBottom: 10,
          }}
        />
        {greska && (
          <div style={{ color: C.crvena, fontSize: 11, marginBottom: 10 }}>{greska}</div>
        )}
        <button type="button" onClick={potvrdi} disabled={busy || pin.length < 4}
          style={{
            width: "100%", padding: "12px", border: "none", borderRadius: 8,
            background: C.plava, color: C.onAkcent, fontWeight: 700,
            fontSize: 13, cursor: busy ? "wait" : "pointer", opacity: pin.length < 4 ? 0.5 : 1,
          }}>
          {busy ? "…" : "Potvrdi"}
        </button>
        {!lista.length && rezim === "smena" && (
          <div style={{ color: C.sivi, fontSize: 10, marginTop: 10 }}>
            Nema radnika sa PIN-om. Admin → Radnici → PIN.
          </div>
        )}
      </div>
    </div>
  );
}
