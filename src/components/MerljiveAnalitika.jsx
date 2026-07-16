import { useState, useEffect, useCallback } from "react";
import { SpcOkNokBarGraf } from "./SpcAnalitikaGrafovi.jsx";
import { LAB_FPY_PCT } from "../lib/rtyFpy.js";
import { statPoGrupi, korelacijaPozicijaMasina } from "../lib/varijabilneSpcStats.js";
import { formatVrednostKarte } from "../lib/varijabilneUtils.js";

import { supabase } from "../lib/supabaseClient.js";
import { exportOsmdIzvestajPdf, osmdPayloadIzForme, stampajOsmdIzvestaj, exportOsmdIzvestajWord } from "../lib/osmdIzvestajPdf.js";
import { normalizujPrefill8d } from "../lib/eskalacijeHelper.js";
import { ucitajPfmeaCpPaketZa8d } from "../lib/osmdPfmeaCpPaket.js";
import { exportKvalitetPaketZip } from "../lib/kvalitetPaket.js";
import OsmdEditor, { OsmdScrollOkvir } from "./OsmdEditor.jsx";

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
                      fontSize: v > 0 ? 8 : 0, color: C.onAkcent, fontWeight: 700,
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
          <span>{naslov}</span><span>OK</span><span>NOK</span><span>n</span><span>{LAB_FPY_PCT}</span><span>DPMO</span>
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
            [LAB_FPY_PCT, podaci.tek.rty, podaci.prev.rty, false, "%"],
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
            borderRadius: 20, color: !filter && !samoFoto ? C.onAkcent : C.sivi, fontSize: 11, padding: "5px 14px", cursor: "pointer",
          }}>
          Sve ({nok.length})
        </button>
        <button type="button" onClick={() => setSamoFoto(v => !v)}
          style={{
            background: samoFoto ? "#fb923c" : "none",
            border: `1px solid ${samoFoto ? "#fb923c" : C.border}`,
            borderRadius: 20, color: samoFoto ? C.onAkcent : C.sivi, fontSize: 11, padding: "5px 14px", cursor: "pointer",
          }}>
          📷 Sa fotom ({nok.filter(p => p.foto).length})
        </button>
        {pozicije.slice(0, 8).map(p => (
          <button key={p} type="button" onClick={() => setFilter(p)}
            style={{
              background: filter === p ? C.crvena : "none",
              border: `1px solid ${filter === p ? C.crvena : C.border}`,
              borderRadius: 20, color: filter === p ? C.onAkcent : C.sivi, fontSize: 11, padding: "5px 14px", cursor: "pointer",
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
    setAktivni(normalizujPrefill8d(prefill));
    onPrefillUsed?.();
  }, [prefill, onPrefillUsed]);

  const sacuvaj = async (form) => {
    const payload = osmdPayloadIzForme(form);
    const isNew = !form.id;
    const op = isNew
      ? supabase.from("osmd_izvestaji").insert({ ...payload, kreirao_id: korisnik.radnikId })
        .select("*,kreirao:radnici!osmd_izvestaji_kreirao_id_fkey(ime)").single()
      : supabase.from("osmd_izvestaji").update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", form.id)
        .select("*,kreirao:radnici!osmd_izvestaji_kreirao_id_fkey(ime)").single();
    const { data, error } = await op;
    if (!error) {
      setIzvestaji(p => (isNew ? [data, ...p] : p.map(i => (i.id === data.id ? data : i))));
      setAktivni(data);
      addToast(`✓ 8D ${isNew ? "kreiran" : "sačuvan"}`, "uspeh");
      return data;
    }
    addToast(error.message, "greska");
    return null;
  };

  const exportPaketZip = async (form) => {
    let f = form;
    if (!f?.id) {
      f = await sacuvaj(form);
      if (!f) return;
    }
    try {
      const { dokument } = await ucitajPfmeaCpPaketZa8d(supabase, {
        osmdId: f.id,
        broj8d: f.broj_8d,
        idDeo: f.id_deo,
      });
      await exportKvalitetPaketZip(f, dokument, {
        imeFajla: `Paket_8D_merljive_${f.broj_8d || f.id_deo || f.id}`,
      });
      addToast("✓ Paket preuzet (ZIP: Word 8D + RPN + Excel PFMEA/CP)", "uspeh");
    } catch (e) {
      console.error(e);
      addToast(e?.message || "Paket nije mogao da se generiše", "greska");
    }
  };

  const exportWord8D = (izv) => {
    try {
      exportOsmdIzvestajWord(izv, {
        naslov: "8D izveštaj — merljive",
        podnaslov: "Merljive karakteristike · metoda 8 disciplina",
        prefiksFajla: "8D_merljive",
      });
      addToast("✓ Word dokument preuzet", "uspeh");
    } catch (e) {
      addToast(e?.message || "Word izvoz nije uspeo", "greska");
    }
  };

  const exportPDF8D = async (izv) => {
    try {
      await exportOsmdIzvestajPdf(izv, {
        naslov: "8D izveštaj — merljive",
        podnaslov: "Merljive karakteristike · metoda 8 disciplina",
        prefiksFajla: "8D_merljive",
      });
    } catch (e) {
      console.error(e);
      addToast(e?.message || "PDF nije mogao da se generiše", "greska");
    }
  };

  const stampaj8D = async (izv) => {
    try {
      await stampajOsmdIzvestaj(izv, {
        naslov: "8D izveštaj — merljive",
        podnaslov: "Merljive karakteristike · metoda 8 disciplina",
      });
    } catch (e) {
      addToast(e?.message || "Štampa nije uspela", "greska");
    }
  };

  if (aktivni !== null) {
    return (
      <OsmdEditor izvestaj={aktivni} sviDelovi={sviDelovi} padding={0}
        onSacuvaj={sacuvaj} onNazad={() => setAktivni(null)} onPDF={exportPDF8D}
        onWord={exportWord8D} onStampaj={stampaj8D}
        onExportPaket={exportPaketZip} supabase={supabase}
        C={C} addToast={addToast} />
    );
  }

  return (
    <OsmdScrollOkvir>
    <div style={{ padding: "0 4px", maxWidth: 820, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700 }}>8D izveštaji</div>
        <button type="button" onClick={() => setAktivni({})}
          style={{
            background: C.plava, border: "none", borderRadius: 8, color: C.onAkcent,
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
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: C.tekst, fontWeight: 700, fontSize: 12 }}>{i.broj_8d || i.id_deo}</span>
                {i.broj_reklamacije && (
                  <span style={{ color: C.sivi, fontSize: 10 }}>· {i.broj_reklamacije}</span>
                )}
                <span style={{ color: C.sivi, fontSize: 10, flex: 1 }}>
                  {new Date(i.created_at).toLocaleDateString("sr-RS")}
                </span>
                <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => stampaj8D(i)}
                    style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5,
                      color: C.sivi, fontSize: 10, padding: "3px 8px", cursor: "pointer" }}>
                    Štampaj
                  </button>
                  <button type="button" onClick={() => exportPDF8D(i)}
                    style={{ background: "none", border: `1px solid ${C.plava}55`, borderRadius: 5,
                      color: C.plava, fontSize: 10, padding: "3px 8px", cursor: "pointer", fontWeight: 700 }}>
                    PDF
                  </button>
                </div>
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
    </OsmdScrollOkvir>
  );
}
