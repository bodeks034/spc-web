import { useState, useEffect, useMemo, useCallback } from "react";
import {
  INSPECTION_LEVELS, INSPECTION_TYPES, DEFECT_KLASE, planUzorka, planZaKlasu, aqlOdluka, kombinovanaOdluka,
  DEFAULT_AQL_LOT_SIZE, ucitajAqlPodesavanja, snimiAqlPodesavanja,
} from "../../lib/aqlIso2859.js";
import {
  pendingFromLista, mergeSmenaStat, fetchAktuelniCilj, fetchDeoStatDanas, nokPoAqlKlasi,
} from "../../lib/spcStats.js";
import { LAB_FPY_CILJ, LAB_FPY_KRATKO } from "../../lib/rtyFpy.js";
import { fetchKpiUnos, agregirajKpiUnos } from "../../lib/kpiUnos.js";
import { dISO } from "../../lib/atributivneUnosHelper.js";
import { supabase } from "../../lib/supabaseClient.js";

function UnosCiljBanner({ idDeo, listaP, C }) {
  const [cilj, setCilj] = useState(null);
  const [ost, setOst] = useState(null);
  const [kpiDanas, setKpiDanas] = useState(null);

  useEffect(() => {
    if (!idDeo || idDeo.length < 3) { setCilj(null); setOst(null); setKpiDanas(null); return; }
    const danas = dISO();
    (async () => {
      const [c, s, kpiRows] = await Promise.all([
        fetchAktuelniCilj(supabase, idDeo.toUpperCase()),
        fetchDeoStatDanas(supabase, idDeo.toUpperCase(), danas),
        fetchKpiUnos(supabase, {
          modul: "atributivne",
          idDeo: idDeo.toUpperCase(),
          datumOd: danas,
          datumDo: danas,
          limit: 50,
        }).catch(() => []),
      ]);
      setCilj(c);
      setOst(s);
      setKpiDanas(agregirajKpiUnos(kpiRows, { modul: "atributivne" }));
    })();
  }, [idDeo, listaP.length]);

  if (!cilj || !ost) return null;
  const pend = pendingFromLista(listaP);
  const kpi = kpiDanas?.ukupno_kom > 0 ? kpiDanas : null;
  const kval = mergeSmenaStat(ost, pend, kpi);
  const n = kval.merenja;
  if (n < 3) return null;
  const rty = kval.rty;
  const dpmo = kval.dpmo;
  const rtyLo = cilj.rty_cilj != null && rty < Number(cilj.rty_cilj);
  const dpmoHi = cilj.dpmo_cilj != null && dpmo > Number(cilj.dpmo_cilj);
  if (!rtyLo && !dpmoHi) return null;

  return (
    <div style={{ background: C.nok, border: `1px solid ${C.crvena}50`, borderRadius: 8,
      padding: "10px 12px", marginBottom: 8, fontSize: 10, lineHeight: 1.55 }}>
      <div style={{ color: C.crvena, fontWeight: 700, marginBottom: 4 }}>⚠ Van cilja kvaliteta (danas)</div>
      <div style={{ color: C.tekst }}>
        Cilj: {LAB_FPY_CILJ} ≥ {cilj.rty_cilj}% · DPMO ≤ {Number(cilj.dpmo_cilj).toLocaleString()}
      </div>
      <div style={{ color: C.sivi, marginTop: 3 }}>
        Stvarno: {LAB_FPY_KRATKO} {rty}% {rtyLo && <span style={{ color: C.crvena }}>↓</span>}
        {" · "}DPMO {dpmo.toLocaleString()} {dpmoHi && <span style={{ color: C.crvena }}>↑</span>}
      </div>
    </div>
  );
}

