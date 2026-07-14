import { useMemo, useEffect, useState, useCallback } from "react";
import { izracunajOeeKpi } from "../lib/oeeKpi.js";
import { supabase } from "../lib/supabaseClient.js";
import {
  grupisiKpiRedove,
  kpiKljucZaModul,
  agregirajKpiUnos,
  fetchKpiFilterOpcijeZaDeo,
  filtrirajKpiStavke,
  datumIsoUSr,
} from "../lib/kpiUnos.js";
import { datumSrUIso } from "../lib/planUzorkovanja.js";
import { preuzmiOeeIzvestajPdf, stampajOeeIzvestaj } from "../lib/oeeIzvestajPdf.js";

const POLJA_RUCNO = [
  ["dorada", "Dorada"],
  ["skart", "Škart"],
  ["ok_nakon_dorade", "OK nakon dorade"],
];

const POLJA_PLAN = [
  ["planirano_kom", "Planirano (kom)"],
  ["planirano_min", "Planirano (min)"],
  ["zastoj_min", "Zastoj (min)"],
];

const POLJA_AUTO = [
  ["ukupno_kom", "Ukupno kom"],
  ["ispravno_iz_prve", "Ispravno iz prve"],
  ["neusaglaseno", "Neusaglašeno"],
];

const POLJA_UKUPNO_KLJUCEVI = [
  ...POLJA_AUTO,
  ...POLJA_RUCNO,
];

function fmtBroj(v) {
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "0";
}

function KpiBrojPolje({ label, value, boja, C, onChange, readOnly = false }) {
  const inp = {
    width: "100%",
    background: readOnly ? C.bg : C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: boja || C.tekst,
    fontSize: 12,
    padding: "6px 8px",
    boxSizing: "border-box",
    fontFamily: "inherit",
    fontWeight: readOnly ? 700 : 400,
  };

  return (
    <label style={{ display: "block" }}>
      <span style={{ color: C.sivi, fontSize: 8, display: "block", marginBottom: 3 }}>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        readOnly={readOnly}
        value={fmtBroj(value)}
        onChange={readOnly ? undefined : (e => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          onChange(raw === "" ? 0 : Math.max(0, Number(raw)));
        })}
        style={inp}
      />
    </label>
  );
}

