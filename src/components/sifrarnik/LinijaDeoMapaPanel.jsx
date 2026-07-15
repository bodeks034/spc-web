import { useState, useEffect, useCallback } from "react";
import { fetchLinijaDeoMapa } from "../../lib/linijaDeoMapa.js";
import { usePogonOznake } from "./usePogonOznake.js";

/** Pregled mapa pogon ↔ linija ↔ deo — jedan izvor istine za tablet i šifrarnik. */
export default function LinijaDeoMapaPanel({ C, addToast }) {
  const { format: formatPogon } = usePogonOznake(addToast);
  const [pod, setPod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      setPod(await fetchLinijaDeoMapa());
    } catch (e) {
      addToast?.(e.message, "greska");
      setPod(null);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const q = filter.trim().toLowerCase();
  const redovi = (pod?.redovi || []).filter((r) => {
    if (!q) return true;
    return [r.pogon_kod, r.linija_faza, r.linija_naziv, r.primer_delova]
      .some((v) => String(v || "").toLowerCase().includes(q));
  });

  const INP = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 11,
    padding: "6px 8px",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div data-testid="linija-deo-mapa-panel">
      <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10, lineHeight: 1.55 }}>
        Mapa <strong>pogon → linija → delovi</strong> za tablet (izbor dela po pogonskom slovu).
        Održava se u <em>Pogon mapa</em> + ERP <code>pogon_linija_mapa.csv</code> + delovi po pogonu.
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <input
          style={{ ...INP, flex: "1 1 160px" }}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter pogon / linija / deo"
        />
        <button type="button" onClick={ucitaj} disabled={loading} style={{ ...INP, width: "auto", cursor: "pointer" }}>
          {loading ? "…" : "↻"}
        </button>
      </div>

      {pod && (
        <div style={{ fontSize: 10, color: C.tekst, marginBottom: 8 }}>
          <strong>{pod.ukupnoPogona}</strong> pogona · <strong>{pod.ukupnoDelova}</strong> aktivnih delova u šifrarniku
        </div>
      )}

      {loading ? (
        <div style={{ color: C.sivi, fontSize: 10 }}>Učitavam…</div>
      ) : !redovi.length ? (
        <div style={{ color: C.sivi, fontSize: 10 }}>Nema mapiranih pogona. Dodaj u Pogon mapa ili ERP uvoz.</div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflowX: "auto" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "56px 1fr 72px 1fr 48px",
            gap: 6,
            padding: "8px 10px",
            background: C.hover,
            fontSize: 8,
            fontWeight: 700,
            color: C.sivi,
            letterSpacing: 0.6,
          }}
          >
            <span>POGON</span>
            <span>LINIJA / FAZA</span>
            <span>LIN. ID</span>
            <span>PRIMER DELOVA</span>
            <span>BROJ</span>
          </div>
          {redovi.map((r, i) => (
            <div
              key={`${r.pogon_kod}-${i}`}
              data-testid={`linija-deo-red-${r.pogon_kod}`}
              style={{
                display: "grid",
                gridTemplateColumns: "56px 1fr 72px 1fr 48px",
                gap: 6,
                padding: "8px 10px",
                borderTop: i ? `1px solid ${C.border}` : "none",
                fontSize: 10,
                color: C.tekst,
                background: r.upozorenje ? `${C.zuta}10` : "transparent",
              }}
            >
              <span style={{ fontWeight: 700, color: C.plava }}>{r.pogon_kod}</span>
              <span>
                {r.linija_faza}
                {r.linija_naziv && r.linija_naziv !== "—" && (
                  <span style={{ color: C.sivi, display: "block", fontSize: 9 }}>{r.linija_naziv}</span>
                )}
                {r.upozorenje && (
                  <span style={{ color: C.zuta, display: "block", fontSize: 8 }}>{r.upozorenje}</span>
                )}
              </span>
              <span style={{ color: C.sivi }}>{r.linija_id ?? "—"}</span>
              <span style={{ color: C.sivi, fontSize: 9 }}>{formatPogon(r.pogon_kod)} · {r.primer_delova}</span>
              <span style={{ fontWeight: 700 }}>{r.broj_delova}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
