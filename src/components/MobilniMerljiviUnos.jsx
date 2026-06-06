import { useEkran } from "../lib/useEkran.js";
import LinijaWizardNav, { KORACI_MERLJIVE_LINIJA, KORACI_MERLJIVE_KONTROLOR } from "./LinijaWizardNav.jsx";
import UnosPokaYokeKorak from "./UnosPokaYokeKorak.jsx";
import CrtezPregledPanel from "./CrtezPregledPanel.jsx";

/**
 * Modul 1 — merljive: punoekranski koraci kao kod atributivnih (ID → poka → unos).
 */
export default function MobilniMerljiviUnos({
  linijaKorak,
  setLinijaKorak,
  kontrolorLinija = false,
  idDeo,
  onIdChange,
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
  potrebanBroj,
  ucitava,
  poruka,
  idUcitano,
  unosKorak,
  setUnosKorak,
  korisnik,
  kontrolnaListaOk,
  kalUpozorenja,
  kalibracijaOdobrena,
  mozeAdmin,
  onToggleKalibracijaOdobrenje,
  onNoviDeo,
  slikaNaziv,
  urlSlike,
  C,
  children,
}) {
  const ekran = useEkran();
  const wizardKoraci = kontrolorLinija ? KORACI_MERLJIVE_KONTROLOR : KORACI_MERLJIVE_LINIJA;
  const korakWizardId = linijaKorak === 1 ? "id" : linijaKorak === 2 ? "poka" : "unos";

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

  const omot = (content) => (
    <div style={{
      padding: "10px 12px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      height: "100dvh",
      maxHeight: "100dvh",
      minHeight: 0,
      overflow: "hidden",
      background: C.bg,
      boxSizing: "border-box",
    }}>
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
    const mozeDalje = idUcitano && grupaAB && !ucitava;
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

        <div>
          <label style={LBL}>ID DELA <span style={{ color: C.border, fontWeight: 400 }}>(ili skeniraj)</span></label>
          <input
            value={idDeo}
            onChange={e => onIdChange(e.target.value.toUpperCase())}
            placeholder="npr. 5502-A"
            autoFocus
            style={{
              ...INP,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 4,
              textAlign: "center",
              padding: "22px 14px",
              borderColor: idUcitano ? C.zelena : idDeo.length > 2 ? C.crvena : C.border,
              background: idUcitano ? C.ok : idDeo.length > 2 ? C.nok : C.input,
            }}
          />
        </div>

        <label style={LBL}>Smena
          <select
            value={smena}
            onChange={e => setSmena(e.target.value)}
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
              {[["Linija", linija], ["Mašina", masina || "-"], ["RN", radniNalog || "-"], ["Merenja/kol.", potrebanBroj]].map(([l, v]) => (
                <div key={l} style={{ background: C.panel, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ color: C.sivi, fontSize: 10, marginBottom: 3 }}>{l}</div>
                  <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{
            background: C.panel,
            border: `2px dashed ${C.border}`,
            borderRadius: 14,
            padding: 36,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📷</div>
            <div style={{ color: C.sivi, fontSize: 13 }}>Skeniraj barkod ili unesi ID dela</div>
          </div>
        )}

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

        {ucitava && (
          <div style={{ color: C.sivi, fontSize: 12, textAlign: "center" }}>Učitavam karakteristike…</div>
        )}

        {idUcitano && (
          <CrtezPregledPanel
            modul="merljive"
            slikaNaziv={slikaNaziv}
            urlDirect={urlSlike}
            idDeo={String(idDeo || "").toUpperCase()}
            C={C}
            kompakt
            visina={Math.min(240, Math.max(180, Math.round(ekran.h * 0.24)))}
            akcent={C.zelena}
          />
        )}

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={() => { setUnosKorak("poka"); setLinijaKorak(2); }}
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
    );
  }

  if (linijaKorak === 2) {
    return omot(
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
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
          mozeAdmin={mozeAdmin}
          onToggleKalibracijaOdobrenje={onToggleKalibracijaOdobrenje}
          onDalje={() => { setUnosKorak("forma"); setLinijaKorak(3); }}
          daljeLabel="Unos merenja →"
          prikaziNazad
          onNazad={() => setLinijaKorak(1)}
        />
      </div>,
    );
  }

  return omot(
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      overflow: "hidden",
      gap: 8,
    }}>
      {children}
    </div>,
  );
}
