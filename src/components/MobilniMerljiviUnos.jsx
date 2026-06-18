import { useEffect, useRef, useMemo } from "react";
import { idBarkodInputHandleri } from "../lib/barkod.js";
import { useEkran, resetSkrolPosleRotacije } from "../lib/useEkran.js";
import { stilOmotLinija, onFocusTastatura } from "../layout/tastaturaMobil.js";
import { dp } from "../layout/dp.js";
import { TELEFON } from "../layout/tokens/telefon.js";
import { TABLET } from "../layout/tokens/tablet.js";
import IdDeoBarkodRed from "./IdDeoBarkodRed.jsx";
import LinijaWizardNav, { KORACI_MERLJIVE_LINIJA, KORACI_MERLJIVE_KONTROLOR } from "./LinijaWizardNav.jsx";
import UnosPokaYokeKorak from "./UnosPokaYokeKorak.jsx";
import FaiLinijaKorak from "./FaiLinijaKorak.jsx";
import { KontrolnaLista } from "../lib/kontrolaSesije.jsx";
import CrtezPregledPanel from "./CrtezPregledPanel.jsx";
import PogonIzborPanel from "./PogonIzborPanel.jsx";
import { idSpremanZaUcitavanje } from "../lib/varijabilneUtils.js";

/**
 * Modul 1 — merljive: punoekranski koraci kao kod atributivnih (ID → poka → unos).
 */
