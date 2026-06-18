import CrtezPregledPanel from "./CrtezPregledPanel.jsx";
import PlanUzorkovanjaPanel from "./PlanUzorkovanjaPanel.jsx";
import { useMemo } from "react";
import IdDeoBarkodRed from "./IdDeoBarkodRed.jsx";
import PogonIzborPanel from "./PogonIzborPanel.jsx";
import { idBarkodInputHandleri } from "../lib/barkod.js";

/** Levi panel — modul linija merljive (ID / poka; crtež ispod generalija). */
export default function MerljiveLinijaLeviPanel({
  C,
  idDeo,
  onIdChange,
  onIdPotvrdi,
  onBarkodSken,
  smena,
  setSmena,
  grupe,
  grupaAB,
  onGrupaChange,
  sacuvaneGrupe,
  indeksAktivne,
  idUcitano,
  nazivDela,
  linija,
  masina,
  radniNalog,
  potrebanBroj,
  preostaloSesije,
  ciljSesije,
  planUzorkovanja,
  ucestalostPlan,
  poruka,
  dostupniPogoni = [],
  omoguceniPogoni = null,
  pogonKod = "",
  onPogonChange,
  trebaIzborPogona = false,
  onNoviDeo,
  slikaNaziv,
  urlSlike,
}) {
  const idBarkodPolje = useMemo(
    () => idBarkodInputHandleri(onBarkodSken, {
      postaviId: (v) => onIdChange(v.toUpperCase()),
      potvrdiId: (v) => onIdPotvrdi?.(v),
      upperCase: true,
    }),
    [onBarkodSken, onIdChange, onIdPotvrdi],
  );

  const LBL = { color: C.sivi, fontSize: 9, letterSpacing: 1.5, marginBottom: 4, display: "block" };
  const INP = {
    width: "100%",
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 12,
    padding: "9px 11px",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };
  const BTN = (bg, dis = false) => ({
    background: dis ? C.hover : bg,
    border: "none",
    borderRadius: 6,
    color: dis ? C.sivi : "#fff",
    fontSize: 12,
    fontWeight: 700,
    padding: "10px 0",
    cursor: dis ? "not-allowed" : "pointer",
    letterSpacing: 1,
    width: "100%",
    opacity: dis ? 0.5 : 1,
  });

  return (
    <div style={{
      borderRight: `1px solid ${C.border}`,
      padding: 12,
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}>
      <IdDeoBarkodRed
        C={C}
        akcent={C.zelena}
        onBarkodSken={onBarkodSken}
        lblStyle={LBL}
        idLabel="ID deo"
        kompaktRed
        sirinaBarkod={32}
        unosStil={{ borderRadius: 6, padding: "9px 11px", fontSize: 12 }}
      >
        <input
          value={idDeo}
          {...idBarkodPolje}
          onBlur={e => onIdPotvrdi?.(e.target.value)}
          placeholder="5502-A"
          title="Ručni unos, USB čitač ili veb kamera"
          style={{
            ...INP,
            borderColor: idUcitano ? C.zelena : idDeo.length > 2 ? C.crvena : C.border,
            background: idUcitano ? C.ok : idDeo.length > 2 ? C.nok : C.input,
            fontWeight: 700,
            letterSpacing: 1,
            textAlign: "center",
          }}
        />
      </IdDeoBarkodRed>
      <div>
        <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>Radni nalog</div>
        <input
          value={radniNalog || "—"}
          readOnly
          style={{
            ...INP,
            fontWeight: 700,
            letterSpacing: 0.5,
            textAlign: "center",
            color: radniNalog ? C.tekst : C.sivi,
          }}
        />
      </div>
      {dostupniPogoni.length > 1 && (
        <PogonIzborPanel
          C={C}
          pogoni={dostupniPogoni}
          omoguceniPogoni={omoguceniPogoni}
          pogonKod={pogonKod}
          onIzaberi={onPogonChange}
          kompakt
          obavezan={trebaIzborPogona}
        />
      )}
      <div>
        {idUcitano && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
            {[["Linija", linija], ["Mašina", masina || "-"]].map(([l, v]) => (
              <div key={l} style={{
                background: C.panel,
                border: `1px solid ${C.zelena}30`,
                borderRadius: 5,
                padding: "4px 6px",
                fontSize: 9,
              }}>
                <span style={{ color: C.sivi }}>{l}: </span>
                <span style={{ color: C.tekst, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
        {poruka && (
          <div style={{
            color: C.crvena,
            fontSize: 9,
            marginTop: 6,
            padding: "6px 8px",
            background: C.nok,
            borderRadius: 4,
            lineHeight: 1.3,
          }}>
            {poruka}
          </div>
        )}
      </div>

      <label style={LBL}>Smena
        <select style={INP} value={smena} onChange={e => setSmena(e.target.value)}>
          {["1", "2", "3"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      {idUcitano && (
        <div style={{ background: C.ok, border: `1px solid ${C.zelena}26`, borderRadius: 6, padding: 8 }}>
          <div style={{ color: C.zelena, fontWeight: 700, fontSize: 10, marginBottom: 6, lineHeight: 1.3 }}>
            {nazivDela}
          </div>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 4 }}>RN: {radniNalog || "—"}</div>
          <div style={{ color: C.sivi, fontSize: 9, marginBottom: 6 }}>
            {potrebanBroj} merenja/kolona
          </div>
          {ciljSesije > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 4 }}>
              <span style={{ color: C.sivi }}>Preost. serija</span>
              <span style={{ color: preostaloSesije === 0 ? C.zelena : C.zuta, fontWeight: 700 }}>
                {preostaloSesije}/{ciljSesije}
              </span>
            </div>
          )}
          <PlanUzorkovanjaPanel C={C} plan={planUzorkovanja} ucestalost={ucestalostPlan} />
        </div>
      )}

      <label style={LBL}>Serija
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {grupe.map((g) => {
            const idx = grupe.indexOf(g);
            const aktivna = g === grupaAB;
            const zavrsena = sacuvaneGrupe.includes(g);
            const zakljucana = idx > indeksAktivne && !zavrsena;
            return (
              <button
                key={g}
                type="button"
                disabled={zakljucana}
                onClick={() => !zakljucana && onGrupaChange(g)}
                style={{
                  ...INP,
                  width: "auto",
                  minWidth: 32,
                  padding: "4px 8px",
                  cursor: zakljucana ? "not-allowed" : "pointer",
                  opacity: zakljucana ? 0.4 : 1,
                  borderColor: aktivna ? C.zelena : zavrsena ? C.plava : C.border,
                  background: aktivna ? `${C.zelena}22` : C.input,
                  fontWeight: aktivna ? 700 : 400,
                }}
              >
                {g}{zavrsena ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      </label>

      {idUcitano && (
        <CrtezPregledPanel
          modul="merljive"
          slikaNaziv={slikaNaziv}
          urlDirect={urlSlike}
          idDeo={String(idDeo || "").toUpperCase()}
          C={C}
          punPanel
          visina={200}
          akcent={C.zelena}
        />
      )}

      <button type="button" onClick={onNoviDeo}
        style={{ ...BTN(C.hover), border: `1px solid ${C.border}`, color: C.sivi, marginTop: "auto" }}>
        ↺ Novi deo
      </button>
    </div>
  );
}
