import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  ucitajPodesavanjaNotifikacija,
  sacuvajPodesavanjaNotifikacija,
  zatraziBrowserDozvolu,
  posaljiObavestenje,
} from "../lib/notifikacije.js";

const SMTP_DEFAULTS = {
  notif_browser: "1",
  notif_teams: "0",
  teams_webhook: "",
  notif_email: "0",
  notif_email_spc: "1",
  email_webhook: "",
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_pass: "",
  smtp_from: "",
  smtp_to: "",
  smtp_to_spc: "",
  smtp_tls: "1",
  email_provider: "auto",
  email_resend_from: "",
  notif_teams_auto: "1",
  teams_webhook_auto: "",
};

export default function NotifikacijePodesavanja({ C, addToast }) {
  const [s, setS] = useState({ ...SMTP_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [perm, setPerm] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );

  const ucitaj = useCallback(async () => {
    setLoading(true);
    const p = await ucitajPodesavanjaNotifikacija(supabase);
    setS(p);
    setLoading(false);
  }, []);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const set = (k, v) => setS(p => ({ ...p, [k]: v }));

  const snimi = async () => {
    setSaving(true);
    const r = await sacuvajPodesavanjaNotifikacija(supabase, s);
    setSaving(false);
    if (r.ok) addToast?.("✓ Podešavanja obaveštenja sačuvana", "uspeh");
    else addToast?.(r.error || "Sačuvano lokalno (tabela app_podesavanja?)", "info");
  };

  const test = async () => {
    try {
      const r = await posaljiObavestenje(supabase, s, {
        id: "test_" + Date.now(),
        naslov: "SPC test obaveštenja",
        opis: "Provera kanala obaveštenja iz admin panela.",
        nivo: "srednji",
      });
      const err = r?.rezultati?.find((x) => !x.uspeh);
      if (err) addToast?.(`Email/Teams greška: ${err.greska}`, "greska");
      else addToast?.("Test poslat (proveri Teams / browser / inbox)", "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const testSpc = async () => {
    const eff = { ...s, notif_email: "1", notif_email_spc: "1" };
    if (eff.smtp_to_spc?.trim()) eff.smtp_to = eff.smtp_to_spc.trim();
    if (!eff.smtp_to?.trim()) {
      addToast?.("Unesi primalac (to) ili SPC primalac", "greska");
      return;
    }
    try {
      const r = await posaljiObavestenje(supabase, eff, {
        id: "test_spc_" + Date.now(),
        naslov: "SPC ALARM TEST — MRAP-001",
        opis: "p-karta · Western Electric · simulacija",
        nivo: "kriticno",
      });
      const email = r?.rezultati?.find((x) => x.kanal === "smtp" || x.kanal === "resend");
      if (email && !email.uspeh) addToast?.(`Email: ${email.greska}`, "greska");
      else addToast?.("SPC email test poslat — proveri inbox", "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const INP = {
    width: "100%", background: C.input, border: `1px solid ${C.border}`,
    borderRadius: 6, color: C.tekst, fontSize: 11, padding: "8px 10px",
    boxSizing: "border-box", fontFamily: "inherit",
  };

  if (loading) return <div style={{ color: C.sivi, fontSize: 12 }}>Učitavanje…</div>;

  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20,
    }}>
      <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>
        OBAVEŠTENJA (FAZA C + SMTP)
      </div>
      <p style={{ color: C.sivi, fontSize: 10, lineHeight: 1.55, marginBottom: 14 }}>
        Teams: Incoming Webhook URL iz kanala. Šalje se preko Supabase Edge proxy-a (zaobilazi CORS).
        Email: SMTP (IT server) ili <strong>Resend</strong> (HTTP, radi u browseru) preko edge funkcije
        <strong> send-email</strong>, ili generički JSON webhook (Power Automate, n8n).
        Alarmi visokog i srednjeg prioriteta — max 1× po satu po alarmu.
      </p>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 11 }}>
        <input type="checkbox" checked={s.notif_browser === "1"} onChange={e => set("notif_browser", e.target.checked ? "1" : "0")} />
        <span>Browser notifikacije</span>
        <span style={{ color: C.sivi, fontSize: 9 }}>({perm})</span>
        {perm !== "granted" && (
          <button type="button" onClick={async () => setPerm(await zatraziBrowserDozvolu())}
            style={{ marginLeft: "auto", fontSize: 9, padding: "4px 8px", cursor: "pointer" }}>
            Dozvoli
          </button>
        )}
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11 }}>
        <input type="checkbox" checked={s.notif_teams === "1"} onChange={e => set("notif_teams", e.target.checked ? "1" : "0")} />
        Microsoft Teams webhook
      </label>
      <input style={{ ...INP, marginBottom: 12 }} placeholder="https://...webhook.office.com/..."
        value={s.teams_webhook} onChange={e => set("teams_webhook", e.target.value)} />

      <div style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: 12, marginBottom: 12,
      }}>
        <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 8 }}>
          AUTO PRAVILA — TEAMS (odvojeni kanal)
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11 }}>
          <input type="checkbox" checked={s.notif_teams_auto !== "0"} onChange={e => set("notif_teams_auto", e.target.checked ? "1" : "0")} />
          Teams za auto-pravila (3× NOK, NCR rok, digest…)
        </label>
        <input style={{ ...INP, marginBottom: 4 }} placeholder="Teams webhook — kanal #spc-auto (opciono)"
          value={s.teams_webhook_auto || ""} onChange={e => set("teams_webhook_auto", e.target.value)} />
        <p style={{ color: C.sivi, fontSize: 9, margin: 0 }}>
          Ako prazno, koristi glavni Teams webhook iznad.
        </p>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11 }}>
        <input type="checkbox" checked={s.notif_email === "1"} onChange={e => set("notif_email", e.target.checked ? "1" : "0")} />
        Email (SMTP ili webhook)
      </label>

      <div style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: 12, marginBottom: 12,
      }}>
        <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 8 }}>EMAIL PROVIDER</div>
        <select style={{ ...INP, marginBottom: 10 }} value={s.email_provider || "auto"}
          onChange={e => set("email_provider", e.target.value)}>
          <option value="auto">Auto — Resend na serveru (preporučeno u browseru)</option>
          <option value="resend">Resend (HTTP API)</option>
          <option value="smtp">SMTP (IT mail server)</option>
        </select>
        <p style={{ color: C.sivi, fontSize: 9, lineHeight: 1.45, margin: "0 0 10px" }}>
          Resend: <code style={{ fontSize: 8 }}>npm run deploy:resend</code> — API ključ na serveru, ovde samo primalci.
          Sandbox (<code style={{ fontSize: 8 }}>onboarding@resend.dev</code>) šalje samo na email tvog Resend naloga.
          Za druge adrese: verifikuj domen na resend.com/domains i postavi From sa tog domena.
        </p>
        <input style={{ ...INP, marginBottom: 12 }} placeholder="Resend From (opciono, npr. SPC &lt;noreply@tvoj-domen.rs&gt;)"
          value={s.email_resend_from} onChange={e => set("email_resend_from", e.target.value)} />
      </div>

      <div style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: 12, marginBottom: 12,
      }}>
        <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 8 }}>SMTP (IT mail server)</div>
        <p style={{ color: C.sivi, fontSize: 9, lineHeight: 1.45, margin: "0 0 10px" }}>
          Produkcija: IT postavi <strong style={{ color: C.tekst }}>SMTP secrets na serveru</strong> (
          <code style={{ fontSize: 8 }}>npm run deploy:smtp</code>
          ) — ovde samo primalci. Lozinka u formi je opciona (dev). Van app:{" "}
          <code style={{ fontSize: 8 }}>npm run email:send</code>
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8, marginBottom: 8 }}>
          <input style={INP} placeholder="smtp.firma.rs" value={s.smtp_host} onChange={e => set("smtp_host", e.target.value)} />
          <input style={INP} placeholder="587" value={s.smtp_port} onChange={e => set("smtp_port", e.target.value)} />
        </div>
        <input style={{ ...INP, marginBottom: 8 }} placeholder="korisnik@firma.rs" value={s.smtp_user} onChange={e => set("smtp_user", e.target.value)} />
        <input style={{ ...INP, marginBottom: 8 }} type="password" placeholder="SMTP lozinka (opciono ako su server secrets)" value={s.smtp_pass} onChange={e => set("smtp_pass", e.target.value)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <input style={INP} placeholder="From (opciono)" value={s.smtp_from} onChange={e => set("smtp_from", e.target.value)} />
          <input style={INP} placeholder="Primalac (to) — više: zarez ili ;" value={s.smtp_to} onChange={e => set("smtp_to", e.target.value)} />
        </div>
        <div style={{
          borderTop: `1px solid ${C.border}`, marginTop: 4, paddingTop: 10, marginBottom: 8,
        }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11 }}>
            <input type="checkbox" checked={s.notif_email_spc === "1"} onChange={e => set("notif_email_spc", e.target.checked ? "1" : "0")} />
            Email za SPC alarme / karantin (prioritet)
          </label>
          <input style={INP} placeholder="SPC primalac — više: kvalitet@firma.rs, sef@firma.rs"
            value={s.smtp_to_spc} onChange={e => set("smtp_to_spc", e.target.value)} />
          <div style={{ color: C.sivi, fontSize: 9, marginTop: 6, lineHeight: 1.4 }}>
            Ako je prazno, koristi se opšti primalac. Šalje se sa linije odmah pri novom alarmu.
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.sivi }}>
          <input type="checkbox" checked={s.smtp_tls !== "0"} onChange={e => set("smtp_tls", e.target.checked ? "1" : "0")} />
          STARTTLS (port 587)
        </label>
      </div>

      <div style={{ color: C.sivi, fontSize: 9, marginBottom: 6 }}>Alternativa: generički webhook</div>
      <input style={{ ...INP, marginBottom: 14 }} placeholder="https://..."
        value={s.email_webhook} onChange={e => set("email_webhook", e.target.value)} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={saving} onClick={snimi}
          style={{
            background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent,
            fontSize: 11, fontWeight: 700, padding: "8px 16px", cursor: "pointer",
          }}>
          {saving ? "…" : "Sačuvaj"}
        </button>
        <button type="button" onClick={testSpc}
          style={{
            background: C.crvena, border: "none", borderRadius: 6, color: C.onAkcent,
            fontSize: 11, padding: "8px 14px", cursor: "pointer",
          }}>
          Test SPC email
        </button>
        <button type="button" onClick={test}
          style={{
            background: C.plava, border: "none", borderRadius: 6, color: C.onAkcent,
            fontSize: 11, padding: "8px 14px", cursor: "pointer",
          }}>
          Test obaveštenje
        </button>
      </div>
      <p style={{ color: C.border, fontSize: 9, marginTop: 10 }}>
        SQL: 17_notifikacije.sql · deploy: npm run deploy:resend · npm run deploy:smtp
      </p>
    </div>
  );
}
