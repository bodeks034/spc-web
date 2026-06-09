import { dp } from "../dp.js";
import { DESKTOP } from "../tokens/desktop.js";
import { TELEFON } from "../tokens/telefon.js";
import { TABLET } from "../tokens/tablet.js";

/** Layout za korak Poka-yoke (merljive) */
export function layoutPokaYokeMerljive(ekran) {
  const desktopUnos = ekran.desk;
  const stackVertikalno = ekran.mob || ekran.tablet;

  if (desktopUnos) {
    return {
      desktopUnos,
      stackVertikalno,
      sirinaCrtezLevo: DESKTOP.sirinaCrtezLevo,
      crtezVisina: 200,
      redGap: 10,
      prikaziCrtezLevo: true,
      urlSlikeUPokaKomponenti: false,
      visinaGlavneOblasti: undefined,
    };
  }

  const tok = ekran.telefon ? TELEFON : TABLET;
  let visinaGlavneOblasti;
  if (ekran.telefon) {
    const odbitak = ekran.telefonLandscape
      ? dp(TELEFON.crtezVisinaLandscape, ekran)
      : dp(TELEFON.headerOdbitak, ekran);
    visinaGlavneOblasti = Math.max(dp(220, ekran), ekran.h - odbitak);
  } else if (ekran.tablet) {
    const odbitak = ekran.tabletLandscape
      ? dp(TABLET.crtezVisinaLandscape, ekran) + dp(48, ekran)
      : dp(TABLET.headerOdbitak, ekran);
    visinaGlavneOblasti = Math.max(dp(260, ekran), ekran.h - odbitak);
  }

  return {
    desktopUnos,
    stackVertikalno,
    sirinaCrtezLevo: null,
    crtezVisina: ekran.telefon
      ? dp(TELEFON.crtezVisinaDno, ekran)
      : (ekran.tabletLandscape
        ? dp(TABLET.crtezVisinaLandscape, ekran)
        : dp(TABLET.crtezVisinaDno, ekran)),
    redGap: 0,
    prikaziCrtezLevo: false,
    urlSlikeUPokaKomponenti: true,
    visinaGlavneOblasti,
  };
}
