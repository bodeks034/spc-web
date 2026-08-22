import { useState, useEffect, useCallback, useRef } from "react";
import { fetchNastaviChecklist, STATUS_DEO_LABEL } from "../../lib/sifrarnikOdrzavanje.js";
import { SIFRARNIK_STATUS_EVENT } from "../../lib/sifrarnikStatusEvent.js";
import { bannerDismissed, dismissNastaviBanner } from "../../lib/sifrarnikBanner.js";

/** Banner na vrhu Modula 0 — prvi delimični deo i sledeći korak checkliste. */
export default function SifrarnikNastaviBanner({ C, onNavigate, skriveno = false }) {
  const [stavka, setStavka] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sakriveno, setSakriveno] = useState(() => bannerDismissed());
  const preskociRef = useRef(null);

  const osvezi = useCallback(async () => {
    setLoading(true);
    try {
      setStavka(await fetchNastaviChecklist({ preskociIdDeo: preskociRef.current }));
    } catch {
      setStavka(null);
    } finally {
      preskociRef.current = null;
      setLoading(false);
    }
  }, []);

  useEffect(() => { osvezi(); }, [osvezi]);

  useEffect(() => {
    const handler = (e) => {
      const id = e.detail?.idDeo ? String(e.detail.idDeo).trim().toUpperCase() : null;
      if (id) preskociRef.current = id;
      osvezi();
    };
    window.addEventListener(SIFRARNIK_STATUS_EVENT, handler);
    return () => window.removeEventListener(SIFRARNIK_STATUS_EVENT, handler);
  }, [osvezi]);

  if (skriveno || sakriveno || loading || !stavka) return null;

  const { deo, status, koraci, nedostaje } = stavka;
  const stMeta = STATUS_DEO_LABEL[status];
  const prvi = koraci[0];

  return (
    <div
      data-testid="sifrarnik-nastavi-banner"
      style={{
        marginBottom: 10,
        padding: "10px 12px",
        borderRadius: 8,
        flexShrink: 0,
        border: `1px solid ${C.narandzasta || "#f59e0b"}55`,
        background: `${C.narandzasta || "#f59e0b"}12`,
        color: C.tekst,
        fontSize: 10,
        lineHeight: 1.45,
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <strong>Nastavi checklist:</strong>{" "}
        <span style={{ color: C.plava, fontWeight: 700 }}>{deo.id_deo}</span>
        {deo.naziv_dela && (
          <span style={{ color: C.sivi }}> — {deo.naziv_dela}</span>
        )}
        {" · "}
        <span style={{ color: C.narandzasta || "#f59e0b", fontWeight: 700 }}>
          {stMeta?.label || status}
        </span>
        {nedostaje?.length > 0 && (
          <span style={{ color: C.sivi }}> (nedostaje: {nedostaje.join(", ")})</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {prvi && (
          <button
            type="button"
            data-testid="sifrarnik-nastavi-cta"
            onClick={() => onNavigate?.(prvi.tab, prvi.ctx)}
            style={{
              background: C.plava,
              border: "none",
              borderRadius: 6,
              color: C.onAkcent,
              fontSize: 10,
              fontWeight: 700,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            {prvi.label} →
          </button>
        )}
        <button
          type="button"
          data-testid="sifrarnik-nastavi-dismiss"
          onClick={() => { dismissNastaviBanner(); setSakriveno(true); }}
          title="Sakrij do kraja sesije"
          style={{
            background: C.hover,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.sivi,
            fontSize: 10,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          Ne sada
        </button>
        <button
          type="button"
          onClick={osvezi}
          title="Osveži"
          style={{
            background: C.hover,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.sivi,
            fontSize: 10,
            padding: "6px 10px",
            cursor: "pointer",
          }}
        >
          ↻
        </button>
      </div>
    </div>
  );
}