export default function SkartDoradaOeePanel({
  C, vrednosti, ukupno, onChange, naslov, podnaslov, kompakt, modul, samoPregled = false,
}) {
  const jeAtributivne = modul === "atributivne";
  const labelRucno = jeAtributivne ? "unos" : "serija";
  const kpiIzvor = ukupno || vrednosti || {};
  const kpi = useMemo(() => izracunajOeeKpi(kpiIzvor), [kpiIzvor]);
  const readOnly = samoPregled || !onChange;

  const promeniPolje = (key, val) => {
    if (readOnly) return;
    onChange?.({ ...vrednosti, [key]: val });
  };

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: kompakt ? 10 : 14,
      marginBottom: kompakt ? 8 : 12,
    }}>
      <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2, marginBottom: kompakt ? 6 : 10 }}>
        {naslov || "ŠKART · DORADA · OEE"}
        {podnaslov && (
          <span style={{ display: "block", marginTop: 4, letterSpacing: 0, fontSize: 9 }}>{podnaslov}</span>
        )}
      </div>

      {ukupno ? (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: kompakt ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
            gap: 8,
            marginBottom: 10,
            padding: 8,
            background: C.bg,
            borderRadius: 8,
            border: `1px solid ${C.border}`,
          }}>
            {POLJA_UKUPNO_KLJUCEVI.map(([key, label]) => {
              const boja = key === "ispravno_iz_prve" ? C.zelena
                : key === "neusaglaseno" ? C.zuta
                : key === "dorada" ? C.narandzasta
                : key === "skart" ? C.crvena
                : key === "ok_nakon_dorade" ? C.plava
                : C.tekst;
              return (
                <KpiBrojPolje
                  key={key}
                  C={C}
                  label={`${label} (ukupno)`}
                  value={kpiIzvor?.[key]}
                  boja={boja}
                  readOnly
                />
              );
            })}
          </div>
          <div style={{ color: C.sivi, fontSize: 8, marginBottom: 8 }}>
            {jeAtributivne
              ? "Ručni unos dorade/škarta za tekuću kontrolu:"
              : "Ručni unos za tekuću seriju (sabira se u ukupno iznad):"}
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: kompakt ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
            gap: 8,
            marginBottom: 10,
          }}>
            {POLJA_RUCNO.map(([key, label]) => (
              <KpiBrojPolje
                key={key}
                C={C}
                label={`${label} (${labelRucno})`}
                value={vrednosti?.[key]}
                boja={key === "dorada" ? C.narandzasta : key === "skart" ? C.crvena : C.plava}
                readOnly={readOnly}
                onChange={val => promeniPolje(key, val)}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: kompakt ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
            gap: 8,
            marginBottom: 10,
          }}>
            {POLJA_AUTO.map(([key, label]) => (
              <KpiBrojPolje
                key={key}
                C={C}
                label={label}
                value={vrednosti?.[key]}
                boja={key === "ispravno_iz_prve" ? C.zelena : key === "neusaglaseno" ? C.zuta : C.tekst}
                readOnly
              />
            ))}
            {POLJA_RUCNO.map(([key, label]) => (
              <KpiBrojPolje
                key={key}
                C={C}
                label={label}
                value={vrednosti?.[key]}
                boja={key === "dorada" ? C.narandzasta : key === "skart" ? C.crvena : C.plava}
                readOnly={readOnly}
                onChange={val => promeniPolje(key, val)}
              />
            ))}
          </div>
        </>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: kompakt ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
        gap: 8,
        marginBottom: 10,
      }}>
        {POLJA_PLAN.map(([key, label]) => (
          <KpiBrojPolje
            key={key}
            C={C}
            label={label}
            value={vrednosti?.[key] ?? kpiIzvor?.[key]}
            readOnly={readOnly}
            onChange={val => promeniPolje(key, val)}
          />
        ))}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
        gap: 8,
      }}>
        {[
          ["OEE", kpi.oee != null ? `${kpi.oee}%` : "—", kpi.oee >= 85 ? C.zelena : kpi.oee >= 65 ? C.zuta : C.crvena],
          ["FPY", kpi.fpy != null ? `${kpi.fpy}%` : "—", C.plava],
          ["Dostupnost", kpi.availability != null ? `${kpi.availability}%` : "—", C.zuta],
          ["Performanse", kpi.performance != null ? `${kpi.performance}%` : "—",
            kpi.performance != null ? C.plava : C.sivi],
          ["Kvalitet (FPY)", kpi.quality != null ? `${kpi.quality}%` : "—", C.zelena],
          ["Škart %", kpi.skartStopa != null ? `${kpi.skartStopa}%` : "—", C.crvena],
          ["Dorada %", kpi.doradaStopa != null ? `${kpi.doradaStopa}%` : "—", C.narandzasta],
        ].map(([n, v, b]) => (
          <div key={n} style={{
            background: C.bg, borderRadius: 8, padding: "8px 10px", textAlign: "center",
            border: `1px solid ${b}30`,
          }}>
            <div style={{ color: C.sivi, fontSize: 8 }}>{n}</div>
            <div style={{ color: b, fontSize: 16, fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ color: C.sivi, fontSize: 8, marginTop: 10, lineHeight: 1.55 }}>
        {samoPregled
          ? "Pregled ulaznih vrednosti — OEE/FPY/Dostupnost/Performanse su izračunati, ne unose se ručno."
          : "Iz merenja (read-only): ukupno kom, ispravno iz prve, neusaglašeno · Unos: dorada, škart, OK posle dorade, plan kom/min, zastoj · OEE kartice su automatski izračun."}
      </div>
    </div>
  );
}

/** Vizuelna raščlamba formule OEE = A × P × Q. */
export function OeeFormulaRaspodela({ C, izvor, kpi, naslov }) {
  const planMin = Number(izvor?.planirano_min) || 0;
  const zastoj = Number(izvor?.zastoj_min) || 0;
  const planKom = Number(izvor?.planirano_kom) || 0;
  const uk = Number(izvor?.ukupno_kom) || 0;
  const fp = Number(izvor?.ispravno_iz_prve) || 0;

  const red = (label, formula, vrednost, boja = C.tekst) => (
    <div key={label} style={{
      display: "grid",
      gridTemplateColumns: "minmax(90px, 1fr) minmax(120px, 2fr) auto",
      gap: 8,
      alignItems: "center",
      padding: "6px 0",
      borderBottom: `1px solid ${C.border}`,
      fontSize: 10,
    }}>
      <span style={{ color: C.sivi, fontWeight: 700 }}>{label}</span>
      <span style={{ color: C.sivi, lineHeight: 1.4 }}>{formula}</span>
      <span style={{ color: boja, fontWeight: 700, textAlign: "right" }}>{vrednost}</span>
    </div>
  );

  return (
    <div style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 10,
      padding: "10px 12px",
      marginBottom: 12,
    }}>
      {naslov && (
        <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 8 }}>{naslov}</div>
      )}
      {red(
        "Dostupnost (A)",
        planMin > 0
          ? `(${planMin} − ${zastoj}) / ${planMin} min`
          : "Nema planiranog vremena — A se ne računa",
        kpi?.availability != null ? `${kpi.availability}%` : "—",
        C.zuta,
      )}
      {red(
        "Performanse (P)",
        planKom > 0
          ? `${uk} / ${planKom} kom`
          : (uk > 0 ? "Nema plana kom — P = 100%" : "Nema outputa"),
        kpi?.performance != null ? `${kpi.performance}%` : "—",
        C.plava,
      )}
      {red(
        "Kvalitet / FPY (Q)",
        uk > 0 ? `${fp} / ${uk} kom ispravno iz prve` : "Nema komada",
        kpi?.quality != null ? `${kpi.quality}%` : "—",
        C.zelena,
      )}
      <div style={{
        marginTop: 10,
        padding: "10px 12px",
        background: C.panel,
        borderRadius: 8,
        textAlign: "center",
        border: `1px solid ${(kpi?.oee >= 85 ? C.zelena : kpi?.oee >= 65 ? C.zuta : C.crvena)}40`,
      }}>
        <div style={{ color: C.sivi, fontSize: 9 }}>OEE = A × P × Q</div>
        <div style={{
          color: kpi?.oee >= 85 ? C.zelena : kpi?.oee >= 65 ? C.zuta : C.crvena,
          fontSize: 22,
          fontWeight: 700,
          marginTop: 4,
        }}>
          {kpi?.availability != null && kpi?.performance != null && kpi?.quality != null
            ? `${kpi.availability}% × ${kpi.performance}% × ${kpi.quality}% = ${kpi.oee}%`
            : (kpi?.oee != null ? `${kpi.oee}%` : "—")}
        </div>
      </div>
      <div style={{ color: C.sivi, fontSize: 8, marginTop: 8, lineHeight: 1.5 }}>
        Ulazi: škart {izvor?.skart ?? 0} · dorada {izvor?.dorada ?? 0} · OK posle dorade {izvor?.ok_nakon_dorade ?? 0}
        {" "}· neusaglašeno {izvor?.neusaglaseno ?? 0}
      </div>
    </div>
  );
}

