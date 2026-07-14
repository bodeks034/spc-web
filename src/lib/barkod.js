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

/** Pipe / JSON format — USB čitač u polju ID ne sme ići kao običan tekst. */
export function izgledaKaoBarkod(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return false;
  if (s.startsWith("{")) return true;
  if (s.includes("|")) return true;
  return false;
}

/**
 * onChange za polje ID — odmah parsira USB wedge (5502-A|RN-…).
 * @returns {boolean} true ako je obrađen barkod
 */
export function obradiPromenuIdPolja(sirovo, { postaviId, obradiBarkod } = {}) {
  const s = String(sirovo ?? "");
  if (izgledaKaoBarkod(s)) {
    obradiBarkod?.(s.trim());
    return true;
  }
  postaviId?.(s);
  return false;
}

/** Enter u polju ID — barkod (pipe/JSON) ili običan ID. */
export function obradiEnterIdPolja(sirovo, { obradiBarkod, potvrdiId } = {}) {
  const s = String(sirovo ?? "").trim();
  if (!s) return;
  if (izgledaKaoBarkod(s)) {
    obradiBarkod?.(s);
    return;
  }
  const parsed = parsiBarkod(s);
  if (parsed?.id_deo && s.length >= 3) {
    obradiBarkod?.(s);
    return;
  }
  potvrdiId?.(s);
}

/** Handleri za <input> ID — USB čitač + ručni unos + Enter. */
export function idBarkodInputHandleri(obradiBarkod, { postaviId, potvrdiId, upperCase = false } = {}) {
  const norm = (v) => (upperCase ? String(v ?? "").toUpperCase() : String(v ?? ""));
  return {
    onChange: (e) => {
      const v = e.target.value;
      if (izgledaKaoBarkod(v)) {
        obradiBarkod?.(v.trim());
        return;
      }
      postaviId?.(norm(v));
    },
    onKeyDown: (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      obradiEnterIdPolja(e.currentTarget.value, { obradiBarkod, potvrdiId: (v) => potvrdiId?.(norm(v)) });
    },
  };
}

/** Primena parsiranog barkoda na formu (ID, RN, smena). */
export function primeniParsiraniBarkod(parsed, {
  postaviId,
  postaviRadniNalog,
  postaviSmena,
} = {}) {
  if (!parsed?.id_deo) return null;
  const id = String(parsed.id_deo).trim().toUpperCase();
  if (!id) return null;
  postaviId?.(id);
  if (parsed.radni_nalog && postaviRadniNalog) {
    postaviRadniNalog(String(parsed.radni_nalog).trim().toUpperCase());
  }
  if (parsed.smena != null && [1, 2, 3].includes(Number(parsed.smena)) && postaviSmena) {
    postaviSmena(String(parsed.smena));
  }
  return { id, radni_nalog: parsed.radni_nalog || "", smena: parsed.smena };
}

/** VIN / serija sa etikete ili USB čitača (plain, JSON vin, prvi segment pipe). */
export function normalizujVinBarkod(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.startsWith("{")) {
    try {
      const j = JSON.parse(s);
      const v = j.vin || j.VIN || j.serija || j.serial || j.sn || "";
      if (v) return String(v).trim().toUpperCase();
    } catch { /* */ }
  }
  const prvi = s.includes("|") ? s.split("|")[0].trim() : s;
  return prvi.toUpperCase();
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
        timer.current = setTimeout(() => { buf.current = ""; }, 200);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [enabled, ignoreInputs]);
}
