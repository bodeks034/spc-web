import { useState, useEffect, useCallback } from "react";
import { SpcOkNokBarGraf } from "./SpcAnalitikaGrafovi.jsx";
import { statPoGrupi, korelacijaPozicijaMasina } from "../lib/varijabilneSpcStats.js";
import { formatVrednostKarte } from "../lib/varijabilneUtils.js";

import { supabase } from "../lib/supabaseClient.js";

const BOJE_GRUPE = (C) => [C.plava, C.narandzasta, C.ljubicasta, C.zelena, "#22d3ee", "#f472b6"];

function Prazno({ C, tekst }) {
  return (
    <div style={{ color: C.border, fontSize: 12, textAlign: "center", padding: 40 }}>
      {tekst}
    </div>
  );
}

/** NOK merenja po danu × smeni (poslednjih 30 dana u filteru). */
export function HeatmapMerljivePanel({ merenja, C, naslov }) {
  const matrix = {};
  const dani = [];
  (merenja || []).forEach(r => {
    if ((r.status || "").toUpperCase() !== "NOK") return;
    const d = r.datum || "?";
    if (!matrix[d]) {
      matrix[d] = {};
      dani.push(d);
    }
    const s = `Smena ${r.smena || 1}`;
    matrix[d][s] = (matrix[d][s] || 0) + 1;
  });
  const unikDani = [...new Set(dani)].sort().slice(-30);
  const smene = ["Smena 1", "Smena 2", "Smena 3"];
  const maxVal = unikDani.reduce(
    (mx, d) => Math.max(mx, ...smene.map(s => matrix[d]?.[s] || 0)),
    0,
  );

  const getColor = (v) => {
    if (v === 0) return C.hover;
    const int = Math.min(v / Math.max(maxVal, 1), 1);
    if (int < 0.33) return `${C.zelena}80`;
    if (int < 0.66) return `${C.zuta}90`;
    return `${C.crvena}aa`;
  };

  if (!unikDani.length) {
    return <Prazno C={C} tekst="Nema NOK merenja za heat mapu" />;
  }

  return (
    <div>
      <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.2, marginBottom: 14 }}>
        {naslov || "HEAT MAPA NOK — PO DANU I SMENI"}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
        <span style={{ color: C.sivi, fontSize: 10 }}>0</span>
        {[C.hover, `${C.zelena}80`, `${C.zuta}90`, `${C.crvena}aa`, C.crvena].map((c, i) => (
          <div key={i} style={{ width: 20, height: 14, background: c, borderRadius: 2 }} />
        ))}
        <span style={{ color: C.sivi, fontSize: 10 }}>max ({maxVal})</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: `80px repeat(${unikDani.length}, minmax(28px, 1fr))`,
          gap: 2,
          minWidth: 400,
        }}>
          <div />
          {unikDani.map(d => (
            <div key={d} style={{
              color: C.sivi, fontSize: 8, textAlign: "center",
              transform: "rotate(-60deg)", transformOrigin: "bottom center",
              height: 40, display: "flex", alignItems: "flex-end", justifyContent: "center",
            }}>
              {String(d).substring(5)}
            </div>
          ))}
          {smene.map(s => (
            <div key={s} style={{ display: "contents" }}>
              <div style={{
                color: C.sivi, fontSize: 10, display: "flex", alignItems: "center", paddingRight: 8,
              }}>{s}</div>
              {unikDani.map(d => {
                const v = matrix[d]?.[s] || 0;
                return (
                  <div key={`${d}-${s}`} title={`${d} ${s}: ${v} NOK`}
                    style={{
                      background: getColor(v), borderRadius: 3, height: 22,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: v > 0 ? 8 : 0, color: "#fff", fontWeight: 700,
                    }}>
                    {v > 0 ? v : ""}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PoGrupiPanel({ merenja, polje, naslov, podnaslov, C }) {
  const arr = statPoGrupi(merenja, polje);
  const boje = BOJE_GRUPE(C);

  if (!arr.length) return <Prazno C={C} tekst="Nema podataka" />;

  return (
    <div>
      <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.2, marginBottom: 14 }}>
        ANALIZA PO {naslov}
        {podnaslov && (
          <span style={{ display: "block", fontSize: 9, marginTop: 4, letterSpacing: 0 }}>{podnaslov}</span>
        )}
      </div>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 70px 70px 70px 80px 80px",
          background: C.hover, padding: "9px 14px", fontSize: 9, color: C.sivi, gap: 8, letterSpacing: 1,
        }}>
          <span>{naslov}</span><span>OK</span><span>NOK</span><span>n</span><span>RTY %</span><span>DPMO</span>
        </div>
        {arr.map((o, i) => (
          <div key={`${o.naziv}-${i}`} style={{
            display: "grid", gridTemplateColumns: "1fr 70px 70px 70px 80px 80px",
            padding: "10px 14px", borderTop: `1px solid ${C.border}`, fontSize: 12, gap: 8, alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: boje[i % boje.length], flexShrink: 0 }} />
              <span style={{ color: C.tekst, fontWeight: 700 }}>{o.naziv}</span>
            </div>
            <span style={{ color: C.zelena }}>{o.ok}</span>
            <span style={{ color: C.crvena, fontWeight: o.nok > 0 ? 700 : 400 }}>{o.nok}</span>
            <span style={{ color: C.sivi }}>{o.n}</span>
            <span style={{
              color: o.rty > 95 ? C.zelena : o.rty > 80 ? C.zuta : C.crvena, fontWeight: 700,
            }}>
              {o.rty}%
            </span>
            <span style={{ color: C.ljubicasta, fontSize: 11 }}>
              {o.n > 0 ? o.dpmo.toLocaleString() : "—"}
            </span>
          </div>
        ))}
      </div>
      <SpcOkNokBarGraf data={arr} C={C} height={260} xKey="naziv" naslov={`OK / NOK — ${naslov}`} />
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 8 }}>
        Polje u bazi: <code style={{ color: C.tekst }}>{polje}</code>
      </div>
    </div>
  );
}

export function KorelacijaPozicijaMasinaPanel({ merenja, C }) {
  const { masine, pozicije, pivot, maxVal, ukNok } = korelacijaPozicijaMasina(merenja);
  if (!ukNok) return <Prazno C={C} tekst="Nema NOK merenja za korelaciju" />;

  const getCellBg = (v) => {
    if (v === 0) return C.hover;
    const i = v / Math.max(maxVal, 1);
    if (i < 0.25) return `${C.zelena}50`;
    if (i < 0.5) return `${C.zuta}70`;
    if (i < 0.75) return `${C.narandzasta}80`;
    return `${C.crvena}90`;
  };

  return (
    <div>
      <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.2, marginBottom: 14 }}>
        KORELACIJA DIMENZIJA × MAŠINA (NOK merenja)
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{
                color: C.sivi, padding: "8px 12px", textAlign: "left",
                borderBottom: `1px solid ${C.border}`, fontWeight: 400,
              }}>Pozicija</th>
              {masine.map(m => (
                <th key={m} style={{
                  color: C.sivi, padding: "8px 10px", fontWeight: 400,
                  borderBottom: `1px solid ${C.border}`, textAlign: "center", minWidth: 70,
                }}>{m}</th>
              ))}
              <th style={{
                color: C.sivi, padding: "8px 10px", fontWeight: 400,
                borderBottom: `1px solid ${C.border}`, textAlign: "center",
              }}>Ukupno</th>
            </tr>
          </thead>
          <tbody>
            {pozicije.map(p => {
              const uk = masine.reduce((s, m) => s + (pivot[p]?.[m] || 0), 0);
              return (
                <tr key={p}>
                  <td style={{
                    color: C.tekst, padding: "8px 12px",
                    borderBottom: `1px solid ${C.border}`, fontWeight: 500,
                  }}>{p}</td>
                  {masine.map(m => {
                    const v = pivot[p]?.[m] || 0;
                    return (
                      <td key={m} style={{
                        padding: "6px 10px", textAlign: "center", background: getCellBg(v),
                        borderBottom: `1px solid ${C.border}`,
                        color: v > 0 ? C.tekst : C.border, fontWeight: v > 0 ? 700 : 400,
                      }}>
                        {v > 0 ? v : "—"}
                      </td>
                    );
                  })}
                  <td style={{
                    padding: "8px 10px", textAlign: "center", fontWeight: 700,
                    color: C.tekst, borderBottom: `1px solid ${C.border}`,
                  }}>{uk}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 12, lineHeight: 1.5 }}>
        Tamnije ćelije = više NOK merenja na toj mašini za datu dimenziju.
      </div>
    </div>
  );
}

