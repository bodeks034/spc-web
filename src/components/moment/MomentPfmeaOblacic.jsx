import { useState, useEffect } from "react";
import {
  MOMENT_QS_TRQ_REF,
  MOMENT_PFMEA_SVRHA,
  MOMENT_PFMEA_SKALE,
  MOMENT_PFMEA_RPN,
  MOMENT_PFMEA_KLASA,
  MOMENT_PFMEA_DODATNO,
  MOMENT_PFMEA_OBLACICI,
  izracunajMomentRpn,
  predloziMomentKlasifikaciju,
  uzorkovanjeZaKlasu,
  bojaKlasifikacije,
} from "../../lib/momentPfmeaMetodologija.js";

const SKALA_BOJE = {
  S: "#ef4444",
  O: "#f59e0b",
  D: "#3b82f6",
  RPN: "#a78bfa",
  VSK: "#ef4444",
  KSK: "#eab308",
  STD: "#94a3b8",
};

function sadrzajOblacica(id) {
  if (id === "RPN") {
    return (
      <>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{MOMENT_PFMEA_RPN.label}</div>
        <div style={{ marginBottom: 6 }}>
          <strong>{MOMENT_PFMEA_RPN.formula}</strong> (opseg {MOMENT_PFMEA_RPN.opseg})
        </div>
        <div>{MOMENT_PFMEA_RPN.opis}</div>
      </>
    );
  }
  if (MOMENT_PFMEA_KLASA[id]) {
    const k = MOMENT_PFMEA_KLASA[id];
    return (
      <>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{k.label} — {k.punNaziv}</div>
        <div style={{ marginBottom: 8, lineHeight: 1.45 }}>{k.pravilo}</div>
        <div style={{ fontSize: 9, opacity: 0.9 }}>
          <strong>Uzorkovanje:</strong> {k.uzorkovanje}
        </div>
      </>
    );
  }
  const skala = MOMENT_PFMEA_SKALE[id];
  if (!skala) return null;
  return (
    <>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{skala.label}</div>
      <div style={{ marginBottom: 8, opacity: 0.85 }}>{skala.opis} · opseg {skala.opseg}</div>
      {skala.nivoi.map((n) => (
        <div key={n.opseg} style={{ marginBottom: 6, lineHeight: 1.4 }}>
          <strong>{n.opseg}:</strong> {n.tekst}
        </div>
      ))}
    </>
  );
}

/** Jedan klikabilni oblacić — S, O, D, RPN, VSK, KSK, STD. */
export function MomentPfmeaOblacic({ C, id, aktivan, onToggle, kompakt }) {
  const boja = SKALA_BOJE[id] || C.plava;
  const label = id === "RPN" ? "RPN" : id;
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      title={`${label} — klik za objašnjenje`}
      style={{
        background: aktivan ? `${boja}28` : C.hover,
        border: `1px solid ${aktivan ? boja : C.border}`,
        borderRadius: 999,
        color: aktivan ? boja : C.tekst,
        fontSize: kompakt ? 9 : 10,
        fontWeight: 700,
        padding: kompakt ? "3px 8px" : "4px 10px",
        cursor: "pointer",
        letterSpacing: 0.3,
        lineHeight: 1.2,
      }}
    >
      {label}
    </button>
  );
}

