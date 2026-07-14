import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import SkartDoradaOeePanel, { OeeFormulaRaspodela } from "./SkartDoradaOeePanel.jsx";
import {
  fetchKpiUnos,
  fetchKpiFilterOpcijeZaDeo,
  filtrirajKpiStavke,
  datumIsoUSr,
  snimiIliAzurirajKpiUnos,
  porukaKpiGreske,
  grupisiKpiRedove,
  oznakaKpiKljuca,
  agregirajKpiUnos,
} from "../lib/kpiUnos.js";
import { posleSnimanjaKpiDorade } from "../lib/autoAkcije.js";
import { datumSrUIso } from "../lib/planUzorkovanja.js";

const PRAZNE_OPCIJE = { stavke: [], radniNalozi: [], datumi: [], smene: [] };

function danasSr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function parsirajDatum(d) {
  const m = String(d || "").match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return datumSrUIso(d) || new Date().toISOString().slice(0, 10);
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
  const [filterOpcije, setFilterOpcije] = useState(PRAZNE_OPCIJE);
  const [opcijeLoading, setOpcijeLoading] = useState(false);
  const ucitaneOpcijeZa = useRef("");

  const primeniStavku = useCallback((stavka) => {
    if (!stavka) return;
    setRadniNalog(stavka.radni_nalog ? String(stavka.radni_nalog).toUpperCase() : "");
    if (stavka.datum) setDatum(datumIsoUSr(stavka.datum));
    if (stavka.smena != null && stavka.smena !== "") setSmena(String(stavka.smena));
  }, []);

  useEffect(() => {
    if (!otvoren && !inline) return;
    setIdDeo(String(pocetniIdDeo || "").trim().toUpperCase());
    setRadniNalog(String(pocetniRadniNalog || "").trim().toUpperCase());
    setSmena(String(pocetnaSmena || "1"));
    setDatum(pocetniDatum || danasSr());
  }, [otvoren, inline, pocetniIdDeo, pocetnaSmena, pocetniDatum, pocetniRadniNalog]);

  useEffect(() => {
    if (!otvoren && !inline) return;
    const id = String(idDeo || "").trim().toUpperCase();
    if (id.length < 3) {
      setFilterOpcije(PRAZNE_OPCIJE);
      ucitaneOpcijeZa.current = "";
      return;
    }
    const kljucOpcija = `${modul}|${id}`;
    if (kljucOpcija === ucitaneOpcijeZa.current) return;

    let cancelled = false;
    const t = setTimeout(async () => {
      setOpcijeLoading(true);
      try {
        const opcije = await fetchKpiFilterOpcijeZaDeo(supabase, { modul, idDeo: id });
        if (cancelled) return;
        ucitaneOpcijeZa.current = kljucOpcija;
        setFilterOpcije(opcije);
        if (opcije.stavke.length) {
          const pocIso = parsirajDatum(pocetniDatum || datum);
          const pocRn = String(pocetniRadniNalog || "").trim().toUpperCase();
          const pocSm = String(pocetnaSmena || smena || "1");
          const hit = opcije.stavke.find((s) =>
            s.datum === pocIso
            && String(s.smena) === pocSm
            && (!pocRn || (s.radni_nalog || "") === pocRn),
          ) || opcije.stavke.find((s) => !pocRn || (s.radni_nalog || "") === pocRn)
            || opcije.stavke[0];
          primeniStavku(hit);
        }
      } catch {
        if (!cancelled) setFilterOpcije(PRAZNE_OPCIJE);
      } finally {
        if (!cancelled) setOpcijeLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [idDeo, modul, otvoren, inline, primeniStavku]);

  const imaOpcije = filterOpcije.stavke.length > 0;

  const stavkePoRn = useMemo(() => {
    if (!imaOpcije) return [];
    if (!radniNalog) return filterOpcije.stavke;
    return filtrirajKpiStavke(filterOpcije.stavke, { radniNalog });
  }, [filterOpcije.stavke, imaOpcije, radniNalog]);

  const datumiOpcije = useMemo(() => (
    [...new Set(stavkePoRn.map((s) => s.datum))].sort((a, b) => b.localeCompare(a))
  ), [stavkePoRn]);

  const smeneOpcije = useMemo(() => {
    const datumIso = parsirajDatum(datum);
    const list = filtrirajKpiStavke(stavkePoRn, { datumIso });
    const izBaze = [...new Set(list.map((s) => String(s.smena)).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b));
    return izBaze.length ? izBaze : ["1", "2", "3"];
  }, [stavkePoRn, datum]);

  const promeniRadniNalog = (v) => {
    const rn = String(v || "").trim().toUpperCase();
    setRadniNalog(rn);
    if (!imaOpcije) return;
    const stavke = filtrirajKpiStavke(filterOpcije.stavke, { radniNalog: rn || undefined });
    if (stavke[0]) primeniStavku(stavke[0]);
  };

  const promeniDatum = (iso) => {
    setDatum(datumIsoUSr(iso));
    if (!imaOpcije) return;
    const stavke = filtrirajKpiStavke(filterOpcije.stavke, {
      radniNalog: radniNalog || undefined,
      datumIso: iso,
    });
    if (stavke[0]?.smena != null && stavke[0].smena !== "") {
      setSmena(String(stavke[0].smena));
    }
  };

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
      const { mapa, idMapa, meta } = grupisiKpiRedove(modul, rows);
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

  const agregatFilter = useMemo(() => {
    if (!redovi.length) return null;
    return agregirajKpiUnos(redovi, { modul });
  }, [redovi, modul]);

  const agregatIzvor = useMemo(() => {
    if (!agregatFilter) return null;
    const { kpi, brojUnosa, brojRedovaBaze, ...brojevi } = agregatFilter;
    void kpi;
    void brojUnosa;
    void brojRedovaBaze;
    return brojevi;
  }, [agregatFilter]);

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
        serija: modul === "atributivne" ? null : (meta.serija || null),
        radni_nalog: meta.radni_nalog || radniNalog || null,
        kpi: kpiSerija,
      }, dbId);
      if (error) {
        addToast?.(porukaKpiGreske(error), "greska");
        return;
      }
      if (data?.id) setKpiDbIdPoKljucu(prev => ({ ...prev, [izabraniKljuc]: data.id }));
      const dor = Number(kpiSerija?.dorada) || 0;
      const neus = Number(kpiSerija?.neusaglaseno) || 0;
      if (dor > 0 && neus > 0) {
        await posleSnimanjaKpiDorade(supabase, {
          idDeo,
          datum: parsirajDatum(datum),
          smena,
          dorada: dor,
          neusaglaseno: neus,
          kpiId: data?.id || kpiDbIdPoKljucu[izabraniKljuc],
        });
      }
      addToast?.("✓ KPI ažuriran (dorada / škart)", "uspeh");
      ucitaj();
    } finally {
      setSnima(false);
    }
  };

  const kljucevi = useMemo(() => Object.keys(kpiPoKljucu).sort(), [kpiPoKljucu]);
  const imaNeus = Number(kpiSerija?.neusaglaseno) > 0;
  const viseSerija = kljucevi.length > 1;

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
            <span style={{ color: C.sivi, fontSize: 9 }}>
              Radni nalog {imaOpcije ? `(${filterOpcije.radniNalozi.length || "bez RN"})` : "(opciono)"}
            </span>
            {imaOpcije ? (
              <select
                style={{ ...inp, textAlign: "center" }}
                value={radniNalog}
                onChange={(e) => promeniRadniNalog(e.target.value)}
                disabled={opcijeLoading}
              >
                {filterOpcije.radniNalozi.length === 0 ? (
                  <option value="">— bez RN —</option>
                ) : (
                  <>
                    <option value="">— izaberi RN —</option>
                    {filterOpcije.radniNalozi.map((rn) => (
                      <option key={rn} value={rn}>{rn}</option>
                    ))}
                  </>
                )}
              </select>
            ) : (
              <input
                style={{ ...inp, textAlign: "center" }}
                value={radniNalog}
                onChange={(e) => setRadniNalog(e.target.value.toUpperCase())}
                placeholder="RN broj"
              />
            )}
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "52px 1fr", gap: 8 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>Smena</span>
            <select
              style={inp}
              value={smena}
              onChange={(e) => setSmena(e.target.value)}
              disabled={imaOpcije && opcijeLoading}
            >
              {smeneOpcije.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>Datum</span>
            {imaOpcije && datumiOpcije.length > 0 ? (
              <select
                style={inp}
                value={parsirajDatum(datum)}
                onChange={(e) => promeniDatum(e.target.value)}
                disabled={opcijeLoading}
              >
                {datumiOpcije.map((iso) => (
                  <option key={iso} value={iso}>{datumIsoUSr(iso)}</option>
                ))}
              </select>
            ) : (
              <input
                style={inp}
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                placeholder="dd.mm.gggg"
              />
            )}
          </label>
        </div>
        {imaOpcije && filterOpcije.stavke.length > 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {filterOpcije.stavke.slice(0, 10).map((s) => {
              const akt = (s.radni_nalog || "") === (radniNalog || "")
                && s.datum === parsirajDatum(datum)
                && String(s.smena) === String(smena);
              const oznaka = [
                s.radni_nalog || "—",
                datumIsoUSr(s.datum),
                `sm.${s.smena || "?"}`,
              ].join(" · ");
              return (
                <button
                  key={`${s.radni_nalog || ""}|${s.datum}|${s.smena}`}
                  type="button"
                  onClick={() => primeniStavku(s)}
                  style={{
                    background: akt ? `${C.plava}22` : C.bg,
                    border: `1px solid ${akt ? C.plava : C.border}`,
                    borderRadius: 5,
                    color: akt ? C.plava : C.sivi,
                    fontSize: 9,
                    padding: "4px 8px",
                    cursor: "pointer",
                  }}
                >
                  {oznaka}
                </button>
              );
            })}
          </div>
        )}
        {opcijeLoading && (
          <div style={{ color: C.sivi, fontSize: 9 }}>Učitavam RN / datume / smene za deo…</div>
        )}
        <button type="button" onClick={ucitaj} disabled={loading} style={{
          background: C.plava, border: "none", borderRadius: 6, color: C.onAkcent,
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
            {agregatFilter?.kpi && agregatIzvor && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: C.sivi, fontSize: 8, letterSpacing: 1, marginBottom: 6 }}>
                  AGREGAT ZA FILTER
                  {agregatFilter.brojUnosa > 1 ? ` · ${agregatFilter.brojUnosa} unosa` : ""}
                </div>
                <OeeFormulaRaspodela
                  C={C}
                  izvor={agregatIzvor}
                  kpi={agregatFilter.kpi}
                  naslov="OEE = A × P × Q"
                />
              </div>
            )}
            {imaNeus && (
              <div style={{
                background: `${C.zuta}18`, border: `1px solid ${C.zuta}50`,
                borderRadius: 8, padding: "8px 10px", marginBottom: 10, fontSize: 10, color: C.zuta,
              }}>
                Ima <strong>{kpiSerija.neusaglaseno}</strong> neusaglašenih — unesite doradu i OK posle dorade.
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
                    {oznakaKpiKljuca(modul, k)}
                    {neus > 0 && <span style={{ color: C.zuta, marginLeft: 4 }}>· {neus} neus.</span>}
                  </button>
                );
              })}
            </div>
            {kpiSerija && (
              <SkartDoradaOeePanel
                C={C}
                modul={modul}
                kompakt
                vrednosti={kpiSerija}
                ukupno={viseSerija ? agregatIzvor : undefined}
                onChange={promeniKpi}
                podnaslov={`Dorada · škart · OK posle dorade — ${oznakaKpiKljuca(modul, izabraniKljuc)}`}
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
            color: C.onAkcent,
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
