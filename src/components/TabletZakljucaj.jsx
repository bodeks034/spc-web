import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  idleMinuta,
  listaRadnikaSaPin,
  proveriPinRadnika,
  korisnikIzRadnika,
} from "../lib/tabletPin.js";
import { jeLinijaUloga } from "../lib/uloge.js";

/**
 * Idle zaključavanje + brza smena — samo operator/kontrolor na tabletu.
 * Admin / kvalitet / šef ne koriste PIN lock.
 */
export default function TabletZakljucaj({
  C,
  korisnik,
  zakljucano,
  onZatraziZakljucaj,
  onOtkljucaj,
  onPromeniRadnika,
}) {
  const [pin, setPin] = useState("");
  const [greska, setGreska] = useState("");
  const [busy, setBusy] = useState(false);
  const [lista, setLista] = useState([]);
  const [izabraniId, setIzabraniId] = useState(null);
  const [rezim, setRezim] = useState("otkljucaj");

  const zakljucajRef = useRef(onZatraziZakljucaj);
  const zakljucanoRef = useRef(zakljucano);
  zakljucajRef.current = onZatraziZakljucaj;
  zakljucanoRef.current = zakljucano;

  const idleAktivan = jeLinijaUloga(korisnik?.uloga);

  useEffect(() => {
    if (!korisnik || !idleAktivan) return undefined;
    const ms = idleMinuta() * 60 * 1000;
    let t = null;

    const zakljucaj = () => {
      if (zakljucanoRef.current) return;
      zakljucajRef.current?.();
    };

    const reset = () => {
      if (zakljucanoRef.current) return;
      clearTimeout(t);
      t = setTimeout(zakljucaj, ms);
    };

    reset();
    const ev = ["pointerdown", "keydown", "touchstart", "mousemove", "scroll"];
    ev.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    const onVis = () => {
      if (document.visibilityState === "visible") reset();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearTimeout(t);
      ev.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [korisnik?.radnikId, idleAktivan]);

  useEffect(() => {
    if (!zakljucano || !idleAktivan) return;
    setPin("");
    setGreska("");
    setRezim("otkljucaj");
    setIzabraniId(korisnik?.radnikId || null);
    listaRadnikaSaPin(supabase)
      .then(setLista)
      .catch(() => setLista([]));
  }, [zakljucano, korisnik?.radnikId, idleAktivan]);

  const potvrdi = useCallback(async () => {
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
  }, [rezim, izabraniId, korisnik?.radnikId, pin, onOtkljucaj, onPromeniRadnika]);

  if (!zakljucano || !idleAktivan) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(0,0,0,0.78)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, fontFamily: "'IBM Plex Mono',monospace",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{
        width: "100%", maxWidth: 360, background: C.panel,
        border: `1px solid ${C.border}`, borderRadius: 14, padding: 20,
      }}>
        <div style={{ color: C.tekst, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          🔒 Tablet zaključan
        </div>
        <div style={{ color: C.sivi, fontSize: 11, marginBottom: 14 }}>
          Neaktivnost {idleMinuta()} min — unesite PIN da nastavite
          {rezim === "otkljucaj" ? ` (${korisnik?.ime || "operater"})` : ""}.
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
          autoFocus
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
        <div style={{ color: C.sivi, fontSize: 10, marginTop: 10 }}>
          Ako nema PIN-a: Admin → Radnici → PIN. Ručno: dugme Smena u headeru.
        </div>
      </div>
    </div>
  );
}
