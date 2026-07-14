import { useState } from "react";
import { MOMENT_ERROR_KOD } from "../../lib/momentKljucList.js";

function Metrika({ C, label, value, boja, sub }) {
  return (
    <div style={{
      flex: "1 1 0",
      minWidth: 0,
      background: C.bg || C.panel,
      border: `1px solid ${(boja || C.border)}33`,
      borderRadius: 6,
      padding: "4px 6px",
      textAlign: "center",
    }}
    >
      <div style={{ color: C.sivi, fontSize: 7, letterSpacing: 0.4, marginBottom: 2 }}>{label}</div>
      <div style={{
        color: boja || C.tekst,
        fontSize: 13,
        fontWeight: 700,
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1.1,
      }}
      >
        {value ?? "—"}
      </div>
      {sub && (
        <div style={{ color: C.sivi, fontSize: 7, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function formatVreme(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Kompaktan KPI strip za operatora na liniji momentnog ključa.
 */
export default function MomentLinijaKpiStrip({
  C,
  kpi,
  ukupnoKoraka = 0,
  jobKod,
  kompakt = false,
}) {
  const [otvoren, setOtvoren] = useState(false);

  if (!kpi) return null;

  const { ok, nok, ukupno, maxOk, zavrseniCiklusi = 0, fpy, poslednjiNok, nedavna } = kpi;
  const zavrseno = ukupnoKoraka > 0 ? maxOk : 0;
  const tekuciKomad = zavrseniCiklusi + 1;
  const napredakPct = ukupnoKoraka > 0 ? Math.round((zavrseno / ukupnoKoraka) * 100) : 0;
  const fpyBoja = fpy == null ? C.sivi : fpy >= 95 ? C.zelena : fpy >= 85 ? C.zuta : C.crvena;

  const nokTekst = poslednjiNok
    ? `Korak ${poslednjiNok.korak_redosled}${poslednjiNok.poz_br ? ` · poz. ${poslednjiNok.poz_br}` : ""}`
      + ` · ${poslednjiNok.ostvareno_nm ?? "—"} Nm`
      + (poslednjiNok.error_kod && MOMENT_ERROR_KOD[poslednjiNok.error_kod]
        ? ` · ${MOMENT_ERROR_KOD[poslednjiNok.error_kod]}`
        : "")
    : null;

  return (
    <div style={{
      flexShrink: 0,
      background: `${C.panel}`,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: kompakt ? "5px 6px" : "6px 8px",
    }}
    >
      <div style={{ display: "flex", gap: 5, alignItems: "stretch" }}>
        <Metrika C={C} label="FPY" value={fpy != null ? `${fpy}%` : "—"} boja={fpyBoja} />
        <Metrika
          C={C}
          label="NAPREDAK"
          value={ukupnoKoraka ? `${zavrseno}/${ukupnoKoraka}` : `${zavrseno}`}
          boja={napredakPct >= 100 ? C.zelena : C.plava || "#3b82f6"}
          sub={ukupnoKoraka ? `komad ${tekuciKomad} · ${napredakPct}%` : undefined}
        />
        <Metrika C={C} label="OK" value={ok} boja={C.zelena} />
        <Metrika C={C} label="NOK" value={nok} boja={nok > 0 ? C.crvena : C.sivi} />
        {nedavna?.length > 0 && (
          <button
            type="button"
            onClick={() => setOtvoren((v) => !v)}
            title="Poslednja merenja"
            style={{
              flexShrink: 0,
              alignSelf: "stretch",
              background: otvoren ? `${C.plava || "#3b82f6"}22` : C.hover,
              border: `1px solid ${otvoren ? (C.plava || "#3b82f6") : C.border}`,
              borderRadius: 6,
              color: otvoren ? (C.plava || "#3b82f6") : C.sivi,
              fontSize: 9,
              fontWeight: 700,
              padding: "0 8px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {otvoren ? "▲" : "▼"} {kompakt ? "" : "Detalji"}
          </button>
        )}
      </div>

      {ukupnoKoraka > 0 && (
        <div style={{
          marginTop: 5,
          height: 4,
          borderRadius: 2,
          background: C.hover,
          overflow: "hidden",
        }}
        >
          <div style={{
            width: `${napredakPct}%`,
            height: "100%",
            background: napredakPct >= 100 ? C.zelena : (C.ljubicasta || "#a78bfa"),
            borderRadius: 2,
            transition: "width 0.25s ease",
          }}
          />
        </div>
      )}

      {poslednjiNok && (
        <div style={{
          marginTop: 5,
          fontSize: 9,
          color: C.crvena,
          lineHeight: 1.35,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={nokTekst}
        >
          Poslednji NOK · {nokTekst}
        </div>
      )}

      {jobKod && ukupno === 0 && (
        <div style={{ marginTop: 4, fontSize: 9, color: C.sivi }}>
          {jobKod} · komad {tekuciKomad} · danas još nema merenja
        </div>
      )}

      {otvoren && nedavna?.length > 0 && (
        <div style={{
          marginTop: 6,
          borderTop: `1px solid ${C.border}`,
          paddingTop: 6,
          maxHeight: kompakt ? 100 : 130,
          overflowY: "auto",
        }}
        >
          <div style={{ color: C.sivi, fontSize: 8, fontWeight: 700, marginBottom: 4, letterSpacing: 0.4 }}>
            POSLEDNJIH {nedavna.length} MERENJA
          </div>
          {nedavna.map((r) => (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "36px 1fr auto auto",
                gap: 6,
                alignItems: "center",
                fontSize: 9,
                padding: "3px 0",
                borderBottom: `1px solid ${C.border}33`,
                color: C.tekst,
              }}
            >
              <span style={{ color: C.sivi, fontVariantNumeric: "tabular-nums" }}>
                {formatVreme(r.created_at)}
              </span>
              <span>
                K{r.korak_redosled}
                {r.poz_br ? ` · poz. ${r.poz_br}` : ""}
              </span>
              <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {r.ostvareno_nm ?? "—"} Nm
              </span>
              <span style={{
                color: r.status === "OK" ? C.zelena : C.crvena,
                fontWeight: 700,
                textAlign: "right",
              }}
              >
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
