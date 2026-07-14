import { useEffect, useMemo, useState } from "react";
import { kalibracijaBlokiraUnos } from "../lib/meriloStatus.js";
import { useEkran } from "../lib/useEkran.js";
import { dp } from "../layout/dp.js";
import { TELEFON } from "../layout/tokens/telefon.js";
import { TABLET } from "../layout/tokens/tablet.js";
import CrtezZoomViewer from "./CrtezZoomViewer.jsx";

const STAVKE_MERLJIVE = [
  { id: "id_rn", label: "ID delo i radni nalog su tačni" },
  { id: "crtrez", label: "Pregledao sam crtež / sliku dela" },
  { id: "instrument", label: "Merni instrument odgovara planu kontrole" },
  { id: "serija", label: "Spreman sam za unos merenja u aktivnoj seriji" },
];

const STAVKE_ATRIBUTIVNE = [
  { id: "id_rn", label: "ID delo i radni nalog su tačni" },
  { id: "crtrez", label: "Pregledao sam crtež i etiketu dela" },
  { id: "lokacija", label: "Linija i mašina su ispravno prikazane" },
  { id: "unos", label: "Spreman sam za OK / NOK unos" },
];

function initChecks(stavke) {
  const o = {};
  for (const s of stavke) o[s.id] = false;
  return o;
}

