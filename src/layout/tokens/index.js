import { TELEFON } from "./telefon.js";
import { TABLET } from "./tablet.js";
import { DESKTOP } from "./desktop.js";
import { klasaUredjaja } from "../dp.js";

const MAPA = { telefon: TELEFON, tablet: TABLET, desktop: DESKTOP };

export function getTokens(ekran) {
  return MAPA[klasaUredjaja(ekran)] ?? DESKTOP;
}

export { TELEFON, TABLET, DESKTOP };
