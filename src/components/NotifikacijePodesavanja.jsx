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
  email_webhook: "",
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_pass: "",
  smtp_from: "",
  smtp_to: "",
  smtp_tls: "1",
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
    await posaljiObavestenje(supabase, s, {
      id: "test_" + Date.now(),
      naslov: "SPC test obaveštenja",
      opis: "Provera kanala obaveštenja iz admin panela.",
      nivo: "srednji",
    });
    addToast?.("Test poslat (proveri Teams / browser / email)", "uspeh");
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
        Deploy: docs/SUPABASE_EDGE_WEBHOOK.md. Email: SMTP (IT mail server) preko edge funkcije
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

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 11 }}>
        <input type="checkbox" checked={s.notif_email === "1"} onChange={e => set("notif_email", e.target.checked ? "1" : "0")} />
        Email (SMTP ili webhook)
      </label>

      <div style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: 12, marginBottom: 12,
      }}>
        <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 8 }}>SMTP (IT mail server)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 8, marginBottom: 8 }}>
          <input style={INP} placeholder="smtp.firma.rs" value={s.smtp_host} onChange={e => set("smtp_host", e.target.value)} />
          <input style={INP} placeholder="587" value={s.smtp_port} onChange={e => set("smtp_port", e.target.value)} />
        </div>
        <input style={{ ...INP, marginBottom: 8 }} placeholder="korisnik@firma.rs" value={s.smtp_user} onChange={e => set("smtp_user", e.target.value)} />
        <input style={{ ...INP, marginBottom: 8 }} type="password" placeholder="SMTP lozinka" value={s.smtp_pass} onChange={e => set("smtp_pass", e.target.value)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <input style={INP} placeholder="From (opciono)" value={s.smtp_from} onChange={e => set("smtp_from", e.target.value)} />
          <input style={INP} placeholder="Primalac (to)" value={s.smtp_to} onChange={e => set("smtp_to", e.target.value)} />
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
            background: C.zelena, border: "none", borderRadius: 6, color: "#fff",
            fontSize: 11, fontWeight: 700, padding: "8px 16px", cursor: "pointer",
          }}>
          {saving ? "…" : "Sačuvaj"}
        </button>
        <button type="button" onClick={test}
          style={{
            background: C.plava, border: "none", borderRadius: 6, color: "#fff",
            fontSize: 11, padding: "8px 14px", cursor: "pointer",
          }}>
          Test obaveštenje
        </button>
      </div>
      <p style={{ color: C.border, fontSize: 9, marginTop: 10 }}>
        SQL: 17_notifikacije.sql · 35_faza5_qms.sql · deploy: supabase functions deploy send-email
      </p>
    </div>
  );
}
