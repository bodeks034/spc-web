/** Broj aktivnih korisnika / uređaja za prikaz u LicencaStatusPanel. */

import { brojAktivnihRadnika } from "./licencaMaxKorisnika.js";
import { brojRegistrovanihUredjaja } from "./licencaUredjaj.js";

export async function ucitajLicencaKvote(supabase) {
  const [aktivniKorisnici, registrovaniUredjaji] = await Promise.all([
    brojAktivnihRadnika(supabase).catch(() => null),
    brojRegistrovanihUredjaja(supabase),
  ]);
  return { aktivniKorisnici, registrovaniUredjaji };
}

/** Prikaz broja sa opcionim limitom iz licence. */
export function formatPrikazKvote(trenutno, max) {
  const maxN = Number(max);
  const imaLimit = Number.isFinite(maxN) && maxN > 0;

  if (trenutno === null || trenutno === undefined) {
    return { tekst: "…", ucitava: true, prekoraceno: false, naLimitu: false };
  }

  const t = Number(trenutno);
  if (!Number.isFinite(t)) {
    return { tekst: "—", greska: true, prekoraceno: false, naLimitu: false };
  }

  if (!imaLimit) {
    return {
      tekst: `${t}`,
      hint: "bez limita",
      prekoraceno: false,
      naLimitu: false,
    };
  }

  return {
    tekst: `${t} / ${maxN}`,
    prekoraceno: t > maxN,
    naLimitu: t >= maxN,
  };
}

/** @deprecated koristi formatPrikazKvote */
export function formatKvota(trenutno, max) {
  const p = formatPrikazKvote(trenutno, max);
  if (p.ucitava || p.greska || p.hint) return p.hint ? null : p;
  return p;
}
