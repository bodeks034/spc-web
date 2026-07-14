import { useState, useEffect, useCallback } from "react";
import { SpcTrendLinijaGraf } from "./SpcAnalitikaGrafovi.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { fetchSmenaStatMerljive, generisiIzvestajSmeneMerljive } from "../lib/merljiveSmenaStat.js";
import { HeatmapMerljivePanel } from "./MerljiveAnalitika.jsx";
import { LAB_FPY_PCT, LAB_FPY_CILJ } from "../lib/rtyFpy.js";
import IzvestajKupacPanel from "./IzvestajKupacPanel.jsx";
import SmenaPogonaPanel from "./SmenaPogonaPanel.jsx";

function dISO() {
  return new Date().toISOString().split("T")[0];
}

export function IzvestajSmeneMerljive({ C, korisnik, smena, addToast, idDeo }) {
  const [stat, setStat] = useState({ ok: 0, nok: 0, merenja: 0, rty: 0, dpmo: 0 });
  const [extra, setExtra] = useState({ alarmi: 0, osmd: 0 });
  const [loading, setLoading] = useState(true);

  const osvezi = useCallback(async () => {
    setLoading(true);
    try {
      const datum = dISO();
      const sm = Number(smena) || 1;
      const s = await fetchSmenaStatMerljive(supabase, {
        datum,
        smena: sm,
        idDeo: idDeo || undefined,
      });
      setStat(s);
      let alarmi = 0;
      let osmd = 0;
      try {
        const { count: alC } = await supabase.from("spc_alarmi")
          .select("id", { count: "exact", head: true })
          .eq("datum", datum)
          .in("status", ["otvoren", "potvrden", "karantin"]);
        alarmi = alC || 0;
      } catch { /* */ }
      try {
        const { count: d8C } = await supabase.from("osmd_izvestaji")
          .select("id", { count: "exact", head: true })
          .in("status", ["u_toku", "otvoren", "ceka"]);
        osmd = d8C || 0;
      } catch { /* */ }
      setExtra({ alarmi, osmd });
    } catch (e) {
      addToast(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [smena, idDeo, addToast]);

  useEffect(() => { osvezi(); }, [osvezi]);

  return (
    <div style={{ padding: 18, flex: 1, overflow: "auto" }}>
      <SmenaPogonaPanel
        C={C}
        korisnik={korisnik}
        addToast={addToast}
        smena={Number(smena) || 1}
        modulKontekst="merljive"
        prikaziModulPdf
      />
      <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.2, margin: "18px 0 14px" }}>
        MERLJIVA MERENJA — detalj · {dISO()} · smena {smena}
        {idDeo && <span style={{ display: "block", marginTop: 4 }}>Filter deo: {idDeo}</span>}
      </div>
      {loading ? (
        <div style={{ color: C.sivi, fontSize: 12 }}>Učitavanje…</div>
      ) : (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
          {[
            ["MERENJA", stat.merenja, C.plava],
            ["OK", stat.ok, C.zelena],
            ["NOK", stat.nok, C.crvena],
            [LAB_FPY_PCT, stat.rty > 0 ? `${stat.rty.toFixed(1)}%` : "—", C.zuta],
            ["DPMO", stat.dpmo > 0 ? stat.dpmo.toLocaleString() : "—", C.ljubicasta],
            ["SPC ALARMI", extra.alarmi, C.crvena],
            ["OTVORENI 8D", extra.osmd, C.narandzasta || C.zuta],
          ].map(([l, v, b]) => (
            <div key={l} style={{
              background: C.panel, border: `1px solid ${b}30`, borderRadius: 10,
              padding: "18px 22px", minWidth: 120, textAlign: "center",
            }}>
              <div style={{ color: b, fontSize: 26, fontWeight: 700 }}>{v}</div>
              <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginTop: 5 }}>{l}</div>
            </div>
          ))}
          <button type="button"
            onClick={() => generisiIzvestajSmeneMerljive(supabase, korisnik, Number(smena) || 1, C, addToast)}
            style={{
              background: "#7c3aed", border: "none", borderRadius: 8, color: C.onAkcent,
              fontSize: 11, fontWeight: 700, padding: "10px 16px", cursor: "pointer", marginTop: 4,
            }}>
            📄 Predaja smene PDF
          </button>
        </div>
      )}
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 16, lineHeight: 1.5 }}>
        PDF uključuje KPI, alarme, NCR, 8D, eskalacije, prioritet i FAI. Tekst se prelama u margine A4.
      </div>
    </div>
  );
}

