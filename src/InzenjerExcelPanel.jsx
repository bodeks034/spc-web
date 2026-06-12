import { useState, useRef } from "react";
import { supabase } from "./lib/supabaseClient.js";
import {
  readWorkbookFromFile,
  downloadWorkbook,
  previewInzenjerMerljiveUvoz,
  importMerljiveWorkbookToSupabase,
  exportMerljiveMasterWorkbook,
  exportMerenjaVarijabilnaExcel,
  exportMasterWorkbook,
  exportKontrolniLogExcel,
  INZENJER_MERLJIVE_UVOZ_SHEETS,
  EXCEL_BUCKET,
  KONTROLNI_LOG_FILE,
} from "./lib/excelSync.js";
import DefinicijaUputstvo from "./components/DefinicijaUputstvo.jsx";

function dISO() {
  return new Date().toISOString().split("T")[0];
}

export default function InzenjerExcelPanel({
  modul = "merljive",
  mozeUvoz = false,
  idDeoFilter = "",
  C,
  addToast,
}) {
  const [wb, setWb] = useState(null);
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState([]);
  const [busy, setBusy] = useState("");
  const [datumOd, setDatumOd] = useState("");
  const [datumDo, setDatumDo] = useState("");
  const fileRef = useRef(null);

  const jeMerljive = modul === "merljive";
  const idDeo = String(idDeoFilter || "").trim().toUpperCase();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("učitavanje");
    try {
      const book = await readWorkbookFromFile(file);
      setWb(book);
      setFileName(file.name);
      setPreview(previewInzenjerMerljiveUvoz(book));
    } catch (err) {
      addToast(err.message, "greska");
    } finally {
      setBusy("");
      e.target.value = "";
    }
  };

  const uvoz = async () => {
    if (!wb || !mozeUvoz) return;
    setBusy("uvoz");
    try {
      const results = await importMerljiveWorkbookToSupabase(
        supabase,
        wb,
        INZENJER_MERLJIVE_UVOZ_SHEETS,
        { autoSyncDerived: false },
      );
      const ok = results.filter((r) => r.status === "ok");
      const msg = ok.length
        ? ok.map((r) => `${r.sheet}: ${r.count} redova`).join("\n")
        : "Nijedan red nije uvezen — proveri tab karakteristike_merljive.";
      addToast(`✓ Granice uvežene\n${msg}`, ok.length ? "uspeh" : "greska");
      setWb(null);
      setFileName("");
      setPreview([]);
    } catch (err) {
      addToast(err.message, "greska");
    } finally {
      setBusy("");
    }
  };

  const izvozMaster = async () => {
    setBusy("master");
    try {
      const book = jeMerljive
        ? await exportMerljiveMasterWorkbook(supabase)
        : await exportMasterWorkbook(supabase);
      const pref = jeMerljive ? "SPC_merljive" : "SPC_master";
      downloadWorkbook(book, `${pref}_${dISO()}.xlsx`);
      addToast(`✓ ${jeMerljive ? "Merljive tabele" : "Master šifrarnik"} preuzet`, "uspeh");
    } catch (err) {
      addToast(err.message, "greska");
    } finally {
      setBusy("");
    }
  };

  const izvozLog = async () => {
    setBusy("log");
    try {
      if (jeMerljive) {
        const book = await exportMerenjaVarijabilnaExcel(
          supabase,
          idDeo || null,
          null,
          datumOd || null,
          datumDo || null,
        );
        if (!book) {
          addToast("Nema merenja za izabrane filtere.", "greska");
          return;
        }
        const suf = idDeo ? `_${idDeo}` : "";
        downloadWorkbook(book, `merenja_varijabilna${suf}_${dISO()}.xlsx`);
        addToast("✓ Merenja preuzeta", "uspeh");
        return;
      }
      const book = await exportKontrolniLogExcel(
        supabase,
        idDeo || null,
        datumOd || null,
        datumDo || null,
      );
      if (!book) {
        addToast("Nema unosa u kontrolni_log za filtere.", "greska");
        return;
      }
      const suf = idDeo ? `_${idDeo}` : "";
      downloadWorkbook(book, `kontrolni_log${suf}_${dISO()}.xlsx`);
      addToast("✓ Kontrolni log preuzet", "uspeh");
    } catch (err) {
      addToast(err.message, "greska");
    } finally {
      setBusy("");
    }
  };

  const preuzmiLogMirror = async () => {
    if (jeMerljive) return;
    setBusy("mirror");
    try {
      const { data, error } = await supabase.storage.from(EXCEL_BUCKET).download(KONTROLNI_LOG_FILE);
      if (error) throw new Error("Nema kopije u Storage-u — prvo snimi unos iz aplikacije.");
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = KONTROLNI_LOG_FILE;
      a.click();
      URL.revokeObjectURL(url);
      addToast("✓ Excel kopija kontrolni_log preuzeta", "uspeh");
    } catch (err) {
      addToast(err.message, "greska");
    } finally {
      setBusy("");
    }
  };

  const BTN = (bg) => ({
    background: bg,
    border: "none",
    borderRadius: 8,
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    padding: "10px 18px",
    cursor: busy ? "wait" : "pointer",
    opacity: busy ? 0.6 : 1,
  });

  const INP = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 11,
    padding: "7px 10px",
    width: "100%",
    boxSizing: "border-box",
  };

  const akcent = jeMerljive ? C.zelena : C.plava;

  return (
    <div style={{ background: C.panel, border: `1px solid ${akcent}40`, borderRadius: 12, padding: 20 }}>
      <div style={{ color: akcent, fontSize: 13, fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>
        EXCEL — INŽENJER
      </div>
      <div style={{ color: C.sivi, fontSize: 11, marginBottom: 16, lineHeight: 1.7 }}>
        {jeMerljive
          ? "Izvoz šifrarnika i merenja. Uvoz samo taba karakteristike_merljive (LSL / USL / granice)."
          : "Izvoz master šifrarnika i kontrolnog loga — bez uvoza (pun uvoz ostaje u admin panelu)."}
        {!mozeUvoz && jeMerljive && (
          <span> Šef smene ima samo izvoz.</span>
        )}
      </div>

      {jeMerljive && <DefinicijaUputstvo C={C} variant="inzenjer" />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14, maxWidth: 420 }}>
        <label style={{ color: C.sivi, fontSize: 10 }}>
          Datum od
          <input type="date" value={datumOd} onChange={(e) => setDatumOd(e.target.value)} style={{ ...INP, marginTop: 4 }} />
        </label>
        <label style={{ color: C.sivi, fontSize: 10 }}>
          Datum do
          <input type="date" value={datumDo} onChange={(e) => setDatumDo(e.target.value)} style={{ ...INP, marginTop: 4 }} />
        </label>
      </div>
      {idDeo && (
        <div style={{ color: C.sivi, fontSize: 10, marginBottom: 12 }}>
          Filter ID dela: <strong style={{ color: C.tekst }}>{idDeo}</strong> (iz trenutnog unosa)
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <button type="button" onClick={izvozMaster} disabled={!!busy} style={BTN(akcent)}>
          ⬇ Preuzmi {jeMerljive ? "merljive tabele" : "master Excel"}
        </button>
        <button type="button" onClick={izvozLog} disabled={!!busy} style={BTN(C.zelena)}>
          ⬇ Preuzmi {jeMerljive ? "merenja" : "kontrolni_log"}
        </button>
        {!jeMerljive && (
          <button type="button" onClick={preuzmiLogMirror} disabled={!!busy} style={BTN(C.ljubicasta)}>
            ⬇ Storage kopija loga
          </button>
        )}
        {mozeUvoz && jeMerljive && (
          <button type="button" onClick={() => fileRef.current?.click()} disabled={!!busy} style={BTN(C.narandzasta)}>
            ⬆ Uvezi granice (Excel)
          </button>
        )}
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.xlsm" onChange={onFile} style={{ display: "none" }} />
      </div>

      {mozeUvoz && fileName && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ color: C.tekst, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{fileName}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
            {preview.map((p) => (
              <div key={p.sheet} style={{ display: "flex", justifyContent: "space-between", color: C.sivi }}>
                <span>{p.sheet}</span>
                <span style={{ color: p.mappedCount ? C.zelena : C.crvena }}>
                  {p.mappedCount ? `${p.mappedCount} redova` : (p.rawCount ? "mapiranje?" : "nema taba")}
                </span>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={uvoz}
            disabled={!!busy || !preview.some((p) => p.mappedCount > 0)}
            style={{ ...BTN(C.plava), marginTop: 12, width: "100%" }}
          >
            {busy === "uvoz" ? "Uvoz..." : "✓ Uvezi samo karakteristike_merljive"}
          </button>
        </div>
      )}

      <div style={{ color: C.sivi, fontSize: 10, lineHeight: 1.6 }}>
        Pun uvoz šifrarnika (delovi, greške, RN…) ostaje u admin panelu.
        {mozeUvoz && " Inženjer može ažurirati samo granice merenja iz Excel taba karakteristike_merljive."}
      </div>
    </div>
  );
}
