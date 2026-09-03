import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { TEME } from "./teme.js";

/**
 * Tema je najglobalnija stvar u aplikaciji, a do sada se prosleđivala kao
 * `C` prop kroz stotine komponenti, uz istu inline lambdu za prebacivanje
 * ponovljenu na sedam mesta. Kontekst zadržava `C`/`setC` propove radi
 * kompatibilnosti — komponente se mogu prevoditi na `useTema()` postepeno.
 */
const TemaContext = createContext(null);

const KLJUC = "spc_tema";

export function TemaProvider({ children }) {
  const [C, setC] = useState(() => {
    const sacuvana = typeof localStorage !== "undefined" ? localStorage.getItem(KLJUC) : null;
    return sacuvana === "svetla" ? TEME.svetla : TEME.tamna;
  });

  useEffect(() => {
    try {
      localStorage.setItem(KLJUC, C.naziv);
    } catch { /* privatni režim — tema ostaje samo za ovu sesiju */ }
  }, [C]);

  const toggleTema = useCallback(() => {
    setC((p) => (p.naziv === "tamna" ? TEME.svetla : TEME.tamna));
  }, []);

  const vrednost = useMemo(
    () => ({ C, setC, toggleTema, temaTamna: C.naziv === "tamna" }),
    [C, toggleTema],
  );

  return <TemaContext.Provider value={vrednost}>{children}</TemaContext.Provider>;
}

export function useTema() {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error("useTema mora biti unutar <TemaProvider>");
  return ctx;
}

/** Bezbedna varijanta za komponente koje se još renderuju van providera. */
export function useTemaOpciono() {
  return useContext(TemaContext);
}
