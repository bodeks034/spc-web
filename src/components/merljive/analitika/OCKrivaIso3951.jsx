import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AQL_NIVOI,
  INSPECTION_LEVELS,
  izracunajOcKrivuIso3951,
  paNaKriviZaP,
  parseMerenjaTxt,
  proracunIso3951,
  procenatNeispravnihUZorku,
  ucitajIso3951Podesavanja,
} from "../../../lib/iso3951Oc.js";
import {
  graniceZaIso3951IzKar,
  pripremiMerenjaZaOc,
} from "../../../lib/iso3951MerenjaIzvor.js";
import {
  fetchMerenjaVarijabilna,
  nadjiKarakteristikuPoPoziciji,
} from "../../../lib/merenjaVarijabilnaQuery.js";
import { planiranoKomIzReda, ucitajNalogZaDeoIRn } from "../../../lib/radniNalog.js";
import { supabase } from "../../../lib/supabaseClient.js";
import { SpcOcKrivaIso3951Graf } from "../../SpcAnalitikaGrafovi.jsx";

const TIP_GRANICE = [
  { id: "gornja", label: "Samo gornja (USL)" },
  { id: "donja", label: "Samo donja (LSL)" },
  { id: "dvostrano", label: "Dvostrano (LSL + USL)" },
];

const IZVORI_MERENJA = [
  { id: "poslednja_serija", label: "Poslednja serija (SPC)" },
  { id: "poslednjih_n", label: "Poslednjih n (plan)" },
  { id: "forma", label: "Trenutni unos u formi" },
];

