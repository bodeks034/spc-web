import { useState, useEffect, useCallback } from "react";
import { ucitajSifrarnikOpcije } from "../../lib/sifrarnikOpcije.js";

export function useSifrarnikOpcije(addToast) {
  const [opcije, setOpcije] = useState(null);
  const [loading, setLoading] = useState(true);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      setOpcije(await ucitajSifrarnikOpcije());
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  return { opcije, loading, osveziOpcije: ucitaj, setOpcije };
}
