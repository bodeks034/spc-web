import { useState, useEffect, useRef, useCallback } from "react";
import { pretraziDeloviSaMv } from "../../lib/sifrarnikDeloviMv.js";
import { inpStyle } from "./sifrarnikPanelStyle.js";

const RECENT_KEY = "spc_sifrarnik_recent_id_deo";
const RECENT_MAX = 8;

export function ucitajRecentIdDeo() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(raw) ? raw.map((s) => String(s || "").trim().toUpperCase()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function zapamtiRecentIdDeo(idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return;
  try {
    const next = [id, ...ucitajRecentIdDeo().filter((x) => x !== id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

/**
 * Typeahead za ID dela — predlozi + ↑↓ Enter Escape.
 */
export default function SifrarnikIdDeoPicker({
  value,
  onChange,
  onPick,
  C,
  linijaKod = "",
  placeholder = "ID dela…",
  width = 160,
  testId = "id-deo-picker",
  inputTestId = null,
  recentOnFocus = true,
}) {
  const [otvoren, setOtvoren] = useState(false);
  const [predlozi, setPredlozi] = useState([]);
  const [ucitava, setUcitava] = useState(false);
  const [aktivniIdx, setAktivniIdx] = useState(-1);
  const wrapRef = useRef(null);
  const listaRef = useRef(null);
  const INP = inpStyle(C);
  const inputId = inputTestId || `${testId}-input`;

  const ucitajPredloge = useCallback(async (q) => {
    const tekst = String(q || "").trim();
    if (tekst.length < 2) {
      if (recentOnFocus) {
        setPredlozi(ucitajRecentIdDeo().map((id_deo) => ({ id_deo, naziv_dela: "nedavno" })));
      } else {
        setPredlozi([]);
      }
      setAktivniIdx(-1);
      return;
    }
    setUcitava(true);
    try {
      const { delovi } = await pretraziDeloviSaMv({
        q: tekst,
        linijaKod: linijaKod || null,
        limit: 12,
        offset: 0,
      });
      setPredlozi(delovi || []);
      setAktivniIdx((delovi || []).length ? 0 : -1);
    } catch {
      setPredlozi([]);
      setAktivniIdx(-1);
    } finally {
      setUcitava(false);
    }
  }, [linijaKod, recentOnFocus]);

  useEffect(() => {
    if (!otvoren) return undefined;
    const t = window.setTimeout(() => ucitajPredloge(value), 220);
    return () => window.clearTimeout(t);
  }, [value, otvoren, ucitajPredloge]);

  useEffect(() => {
    if (!otvoren) return undefined;
    const zatvori = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOtvoren(false);
        setAktivniIdx(-1);
      }
    };
    document.addEventListener("mousedown", zatvori);
    return () => document.removeEventListener("mousedown", zatvori);
  }, [otvoren]);

  useEffect(() => {
    if (aktivniIdx < 0 || !listaRef.current) return;
    const el = listaRef.current.querySelector(`[data-idx="${aktivniIdx}"]`);
    el?.scrollIntoView?.({ block: "nearest" });
  }, [aktivniIdx]);

  const izaberi = (deo) => {
    const id = String(deo?.id_deo || "").trim().toUpperCase();
    if (!id) return;
    onChange?.(id);
    zapamtiRecentIdDeo(id);
    onPick?.(id, deo);
    setOtvoren(false);
    setAktivniIdx(-1);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOtvoren(false);
      setAktivniIdx(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!otvoren) setOtvoren(true);
      setAktivniIdx((i) => {
        if (!predlozi.length) return -1;
        return i < 0 ? 0 : Math.min(i + 1, predlozi.length - 1);
      });
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setAktivniIdx((i) => {
        if (!predlozi.length) return -1;
        return i <= 0 ? predlozi.length - 1 : i - 1;
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (otvoren && aktivniIdx >= 0 && predlozi[aktivniIdx]) {
        izaberi(predlozi[aktivniIdx]);
        return;
      }
      const id = String(value || "").trim().toUpperCase();
      if (id) {
        zapamtiRecentIdDeo(id);
        onPick?.(id);
        setOtvoren(false);
        setAktivniIdx(-1);
      }
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }} data-testid={testId}>
      <input
        value={value}
        onChange={(e) => {
          onChange?.(e.target.value.toUpperCase());
          setOtvoren(true);
        }}
        onFocus={() => setOtvoren(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        style={{ ...INP, width }}
        data-testid={inputId}
        autoComplete="off"
        role="combobox"
        aria-expanded={otvoren}
        aria-autocomplete="list"
      />
      {otvoren && (predlozi.length > 0 || ucitava) && (
        <ul
          ref={listaRef}
          data-testid={`${testId}-lista`}
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 40,
            left: 0,
            right: 0,
            top: "100%",
            margin: 0,
            padding: 0,
            listStyle: "none",
            maxHeight: 200,
            overflow: "auto",
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          {ucitava && !predlozi.length && (
            <li style={{ padding: "6px 8px", fontSize: 9, color: C.sivi }}>Tražim…</li>
          )}
          {predlozi.map((d, idx) => {
            const aktivan = idx === aktivniIdx;
            return (
              <li key={d.id_deo} role="option" aria-selected={aktivan} data-idx={idx}>
                <button
                  type="button"
                  data-testid={`${testId}-opt-${d.id_deo}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setAktivniIdx(idx)}
                  onClick={() => izaberi(d)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: aktivan ? `${C.plava}22` : "none",
                    border: "none",
                    borderBottom: `1px solid ${C.border}`,
                    padding: "6px 8px",
                    cursor: "pointer",
                    color: C.tekst,
                    fontSize: 9,
                    fontFamily: "inherit",
                  }}
                >
                  <strong style={{ color: C.plava }}>{d.id_deo}</strong>
                  {d.naziv_dela && (
                    <span style={{ color: C.sivi }}> · {d.naziv_dela}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