export default function OCKrivaIso3951({ C, kontekst = null, addToast }) {
  const prefs = ucitajIso3951Podesavanja();
  const [lotSize, setLotSize] = useState(500);
  const [nivo, setNivo] = useState(prefs.nivo || "II");
  const [aql, setAql] = useState(prefs.aql || "1.5");
  const [tipGranice, setTipGranice] = useState(prefs.tipGranice || "gornja");
  const [lsl, setLsl] = useState(prefs.lsl || "");
  const [usl, setUsl] = useState(prefs.usl || "10");
  const [nOverride, setNOverride] = useState("");
  const [merenjaTxt, setMerenjaTxt] = useState("");
  const [merenjaRucno, setMerenjaRucno] = useState(false);
  const [izvorMerenja, setIzvorMerenja] = useState("poslednja_serija");
  const [izvorOpis, setIzvorOpis] = useState("");
  const [ucitavanjeMerenja, setUcitavanjeMerenja] = useState(false);
  const [rawMerenja, setRawMerenja] = useState(() => kontekst?.rawMerenja || []);
  const [pozicijaLokal, setPozicijaLokal] = useState(() => kontekst?.pozicija || "");
  const autoUcitanoRef = useRef(false);

  const idDeo = kontekst?.idDeo || "";
  const pozicija = pozicijaLokal || kontekst?.pozicija || "";
  const kar = useMemo(() => {
    if (kontekst?.kar) return kontekst.kar;
    if (!idDeo || !pozicija || !kontekst?.karakteristike?.length) return null;
    return nadjiKarakteristikuPoPoziciji(kontekst.karakteristike, idDeo, pozicija);
  }, [kontekst?.kar, kontekst?.karakteristike, idDeo, pozicija]);

  const pozicijeDeo = useMemo(() => {
    if (!idDeo || !kontekst?.karakteristike?.length) return [];
    return [...new Set(
      kontekst.karakteristike
        .filter((k) => String(k.id_deo || "").trim().toUpperCase() === String(idDeo).trim().toUpperCase())
        .map((k) => k.pozicija)
        .filter(Boolean),
    )];
  }, [idDeo, kontekst?.karakteristike]);

  const jedinica = kar?.jedinica || kontekst?.jedinica || "mm";
  const imaFormu = !!(kontekst?.kolone?.length);

  useEffect(() => {
    if (kontekst?.pozicija) setPozicijaLokal(kontekst.pozicija);
  }, [kontekst?.pozicija]);

  useEffect(() => {
    if (kontekst?.rawMerenja) setRawMerenja(kontekst.rawMerenja);
  }, [kontekst?.rawMerenja]);

  useEffect(() => {
    if (!kar) return;
    const g = graniceZaIso3951IzKar(kar);
    setTipGranice(g.tipGranice);
    if (g.lsl) setLsl(g.lsl);
    if (g.usl) setUsl(g.usl);
  }, [kar?.id, kar?.lsl, kar?.usl, kar?.pozicija]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!idDeo || !kontekst?.radniNalog) return undefined;
    let alive = true;
    (async () => {
      const nalog = await ucitajNalogZaDeoIRn(supabase, idDeo, kontekst.radniNalog);
      const k = planiranoKomIzReda(nalog);
      if (alive && k > 1) setLotSize(k);
    })();
    return () => { alive = false; };
  }, [idDeo, kontekst?.radniNalog]);

  const osveziRawMerenja = useCallback(async () => {
    if (!idDeo) return [];
    if (kontekst?.rawMerenja) return kontekst.rawMerenja;
    setUcitavanjeMerenja(true);
    try {
      const data = await fetchMerenjaVarijabilna(supabase, {
        idDeo,
        datumOd: kontekst?.datumOd || undefined,
        datumDo: kontekst?.datumDo || undefined,
        smena: kontekst?.smena || undefined,
        pozicija: pozicija || undefined,
      });
      setRawMerenja(data);
      return data;
    } catch (e) {
      addToast?.(e.message || "Greška pri učitavanju merenja", "greska");
      return [];
    } finally {
      setUcitavanjeMerenja(false);
    }
  }, [idDeo, kontekst?.rawMerenja, kontekst?.datumOd, kontekst?.datumDo, kontekst?.smena, pozicija, addToast]);

  const primeniMerenjaIzIzvora = useCallback(async (izvor = izvorMerenja, { force = false } = {}) => {
    if (!force && merenjaRucno) return null;

    let redovi = kontekst?.rawMerenja || rawMerenja;
    if (!kontekst?.rawMerenja && idDeo && izvor !== "forma") {
      redovi = await osveziRawMerenja();
    }

    const rez = pripremiMerenjaZaOc({
      rawRedovi: redovi,
      kolone: kontekst?.kolone,
      pozicija,
      jedinica,
      izvor,
      limitN: odlukaPlanNRef.current || undefined,
      radniNalog: kontekst?.radniNalog,
    });

    if (rez.greska) {
      setIzvorOpis("");
      if (force) addToast?.(rez.greska, "info");
      return rez;
    }

    setMerenjaTxt(rez.tekst);
    setIzvorOpis(rez.opis);
    setMerenjaRucno(false);
    return rez;
  }, [izvorMerenja, merenjaRucno, rawMerenja, kontekst, idDeo, pozicija, jedinica, osveziRawMerenja, addToast]);

  const odlukaPlanNRef = useRef(null);

  const merenja = useMemo(() => parseMerenjaTxt(merenjaTxt), [merenjaTxt]);

  const rezultat = useMemo(() => {
    const lslNum = tipGranice === "gornja"
      ? null
      : (lsl === "" ? (tipGranice === "dvostrano" ? -1 : 0) : Number(String(lsl).replace(",", ".")));
    const uslNum = tipGranice === "donja"
      ? null
      : (usl === "" ? 0 : Number(String(usl).replace(",", ".")));

    return izracunajOcKrivuIso3951({
      lotSize,
      nivo,
      aql,
      n: nOverride ? Number(nOverride) : null,
      tipGranice,
      lsl: lslNum,
      usl: uslNum,
      iteracije: 4500,
    });
  }, [lotSize, nivo, aql, tipGranice, lsl, usl, nOverride]);

  const { plan, tacke, greska } = rezultat;
  odlukaPlanNRef.current = plan?.n;

  const odlukaLot = useMemo(() => proracunIso3951({
    lotSize,
    nivo,
    aql,
    merenja,
    lsl: tipGranice === "gornja" ? "" : lsl,
    usl: tipGranice === "donja" ? "" : usl,
    tipGranice,
  }), [lotSize, nivo, aql, merenja, lsl, usl, tipGranice]);

  useEffect(() => {
    if (autoUcitanoRef.current || merenjaRucno) return;
    const mozeAuto = (idDeo && pozicija) || (imaFormu && izvorMerenja === "forma");
    if (!mozeAuto) return;
    autoUcitanoRef.current = true;
    primeniMerenjaIzIzvora(izvorMerenja);
  }, [idDeo, pozicija, imaFormu, izvorMerenja, merenjaRucno, primeniMerenjaIzIzvora]);

  useEffect(() => {
    if (!kontekst?.rawMerenja || merenjaRucno) return;
    const rez = pripremiMerenjaZaOc({
      rawRedovi: kontekst.rawMerenja,
      pozicija,
      jedinica,
      izvor: izvorMerenja,
      limitN: plan?.n,
      radniNalog: kontekst?.radniNalog,
      kolone: kontekst?.kolone,
    });
    if (!rez.greska && rez.tekst) {
      setMerenjaTxt(rez.tekst);
      setIzvorOpis(rez.opis);
    }
  }, [kontekst?.rawMerenja, pozicija, izvorMerenja, plan?.n, jedinica, kontekst?.radniNalog, kontekst?.kolone, merenjaRucno]);

  const marker = useMemo(() => {
    if (!merenja.length || !tacke?.length) return null;
    const p = procenatNeispravnihUZorku(merenja, {
      tipGranice,
      lsl: tipGranice === "gornja" ? "" : lsl,
      usl: tipGranice === "donja" ? "" : usl,
    });
    if (p == null) return null;
    const pa = paNaKriviZaP(tacke, p);
    const prihvacen = odlukaLot.odluka?.boja === "zelena";
    return { p, pa, prihvacen };
  }, [merenja, tacke, tipGranice, lsl, usl, odlukaLot.odluka?.boja]);

  const odBoja = odlukaLot.odluka.boja === "zelena" ? C.zelena
    : odlukaLot.odluka.boja === "crvena" ? C.crvena : C.sivi;

  const INP_S = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.tekst,
    fontSize: 13,
    padding: "9px 10px",
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  };

  const lbl = { color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 5 };

  const BTN = {
    background: C.plava,
    border: "none",
    borderRadius: 8,
    color: C.onAkcent,
    fontSize: 11,
    fontWeight: 700,
    padding: "8px 12px",
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  };

  const izvoriDostupni = IZVORI_MERENJA.filter((i) => i.id !== "forma" || imaFormu);

  return (
    <div style={{ padding: 18, flex: 1, overflow: "auto" }}>
      <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.5, marginBottom: 8 }}>
        OC KRIVA — ISO 3951-1 (s-metod, Form k)
      </div>
      <div style={{ color: C.sivi, fontSize: 11, marginBottom: 16, lineHeight: 1.5, maxWidth: 720 }}>
        OC kriva pokazuje teorijsku verovatnoću prihvatanja (Pa) za plan uzorka.
        Merenja se mogu učitati iz SPC baze ili forme unosa — odluka lota ide preko Qu/Ql ≥ k.
      </div>

      {(idDeo || pozicijeDeo.length > 0) && (
        <div style={{
          background: `${C.plava}12`,
          border: `1px solid ${C.plava}35`,
          borderRadius: 10,
          padding: "10px 12px",
          marginBottom: 14,
          fontSize: 11,
          color: C.tekst,
          maxWidth: 820,
        }}>
          {idDeo && <span><strong>{idDeo}</strong></span>}
          {pozicija && <span style={{ color: C.sivi }}> · {pozicija}</span>}
          {kontekst?.radniNalog && <span style={{ color: C.sivi }}> · RN {kontekst.radniNalog}</span>}
          {kar && (kar.lsl != null || kar.usl != null) && (
            <span style={{ color: C.sivi }}>
              {" "}· LSL {kar.lsl ?? "—"} / USL {kar.usl ?? "—"} {jedinica}
            </span>
          )}
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 12,
        marginBottom: 16,
        maxWidth: 820,
      }}>
        <div>
          <div style={lbl}>VELIČINA LOTA</div>
          <input type="number" min="2" value={lotSize} onChange={(e) => setLotSize(Number(e.target.value))} style={INP_S} />
        </div>
        <div>
          <div style={lbl}>NIVO INSPEKCIJE</div>
          <select value={nivo} onChange={(e) => setNivo(e.target.value)} style={{ ...INP_S, cursor: "pointer" }}>
            {INSPECTION_LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <div style={lbl}>AQL %</div>
          <select value={aql} onChange={(e) => setAql(e.target.value)} style={{ ...INP_S, cursor: "pointer" }}>
            {AQL_NIVOI.map((a) => <option key={a} value={a}>{a}%</option>)}
          </select>
        </div>
        <div>
          <div style={lbl}>TIP GRANICE</div>
          <select value={tipGranice} onChange={(e) => setTipGranice(e.target.value)} style={{ ...INP_S, cursor: "pointer" }}>
            {TIP_GRANICE.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        {tipGranice !== "gornja" && (
          <div>
            <div style={lbl}>LSL</div>
            <input value={lsl} onChange={(e) => setLsl(e.target.value)} placeholder="9.8" style={INP_S} />
          </div>
        )}
        {tipGranice !== "donja" && (
          <div>
            <div style={lbl}>USL</div>
            <input value={usl} onChange={(e) => setUsl(e.target.value)} placeholder="10.2" style={INP_S} />
          </div>
        )}
        {pozicijeDeo.length > 1 && (
          <div>
            <div style={lbl}>POZICIJA</div>
            <select
              value={pozicija}
              onChange={(e) => {
                setPozicijaLokal(e.target.value);
                autoUcitanoRef.current = false;
              }}
              style={{ ...INP_S, cursor: "pointer" }}
            >
              <option value="">— izaberi —</option>
              {pozicijeDeo.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
        <div>
          <div style={lbl}>n (opciono, samo kriva)</div>
          <input
            type="number"
            min="2"
            value={nOverride}
            onChange={(e) => setNOverride(e.target.value)}
            placeholder={`Plan: ${plan?.n ?? "—"}`}
            style={INP_S}
          />
        </div>
      </div>

      {plan && (
        <div style={{
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 16,
          fontSize: 11,
          color: C.tekst,
          lineHeight: 1.55,
        }}>
          <strong>Plan uzorka:</strong>{" "}
          kod {plan.slovo} · n={plan.n} · k={plan.k?.toFixed(3) ?? "—"} · AQL {plan.aql}% · nivo {plan.nivoLabel || plan.nivo}
          {plan.punUzorak ? " · pun uzorak" : ` · ${plan.pctLota?.toFixed(1)}% lota`}
        </div>
      )}

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "flex-end",
        marginBottom: 10,
        maxWidth: 820,
      }}>
        <div style={{ minWidth: 180, flex: "1 1 180px" }}>
          <div style={lbl}>IZVOR MERENJA</div>
          <select
            value={izvorMerenja}
            onChange={(e) => setIzvorMerenja(e.target.value)}
            style={{ ...INP_S, cursor: "pointer" }}
          >
            {izvoriDostupni.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
          </select>
        </div>
        <button
          type="button"
          disabled={ucitavanjeMerenja}
          onClick={() => primeniMerenjaIzIzvora(izvorMerenja, { force: true })}
          style={{ ...BTN, opacity: ucitavanjeMerenja ? 0.6 : 1 }}
        >
          {ucitavanjeMerenja ? "Učitavam…" : "Učitaj merenja"}
        </button>
        {izvorOpis && (
          <div style={{ color: C.sivi, fontSize: 10, alignSelf: "center" }}>
            Izvor: {izvorOpis}
          </div>
        )}
      </div>

      <label style={{ display: "block", marginBottom: 16, maxWidth: 820 }}>
        <div style={{ ...lbl, marginBottom: 6 }}>
          MERENJA — preporučeno najmanje {odlukaLot.plan?.n ?? plan?.n ?? "—"} vrednosti (uneto: {merenja.length})
        </div>
        <textarea
          value={merenjaTxt}
          onChange={(e) => {
            setMerenjaTxt(e.target.value);
            setMerenjaRucno(true);
          }}
          rows={4}
          placeholder="10,02 10,01 9,99 10,00 10,03 (razmak, zarez ili novi red)"
          style={{ ...INP_S, resize: "vertical", minHeight: 88 }}
        />
      </label>

      {odlukaLot.stat.ok && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
          gap: 10,
          marginBottom: 14,
          maxWidth: 520,
        }}>
          {[
            ["x̄", odlukaLot.stat.mean.toFixed(4)],
            ["s", odlukaLot.stat.s.toFixed(4)],
            ["n uneto", odlukaLot.stat.n],
            ...(marker?.p != null ? [["p̂ (van granica)", `${marker.p}%`]] : []),
          ].map(([lab, val]) => (
            <div key={lab} style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "10px 12px",
              textAlign: "center",
            }}>
              <div style={{ color: C.sivi, fontSize: 9 }}>{lab}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {odlukaLot.upozorenje && (
        <div style={{ color: C.narandzasta, fontSize: 11, marginBottom: 10 }}>⚠ {odlukaLot.upozorenje}</div>
      )}

      {merenja.length > 0 && (
        <div style={{
          background: `${odBoja}15`,
          border: `2px solid ${odBoja}`,
          borderRadius: 12,
          padding: "16px 14px",
          textAlign: "center",
          marginBottom: 16,
          maxWidth: 820,
        }}>
          <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.4, marginBottom: 6 }}>ODLUKA LOTA</div>
          <div style={{ color: odBoja, fontSize: 22, fontWeight: 700 }}>{odlukaLot.odluka.tekst}</div>
          <div style={{ color: C.sivi, fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>{odlukaLot.odluka.razlog}</div>
          {(odlukaLot.odluka.qu != null || odlukaLot.odluka.ql != null) && (
            <div style={{ color: C.sivi, fontSize: 11, marginTop: 6 }}>
              {odlukaLot.odluka.qu != null && Number.isFinite(odlukaLot.odluka.qu)
                ? `Qu=${odlukaLot.odluka.qu.toFixed(3)}` : ""}
              {odlukaLot.odluka.ql != null && Number.isFinite(odlukaLot.odluka.ql)
                ? `${odlukaLot.odluka.qu != null ? " · " : ""}Ql=${odlukaLot.odluka.ql.toFixed(3)}` : ""}
              {odlukaLot.plan.k != null ? ` · k=${odlukaLot.plan.k.toFixed(3)}` : ""}
            </div>
          )}
          {marker?.p != null && marker.pa != null && (
            <div style={{ color: C.sivi, fontSize: 10, marginTop: 8 }}>
              Na OC krivi: pri p̂={marker.p}% teorijski Pa≈{marker.pa}%
            </div>
          )}
        </div>
      )}

      {greska ? (
        <div style={{ color: C.crvena, fontSize: 12 }}>{greska}</div>
      ) : (
        <>
          <SpcOcKrivaIso3951Graf
            data={tacke}
            C={C}
            aql={plan?.aql}
            n={plan?.n}
            k={plan?.k}
            height={360}
            marker={marker}
          />
          <div style={{
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 14,
            marginTop: 14,
          }}>
            <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 10 }}>KLJUČNE TAČKE</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
              {tacke.filter((_, i) => [0, 2, 4, 6, 8, 10].includes(i)).map((d) => (
                <div key={d.p} style={{ background: C.bg, borderRadius: 7, padding: "8px 12px", fontSize: 11 }}>
                  <span style={{ color: C.sivi }}>p={d.p}% → </span>
                  <span style={{ color: (d.pa ?? 0) > 50 ? C.zelena : C.crvena, fontWeight: 700 }}>
                    Pa={d.pa ?? "—"}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
