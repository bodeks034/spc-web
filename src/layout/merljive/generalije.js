/**
 * Dimenzije reda generalija — merljive desktop/laptop.
 * flex-basis = početna širina; polje raste proporcionalno (flex-grow).
 */
export const DIM_GENERALIJE_RED = {
  gap: 8,
  label: { fontSize: 10, marginBottom: 3 },
  input: {
    fontSize: 12,
    padding: "5px 6px",
    borderRadius: 5,
    visina: 30,
    lineHeight: "18px",
  },
  /** Polje 📷 — fiksna širina (ne raste) */
  kamera: {
    sirina: 24,
    razmakOdId: 4,
    fontIkona: 11,
  },
  polja: {
    datum: { grow: 0, basis: 94 },
    smena: { grow: 0, basis: 50 },
    idDeo: { grow: 1.2, basis: 72 },
    radniNalog: { grow: 1, basis: 78 },
    nazivDela: { grow: 1.4, basis: 92 },
    linija: { grow: 0.8, basis: 58 },
    kontrolor: { grow: 1.1, basis: 82 },
    masina: { grow: 0.8, basis: 58 },
  },
};

export function flexPolje({ grow, basis }) {
  return {
    flex: `${grow} 1 ${basis}px`,
    minWidth: `${basis}px`,
  };
}
