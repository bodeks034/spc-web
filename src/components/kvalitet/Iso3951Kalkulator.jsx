import { useState, useCallback, useMemo } from "react";
import {
  INSPECTION_LEVELS,
  AQL_NIVOI,
  planIso3951,
  proracunIso3951,
  parseMerenjaTxt,
  ucitajIso3951Podesavanja,
  snimiIso3951Podesavanja,
} from "../../lib/iso3951.js";
import {
  snapshotIso3951,
  preuzmiIso3951Pdf,
  stampajIso3951,
} from "../../lib/isoKalkulatorPdf.js";

const TIP_GRANICE = [
  { id: "dvostrano", label: "Dvostrano (LSL + USL)" },
  { id: "gornja", label: "Samo gornja (USL)" },
  { id: "donja", label: "Samo donja (LSL)" },
];

const UPUTSTVO_KORACI = [
  {
    n: 1,
    naslov: "Pripremi lot",
    tekst: "Unesi veličinu serije (lot) — broj komada u isporuci ili na RN. Nivo inspekcije je obično II (normalan). AQL bira kupac/plan kvaliteta (npr. 1,5%).",
  },
  {
    n: 2,
    naslov: "Pročitaj plan uzorka",
    tekst: "Aplikacija izračunava kod slova (Table I), broj merenja n i konstantu k. Izmeri tačno n komada (ili više — minimum je n).",
  },
  {
    n: 3,
    naslov: "Unesi granice",
    tekst: "LSL i USL sa crteža / karakteristike. Za samo gornju granicu izaberi tip „Samo gornja (USL)“; za samo donju — „Samo donja“.",
  },
  {
    n: 4,
    naslov: "Unesi merenja",
    tekst: "Vrednosti odvoji razmakom, zarezom ili novim redom (npr. 10,02 10,01 9,99). Minimum 2 merenja za x̄ i s; preporučeno punih n iz plana.",
  },
  {
    n: 5,
    naslov: "Odluka",
    tekst: "PRIHVATI LOT ako je Qu ≥ k (gornja) i/ili Ql ≥ k (donja). ODBACI ako bilo koji Q padne ispod k. Žuto upozorenje ako ima manje od n merenja.",
  },
];

const UPUTSTVO_NAPOMENE = [
  "Koristi za dimenzije (mm, Nm…). Za broj NOK defekata koristi ISO 2859 u atributivnom modulu.",
  "Pretpostavlja normalnu raspodelu i stabilan proces (SPC pod kontrolom).",
  "Nominala je informativna — odluka ide samo preko LSL/USL i merenja.",
];

