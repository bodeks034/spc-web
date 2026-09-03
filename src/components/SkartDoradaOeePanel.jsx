import { useMemo } from "react";
import { izracunajKpiSerije } from "../lib/kpiKvalitet.js";
import {
  grupisiKpiRedove,
  kpiKljucZaModul,
} from "../lib/kpiUnos.js";

const POLJA_RUCNO = [
  ["dorada", "Dorada"],
  ["skart", "Škart"],
  ["ok_nakon_dorade", "OK nakon dorade"],
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
      <span style={{ color: C.sivi, fontSize: 10, display: "block", marginBottom: 3 }}>{label}</span>
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
  const kpi = useMemo(() => izracunajKpiSerije(kpiIzvor), [kpiIzvor]);
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
        {naslov || "ŠKART · DORADA · KPI"}
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
          <div style={{ color: C.sivi, fontSize: 10, marginBottom: 8 }}>
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
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(88px, 1fr))",
        gap: 8,
      }}>
        {[
          ["FPY", kpi.fpy != null ? `${kpi.fpy}%` : "—", C.plava],
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
      <div style={{ color: C.sivi, fontSize: 10, marginTop: 10, lineHeight: 1.55 }}>
        {samoPregled
          ? "Pregled KPI — FPY i stopa škarta/dorade izračunati automatski."
          : "Iz merenja (read-only): ukupno kom, ispravno iz prve, neusaglašeno · Unos: dorada, škart, OK posle dorade."}
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
        Nema KPI unosa (škart / dorada)
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
          const k = izracunajKpiSerije(row);
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
                  width: "100%", background: "none", border: "none", padding: 0, cursor: onProsireniRed ? "pointer" : "default", textAlign: "left",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                  <span style={{ color: C.tekst, fontWeight: 700, fontSize: 12 }}>
                    {row.id_deo} · {row.datum} · S{row.smena}
                    {modul === "merljive" && row.serija ? ` · serija ${row.serija}` : ""}
                    {modul === "atributivne" && row.radni_nalog ? ` · RN ${row.radni_nalog}` : ""}
                  </span>
                  <span style={{ color: C.plava, fontWeight: 700, fontSize: 14 }}>
                    FPY {k.fpy != null ? `${k.fpy}%` : "—"} {onProsireniRed ? (prosireno ? "▾" : "▸") : ""}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 10, color: C.sivi }}>
                  <span>Iz prve: <strong style={{ color: C.zelena }}>{row.ispravno_iz_prve ?? 0}</strong></span>
                  <span>Neus.: <strong style={{ color: C.zuta }}>{row.neusaglaseno ?? 0}</strong></span>
                  <span>Škart: <strong style={{ color: C.crvena }}>{row.skart}</strong></span>
                  <span>Dorada: <strong style={{ color: C.narandzasta }}>{row.dorada}</strong></span>
                  <span>OK↳: <strong style={{ color: C.plava }}>{row.ok_nakon_dorade ?? 0}</strong></span>
                  {k.skartStopa != null && (
                    <span>Škart %: <strong style={{ color: C.crvena }}>{k.skartStopa}%</strong></span>
                  )}
                </div>
              </button>
              {prosireno && (
                <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                  <SkartDoradaOeePanel
                    C={C}
                    modul={modul}
                    vrednosti={row}
                    samoPregled
                    kompakt
                    naslov="Detalj KPI unosa"
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
