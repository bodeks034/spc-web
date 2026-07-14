import { useCallback, useMemo } from "react";
import { kolonePetStranica } from "../../lib/varijabilneUtils.js";
import { indeksSledecePrazno } from "../../lib/meriloUvoz.js";
import MerljiveUnosFormaBlok from "./MerljiveUnosFormaBlok.jsx";
import { useMerljiveKolone } from "./MerljiveKoloneProvider.jsx";

/** Unos forma — čita kolone iz konteksta (izolovano od parent re-rendera). */
export default function MerljiveUnosFormaConsumer({
  C,
  inp,
  merilaMap,
  ekran,
  L,
  digitalniUnos,
  meriloPovezano,
  desktopUnos,
  potrebanBroj,
  addToast,
  onMeriloPovezanChange,
  registerMeriloStop,
  registerMeriloSimuliraj,
  autoSnimiMerilo,
  onAutoSnimiMeriloChange,
  onMerenjeDodatoSaMerila,
  koristiTastMerenja,
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
  faiStranica,
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
  mobSerijaStatus,
  viewportKey,
  kolonaZaSlot,
}) {
  const {
    kolone,
    setKolone,
    aktivnaKolona,
    setAktivnaKolona,
    tastMerenjaVidljiva,
    setTastMerenjaVidljiva,
    kolonaJePuna,
    kolonaKarticaProps,
    primeniTastaturuMerenja,
    gotovoDodajTastMerenja,
  } = useMerljiveKolone();

  const faiPaginacija = useMemo(() => {
    if (!faiRezimAktivan) return null;
    return kolonePetStranica(kolone, faiStranica, 5);
  }, [faiRezimAktivan, kolone, faiStranica]);

  const indeksiMerljivih = useMemo(
    () => kolone.map((k, i) => (k.naziv !== "-" ? i : -1)).filter((i) => i >= 0),
    [kolone],
  );

  const prikazIndeksKolone = useMemo(() => {
    if (L.mobTabKarusel && faiRezimAktivan && faiPaginacija) {
      const rel = aktivnaKolona - faiPaginacija.start;
      if (rel >= 0 && rel < 5) {
        const ri = faiPaginacija.prikaz[rel]?.realniIndeks ?? -1;
        if (ri >= 0) return rel;
      }
      for (let s = 0; s < 5; s += 1) {
        if ((faiPaginacija.prikaz[s]?.realniIndeks ?? -1) >= 0) return s;
      }
      return 0;
    }
    if (L.mobTabKarusel) {
      if (aktivnaKolona >= 0 && aktivnaKolona < kolone.length) return aktivnaKolona;
      return 0;
    }
    if (!indeksiMerljivih.length) return -1;
    if (indeksiMerljivih.includes(aktivnaKolona)) return aktivnaKolona;
    return indeksiMerljivih[0];
  }, [L.mobTabKarusel, kolone.length, indeksiMerljivih, aktivnaKolona, faiRezimAktivan, faiPaginacija]);

  const idiSledecaKolonaMob = useCallback(() => {
    if (faiRezimAktivan && faiPaginacija) {
      const rel = Math.max(0, aktivnaKolona - faiPaginacija.start);
      for (let s = rel + 1; s < 5; s += 1) {
        const ri = faiPaginacija.prikaz[s]?.realniIndeks ?? -1;
        if (ri >= 0) {
          setAktivnaKolona(ri);
          setTastMerenjaVidljiva(false);
          document.activeElement?.blur?.();
          return;
        }
      }
      return;
    }
    setAktivnaKolona((i) => {
      const tren = i < 0 ? 0 : i;
      const prazna = indeksSledecePrazno(kolone, potrebanBroj, tren + 1);
      if (prazna >= 0) return prazna;
      return tren < kolone.length - 1 ? tren + 1 : tren;
    });
    setTastMerenjaVidljiva(false);
    document.activeElement?.blur?.();
  }, [kolone, potrebanBroj, faiRezimAktivan, faiPaginacija, aktivnaKolona, setAktivnaKolona, setTastMerenjaVidljiva]);

  const idiPrethodnaKolonaMob = useCallback(() => {
    if (faiRezimAktivan && faiPaginacija) {
      const rel = Math.max(0, aktivnaKolona - faiPaginacija.start);
      for (let s = rel - 1; s >= 0; s -= 1) {
        const ri = faiPaginacija.prikaz[s]?.realniIndeks ?? -1;
        if (ri >= 0) {
          setAktivnaKolona(ri);
          setTastMerenjaVidljiva(false);
          document.activeElement?.blur?.();
          return;
        }
      }
      return;
    }
    setAktivnaKolona((i) => {
      const tren = i < 0 ? 0 : i;
      return tren > 0 ? tren - 1 : tren;
    });
    setTastMerenjaVidljiva(false);
    document.activeElement?.blur?.();
  }, [faiRezimAktivan, faiPaginacija, aktivnaKolona, setAktivnaKolona, setTastMerenjaVidljiva]);

  const karticaProps = useMemo(() => ({
    ...kolonaKarticaProps,
    C,
    inp,
    merilaMap,
  }), [kolonaKarticaProps, C, inp, merilaMap]);

  return (
    <MerljiveUnosFormaBlok
      C={C}
      ekran={ekran}
      L={L}
      digitalniUnos={digitalniUnos}
      meriloPovezano={meriloPovezano}
      desktopUnos={desktopUnos}
      kolone={kolone}
      setKolone={setKolone}
      potrebanBroj={potrebanBroj}
      aktivnaKolona={aktivnaKolona}
      setAktivnaKolona={setAktivnaKolona}
      addToast={addToast}
      onMeriloPovezanChange={onMeriloPovezanChange}
      registerMeriloStop={registerMeriloStop}
      registerMeriloSimuliraj={registerMeriloSimuliraj}
      autoSnimiMerilo={autoSnimiMerilo}
      onAutoSnimiMeriloChange={onAutoSnimiMeriloChange}
      onMerenjeDodatoSaMerila={onMerenjeDodatoSaMerila}
      koristiTastMerenja={koristiTastMerenja}
      tastMerenjaVidljiva={tastMerenjaVidljiva}
      kolonaJePuna={kolonaJePuna}
      faiRezimAktivan={faiRezimAktivan}
      metaAktivneSerije={metaAktivneSerije}
      grupaAB={grupaAB}
      ciljSesije={ciljSesije}
      preostaloSesije={preostaloSesije}
      idDeo={idDeo}
      brojFaiDimenzija={brojFaiDimenzija}
      faiKompletno={faiKompletno}
      snima={snima}
      mozeOdobriFai={mozeOdobriFai}
      faiPaginacija={faiPaginacija}
      promeniFaiStranicu={promeniFaiStranicu}
      sacuvajFai={sacuvajFai}
      kpiPanelBlok={kpiPanelBlok}
      prekidOdobrenId={prekidOdobrenId}
      imaNepotpunuSesiju={imaNepotpunuSesiju}
      zoomSlika={zoomSlika}
      setZoomSlika={setZoomSlika}
      urlSlike={urlSlike}
      slika={slika}
      mobDugmadAkcije={mobDugmadAkcije}
      dugmadSerije={dugmadSerije}
      viewportKey={viewportKey}
      faiStranica={faiStranica}
      prikazIndeksKolone={prikazIndeksKolone}
      idiPrethodnaKolonaMob={idiPrethodnaKolonaMob}
      idiSledecaKolonaMob={idiSledecaKolonaMob}
      mobSerijaStatus={mobSerijaStatus}
      kolonaZaSlot={kolonaZaSlot}
      kolonaKarticaProps={karticaProps}
      primeniTastaturuMerenja={primeniTastaturuMerenja}
      gotovoDodajTastMerenja={gotovoDodajTastMerenja}
    />
  );
}