const PRAZNE_OPCIJE = { stavke: [], radniNalozi: [], datumi: [], smene: [] };

export function OeeKpiTab({
  C,
  modul,
  addToast,
  idDeoFilter,
  datumOd,
  datumDo,
  datum,
  smena,
  radniNalog,
}) {
  const [podaci, setPodaci] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRn, setFilterRn] = useState("");
  const [filterDatum, setFilterDatum] = useState("");
  const [filterSmena, setFilterSmena] = useState("");
  const [filterOpcije, setFilterOpcije] = useState(PRAZNE_OPCIJE);
  const [opcijeLoading, setOpcijeLoading] = useState(false);
  const [prosireniRed, setProsireniRed] = useState(null);
  const [pdfRadi, setPdfRadi] = useState(false);

  const idDeo = String(idDeoFilter || "").trim().toUpperCase();

  useEffect(() => {
    setFilterRn(String(radniNalog || "").trim().toUpperCase());
    setFilterDatum(datum || "");
    setFilterSmena(smena != null && smena !== "" ? String(smena) : "");
  }, [idDeo, radniNalog, datum, smena]);

  useEffect(() => {
    if (idDeo.length < 3) {
      setFilterOpcije(PRAZNE_OPCIJE);
      return;
    }
    let cancelled = false;
    (async () => {
      setOpcijeLoading(true);
      try {
        const opcije = await fetchKpiFilterOpcijeZaDeo(supabase, { modul, idDeo });
        if (!cancelled) setFilterOpcije(opcije);
      } catch {
        if (!cancelled) setFilterOpcije(PRAZNE_OPCIJE);
      } finally {
        if (!cancelled) setOpcijeLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [idDeo, modul]);

  const imaOpcije = filterOpcije.stavke.length > 0;
  const stavkePoRn = useMemo(() => {
    if (!imaOpcije) return [];
    if (!filterRn) return filterOpcije.stavke;
    return filtrirajKpiStavke(filterOpcije.stavke, { radniNalog: filterRn });
  }, [filterOpcije.stavke, imaOpcije, filterRn]);

  const datumiOpcije = useMemo(() => (
    [...new Set(stavkePoRn.map((s) => s.datum))].sort((a, b) => b.localeCompare(a))
  ), [stavkePoRn]);

  const smeneOpcije = useMemo(() => {
    const list = filtrirajKpiStavke(stavkePoRn, { datumIso: filterDatum || undefined });
    const izBaze = [...new Set(list.map((s) => String(s.smena)).filter(Boolean))]
      .sort((a, b) => Number(a) - Number(b));
    return izBaze.length ? izBaze : ["1", "2", "3"];
  }, [stavkePoRn, filterDatum]);

  const ucitajPodatke = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from("kpi_unos").select("*").eq("modul", modul);
      if (idDeo) q = q.eq("id_deo", idDeo);
      const dan = filterDatum || datum;
      if (dan) {
        q = q.eq("datum", datumSrUIso(dan));
      } else {
        if (datumOd) q = q.gte("datum", datumOd);
        if (datumDo) q = q.lte("datum", datumDo);
      }
      const sm = filterSmena || smena;
      if (sm != null && sm !== "") q = q.eq("smena", Number(sm));
      const rn = filterRn || radniNalog;
      if (rn) q = q.eq("radni_nalog", String(rn).trim().toUpperCase());
      const { data, error } = await q.order("created_at", { ascending: false }).limit(120);
      if (error) throw error;
      setPodaci(data || []);
    } catch (e) {
      const msg = e?.message || "";
      addToast?.(msg.includes("kpi_unos")
        ? `${msg}\nPokreni 14_kpi_skart_dorada_oee.sql u Supabase.`
        : msg, "greska");
      setPodaci([]);
    } finally {
      setLoading(false);
    }
  }, [modul, idDeo, filterDatum, filterSmena, filterRn, datum, smena, radniNalog, datumOd, datumDo, addToast]);

  useEffect(() => {
    ucitajPodatke();
  }, [ucitajPodatke]);

  const agregat = useMemo(() => agregirajKpiUnos(podaci, { modul }), [podaci, modul]);
  const agregatIzvor = useMemo(() => {
    if (!agregat) return null;
    const { kpi, brojUnosa, brojRedovaBaze, ...brojevi } = agregat;
    void kpi;
    void brojUnosa;
    void brojRedovaBaze;
    return brojevi;
  }, [agregat]);
  const agregatKpi = agregat?.kpi || null;

  const pdfFilter = () => ({
    idDeo: idDeo || undefined,
    radniNalog: filterRn || radniNalog || undefined,
    datum: filterDatum || datum || undefined,
    smena: filterSmena || smena || undefined,
    datumOd: !filterDatum && !datum ? datumOd : undefined,
    datumDo: !filterDatum && !datum ? datumDo : undefined,
  });

  const exportPDF = async () => {
    setPdfRadi(true);
    try {
      await preuzmiOeeIzvestajPdf({ podaci, modul, filter: pdfFilter() });
      addToast?.("✓ OEE PDF", "uspeh");
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setPdfRadi(false);
    }
  };

  const stampaj = async () => {
    try {
      await stampajOeeIzvestaj({ podaci, modul, filter: pdfFilter() });
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  if (loading && !podaci.length) {
    return <div style={{ padding: 18, color: C.sivi, fontSize: 12 }}>Učitavanje KPI…</div>;
  }

  const inp = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 11,
    padding: "6px 8px",
    fontFamily: "inherit",
    boxSizing: "border-box",
    width: "100%",
  };

  return (
    <div style={{ padding: 18, flex: 1, overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.2 }}>
          OEE · ŠKART · DORADA — {modul === "merljive" ? "merljive" : "atributivne"}
          {idDeo && (
            <span style={{ display: "block", marginTop: 4, letterSpacing: 0, fontSize: 9, color: C.tekst }}>
              Deo: <strong>{idDeo}</strong>
              {filterRn ? <> · RN <strong>{filterRn}</strong></> : null}
              {filterDatum ? <> · {datumIsoUSr(filterDatum)}</> : null}
              {filterSmena ? <> · smena {filterSmena}</> : null}
              {!filterDatum && datumOd ? <> · od {datumOd}</> : null}
              {!filterDatum && datumDo ? <> do {datumDo}</> : null}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button type="button" onClick={exportPDF} disabled={pdfRadi || loading} style={{
            background: "#7c3aed", border: "none", borderRadius: 6, color: C.onAkcent,
            fontSize: 10, fontWeight: 700, padding: "7px 12px", cursor: "pointer",
          }}>{pdfRadi ? "…" : "📄 PDF"}</button>
          <button type="button" onClick={stampaj} disabled={loading} style={{
            background: C.zelena, border: "none", borderRadius: 6, color: C.onAkcent,
            fontSize: 10, fontWeight: 700, padding: "7px 12px", cursor: "pointer",
          }}>🖨 Štampaj</button>
        </div>
      </div>

      {idDeo.length >= 3 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 8,
          marginBottom: 12,
        }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ color: C.sivi, fontSize: 8 }}>Radni nalog</span>
            {imaOpcije ? (
              <select style={inp} value={filterRn} onChange={(e) => setFilterRn(e.target.value.toUpperCase())} disabled={opcijeLoading}>
                <option value="">— svi —</option>
                {filterOpcije.radniNalozi.map((rn) => <option key={rn} value={rn}>{rn}</option>)}
              </select>
            ) : (
              <input style={inp} value={filterRn} onChange={(e) => setFilterRn(e.target.value.toUpperCase())} placeholder="RN" />
            )}
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ color: C.sivi, fontSize: 8 }}>Datum</span>
            {imaOpcije && datumiOpcije.length > 0 ? (
              <select style={inp} value={filterDatum} onChange={(e) => setFilterDatum(e.target.value)} disabled={opcijeLoading}>
                <option value="">— svi —</option>
                {datumiOpcije.map((iso) => <option key={iso} value={iso}>{datumIsoUSr(iso)}</option>)}
              </select>
            ) : (
              <input style={inp} value={filterDatum} onChange={(e) => setFilterDatum(e.target.value)} placeholder="yyyy-mm-dd" />
            )}
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ color: C.sivi, fontSize: 8 }}>Smena</span>
            <select style={inp} value={filterSmena} onChange={(e) => setFilterSmena(e.target.value)}>
              <option value="">— sve —</option>
              {smeneOpcije.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flexWrap: "wrap" }}>
            <button type="button" onClick={ucitajPodatke} disabled={loading} style={{
              width: "100%",
              background: C.plava,
              border: "none",
              borderRadius: 6,
              color: C.onAkcent,
              fontSize: 10,
              fontWeight: 700,
              padding: "7px 10px",
              cursor: loading ? "wait" : "pointer",
            }}>
              {loading ? "Učitavam…" : "↻ Osveži"}
            </button>
          </div>
        </div>
      )}

      {agregatKpi && agregatIzvor && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 8 }}>
            UKUPNO ZA FILTER
            {agregat.brojUnosa > 1 ? ` (${agregat.brojUnosa} unosa)` : ""}
          </div>
          <OeeFormulaRaspodela
            C={C}
            izvor={agregatIzvor}
            kpi={agregatKpi}
            naslov="Računanje OEE"
          />
          <SkartDoradaOeePanel
            C={C}
            modul={modul}
            vrednosti={agregatIzvor}
            samoPregled
            kompakt
            naslov="Svi ulazi u OEE"
            podnaslov={idDeo ? `Agregat za ${idDeo}` : "Agregat za filter"}
          />
        </div>
      )}

      {!agregatKpi && idDeo && (
        <div style={{
          color: C.sivi, fontSize: 11, textAlign: "center", padding: 16, marginBottom: 12,
          background: C.panel, borderRadius: 10, border: `1px solid ${C.border}`,
        }}>
          Nema KPI unosa za <strong style={{ color: C.tekst }}>{idDeo}</strong>
          {filterRn ? <> · RN {filterRn}</> : null}
          {filterDatum ? <> · {datumIsoUSr(filterDatum)}</> : null}
          {filterSmena ? <> · smena {filterSmena}</> : null}.
          <br />
          KPI se kreira pri snimanju merenja / kontrole.
        </div>
      )}

      <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 8 }}>
        POJEDINAČNI UNOSI
      </div>
      <SkartDoradaOeePregled
        C={C}
        podaci={podaci}
        modul={modul}
        prosireniRed={prosireniRed}
        onProsireniRed={setProsireniRed}
      />
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 16, lineHeight: 1.5 }}>
        KPI se snimaju pri zapisu {modul === "atributivne" ? "kontrole" : "serije"} (dugme Zapiši / Sačuvaj seriju). Tabela: <strong>kpi_unos</strong>.
        Klikni red za pun prikaz ulaza u OEE.
      </div>
    </div>
  );
}

