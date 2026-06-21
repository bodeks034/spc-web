import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import SkartDoradaOeePanel from "./SkartDoradaOeePanel.jsx";
import {
  fetchKpiUnos,
  kpiVrednostiIzDb,
  snimiIliAzurirajKpiUnos,
  porukaKpiGreske,
} from "../lib/kpiUnos.js";
import { datumSrUIso } from "../lib/planUzorkovanja.js";

function danasSr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function parsirajDatum(d) {
  const m = String(d || "").match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return datumSrUIso(d) || new Date().toISOString().slice(0, 10);
}

function kpiKljuc(red) {
  const rn = String(red?.radni_nalog || "—").trim() || "—";
  const serija = String(red?.serija || "—").trim() || "—";
  return `${rn}|${serija}`;
}

function oznakaKljuca(kljuc) {
  const [rn, serija] = String(kljuc || "").split("|");
  const imaRn = rn && rn !== "—";
  const imaSeriju = serija && serija !== "—";
  if (imaRn && imaSeriju) return `RN ${rn} · serija ${serija}`;
  if (imaRn) return `RN ${rn}`;
  if (imaSeriju) return `Serija ${serija}`;
  return "Bez RN / serije";
}

/**
 * Nezavisan KPI unos dorade/škarta po ID delu — radi i posle resetovanja forme merenja.
 * KPI u bazi je vezan za: id_deo + datum + smena + radni_nalog (+ serija za merljive).
 */
