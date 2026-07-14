import {
  koristiUgaoUnosKolone,
  labelSerije,
  unosKaoUgao,
} from "../../lib/varijabilneUtils.js";
import DigitalnoMeriloPanel from "../DigitalnoMeriloPanel.jsx";
import FaiUnosTraka from "../FaiUnosTraka.jsx";
import CrtezZoomViewer from "../CrtezZoomViewer.jsx";
import MerljivaMobTabKarusel from "../MerljivaMobTabKarusel.jsx";
import TastaturaBrojeviMerljive from "../TastaturaBrojeviMerljive.jsx";
import MerljiveKolonaKartica from "./MerljiveKolonaKartica.jsx";

export default function MerljiveUnosFormaBlok({
  C,
  ekran,
  L,
  digitalniUnos,
  meriloPovezano,
  desktopUnos,
  kolone,
  setKolone,
  potrebanBroj,
  aktivnaKolona,
  setAktivnaKolona,
  addToast,
  onMeriloPovezanChange,
  registerMeriloStop,
  registerMeriloSimuliraj,
  autoSnimiMerilo,
  onAutoSnimiMeriloChange,
  onMerenjeDodatoSaMerila,
  koristiTastMerenja,
  tastMerenjaVidljiva,
  kolonaJePuna,
  faiRezimAktivan,
  metaAktivneSerije,
  grupaAB,
  ciljSesije,
  preostaloSesije,
  idDeo,
  brojFaiDimenzija,
  faiKompletno,
  snima,
  mozeOdobriFai,
  faiPaginacija,
  promeniFaiStranicu,
  sacuvajFai,
  kpiPanelBlok,
  prekidOdobrenId,
  imaNepotpunuSesiju,
  zoomSlika,
  setZoomSlika,
  urlSlike,
  slika,
  mobDugmadAkcije,
  dugmadSerije,
  viewportKey,
  faiStranica,
  prikazIndeksKolone,
  idiPrethodnaKolonaMob,
  idiSledecaKolonaMob,
  mobSerijaStatus,
  kolonaZaSlot,
  kolonaKarticaProps,
  primeniTastaturuMerenja,
  gotovoDodajTastMerenja,
}) {
  const renderKolonaKartica = (k, i, kompakt) => (
    <MerljiveKolonaKartica k={k} i={i} kompakt={kompakt} {...kolonaKarticaProps} />
  );
  const aktivnaKol = aktivnaKolona >= 0 ? kolone[aktivnaKolona] : null;
  const prikaziTastMerenja = koristiTastMerenja
    && tastMerenjaVidljiva
    && aktivnaKol
    && aktivnaKol.naziv !== "-"
    && !kolonaJePuna(aktivnaKol);
  const ugaoTast = aktivnaKol && (
    koristiUgaoUnosKolone(aktivnaKol)
    || unosKaoUgao(aktivnaKol.jedinica, aktivnaKol.input, aktivnaKol.lslDec, aktivnaKol.uslDec)
  );
  const poljaMerenjaOtvorena = !digitalniUnos || meriloPovezano;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: L.mobTabKarusel ? 0 : (desktopUnos ? 0 : undefined),
      height: desktopUnos || L.mobTabKarusel ? "100%" : undefined,
      overflow: "hidden",
    }}
    >
      {digitalniUnos && (
        <DigitalnoMeriloPanel
          C={C}
          kolone={kolone}
          setKolone={setKolone}
          potrebanBroj={potrebanBroj}
          aktivnaKolona={aktivnaKolona}
          setAktivnaKolona={setAktivnaKolona}
          addToast={addToast}
          kompakt={ekran.telefon}
          onPovezanChange={onMeriloPovezanChange}
          registerStop={registerMeriloStop}
          registerSimuliraj={registerMeriloSimuliraj}
          autoSnimi={autoSnimiMerilo}
          onAutoSnimiChange={onAutoSnimiMeriloChange}
          onMerenjeDodato={onMerenjeDodatoSaMerila}
        />
      )}
      {digitalniUnos && !meriloPovezano && (
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
        }}
        >
          <div style={{ maxWidth: 360 }}>
            <div style={{ color: C.plava, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              Povežite digitalno merilo
            </div>
            <div style={{ color: C.sivi, fontSize: 11, lineHeight: 1.55 }}>
              Izaberi način iznad — <strong style={{ color: C.tekst }}>USB / Serial</strong>,{" "}
              <strong style={{ color: C.tekst }}>Bluetooth</strong>,{" "}
              <strong style={{ color: C.tekst }}>WiFi</strong> ili{" "}
              <strong style={{ color: C.tekst }}>Simulacija</strong> — polja za unos
              otvaraju se automatski posle povezivanja.
            </div>
          </div>
        </div>
      )}
      {poljaMerenjaOtvorena && (
        <>
          {!L.mobTabKarusel && !faiRezimAktivan && (
            <div style={{ fontSize: 10, color: C.zuta, marginBottom: 4, flexShrink: 0, flex: "0 0 auto" }}>
              {metaAktivneSerije ? labelSerije(metaAktivneSerije) : `Serija ${grupaAB}`}
              : unesi {potrebanBroj} merenja po koloni, pa Sačuvaj.
              {ciljSesije > 0 && (
                <span style={{ color: C.sivi }}> · Preostalo serija: {preostaloSesije} / {ciljSesije}</span>
              )}
            </div>
          )}
          {faiRezimAktivan && (
            <FaiUnosTraka
              C={C}
              idDeo={idDeo}
              brojDimenzija={brojFaiDimenzija}
              kompletno={faiKompletno}
              snima={snima}
              mozeOdobri={mozeOdobriFai}
              stranica={faiPaginacija?.stranica ?? 0}
              ukupnoStranica={faiPaginacija?.ukupnoStranica ?? 1}
              onPrethodnaStranica={() => promeniFaiStranicu(Math.max(0, (faiPaginacija?.stranica ?? 0) - 1))}
              onSledecaStranica={() => promeniFaiStranicu(
                Math.min((faiPaginacija?.ukupnoStranica ?? 1) - 1, (faiPaginacija?.stranica ?? 0) + 1),
              )}
              onSacuvaj={sacuvajFai}
              onOdobri={() => sacuvajFai(true)}
              sacuvajLabel={mozeOdobriFai ? "Sačuvaj i odobri" : "Sačuvaj FAI"}
              kompakt={L.mobTabKarusel}
            />
          )}
          {kpiPanelBlok}
          {prekidOdobrenId && imaNepotpunuSesiju && (
            <div style={{
              background: C.ok, border: `1px solid ${C.zelena}`, borderRadius: 6,
              padding: "8px 10px", fontSize: 10, color: C.zelena, fontWeight: 700, marginBottom: 6,
            }}
            >
              ✓ Prekid odobren — možete sačuvati nepotpunu seriju
            </div>
          )}
          {zoomSlika && urlSlike && (
            <div role="presentation" onClick={() => setZoomSlika(false)}
              style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.88)", display: "flex", flexDirection: "column", padding: 16 }}>
              <div role="presentation" onClick={(e) => e.stopPropagation()}
                style={{ flex: 1, background: C.panel, borderRadius: 10, border: `1px solid ${C.border}`, padding: 12, minHeight: 0, display: "flex", flexDirection: "column" }}>
                <CrtezZoomViewer url={urlSlike} C={C} onClose={() => setZoomSlika(false)} />
              </div>
            </div>
          )}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            gap: L.mobTabKarusel ? 4 : 8,
            overflow: "hidden",
          }}
          >
            {L.mobTabKarusel ? (
              <>
                {mobDugmadAkcije}
                <MerljivaMobTabKarusel
                  key={`${viewportKey}-f${faiStranica}`}
                  C={C}
                  brojKolona={faiRezimAktivan ? 5 : kolone.length}
                  aktivnaKolona={prikazIndeksKolone}
                  onPrethodna={idiPrethodnaKolonaMob}
                  onSledeca={idiSledecaKolonaMob}
                  urlSlike={urlSlike}
                  slika={slika}
                  idDeo={idDeo}
                  onZoomSlika={() => setZoomSlika(true)}
                  sredinaZaglavlje={faiRezimAktivan ? null : mobSerijaStatus}
                >
                  {(() => {
                    const slot = prikazIndeksKolone;
                    const ri = faiRezimAktivan && faiPaginacija
                      ? (faiPaginacija.prikaz[slot]?.realniIndeks ?? -1)
                      : slot;
                    const k = ri >= 0 ? kolone[ri] : kolonaZaSlot(slot);
                    return renderKolonaKartica(k, ri >= 0 ? ri : slot, true);
                  })()}
                </MerljivaMobTabKarusel>
              </>
            ) : (
              <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "row",
                gap: 10,
                alignItems: "stretch",
                minHeight: 0,
                overflow: "hidden",
              }}
              >
                <div style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  minHeight: 0,
                  height: "100%",
                }}
                >
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                    gap: L.koloneGap,
                    flex: 1,
                    width: "100%",
                    minHeight: 0,
                    maxHeight: "100%",
                    height: "100%",
                    overflow: "hidden",
                    alignContent: "stretch",
                  }}
                  >
                    {(faiRezimAktivan && faiPaginacija
                      ? faiPaginacija.prikaz
                      : kolone.map((k, i) => ({ kolona: k, realniIndeks: i, slot: i }))
                    ).map((p) => {
                      const ri = p.realniIndeks ?? -1;
                      const k = p.kolona;
                      const key = faiRezimAktivan ? `f-${faiStranica}-${p.slot}` : `s-${p.slot}`;
                      return (
                        <div key={key} style={{
                          opacity: k.naziv === "-" ? 0.4 : 1,
                          height: "100%",
                          minHeight: 0,
                          display: "flex",
                          flexDirection: "column",
                        }}
                        >
                          {renderKolonaKartica(k, ri >= 0 ? ri : p.slot, false)}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <aside style={{
                  flex: `0 0 ${L.slikaSirina}px`,
                  width: L.slikaSirina,
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  height: "100%",
                  gap: 6,
                }}
                >
                  <div style={{
                    background: C.panel,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    width: "100%",
                    flex: 1,
                    minHeight: 100,
                    boxSizing: "border-box",
                    padding: 6,
                    display: "flex",
                    flexDirection: "column",
                  }}
                  >
                    <div style={{ fontSize: 9, color: C.sivi, marginBottom: 2, textAlign: "center", flexShrink: 0 }}>
                      Crtež · klik = ceo ekran
                    </div>
                    {urlSlike ? (
                      <CrtezZoomViewer url={urlSlike} C={C} onFullscreen={() => setZoomSlika(true)} />
                    ) : (
                      <div style={{
                        flex: 1,
                        minHeight: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: C.border,
                        fontSize: 10,
                        textAlign: "center",
                        padding: 8,
                        background: C.input,
                        borderRadius: 6,
                        border: `1px solid ${C.border}`,
                      }}
                      >
                        {idDeo ? (slika ? "Nije učitana" : "Nema crteža") : "Unesi ID"}
                      </div>
                    )}
                  </div>
                  {dugmadSerije}
                </aside>
              </div>
            )}
          </div>
          {prikaziTastMerenja && (
            <TastaturaBrojeviMerljive
              C={C}
              ugao={!!ugaoTast}
              onTaster={primeniTastaturuMerenja}
              onGotovoDodaj={gotovoDodajTastMerenja}
              kompakt
            />
          )}
        </>
      )}
    </div>
  );
}
