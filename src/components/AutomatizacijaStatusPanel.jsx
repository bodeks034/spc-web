import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  ucitajPoslednjeRunove,
  ucitajPoslednjeAkcije,
  sumirajRunovePoJobu,
  filtrirajAkcije,
  akcijeUcsv,
} from "../lib/autoRunLog.js";

function statusBoja(status, C) {
  if (status === "ok") return C.zelena;
  if (status === "fail") return C.crvena;
  return C.sivi;
}

function formatVreme(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("sr-RS", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/** Admin — status Task Scheduler zadataka (iz auto_run_log) + audit auto-akcija. */
export default function AutomatizacijaStatusPanel({ C }) {
  const [jobovi, setJobovi] = useState([]);
  const [akcije, setAkcije] = useState([]);
  const [filterTip, setFilterTip] = useState("sve");
  const [loading, setLoading] = useState(true);
  const [greska, setGreska] = useState(null);

  const osvezi = useCallback(async () => {
    setLoading(true);
    setGreska(null);
    try {
      const [runovi, akc] = await Promise.all([
        ucitajPoslednjeRunove(supabase, { limit: 80 }),
        ucitajPoslednjeAkcije(supabase, { limit: 100 }),
      ]);
      setJobovi(sumirajRunovePoJobu(runovi));
      setAkcije(akc);
      if (!runovi.length && !akc.length) {
        setGreska("Nema zapisa — primeni 61_auto_telemetrija.sql i pokreni npm run auto:install");
      }
    } catch (e) {
      setGreska(e.message || "Greška učitavanja");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { osvezi(); }, [osvezi]);

  const tipovi = useMemo(() => {
    const set = new Set(akcije.map((a) => a.tip).filter(Boolean));
    return ["sve", ...set];
  }, [akcije]);

  const prikazAkcija = useMemo(
    () => filtrirajAkcije(akcije, filterTip),
    [akcije, filterTip],
  );

  const izveziCsv = () => {
    const csv = akcijeUcsv(prikazAkcija);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spc-auto-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      data-testid="automatizacija-status-panel"
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
        <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700 }}>STATUS AUTOMATIZACIJE</div>
        <button
          type="button"
          onClick={osvezi}
          disabled={loading}
          style={{
            background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.sivi, fontSize: 10, padding: "6px 12px", cursor: "pointer",
          }}
        >
          {loading ? "…" : "↻ Osveži"}
        </button>
      </div>

      <p style={{ color: C.sivi, fontSize: 9, margin: "0 0 12px", lineHeight: 1.5 }}>
        Zadaci: <code>npm run auto:install</code> · logovi: <code>npm run logs:auto</code>
      </p>

      {greska && (
        <div style={{ color: C.zuta, fontSize: 10, marginBottom: 10 }}>{greska}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {jobovi.map((j) => {
          const p = j.poslednji;
          const st = p?.status || "nema";
          const label = j.statusLabel || st.toUpperCase();
          return (
            <div
              key={j.id}
              data-testid={`auto-job-${j.id}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                padding: "8px 10px",
                background: C.bg,
                borderRadius: 8,
                border: `1px solid ${statusBoja(st, C)}33`,
                fontSize: 10,
              }}
            >
              <div>
                <div style={{ color: C.tekst, fontWeight: 700 }}>{j.naziv}</div>
                <div style={{ color: C.sivi, marginTop: 2 }}>⏱ {j.raspored}{j.log ? ` · ${j.log}` : ""}</div>
                {p?.poruka && (
                  <div style={{ color: C.sivi, marginTop: 2, fontSize: 9 }}>{p.poruka}</div>
                )}
                {!p && j.statusHint && (
                  <div style={{ color: C.sivi, marginTop: 2, fontSize: 9 }}>{j.statusHint}</div>
                )}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ color: statusBoja(st, C), fontWeight: 700 }}>{label}</div>
                <div style={{ color: C.sivi, fontSize: 9 }}>{formatVreme(p?.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1 }}>AUDIT AUTO-AKCIJA</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <select
            data-testid="auto-audit-filter"
            value={filterTip}
            onChange={(e) => setFilterTip(e.target.value)}
            style={{
              fontSize: 10, padding: "4px 8px", borderRadius: 6,
              border: `1px solid ${C.border}`, background: C.bg, color: C.tekst,
            }}
          >
            {tipovi.map((t) => (
              <option key={t} value={t}>{t === "sve" ? "Svi tipovi" : t}</option>
            ))}
          </select>
          <button
            type="button"
            data-testid="auto-audit-export"
            onClick={izveziCsv}
            disabled={!prikazAkcija.length}
            style={{
              fontSize: 10, padding: "4px 10px", borderRadius: 6,
              border: `1px solid ${C.border}`, background: C.hover, color: C.tekst,
              cursor: prikazAkcija.length ? "pointer" : "not-allowed",
            }}
          >
            CSV
          </button>
        </div>
      </div>
      {!prikazAkcija.length ? (
        <div style={{ color: C.sivi, fontSize: 10 }}>Još nema zapisa (NOK streak, NCR zatvaranje…)</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
          {prikazAkcija.map((a) => (
            <div
              key={a.id}
              data-testid={`auto-akcija-${a.id}`}
              style={{
                fontSize: 9,
                padding: "6px 8px",
                background: C.bg,
                borderRadius: 6,
                color: C.tekst,
                lineHeight: 1.4,
              }}
            >
              <span style={{ color: C.plava, fontWeight: 700 }}>{a.tip}</span>
              {" · "}
              {a.opis}
              {a.id_deo && <span style={{ color: C.sivi }}> ({a.id_deo})</span>}
              <span style={{ color: C.sivi, display: "block" }}>{formatVreme(a.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
