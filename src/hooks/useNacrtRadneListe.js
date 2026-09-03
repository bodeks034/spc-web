import { useCallback, useEffect, useRef, useState } from "react";
import { sacuvajNacrt, ucitajNacrt, obrisiNacrt, nacrtImaSadrzaj } from "../lib/radnaListaNacrt.js";

const SNIMI_DEBOUNCE_MS = 1200;

/**
 * Drži nepotvrđenu radnu listu u trajnom skladištu i upozorava pre zatvaranja.
 *
 * @param {string} kljuc      jedinstveno ime ekrana, npr. "atributivne-glavna"
 * @param {any}    podaci     trenutni sadržaj bufera (niz ili objekat nizova)
 * @param {object} [opcije]
 * @param {boolean} [opcije.aktivno=true]  isključi kad ekran nije u upotrebi
 */
export function useNacrtRadneListe(kljuc, podaci, { aktivno = true } = {}) {
  const [vraceniNacrt, setVraceniNacrt] = useState(null);
  const ucitano = useRef(false);
  const imaSadrzaj = nacrtImaSadrzaj(podaci);

  useEffect(() => {
    if (!kljuc || ucitano.current) return;
    ucitano.current = true;
    let otkaz = false;
    ucitajNacrt(kljuc)
      .then((zapis) => {
        if (otkaz || !zapis || !nacrtImaSadrzaj(zapis.podaci)) return;
        setVraceniNacrt(zapis);
      })
      .catch(() => {});
    return () => { otkaz = true; };
  }, [kljuc]);

  // Snimanje je odloženo da kucanje po tabletu ne udara u IndexedDB na svaki znak.
  useEffect(() => {
    if (!kljuc || !aktivno) return;
    const t = setTimeout(() => {
      if (imaSadrzaj) sacuvajNacrt(kljuc, podaci);
      else obrisiNacrt(kljuc);
    }, SNIMI_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [kljuc, aktivno, imaSadrzaj, podaci]);

  useEffect(() => {
    if (!aktivno || !imaSadrzaj) return;
    const upozori = (e) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", upozori);
    return () => window.removeEventListener("beforeunload", upozori);
  }, [aktivno, imaSadrzaj]);

  const odbaciNacrt = useCallback(() => {
    setVraceniNacrt(null);
    if (kljuc) obrisiNacrt(kljuc);
  }, [kljuc]);

  const zatvoriPonudu = useCallback(() => setVraceniNacrt(null), []);

  const ocistiNacrt = useCallback(() => {
    if (kljuc) obrisiNacrt(kljuc);
  }, [kljuc]);

  return { vraceniNacrt, odbaciNacrt, zatvoriPonudu, ocistiNacrt };
}
