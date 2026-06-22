import { useMemo, useEffect, useState } from "react";
import { izracunajOeeKpi } from "../lib/oeeKpi.js";
import { supabase } from "../lib/supabaseClient.js";
import { grupisiKpiRedove, kpiKljucZaModul } from "../lib/kpiUnos.js";

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
  C, vrednosti, ukupno, onChange, naslov, podnaslov, kompakt, modul,
}) {
  const jeAtributivne = modul === "atributivne";
  const labelRucno = jeAtributivne ? "unos" : "serija";
  const kpiIzvor = ukupno || vrednosti || {};
  const kpi = useMemo(() => izracunajOeeKpi(kpiIzvor), [kpiIzvor]);

  const promeniPolje = (key, val) => {
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
            value={vrednosti?.[key]}
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
        Dostupnost = radno vreme bez zastoja · Performanse = output vs plan ·
        FPY = prolaz jedne faze (lokalno) · OEE kvalitet = FPY te faze.
      </div>
    </div>
  );
}

export function OeeKpiTab({ C, modul, addToast, idDeoFilter, datumOd, datumDo, smena }) {
  const [podaci, setPodaci] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = true;
    (async () => {
      setLoading(true);
      try {
        let q = supabase.from("kpi_unos").select("*").eq("modul", modul);
        if (idDeoFilter) q = q.eq("id_deo", String(idDeoFilter).toUpperCase());
        if (datumOd) q = q.gte("datum", datumOd);
        if (datumDo) q = q.lte("datum", datumDo);
        if (smena != null && smena !== "") q = q.eq("smena", Number(smena));
        const { data, error } = await q.order("created_at", { ascending: false }).limit(120);
        if (!ok) return;
        if (error) throw error;
        setPodaci(data || []);
      } catch (e) {
        if (!ok) return;
        const msg = e?.message || "";
        addToast?.(msg.includes("kpi_unos")
          ? `${msg}\nPokreni 14_kpi_skart_dorada_oee.sql u Supabase.`
          : msg, "greska");
        setPodaci([]);
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => { ok = false; };
  }, [modul, idDeoFilter, datumOd, datumDo, smena, addToast]);

  const prosek = useMemo(() => {
    if (!podaci.length) return null;
    let oeeSum = 0, oeeN = 0;
    podaci.forEach(r => {
      const k = izracunajOeeKpi(r);
      if (k.oee != null) { oeeSum += k.oee; oeeN++; }
    });
    return oeeN ? +(oeeSum / oeeN).toFixed(1) : null;
  }, [podaci]);

  if (loading) {
    return <div style={{ padding: 18, color: C.sivi, fontSize: 12 }}>Učitavanje KPI…</div>;
  }

  return (
    <div style={{ padding: 18, flex: 1, overflow: "auto" }}>
      <div style={{ color: C.sivi, fontSize: 10, letterSpacing: 1.2, marginBottom: 12 }}>
        OEE · ŠKART · DORADA — {modul === "merljive" ? "merljive" : "atributivne"}
        {(idDeoFilter || datumOd || datumDo || smena) && (
          <span style={{ display: "block", marginTop: 4, letterSpacing: 0, fontSize: 9 }}>
            {idDeoFilter && <>Deo: {idDeoFilter} · </>}
            {datumOd && <>od {datumOd} </>}
            {datumDo && <>do {datumDo} </>}
            {smena ? <>· S{smena}</> : null}
          </span>
        )}
      </div>
      {prosek != null && (
        <div style={{
          background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10,
          padding: 14, marginBottom: 14, textAlign: "center",
        }}>
          <div style={{ color: C.sivi, fontSize: 9 }}>PROSEČAN OEE (poslednji unosi)</div>
          <div style={{
            color: prosek >= 85 ? C.zelena : prosek >= 65 ? C.zuta : C.crvena,
            fontSize: 28, fontWeight: 700,
          }}>
            {prosek}%
          </div>
        </div>
      )}
      <SkartDoradaOeePregled C={C} podaci={podaci} modul={modul} />
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 16, lineHeight: 1.5 }}>
        KPI se snimaju pri zapisu {modul === "atributivne" ? "kontrole" : "serije"} (dugme Zapiši / Sačuvaj seriju). Tabela: <strong>kpi_unos</strong>.
      </div>
    </div>
  );
}

export function SkartDoradaOeePregled({ C, podaci, naslov, modul }) {
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
          return (
            <div key={row.id || `${row.id_deo}-${row.datum}`} style={{
              background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12,
            }}>
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
                  OEE {k.oee != null ? `${k.oee}%` : "—"}
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
                <span>Kval.: <strong style={{ color: C.zelena }}>{k.quality != null ? `${k.quality}%` : "—"}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
