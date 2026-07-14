import { DIM_GENERALIJE_RED, flexPolje } from "../../layout/index.js";
import IdDeoBarkodRed from "../IdDeoBarkodRed.jsx";
import SmenaAutoPrikaz from "../SmenaAutoPrikaz.jsx";
import PogonIzborPanel from "../PogonIzborPanel.jsx";
import { labelPogona } from "../../lib/pogonSop.js";

export default function MerljiveGeneralijeRed({
  C,
  lbl,
  inp,
  datum,
  setDatum,
  smena,
  obradiBarkodSken,
  idBarkodPolje,
  idDeo,
  potvrdiIdDeo,
  nalogUcitava,
  radniNalog,
  nalogInfo,
  dostupniPogoni,
  omoguceniPogoni,
  pogonKod,
  onPogonChange,
  trebaIzborPogona,
  nazivDela,
  linija,
  kontrolor,
  masina,
  grupe,
  grupaAB,
  sacuvaneGrupe,
  indeksAktivne,
  onGrupaChange,
  faiRezimAktivan,
  brojFaiDimenzija,
}) {
  const G = DIM_GENERALIJE_RED;
  const lblGen = { ...lbl, ...G.label, letterSpacing: 0.6 };
  const inpGen = {
    ...inp,
    fontSize: G.input.fontSize,
    padding: G.input.padding,
    borderRadius: G.input.borderRadius,
    lineHeight: G.input.lineHeight,
    height: G.input.visina,
    minHeight: G.input.visina,
    maxHeight: G.input.visina,
    boxSizing: "border-box",
  };

  return (
    <div style={{
      display: "flex",
      flexWrap: "nowrap",
      gap: G.gap,
      alignItems: "flex-end",
      marginBottom: 6,
      flexShrink: 0,
      width: "100%",
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      <label style={{ ...lblGen, ...flexPolje(G.polja.datum) }}>
        Datum
        <input style={inpGen} value={datum} onChange={e => setDatum(e.target.value)} />
      </label>
      <div style={flexPolje(G.polja.smena)}>
        <SmenaAutoPrikaz smena={smena} C={C} lblStyle={lblGen} inpStyle={inpGen} />
      </div>
      <div style={flexPolje(G.polja.idDeo)}>
        <IdDeoBarkodRed
          C={C}
          akcent={C.zelena}
          onBarkodSken={obradiBarkodSken}
          lblStyle={lblGen}
          idLabel="ID deo *"
          kompaktRed
          sirinaBarkod={G.kamera.sirina}
          razmakKolona={G.kamera.razmakOdId}
          unosStil={{
            borderRadius: G.input.borderRadius,
            padding: G.input.padding,
            fontSize: G.input.fontSize,
          }}
        >
          <input
            data-testid="merenje-id-deo"
            style={{ ...inpGen, letterSpacing: 0.5, textAlign: "center" }}
            value={idDeo}
            {...idBarkodPolje}
            onBlur={e => potvrdiIdDeo(e.target.value)}
            placeholder="5502-A"
            title="Ručni unos, USB čitač ili 📷 kamera"
          />
        </IdDeoBarkodRed>
      </div>
      <label style={{ ...lblGen, ...flexPolje(G.polja.radniNalog) }}>
        Radni nalog
        <input
          style={inpGen}
          value={nalogUcitava ? "…" : (radniNalog || "—")}
          readOnly
          title={[
            nalogInfo?.kupac && `Kupac: ${nalogInfo.kupac}`,
            nalogInfo?.rok_isporuke && `Rok: ${nalogInfo.rok_isporuke}`,
          ].filter(Boolean).join(" · ") || undefined}
        />
      </label>
      {(nalogInfo?.kupac || nalogInfo?.rok_isporuke) && (
        <div style={{
          flex: "1 1 100%",
          fontSize: 9,
          color: C.sivi,
          lineHeight: 1.35,
          padding: "2px 4px",
        }}>
          {nalogInfo.kupac && <span>Kupac: <strong style={{ color: C.tekst }}>{nalogInfo.kupac}</strong></span>}
          {nalogInfo.kupac && nalogInfo.rok_isporuke && " · "}
          {nalogInfo.rok_isporuke && <span>Rok isporuke: <strong style={{ color: C.tekst }}>{nalogInfo.rok_isporuke}</strong></span>}
        </div>
      )}
      {dostupniPogoni.length > 1 && (
        <div style={{ flex: "0 0 auto", minWidth: 200, maxWidth: 320 }}>
          <PogonIzborPanel
            C={C}
            pogoni={dostupniPogoni}
            omoguceniPogoni={omoguceniPogoni}
            pogonKod={pogonKod}
            onIzaberi={onPogonChange}
            kompakt
            obavezan={trebaIzborPogona}
          />
        </div>
      )}
      {pogonKod && dostupniPogoni.length <= 1 && (
        <label style={{ ...lblGen, flex: "0 0 auto", minWidth: 0 }}>
          Pogon
          <input style={inpGen} value={labelPogona(pogonKod)} readOnly />
        </label>
      )}
      <label style={{ ...lblGen, ...flexPolje(G.polja.nazivDela) }}>
        Naziv dela
        <input style={inpGen} value={nazivDela} readOnly />
      </label>
      <label style={{ ...lblGen, ...flexPolje(G.polja.linija) }}>
        Linija
        <input style={inpGen} value={linija} readOnly />
      </label>
      <label style={{ ...lblGen, ...flexPolje(G.polja.kontrolor) }}>
        Kontrolor
        <input style={inpGen} value={kontrolor} readOnly />
      </label>
      <label style={{ ...lblGen, ...flexPolje(G.polja.masina) }}>
        Mašina
        <input style={inpGen} value={masina || "-"} readOnly />
      </label>
      <label style={{ ...lblGen, flex: "0 0 auto", minWidth: 0 }}>
        Serija
        <div style={{ display: "flex", gap: 3, flexWrap: "nowrap" }}>
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
                title={zakljucana ? `Prvo završi seriju ${grupe[idx - 1] || "prethodnu"}` : g}
                style={{
                  ...inpGen,
                  width: "auto",
                  minWidth: 26,
                  padding: "4px 6px",
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
          {!grupe.length && <span style={{ color: C.sivi, fontSize: 10 }}>—</span>}
        </div>
      </label>
      {faiRezimAktivan && (
        <div style={{
          flex: "0 0 auto",
          alignSelf: "center",
          background: `${C.zuta}18`,
          border: `1px solid ${C.zuta}55`,
          borderRadius: 6,
          padding: "6px 10px",
          maxWidth: 280,
        }}>
          <div style={{ color: C.zuta, fontSize: 10, fontWeight: 700 }}>FAI — prvo parče 1</div>
          <div style={{ color: C.sivi, fontSize: 9, marginTop: 2, lineHeight: 1.35 }}>
            <code style={{ fontSize: 9 }}>nivo_kontrole = DA</code>
            {" "}· {brojFaiDimenzija} dim.
          </div>
        </div>
      )}
    </div>
  );
}
