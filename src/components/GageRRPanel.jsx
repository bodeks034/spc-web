import { useState, useEffect, useMemo, useCallback } from "react";
import {
  praznaMatrica,
  normalizujMatricu,
  izracunajGageRRKompletno,
} from "../lib/gageRR.js";
import {
  ucitajGageRRStudije,
  snimiGageRRStudiju,
  obrisiGageRRStudiju,
} from "../lib/gageRRStore.js";
import { exportGageRRExcel, downloadWorkbook } from "../lib/excelSync.js";

import { supabase } from "../lib/supabaseClient.js";

const BOJA = { zelena: "#22c55e", zuta: "#eab308", crvena: "#ef4444", sivi: "#94a3b8" };

function dISO() {
  return new Date().toISOString().split("T")[0];
}

function KpiKartice({ rez, C, naslov }) {
  if (!rez?.ok) return null;
  const b = C[rez.odluka?.boja] || BOJA[rez.odluka?.boja] || C.sivi;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: C.sivi, fontSize: 10, fontWeight: 700, marginBottom: 8 }}>{naslov}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {[
          ["%GRR", `${rez.pctGRR}%`, b],
          ["%Repeat", `${rez.pctRepeat}%`, C.sivi],
          ["%Reprod", `${rez.pctReprod}%`, C.sivi],
          ["%Part", `${rez.pctPart}%`, C.sivi],
          ...(rez.pctTolGRR != null ? [["%GRR/Tol", `${rez.pctTolGRR}%`, b]] : []),
          ["ndc", rez.ndc, rez.ndc >= 5 ? C.zelena : C.zuta],
          ["GRR σ", rez.GRR, C.sivi],
        ].map(([n, v, bo]) => (
          <div key={n} style={{
            background: C.panel, border: `1px solid ${bo}30`, borderRadius: 8,
            padding: "6px 10px", minWidth: 72, textAlign: "center",
          }}>
            <div style={{ color: C.sivi, fontSize: 8 }}>{n}</div>
            <div style={{ color: bo, fontSize: 14, fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GageRRPanel({ C, addToast, korisnik }) {
  const [merila, setMerila] = useState([]);
  const [studije, setStudije] = useState([]);
  const [dbOk, setDbOk] = useState(true);
  const [loadList, setLoadList] = useState(true);
  const [dbId, setDbId] = useState(null);
  const [naziv, setNaziv] = useState("");
  const [meriloId, setMeriloId] = useState("");
  const [karakteristika, setKarakteristika] = useState("");
  const [lsl, setLsl] = useState("");
  const [usl, setUsl] = useState("");
  const [nDelova, setNDelova] = useState(5);
  const [nOperatera, setNOperatera] = useState(3);
  const [nPonavljanja, setNPonavljanja] = useState(3);
  const [operateri, setOperateri] = useState(["A", "B", "C"]);
  const [delovi, setDelovi] = useState(["1", "2", "3", "4", "5"]);
  const [matrica, setMatrica] = useState(() => praznaMatrica(5, 3, 3));
  const [rezultat, setRezultat] = useState(null);
  const [snima, setSnima] = useState(false);

  const ucitajListu = useCallback(async () => {
    setLoadList(true);
    try {
      const list = await ucitajGageRRStudije(supabase);
      setStudije(list);
      setDbOk(true);
    } catch (e) {
      setDbOk(false);
      if (e.message?.includes("gage_rr_studije") || e.code === "42P01") {
        addToast("Pokreni 12_gage_rr_schema.sql u Supabase", "greska");
      }
    } finally {
      setLoadList(false);
    }
  }, [addToast]);

  useEffect(() => {
    supabase.from("merila").select("id,naziv,serijski_broj,tip,jedinica")
      .eq("aktivno", true).order("naziv")
      .then(({ data }) => setMerila(data || []));
    ucitajListu();
  }, [ucitajListu]);

  useEffect(() => {
    setOperateri(prev => {
      const next = [...prev];
      while (next.length < nOperatera) next.push(String.fromCharCode(65 + next.length));
      return next.slice(0, nOperatera);
    });
    setDelovi(prev => {
      const next = [...prev];
      while (next.length < nDelova) next.push(String(next.length + 1));
      return next.slice(0, nDelova);
    });
    setMatrica(prev => {
      const m = praznaMatrica(nDelova, nOperatera, nPonavljanja);
      for (let i = 0; i < nDelova; i++) {
        for (let j = 0; j < nOperatera; j++) {
          for (let k = 0; k < nPonavljanja; k++) {
            if (prev[i]?.[j]?.[k] != null && prev[i][j][k] !== "") m[i][j][k] = prev[i][j][k];
          }
        }
      }
      return m;
    });
    setRezultat(null);
  }, [nDelova, nOperatera, nPonavljanja]);

  const tolerancija = useMemo(() => {
    const lo = Number(String(lsl).replace(",", "."));
    const hi = Number(String(usl).replace(",", "."));
    if (Number.isFinite(lo) && Number.isFinite(hi) && hi > lo) return hi - lo;
    return null;
  }, [lsl, usl]);

  const izracunaj = () => {
    const norm = normalizujMatricu(matrica, nDelova, nOperatera, nPonavljanja);
    const r = izracunajGageRRKompletno(norm, { tolerancija });
    if (!r.ok) {
      addToast(r.poruka || "Greška u izračunu", "greska");
      setRezultat(null);
      return;
    }
    setRezultat(r);
    addToast("✓ X̄/R i ANOVA izračunati", "uspeh");
  };

  const payloadStudija = () => {
    const merilo = merila.find(m => String(m.id) === String(meriloId));
    return {
      dbId,
      datum: dISO(),
      naziv: naziv || `Gage R&R ${dISO()}`,
      merilo_id: meriloId || null,
      merilo_naziv: merilo?.naziv || "",
      karakteristika,
      lsl,
      usl,
      nDelova,
      nOperatera,
      nPonavljanja,
      operateri,
      delovi,
      matrica: normalizujMatricu(matrica, nDelova, nOperatera, nPonavljanja),
      rezultat,
    };
  };

  const sacuvaj = async () => {
    if (!rezultat?.ok) {
      addToast("Prvo izračunaj studiju", "greska");
      return;
    }
    if (!dbOk) {
      addToast("Supabase tabela nije dostupna — pokreni SQL migraciju", "greska");
      return;
    }
    setSnima(true);
    try {
      const saved = await snimiGageRRStudiju(supabase, payloadStudija(), korisnik?.radnikId);
      setDbId(saved.id);
      await ucitajListu();
      addToast(dbId ? "✓ Studija ažurirana" : "✓ Studija sačuvana u bazi", "uspeh");
    } catch (e) {
      addToast(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const izvozExcel = (studijaOverride) => {
    const data = studijaOverride || payloadStudija();
    if (!data.rezultat?.ok && !data.rezultat_xbar) {
      addToast("Nema rezultata za export", "greska");
      return;
    }
    try {
      const wb = exportGageRRExcel(data);
      const safe = (naziv || "GageRR").replace(/[^\w\-]+/g, "_").slice(0, 40);
      downloadWorkbook(wb, `MSA_GageRR_${safe}_${dISO()}.xlsx`);
      addToast("✓ Excel preuzet", "uspeh");
    } catch (e) {
      addToast(e.message, "greska");
    }
  };

  const novaStudija = () => {
    setDbId(null);
    setNaziv("");
    setMeriloId("");
    setKarakteristika("");
    setLsl("");
    setUsl("");
    setRezultat(null);
  };

  const ucitajStudiju = (s) => {
    setDbId(s.dbId || s.id);
    setNaziv(s.naziv || "");
    setMeriloId(s.merilo_id ? String(s.merilo_id) : "");
    setKarakteristika(s.karakteristika || "");
    setLsl(s.lsl ?? "");
    setUsl(s.usl ?? "");
    setNDelova(s.nDelova || 5);
    setNOperatera(s.nOperatera || 3);
    setNPonavljanja(s.nPonavljanja || 3);
    setOperateri(s.operateri || ["A", "B", "C"]);
    setDelovi(s.delovi || ["1", "2", "3", "4", "5"]);
    setMatrica(s.matrica || praznaMatrica(s.nDelova, s.nOperatera, s.nPonavljanja));
    if (s.rezultat?.xbar || s.rezultat?.anova) {
      setRezultat(s.rezultat);
    } else if (s.rezultat_xbar || s.rezultat_anova) {
      setRezultat({
        ok: true,
        xbar: s.rezultat_xbar,
        anova: s.rezultat_anova,
        pctGRR: s.pct_grr,
        ndc: s.ndc,
        odluka: {
          status: s.status_msa,
          boja: s.status_msa === "prihvatljivo" ? "zelena" : s.status_msa === "uslovno" ? "zuta" : "crvena",
          tekst: s.status_msa,
        },
      });
    } else {
      setRezultat(s.rezultat || null);
    }
    addToast("Studija učitana", "info");
  };

  const obrisi = async (id) => {
    if (!window.confirm("Obrisati studiju iz baze?")) return;
    try {
      await obrisiGageRRStudiju(supabase, id);
      if (dbId === id) novaStudija();
      await ucitajListu();
      addToast("Studija obrisana", "info");
    } catch (e) {
      addToast(e.message, "greska");
    }
  };

  const setCell = (i, j, k, v) => {
    setMatrica(prev => {
      const next = prev.map(row => row.map(col => [...col]));
      next[i][j][k] = v;
      return next;
    });
    setRezultat(null);
  };

  const INP = {
    width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
    color: C.tekst, fontSize: 12, padding: "8px 10px", boxSizing: "border-box", outline: "none",
    fontFamily: "inherit",
  };

  const odlukaBoja = rezultat?.odluka?.boja
    ? (C[rezultat.odluka.boja] || BOJA[rezultat.odluka.boja])
    : C.sivi;

  const BTN = (bg, dis) => ({
    background: dis ? C.hover : bg,
    border: "none",
    borderRadius: 8,
    color: dis ? C.sivi : C.onAkcent,
    fontWeight: 700,
    fontSize: 12,
    padding: "10px 14px",
    cursor: dis ? "not-allowed" : "pointer",
    opacity: snima ? 0.7 : 1,
  });

  return (
    <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
        <div>
          <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
            MSA — GAGE R&R
          </div>
          <div style={{ color: C.sivi, fontSize: 11, marginTop: 4, maxWidth: 640, lineHeight: 1.5 }}>
            Crossed study · metode <strong style={{ color: C.tekst }}>X̄/R</strong> i <strong style={{ color: C.tekst }}>ANOVA</strong> ·
            čuvanje u <code style={{ color: C.plava }}>gage_rr_studije</code> · izvoz Excel.
          </div>
        </div>
        <button type="button" onClick={novaStudija} style={{ ...BTN(C.panel, false), color: C.sivi, border: `1px solid ${C.border}` }}>
          + Nova studija
        </button>
      </div>

      {!dbOk && (
        <div style={{
          background: `${C.zuta}18`, border: `1px solid ${C.zuta}`, borderRadius: 8,
          padding: 12, marginBottom: 12, fontSize: 11, color: C.tekst,
        }}>
          Tabela <code>gage_rr_studije</code> nije kreirana. Pokreni u Supabase SQL Editor fajl{" "}
          <strong>12_gage_rr_schema.sql</strong>.
        </div>
      )}

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
        gap: 10, marginBottom: 14,
      }}>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 4 }}>NAZIV</div>
          <input value={naziv} onChange={e => setNaziv(e.target.value)} style={INP} />
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 4 }}>MERILO</div>
          <select value={meriloId} onChange={e => setMeriloId(e.target.value)} style={{ ...INP, cursor: "pointer" }}>
            <option value="">—</option>
            {merila.map(m => (
              <option key={m.id} value={m.id}>{m.naziv}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 4 }}>KARAKTERISTIKA</div>
          <input value={karakteristika} onChange={e => setKarakteristika(e.target.value)} style={INP} />
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 4 }}>LSL</div>
          <input value={lsl} onChange={e => setLsl(e.target.value)} style={INP} />
        </div>
        <div>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 4 }}>USL</div>
          <input value={usl} onChange={e => setUsl(e.target.value)} style={INP} />
        </div>
        {tolerancija != null && (
          <div style={{ alignSelf: "end", fontSize: 11, color: C.plava }}>
            Tol: <strong>{tolerancija.toFixed(4)}</strong>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14, alignItems: "flex-end" }}>
        {[
          ["Delova", nDelova, setNDelova, 15],
          ["Operatera", nOperatera, setNOperatera, 10],
          ["Ponavljanja", nPonavljanja, setNPonavljanja, 10],
        ].map(([label, val, set, max]) => (
          <div key={label}>
            <div style={{ color: C.sivi, fontSize: 9, marginBottom: 4 }}>{label}</div>
            <select value={val} onChange={e => set(Number(e.target.value))} style={{ ...INP, width: 64, cursor: "pointer" }}>
              {Array.from({ length: max - 1 }, (_, i) => i + 2).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        ))}
        <button type="button" onClick={izracunaj} style={BTN(C.plava, false)}>Izračunaj</button>
        <button type="button" onClick={sacuvaj} disabled={!rezultat?.ok || !dbOk} style={BTN(C.zelena, !rezultat?.ok || !dbOk)}>
          {snima ? "..." : dbId ? "Ažuriraj" : "Sačuvaj u bazu"}
        </button>
        <button type="button" onClick={izvozExcel} disabled={!rezultat?.ok} style={BTN("#7c3aed", !rezultat?.ok)}>
          Excel
        </button>
      </div>

      <div style={{ overflowX: "auto", marginBottom: 16, border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <table style={{ borderCollapse: "collapse", fontSize: 11, minWidth: "100%" }}>
          <thead>
            <tr style={{ background: C.panel }}>
              <th style={{ padding: 8, color: C.sivi }}>Deo</th>
              {operateri.map((op, j) => (
                <th key={j} colSpan={nPonavljanja} style={{ padding: 8, color: C.plava, textAlign: "center" }}>
                  <input value={op} onChange={e => {
                    const n = [...operateri]; n[j] = e.target.value; setOperateri(n);
                  }} style={{ ...INP, width: 52, padding: "4px", textAlign: "center" }} />
                </th>
              ))}
            </tr>
            <tr style={{ background: C.panel }}>
              <th />
              {operateri.map((_, j) =>
                Array.from({ length: nPonavljanja }, (_, k) => (
                  <th key={`${j}-${k}`} style={{ fontSize: 9, color: C.sivi }}>#{k + 1}</th>
                )))}
            </tr>
          </thead>
          <tbody>
            {matrica.map((deo, i) => (
              <tr key={i}>
                <td style={{ padding: 6, background: C.panel }}>
                  <input value={delovi[i] || ""} onChange={e => {
                    const n = [...delovi]; n[i] = e.target.value; setDelovi(n);
                  }} style={{ ...INP, width: 44, padding: "4px" }} />
                </td>
                {deo.map((op, j) =>
                  op.map((cell, k) => (
                    <td key={`${i}-${j}-${k}`} style={{ padding: 4 }}>
                      <input type="text" inputMode="decimal" value={cell}
                        onChange={e => setCell(i, j, k, e.target.value)}
                        style={{ ...INP, width: 60, padding: "4px", textAlign: "center" }} />
                    </td>
                  )))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rezultat?.ok && (
        <div style={{
          background: `${odlukaBoja}12`, border: `1px solid ${odlukaBoja}50`,
          borderRadius: 10, padding: 16, marginBottom: 16,
        }}>
          <div style={{ color: odlukaBoja, fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
            {rezultat.odluka?.tekst || "Rezultat MSA"}
            {rezultat.pctGRR != null && (
              <span style={{ marginLeft: 10, fontSize: 11 }}>(primarni %GRR {rezultat.pctGRR}%)</span>
            )}
          </div>
          <KpiKartice rez={rezultat.xbar} C={C} naslov="X̄/R (Average & Range)" />
          <KpiKartice rez={rezultat.anova} C={C} naslov="ANOVA (komponente varijanse)" />
        </div>
      )}

      <div>
        <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1, marginBottom: 8 }}>
          STUDIJE U BAZI {loadList ? "…" : `(${studije.length})`}
        </div>
        {!studije.length && !loadList ? (
          <div style={{ color: C.border, fontSize: 11 }}>Nema sačuvanih studija</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {studije.map(s => (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                background: C.panel, border: `1px solid ${dbId === s.id ? C.plava : C.border}`,
                borderRadius: 8, padding: "8px 10px",
              }}>
                <button type="button" onClick={() => ucitajStudiju(s)}
                  style={{ flex: 1, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
                  <span style={{ color: C.tekst, fontSize: 12, fontWeight: 600 }}>{s.naziv}</span>
                  <span style={{ color: C.sivi, fontSize: 10, marginLeft: 8 }}>{s.datum}</span>
                  {s.pct_grr != null && (
                    <span style={{ color: BOJA[s.status_msa] || C.sivi, fontSize: 10, marginLeft: 8 }}>
                      GRR {s.pct_grr}%
                    </span>
                  )}
                </button>
                <button type="button" onClick={() => izvozExcel(s)}
                  style={{ ...BTN(C.plava, false), padding: "6px 10px", fontSize: 10 }}>
                  Excel
                </button>
                <button type="button" onClick={() => obrisi(s.id)}
                  style={{ background: "none", border: "none", color: C.crvena, fontSize: 10, cursor: "pointer" }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
