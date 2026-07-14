import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { fetchInteligencijaDeo } from "../lib/spcInteligencija.js";
import StanjePredikcijaPanel from "./StanjePredikcijaPanel.jsx";
import { bojaKapabiliteta } from "../lib/varijabilneSpcStats.js";
import { mozeInteligencijaProcesa } from "../lib/uloge.js";

export default function InteligencijaDeoPanel({
  C, korisnik, addToast, sviDelovi = [], defaultIdDeo = "", onOtvori8D,
}) {
  const [idDeo, setIdDeo] = useState(defaultIdDeo || "");
  const [period, setPeriod] = useState("7");
  const [podaci, setPodaci] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (defaultIdDeo && !idDeo) setIdDeo(defaultIdDeo);
  }, [defaultIdDeo, idDeo]);

  const ucitaj = useCallback(async () => {
    if (!idDeo) {
      setPodaci(null);
      return;
    }
    setLoading(true);
    try {
      const d = await fetchInteligencijaDeo(supabase, { idDeo, period: Number(period) });
      setPodaci(d);
    } catch (e) {
      addToast?.(e.message, "greska");
      setPodaci(null);
    } finally {
      setLoading(false);
    }
  }, [idDeo, period, addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const INP = {
    background: C.input, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.tekst, fontSize: 12, padding: "8px 12px", fontFamily: "inherit",
    outline: "none",
  };

  if (!mozeInteligencijaProcesa(korisnik?.uloga)) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: C.sivi, fontSize: 12 }}>
        Pristup stanju, predikciji i korektivnim merama imaju inženjer kvaliteta, šef i admin.
      </div>
    );
  }

  return (
    <div style={{
      padding: 18,
      maxWidth: 900,
      margin: "0 auto",
      width: "100%",
      boxSizing: "border-box",
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      overflowX: "hidden",
      WebkitOverflowScrolling: "touch",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16, flexWrap: "wrap", gap: 10,
      }}>
        <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
          STANJE · PREDIKCIJA · Cp/Cpk
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select value={idDeo} onChange={e => setIdDeo(e.target.value)} style={{ ...INP, minWidth: 160 }}>
            <option value="">— Izaberi deo —</option>
            {sviDelovi.map(d => (
              <option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>
            ))}
          </select>
          <select value={period} onChange={e => setPeriod(e.target.value)} style={INP}>
            <option value="7">7 dana</option>
            <option value="14">14 dana</option>
            <option value="30">30 dana</option>
          </select>
          <button type="button" onClick={ucitaj} disabled={loading || !idDeo}
            style={{
              background: C.hover, border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.sivi, fontSize: 11, padding: "8px 14px", cursor: "pointer",
            }}>
            {loading ? "…" : "↻"}
          </button>
        </div>
      </div>

      {!idDeo && (
        <div style={{ color: C.border, fontSize: 12, textAlign: "center", padding: 40 }}>
          Izaberite deo za analizu stanja i predikciju.
        </div>
      )}

      {idDeo && loading && (
        <div style={{ color: C.sivi, fontSize: 12, padding: 24, textAlign: "center" }}>Učitavanje…</div>
      )}

      {idDeo && !loading && podaci && !podaci.imaPodatke && (
        <div style={{ color: C.border, fontSize: 12, textAlign: "center", padding: 40 }}>
          Nema merenja za {idDeo} u poslednjih {period} dana.
        </div>
      )}

      {idDeo && !loading && podaci?.imaPodatke && (
        <>
          <StanjePredikcijaPanel
            podaci={{ inteligencija: podaci.inteligencija }}
            C={C}
            korisnik={korisnik}
            addToast={addToast}
            sviDelovi={sviDelovi}
            defaultIdDeo={idDeo}
            onOtvori8D={onOtvori8D}
            kompakt={false}
            asistentMeta={{
              idDeo,
              nazivDela: sviDelovi.find((d) => d.id_deo === idDeo)?.naziv_dela || "",
              period: podaci.period,
              inteligencija: podaci.inteligencija,
              topNok: podaci.topNok,
              kapabilitet: podaci.kapabilitet,
            }}
          />

          {podaci.kapabilitet?.length > 0 && (
            <div style={{
              background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: 14, marginTop: 4,
            }}>
              <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2, marginBottom: 10 }}>
                Cp / Cpk PO POZICIJI · PREDIKCIJA
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.sivi, textAlign: "left" }}>
                      {["Pozicija", "Cp", "Cpk", "Sledeći Cpk", "Trend", "Merenja", "Preporuka"].map(h => (
                        <th key={h} style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {podaci.kapabilitet.map(k => {
                      const bojaC = bojaKapabiliteta(k.cpk, C);
                      const bojaP = k.smerCpk === "pogorsava" ? C.crvena
                        : k.smerCpk === "poboljsava" ? C.zelena : C.sivi;
                      return (
                        <tr key={k.pozicija} style={{ borderBottom: `1px solid ${C.hover}` }}>
                          <td style={{ padding: "8px", color: C.tekst, fontWeight: 700 }}>{k.pozicija}</td>
                          <td style={{ padding: "8px", color: bojaKapabiliteta(k.cp, C) }}>{k.cp ?? "—"}</td>
                          <td style={{ padding: "8px", color: bojaC, fontWeight: 700 }}>{k.cpk ?? "—"}</td>
                          <td style={{ padding: "8px", color: bojaC }}>{k.sledeciCpk ?? "—"}</td>
                          <td style={{ padding: "8px", color: bojaP }}>{k.smerCpk}</td>
                          <td style={{ padding: "8px", color: C.sivi }}>{k.merenja}</td>
                          <td style={{ padding: "8px", color: C.sivi, maxWidth: 220, lineHeight: 1.4 }}>
                            {k.preporuka}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
