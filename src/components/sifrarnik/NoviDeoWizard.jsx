import { useState } from "react";
import {
  GLAVNI_UNOS_SHEET_TIP,
  predlogNazivaSheeta,
} from "../../lib/glavniUnosSheetTip.js";
import { btnStyle, inpStyle } from "./sifrarnikPanelStyle.js";

const TIPOVI = [
  { id: GLAVNI_UNOS_SHEET_TIP.OPSTI, label: "Opšti deo", opis: "Nije vezano za vozilo (zavrtanj, lim…)" },
  { id: GLAVNI_UNOS_SHEET_TIP.PROJEKAT, label: "Deo projekta vozila", opis: "Komponenta na HAM/NTV projektu — tip_kontrole=deo" },
  { id: GLAVNI_UNOS_SHEET_TIP.FINAL, label: "Celo vozilo (final)", opis: "Finalna kontrola — tip_kontrole=vozilo" },
];

export default function NoviDeoWizard({
  C,
  sheetovi,
  onCancel,
  onKreirajSheet,
  onIzaberiSheet,
  onGrupniUnos,
  onFinalVozilo,
}) {
  const [korak, setKorak] = useState(1);
  const [tip, setTip] = useState(GLAVNI_UNOS_SHEET_TIP.PROJEKAT);
  const [erp, setErp] = useState("");
  const [sheetIme, setSheetIme] = useState("");
  const [kreira, setKreira] = useState(false);
  const INP = inpStyle(C);

  const predlog = predlogNazivaSheeta(tip, erp, sheetovi);

  const nastaviTip = () => {
    setSheetIme(predlog);
    setKorak(2);
  };

  const kreirajIliIzaberi = async (ime) => {
    const naziv = String(ime || sheetIme || predlog).trim().toLowerCase();
    if (!naziv) return;
    setKreira(true);
    try {
      if (!sheetovi.includes(naziv)) {
        await onKreirajSheet?.({
          naziv,
          sifraVozila: tip === GLAVNI_UNOS_SHEET_TIP.OPSTI ? null : erp.trim().toUpperCase(),
        });
      }
      onIzaberiSheet?.(naziv);
      if (tip === GLAVNI_UNOS_SHEET_TIP.FINAL) {
        onFinalVozilo?.();
      } else {
        onGrupniUnos?.();
      }
      onCancel?.();
    } finally {
      setKreira(false);
    }
  };

  return (
    <div style={{
      background: C.panel,
      border: `2px solid ${C.plava}66`,
      borderRadius: 8,
      padding: 14,
      marginBottom: 12,
    }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700 }}>
          Čarobnjak — novi deo (korak {korak}/2)
        </div>
        <button type="button" onClick={onCancel} style={{ background: "none", border: "none", color: C.sivi, cursor: "pointer" }}>
          ✕
        </button>
      </div>

      {korak === 1 && (
        <>
          <div style={{ color: C.sivi, fontSize: 10, marginBottom: 10 }}>Izaberi tip unosa:</div>
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            {TIPOVI.map((t) => (
              <label key={t.id} style={{
                display: "flex",
                gap: 10,
                padding: 10,
                borderRadius: 6,
                border: `1px solid ${tip === t.id ? C.plava : C.border}`,
                background: tip === t.id ? `${C.plava}15` : C.bg,
                cursor: "pointer",
              }}
              >
                <input type="radio" checked={tip === t.id} onChange={() => setTip(t.id)} />
                <span>
                  <strong style={{ color: C.tekst, fontSize: 11 }}>{t.label}</strong>
                  <span style={{ display: "block", color: C.sivi, fontSize: 9, marginTop: 2 }}>{t.opis}</span>
                </span>
              </label>
            ))}
          </div>
          {tip !== GLAVNI_UNOS_SHEET_TIP.OPSTI && (
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ color: C.sivi, fontSize: 9 }}>ERP šifra vozila *</span>
              <input value={erp} onChange={(e) => setErp(e.target.value.toUpperCase())}
                placeholder="HAM, NTV, MRAP…" style={{ ...INP, width: "100%", marginTop: 4 }} />
            </label>
          )}
          <button type="button" onClick={nastaviTip}
            disabled={tip !== GLAVNI_UNOS_SHEET_TIP.OPSTI && !erp.trim()}
            style={btnStyle(C, C.plava, { disabled: tip !== GLAVNI_UNOS_SHEET_TIP.OPSTI && !erp.trim() })}>
            Dalje → sheet
          </button>
        </>
      )}

      {korak === 2 && (
        <>
          <div style={{ color: C.sivi, fontSize: 10, marginBottom: 8 }}>
            Izaberi postojeći sheet ili kreiraj novi:
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {sheetovi.map((s) => (
              <button key={s} type="button" onClick={() => kreirajIliIzaberi(s)}
                style={btnStyle(C, sheetIme === s ? C.plava : C.hover, { fontSize: 9 })}>
                {s}
              </button>
            ))}
          </div>
          <label style={{ display: "block", marginBottom: 10 }}>
            <span style={{ color: C.sivi, fontSize: 9 }}>Novi sheet</span>
            <input value={sheetIme || predlog} onChange={(e) => setSheetIme(e.target.value)}
              style={{ ...INP, width: "100%", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setKorak(1)} style={btnStyle(C, C.hover)}>← Nazad</button>
            <button type="button" disabled={kreira} onClick={() => kreirajIliIzaberi(sheetIme || predlog)}
              style={btnStyle(C, C.plava, { disabled: kreira })}>
              {kreira ? "…" : "Koristi sheet →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
