import { useState, useCallback, useMemo } from "react";
import {
  INSPECTION_LEVELS, INSPECTION_TYPES, DEFECT_KLASE, planUzorka, planZaKlasu, aqlOdluka, kombinovanaOdluka,
  DEFAULT_AQL_LOT_SIZE, ucitajAqlLotVelicina, snimiAqlLotVelicina,
  ucitajAqlPodesavanja, snimiAqlPodesavanja,
} from "../../lib/aqlIso2859.js";

export default function AQLTabela({ C }) {
  const [velicina, setVelicina] = useState(() => ucitajAqlLotVelicina());
  const promeniVelicinu = (n) => setVelicina(snimiAqlLotVelicina(n));
  const [podesavanja, setPodesavanja] = useState(() => ucitajAqlPodesavanja());
  const { nivo, tipInspekcije, aqlPoKlasi } = podesavanja;

  const azurirajPodesavanja = useCallback((patch) => {
    setPodesavanja((prev) => snimiAqlPodesavanja({ ...prev, ...patch }));
  }, []);
  const [nokPoKlasi, setNokPoKlasi] = useState(() =>
    Object.fromEntries(DEFECT_KLASE.map(k => [k.id, 0]))
  );

  const uzorak = planUzorka(velicina, nivo);
  const { slovo } = uzorak;

  const planovi = useMemo(() =>
    DEFECT_KLASE.map(k => {
      const plan = planZaKlasu(velicina, nivo, aqlPoKlasi[k.id], tipInspekcije);
      const nok = nokPoKlasi[k.id];
      return {
        ...k,
        plan,
        nok,
        odluka: aqlOdluka(nok, plan.ac, plan.re, plan.fullInspection, tipInspekcije === "Smanjena"),
      };
    }),
  [velicina, nivo, tipInspekcije, aqlPoKlasi, nokPoKlasi]);

  const refN = Math.max(...planovi.map(p => p.plan.n || 0), uzorak.n);

  const odlukeMap = Object.fromEntries(planovi.map(p => [p.id, p.odluka]));
  const konacna = kombinovanaOdluka(odlukeMap);
  const bojaKonacna = konacna.boja === "zelena" ? C.zelena : konacna.boja === "crvena" ? C.crvena : konacna.boja === "zuta" ? C.zuta : C.sivi;

  const bojaKlase = { critical: C.crvena, major: C.narandzasta, minor: C.plava };

  const INP_S = { background:C.input, border:`1px solid ${C.border}`, borderRadius:8,
    color:C.tekst, fontSize:13, padding:"10px 12px", outline:"none", fontFamily:"inherit",
    width:"100%", boxSizing:"border-box" };

  const setNok = (id, v, maxN) => setNokPoKlasi(p => ({ ...p, [id]: Math.max(0, Math.min(maxN, v)) }));
  const setAql = (id, v) => azurirajPodesavanja({
    aqlPoKlasi: { ...aqlPoKlasi, [id]: v },
  });

  return (
    <div style={{ padding:18, maxWidth:820, margin:"0 auto" }}>
      <div style={{ color:C.sivi, fontSize:10, letterSpacing:1.5, marginBottom:8 }}>
        AQL KALKULATOR — ANSI/ASQ Z1.4
      </div>
      <div style={{ color:C.tekst, fontSize:13, marginBottom:14, lineHeight:1.65 }}>
        Isti kalkulator kao Excel workbook AQL_Kalkulator.xlsm — Table I, II-A/II-B, strelice, Critical AQL&nbsp;0 = 100% inspekcija.
      </div>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
        marginBottom: 16,
        padding: "12px 14px",
        background: `${C.plava}12`,
        border: `1px solid ${C.plava}35`,
        borderRadius: 10,
      }}>
        <div style={{ flex: 1, minWidth: 200, fontSize: 11, color: C.sivi, lineHeight: 1.5 }}>
          <strong style={{ color: C.tekst }}>Ručni proračun</strong> — nezavisno od ID dela i RN.
          Na unosu lot dolazi iz naloga; ovde lot i NOK unosite sami za „what-if“ analizu.
        </div>
        <button
          type="button"
          onClick={() => {
            promeniVelicinu(DEFAULT_AQL_LOT_SIZE);
            setNokPoKlasi(Object.fromEntries(DEFECT_KLASE.map((k) => [k.id, 0])));
          }}
          style={{
            background: C.plava,
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            padding: "10px 16px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          🧮 Novi ručni proračun
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:20 }}>
        <div>
          <div style={{ color:C.sivi, fontSize:9, letterSpacing:1.5, marginBottom:6 }}>VELIČINA LOTA</div>
          <input type="number" value={velicina} min={2}
            onChange={e => promeniVelicinu(e.target.value)} style={INP_S}/>
        </div>
        <div>
          <div style={{ color:C.sivi, fontSize:9, letterSpacing:1.5, marginBottom:6 }}>NIVO INSPEKCIJE</div>
          <select value={nivo} onChange={e => azurirajPodesavanja({ nivo: e.target.value })} style={{ ...INP_S, cursor:"pointer" }}>
            <optgroup label="Opšti nivoi">
              {INSPECTION_LEVELS.filter(l => l.grupa === "general").map(l =>
                <option key={l.id} value={l.id}>{l.label}</option>)}
            </optgroup>
            <optgroup label="Specijalni nivoi">
              {INSPECTION_LEVELS.filter(l => l.grupa === "special").map(l =>
                <option key={l.id} value={l.id}>{l.label}</option>)}
            </optgroup>
          </select>
        </div>
        <div>
          <div style={{ color:C.sivi, fontSize:9, letterSpacing:1.5, marginBottom:6 }}>TIP INSPEKCIJE</div>
          <select value={tipInspekcije} onChange={e => azurirajPodesavanja({ tipInspekcije: e.target.value })}
            style={{ ...INP_S, cursor:"pointer" }}>
            {INSPECTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:22 }}>
        {[
          ["KOD (Table I)", slovo, C.plava],
          ["REF. n", refN, C.zelena],
          ["NIVO", uzorak.nivoGrupa === "special" ? "Specijalan" : "Opšti", C.ljubicasta],
        ].map(([lbl, val, boja]) => (
          <div key={lbl} style={{ background:C.panel, border:`1px solid ${boja}35`, borderRadius:10,
            padding:"14px 10px", textAlign:"center" }}>
            <div style={{ color:C.sivi, fontSize:8, letterSpacing:1.2, marginBottom:5 }}>{lbl}</div>
            <div style={{ color:boja, fontSize:24, fontWeight:700 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Critical / Major / Minor */}
      <div style={{ color:C.sivi, fontSize:10, letterSpacing:1.3, marginBottom:10 }}>
        KLASE DEFEKATA — različiti AQL; n može varirati (Table II strelice)
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12, marginBottom:20 }}>
        {planovi.map(p => {
          const boja = bojaKlase[p.id];
          const od = p.odluka;
          const odBoja = od.boja === "zelena" ? C.zelena : od.boja === "crvena" ? C.crvena : od.boja === "zuta" ? C.zuta : C.sivi;
          const maxN = p.plan.n || refN;
          const acDisp = p.plan.fullInspection ? "100%" : (p.plan.ac >= 0 ? p.plan.ac : "N/A");
          const reDisp = p.plan.fullInspection ? "100%" : (p.plan.re >= 0 ? p.plan.re : "N/A");
          return (
            <div key={p.id} style={{ background:C.panel, border:`1px solid ${boja}40`, borderRadius:12, padding:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start",
                flexWrap:"wrap", gap:10, marginBottom:12 }}>
                <div>
                  <div style={{ color:boja, fontSize:15, fontWeight:700 }}>{p.naziv}</div>
                  <div style={{ color:C.sivi, fontSize:11, marginTop:3 }}>{p.opis}</div>
                  {p.plan.fullInspection && (
                    <div style={{ color:C.crvena, fontSize:11, marginTop:4, fontWeight:600 }}>
                      100% inspekcija — nijedan defekt nije dozvoljen
                    </div>
                  )}
                  {p.plan.msg && !p.plan.fullInspection && (
                    <div style={{ color:C.ljubicasta, fontSize:10, marginTop:4 }}>Strelica: {p.plan.msg}</div>
                  )}
                  {od.napomena && (
                    <div style={{ color:C.narandzasta, fontSize:10, marginTop:4 }}>{od.napomena}</div>
                  )}
                </div>
                <div style={{ background:`${odBoja}20`, border:`1px solid ${odBoja}`, borderRadius:8,
                  padding:"6px 14px", color:odBoja, fontSize:12, fontWeight:700 }}>
                  {od.tekst}
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(100px,1fr))", gap:10 }}>
                <div>
                  <div style={{ color:C.sivi, fontSize:9, marginBottom:4 }}>AQL %</div>
                  <select value={aqlPoKlasi[p.id]} onChange={e => setAql(p.id, e.target.value)}
                    style={{ ...INP_S, cursor:"pointer", fontSize:12 }}>
                    {p.aqlOpcije.map(a => <option key={a} value={a}>{a === "0" ? "0 (100%)" : `${a}%`}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ color:C.sivi, fontSize:9, marginBottom:4 }}>Kod / n</div>
                  <div style={{ fontSize:14, fontWeight:700, padding:"10px 0" }}>
                    <span style={{ color:C.plava }}>{p.plan.slovo}</span>
                    <span style={{ color:C.sivi, margin:"0 4px" }}>·</span>
                    <span style={{ color:C.zelena }}>{maxN}</span>
                    {velicina > 0 && maxN > 0 && (
                      <span style={{ color:C.sivi, fontSize:10, marginLeft:4 }}>
                        ({((maxN / velicina) * 100).toFixed(2)}%)
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ color:C.sivi, fontSize:9, marginBottom:4 }}>Ac ≤ / Re ≥</div>
                  <div style={{ fontSize:16, fontWeight:700, padding:"10px 0" }}>
                    <span style={{ color:C.zelena }}>{acDisp}</span>
                    <span style={{ color:C.sivi, margin:"0 6px" }}>/</span>
                    <span style={{ color:C.crvena }}>{reDisp}</span>
                  </div>
                </div>
                <div>
                  <div style={{ color:C.sivi, fontSize:9, marginBottom:4 }}>Pronađeno NOK</div>
                  <div style={{ display:"flex", alignItems:"stretch", border:`1px solid ${C.border}`,
                    borderRadius:8, overflow:"hidden", maxWidth:140 }}>
                    <button type="button" onClick={() => setNok(p.id, p.nok - 1, maxN)}
                      style={{ background:C.hover, border:"none", color:C.tekst, fontSize:18,
                        padding:"6px 12px", cursor:"pointer" }}>−</button>
                    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:18, fontWeight:700, background:C.input }}>{p.nok}</div>
                    <button type="button" onClick={() => setNok(p.id, p.nok + 1, maxN)}
                      style={{ background:C.hover, border:"none", color:C.tekst, fontSize:18,
                        padding:"6px 12px", cursor:"pointer" }}>+</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Konačna odluka lota */}
      <div style={{ background:`${bojaKonacna}15`, border:`2px solid ${bojaKonacna}`,
        borderRadius:12, padding:"20px 18px", textAlign:"center", marginBottom:20 }}>
        <div style={{ color:C.sivi, fontSize:10, letterSpacing:1.5, marginBottom:8 }}>KONAČNA ODLUKA LOTA</div>
        <div style={{ color:bojaKonacna, fontSize:26, fontWeight:700, letterSpacing:1 }}>{konacna.tekst}</div>
        <div style={{ color:C.sivi, fontSize:12, marginTop:8, lineHeight:1.5 }}>{konacna.razlog}</div>
        <div style={{ color:C.sivi, fontSize:11, marginTop:10 }}>
          Ukupno NOK: {Object.values(nokPoKlasi).reduce((a, b) => a + b, 0)} · Tip: {tipInspekcije}
        </div>
      </div>

      <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:16, marginBottom:16 }}>
        <div style={{ color:C.tekst, fontSize:12, fontWeight:700, marginBottom:8 }}>PRAVILO (Excel VBA)</div>
        <div style={{ color:C.sivi, fontSize:12, lineHeight:1.85 }}>
          1. Kod slovo iz Table I: <strong style={{ color:C.plava }}>{slovo}</strong> ({uzorak.nivoLabel}).<br/>
          2. Ac/Re iz Table II-A / II-B / II-C (Normalna / Pojačana / Smanjena), sa strelicama ↑↓.<br/>
          3. Smanjena: manji uzorak (n iz II-C, npr. kod L → n=80 umesto 200).<br/>
          4. Critical AQL&nbsp;0 → 100% inspekcija, 0 defekata dozvoljeno.<br/>
          5. Smanjena †: Ac &lt; NOK &lt; Re → prihvati lot, sledeći lot Normalna.<br/>
          6. <span style={{ color:C.zelena }}>PRIHVATI</span> ako NOK ≤ Ac; inače <span style={{ color:C.crvena }}>ODBACI</span>.
        </div>
      </div>

      <div style={{ color:C.sivi, fontSize:10, letterSpacing:1.2, marginBottom:10 }}>
        PREGLED · LOT {velicina.toLocaleString()}
      </div>
      <div style={{ border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"80px 70px 50px 50px 50px 50px 50px",
          background:C.hover, padding:"9px 14px", fontSize:9, color:C.sivi, gap:8 }}>
          <span>Klasa</span><span>AQL</span><span>Kod</span><span>n</span><span>Ac</span><span>Re</span><span>NOK</span>
        </div>
        {planovi.map(p => (
          <div key={p.id} style={{ display:"grid", gridTemplateColumns:"80px 70px 50px 50px 50px 50px 50px",
            padding:"10px 14px", borderTop:`1px solid ${C.border}`, fontSize:12, gap:8, alignItems:"center" }}>
            <span style={{ color:bojaKlase[p.id], fontWeight:700 }}>{p.naziv}</span>
            <span style={{ color:C.tekst }}>{aqlPoKlasi[p.id]}{aqlPoKlasi[p.id] !== "0" ? "%" : ""}</span>
            <span style={{ color:C.plava }}>{p.plan.slovo}</span>
            <span style={{ color:C.zelena }}>{p.plan.n}</span>
            <span style={{ color:C.zelena, fontWeight:700 }}>
              {p.plan.fullInspection ? "100%" : (p.plan.ac >= 0 ? p.plan.ac : "—")}
            </span>
            <span style={{ color:C.crvena, fontWeight:700 }}>
              {p.plan.fullInspection ? "100%" : (p.plan.re >= 0 ? p.plan.re : "—")}
            </span>
            <span style={{ color:C.tekst }}>{p.nok}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
