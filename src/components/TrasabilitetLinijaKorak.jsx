import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  ucitajTrasabilitetLinijaAtr,
  ucitajTrasabilitetLinijaMer,
} from "../lib/trasabilitetIzvestaj.js";

/** Pregled loga pre poka-yoke (Modul 1, ograničeno). */
export default function TrasabilitetLinijaKorak({
  C,
  modul = "atributivne",
  idDeo,
  smena,
  nazivDela,
  onDalje,
  daljeLabel = "Ček lista →",
}) {
  const [podaci, setPodaci] = useState(null);
  const [loading, setLoading] = useState(true);
  const jeMer = modul === "merljive";
  const akcent = jeMer ? C.zelena : C.plava;

  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      const r = jeMer
        ? await ucitajTrasabilitetLinijaMer(supabase, { idDeo, smena, limit: 25 })
        : await ucitajTrasabilitetLinijaAtr(supabase, { idDeo, smena, limit: 25 });
      if (ok) {
        setPodaci(r);
        setLoading(false);
      }
    })();
    return () => { ok = false; };
  }, [idDeo, smena, jeMer]);

  const log = podaci?.log || [];
  const merenja = podaci?.merenja || [];
  const okUk = jeMer
    ? merenja.filter(r => r.status === "OK").length
    : log.reduce((s, r) => s + (r.ok_kolicina || 0), 0);
  const nokUk = jeMer
    ? merenja.filter(r => r.status === "NOK").length
    : log.reduce((s, r) => s + (r.nok_kolicina || 0), 0);
  const ukupno = jeMer ? merenja.length : log.length;

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", minHeight: 0, gap: 12,
    }}>
      <div style={{ color: akcent, fontSize: 10, letterSpacing: 1.5, fontWeight: 700 }}>
        LISTA · TRASABILITET ({jeMer ? "merljive" : "atributivne"})
      </div>
      <p style={{ color: C.sivi, fontSize: 10, lineHeight: 1.5, margin: 0 }}>
        Pregled poslednjih unosa za <strong style={{ color: C.tekst }}>{idDeo}</strong>
        {nazivDela ? ` · ${nazivDela}` : ""}. Samo {jeMer ? "merljiva merenja" : "OK/NOK log"} — bez PDF.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, flexShrink: 0 }}>
        {[["UNOSA", ukupno, akcent], ["OK", okUk, C.zelena], ["NOK", nokUk, C.crvena]].map(([l, v, b]) => (
          <div key={l} style={{
            background: C.panel, border: `1px solid ${b}35`, borderRadius: 8,
            padding: "10px 8px", textAlign: "center",
          }}>
            <div style={{ color: b, fontSize: 20, fontWeight: 800 }}>{v}</div>
            <div style={{ color: C.sivi, fontSize: 9, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{
        flex: 1, minHeight: 120, overflow: "auto", border: `1px solid ${C.border}`,
        borderRadius: 8, background: C.panel,
      }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: C.sivi, fontSize: 11 }}>Učitavam…</div>
        ) : podaci?.greska ? (
          <div style={{ padding: 16, color: C.crvena, fontSize: 11 }}>{podaci.greska}</div>
        ) : ukupno === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: C.border, fontSize: 11 }}>
            Nema prethodnih unosa za ovaj ID (7 dana).
          </div>
        ) : jeMer ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.sivi, textAlign: "left" }}>
                {["Datum", "Ser.", "Dim.", "Vred.", "St."].map(h => (
                  <th key={h} style={{ padding: "6px 8px", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {merenja.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.hover}` }}>
                  <td style={{ padding: "5px 8px" }}>{r.datum?.slice(5) || r.datum}</td>
                  <td style={{ padding: "5px 8px" }}>{r.sifra_merenja || "—"}</td>
                  <td style={{ padding: "5px 8px" }}>{r.pozicija || "—"}</td>
                  <td style={{ padding: "5px 8px" }}>{r.vrednost_raw ?? "—"}</td>
                  <td style={{
                    padding: "5px 8px",
                    color: r.status === "NOK" ? C.crvena : C.zelena,
                    fontWeight: 700,
                  }}>
                    {r.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.sivi, textAlign: "left" }}>
                {["Datum", "St.", "OK", "NOK", "Greška"].map(h => (
                  <th key={h} style={{ padding: "6px 8px", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.hover}` }}>
                  <td style={{ padding: "5px 8px" }}>{r.datum?.slice(5) || r.datum}</td>
                  <td style={{
                    padding: "5px 8px",
                    color: r.status === "NOK" ? C.crvena : C.zelena,
                    fontWeight: 700,
                  }}>
                    {r.status}
                  </td>
                  <td style={{ padding: "5px 8px" }}>{r.ok_kolicina ?? 0}</td>
                  <td style={{ padding: "5px 8px" }}>{r.nok_kolicina ?? 0}</td>
                  <td style={{ padding: "5px 8px", color: C.sivi, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {r.greska_naziv || r.podkategorija || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDalje?.()}
        style={{
          background: akcent, border: "none", borderRadius: 8, color: C.onAkcent,
          fontSize: 14, fontWeight: 800, padding: "14px 24px", cursor: "pointer",
          alignSelf: "flex-end",
        }}
      >
        {daljeLabel}
      </button>
    </div>
  );
}
