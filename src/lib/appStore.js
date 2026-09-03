import { create } from "zustand";

/**
 * Globalni app store — zamena za prop-drilling korisnika, modula i rezima.
 * Postepeno se uvodi: nove komponente koriste useAppStore, stare i dalje primaju props.
 */
const useAppStore = create((set) => ({
  korisnik: null,
  modul: null,
  rezimRada: "linija",
  licenca: null,
  temaC: null,

  setKorisnik: (k) => set({ korisnik: k }),
  setModul: (m) => set({ modul: m }),
  setRezimRada: (r) => set({ rezimRada: r }),
  setLicenca: (l) => set({ licenca: l }),
  setTemaC: (c) => set({ temaC: c }),

  reset: () =>
    set({
      korisnik: null,
      modul: null,
      rezimRada: "linija",
      licenca: null,
      temaC: null,
    }),
}));

/** Jedan upis iz App.jsx — ostale komponente čitaju iz store-a. */
export function sinhronizujAppStore({ korisnik, modul, rezimRada, licenca, temaC }) {
  useAppStore.setState({
    korisnik: korisnik ?? null,
    modul: modul ?? null,
    rezimRada: rezimRada || "linija",
    licenca: licenca ?? null,
    temaC: temaC ?? null,
  });
}

export default useAppStore;
