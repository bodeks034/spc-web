import { useState, useCallback, useRef } from "react";

/**
 * Hook za upravljanje stanjem digitalnog merila (vaga/instrument).
 * Ekstrahovano iz VarijabilneForma radi čitljivosti.
 */
export default function useMeriloState() {
  const [meriloPovezano, setMeriloPovezano] = useState(false);
  const [kljucPovezan, setKljucPovezan] = useState(false);
  const [meriloSimulacija, setMeriloSimulacija] = useState(false);
  const [autoSnimiMerilo, setAutoSnimiMerilo] = useState(() => {
    try {
      return localStorage.getItem("merilo_auto_snimi") === "1";
    } catch {
      return false;
    }
  });

  const meriloStopRef = useRef(null);
  const meriloSimulirajRef = useRef(null);
  const snimaMeriloRef = useRef(false);
  const autoSnimiMeriloRef = useRef(autoSnimiMerilo);
  autoSnimiMeriloRef.current = autoSnimiMerilo;

  const registerMeriloStop = useCallback((fn) => {
    meriloStopRef.current = fn;
  }, []);

  const registerMeriloSimuliraj = useCallback((fn) => {
    meriloSimulirajRef.current = fn;
  }, []);

  const onMeriloPovezanChange = useCallback((povezan, opts = {}) => {
    setMeriloPovezano(povezan);
    setMeriloSimulacija(!!opts.simulacija);
  }, []);

  const onAutoSnimiMeriloChange = useCallback((v) => {
    setAutoSnimiMerilo(v);
    try {
      localStorage.setItem("merilo_auto_snimi", v ? "1" : "0");
    } catch { /* private mode / quota */ }
  }, []);

  return {
    meriloPovezano,
    kljucPovezan,
    setKljucPovezan,
    meriloSimulacija,
    autoSnimiMerilo,
    meriloStopRef,
    meriloSimulirajRef,
    snimaMeriloRef,
    autoSnimiMeriloRef,
    registerMeriloStop,
    registerMeriloSimuliraj,
    onMeriloPovezanChange,
    onAutoSnimiMeriloChange,
  };
}
