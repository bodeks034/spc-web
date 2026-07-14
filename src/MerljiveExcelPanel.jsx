import { useState, useRef } from "react";
import { supabase } from "./lib/supabaseClient.js";
import {
  readWorkbookFromFile,
  readWorkbookFromArrayBuffer,
  downloadWorkbook,
  previewMerljiveImport,
  previewAutoSyncMerljive,
  importMerljiveWorkbookToSupabase,
  exportMerljiveMasterWorkbook,
  MERLJIVE_IMPORT_SHEETS,
} from "./lib/excelSync.js";
import DefinicijaUputstvo from "./components/DefinicijaUputstvo.jsx";

function dISO() {
  return new Date().toISOString().split("T")[0];
}

export default function MerljiveExcelPanel({ C, addToast }) {
  const [wb, setWb] = useState(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState([]);
  const [autoSync, setAutoSync] = useState(null);
  const [busy, setBusy] = useState("");
  const fileRef = useRef(null);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("učitavanje");
    try {
      const book = await readWorkbookFromFile(file);
      setWb(book);
      setFileName(file.name);
      setPreview(previewMerljiveImport(book));
      setAutoSync(previewAutoSyncMerljive(book));
    } catch (err) {
      addToast(err.message, "greska");
    } finally {
      setBusy("");
      e.target.value = "";
    }
  };

  const uvoz = async () => {
    if (!wb) return;
    setBusy("uvoz");
    try {
      const results = await importMerljiveWorkbookToSupabase(supabase, wb);
      const ok = results.filter(r => r.status === "ok");
      const auto = ok.filter(r => String(r.sheet).includes("(auto)"));
      const msg = ok.length
        ? ok.map(r => `${r.sheet}: ${r.count} redova`).join("\n")
        : "Nijedan sheet nije uvezen — proveri tabove (sop_deo_varijabilni, karakteristike_merljive, merenja_varijabilna ili SOP / DATA).";
      const autoHint = auto.length
        ? "\n\nAuto-sync: SOP, delovi i radni_nalozi iz karakteristike_merljive (meta na prvom redu grupe po pogonu)."
        : "";
      addToast(`✓ Uvoz merljivih završen\n${msg}${autoHint}`, ok.length ? "uspeh" : "greska");
    } catch (err) {
      addToast(err.message, "greska");
    } finally {
      setBusy("");
    }
  };

  const uvozDemo = async () => {
    setBusy("demo");
    try {
      const res = await fetch("/SPC_merljive_demo_5501_5503.xlsx");
      if (!res.ok) throw new Error("Nema demo fajla — pokreni: npm run seed:5501-5503");
      const buf = await res.arrayBuffer();
      const book = await readWorkbookFromArrayBuffer(buf);
      setWb(book);
      setFileName("SPC_merljive_demo_5501_5503.xlsx");
      const prev = previewMerljiveImport(book);
      setPreview(prev);
      setAutoSync(previewAutoSyncMerljive(book));
      if (!prev.some(p => p.mappedCount > 0)) {
        addToast("Demo fajl nema očekivane tabove.", "greska");
        return;
      }
      const results = await importMerljiveWorkbookToSupabase(supabase, book);
      const ok = results.filter(r => r.status === "ok");
      const msg = ok.length
        ? ok.map(r => `${r.sheet}: ${r.count} redova`).join("\n")
        : "Uvoz nije uspeo — proveri RLS ili uloguj se kao admin.";
      addToast(`✓ Demo 5501-A / 5503-A\n${msg}`, ok.length ? "uspeh" : "greska");
    } catch (err) {
      addToast(err.message, "greska");
    } finally {
      setBusy("");
    }
  };

  const izvozSve = async () => {
    setBusy("izvoz");
    try {
      const book = await exportMerljiveMasterWorkbook(supabase);
      downloadWorkbook(book, `SPC_merljive_${dISO()}.xlsx`);
      addToast("✓ Merljive tabele preuzete", "uspeh");
    } catch (err) {
      addToast(err.message, "greska");
    } finally {
      setBusy("");
    }
  };

  const BTN = (bg) => ({
    background: bg, border: "none", borderRadius: 8, color: C.onAkcent,
    fontSize: 12, fontWeight: 700, padding: "10px 18px", cursor: busy ? "wait" : "pointer",
    opacity: busy ? 0.6 : 1,
  });

  const sheetList = MERLJIVE_IMPORT_SHEETS.map(s => s.sheet).join(", ");

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.zelena}40`, borderRadius: 12, padding: 20 }}>
      <div style={{ color: C.zelena, fontSize: 13, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>
        MERLJIVE — EXCEL ↔ SUPABASE
      </div>
      <div style={{ color: C.sivi, fontSize: 11, marginBottom: 16, lineHeight: 1.7 }}>
        Uvoz iz <strong style={{ color: C.tekst }}>Varijabilne_SPC.xlsm</strong> (tabovi SOP, DATA) ili master fajla: {sheetList}.
        <br />
        <strong style={{ color: C.tekst }}>Jedan izvor:</strong> popuni samo{" "}
        <code>karakteristike_merljive</code> — u koloni <code>merni_instrument</code> piši{" "}
        <em>Vizuelno</em> za atributivne; ostalo ostaje merljivo. SOP, delovi i RN se automatski sinhronizuju pri uvozu.
      </div>

      <DefinicijaUputstvo C={C} variant="full" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <button type="button" onClick={izvozSve} disabled={!!busy} style={BTN(C.zelena)}>
          ⬇ Preuzmi merljive tabele
        </button>
        <button type="button" onClick={uvozDemo} disabled={!!busy} style={BTN(C.plava)}>
          ⚡ Demo 5501-A / 5503-A
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={!!busy} style={BTN(C.narandzasta)}>
          ⬆ Uvezi iz Excela
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.xlsm" onChange={onFile} style={{ display: "none" }} />
      </div>

      {fileName && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ color: C.tekst, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{fileName}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
            {preview.map(p => (
              <div key={p.sheet} style={{ display: "flex", justifyContent: "space-between", color: C.sivi }}>
                <span>{p.sheet}</span>
                <span style={{ color: p.mappedCount ? C.zelena : C.crvena }}>
                  {p.mappedCount ? `${p.mappedCount} redova` : (p.rawCount ? "mapiranje?" : "nema taba")}
                </span>
              </div>
            ))}
          </div>
          {autoSync && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 6,
                background: `${C.zelena}12`,
                border: `1px solid ${C.zelena}40`,
                fontSize: 10,
                color: C.sivi,
                lineHeight: 1.6,
              }}
            >
              <div style={{ color: C.zelena, fontWeight: 700, marginBottom: 4 }}>Auto-sync pri uvozu</div>
              Karakteristike: {autoSync.karakteristike}
              {autoSync.idDeos?.length ? ` (${autoSync.idDeos.join(", ")})` : ""}
              <br />
              → SOP: {autoSync.sop}, delovi po pogonu: {autoSync.deloviPogon}, radni nalozi: {autoSync.radniNalozi}
              {autoSync.pogoni?.length ? (
                <span> · pogoni: {autoSync.pogoni.join(", ")}</span>
              ) : null}
              {(autoSync.upozorenja || []).map((w) => (
                <div key={w} style={{ color: C.crvena, marginTop: 4 }}>⚠ {w}</div>
              ))}
            </div>
          )}
          <button type="button" onClick={uvoz} disabled={!!busy || !preview.some(p => p.mappedCount > 0)}
            style={{ ...BTN(C.plava), marginTop: 12, width: "100%" }}>
            {busy === "uvoz" ? "Uvoz..." : "✓ Uvezi u Supabase"}
          </button>
        </div>
      )}

      <div style={{ color: C.sivi, fontSize: 10, lineHeight: 1.6 }}>
        1. Pokreni <code>11_varijabilne_schema.sql</code> i <code>27_merljive_excel_import_rls.sql</code> u Supabase.<br />
        2. Terminal: <code>npm run seed:5501-5503</code> (CSV + Supabase + demo xlsx).<br />
        3. Dugme <strong style={{ color: C.tekst }}>Demo 5501-A / 5503-A</strong> — 3 sheeta odjednom.<br />
        4. Ili uvezi direktno iz .xlsm bez CSV koraka.
      </div>
    </div>
  );
}
