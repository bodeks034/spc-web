import { dp, dpPad } from "../dp.js";
import { getTokens } from "../tokens/index.js";
import { DESKTOP } from "../tokens/desktop.js";
import { TELEFON } from "../tokens/telefon.js";
import { TABLET } from "../tokens/tablet.js";

/**
 * Layout tokeni za korak liste merenja (merljive).
 * Telefon 69,5×154 mm · tablet 108×172 mm — dimenzije preko dp().
 */
export function layoutListaMerljive(ekran, { koristiMobLinija = false } = {}) {
  const stackVertikalno = ekran.mob || ekran.tablet;
  const desktopUnos = !stackVertikalno;
  const t = getTokens(ekran);

  if (desktopUnos) {
    const slikaSirina = Math.min(
      DESKTOP.sirinaAsideMax,
      Math.max(DESKTOP.sirinaAsideMin, Math.round(ekran.w * DESKTOP.sirinaAsideUdeo)),
    );
    return {
      stackVertikalno,
      desktopUnos,
      koloneGap: DESKTOP.koloneGap,
      slikaSirina,
      slikaPunaSirina: false,
      sirinaKolone: null,
      padGlavni: koristiMobLinija ? DESKTOP.padLinijaLista : DESKTOP.padGlavni,
      kolonaMinVisina: 0,
      kolonaMaxVisina: null,
      crtezVisinaAside: 100,
      crtezVisinaMob: null,
      crtezVisinaTablet: null,
      fontLabel: DESKTOP.fontLabel,
      fontInput: DESKTOP.fontInput,
      inpPadding: DESKTOP.inpPad,
      hintPrevuci: false,
      mobTabKarusel: false,
      crtezVisinaDno: null,
      gridGeneralije: `repeat(auto-fill, minmax(${DESKTOP.generalijeMinKolona}px, 1fr))`,
      gridGeneralijeGap: DESKTOP.generalijeGap,
    };
  }

  const tok = ekran.telefon ? TELEFON : TABLET;
  const pad = koristiMobLinija ? tok.padLinija : tok.padGlavni;
  const padGlavni = dpPad(pad[0], pad[1], pad[2], ekran);

  let sirinaKolone;
  if (ekran.mob) {
    sirinaKolone = Math.min(
      dp(TELEFON.kolonaSirinaMax, ekran),
      Math.max(
        dp(TELEFON.kolonaSirinaMin, ekran),
        ekran.w - dp(TELEFON.kolonaSirinaOdbitak, ekran),
      ),
    );
  } else {
    sirinaKolone = Math.min(
      dp(TABLET.kolonaSirinaMax, ekran),
      Math.max(
        dp(TABLET.kolonaSirinaMin, ekran),
        Math.floor((ekran.w - dp(TABLET.kolonaGridOdbitak, ekran)) / TABLET.kolonaGridDelilac),
      ),
    );
  }

  const landscapeMobTab = ekran.telefonLandscape || ekran.tabletLandscape;
  const crtezVisinaDno = landscapeMobTab && tok.crtezVisinaLandscape != null
    ? dp(tok.crtezVisinaLandscape, ekran)
    : dp(tok.crtezVisinaDno, ekran);

  return {
    stackVertikalno,
    desktopUnos,
    mobTabKarusel: true,
    koloneGap: dp(tok.koloneGap, ekran),
    slikaSirina: "100%",
    slikaPunaSirina: true,
    sirinaKolone: "100%",
    padGlavni,
    kolonaMinVisina: 0,
    kolonaMaxVisina: "none",
    crtezVisinaAside: crtezVisinaDno,
    crtezVisinaDno,
    crtezVisinaMob: dp(TELEFON.crtezVisina, ekran),
    crtezVisinaTablet: dp(TABLET.crtezVisina, ekran),
    fontLabel: dp(tok.fontLabel, ekran),
    fontInput: dp(tok.fontInput, ekran),
    inpPadding: `${dp(tok.inpPadV, ekran)}px ${dp(tok.inpPadH, ekran)}px`,
    hintPrevuci: false,
    gridGeneralije: ekran.uspravnoMobTab
      ? "repeat(2, minmax(0, 1fr))"
      : ekran.telefonLandscape
        ? "repeat(4, minmax(72px, 1fr))"
        : ekran.tabletLandscape
          ? "repeat(4, minmax(88px, 1fr))"
          : "repeat(3, minmax(0, 1fr))",
    gridGeneralijeGap: dp(tok.gridGap, ekran),
  };
}