function UnosAqlPanel({
  lotVelicina,
  onLotVelicinaChange,
  listaG,
  listaP,
  C,
  kompakt = false,
  uskiPanel = false,
  lotIzvor = "rucno",
  radniNalog = "",
  idDeo = "",
  onOtvoriAqlTab,
}) {
  const [podesavanja, setPodesavanja] = useState(() => ucitajAqlPodesavanja());
  const { nivo, tipInspekcije, aqlPoKlasi } = podesavanja;

  useEffect(() => {
    setPodesavanja(ucitajAqlPodesavanja());
  }, [idDeo, radniNalog]);

  const azurirajPodesavanja = useCallback((patch) => {
    setPodesavanja((prev) => snimiAqlPodesavanja({ ...prev, ...patch }));
  }, []);

  const stavke = useMemo(() => [...(listaG || []), ...(listaP || [])], [listaG, listaP]);
  const nokKlase = useMemo(() => nokPoAqlKlasi(stavke), [stavke]);
  const velicina = Math.max(2, lotVelicina || DEFAULT_AQL_LOT_SIZE);
  const lotIzRn = lotIzvor === "rn";
  const lotLabel = lotIzvor === "prekontrola"
    ? `prekontrola ${idDeo || "—"}`
    : lotIzRn
      ? `RN ${radniNalog || "—"}`
      : lotIzvor === "plan"
        ? "planirano"
        : lotIzvor === "deo"
          ? `deo ${idDeo || "—"}`
          : "ručno";
  const lotReadonly = lotIzRn || lotIzvor === "plan" || lotIzvor === "deo" || lotIzvor === "prekontrola";

  const inpAql = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: uskiPanel ? 4 : 5,
    color: C.tekst,
    fontSize: uskiPanel ? 9 : 10,
    padding: uskiPanel ? "3px 4px" : "4px 6px",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  };

  const planovi = useMemo(() =>
    DEFECT_KLASE.map(k => {
      const aql = aqlPoKlasi[k.id] ?? k.defaultAql;
      const plan = planZaKlasu(velicina, nivo, aql, tipInspekcije);
      const nok = nokKlase[k.id] || 0;
      return { ...k, aql, plan, nok, odluka: aqlOdluka(nok, plan.ac, plan.re, plan.fullInspection, tipInspekcije === "Smanjena") };
    }), [velicina, nivo, tipInspekcije, aqlPoKlasi, nokKlase]);

  const konacna = kombinovanaOdluka(Object.fromEntries(planovi.map(p => [p.id, p.odluka])));
  const boja = konacna.boja === "zelena" ? C.zelena : konacna.boja === "crvena" ? C.crvena
    : konacna.boja === "zuta" ? C.zuta : C.sivi;
  const uzorak = planUzorka(velicina, nivo);
  const ukNok = Object.values(nokKlase).reduce((a, b) => a + b, 0);

  const pad = uskiPanel ? 6 : kompakt ? 10 : 10;
  const fsLab = uskiPanel ? 7 : kompakt ? 8 : 9;
  const fsVal = uskiPanel ? 9 : kompakt ? 10 : 11;
  const gridGap = uskiPanel ? 3 : kompakt ? 6 : 8;
  const omotAql = {
    marginLeft: uskiPanel ? -8 : 0,
    width: uskiPanel ? "calc(100% + 8px)" : "100%",
    boxSizing: "border-box",
  };

  const lotPolje = lotReadonly ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ color: C.sivi, fontSize: 8, letterSpacing: 0.8 }}>LOT</span>
      <div style={{
        ...inpAql,
        background: C.panel,
        color: C.tekst,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        minHeight: 24,
      }}>
        {velicina.toLocaleString()}
      </div>
    </div>
  ) : (
    <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ color: C.sivi, fontSize: 8, letterSpacing: 0.8 }}>LOT</span>
      <input
        type="number"
        min={2}
        value={velicina}
        onChange={e => onLotVelicinaChange?.(snimiAqlLotVelicina(e.target.value))}
        style={inpAql}
      />
    </label>
  );

  const bojaKlase = { critical: C.crvena, major: C.narandzasta, minor: C.plava };
  const odlukaBoja = (o) => (
    o.boja === "zelena" ? C.zelena : o.boja === "crvena" ? C.crvena : o.boja === "zuta" ? C.zuta : C.sivi
  );

  return (
    <div style={{
      ...omotAql,
      background: C.panel,
      border: `1px solid ${boja}40`,
      borderRadius: kompakt || uskiPanel ? 8 : 10,
      padding: uskiPanel ? "8px 4px 8px 2px" : kompakt ? 10 : pad,
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: kompakt ? 6 : 8,
        marginBottom: uskiPanel ? 6 : kompakt ? 8 : 10,
      }}>
        <div>
          <div style={{ color: C.sivi, fontSize: fsLab, letterSpacing: uskiPanel ? 0.6 : 1.2 }}>AQL · {lotLabel}</div>
          <div style={{ color: C.tekst, fontSize: uskiPanel ? 9 : kompakt ? 10 : 11, marginTop: 2 }}>
            Lot {velicina.toLocaleString()} · kod {uzorak.slovo} · ref. n={uzorak.n}
          </div>
        </div>
        <div style={{
          background: `${boja}18`,
          border: `1px solid ${boja}50`,
          borderRadius: 8,
          padding: uskiPanel ? "4px 6px" : kompakt ? "6px 10px" : "8px 12px",
          color: boja,
          fontWeight: 700,
          fontSize: uskiPanel ? 9 : kompakt ? 11 : 13,
        }}>
          {konacna.tekst}
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: gridGap,
        marginBottom: uskiPanel ? 6 : kompakt ? 8 : 10,
      }}>
        {lotPolje}
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ color: C.sivi, fontSize: uskiPanel ? 7 : kompakt ? 9 : 8, letterSpacing: 0.8 }}>NIVO</span>
          <select value={nivo} onChange={e => azurirajPodesavanja({ nivo: e.target.value })} style={inpAql}>
            {INSPECTION_LEVELS.filter(l => l.grupa === "general").map(l =>
              <option key={l.id} value={l.id}>{l.id}</option>)}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ color: C.sivi, fontSize: uskiPanel ? 7 : kompakt ? 9 : 8, letterSpacing: 0.8 }}>TIP</span>
          <select value={tipInspekcije} onChange={e => azurirajPodesavanja({ tipInspekcije: e.target.value })} style={inpAql}>
            {INSPECTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.id}</option>)}
          </select>
        </label>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: gridGap,
        marginBottom: onOtvoriAqlTab ? (uskiPanel ? 6 : kompakt ? 8 : 10) : 0,
      }}>
        {planovi.map((p) => {
          const bk = bojaKlase[p.id];
          const ob = odlukaBoja(p.odluka);
          return (
            <div
              key={p.id}
              style={{
                background: C.bg,
                border: `1px solid ${bk}45`,
                borderRadius: uskiPanel ? 6 : 8,
                padding: uskiPanel ? "6px 2px" : kompakt ? "8px 6px" : "10px 8px",
                textAlign: "center",
                minWidth: 0,
              }}
            >
              <div style={{ color: bk, fontSize: uskiPanel ? 8 : kompakt ? 10 : 11, fontWeight: 700 }}>{p.naziv}</div>
              <div style={{ color: C.sivi, fontSize: uskiPanel ? 7 : kompakt ? 8 : 9, marginTop: 2 }}>AQL {p.aql}%</div>
              <div style={{ color: C.tekst, fontSize: uskiPanel ? 11 : kompakt ? 13 : 15, fontWeight: 700, margin: uskiPanel ? "4px 0 2px" : "6px 0 2px" }}>
                n={p.plan.n}
              </div>
              <div style={{ color: C.sivi, fontSize: uskiPanel ? 7 : kompakt ? 9 : 10, lineHeight: 1.25 }}>
                {p.plan.fullInspection ? "100%" : `Ac${p.plan.ac} Re${p.plan.re}`}
              </div>
              <div style={{
                color: p.nok > 0 ? C.crvena : C.tekst,
                fontSize: uskiPanel ? 11 : kompakt ? 14 : 16,
                fontWeight: 700,
                marginTop: uskiPanel ? 4 : 6,
              }}>
                NOK {p.nok}
              </div>
              <div style={{ color: ob, fontSize: uskiPanel ? 7 : kompakt ? 9 : 10, fontWeight: 700, marginTop: uskiPanel ? 2 : 4 }}>
                {p.odluka.tekst}
              </div>
            </div>
          );
        })}
      </div>

      {stavke.length > 0 && (
        <div style={{ fontSize: kompakt ? 8 : 9, color: C.sivi, textAlign: "center", marginBottom: onOtvoriAqlTab ? 6 : 0 }}>
          NOK iz {stavke.length} stavki liste (C/M/m po kategoriji greške)
        </div>
      )}

      {onOtvoriAqlTab && (
        <button type="button" onClick={onOtvoriAqlTab}
          style={{
            background: C.hover,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.plava,
            fontSize: kompakt ? 9 : 10,
            fontWeight: 700,
            padding: kompakt ? "8px 10px" : "8px 12px",
            cursor: "pointer",
            width: "100%",
          }}>
          🧮 Ručni AQL kalkulator (bez ID/RN) →
        </button>
      )}
    </div>
  );
}

export { UnosCiljBanner, UnosAqlPanel };