export function CiljeviMerljive({ C, addToast, sviDelovi }) {
  const [ciljevi, setCiljevi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forma, setForma] = useState(false);
  const [aktuelni, setAktuelni] = useState({
    id_deo: "", rty_cilj: 95, dpmo_cilj: 50000, p_cilj: 5.0, napomena: "",
  });
  const [ostvaren, setOstvaren] = useState({});

  useEffect(() => {
    const od = new Date();
    od.setDate(od.getDate() - 30);
    Promise.all([
      supabase.from("ciljevi").select("*").order("vazi_od", { ascending: false }),
      supabase.from("merenja_varijabilna")
        .select("id_deo,status")
        .gte("datum", od.toISOString().split("T")[0]),
    ]).then(([c, m]) => {
      setCiljevi(c.data || []);
      const mapa = {};
      (m.data || []).forEach(r => {
        if (!mapa[r.id_deo]) mapa[r.id_deo] = { n: 0, nok: 0 };
        mapa[r.id_deo].n += 1;
        if ((r.status || "").toUpperCase() === "NOK") mapa[r.id_deo].nok += 1;
      });
      const rez = {};
      Object.entries(mapa).forEach(([id, d]) => {
        rez[id] = {
          rty: d.n > 0 ? ((d.n - d.nok) / d.n * 100).toFixed(1) : null,
          dpmo: d.n > 0 ? Math.round((d.nok / d.n) * 1e6) : null,
          p: d.n > 0 ? ((d.nok / d.n) * 100).toFixed(2) : null,
        };
      });
      setOstvaren(rez);
      setLoading(false);
    });
  }, []);

  const snimi = async () => {
    const { data, error } = await supabase.from("ciljevi").insert({
      ...aktuelni,
      vazi_od: dISO(),
    }).select().single();
    if (!error) {
      setCiljevi(p => [data, ...p]);
      setForma(false);
      addToast("✓ Cilj postavljen", "uspeh");
    } else addToast(error.message, "greska");
  };

  const getIndikator = (ostvarena, cilj, manjiBolje = false) => {
    if (ostvarena == null) return null;
    const v = parseFloat(ostvarena);
    const c = parseFloat(cilj);
    if (manjiBolje) return v <= c ? C.zelena : v <= c * 1.2 ? C.zuta : C.crvena;
    return v >= c ? C.zelena : v >= c * 0.9 ? C.zuta : C.crvena;
  };

  const INP = {
    width: "100%", background: C.input, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.tekst, fontSize: 13, padding: "10px 12px", boxSizing: "border-box",
    outline: "none", fontFamily: "inherit",
  };

  return (
    <div style={{ padding: 18, flex: 1, overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700 }}>CILJEVI KVALITETA (merljive)</div>
        <button type="button" onClick={() => setForma(true)}
          style={{
            background: C.zelena, border: "none", borderRadius: 8, color: C.onAkcent,
            fontSize: 12, fontWeight: 700, padding: "9px 16px", cursor: "pointer",
          }}>+ Postavi cilj</button>
      </div>
      <div style={{ color: C.sivi, fontSize: 9, marginBottom: 12 }}>
        Ostvareno = poslednjih 30 dana iz merenja_varijabilna.
      </div>
      {forma && (
        <div style={{
          background: C.panel, border: `1px solid ${C.zelena}40`, borderRadius: 12,
          padding: 16, marginBottom: 16,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ color: C.sivi, fontSize: 9, marginBottom: 5 }}>ID DELA</div>
              <select value={aktuelni.id_deo} onChange={e => setAktuelni(p => ({ ...p, id_deo: e.target.value }))}
                style={{ ...INP, cursor: "pointer" }}>
                <option value="">— Izaberi —</option>
                {sviDelovi.map(d => (
                  <option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ color: C.sivi, fontSize: 9, marginBottom: 5 }}>{LAB_FPY_CILJ}</div>
              <input type="number" value={aktuelni.rty_cilj}
                onChange={e => setAktuelni(p => ({ ...p, rty_cilj: e.target.value }))} style={INP} />
            </div>
            <div>
              <div style={{ color: C.sivi, fontSize: 9, marginBottom: 5 }}>DPMO CILJ</div>
              <input type="number" value={aktuelni.dpmo_cilj}
                onChange={e => setAktuelni(p => ({ ...p, dpmo_cilj: e.target.value }))} style={INP} />
            </div>
            <div>
              <div style={{ color: C.sivi, fontSize: 9, marginBottom: 5 }}>p CILJ %</div>
              <input type="number" value={aktuelni.p_cilj}
                onChange={e => setAktuelni(p => ({ ...p, p_cilj: e.target.value }))} style={INP} />
            </div>
          </div>
          <button type="button" onClick={snimi} disabled={!aktuelni.id_deo}
            style={{
              background: aktuelni.id_deo ? C.zelena : C.hover, border: "none", borderRadius: 8,
              color: C.onAkcent, fontSize: 13, fontWeight: 700, padding: "11px", cursor: "pointer", width: "100%",
            }}>Postavi cilj</button>
        </div>
      )}
      {loading ? <div style={{ color: C.sivi }}>Učitavanje…</div>
        : ciljevi.map(c => {
          const ost = ostvaren[c.id_deo] || {};
          return (
            <div key={c.id} style={{
              background: C.panel, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: 16, marginBottom: 10,
            }}>
              <div style={{ color: C.tekst, fontWeight: 700, marginBottom: 10 }}>{c.id_deo} · od {c.vazi_od}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  [LAB_FPY_PCT, `${c.rty_cilj}%`, ost.rty, false],
                  ["DPMO", c.dpmo_cilj, ost.dpmo, true],
                  ["p %", `${c.p_cilj}%`, ost.p, true],
                ].map(([naziv, cilj, o, manji]) => (
                  <div key={naziv} style={{ background: C.bg, borderRadius: 8, padding: 10 }}>
                    <div style={{ color: C.sivi, fontSize: 9 }}>{naziv}</div>
                    <div style={{ color: getIndikator(o, parseFloat(cilj), manji) || C.tekst, fontSize: 16, fontWeight: 700 }}>
                      {o ?? "—"} / cilj {cilj}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}

export function KupacMerljive({ C, addToast }) {
  return (
    <IzvestajKupacPanel
      C={C}
      addToast={addToast}
      modul="merljive"
      naslov="IZVEŠTAJ ZA KUPCA (merljive)"
    />
  );
}

export function StabilnostMerljive({ sviDelovi, C, addToast, defaultIdDeo = "" }) {
  const [idDeo, setIdDeo] = useState(defaultIdDeo);

  useEffect(() => {
    if (defaultIdDeo) setIdDeo(defaultIdDeo);
  }, [defaultIdDeo]);
  const [podaci, setPodaci] = useState(null);
  const [loading, setLoading] = useState(false);

  const analiziraj = useCallback(async () => {
    if (!idDeo) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from("merenja_varijabilna")
        .select("datum,status")
        .eq("id_deo", idDeo)
        .order("datum", { ascending: true });
      if (error) throw error;
      if (!data?.length) {
        setPodaci(null);
        setLoading(false);
        return;
      }
      const gr = {};
      data.forEach(r => {
        if (!gr[r.datum]) gr[r.datum] = { datum: r.datum, nok: 0, n: 0 };
        gr[r.datum].n += 1;
        if ((r.status || "").toUpperCase() === "NOK") gr[r.datum].nok += 1;
      });
      const niz = Object.values(gr).sort((a, b) => a.datum.localeCompare(b.datum))
        .map(d => ({ datum: d.datum, p: d.n > 0 ? (d.nok / d.n) * 100 : 0 }));

      if (niz.length < 6) {
        setPodaci({ niz, shift: null, msg: "Premalo podataka (min 6 dana)" });
        setLoading(false);
        return;
      }

      const polovina = Math.floor(niz.length / 2);
      const prv = niz.slice(0, polovina).map(d => d.p);
      const drg = niz.slice(polovina).map(d => d.p);
      const mean = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
      const m1 = mean(prv);
      const m2 = mean(drg);
      const std = arr => {
        const m = mean(arr);
        return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
      };
      const s1 = std(prv) || 0.001;
      const t = Math.abs(m2 - m1) / (s1 * Math.sqrt(2 / polovina));
      const shift = t > 2.0;
      const mr = niz.slice(1).map((d, i) => Math.abs(d.p - niz[i].p));
      const mrBar = mean(mr) || 0.001;
      const uclMR = 3.267 * mrBar;
      const tackeProboja = mr.filter(v => v > uclMR).length;

      setPodaci({
        niz, shift, m1: m1.toFixed(2), m2: m2.toFixed(2),
        razlika: (m2 - m1).toFixed(2), tackeProboja,
        msg: shift
          ? `⚠ Promena procesa: ${m1.toFixed(2)}% → ${m2.toFixed(2)}% NOK`
          : "✓ Proces stabilan (merljiva merenja)",
      });
    } catch (e) {
      addToast(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [idDeo, addToast]);

  useEffect(() => { analiziraj(); }, [analiziraj]);

  const INP_S = {
    background: C.input, border: `1px solid ${C.border}`, borderRadius: 8,
    color: C.tekst, fontSize: 11, padding: "7px 10px", outline: "none", fontFamily: "inherit",
  };

  return (
    <div style={{ padding: 18, flex: 1, overflow: "auto" }}>
      <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.5, marginBottom: 14 }}>
        STABILNOST PROCESA — % NOK po danu (merljive)
      </div>
      <select value={idDeo} onChange={e => setIdDeo(e.target.value)} style={{ ...INP_S, width: "100%", marginBottom: 16, cursor: "pointer" }}>
        <option value="">— Izaberi deo —</option>
        {sviDelovi.map(d => <option key={d.id_deo} value={d.id_deo}>{d.id_deo} — {d.naziv_dela}</option>)}
      </select>
      {!idDeo ? (
        <Prazno C={C} tekst="Izaberi deo" />
      ) : loading ? (
        <div style={{ color: C.sivi }}>Analiza…</div>
      ) : !podaci ? (
        <Prazno C={C} tekst="Nema podataka" />
      ) : (
        <>
          <div style={{
            background: podaci.shift ? `${C.crvena}18` : `${C.zelena}18`,
            border: `1px solid ${podaci.shift ? C.crvena : C.zelena}40`,
            borderRadius: 10, padding: 12, marginBottom: 16,
            color: podaci.shift ? C.crvena : C.zelena, fontWeight: 700, fontSize: 12,
          }}>
            {podaci.msg}
          </div>
          {podaci.niz?.length > 0 && (
            <SpcTrendLinijaGraf
              data={podaci.niz}
              C={C}
              height={300}
              boja={podaci.shift ? C.narandzasta : C.zelena}
              tickFormatterX={v => v?.substring(5) || ""}
              referencaX={podaci.shift ? podaci.niz[Math.floor(podaci.niz.length / 2)]?.datum : null}
            />
          )}
        </>
      )}
    </div>
  );
}

function Prazno({ C, tekst }) {
  return <div style={{ color: C.border, fontSize: 12, textAlign: "center", padding: 40 }}>{tekst}</div>;
}

export function HeatmapTabMerljive({ merenja, C }) {
  return (
    <div style={{ padding: 18, flex: 1, overflow: "auto" }}>
      <HeatmapMerljivePanel
        merenja={merenja}
        C={C}
        naslov="HEAT MAPA NOK MERENJA — PO DANU I SMENI"
      />
    </div>
  );
}
