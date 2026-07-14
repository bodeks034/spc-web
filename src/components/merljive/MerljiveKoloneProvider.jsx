/**
 * Izolovan state unosa merenja — kucanje ne re-renderuje ceo VarijabilneForma.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import {
  validirajUnos,
  proveriOkNok,
  brojPotrebnihZaKolonu,
  unosMerenjaSpremanZaDodavanje,
  unosMerenjaNepotpun,
  primeniTastMerenja,
} from "../../lib/varijabilneUtils.js";
import { kalibracijaBlokiraUnos } from "../../lib/meriloStatus.js";
import { indeksSledecePrazno } from "../../lib/meriloUvoz.js";
import { prazneKoloneMerljive as prazneKolone } from "../../lib/merljiveFormaHelper.js";

const MerljiveKoloneContext = createContext(null);

export function useMerljiveKolone() {
  const ctx = useContext(MerljiveKoloneContext);
  if (!ctx) throw new Error("useMerljiveKolone van MerljiveKoloneProvider");
  return ctx;
}

/** Samo za komponente koje moraju da čitaju kolone bez full parent re-rendera. */
export function useMerljiveKoloneOptional() {
  return useContext(MerljiveKoloneContext);
}

export const MerljiveKoloneProvider = forwardRef(function MerljiveKoloneProvider({
  children,
  potrebanBroj,
  koristiTastMerenja,
  unosKorak,
  kalUpozorenja,
  mozeUpRikosKalibracije,
  mozeAdmin,
  setPoruka,
  onMerenjaChange,
}, ref) {
  const [kolone, setKolone] = useState(() => prazneKolone(5));
  const [aktivnaKolona, setAktivnaKolona] = useState(-1);
  const [fotoPoPoziciji, setFotoPoPoziciji] = useState({});
  const [komentarPoPoziciji, setKomentarPoPoziciji] = useState({});
  const [tastMerenjaVidljiva, setTastMerenjaVidljiva] = useState(false);

  const inputRefs = useRef([]);
  const dodajMerenjeLockRef = useRef(new Set());
  const koloneRef = useRef(kolone);
  const poslednjaKolonaUnosRef = useRef(-1);
  koloneRef.current = kolone;

  const kolonaJePuna = useCallback(
    (k) => k && k.naziv !== "-" && k.merenja.length >= brojPotrebnihZaKolonu(k, potrebanBroj),
    [potrebanBroj],
  );

  const resetKolone = useCallback((broj) => {
    poslednjaKolonaUnosRef.current = -1;
    setKolone(prazneKolone(broj));
    setFotoPoPoziciji({});
    setKomentarPoPoziciji({});
    setAktivnaKolona(-1);
    setTastMerenjaVidljiva(false);
  }, []);

  const clearFotoKomentar = useCallback(() => {
    setFotoPoPoziciji({});
    setKomentarPoPoziciji({});
  }, []);

  const notifyMerenjaChange = useCallback(() => {
    onMerenjaChange?.(koloneRef.current);
  }, [onMerenjaChange]);

  const fokusirajKolonu = useCallback((idx) => {
    if (idx < 0) return;
    const f = () => inputRefs.current[idx]?.focus?.({ preventScroll: false });
    requestAnimationFrame(() => requestAnimationFrame(f));
    setTimeout(f, 60);
  }, []);

  const aktivnaMerenjaInputIdx = useCallback(() => {
    const el = document.activeElement;
    if (!el) return -1;
    return inputRefs.current.findIndex((inp) => inp === el);
  }, []);

  const prebaciNaSledecuPraznuKolonu = useCallback((odIdx = 0) => {
    const sledeca = indeksSledecePrazno(koloneRef.current, potrebanBroj, odIdx);
    if (sledeca >= 0) {
      setAktivnaKolona(sledeca);
      if (koristiTastMerenja) setTastMerenjaVidljiva(false);
      else fokusirajKolonu(sledeca);
    }
    return sledeca;
  }, [potrebanBroj, fokusirajKolonu, koristiTastMerenja]);

  const dodajMerenje = useCallback((idx, rawOverride, opts = {}) => {
    const { fokusirajSledecu = true, azurirajAktivnu = true } = opts;
    if (dodajMerenjeLockRef.current.has(idx)) return false;
    dodajMerenjeLockRef.current.add(idx);

    const k0 = koloneRef.current[idx];
    if (!k0 || k0.naziv === "-") {
      queueMicrotask(() => dodajMerenjeLockRef.current.delete(idx));
      return false;
    }
    if (k0.merenja.length >= brojPotrebnihZaKolonu(k0, potrebanBroj)) {
      if (fokusirajSledecu) prebaciNaSledecuPraznuKolonu(idx + 1);
      queueMicrotask(() => dodajMerenjeLockRef.current.delete(idx));
      return false;
    }
    const kalBlok = kalUpozorenja.find((u) => u.pozicija === k0.naziv && kalibracijaBlokiraUnos(u.status));
    if (kalBlok && !mozeUpRikosKalibracije) {
      setPoruka(
        `Merilo „${k0.instrument}”${kalBlok.meriloBroj ? ` (#${kalBlok.meriloBroj})` : ""} — kalibracija istekla. `
        + (mozeAdmin
          ? "Klikni „Admin: dozvoli merenje“ ispod ili kalibriši merilo u tabu MERILA."
          : "Obavesti admina ili kalibriši merilo."),
      );
      queueMicrotask(() => dodajMerenjeLockRef.current.delete(idx));
      return false;
    }

    const inp = rawOverride !== undefined ? String(rawOverride) : k0.input;
    const val = validirajUnos(inp, k0.jedinica, {
      lslDec: k0.lslDec,
      uslDec: k0.uslDec,
      nominalDec: k0.nominalDec,
    });
    if (!val.ok) {
      if (val.poruka) setPoruka(val.poruka);
      if (!val.zadrziUnos) {
        setKolone((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], input: "" };
          return next;
        });
      }
      queueMicrotask(() => dodajMerenjeLockRef.current.delete(idx));
      return false;
    }

    setPoruka("");
    const status = proveriOkNok(val.vrednost, k0.lslDec, k0.uslDec, k0.jedinica);
    let sledecaIdx = idx;
    poslednjaKolonaUnosRef.current = idx;
    setKolone((prev) => {
      const next = [...prev];
      const col = { ...next[idx] };
      col.merenja = [...col.merenja, { raw: val.vrednost, dec: val.dec }];
      if (status === "OK") col.cntOK += 1;
      else col.cntNOK += 1;
      col.input = "";
      col.ukupnoLabel = `${col.merenja.length} / ${brojPotrebnihZaKolonu(col, potrebanBroj)}`;
      next[idx] = col;
      if (col.merenja.length >= brojPotrebnihZaKolonu(col, potrebanBroj)) {
        sledecaIdx = indeksSledecePrazno(next, potrebanBroj, idx + 1);
      }
      return next;
    });
    queueMicrotask(() => {
      notifyMerenjaChange();
      dodajMerenjeLockRef.current.delete(idx);
    });

    if (fokusirajSledecu || azurirajAktivnu) {
      if (sledecaIdx >= 0 && azurirajAktivnu) {
        setAktivnaKolona(sledecaIdx);
        if (fokusirajSledecu) {
          if (koristiTastMerenja) {
            setTastMerenjaVidljiva(true);
            requestAnimationFrame(() => inputRefs.current[sledecaIdx]?.focus?.({ preventScroll: true }));
          } else {
            fokusirajKolonu(sledecaIdx);
          }
        }
      } else if (azurirajAktivnu) {
        setAktivnaKolona(-1);
        if (fokusirajSledecu && koristiTastMerenja) setTastMerenjaVidljiva(false);
      }
    }
    return true;
  }, [
    potrebanBroj, kalUpozorenja, mozeUpRikosKalibracije, mozeAdmin, setPoruka,
    prebaciNaSledecuPraznuKolonu, koristiTastMerenja, fokusirajKolonu, notifyMerenjaChange,
  ]);

  const promeniInputMerenja = useCallback((i, v, k) => {
    if (kolonaJePuna(k)) return;
    setKolone((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], input: v };
      return next;
    });
    if (unosMerenjaSpremanZaDodavanje(v, k)) {
      queueMicrotask(() => dodajMerenje(i, v, { fokusirajSledecu: true, azurirajAktivnu: true }));
    }
  }, [dodajMerenje, kolonaJePuna]);

  const pokusajDodajMerenje = useCallback((i, opts = {}) => {
    const k = koloneRef.current[i];
    if (!k || kolonaJePuna(k)) return;
    const v = String(k.input || "").trim();
    if (!v) return;
    if (unosMerenjaNepotpun(v, k)) return;
    dodajMerenje(i, v, opts);
  }, [dodajMerenje, kolonaJePuna]);

  const blurInputMerenja = useCallback((i) => {
    pokusajDodajMerenje(i, { fokusirajSledecu: false, azurirajAktivnu: false });
  }, [pokusajDodajMerenje]);

  const keyDownInputMerenja = useCallback((e, i, k) => {
    if (e.key === "Enter") {
      e.preventDefault();
      pokusajDodajMerenje(i);
    }
  }, [pokusajDodajMerenje]);

  const klikDodajMerenje = useCallback((i) => {
    pokusajDodajMerenje(i);
  }, [pokusajDodajMerenje]);

  const obrisiPoslednje = useCallback(() => {
    const cols = koloneRef.current;
    let idx = poslednjaKolonaUnosRef.current;
    if (idx < 0 || !cols[idx]?.merenja?.length) {
      if (aktivnaKolona >= 0 && cols[aktivnaKolona]?.merenja?.length) {
        idx = aktivnaKolona;
      } else {
        for (let i = cols.length - 1; i >= 0; i -= 1) {
          if (cols[i].naziv !== "-" && cols[i].merenja?.length) {
            idx = i;
            break;
          }
        }
      }
    }
    if (idx < 0 || !cols[idx]?.merenja?.length) return;

    setKolone((prev) => {
      const next = [...prev];
      const k = next[idx];
      if (!k || k.naziv === "-" || !k.merenja.length) return prev;
      const col = { ...k };
      const last = col.merenja[col.merenja.length - 1];
      const st = proveriOkNok(last.raw, col.lslDec, col.uslDec, col.jedinica);
      if (st === "OK") col.cntOK = Math.max(0, col.cntOK - 1);
      else col.cntNOK = Math.max(0, col.cntNOK - 1);
      col.merenja = col.merenja.slice(0, -1);
      col.ukupnoLabel = `${col.merenja.length} / ${brojPotrebnihZaKolonu(col, potrebanBroj)}`;
      next[idx] = col;
      return next;
    });
    poslednjaKolonaUnosRef.current = idx;
    setAktivnaKolona(idx);
    queueMicrotask(notifyMerenjaChange);
  }, [aktivnaKolona, potrebanBroj, notifyMerenjaChange]);

  const primeniTastaturuMerenja = useCallback((akcija, cifra) => {
    const i = aktivnaKolona;
    if (i < 0) return;
    const k = koloneRef.current[i];
    if (!k || k.naziv === "-" || kolonaJePuna(k)) return;
    const v = primeniTastMerenja(akcija, k.input, k, cifra);
    promeniInputMerenja(i, v, k);
  }, [aktivnaKolona, kolonaJePuna, promeniInputMerenja]);

  const zatvoriTastMerenja = useCallback(() => {
    const i = aktivnaKolona;
    if (i >= 0) {
      blurInputMerenja(i);
      inputRefs.current[i]?.blur?.();
    }
    setTastMerenjaVidljiva(false);
    setAktivnaKolona(-1);
  }, [aktivnaKolona, blurInputMerenja]);

  const gotovoDodajTastMerenja = useCallback(() => {
    const i = aktivnaKolona;
    if (i < 0) {
      setTastMerenjaVidljiva(false);
      return;
    }
    const k = koloneRef.current[i];
    if (!k || k.naziv === "-" || kolonaJePuna(k)) {
      zatvoriTastMerenja();
      return;
    }
    if (!String(k.input || "").trim()) {
      zatvoriTastMerenja();
      return;
    }
    pokusajDodajMerenje(i);
  }, [aktivnaKolona, kolonaJePuna, zatvoriTastMerenja, pokusajDodajMerenje]);

  useEffect(() => {
    if (koristiTastMerenja) return;
    if (unosKorak !== "forma" || aktivnaKolona < 0) return;
    const fokusIdx = aktivnaMerenjaInputIdx();
    if (fokusIdx >= 0) {
      if (fokusIdx !== aktivnaKolona) setAktivnaKolona(fokusIdx);
      return;
    }
    const k = koloneRef.current[aktivnaKolona];
    if (kolonaJePuna(k)) {
      const sledeca = indeksSledecePrazno(koloneRef.current, potrebanBroj, aktivnaKolona + 1);
      if (sledeca >= 0 && sledeca !== aktivnaKolona) {
        setAktivnaKolona(sledeca);
        return;
      }
      return;
    }
    fokusirajKolonu(aktivnaKolona);
  }, [
    aktivnaKolona, unosKorak, potrebanBroj, kolonaJePuna, fokusirajKolonu,
    koristiTastMerenja, aktivnaMerenjaInputIdx,
  ]);

  useImperativeHandle(ref, () => ({
    getKolone: () => koloneRef.current,
    setKolone,
    resetKolone,
    getFotoPoPoziciji: () => fotoPoPoziciji,
    getKomentarPoPoziciji: () => komentarPoPoziciji,
    setFotoPoPoziciji,
    setKomentarPoPoziciji,
    clearFotoKomentar,
    setAktivnaKolona,
    obrisiPoslednje,
    getAktivnaKolona: () => aktivnaKolona,
    oznaciMerenjeSnimljeno: (colIdx, merIdx) => {
      setKolone((prev) => {
        const next = [...prev];
        const col = { ...next[colIdx] };
        if (!col?.merenja?.[merIdx]) return prev;
        const mer = [...col.merenja];
        mer[merIdx] = { ...mer[merIdx], snimljenoDb: true };
        col.merenja = mer;
        next[colIdx] = col;
        return next;
      });
      queueMicrotask(notifyMerenjaChange);
    },
  }), [
    fotoPoPoziciji, komentarPoPoziciji, aktivnaKolona,
    resetKolone, clearFotoKomentar, notifyMerenjaChange,
  ]);

  const kolonaKarticaProps = useMemo(() => ({
    aktivnaKolona,
    setAktivnaKolona,
    koristiTastMerenja,
    tastMerenjaVidljiva,
    setTastMerenjaVidljiva,
    inputRefs,
    kolonaJePuna,
    prebaciNaSledecuPraznuKolonu,
    promeniInputMerenja,
    blurInputMerenja,
    keyDownInputMerenja,
    klikDodajMerenje,
    fotoPoPoziciji,
    setFotoPoPoziciji,
    komentarPoPoziciji,
    setKomentarPoPoziciji,
    setPoruka,
  }), [
    aktivnaKolona, koristiTastMerenja, tastMerenjaVidljiva,
    kolonaJePuna, prebaciNaSledecuPraznuKolonu, promeniInputMerenja,
    blurInputMerenja, keyDownInputMerenja, klikDodajMerenje,
    fotoPoPoziciji, komentarPoPoziciji, setPoruka,
  ]);

  const value = useMemo(() => ({
    kolone,
    setKolone,
    aktivnaKolona,
    setAktivnaKolona,
    fotoPoPoziciji,
    setFotoPoPoziciji,
    komentarPoPoziciji,
    setKomentarPoPoziciji,
    tastMerenjaVidljiva,
    setTastMerenjaVidljiva,
    inputRefs,
    kolonaJePuna,
    kolonaKarticaProps,
    prebaciNaSledecuPraznuKolonu,
    promeniInputMerenja,
    blurInputMerenja,
    keyDownInputMerenja,
    klikDodajMerenje,
    obrisiPoslednje,
    primeniTastaturuMerenja,
    gotovoDodajTastMerenja,
    zatvoriTastMerenja,
    resetKolone,
    dodajMerenje,
    pokusajDodajMerenje,
  }), [
    kolone, aktivnaKolona, fotoPoPoziciji, komentarPoPoziciji, tastMerenjaVidljiva,
    kolonaKarticaProps, kolonaJePuna, prebaciNaSledecuPraznuKolonu,
    promeniInputMerenja, blurInputMerenja, keyDownInputMerenja, klikDodajMerenje,
    obrisiPoslednje, primeniTastaturuMerenja, gotovoDodajTastMerenja, zatvoriTastMerenja,
    resetKolone, dodajMerenje, pokusajDodajMerenje,
  ]);

  return (
    <MerljiveKoloneContext.Provider value={value}>
      {children}
    </MerljiveKoloneContext.Provider>
  );
});
