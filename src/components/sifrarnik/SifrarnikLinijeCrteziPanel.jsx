import { useState } from "react";
import { btnStyle } from "./sifrarnikPanelStyle.js";
import { syncLinijeCrteziApi, linijeCrteziApiDostupan } from "../../lib/linijeCrteziSyncApi.js";
import { putanjaLinijeRel } from "../../lib/linijaCrteziPaths.js";

/** Admin alat — folderi crteža na disku (lokalni API). */
export default function SifrarnikLinijeCrteziPanel({ C, addToast, radnaLinija = "" }) {
  const [busy, setBusy] = useState(false);
  const [poslednji, setPoslednji] = useState("");

  const pokreni = async (kod = "") => {
    setBusy(true);
    try {
      const rez = await syncLinijeCrteziApi(kod);
      setPoslednji(rez.output || "OK");
      addToast?.(kod ? `✓ Folder ${kod}` : "✓ Svi folderi sinhronizovani", "uspeh");
    } catch (e) {
      const hint = e.status === 401
        ? " Proveri API ključ u localStorage spc_linije_crtezi_api_key"
        : " Pokreni: npm run linije-crtezi:api";
      addToast?.((e.message || "Greška") + hint, "greska");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="sifrarnik-linije-crtezi-panel"
      style={{
        marginBottom: 14,
        padding: "10px 12px",
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: C.panel,
        fontSize: 10,
        lineHeight: 1.45,
      }}
    >
      <div style={{ fontWeight: 700, color: C.tekst, marginBottom: 6 }}>Folderi crteža (VOZ / PRO)</div>
      <p style={{ color: C.sivi, margin: "0 0 8px" }}>
        Kreira <code>public/sifrarnik/linije/vozila|proizvodi/&#123;KOD&#125;/</code> sa
        podfolderima <code>tehnicki</code>, <code>dijagram</code>, <code>sop</code>.
        Zahteva lokalni API (<code>npm run linije-crtezi:api</code>).
      </p>
      {radnaLinija && putanjaLinijeRel(radnaLinija) && (
        <p style={{ color: C.sivi, margin: "0 0 8px", fontSize: 9 }}>
          Radna linija: <code>{putanjaLinijeRel(radnaLinija)}</code>
        </p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          data-testid="linije-crtezi-sync-sve"
          disabled={busy}
          onClick={() => pokreni("")}
          style={btnStyle(C, C.plava, { disabled: busy, fontSize: 10 })}
        >
          {busy ? "…" : "Sinhronizuj sve linije"}
        </button>
        {radnaLinija && (
          <button
            type="button"
            data-testid="linije-crtezi-sync-jedna"
            disabled={busy}
            onClick={() => pokreni(radnaLinija)}
            style={btnStyle(C, C.zelena, { disabled: busy, fontSize: 10 })}
          >
            Kreiraj folder {radnaLinija}
          </button>
        )}
      </div>
      {!linijeCrteziApiDostupan() && (
        <p style={{ color: C.narandzasta || "#f59e0b", fontSize: 9, marginTop: 8, marginBottom: 0 }}>
          VITE_LINIJE_CRTEZI_API_URL nije podešen — koristi se http://localhost:3922
        </p>
      )}
      {poslednji && (
        <pre style={{
          marginTop: 8, marginBottom: 0, fontSize: 8, color: C.sivi,
          whiteSpace: "pre-wrap", maxHeight: 80, overflow: "auto",
        }}>
          {poslednji}
        </pre>
      )}
      <details style={{ marginTop: 8, color: C.sivi, fontSize: 9 }}>
        <summary style={{ cursor: "pointer" }}>Migracija 87 i SQL (admin)</summary>
        <p style={{ margin: "6px 0 0" }}>
          Starter linije: <code>87_tipovi_linije_privremene.sql</code> u Supabase SQL Editoru
          ili <code>npm run db:migrate:go-live</code>.
        </p>
      </details>
    </div>
  );
}
