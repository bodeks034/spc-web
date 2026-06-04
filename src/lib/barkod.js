import { useEffect, useRef } from "react";

/**
 * USB barkod/QR čitač (keyboard wedge).
 * Formati: ID · ID|RN · ID|RN|datum|smena · JSON
 */
export function parsiBarkod(raw) {
  if (!raw) return null;
  const s = raw.trim();
  if (s.startsWith("{")) {
    try {
      const j = JSON.parse(s);
      return {
        id_deo: j.id || j.id_deo || j.deo || "",
        radni_nalog: j.rn || j.radni_nalog || j.nalog || "",
        datum: j.datum || "",
        smena: j.smena != null ? Number(j.smena) : null,
      };
    } catch { /* */ }
  }
  if (s.includes("|")) {
    const parts = s.split("|");
    return {
      id_deo: parts[0]?.trim() || "",
      radni_nalog: parts[1]?.trim() || "",
      datum: parts[2]?.trim() || "",
      smena: parts[3] ? Number(parts[3].trim()) : null,
    };
  }
  return { id_deo: s, radni_nalog: "", datum: "", smena: null };
}

/** Aktivno samo kad je enabled i fokus nije u polju za slobodan tekst (opciono). */
export function useBarcodeScanner(onScan, { enabled = true, ignoreInputs = true } = {}) {
  const buf = useRef("");
  const timer = useRef(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return undefined;
    const h = (e) => {
      if (ignoreInputs) {
        const t = e.target?.tagName;
        if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
      }
      if (e.key === "Enter" && buf.current.length > 2) {
        onScanRef.current(buf.current.trim());
        buf.current = "";
        return;
      }
      if (e.key.length === 1) {
        buf.current += e.key;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => { buf.current = ""; }, 120);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [enabled, ignoreInputs]);
}