export default function UnosPokaYokeKorak({
  C,
  modul = "merljive",
  akcent,
  idDeo,
  nazivDela,
  radniNalog,
  linija,
  masina,
  kontrolor,
  grupaAB,
  potrebanBroj,
  kalUpozorenja = [],
  kontrolnaListaOk = true,
  kalibracijaOdobrena = false,
  kalibracijaCeka = false,
  mozeAdmin = false,
  onToggleKalibracijaOdobrenje,
  onZahtevKalibracija,
  urlSlike,
  onDalje,
  onNazad,
  prikaziNazad = false,
  daljeLabel = "Unos merenja →",
  /** Modul 2 (analitika) portrait: lista → dugme → slika */
  stekListaDugmeSlika = false,
}) {
  const ekran = useEkran();
  const { telefon, telefonLandscape, tabletLandscape, uspravnoMobTab } = ekran;
  const kompakt = uspravnoMobTab || telefon || ekran.tablet;
  const landscapeMobTab = telefonLandscape || tabletLandscape;
  const stekPortrait = stekListaDugmeSlika && uspravnoMobTab;
  const stavke = modul === "atributivne" ? STAVKE_ATRIBUTIVNE : STAVKE_MERLJIVE;
  const boja = akcent || (modul === "merljive" ? C.zelena : C.plava);
  /** Atributivne: crtež samo u levom panelu, ne u poka koraku */
  const prikaziCrtez = modul !== "atributivne" && urlSlike;
  const [checks, setChecks] = useState(() => initChecks(stavke));
  const [zoomSlika, setZoomSlika] = useState(false);

  useEffect(() => {
    setZoomSlika(false);
  }, [ekran.viewportKey]);

  useEffect(() => {
    setChecks(initChecks(stavke));
  }, [idDeo, grupaAB, modul]);

  const blokirajucaKal = useMemo(
    () => kalUpozorenja.filter(k => kalibracijaBlokiraUnos(k.status)),
    [kalUpozorenja],
  );

  const sviStavke = stavke.every(s => checks[s.id]);
  const kalBlok = blokirajucaKal.length > 0 && !kalibracijaOdobrena;
  const mozeDalje = sviStavke
    && kontrolnaListaOk !== false
    && (!kalBlok || mozeAdmin);

  const visinaCrtezaMob = useMemo(() => {
    if (!kompakt) return null;
    if (stekPortrait) {
      if (ekran.telefon) return dp(72, ekran);
      if (ekran.tablet) return dp(88, ekran);
      return dp(80, ekran);
    }
    if (ekran.telefon) return dp(TELEFON.crtezVisinaDno, ekran);
    if (ekran.tablet) return dp(TABLET.crtezVisinaDno, ekran);
    return dp(110, ekran);
  }, [kompakt, stekPortrait, ekran.telefon, ekran.tablet, ekran.kratka]);

  const visinaCrtezaLandscape = useMemo(() => {
    if (!kompakt) return null;
    if (ekran.telefonLandscape) return dp(TELEFON.crtezVisinaLandscape, ekran);
    if (ekran.tabletLandscape) return dp(TABLET.crtezVisinaLandscape, ekran);
    return dp(88, ekran);
  }, [kompakt, ekran.telefonLandscape, ekran.tabletLandscape, ekran.kratka]);

  const toggle = (id) => setChecks(p => ({ ...p, [id]: !p[id] }));

  const panelListe = (
        <div style={{
          flex: stekPortrait
            ? "0 0 auto"
            : prikaziCrtez
              ? (landscapeMobTab ? "1 1 58%" : kompakt ? "1 1 58%" : "1 1 52%")
              : "1 1 100%",
          background: `${boja}12`,
          border: `1px solid ${boja}55`,
          borderRadius: 10,
          padding: kompakt ? "10px 10px" : "14px 16px",
          minHeight: 0,
          minWidth: 0,
          overflowY: stekPortrait ? "visible" : "auto",
          maxHeight: stekPortrait
            ? undefined
            : (kompakt ? Math.min(ekran.h - 130, 420) : undefined),
        }}>
          <div style={{ color: boja, fontSize: 10, letterSpacing: 1.5, marginBottom: 10, fontWeight: 700 }}>
            POKA-YOKE · PROVERA PRE UNOSA
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: landscapeMobTab
              ? "repeat(2, minmax(0, 1fr))"
              : kompakt
                ? "repeat(auto-fit, minmax(110px, 1fr))"
                : "repeat(auto-fit, minmax(200px, 1fr))",
            gap: kompakt ? 6 : 8,
            marginBottom: kompakt ? 10 : 14,
            fontSize: kompakt ? 9 : 11,
          }}>
            <div><span style={{ color: C.sivi }}>ID: </span><strong style={{ color: boja }}>{idDeo}</strong></div>
            {nazivDela && <div><span style={{ color: C.sivi }}>Deo: </span>{nazivDela}</div>}
            {radniNalog && <div><span style={{ color: C.sivi }}>RN: </span>{radniNalog}</div>}
            {grupaAB && <div><span style={{ color: C.sivi }}>Serija: </span><strong>{grupaAB}</strong></div>}
            {linija && <div><span style={{ color: C.sivi }}>Linija: </span>{linija}</div>}
            {masina && <div><span style={{ color: C.sivi }}>Mašina: </span>{masina}</div>}
            {kontrolor && <div><span style={{ color: C.sivi }}>Kontrolor: </span>{kontrolor}</div>}
            {potrebanBroj && grupaAB && (
              <div><span style={{ color: C.sivi }}>Plan: </span>{potrebanBroj} merenja / kolona</div>
            )}
          </div>

          {kontrolnaListaOk === false && (
            <div style={{ color: C.zuta, fontSize: 11, marginBottom: 10 }}>
              Kontrolna lista smene nije potvrđena — završite je na početku modula.
            </div>
          )}

          {blokirajucaKal.length > 0 && !kalibracijaOdobrena && (
            <div style={{ color: C.crvena, fontSize: 11, marginBottom: 10 }}>
              {blokirajucaKal.some(k => k.status === "istekla") ? "Istekla kalibracija" : "Problem kalibracije"}
              : {blokirajucaKal.map(k => `${k.pozicija} (${k.instrument})`).join(" · ")}
            </div>
          )}

          {kalibracijaCeka && !kalibracijaOdobrena && (
            <div style={{ color: C.zuta, fontSize: 11, marginBottom: 10 }}>
              ⏳ Zahtev poslat adminu — čeka odobrenje (osvežava se automatski)
            </div>
          )}

          {kalibracijaOdobrena && blokirajucaKal.length > 0 && (
            <div style={{ color: C.zelena, fontSize: 11, marginBottom: 10 }}>
              ✓ Admin je odobrio merenje uprkos kalibraciji
            </div>
          )}

          {!mozeAdmin && blokirajucaKal.length > 0 && !kalibracijaOdobrena && !kalibracijaCeka
            && typeof onZahtevKalibracija === "function" && (
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={onZahtevKalibracija}
                style={{
                  background: C.zuta, border: "none", borderRadius: 6, color: C.onZuta,
                  fontSize: 11, fontWeight: 700, padding: "8px 14px", cursor: "pointer",
                }}
              >
                📤 Pošalji zahtev adminu (kalibracija)
              </button>
            </div>
          )}

          {mozeAdmin && blokirajucaKal.length > 0 && typeof onToggleKalibracijaOdobrenje === "function" && (
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                onClick={onToggleKalibracijaOdobrenje}
                style={{
                  background: kalibracijaOdobrena ? C.zuta : C.crvena,
                  border: "none", borderRadius: 6, color: C.onZuta,
                  fontSize: 11, fontWeight: 700, padding: "8px 14px", cursor: "pointer",
                }}
              >
                {kalibracijaOdobrena
                  ? "✓ Merenje dozvoljeno (ukloni dozvolu)"
                  : "Admin: dozvoli merenje (kalibracija istekla)"}
              </button>
              <div style={{ color: C.sivi, fontSize: 9, marginTop: 6 }}>
                Važi na svim uređajima za {idDeo}
              </div>
            </div>
          )}

          <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1, marginBottom: 8 }}>
            POTVRDI STAVKE
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: kompakt ? 5 : 8 }}>
            {stavke.map(s => (
              <label
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: kompakt ? 7 : 10,
                  cursor: "pointer",
                  padding: kompakt ? "7px 8px" : "10px 12px",
                  background: checks[s.id] ? `${boja}18` : C.input,
                  border: `1px solid ${checks[s.id] ? boja : C.border}`,
                  borderRadius: kompakt ? 6 : 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={!!checks[s.id]}
                  onChange={() => toggle(s.id)}
                  style={{ marginTop: 2, accentColor: boja, flexShrink: 0 }}
                />
                <span style={{ color: C.tekst, fontSize: kompakt ? 11 : 12, lineHeight: 1.4 }}>{s.label}</span>
              </label>
            ))}
          </div>

          {kalUpozorenja.filter(k => k.status === "uskoro").length > 0 && (
            <div style={{ color: C.zuta, fontSize: 10, marginTop: 12 }}>
              Kalibracija uskoro: {kalUpozorenja.filter(k => k.status === "uskoro").map(k => k.instrument).join(", ")}
            </div>
          )}
        </div>
  );

  const panelCrteza = prikaziCrtez ? (
          <aside style={{
            flex: stekPortrait
              ? "0 0 auto"
              : landscapeMobTab ? "0 0 38%" : kompakt ? "0 0 38%" : "1 1 42%",
            width: stekPortrait ? "100%" : undefined,
            minWidth: stekPortrait ? undefined : (landscapeMobTab ? 110 : kompakt ? 100 : 220),
            maxWidth: stekPortrait ? "100%" : (kompakt ? "38%" : undefined),
            display: "flex",
            flexDirection: "column",
            minHeight: stekPortrait ? visinaCrtezaMob : (kompakt ? 0 : 280),
            maxHeight: stekPortrait
              ? visinaCrtezaMob
              : (landscapeMobTab
                ? visinaCrtezaLandscape
                : (kompakt ? visinaCrtezaLandscape : undefined)),
            alignSelf: stekPortrait ? "stretch" : (kompakt ? "flex-start" : "stretch"),
            flexShrink: 0,
            background: C.panel,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: kompakt ? 4 : 8,
            boxSizing: "border-box",
          }}>
            <div style={{ color: C.sivi, fontSize: 8, marginBottom: 4, textAlign: "center", flexShrink: 0 }}>
              Crtež · zoom · ⛶
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <CrtezZoomViewer
                url={urlSlike}
                C={C}
                onFullscreen={() => setZoomSlika(true)}
              />
            </div>
          </aside>
  ) : null;

  const dugmadAkcije = (
      <div style={{
        display: "flex",
        flexDirection: stekPortrait ? "column" : "row",
        flexWrap: "wrap",
        gap: kompakt ? 6 : 10,
        alignItems: "stretch",
        justifyContent: stekPortrait ? "stretch" : "flex-end",
        flexShrink: 0,
        width: "100%",
      }}>
        <button
          type="button"
          disabled={!mozeDalje}
          onClick={() => mozeDalje && onDalje?.()}
          title={
            !sviStavke ? "Označite sve stavke"
              : kalBlok && !mozeAdmin ? "Rešite kalibraciju ili admin dozvolu"
              : kontrolnaListaOk === false ? "Završite kontrolnu listu smene"
              : "Pređi na unos merenja"
          }
          style={{
            background: mozeDalje ? boja : C.hover,
            border: "none",
            borderRadius: 8,
            color: mozeDalje ? C.onZuta : C.sivi,
            fontSize: kompakt ? 13 : 14,
            fontWeight: 800,
            padding: kompakt ? "12px 22px" : "14px 28px",
            cursor: mozeDalje ? "pointer" : "not-allowed",
            letterSpacing: 0.5,
            width: stekPortrait ? "100%" : "auto",
          }}
        >
          {daljeLabel}
        </button>
        {prikaziNazad && typeof onNazad === "function" && (
          <button
            type="button"
            onClick={onNazad}
            style={{
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              color: C.sivi,
              fontSize: kompakt ? 12 : 13,
              fontWeight: 600,
              padding: kompakt ? "10px 14px" : "12px 18px",
              cursor: "pointer",
              width: stekPortrait ? "100%" : "auto",
            }}
          >
            ← Nazad
          </button>
        )}
      </div>
  );

  const hintAkcije = !mozeDalje ? (
        <div style={{ color: C.sivi, fontSize: 10, textAlign: stekPortrait ? "center" : "right" }}>
          {!sviStavke && "Označite sve stavke checkliste. "}
          {kalBlok && !mozeAdmin && "Kalibracija blokira unos. "}
          {kontrolnaListaOk === false && "Potrebna kontrolna lista smene."}
        </div>
  ) : null;

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      gap: kompakt ? 6 : 12,
      overflowY: stekPortrait ? "auto" : "hidden",
      WebkitOverflowScrolling: "touch",
    }}>
      {stekPortrait ? (
        <>
          {panelListe}
          {dugmadAkcije}
          {hintAkcije}
          {panelCrteza}
        </>
      ) : (
        <>
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            gap: kompakt ? 8 : 12,
            minHeight: 0,
            alignItems: kompakt ? "flex-start" : "stretch",
          }}>
            {panelListe}
            {panelCrteza}
          </div>
          {dugmadAkcije}
          {hintAkcije}
        </>
      )}

      {zoomSlika && prikaziCrtez && (
        <div
          role="presentation"
          onClick={() => setZoomSlika(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.88)",
            display: "flex", flexDirection: "column", padding: 16,
          }}
        >
          <div
            role="presentation"
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, background: C.panel, borderRadius: 10, border: `1px solid ${C.border}`,
              padding: 12, minHeight: 0, display: "flex", flexDirection: "column",
            }}
          >
            <CrtezZoomViewer
              url={urlSlike}
              C={C}
              onClose={() => setZoomSlika(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}