export function SkartDoradaOeePregled({ C, podaci, naslov, modul, prosireniRed, onProsireniRed }) {
  const prikaz = useMemo(() => {
    if (!podaci?.length) return [];
    if (modul !== "atributivne") return podaci;
    const { mapa, idMapa } = grupisiKpiRedove("atributivne", podaci);
    return Object.entries(mapa).map(([kljuc, vrednosti]) => {
      const src = podaci.find(r => kpiKljucZaModul("atributivne", r) === kljuc) || {};
      return {
        id: idMapa[kljuc],
        modul: "atributivne",
        id_deo: src.id_deo,
        datum: src.datum,
        smena: src.smena,
        radni_nalog: src.radni_nalog,
        serija: null,
        ...vrednosti,
      };
    });
  }, [podaci, modul]);

  if (!prikaz?.length) {
    return (
      <div style={{ color: C.border, fontSize: 12, textAlign: "center", padding: 24 }}>
        Nema KPI unosa (škart / dorada / OEE)
      </div>
    );
  }

  return (
    <div>
      {naslov && (
        <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.2, marginBottom: 12 }}>{naslov}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {prikaz.map(row => {
          const k = izracunajOeeKpi(row);
          const rowKey = row.id || `${row.id_deo}-${row.datum}-${row.smena}-${row.serija || ""}`;
          const prosireno = prosireniRed === rowKey;
          return (
            <div key={rowKey} style={{
              background: C.panel, border: `1px solid ${prosireno ? C.plava : C.border}`, borderRadius: 10, padding: 12,
            }}>
              <button
                type="button"
                onClick={() => onProsireniRed?.(prosireno ? null : rowKey)}
                style={{
                  width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                  <span style={{ color: C.tekst, fontWeight: 700, fontSize: 12 }}>
                    {row.id_deo} · {row.datum} · S{row.smena}
                    {modul === "merljive" && row.serija ? ` · serija ${row.serija}` : ""}
                    {modul === "atributivne" && row.radni_nalog ? ` · RN ${row.radni_nalog}` : ""}
                  </span>
                  <span style={{
                    color: k.oee >= 85 ? C.zelena : k.oee >= 65 ? C.zuta : C.crvena,
                    fontWeight: 700, fontSize: 14,
                  }}>
                    OEE {k.oee != null ? `${k.oee}%` : "—"} {onProsireniRed ? (prosireno ? "▾" : "▸") : ""}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 10, color: C.sivi }}>
                  <span>Iz prve: <strong style={{ color: C.zelena }}>{row.ispravno_iz_prve ?? 0}</strong></span>
                  <span>Neus.: <strong style={{ color: C.zuta }}>{row.neusaglaseno ?? 0}</strong></span>
                  <span>Škart: <strong style={{ color: C.crvena }}>{row.skart}</strong></span>
                  <span>Dorada: <strong style={{ color: C.narandzasta }}>{row.dorada}</strong></span>
                  <span>OK↳: <strong style={{ color: C.plava }}>{row.ok_nakon_dorade ?? 0}</strong></span>
                  <span>FPY: <strong style={{ color: C.plava }}>{k.fpy}%</strong></span>
                  <span>Dost.: <strong style={{ color: C.zuta }}>{k.availability != null ? `${k.availability}%` : "—"}</strong></span>
                  <span>Perf.: <strong style={{ color: C.plava }}>{k.performance != null ? `${k.performance}%` : "—"}</strong></span>
                </div>
              </button>
              {prosireno && (
                <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                  <OeeFormulaRaspodela C={C} izvor={row} kpi={k} />
                  <SkartDoradaOeePanel
                    C={C}
                    modul={modul}
                    vrednosti={row}
                    samoPregled
                    kompakt
                    naslov="Ulazi u OEE"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
