import { useState, useEffect, useCallback } from "react";
import { ocistiOperativuPreGoLive, pregledOperativnihBrojeva } from "../../lib/ocistiOperativuApi.js";
import { btnStyle } from "../sifrarnik/sifrarnikPanelStyle.js";

export default function AdminOcistiOperativuPanel({ C, addToast }) {
  const [brojevi, setBrojevi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cisti, setCisti] = useState(false);
  const [potvrda, setPotvrda] = useState("");

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      setBrojevi(await pregledOperativnihBrojeva());
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const pokreni = async (zadrziQms) => {
    if (potvrda.trim().toUpperCase() !== "OCISTI") {
      addToast?.('Upiši OCISTI u polje potvrde', "greska");
      return;
    }
    const msg = zadrziQms
      ? "Obrisati operativne podatke ali ZADRŽATI NCR/8D/PFMEA dokumente?"
      : "Obrisati SVE operativne podatke uključujući NCR/8D/PFMEA? Šifrarnik ostaje.";
    if (!window.confirm(`${msg}\n\nPre toga uradi npm run backup:db`)) return;

    setCisti(true);
    try {
      const rez = await ocistiOperativuPreGoLive({ zadrziQms });
      addToast?.(rez.poruka || "✓ Operativa očišćena", "uspeh");
      setPotvrda("");
      await ucitaj();
    } catch (e) {
      const hint = /function.*does not exist|ocisti_operativu/i.test(e.message)
        ? " Pokreni migraciju 77_ocisti_operativu_rpc.sql u Supabase."
        : /DATABASE_URL|SUPABASE_DB_URL|Unauthorized/i.test(e.message)
          ? " Na Vercel-u postavi DATABASE_URL + SUPABASE_SERVICE_ROLE_KEY za pun SQL API."
          : /Samo admin/i.test(e.message)
            ? ""
            : " Alternativa: npm run db:ocisti-operativu -- --potvrdi";
      addToast?.(e.message + hint, "greska");
    } finally {
      setCisti(false);
    }
  };

  return (
    <div style={{
      background: `${C.crvena || "#dc2626"}10`,
      border: `1px solid ${C.crvena || "#dc2626"}44`,
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
    }}
    >
      <div style={{ color: C.tekst, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
        Očisti operativu pre go-live
      </div>
      <div style={{ color: C.sivi, fontSize: 10, lineHeight: 1.5, marginBottom: 10 }}>
        Briše merenja, log, KPI, alarme, NCR… <strong>Šifrarnik ostaje</strong>.
        Pre pokretanja: <code>npm run backup:db</code>. Zahteva migraciju <code>77_ocisti_operativu_rpc.sql</code> (ili <code>npm run db:migrate:go-live</code>).
      </div>

      {loading ? (
        <div style={{ color: C.sivi, fontSize: 10 }}>Učitavanje brojeva…</div>
      ) : brojevi && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, fontSize: 9, color: C.sivi }}>
          {Object.entries(brojevi).map(([t, n]) => (
            <span key={t} style={{ background: C.panel, padding: "2px 6px", borderRadius: 4 }}>
              {t}: <strong style={{ color: C.tekst }}>{n ?? "?"}</strong>
            </span>
          ))}
        </div>
      )}

      <label style={{ display: "block", marginBottom: 8 }}>
        <span style={{ color: C.sivi, fontSize: 9 }}>Potvrda — upiši OCISTI</span>
        <input
          value={potvrda}
          onChange={(e) => setPotvrda(e.target.value)}
          style={{
            display: "block", width: "100%", maxWidth: 200, marginTop: 4,
            background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.tekst, padding: "6px 8px", fontSize: 11,
          }}
        />
      </label>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={cisti} onClick={() => pokreni(false)}
          style={btnStyle(C, C.crvena || "#dc2626", { disabled: cisti, fontSize: 10 })}>
          {cisti ? "…" : "Obriši operativu (pun)"}
        </button>
        <button type="button" disabled={cisti} onClick={() => pokreni(true)}
          style={btnStyle(C, C.narandzasta || "#f59e0b", { disabled: cisti, fontSize: 10 })}>
          {cisti ? "…" : "Obriši — zadrži 8D/PFMEA"}
        </button>
        <button type="button" onClick={ucitaj} style={btnStyle(C, C.hover, { fontSize: 10 })}>
          ↻ Osveži
        </button>
      </div>
    </div>
  );
}
