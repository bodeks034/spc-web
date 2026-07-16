import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { ucitajRadnika } from "../lib/radnikAuth.js";
import { proveriMaxKorisnika } from "../lib/licencaMaxKorisnika.js";
import { registrujUredjajLicence } from "../lib/licencaUredjaj.js";
import { ocistiUnosDraft } from "../lib/unosDraft.js";
import BrendingNaslov from "./BrendingNaslov.jsx";
import AppFooter from "./AppFooter.jsx";

export default function LoginScreen({ onLogin, C, licenca = null }) {
  const [email, setEmail] = useState("");
  const [loz, setLoz] = useState("");
  const [err, setErr] = useState("");
  const [load, setLoad] = useState(false);
  const [inputsReady, setInputsReady] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => {
    setEmail("");
    setLoz("");
    setErr("");
    setInputsReady(false);
    const t = setTimeout(() => {
      setInputsReady(true);
      requestAnimationFrame(() => {
        emailRef.current?.focus?.();
        emailRef.current?.select?.();
      });
    }, 80);
    return () => clearTimeout(t);
  }, []);

  const prijavi = async () => {
    if (!email || !loz) { setErr("Unesite email i lozinku."); return; }
    setLoad(true);
    setErr("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: loz });
      if (error) throw error;
      const k = await ucitajRadnika(supabase, data.user);
      if (!k.radnikId) {
        await supabase.auth.signOut();
        setErr(k.deaktiviran
          ? `Nalog ${email} je deaktiviran. Kontaktirajte administratora.`
          : `Korisnik ${email} nije u tabeli radnici. Proverite Supabase → radnici ili pokrenite import.`);
        return;
      }
      const kvota = await proveriMaxKorisnika(supabase, {
        maxKorisnika: licenca?.max_korisnika,
        radnikId: k.radnikId,
      });
      if (!kvota.ok) {
        await supabase.auth.signOut();
        setErr(kvota.poruka);
        return;
      }
      const uredjaj = await registrujUredjajLicence(supabase, {
        maxUredjaja: licenca?.max_uredjaja,
      });
      if (!uredjaj.ok) {
        await supabase.auth.signOut();
        setErr(uredjaj.poruka);
        return;
      }
      ocistiUnosDraft();
      onLogin(k);
    } catch (e) {
      setErr(e.message === "Invalid login credentials" ? "Pogrešan email ili lozinka." : e.message || "Greška.");
    } finally {
      setLoad(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: "'IBM Plex Mono',monospace",
    }}>
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: "14px 26px 12px", width: 360, maxWidth: "calc(100vw - 32px)",
        boxShadow: C.naziv === "tamna" ? "0 20px 60px rgba(0,0,0,0.5)" : "0 8px 30px rgba(0,0,0,0.12)",
      }}>
        <div style={{ marginBottom: 8, overflow: "visible" }}>
          <BrendingNaslov C={C} varijanta="login" />
        </div>
        <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); prijavi(); }}>
          {[["EMAIL", "spc-login-email", "text", email, setEmail, "", "off"],
            ["LOZINKA", "spc-login-pass", "password", loz, setLoz, "", "new-password"]].map(([l, name, t, v, s, ph, ac]) => (
            <div key={name} style={{ textAlign: "left", marginBottom: 10 }}>
              <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 4 }}>{l}</div>
              <input
                ref={name === "spc-login-email" ? emailRef : undefined}
                name={name}
                id={name}
                value={v}
                onChange={(e) => s(e.target.value)}
                readOnly={!inputsReady}
                onFocus={(e) => { if (!inputsReady) setInputsReady(true); e.target.readOnly = false; }}
                type={t}
                placeholder={ph}
                autoComplete={ac}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus={name === "spc-login-email"}
                style={{
                  width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
                  color: C.tekst, fontSize: 13, padding: "8px 12px", boxSizing: "border-box",
                  outline: "none", fontFamily: "inherit",
                }}
              />
            </div>
          ))}
          {err && (
            <div style={{
              color: C.crvena, fontSize: 11, marginBottom: 8, textAlign: "left",
              background: C.nok, padding: "6px 10px", borderRadius: 5,
            }}>{err}</div>
          )}
          <button type="submit" disabled={load}
            style={{
              width: "100%", background: load ? C.hover : C.zelena, border: "none", borderRadius: 6,
              color: load ? C.sivi : C.onAkcent, fontSize: 13, fontWeight: 700, padding: "10px",
              cursor: load ? "not-allowed" : "pointer", letterSpacing: 1, marginTop: 2,
            }}>
            {load ? "Prijavljivanje..." : "PRIJAVA"}
          </button>
        </form>
        <div style={{ textAlign: "center" }}>
          <AppFooter C={C} prikaziAutora kompakt />
        </div>
      </div>
    </div>
  );
}
