import { useState, useEffect, useCallback } from "react";
import { fetchSifrarnikAudit } from "../../lib/sifrarnikAudit.js";
import { uporediDelovi } from "../../lib/sifrarnikUporedi.js";
import { generisiValidacioniIzvestaj, preuzmiValidacioniCsv } from "../../lib/sifrarnikValidacija.js";
import { previewPropagacije } from "../../lib/sifrarnikPropagacijaPreview.js";
import { btnStyle, inpStyle } from "./sifrarnikPanelStyle.js";

/** Audit, upoređivanje, validacija — alati za inženjere. */
export default function SifrarnikAlatiPanel({ C, addToast, onNavigate }) {
  const [auditFilter, setAuditFilter] = useState("");
  const [audit, setAudit] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");
  const [uporedi, setUporedi] = useState(null);
  const [uporediBusy, setUporediBusy] = useState(false);
  const [validBusy, setValidBusy] = useState(false);
  const [previewId, setPreviewId] = useState("");
  const [preview, setPreview] = useState(null);
  const INP = inpStyle(C);

  const ucitajAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      setAudit(await fetchSifrarnikAudit({
        idDeo: auditFilter.trim() || null,
        limit: 40,
      }));
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setAuditLoading(false);
    }
  }, [auditFilter, addToast]);

  useEffect(() => { ucitajAudit(); }, [ucitajAudit]);

  const pokreniUporedi = async () => {
    setUporediBusy(true);
    try {
      setUporedi(await uporediDelovi(idA, idB));
    } catch (e) {
      addToast?.(e.message, "greska");
      setUporedi(null);
    } finally {
      setUporediBusy(false);
    }
  };

  const izveziValidaciju = async () => {
    setValidBusy(true);
    try {
      const stavke = await generisiValidacioniIzvestaj();
      if (!stavke.length) {
        addToast?.("Nema problema u izveštaju", "info");
        return;
      }
      preuzmiValidacioniCsv(stavke);
      addToast?.(`✓ CSV: ${stavke.length} stavki`, "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setValidBusy(false);
    }
  };

  const pokreniPreview = async () => {
    try {
      const p = await previewPropagacije({ idDeo: previewId.trim() || null });
      setPreview(p);
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  return (
    <div data-testid="sifrarnik-alati-panel" style={{ marginTop: 16, display: "grid", gap: 14 }}>
      <section style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel }}>
        <div style={{ color: C.tekst, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Audit log šifrarnika</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <input
            data-testid="audit-filter-id"
            value={auditFilter}
            onChange={(e) => setAuditFilter(e.target.value.toUpperCase())}
            placeholder="Filter ID dela (opciono)"
            style={{ ...INP, width: 160 }}
          />
          <button type="button" onClick={ucitajAudit} style={btnStyle(C, C.hover, { fontSize: 9 })}>
            {auditLoading ? "…" : "↻ Osveži"}
          </button>
        </div>
        {audit.length === 0 && !auditLoading && (
          <div style={{ color: C.sivi, fontSize: 9 }}>Nema zapisa (primeni migraciju 80)</div>
        )}
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: 9, lineHeight: 1.6, maxHeight: 160, overflow: "auto" }}>
          {audit.map((r) => (
            <li key={r.id} style={{ borderTop: `1px solid ${C.border}`, padding: "4px 0" }}>
              <strong style={{ color: C.plava }}>{r.id_deo || "—"}</strong>
              {" · "}{r.akcija}
              <span style={{ color: C.sivi }}> ({r.izvor || "?"}) </span>
              <span style={{ color: C.sivi }}>{r.created_at?.slice(0, 16)?.replace("T", " ")}</span>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel }}>
        <div style={{ color: C.tekst, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Uporedi dva dela</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>DELO A</span>
            <input value={idA} onChange={(e) => setIdA(e.target.value.toUpperCase())} style={{ ...INP, width: 120 }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>DELO B</span>
            <input value={idB} onChange={(e) => setIdB(e.target.value.toUpperCase())} style={{ ...INP, width: 120 }} />
          </label>
          <button type="button" data-testid="uporedi-dela-btn" disabled={uporediBusy} onClick={pokreniUporedi}
            style={btnStyle(C, C.plava, { fontSize: 9 })}>
            {uporediBusy ? "…" : "Uporedi"}
          </button>
        </div>
        {uporedi && (
          <div style={{ marginTop: 8, fontSize: 9, color: C.sivi, lineHeight: 1.5 }}>
            <div>A: {uporedi.a.dimenzije.length} dim, {uporedi.a.greske.length} grešaka · status {uporedi.a.status || "?"}</div>
            <div>B: {uporedi.b.dimenzije.length} dim, {uporedi.b.greske.length} grešaka · status {uporedi.b.status || "?"}</div>
            <div style={{ color: C.narandzasta || "#f59e0b", marginTop: 4 }}>
              Samo A: {uporedi.razlike.samoA.length} dim · Samo B: {uporedi.razlike.samoB.length} dim
            </div>
          </div>
        )}
      </section>

      <section style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel }}>
        <div style={{ color: C.tekst, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Validacioni izveštaj (CSV)</div>
        <button type="button" data-testid="validacija-csv-btn" disabled={validBusy} onClick={izveziValidaciju}
          style={btnStyle(C, C.hover, { fontSize: 9 })}>
          {validBusy ? "…" : "Izvezi CSV problema"}
        </button>
      </section>

      <section style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel }}>
        <div style={{ color: C.tekst, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Preview propagacije (po delu)</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={previewId} onChange={(e) => setPreviewId(e.target.value.toUpperCase())} placeholder="ID dela" style={{ ...INP, width: 140 }} />
          <button type="button" data-testid="propagacija-preview-btn" onClick={pokreniPreview} style={btnStyle(C, C.plava, { fontSize: 9 })}>
            Preview
          </button>
          {preview && (
            <span style={{ color: C.sivi, fontSize: 9, alignSelf: "center" }}>{preview.poruka}</span>
          )}
        </div>
      </section>
    </div>
  );
}
