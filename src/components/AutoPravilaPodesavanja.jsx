import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { ucitajPodesavanjaNotifikacija, sacuvajPodesavanjaNotifikacija } from "../lib/notifikacije.js";
import { AUTO_PRAVILO_KLJUCEVI, AUTO_PRAVILO_DEFAULTS, spojiAutoPodesavanja } from "../lib/autoPodesavanja.js";
import { AUTO_PRAVILA } from "../lib/autoPravila.js";

const LABELI = {
  [AUTO_PRAVILO_KLJUCEVI.nok3]: "3× NOK uzastopna (eskalacija + NCR)",
  [AUTO_PRAVILO_KLJUCEVI.spc_ncr]: "SPC alarm → NCR draft",
  [AUTO_PRAVILO_KLJUCEVI.ncr_zatvori]: "Zatvaranje NCR → eskalacije/SPC",
  [AUTO_PRAVILO_KLJUCEVI.ncr_8d_draft]: "NCR bez 8D → auto draft (cron)",
  [AUTO_PRAVILO_KLJUCEVI.podsetnici]: "Dnevni podsetnici (email/Teams)",
  [AUTO_PRAVILO_KLJUCEVI.digest]: "Smenski digest email",
  [AUTO_PRAVILO_KLJUCEVI.weekly]: "Nedeljni rollup email",
  [AUTO_PRAVILO_KLJUCEVI.health]: "Dnevni health check (+ email ako problem)",
  [AUTO_PRAVILO_KLJUCEVI.erp]: "ERP dnevni uvoz (CSV drop folder)",
  [AUTO_PRAVILO_KLJUCEVI.erp_izvoz]: "ERP dnevni izvoz kvaliteta (outgoing, 06:15)",
  [AUTO_PRAVILO_KLJUCEVI.erp_cleanup]: "ERP arhiva: nedeljno retention čišćenje (90 dana)",
  [AUTO_PRAVILO_KLJUCEVI.push_kriticno]: "Browser push (kritično u aplikaciji)",
};

/** Uključivanje/isključivanje auto-pravila (app_podesavanja). */
export default function AutoPravilaPodesavanja({ C, addToast }) {
  const [s, setS] = useState({ ...AUTO_PRAVILO_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    const p = await ucitajPodesavanjaNotifikacija(supabase);
    setS(spojiAutoPodesavanja(p));
    setLoading(false);
  }, []);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const toggle = (kljuc) => setS((prev) => ({
    ...prev,
    [kljuc]: prev[kljuc] === "0" ? "1" : "0",
  }));

  const snimi = async () => {
    setSaving(true);
    const postojece = await ucitajPodesavanjaNotifikacija(supabase);
    const merged = { ...postojece, ...s };
    const r = await sacuvajPodesavanjaNotifikacija(supabase, merged);
    setSaving(false);
    addToast?.(r.ok ? "✓ Auto pravila sačuvana" : (r.error || "Sačuvano lokalno"), r.ok ? "uspeh" : "info");
  };

  if (loading) return <div style={{ color: C.sivi, fontSize: 11 }}>Učitavam…</div>;

  return (
    <div
      data-testid="auto-pravila-podesavanja"
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
        UKLJUČIVANJE AUTO-PRAVILA
      </div>
      <p style={{ color: C.sivi, fontSize: 9, margin: "0 0 12px" }}>
        Isključi pravilo tokom obuke/pilota bez deploy-a. Cron i linija poštuju ova podešavanja.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {Object.entries(AUTO_PRAVILO_KLJUCEVI).map(([id, kljuc]) => (
          <label
            key={kljuc}
            data-testid={`auto-toggle-${id}`}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: C.tekst, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={s[kljuc] !== "0"}
              onChange={() => toggle(kljuc)}
            />
            {LABELI[kljuc] || kljuc}
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={snimi}
        disabled={saving}
        style={{
          background: C.plava,
          border: "none",
          borderRadius: 6,
          color: C.onAkcent,
          fontSize: 11,
          fontWeight: 700,
          padding: "8px 16px",
          cursor: saving ? "wait" : "pointer",
        }}
      >
        {saving ? "…" : "Sačuvaj pravila"}
      </button>
      <p style={{ color: C.sivi, fontSize: 9, margin: "10px 0 0" }}>
        Katalog: {AUTO_PRAVILA.length} pravila u panelu iznad.
      </p>
    </div>
  );
}
