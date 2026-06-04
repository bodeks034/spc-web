import { useMemo, useEffect, useState } from "react";
import { izracunajOeeKpi } from "../lib/oeeKpi.js";
import { supabase } from "../lib/supabaseClient.js";

const POLJA = [
  ["ukupno_kom", "Ukupno kom", "number"],
  ["ispravno_iz_prve", "Ispravno iz prve", "number"],
  ["neusaglaseno", "Neusaglašeno", "number"],
  ["dorada", "Dorada", "number"],
  ["skart", "Škart", "number"],
  ["ok_nakon_dorade", "OK nakon dorade", "number"],
  ["planirano_kom", "Planirano (kom)", "number"],
  ["planirano_min", "Planirano (min)", "number"],
  ["zastoj_min", "Zastoj (min)", "number"],
];

export default function SkartDoradaOeePanel({
  C, vrednosti, onChange, naslov, podnaslov, kompakt,
}) {
  const kpi = useMemo(() => izracunajOeeKpi(vrednosti || {}), [vrednosti]);

  const inp = {
    width: "100%",
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: kompakt ? 12 : 13,
    padding: kompakt ? "6px 8px" : "8px 10px",
    boxSizing: "border-box",
    fontFamily: "inherit",
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

      <div style={{
        display: "grid",
        gridTemplateColumns: kompakt ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
        gap: 8,
        marginBottom: 10,
      }}>
        {POLJA.map(([key, label]) => (
          <label key={key} style={{ display: "block" }}>
            <span style={{ color: C.sivi, fontSize: 8, display: "block", marginBottom: 3 }}>{label}</span>
            <input
              type={POLJA.find(p => p[0] === key)[2]}
              min={0}
              value={vrednosti?.[key] ?? 0}
              onChange={e => onChange({ ...vrednosti, [key]: Math.max(0, Number(e.target.value) || 0) })}
              style={inp}
            />
          </label>
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
            (vrednosti?.planirano_kom > 0) ? C.plava : C.sivi],
          ["Kvalitet", kpi.quality != null ? `${kpi.quality}%` : "—", C.zelena],
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
      <SkartDoradaOeePregled C={C} podaci={podaci} />
      <div style={{ color: C.sivi, fontSize: 9, marginTop: 16, lineHeight: 1.5 }}>
        KPI se snimaju pri zapisu serije (dugme Zapiši / Sačuvaj seriju). Tabela: <strong>kpi_unos</strong>.
      </div>
    </div>
  );
}

export function SkartDoradaOeePregled({ C, podaci, naslov }) {
  if (!podaci?.length) {
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
        {podaci.map(row => {
          const k = izracunajOeeKpi(row);
          return (
            <div key={row.id} style={{
              background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <span style={{ color: C.tekst, fontWeight: 700, fontSize: 12 }}>
                  {row.id_deo} · {row.datum} · S{row.smena}
                  {row.serija ? ` · ${row.serija}` : ""}
                </span>
                <span style={{
                  color: k.oee >= 85 ? C.zelena : k.oee >= 65 ? C.zuta : C.crvena,
                  fontWeight: 700, fontSize: 14,
                }}>
                  OEE {k.oee != null ? `${k.oee}%` : "—"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 10, color: C.sivi }}>
                <span>Škart: <strong style={{ color: C.crvena }}>{row.skart}</strong></span>
                <span>Dorada: <strong style={{ color: C.narandzasta }}>{row.dorada}</strong></span>
                <span>FPY: <strong style={{ color: C.plava }}>{k.fpy}%</strong></span>
                <span>UK: {row.ukupno_kom}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