/** Red oblacića S · O · D · RPN · VSK · KSK · STD. */
export function MomentPfmeaOblaciciRed({ C, ids = MOMENT_PFMEA_OBLACICI, kompakt = false, naslov }) {
  const [otvoren, setOtvoren] = useState(null);

  const toggle = (id) => setOtvoren((t) => (t === id ? null : id));

  return (
    <div style={{ marginBottom: kompakt ? 6 : 10 }}>
      {naslov && (
        <div style={{ color: C.sivi, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>
          {naslov}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {ids.map((id) => (
          <MomentPfmeaOblacic
            key={id}
            C={C}
            id={id}
            aktivan={otvoren === id}
            onToggle={toggle}
            kompakt={kompakt}
          />
        ))}
        <span style={{ color: C.sivi, fontSize: 9 }}>
          {MOMENT_QS_TRQ_REF} · klik na slovo
        </span>
      </div>
      {otvoren && (
        <div style={{
          marginTop: 8,
          padding: "10px 12px",
          background: C.panel,
          border: `1px solid ${SKALA_BOJE[otvoren] || C.border}55`,
          borderRadius: 8,
          color: C.tekst,
          fontSize: 10,
          lineHeight: 1.45,
          maxWidth: 640,
        }}
        >
          {sadrzajOblacica(otvoren)}
        </div>
      )}
    </div>
  );
}

/** Samo S/O/D + kalkulator RPN i predlog klase (za formu klasifikacije). */
export function MomentPfmeaKalkulator({ C, s, o, d, onPredlog }) {
  const [vrednosti, setVrednosti] = useState({ s: s ?? "", o: o ?? "", d: d ?? "" });

  useEffect(() => {
    setVrednosti({
      s: s ?? "",
      o: o ?? "",
      d: d ?? "",
    });
  }, [s, o, d]);
  const rpn = izracunajMomentRpn(vrednosti.s, vrednosti.o, vrednosti.d);
  const predlog = predloziMomentKlasifikaciju(vrednosti.s, vrednosti.o, vrednosti.d);

  const INP = {
    width: 44,
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    color: C.tekst,
    fontSize: 11,
    padding: "4px 6px",
    textAlign: "center",
  };

  return (
    <div style={{
      marginTop: 6,
      padding: 8,
      background: C.hover,
      borderRadius: 6,
      border: `1px dashed ${C.border}`,
    }}
    >
      <MomentPfmeaOblaciciRed
        C={C}
        ids={["S", "O", "D", "RPN"]}
        kompakt
        naslov="PFMEA KALKULATOR (pomoć pri klasifikaciji)"
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
        {["s", "o", "d"].map((key, i) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.sivi }}>
            {["S", "O", "D"][i]}:
            <input
              type="number"
              min={1}
              max={10}
              value={vrednosti[key]}
              onChange={(e) => setVrednosti((p) => ({ ...p, [key]: e.target.value }))}
              style={INP}
            />
          </label>
        ))}
        {rpn != null && (
          <span style={{ fontSize: 10, color: C.plava, fontWeight: 700 }}>
            RPN = {rpn}
          </span>
        )}
        {predlog && (
          <button
            type="button"
            onClick={() => onPredlog?.(predlog)}
            style={{
              background: `${bojaKlasifikacije(C, predlog)}22`,
              border: `1px solid ${bojaKlasifikacije(C, predlog)}`,
              borderRadius: 6,
              color: bojaKlasifikacije(C, predlog),
              fontSize: 9,
              fontWeight: 700,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            Predlog: {predlog} → primeni
          </button>
        )}
      </div>
    </div>
  );
}

/** Puna metodologija — collapsible panel za šifrarnik. */
export function MomentPfmeaMetodologijaPanel({ C, defaultOpen = false }) {
  const [otvoren, setOtvoren] = useState(defaultOpen);

  return (
    <details
      open={otvoren}
      onToggle={(e) => setOtvoren(e.target.open)}
      style={{
        marginBottom: 12,
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <summary style={{
        cursor: "pointer",
        color: C.tekst,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.3,
        listStyle: "none",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
      >
        <span style={{ color: C.plava }}>ⓘ</span>
        METODOLOGIJA: PFMEA VEZA I CONTROL PLAN INTEGRACIJA
        <span style={{ color: C.sivi, fontWeight: 400, fontSize: 9 }}>({MOMENT_QS_TRQ_REF})</span>
      </summary>

      <div style={{ marginTop: 10, color: C.sivi, fontSize: 10, lineHeight: 1.55 }}>
        <p style={{ margin: "0 0 10px" }}>{MOMENT_PFMEA_SVRHA}</p>

        <MomentPfmeaOblaciciRed C={C} naslov="PFMEA SKALE I KLASIFIKACIJA" />

        {MOMENT_PFMEA_DODATNO.map((s) => (
          <div key={s.id} style={{ marginTop: 10 }}>
            <div style={{ color: C.tekst, fontWeight: 700, fontSize: 10, marginBottom: 4 }}>{s.naslov}</div>
            <div>{s.tekst}</div>
          </div>
        ))}
      </div>
    </details>
  );
}

/** Badge klase + uzorkovanje (linija / operator). */
export function MomentKlasifikacijaBadge({ C, klasifikacija, kompakt }) {
  const k = String(klasifikacija || "STD").trim().toUpperCase();
  const info = MOMENT_PFMEA_KLASA[k];
  const boja = bojaKlasifikacije(C, k);
  const uzork = uzorkovanjeZaKlasu(k);

  return (
    <div style={{
      display: "inline-flex",
      flexDirection: "column",
      alignItems: kompakt ? "center" : "flex-start",
      gap: 2,
    }}
    >
      <span style={{
        display: "inline-block",
        background: `${boja}18`,
        border: `1px solid ${boja}`,
        borderRadius: 6,
        color: boja,
        fontSize: kompakt ? 11 : 12,
        fontWeight: 700,
        padding: kompakt ? "2px 8px" : "3px 10px",
        letterSpacing: 0.5,
      }}
      >
        {k}
      </span>
      {uzork && !kompakt && (
        <span style={{ color: C.sivi, fontSize: 9, maxWidth: 280, lineHeight: 1.35 }}>
          {uzork}
        </span>
      )}
      {info && kompakt && (
        <span style={{ color: C.sivi, fontSize: 8, textAlign: "center", maxWidth: 120 }}>
          {k === "VSK" ? "100%" : k === "KSK" ? "AQL" : "period."}
        </span>
      )}
    </div>
  );
}