function UputstvoPanel({ C, otvoreno, onToggle }) {
  return (
    <div style={{
      marginBottom: 16,
      background: `${C.plava}10`,
      border: `1px solid ${C.plava}40`,
      borderRadius: 10,
      overflow: "hidden",
    }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          padding: "12px 14px",
          background: "transparent",
          border: "none",
          color: C.plava,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <span>📖 Uputstvo — kako koristiti ISO 3951 kalkulator</span>
        <span style={{ color: C.sivi, fontSize: 10 }}>{otvoreno ? "Sakrij ▲" : "Prikaži ▼"}</span>
      </button>
      {otvoreno && (
        <div style={{ padding: "0 14px 14px", fontSize: 12, color: C.tekst, lineHeight: 1.65 }}>
          <p style={{ margin: "0 0 12px", color: C.sivi }}>
            Merljive karakteristike — uzorkovanje po varijablama (s-metod, Form&nbsp;k).
            Putanja: <strong>Merljive → Analitika → Kvalitet → ISO 3951</strong>.
          </p>
          <ol style={{ margin: "0 0 12px", paddingLeft: 20 }}>
            {UPUTSTVO_KORACI.map((k) => (
              <li key={k.n} style={{ marginBottom: 10 }}>
                <strong>{k.naslov}</strong>
                <div style={{ color: C.sivi, marginTop: 2 }}>{k.tekst}</div>
              </li>
            ))}
          </ol>
          <div style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 10,
          }}>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 11 }}>Primer</div>
            <div style={{ color: C.sivi, fontSize: 11, lineHeight: 1.6 }}>
              Lot 100 · nivo II · AQL 1,5% → kod F, n=15, k≈1,46.<br />
              (Za lot 500 → kod H, n=35 — veći lot = veći uzorak.)<br />
              LSL 9,8 · USL 10,2 · npr. 10,02 10,01 9,99 10,00 … (ne sve iste).<br />
              Ako su Qu i Ql ≥ k → <span style={{ color: C.zelena }}>PRIHVATI LOT</span>.
            </div>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, color: C.sivi, fontSize: 11 }}>
            {UPUTSTVO_NAPOMENE.map((n) => (
              <li key={n} style={{ marginBottom: 4 }}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Iso3951Kalkulator({ C, pocetnaGranice = null }) {
  const [prefs, setPrefs] = useState(() => ({
    ...ucitajIso3951Podesavanja(),
    ...(pocetnaGranice || {}),
  }));
  const [lot, setLot] = useState(5000);
  const [merenjaTxt, setMerenjaTxt] = useState("");
  const [uputstvoOtvoreno, setUputstvoOtvoreno] = useState(true);
  const [pdfRadi, setPdfRadi] = useState(false);

  const azuriraj = useCallback((patch) => {
    setPrefs((prev) => snimiIso3951Podesavanja({ ...prev, ...patch }));
  }, []);

  const merenja = useMemo(() => parseMerenjaTxt(merenjaTxt), [merenjaTxt]);

  const rez = useMemo(() => proracunIso3951({
    lotSize: lot,
    nivo: prefs.nivo,
    aql: prefs.aql,
    merenja,
    lsl: prefs.lsl,
    usl: prefs.usl,
    tipGranice: prefs.tipGranice,
  }), [lot, prefs, merenja]);

  const odBoja = rez.odluka.boja === "zelena" ? C.zelena
    : rez.odluka.boja === "crvena" ? C.crvena : C.sivi;

  const INP = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.tekst,
    fontSize: 13,
    padding: "10px 12px",
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  };

  const pdfSnapshot = () => snapshotIso3951({
    lot,
    prefs,
    plan: rez.plan,
    stat: rez.stat,
    merenja,
    odluka: rez.odluka,
    upozorenje: rez.upozorenje,
  });

  const exportPDF = async () => {
    setPdfRadi(true);
    try {
      await preuzmiIso3951Pdf(pdfSnapshot());
    } finally {
      setPdfRadi(false);
    }
  };

  const stampaj = () => stampajIso3951(pdfSnapshot());

  const BTN_EXPORT = {
    background: "#7c3aed",
    border: "none",
    borderRadius: 8,
    color: C.onAkcent,
    fontSize: 12,
    fontWeight: 700,
    padding: "10px 14px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div
      data-testid="iso3951-kalkulator"
      style={{
        padding: "18px 18px 32px",
        maxWidth: 860,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.5, marginBottom: 8 }}>
        ISO 3951-1 / ANSI Z1.9 — VARIJABLE
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={exportPDF} disabled={pdfRadi} style={BTN_EXPORT}>
          {pdfRadi ? "…" : "📄 PDF"}
        </button>
        <button type="button" onClick={stampaj} style={{ ...BTN_EXPORT, background: C.zelena }}>
          🖨 Štampaj
        </button>
      </div>

      <UputstvoPanel
        C={C}
        otvoreno={uputstvoOtvoreno}
        onToggle={() => setUputstvoOtvoreno((v) => !v)}
      />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
        gap: 12,
        marginBottom: 16,
      }}>
        <label>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 6 }}>VELIČINA LOTA</div>
          <input type="number" min={2} value={lot} onChange={(e) => setLot(Number(e.target.value) || 2)} style={INP} />
        </label>
        <label>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 6 }}>NIVO INSPEKCIJE</div>
          <select value={prefs.nivo} onChange={(e) => azuriraj({ nivo: e.target.value })} style={{ ...INP, cursor: "pointer" }}>
            {INSPECTION_LEVELS.filter((l) => l.grupa === "general").map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </label>
        <label>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 6 }}>AQL %</div>
          <select value={prefs.aql} onChange={(e) => azuriraj({ aql: e.target.value })} style={{ ...INP, cursor: "pointer" }}>
            {AQL_NIVOI.map((a) => <option key={a} value={a}>{a}%</option>)}
          </select>
        </label>
        <label>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 6 }}>TIP GRANICE</div>
          <select value={prefs.tipGranice} onChange={(e) => azuriraj({ tipGranice: e.target.value })} style={{ ...INP, cursor: "pointer" }}>
            {TIP_GRANICE.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(72px,1fr))",
        gap: 10,
        marginBottom: 18,
      }}>
        {[
          ["KOD", rez.plan.slovo, C.plava],
          ["n (plan)", rez.plan.n, C.zelena],
          ["k", rez.plan.k != null ? rez.plan.k.toFixed(3) : "—", C.ljubicasta],
          ["% lota", `${rez.plan.pctLota.toFixed(2)}%`, C.narandzasta],
        ].map(([lbl, val, boja]) => (
          <div key={lbl} style={{
            background: C.panel,
            border: `1px solid ${boja}35`,
            borderRadius: 10,
            padding: "12px 8px",
            textAlign: "center",
          }}>
            <div style={{ color: C.sivi, fontSize: 8, letterSpacing: 1 }}>{lbl}</div>
            <div style={{ color: boja, fontSize: 22, fontWeight: 700, marginTop: 4 }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
        gap: 12,
        marginBottom: 16,
      }}>
        <label>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 6 }}>LSL</div>
          <input value={prefs.lsl} onChange={(e) => azuriraj({ lsl: e.target.value })} style={INP} placeholder="donja" />
        </label>
        <label>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 6 }}>NOMINALA</div>
          <input value={prefs.nominala} onChange={(e) => azuriraj({ nominala: e.target.value })} style={INP} placeholder="opciono" />
        </label>
        <label>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 6 }}>USL</div>
          <input value={prefs.usl} onChange={(e) => azuriraj({ usl: e.target.value })} style={INP} placeholder="gornja" />
        </label>
      </div>

      <label style={{ display: "block", marginBottom: 16 }}>
        <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2, marginBottom: 6 }}>
          MERENJA — najmanje {rez.plan.n} vrednosti preporučeno (trenutno uneto: {merenja.length})
        </div>
        <textarea
          value={merenjaTxt}
          onChange={(e) => setMerenjaTxt(e.target.value)}
          rows={5}
          placeholder="10,02 10,01 9,99 10,00 10,03 (zarez = decimala)"
          style={{ ...INP, resize: "vertical", minHeight: 100 }}
        />
      </label>

      {rez.stat.ok && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(100px,1fr))",
          gap: 10,
          marginBottom: 16,
        }}>
          {[
            ["x̄", rez.stat.mean.toFixed(4)],
            ["s", rez.stat.s.toFixed(4)],
            ["n uneto", rez.stat.n],
          ].map(([lbl, val]) => (
            <div key={lbl} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, textAlign: "center" }}>
              <div style={{ color: C.sivi, fontSize: 9 }}>{lbl}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {rez.upozorenje && (
        <div style={{ color: C.narandzasta, fontSize: 11, marginBottom: 10 }}>⚠ {rez.upozorenje}</div>
      )}

      <div style={{
        background: `${odBoja}15`,
        border: `2px solid ${odBoja}`,
        borderRadius: 12,
        padding: "18px 16px",
        textAlign: "center",
        marginBottom: 18,
      }}>
        <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.4, marginBottom: 6 }}>ODLUKA LOTA</div>
        <div style={{ color: odBoja, fontSize: 24, fontWeight: 700 }}>{rez.odluka.tekst}</div>
        <div style={{ color: C.sivi, fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>{rez.odluka.razlog}</div>
        {(rez.odluka.qu != null || rez.odluka.ql != null) && (
          <div style={{ color: C.sivi, fontSize: 11, marginTop: 6 }}>
            {rez.odluka.qu != null && Number.isFinite(rez.odluka.qu) ? `Qu=${rez.odluka.qu.toFixed(3)}` : ""}
            {rez.odluka.ql != null && Number.isFinite(rez.odluka.ql) ? `${rez.odluka.qu != null ? " · " : ""}Ql=${rez.odluka.ql.toFixed(3)}` : ""}
            {rez.plan.k != null ? ` · k=${rez.plan.k.toFixed(3)}` : ""}
          </div>
        )}
      </div>

      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, fontSize: 12, color: C.sivi, lineHeight: 1.75 }}>
        <strong style={{ color: C.tekst }}>Formula (s-metod)</strong><br />
        Qu = (USL − x̄) / s &nbsp;·&nbsp; Ql = (x̄ − LSL) / s<br />
        Prihvati ako je svaki aktivni Q ≥ k.
      </div>
    </div>
  );
}
