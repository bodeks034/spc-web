import { useState, useEffect, useCallback } from "react";
import { fetchSifrarnikAudit, preuzmiAuditCsv } from "../../lib/sifrarnikAudit.js";
import { uporediDelovi } from "../../lib/sifrarnikUporedi.js";
import { generisiValidacioniIzvestaj, preuzmiValidacioniCsv } from "../../lib/sifrarnikValidacija.js";
import { exportujDeoJson, preuzmiDeoJson } from "../../lib/sifrarnikExportJson.js";
import { exportujDeloviZip } from "../../lib/sifrarnikExportZip.js";
import { previewPropagacije } from "../../lib/sifrarnikPropagacijaPreview.js";
import { btnStyle, inpStyle } from "./sifrarnikPanelStyle.js";
import SifrarnikIdDeoPicker, { zapamtiRecentIdDeo } from "./SifrarnikIdDeoPicker.jsx";

const AUDIT_PAGE = 40;

/** Audit, upoređivanje, validacija — alati za inženjere. */
export default function SifrarnikAlatiPanel({ C, addToast, onNavigate, radnaLinija = "" }) {
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
  const [validStavke, setValidStavke] = useState(null);
  const [exportId, setExportId] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const [zipIds, setZipIds] = useState("");
  const [zipBusy, setZipBusy] = useState(false);
  const [auditArhiva, setAuditArhiva] = useState(false);
  const [previewId, setPreviewId] = useState("");
  const [preview, setPreview] = useState(null);
  const [zipPick, setZipPick] = useState("");
  const INP = inpStyle(C);

  const dodajUZip = (id) => {
    const clean = String(id || "").trim().toUpperCase();
    if (!clean) return;
    zapamtiRecentIdDeo(clean);
    setZipIds((prev) => {
      const set = new Set(String(prev || "").split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean));
      set.add(clean);
      return [...set].join("\n");
    });
    setZipPick("");
  };

  const ucitajAudit = useCallback(async (offset = 0, append = false) => {
    setAuditLoading(true);
    try {
      const rows = await fetchSifrarnikAudit({
        idDeo: auditFilter.trim() || null,
        akcija: auditAkcija.trim() || null,
        od: auditOd ? new Date(auditOd).toISOString() : null,
        limit: AUDIT_PAGE,
        offset,
        arhiva: auditArhiva,
      });
      setAudit((prev) => (append ? [...prev, ...rows] : rows));
      setAuditOffset(offset + rows.length);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setAuditLoading(false);
    }
  }, [auditFilter, auditAkcija, auditOd, auditArhiva, addToast]);

  useEffect(() => { ucitajAudit(0, false); }, [auditFilter, auditAkcija, auditOd, auditArhiva]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setValidStavke(stavke);
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

  const ucitajValidaciju = async () => {
    setValidBusy(true);
    try {
      setValidStavke(await generisiValidacioniIzvestaj());
    } catch (e) {
      addToast?.(e.message, "greska");
      setValidStavke([]);
    } finally {
      setValidBusy(false);
    }
  };

  const izveziJson = async () => {
    const id = exportId.trim();
    if (!id) {
      addToast?.("Unesi ID dela", "greska");
      return;
    }
    setExportBusy(true);
    try {
      const payload = await exportujDeoJson(id);
      preuzmiDeoJson(payload, payload.id_deo);
      addToast?.(`✓ JSON: ${payload.id_deo}`, "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setExportBusy(false);
    }
  };

  const izveziZip = async () => {
    const ids = zipIds.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!ids.length) {
      addToast?.("Unesi ID delova (razdvojeno zarezom ili novim redom)", "greska");
      return;
    }
    setZipBusy(true);
    try {
      const man = await exportujDeloviZip(ids);
      addToast?.(`✓ ZIP: ${man.delovi.length} delova${man.greske.length ? `, ${man.greske.length} grešaka` : ""}`, man.greske.length ? "info" : "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setZipBusy(false);
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
          <SifrarnikIdDeoPicker
            C={C}
            value={auditFilter}
            onChange={setAuditFilter}
            linijaKod={radnaLinija}
            placeholder="ID dela"
            width={120}
            testId="audit-filter-id"
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
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: C.sivi }}>
            <input
              type="checkbox"
              data-testid="audit-arhiva-toggle"
              checked={auditArhiva}
              onChange={(e) => setAuditArhiva(e.target.checked)}
            />
            Arhiva
          </label>
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
            <SifrarnikIdDeoPicker C={C} value={idA} onChange={setIdA} linijaKod={radnaLinija} width={120} testId="uporedi-a" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>DELO B</span>
            <SifrarnikIdDeoPicker C={C} value={idB} onChange={setIdB} linijaKod={radnaLinija} width={120} testId="uporedi-b" />
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
        <div style={{ color: C.tekst, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Validacioni izveštaj</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <button type="button" data-testid="validacija-prikazi-btn" disabled={validBusy} onClick={ucitajValidaciju}
            style={btnStyle(C, C.plava, { fontSize: 9 })}>
            {validBusy ? "…" : "Prikaži tabelu"}
          </button>
          <button type="button" data-testid="validacija-csv-btn" disabled={validBusy} onClick={izveziValidaciju}
            style={btnStyle(C, C.hover, { fontSize: 9 })}>
            {validBusy ? "…" : "Izvezi CSV"}
          </button>
        </div>
        {validStavke && (
          <div data-testid="validacija-tabela" style={{ maxHeight: 180, overflow: "auto", fontSize: 9 }}>
            {validStavke.length === 0 ? (
              <div style={{ color: C.zelena }}>✓ Nema problema</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: C.sivi, textAlign: "left" }}>
                    <th style={{ padding: "2px 4px" }}>Tip</th>
                    <th style={{ padding: "2px 4px" }}>ID</th>
                    <th style={{ padding: "2px 4px" }}>Opis</th>
                  </tr>
                </thead>
                <tbody>
                  {validStavke.slice(0, 50).map((s, i) => (
                    <tr key={`${s.tip}-${s.id_deo || s.id}-${i}`} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "3px 4px", color: C.narandzasta || "#f59e0b" }}>{s.tip}</td>
                      <td style={{ padding: "3px 4px" }}>
                        {s.id_deo && (
                          <button type="button" onClick={() => onNavigate?.("delovi", { idDeo: s.id_deo })}
                            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: C.plava, fontWeight: 700 }}>
                            {s.id_deo}
                          </button>
                        )}
                      </td>
                      <td style={{ padding: "3px 4px", color: C.sivi }}>{s.problem || s.opis || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {validStavke.length > 50 && (
              <div style={{ color: C.sivi, marginTop: 4 }}>… +{validStavke.length - 50} stavki (CSV za pun izvoz)</div>
            )}
          </div>
        )}
      </section>

      <section style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel }}>
        <div style={{ color: C.tekst, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>JSON export dela</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <SifrarnikIdDeoPicker
            C={C}
            value={exportId}
            onChange={setExportId}
            linijaKod={radnaLinija}
            placeholder="ID dela"
            width={140}
            testId="json-export-id"
          />
          <button type="button" data-testid="json-export-btn" disabled={exportBusy} onClick={izveziJson}
            style={btnStyle(C, C.zelena, { fontSize: 9 })}>
            {exportBusy ? "…" : "Preuzmi JSON"}
          </button>
        </div>
        <div style={{ color: C.sivi, fontSize: 9, marginTop: 6 }}>Master + GU + dimenzije + greške + barkod profil</div>
      </section>

      <section style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel }}>
        <div style={{ color: C.tekst, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>ZIP export (više delova)</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
          <SifrarnikIdDeoPicker
            C={C}
            value={zipPick}
            onChange={setZipPick}
            onPick={dodajUZip}
            linijaKod={radnaLinija}
            placeholder="+ ID u ZIP"
            width={140}
            testId="zip-export-pick"
          />
          <span style={{ color: C.sivi, fontSize: 9 }}>ili nalepi listu ispod</span>
        </div>
        <textarea
          data-testid="zip-export-ids"
          value={zipIds}
          onChange={(e) => setZipIds(e.target.value.toUpperCase())}
          placeholder="ID delova, jedan po redu ili razdvojeno zarezom"
          rows={3}
          style={{ ...INP, width: "100%", resize: "vertical", marginBottom: 8 }}
        />
        <button type="button" data-testid="zip-export-btn" disabled={zipBusy} onClick={izveziZip}
          style={btnStyle(C, C.plava, { fontSize: 9 })}>
          {zipBusy ? "…" : "Preuzmi ZIP paket"}
        </button>
      </section>

      <section style={{ padding: 10, borderRadius: 8, border: `1px solid ${C.border}`, background: C.panel }}>
        <div style={{ color: C.tekst, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>Preview propagacije (po delu)</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <SifrarnikIdDeoPicker
            C={C}
            value={previewId}
            onChange={setPreviewId}
            linijaKod={radnaLinija}
            placeholder="ID dela"
            width={140}
            testId="propagacija-preview-id"
          />
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