export default function KpiDoradaHub({
  C,
  addToast,
  modul = "merljive",
  otvoren,
  onZatvori,
  pocetniIdDeo = "",
  pocetnaSmena = "1",
  pocetniDatum = "",
  pocetniRadniNalog = "",
  inline = false,
  naslov = "KPI dorada · škart",
}) {
  const [idDeo, setIdDeo] = useState("");
  const [radniNalog, setRadniNalog] = useState("");
  const [smena, setSmena] = useState("1");
  const [datum, setDatum] = useState(danasSr());
  const [redovi, setRedovi] = useState([]);
  const [loading, setLoading] = useState(false);
  const [izabraniKljuc, setIzabraniKljuc] = useState("");
  const [kpiPoKljucu, setKpiPoKljucu] = useState({});
  const [kpiDbIdPoKljucu, setKpiDbIdPoKljucu] = useState({});
  const [metaPoKljucu, setMetaPoKljucu] = useState({});
  const [snima, setSnima] = useState(false);

  useEffect(() => {
    if (!otvoren && !inline) return;
    setIdDeo(String(pocetniIdDeo || "").trim().toUpperCase());
    setRadniNalog(String(pocetniRadniNalog || "").trim().toUpperCase());
    setSmena(String(pocetnaSmena || "1"));
    setDatum(pocetniDatum || danasSr());
  }, [otvoren, inline, pocetniIdDeo, pocetnaSmena, pocetniDatum, pocetniRadniNalog]);

  const ucitaj = useCallback(async () => {
    const id = String(idDeo || "").trim().toUpperCase();
    if (id.length < 3) {
      setRedovi([]);
      return;
    }
    const rn = String(radniNalog || "").trim().toUpperCase();
    setLoading(true);
    try {
      const rows = await fetchKpiUnos(supabase, {
        modul,
        idDeo: id,
        datum: parsirajDatum(datum),
        smena,
        radniNalog: rn || undefined,
        limit: 80,
      });
      setRedovi(rows);
      const mapa = {};
      const idMapa = {};
      const meta = {};
      for (const r of rows) {
        const k = kpiKljuc(r);
        mapa[k] = kpiVrednostiIzDb(r);
        idMapa[k] = r.id;
        meta[k] = { radni_nalog: r.radni_nalog || null, serija: r.serija || null };
      }
      setKpiPoKljucu(mapa);
      setKpiDbIdPoKljucu(idMapa);
      setMetaPoKljucu(meta);
      const kljucevi = Object.keys(mapa);
      if (kljucevi.length) {
        setIzabraniKljuc(prev => (prev && mapa[prev] ? prev : kljucevi[0]));
      } else {
        setIzabraniKljuc("");
      }
    } catch (e) {
      addToast?.(porukaKpiGreske(e), "greska");
      setRedovi([]);
    } finally {
      setLoading(false);
    }
  }, [idDeo, radniNalog, datum, smena, modul, addToast]);

  useEffect(() => {
    if (!otvoren && !inline) return;
    const t = setTimeout(ucitaj, 300);
    return () => clearTimeout(t);
  }, [otvoren, inline, ucitaj]);

  const kpiSerija = kpiPoKljucu[izabraniKljuc] || null;
  const ukupnoZaDeo = useMemo(() => kpiSerija, [kpiSerija]);

  const promeniKpi = (next) => {
    if (!izabraniKljuc) return;
    setKpiPoKljucu(prev => ({
      ...prev,
      [izabraniKljuc]: typeof next === "function" ? next(prev[izabraniKljuc] || {}) : next,
    }));
  };

  const sacuvaj = async () => {
    if (!idDeo || !izabraniKljuc || !kpiSerija || snima) return;
    const dbId = kpiDbIdPoKljucu[izabraniKljuc];
    if (!dbId) {
      addToast?.("Nema KPI reda u bazi — prvo sačuvaj merenja za ovaj deo / RN / datum.", "greska");
      return;
    }
    const meta = metaPoKljucu[izabraniKljuc] || {};
    setSnima(true);
    try {
      const { data, error } = await snimiIliAzurirajKpiUnos(supabase, {
        modul,
        datum: parsirajDatum(datum),
        smena,
        id_deo: idDeo,
        serija: meta.serija || null,
        radni_nalog: meta.radni_nalog || radniNalog || null,
        kpi: kpiSerija,
      }, dbId);
      if (error) {
        addToast?.(porukaKpiGreske(error), "greska");
        return;
      }
      if (data?.id) setKpiDbIdPoKljucu(prev => ({ ...prev, [izabraniKljuc]: data.id }));
      addToast?.("✓ KPI ažuriran (dorada / škart)", "uspeh");
      ucitaj();
    } finally {
      setSnima(false);
    }
  };

  const kljucevi = useMemo(() => Object.keys(kpiPoKljucu).sort(), [kpiPoKljucu]);
  const imaNeus = ukupnoZaDeo?.neusaglaseno > 0;

  if (!otvoren && !inline) return null;

  const inp = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 12,
    padding: "8px 10px",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  const panel = (
    <div
      role={inline ? undefined : "dialog"}
      aria-labelledby="kpi-dorada-naslov"
      onClick={inline ? undefined : (e => e.stopPropagation())}
      style={{
        background: C.panel,
        border: `1px solid ${inline ? `${C.zelena}40` : C.border}`,
        borderRadius: inline ? 12 : 14,
        width: "100%",
        maxWidth: inline ? undefined : 480,
        maxHeight: inline ? undefined : "min(90vh, 640px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        boxShadow: inline ? "none" : "0 16px 48px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{
        padding: inline ? "10px 12px" : "14px 16px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 10,
      }}>
        <div>
          <div id="kpi-dorada-naslov" style={{ color: C.tekst, fontWeight: 700, fontSize: inline ? 12 : 14 }}>
            {naslov}
          </div>
          <div style={{ color: C.sivi, fontSize: 9, marginTop: 3, lineHeight: 1.45 }}>
            ID deo + datum + smena + RN — dorada i škart posle merenja
          </div>
        </div>
        {!inline && onZatvori && (
          <button type="button" onClick={onZatvori} style={{
            background: "none", border: "none", color: C.sivi, fontSize: 18, cursor: "pointer", lineHeight: 1,
          }}>×</button>
        )}
      </div>

      <div style={{ padding: inline ? "10px 12px" : "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>ID deo</span>
            <input
              style={{ ...inp, fontWeight: 700, textAlign: "center" }}
              value={idDeo}
              onChange={e => setIdDeo(e.target.value.toUpperCase())}
              placeholder="5502-A"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>Radni nalog (opciono)</span>
            <input
              style={{ ...inp, textAlign: "center" }}
              value={radniNalog}
              onChange={e => setRadniNalog(e.target.value.toUpperCase())}
              placeholder="RN broj"
            />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "52px 1fr", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>Smena</span>
            <select style={inp} value={smena} onChange={e => setSmena(e.target.value)}>
              {["1", "2", "3"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>Datum</span>
            <input style={inp} value={datum} onChange={e => setDatum(e.target.value)} placeholder="dd.mm.gggg" />
          </label>
        </div>
        <button type="button" onClick={ucitaj} disabled={loading} style={{
          background: C.plava, border: "none", borderRadius: 6, color: "#fff",
          fontSize: 11, fontWeight: 700, padding: "8px 12px", cursor: loading ? "wait" : "pointer",
        }}>
          {loading ? "Učitavam…" : "↻ Učitaj KPI"}
        </button>
      </div>

      <div style={{ flex: inline ? undefined : 1, overflowY: inline ? "visible" : "auto", padding: inline ? "10px 12px" : "12px 16px" }}>
        {!idDeo || idDeo.length < 3 ? (
          <div style={{ color: C.sivi, fontSize: 12, textAlign: "center", padding: inline ? 12 : 24 }}>
            Unesite ID dela (min. 3 znaka)
          </div>
        ) : loading ? (
          <div style={{ color: C.sivi, fontSize: 12, textAlign: "center", padding: inline ? 12 : 24 }}>Učitavam…</div>
        ) : !kljucevi.length ? (
          <div style={{ color: C.sivi, fontSize: 12, textAlign: "center", padding: inline ? 12 : 24, lineHeight: 1.6 }}>
            Nema KPI za <strong style={{ color: C.tekst }}>{idDeo}</strong>
            {radniNalog ? <> · RN <strong style={{ color: C.tekst }}>{radniNalog}</strong></> : null}
            {" "}na {datum}, smena {smena}.
            <br />
            Proverite datum i RN, ili prvo sačuvajte merenja.
          </div>
        ) : (
          <>
            {imaNeus && (
              <div style={{
                background: `${C.zuta}18`, border: `1px solid ${C.zuta}50`,
                borderRadius: 8, padding: "8px 10px", marginBottom: 10, fontSize: 10, color: C.zuta,
              }}>
                Ima <strong>{ukupnoZaDeo.neusaglaseno}</strong> neusaglašenih — unesite doradu i OK posle dorade.
              </div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {kljucevi.map(k => {
                const v = kpiPoKljucu[k];
                const neus = Number(v?.neusaglaseno) || 0;
                const dor = Number(v?.dorada) || 0;
                const akt = k === izabraniKljuc;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setIzabraniKljuc(k)}
                    style={{
                      background: akt ? `${C.zelena}22` : C.bg,
                      border: `1px solid ${akt ? C.zelena : neus > dor ? C.zuta : C.border}`,
                      borderRadius: 6, padding: "6px 10px", cursor: "pointer",
                      fontSize: 10, fontWeight: akt ? 700 : 500, color: C.tekst,
                    }}
                  >
                    {oznakaKljuca(k)}
                    {neus > 0 && <span style={{ color: C.zuta, marginLeft: 4 }}>· {neus} neus.</span>}
                  </button>
                );
              })}
            </div>
            {kpiSerija && (
              <SkartDoradaOeePanel
                C={C}
                kompakt
                vrednosti={kpiSerija}
                ukupno={ukupnoZaDeo}
                onChange={promeniKpi}
                podnaslov={`Dorada · škart · OK posle dorade — ${oznakaKljuca(izabraniKljuc)}`}
              />
            )}
          </>
        )}
      </div>

      {kljucevi.length > 0 && (
        <div style={{
          padding: inline ? "10px 12px" : "12px 16px",
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          gap: 8,
        }}>
          {!inline && onZatvori && (
            <button type="button" onClick={onZatvori} style={{
              flex: 1, background: C.hover, border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.sivi, fontSize: 11, padding: "10px", cursor: "pointer",
            }}>
              Zatvori
            </button>
          )}
          <button type="button" disabled={snima || !izabraniKljuc} onClick={sacuvaj} style={{
            flex: inline ? 1 : 2,
            background: C.zelena,
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            padding: "10px",
            cursor: snima ? "wait" : "pointer",
            opacity: snima ? 0.7 : 1,
          }}>
            {snima ? "Snimam…" : "Sačuvaj KPI"}
          </button>
        </div>
      )}
    </div>
  );

  if (inline) {
    return panel;
  }

  return (
    <div
      role="presentation"
      onClick={onZatvori}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1400,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {panel}
    </div>
  );
}
