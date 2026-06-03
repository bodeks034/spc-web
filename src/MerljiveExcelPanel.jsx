import { useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  readWorkbookFromFile,
  downloadWorkbook,
  previewMerljiveImport,
  importMerljiveWorkbookToSupabase,
  exportMerljiveMasterWorkbook,
  MERLJIVE_IMPORT_SHEETS,
} from "./lib/excelSync.js";

const SUPABASE_URL = "https://wzxkcomeurogvfisticq.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eGtjb21ldXJvZ3ZmaXN0aWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzM1MDYsImV4cCI6MjA5NTEwOTUwNn0.Oa17CJOr-Zep2UsG5n8N7kehuoJmHanNYaNy4VriDBk";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

function dISO() {
  return new Date().toISOString().split("T")[0];
}

export default function MerljiveExcelPanel({ C, addToast }) {
  const [wb, setWb] = useState(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState([]);
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
      const msg = ok.length
        ? ok.map(r => `${r.sheet}: ${r.count} redova`).join("\n")
        : "Nijedan sheet nije uvezen — proveri tabove (sop_deo_varijabilni, karakteristike_merljive, merenja_varijabilna ili SOP / Definicija_Karakteristika / DATA).";
      addToast(`✓ Uvoz merljivih završen\n${msg}`, ok.length ? "uspeh" : "greska");
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
    background: bg, border: "none", borderRadius: 8, color: "#fff",
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
        Uvoz iz <strong style={{ color: C.tekst }}>Varijabilne_SPC.xlsm</strong> (tabovi SOP, Definicija_Karakteristika, DATA)
        ili iz master fajla sa tabovima: {sheetList}.
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <button type="button" onClick={izvozSve} disabled={!!busy} style={BTN(C.zelena)}>
          ⬇ Preuzmi merljive tabele
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
          <button type="button" onClick={uvoz} disabled={!!busy || !preview.some(p => p.mappedCount > 0)}
            style={{ ...BTN(C.plava), marginTop: 12, width: "100%" }}>
            {busy === "uvoz" ? "Uvoz..." : "✓ Uvezi u Supabase"}
          </button>
        </div>
      )}

      <div style={{ color: C.sivi, fontSize: 10, lineHeight: 1.6 }}>
        1. Pokreni <code>11_varijabilne_schema.sql</code> u Supabase.<br />
        2. Ili: <code>node scripts/export-varijabilne-csv.mjs</code> → <code>node scripts/import-all-docs.mjs</code>.<br />
        3. Ovde uvezi direktno iz .xlsm bez CSV koraka.
      </div>
    </div>
  );
}