export default function MobilniMerljiviUnos({
  linijaKorak,
  setLinijaKorak,
  kontrolorLinija = false,
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
  nazivDela,
  linija,
  masina,
  radniNalog,
  nalogInfo = null,
  potrebanBroj,
  ucitava,
  poruka,
  dostupniPogoni = [],
  omoguceniPogoni = null,
  pogonKod = "",
  onPogonChange,
  trebaIzborPogona = false,
  idUcitano,
  unosKorak,
  setUnosKorak,
  korisnik,
  kontrolnaListaOk,
  onKontrolnaListaZavrsena,
  kalUpozorenja,
  kalibracijaOdobrena,
  kalibracijaCeka,
  mozeAdmin,
  onToggleKalibracijaOdobrenje,
  onZahtevKalibracija,
  onNoviDeo,
  slikaNaziv,
  urlSlike,
  kolone = [],
  koloneFai = [],
  faiPotreban = true,
  onFaiOdobreno,
  C,
  children,
}) {
  const ekran = useEkran();
  const { viewportKey } = ekran;
  const idInputRef = useRef(null);

  const idBarkodPolje = useMemo(
    () => idBarkodInputHandleri(onBarkodSken, {
      postaviId: (v) => onIdChange(v.toUpperCase()),
      potvrdiId: (v) => onIdPotvrdi?.(v),
      upperCase: true,
    }),
    [onBarkodSken, onIdChange, onIdPotvrdi],
  );

  useEffect(() => {
    resetSkrolPosleRotacije();
  }, [viewportKey]);
  const wizardKoraci = kontrolorLinija ? KORACI_MERLJIVE_KONTROLOR : KORACI_MERLJIVE_LINIJA;
  const korakWizardId = linijaKorak === 1 ? "id"
    : linijaKorak === 2 ? "poka"
    : linijaKorak === 3 ? "fai"
    : "unos";

  const INP = {
    width: "100%",
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    color: C.tekst,
    fontSize: ekran.linijaUredjaj ? 18 : 16,
    padding: "16px 14px",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  };
  const BIG_BTN = (bg, dis = false) => ({
    background: dis ? C.hover : bg,
    border: "none",
    borderRadius: 14,
    color: dis ? C.sivi : "#fff",
    fontSize: 18,
    fontWeight: 700,
    padding: "20px",
    cursor: dis ? "not-allowed" : "pointer",
    width: "100%",
    opacity: dis ? 0.5 : 1,
  });
  const LBL = {
    color: C.sivi,
    fontSize: 12,
    letterSpacing: 1.3,
    marginBottom: 8,
    display: "block",
  };

  const omot = (content, { skrol = false } = {}) => (
    <div
      key={viewportKey}
      style={{ ...stilOmotLinija(ekran, { skrol }), background: C.bg }}
    >
      <LinijaWizardNav
        korak={korakWizardId}
        koraci={wizardKoraci}
        C={C}
        akcent={C.zelena}
        kompakt
      />
      {content}
    </div>
  );

  if (linijaKorak === 1) {
    const mozeDalje = idUcitano && grupaAB && !ucitava && kontrolnaListaOk;
    return omot(
      <>
        {poruka && (
          <div style={{
            background: poruka.includes("uspešno") || poruka.includes("sačuvana") ? C.ok : C.nok,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12,
            color: poruka.includes("nije") ? C.crvena : C.tekst,
          }}>
            {poruka}
          </div>
        )}

        <IdDeoBarkodRed
          C={C}
          akcent={C.zelena}
          onBarkodSken={onBarkodSken}
          lblStyle={LBL}
          idLabel="ID deo"
          kompaktRed
          sirinaBarkod={52}
          unosStil={{ borderRadius: 12, padding: "22px 14px", fontSize: 28 }}
        >
          <input
            ref={idInputRef}
            value={idDeo}
            {...idBarkodPolje}
            onFocus={onFocusTastatura}
            onBlur={e => onIdPotvrdi?.(e.target.value)}
            placeholder="npr. 5502-A"
            autoFocus
            style={{
              ...INP,
              width: "100%",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 4,
              textAlign: "center",
              padding: "22px 14px",
              borderColor: idUcitano ? C.zelena : idDeo.length > 2 ? C.crvena : C.border,
              background: idUcitano ? C.ok : idDeo.length > 2 ? C.nok : C.input,
            }}
          />
        </IdDeoBarkodRed>

        <label style={LBL}>Radni nalog
          <input
            value={ucitava ? "…" : (radniNalog || "—")}
            readOnly
            placeholder="RN-2026-NM001-B"
            style={{
              ...INP,
              fontSize: 16,
              padding: "14px",
              fontWeight: 700,
              letterSpacing: 0.5,
              color: radniNalog ? C.tekst : C.sivi,
            }}
          />
        </label>

        {dostupniPogoni.length > 1 && (
          <PogonIzborPanel
            C={C}
            akcent={C.zelena}
            pogoni={dostupniPogoni}
            omoguceniPogoni={omoguceniPogoni}
            pogonKod={pogonKod}
            onIzaberi={onPogonChange}
            obavezan={trebaIzborPogona}
          />
        )}

        <label style={LBL}>Smena
          <select
            value={smena}
            onChange={e => setSmena(e.target.value)}
            onFocus={onFocusTastatura}
            style={{ ...INP, fontSize: 16, padding: "14px" }}
          >
            {["1", "2", "3"].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        {idUcitano ? (
          <div style={{ background: C.ok, border: `1px solid ${C.zelena}30`, borderRadius: 14, padding: 16 }}>
            <div style={{ color: C.zelena, fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
              ✓ {nazivDela}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[["Linija", linija], ["Mašina", masina || "-"], ["RN", radniNalog || "—"], ["Merenja/kol.", potrebanBroj]].map(([l, v]) => (
                <div key={l} style={{ background: C.panel, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ color: C.sivi, fontSize: 10, marginBottom: 3 }}>{l}</div>
                  <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
            {nalogInfo?.kupac && (
              <div style={{ color: C.sivi, fontSize: 11, marginTop: 8 }}>
                Kupac: {nalogInfo.kupac}
                {nalogInfo.rok_isporuke ? ` · rok ${nalogInfo.rok_isporuke}` : ""}
              </div>
            )}
          </div>
        ) : null}

        {grupe.length > 0 && (
          <div>
            <label style={LBL}>Serija (A / B)</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                      flex: 1,
                      minWidth: 72,
                      background: aktivna ? `${C.zelena}22` : C.input,
                      border: `2px solid ${aktivna ? C.zelena : zavrsena ? C.plava : C.border}`,
                      borderRadius: 12,
                      color: aktivna ? C.zelena : C.tekst,
                      fontSize: 18,
                      fontWeight: 700,
                      padding: "16px 12px",
                      cursor: zakljucana ? "not-allowed" : "pointer",
                      opacity: zakljucana ? 0.4 : 1,
                    }}
                  >
                    {g}{zavrsena ? " ✓" : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {ucitava && !poruka && (
          <div style={{ color: C.sivi, fontSize: 12, textAlign: "center" }}>Učitavam karakteristike…</div>
        )}

        {idDeo && idSpremanZaUcitavanje(String(idDeo)) && !idUcitano && !ucitava && !poruka && (
          <div style={{ color: C.sivi, fontSize: 12, textAlign: "center", marginBottom: 12 }}>
            Učitavam deo…
          </div>
        )}

        {idDeo && idSpremanZaUcitavanje(String(idDeo)) && !idUcitano && poruka && (
          <div style={{
            background: `${C.crvena}12`,
            border: `2px solid ${C.crvena}`,
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
            textAlign: "center",
          }}>
            <div style={{ color: C.crvena, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
              ⚠ Merljive karakteristike nisu učitane
            </div>
            <div style={{ color: C.tekst, fontSize: 11, lineHeight: 1.5 }}>
              {poruka || "Admin → uvezi SPC_merljive.xlsx (tab karakteristike_merljive), pa Ctrl+F5."}
            </div>
          </div>
        )}

        {idUcitano && (
          <CrtezPregledPanel
            modul="merljive"
            slikaNaziv={slikaNaziv}
            urlDirect={urlSlike}
            idDeo={String(idDeo || "").toUpperCase()}
            C={C}
            kompakt
            visina={dp(ekran.tablet ? TABLET.crtezVisinaDno : TELEFON.crtezVisinaDno, ekran)}
            akcent={C.zelena}
          />
        )}

        {idUcitano && !kontrolnaListaOk && (
          <div style={{ marginBottom: 12 }}>
            <KontrolnaLista
              korisnik={korisnik}
              smena={Number(smena)}
              idDeo={String(idDeo || "").trim().toUpperCase()}
              naslovModul="Merljive"
              akcent={C.zelena}
              onZavrsena={onKontrolnaListaZavrsena}
              C={C}
              ugradjen
            />
          </div>
        )}

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={() => {
            if (!mozeDalje) return;
            const v = idInputRef.current?.value ?? idDeo;
            onIdPotvrdi?.(v);
            setUnosKorak("poka");
            setLinijaKorak(2);
          }}
          disabled={!mozeDalje}
          style={BIG_BTN(C.zelena, !mozeDalje)}
        >
          Poka-yoke →
        </button>
        <button
          type="button"
          onClick={onNoviDeo}
          style={{
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            color: C.sivi,
            fontSize: 14,
            padding: "14px",
            cursor: "pointer",
            width: "100%",
          }}
        >
          ↺ Novi deo
        </button>
      </>,
      { skrol: true },
    );
  }

  if (linijaKorak === 2) {
    return omot(
      <div key={viewportKey} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <UnosPokaYokeKorak
          C={C}
          modul="merljive"
          akcent={C.zelena}
          idDeo={idDeo}
          nazivDela={nazivDela}
          radniNalog={radniNalog}
          linija={linija}
          masina={masina}
          kontrolor={korisnik?.ime}
          grupaAB={grupaAB}
          potrebanBroj={potrebanBroj}
          kalUpozorenja={kalUpozorenja}
          kontrolnaListaOk={kontrolnaListaOk}
          kalibracijaOdobrena={kalibracijaOdobrena}
          kalibracijaCeka={kalibracijaCeka}
          mozeAdmin={mozeAdmin}
          onToggleKalibracijaOdobrenje={onToggleKalibracijaOdobrenje}
          onZahtevKalibracija={onZahtevKalibracija}
          onDalje={() => {
            if (!kontrolnaListaOk) return;
            if (faiPotreban) {
              setLinijaKorak(3);
            } else {
              setUnosKorak("forma");
              setLinijaKorak(4);
            }
          }}
          daljeLabel={faiPotreban ? "FAI (prvo parče) →" : "Unos merenja →"}
          prikaziNazad
          onNazad={() => setLinijaKorak(1)}
        />
      </div>,
      { skrol: true },
    );
  }

  if (linijaKorak === 3 && faiPotreban) {
    return omot(
      <div key={viewportKey} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <FaiLinijaKorak
          C={C}
          korisnik={korisnik}
          idDeo={idDeo}
          pogonKod={pogonKod}
          radniNalog={radniNalog}
          smena={smena}
          koloneFai={koloneFai}
          onOdobreno={(rec) => {
            onFaiOdobreno?.(rec);
            setUnosKorak("forma");
            setLinijaKorak(4);
          }}
        />
        <button type="button" onClick={() => setLinijaKorak(2)}
          style={{ ...BIG_BTN(C.hover), margin: "0 16px 16px", fontSize: 14, padding: 14 }}>
          ← Nazad na poka-yoke
        </button>
      </div>,
      { skrol: true },
    );
  }

  if (!kontrolnaListaOk) {
    return omot(
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        textAlign: "center",
        color: C.zuta,
        fontSize: 13,
      }}>
        Završite kontrolnu listu smene pre unosa merenja.
      </div>,
    );
  }

  return omot(
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      overflow: ekran.tastaturaOtvorena ? "auto" : "hidden",
      WebkitOverflowScrolling: ekran.tastaturaOtvorena ? "touch" : undefined,
      gap: 8,
    }}>
      {children}
    </div>,
    { skrol: ekran.tastaturaOtvorena },
  );
}
