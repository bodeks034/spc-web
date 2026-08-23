import { useState, useEffect, useCallback } from "react";
import { fetchSifrarnikAudit, preuzmiAuditCsv } from "../../lib/sifrarnikAudit.js";
import { uporediDelovi } from "../../lib/sifrarnikUporedi.js";
import { generisiValidacioniIzvestaj, preuzmiValidacioniCsv } from "../../lib/sifrarnikValidacija.js";
import { previewPropagacije } from "../../lib/sifrarnikPropagacijaPreview.js";
import { btnStyle, inpStyle } from "./sifrarnikPanelStyle.js";

const AUDIT_PAGE = 40;

/** Audit, upoređivanje, validacija — alati za inženjere. */
export default function SifrarnikAlatiPanel({ C, addToast, onNavigate }) {
  const [auditFilter, setAuditFilter] = useState("");
  const [auditAkcija, setAuditAkcija] = useState("");
  const [auditOd, setAuditOd] = useState("");
  const [audit, setAudit] = useState([]);
  const [auditOffset, setAuditOffset] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");
  const [uporedi, setUporedi] = useState(null);
  const [uporediBusy, setUporediBusy] = useState(false);
  const [validBusy, setValidBusy] = useState(false);
  const [previewId, setPreviewId] = useState("");
  const [preview, setPreview] = useState(null);
  const INP = inpStyle(C);

  const ucitajAudit = useCallback(async (offset = 0, append = false) => {
    setAuditLoading(true);
    try {
      const rows = await fetchSifrarnikAudit({
        idDeo: auditFilter.trim() || null,
        akcija: auditAkcija.trim() || null,
        od: auditOd ? new Date(auditOd).toISOString() : null,
        limit: AUDIT_PAGE,
        offset,
      });
      setAudit((prev) => (append ? [...prev, ...rows] : rows));
      setAuditOffset(offset + rows.length);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setAuditLoading(false);
    }
  }, [auditFilter, auditAkcija, auditOd, addToast]);

  useEffect(() => { ucitajAudit(0, false); }, [auditFilter, auditAkcija, auditOd]); // eslint-disable-line react-hooks/exhaustive-deps

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
            placeholder="ID dela"
            style={{ ...INP, width: 120 }}
          />
          <input
            data-testid="audit-filter-akcija"
            value={auditAkcija}
            onChange={(e) => setAuditAkcija(e.target.value)}
            placeholder="Akcija"
            style={{ ...INP, width: 100 }}
          />
          <input
            data-testid="audit-filter-od"
            type="date"
            value={auditOd}
            onChange={(e) => setAuditOd(e.target.value)}
            style={{ ...INP, width: 130 }}
          />
          <button type="button" onClick={() => ucitajAudit(0, false)} style={btnStyle(C, C.hover, { fontSize: 9 })}>
            {auditLoading ? "…" : "↻ Osveži"}
          </button>
          <button
            type="button"
            data-testid="audit-csv-export"
            disabled={!audit.length}
            onClick={() => preuzmiAuditCsv(audit)}
            style={btnStyle(C, C.hover, { fontSize: 9, opacity: audit.length ? 1 : 0.5 })}
          >
            CSV
          </button>
        </div>
        {audit.length === 0 && !auditLoading && (
          <div style={{ color: C.sivi, fontSize: 9 }}>Nema zapisa (primeni migraciju 80–81)</div>
        )}
        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: 9, lineHeight: 1.6, maxHeight: 200, overflow: "auto" }}>
          {audit.map((r) => (
            <li key={r.id} style={{ borderTop: `1px solid ${C.border}`, padding: "4px 0" }}>
              <button
                type="button"
                data-testid={`audit-link-${r.id_deo || "none"}`}
                onClick={() => r.id_deo && onNavigate?.("delovi", { idDeo: r.id_deo })}
                style={{ background: "none", border: "none", padding: 0, cursor: r.id_deo ? "pointer" : "default", color: C.plava, fontWeight: 700 }}
              >
                {r.id_deo || "—"}
              </button>
              {" · "}{r.akcija}
              <span style={{ color: C.sivi }}> ({r.izvor || "?"}) </span>
              {r.korisnik && <span style={{ color: C.tekst }}>{r.korisnik} · </span>}
              <span style={{ color: C.sivi }}>{r.created_at?.slice(0, 16)?.replace("T", " ")}</span>
            </li>
          ))}
        </ul>
        {audit.length >= AUDIT_PAGE && (
          <button type="button" data-testid="audit-load-more" disabled={auditLoading} onClick={() => ucitajAudit(auditOffset, true)}
            style={{ ...btnStyle(C, C.hover, { marginTop: 6, fontSize: 9 }), opacity: auditLoading ? 0.6 : 1 }}>
            {auditLoading ? "…" : "Učitaj više"}
          </button>
        )}
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
