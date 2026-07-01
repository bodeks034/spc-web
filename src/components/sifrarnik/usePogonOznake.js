import { useState, useEffect, useCallback } from "react";
import { fetchPogonLinijaMapa } from "../../lib/glavniUnosApi.js";
import { pogonMapaIzRedova, formatPogonOznaka, pogonSelectOpcije } from "../../lib/pogonOznaka.js";

export function usePogonOznake(addToast) {
  const [poKodu, setPoKodu] = useState(() => pogonMapaIzRedova([]));
  const [loading, setLoading] = useState(true);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchPogonLinijaMapa();
      setPoKodu(pogonMapaIzRedova(rows));
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  return {
    poKodu,
    loading,
    osvezi: ucitaj,
    format: (kod) => formatPogonOznaka(kod, poKodu),
    opcije: pogonSelectOpcije(poKodu),
  };
}