export function PoredjenjeMerljive({ idDeo, pozicija, C, addToast }) {
  const [podaci, setPodaci] = useState(null);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("7");

  const ucitaj = useCallback(async () => {
    if (!idDeo) return;
    setLoading(true);
    try {
      const danas = new Date();
      const od1 = new Date(danas);
      od1.setDate(od1.getDate() - Number(period));
      const od2 = new Date(od1);
      od2.setDate(od2.getDate() - Number(period));
      const fmt = d => d.toISOString().split("T")[0];

      const base = () => {
        let q = supabase.from("merenja_varijabilna")
          .select("status")
          .eq("id_deo", idDeo);
        if (pozicija) q = q.eq("pozicija", pozicija);
        return q;
      };

      const [r1, r2] = await Promise.all([
        base().gte("datum", fmt(od1)).lte("datum", fmt(danas)),
        base().gte("datum", fmt(od2)).lt("datum", fmt(od1)),
      ]);

      const calc = (rows) => {
        const n = (rows || []).length;
        const nok = (rows || []).filter(r => (r.status || "").toUpperCase() === "NOK").length;
        const ok = n - nok;
        return {
          n, nok, ok,
          rty: n > 0 ? ((ok / n) * 100).toFixed(2) : 0,
          p: n > 0 ? ((nok / n) * 100).toFixed(3) : 0,
          dpmo: n > 0 ? Math.round((nok / n) * 1e6) : 0,
        };
      };

      setPodaci({
        tek: calc(r1.data),
        prev: calc(r2.data),
        label1: `Poslednjih ${period} dana`,
        label2: `Prethodnih ${period} dana`,
      });
    } catch (e) {
      addToast(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [idDeo, pozicija, period, addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const arrow = (tek, prev, veciJeLosi = true) => {
    if (!prev || prev === 0) return null;
    const diff = Number(tek) - Number(prev);
    if (Math.abs(diff) < 0.01) return <span style={{ color: C.sivi }}> =</span>;
    const gore = diff > 0;
    const losi = veciJeLosi ? gore : !gore;
    return (
      <span style={{ color: losi ? C.crvena : C.zelena, fontSize: 12 }}>
        {" "}{gore ? "↑" : "↓"} {Math.abs(diff).toFixed(1)}
      </span>
    );
  };

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.2 }}>
          POREĐENJE PERIODA — MERLJIVA MERENJA
          {pozicija && <span style={{ display: "block", marginTop: 4 }}>Pozicija: {pozicija}</span>}
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          style={{
            background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.tekst, fontSize: 11, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit",
          }}>
          <option value="7">7 dana</option>
          <option value="14">14 dana</option>
          <option value="30">30 dana</option>
        </select>
      </div>
      {loading ? (
        <div style={{ color: C.sivi, fontSize: 12, textAlign: "center", padding: 16 }}>Učitavanje…</div>
      ) : !podaci ? null : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {[
            ["RTY %", podaci.tek.rty, podaci.prev.rty, false, "%"],
            ["NOK", podaci.tek.nok, podaci.prev.nok, true, ""],
            ["DPMO", podaci.tek.dpmo, podaci.prev.dpmo, true, ""],
            ["Merenja", podaci.tek.n, podaci.prev.n, false, ""],
          ].map(([naziv, tek, prev, veciLosi, suf]) => (
            <div key={naziv} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>{naziv}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.tekst }}>
                {tek}{suf} {arrow(tek, prev, veciLosi)}
              </div>
              <div style={{ color: C.border, fontSize: 10, marginTop: 2 }}>preth: {prev}{suf}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ArhivaNokMerljive({ merenja, idDeo, C }) {
  const [filter, setFilter] = useState("");
  const [samoFoto, setSamoFoto] = useState(false);
  const [uvecana, setUvecana] = useState(null);

  const nok = (merenja || [])
    .filter(m => (m.status || "").toUpperCase() === "NOK")
    .sort((a, b) => String(b.created_at || b.datum).localeCompare(String(a.created_at || a.datum)));

  const filtrirani = nok.filter(p => {
    if (samoFoto && !p.foto) return false;
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (p.pozicija || "").toLowerCase().includes(q)
      || (p.id_deo || "").toLowerCase().includes(q)
      || (p.masina || "").toLowerCase().includes(q)
      || (p.komentar || "").toLowerCase().includes(q);
  });

  const pozicije = [...new Set(nok.map(p => p.pozicija).filter(Boolean))];

  return (
    <div>
      {uvecana && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 2000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}
          onClick={() => setUvecana(null)}>
          <div style={{
            background: C.panel, borderRadius: 12, padding: 20, maxWidth: 480, width: "100%",
          }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ color: C.crvena, fontWeight: 700, fontSize: 14 }}>NOK — {uvecana.pozicija}</span>
              <button type="button" onClick={() => setUvecana(null)}
                style={{ background: "none", border: "none", color: C.sivi, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            {uvecana.foto && (
              <img src={uvecana.foto} alt="NOK" style={{
                width: "100%", borderRadius: 8, maxHeight: 280, objectFit: "contain",
                marginBottom: 12, background: C.bg,
              }} />
            )}
            {[
              ["ID dela", uvecana.id_deo],
              ["Datum", uvecana.datum],
              ["Smena", uvecana.smena],
              ["Vrednost", formatVrednostKarte(uvecana.vrednost_raw, uvecana.vrednost_dec)],
              ["Mašina", uvecana.masina || "—"],
              ["Kontrolor", uvecana.kontrolor || "—"],
              ["Operater", uvecana.operater || "—"],
              ["Linija", uvecana.linija || "—"],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: C.sivi }}>{l}</span>
                <span style={{ color: C.tekst, fontWeight: 500 }}>{v ?? "—"}</span>
              </div>
            ))}
            {uvecana.komentar && (
              <div style={{
                background: `${C.zuta}15`, border: `1px solid ${C.zuta}30`,
                borderRadius: 8, padding: "10px 12px", marginTop: 10, color: C.tekst, fontSize: 12,
              }}>
                💬 {uvecana.komentar}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.2, marginBottom: 8 }}>
        FOTO ARHIVA GREŠAKA — NOK MERENJA
      </div>
      <div style={{ color: C.sivi, fontSize: 9, marginBottom: 14, lineHeight: 1.4 }}>
        NOK iz filtera{idDeo ? ` · ${idDeo}` : ""}. Foto se dodaje pri unosu u koloni dimenzije koja ima NOK.
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="Pozicija, mašina, ID…"
          style={{
            flex: 1, background: C.input, border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.tekst, fontSize: 12, padding: "9px 12px", outline: "none", fontFamily: "inherit", minWidth: 200,
          }} />
        {filter && (
          <button type="button" onClick={() => setFilter("")}
            style={{
              background: "none", border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.sivi, fontSize: 12, padding: "9px 12px", cursor: "pointer",
            }}>✕</button>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => { setFilter(""); setSamoFoto(false); }}
          style={{
            background: !filter && !samoFoto ? C.plava : "none", border: `1px solid ${!filter && !samoFoto ? C.plava : C.border}`,
            borderRadius: 20, color: !filter && !samoFoto ? "#fff" : C.sivi, fontSize: 11, padding: "5px 14px", cursor: "pointer",
          }}>
          Sve ({nok.length})
        </button>
        <button type="button" onClick={() => setSamoFoto(v => !v)}
          style={{
            background: samoFoto ? "#fb923c" : "none",
            border: `1px solid ${samoFoto ? "#fb923c" : C.border}`,
            borderRadius: 20, color: samoFoto ? "#fff" : C.sivi, fontSize: 11, padding: "5px 14px", cursor: "pointer",
          }}>
          📷 Sa fotom ({nok.filter(p => p.foto).length})
        </button>
        {pozicije.slice(0, 8).map(p => (
          <button key={p} type="button" onClick={() => setFilter(p)}
            style={{
              background: filter === p ? C.crvena : "none",
              border: `1px solid ${filter === p ? C.crvena : C.border}`,
              borderRadius: 20, color: filter === p ? "#fff" : C.sivi, fontSize: 11, padding: "5px 14px", cursor: "pointer",
            }}>
            {p}
          </button>
        ))}
      </div>

      {!filtrirani.length ? (
        <Prazno C={C} tekst={filter ? "Nema rezultata" : "Nema NOK merenja u izabranom periodu ✓"} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {filtrirani.map(p => (
            <div key={p.id ?? `${p.datum}-${p.pozicija}-${p.created_at}`}
              onClick={() => setUvecana(p)}
              onKeyDown={e => e.key === "Enter" && setUvecana(p)}
              role="button"
              tabIndex={0}
              style={{
                background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10,
                padding: 14, cursor: "pointer",
              }}>
              {p.foto ? (
                <img src={p.foto} alt="" style={{
                  width: "100%", borderRadius: 8, height: 100, objectFit: "cover", marginBottom: 10,
                }} />
              ) : (
                <div style={{
                  background: `${C.crvena}15`, borderRadius: 8, height: 72,
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, fontSize: 28,
                }}>
                  📐
                </div>
              )}
              <div style={{ color: C.crvena, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{p.pozicija}</div>
              <div style={{ color: C.tekst, fontSize: 11, marginBottom: 4 }}>
                {formatVrednostKarte(p.vrednost_raw, p.vrednost_dec)}
              </div>
              <div style={{ color: C.sivi, fontSize: 10 }}>{p.datum} · S{p.smena || "?"}</div>
              {p.masina && (
                <div style={{ color: C.border, fontSize: 9, marginTop: 4 }}>⚙ {p.masina}</div>
              )}
              {p.komentar && (
                <div style={{
                  color: C.zuta, fontSize: 10, marginTop: 6,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  💬 {p.komentar}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const POLJA_8D = [
  { key: "d1_tim", label: "D1 — Tim", ph: "Članovi tima i voditelj…" },
  { key: "d2_opis_problema", label: "D2 — Opis problema", ph: "Dimenzija, vrednost, trend, mašina…" },
  { key: "d3_privremena_akcija", label: "D3 — Privremena akcija", ph: "Zaštita procesa / sortiranje…" },
  { key: "d4_uzrok", label: "D4 — Uzrok", ph: "5×Zašto, koren uzroka…" },
  { key: "d5_korektivna", label: "D5 — Korektivna akcija", ph: "Eliminacija uzroka…" },
  { key: "d6_implementacija", label: "D6 — Implementacija", ph: "Ko, šta, rok…" },
  { key: "d7_prevencija", label: "D7 — Prevencija", ph: "SPC, kalibracija, obuka…" },
  { key: "d8_zakljucak", label: "D8 — Zaključak", ph: "Tim, validacija…" },
];

function Editor8DMerljive({ izvestaj, sviDelovi, onSacuvaj, onNazad, onPDF, C }) {
  const [form, setForm] = useState({
    id: izvestaj.id || null,
    id_deo: izvestaj.id_deo || "",
    naziv_dela: izvestaj.naziv_dela || "",
    status: izvestaj.status || "u_izradi",
    d1_tim: izvestaj.d1_tim || "",
    d2_opis_problema: izvestaj.d2_opis_problema || "",
    d3_privremena_akcija: izvestaj.d3_privremena_akcija || "",
    d4_uzrok: izvestaj.d4_uzrok || "",
    d5_korektivna: izvestaj.d5_korektivna || "",
    d6_implementacija: izvestaj.d6_implementacija || "",
    d7_prevencija: izvestaj.d7_prevencija || "",
    d8_zakljucak: izvestaj.d8_zakljucak || "",
  });

  const INP = {
    width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.tekst, fontSize: 13, padding: "10px 12px", boxSizing: "border-box",
    outline: "none", fontFamily: "inherit",
  };
  const popunjeno = POLJA_8D.filter(p => form[p.key]?.trim()).length;

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button type="button" onClick={onNazad}
          style={{ background: "none", border: "none", color: C.sivi, fontSize: 14, cursor: "pointer" }}>← Nazad</button>
        <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700 }}>8D izveštaj</div>
        <button type="button" onClick={() => onPDF(form)}
          style={{
            background: "#7c3aed", border: "none", borderRadius: 7, color: "#fff",
            fontSize: 11, fontWeight: 700, padding: "7px 14px", cursor: "pointer",
          }}>📄 PDF</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>ID DELA</div>
          <select value={form.id_deo} onChange={e => {
            const d = sviDelovi.find(x => x.id_deo === e.target.value);
            setForm(p => ({ ...p, id_deo: e.target.value, naziv_dela: d?.naziv_dela || "" }));
          }} style={{ ...INP, cursor: "pointer" }}>
            <option value="">— Izaberi —</option>
            {sviDelovi.map(d => (
              <option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 }}>STATUS</div>
          <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
            style={{ ...INP, cursor: "pointer" }}>
            <option value="u_izradi">U izradi</option>
            <option value="pregled">Na pregledu</option>
            <option value="zavrsen">Završen</option>
          </select>
        </div>
      </div>
      <div style={{
        background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ flex: 1, background: C.hover, borderRadius: 3, height: 6 }}>
          <div style={{
            background: C.plava, width: `${(popunjeno / 8) * 100}%`, height: 6, borderRadius: 3,
          }} />
        </div>
        <span style={{ color: C.sivi, fontSize: 11 }}>{popunjeno}/8</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {POLJA_8D.map((p, i) => (
          <div key={p.key}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{
                background: form[p.key]?.trim() ? C.zelena : C.hover,
                color: form[p.key]?.trim() ? "#fff" : C.sivi,
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, minWidth: 24, textAlign: "center",
              }}>{i + 1}</span>
              <span style={{ color: C.tekst, fontSize: 12, fontWeight: 600 }}>{p.label}</span>
            </div>
            <textarea value={form[p.key] || ""} onChange={e => setForm(pr => ({ ...pr, [p.key]: e.target.value }))}
              placeholder={p.ph} rows={3} style={{ ...INP, resize: "vertical", minHeight: 70 }} />
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onSacuvaj(form)} style={{
        width: "100%", background: C.plava, border: "none", borderRadius: 10, color: "#fff",
        fontSize: 14, fontWeight: 700, padding: "14px", cursor: "pointer", marginTop: 16,
      }}>
        💾 Sačuvaj 8D
      </button>
    </div>
  );
}

export function OsmDIzvestajMerljive({ korisnik, C, addToast, sviDelovi, prefill, onPrefillUsed }) {
  const [izvestaji, setIzvestaji] = useState([]);
  const [aktivni, setAktivni] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("osmd_izvestaji")
      .select("*,kreirao:radnici!osmd_izvestaji_kreirao_id_fkey(ime)")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setIzvestaji(data || []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!prefill) return;
    setAktivni({
      id_deo: prefill.id_deo || "",
      d2_opis_problema: prefill.opis || prefill.d2_opis_problema || "",
      d3_privremena_akcija: prefill.d3_privremena_akcija || "",
      d5_korektivna: prefill.d5_korektivna || prefill.korektivna_akcija || "",
    });
    onPrefillUsed?.();
  }, [prefill, onPrefillUsed]);

  const sacuvaj = async (form) => {
    const isNew = !form.id;
    const op = isNew
      ? supabase.from("osmd_izvestaji").insert({ ...form, kreirao_id: korisnik.radnikId })
        .select("*,kreirao:radnici!osmd_izvestaji_kreirao_id_fkey(ime)").single()
      : supabase.from("osmd_izvestaji").update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", form.id)
        .select("*,kreirao:radnici!osmd_izvestaji_kreirao_id_fkey(ime)").single();
    const { data, error } = await op;
    if (!error) {
      setIzvestaji(p => (isNew ? [data, ...p] : p.map(i => (i.id === data.id ? data : i))));
      setAktivni(data);
      addToast(`✓ 8D ${isNew ? "kreiran" : "sačuvan"}`, "uspeh");
    } else addToast(error.message, "greska");
  };

  const exportPDF8D = async (izv) => {
    const { default: jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = pdf.internal.pageSize.getWidth();
    pdf.setFillColor(28, 35, 51);
    pdf.rect(0, 0, W, 30, "F");
    pdf.setTextColor(88, 166, 255);
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("8D IZVEŠTAJ — MERLJIVE", 14, 12);
    pdf.setTextColor(200, 210, 230);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${izv.id_deo} · ${new Date(izv.created_at || Date.now()).toLocaleDateString("sr-RS")}`, 14, 22);
    let y = 40;
    POLJA_8D.forEach((p, i) => {
      if (y > 260) { pdf.addPage(); y = 20; }
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(80, 100, 120);
      pdf.text(p.label.toUpperCase(), 14, y);
      y += 6;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(30, 32, 36);
      const linije = pdf.splitTextToSize(izv[p.key] || "—", W - 28);
      pdf.text(linije, 14, y);
      y += linije.length * 5 + 6;
    });
    pdf.save(`8D_merljive_${izv.id_deo}_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  if (aktivni !== null) {
    return (
      <Editor8DMerljive izvestaj={aktivni} sviDelovi={sviDelovi}
        onSacuvaj={sacuvaj} onNazad={() => setAktivni(null)} onPDF={exportPDF8D} C={C} />
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700 }}>8D izveštaji</div>
        <button type="button" onClick={() => setAktivni({})}
          style={{
            background: C.plava, border: "none", borderRadius: 8, color: "#fff",
            fontSize: 12, fontWeight: 700, padding: "9px 16px", cursor: "pointer",
          }}>+ Novi 8D</button>
      </div>
      {loading ? (
        <div style={{ color: C.sivi, fontSize: 12, textAlign: "center", padding: 24 }}>Učitavanje…</div>
      ) : !izvestaji.length ? (
        <Prazno C={C} tekst="Nema 8D izveštaja — kreiraj novi" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {izvestaji.slice(0, 20).map(i => (
            <div key={i.id} onClick={() => setAktivni(i)}
              style={{
                background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "12px 14px", cursor: "pointer",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: C.tekst, fontWeight: 700, fontSize: 12 }}>{i.id_deo}</span>
                <span style={{ color: C.sivi, fontSize: 10 }}>
                  {new Date(i.created_at).toLocaleDateString("sr-RS")}
                </span>
              </div>
              <div style={{
                color: C.sivi, fontSize: 10, marginTop: 4,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {(i.d2_opis_problema || "—").slice(0, 80)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
