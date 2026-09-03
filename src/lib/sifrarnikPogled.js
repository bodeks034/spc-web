/** Pogled Modula 0: radni režim (dnevni sto) vs pun hub (svi tabovi). */
export const SIFRARNIK_POGLED_KEY = "spc_sifrarnik_pogled";

export const SIFRARNIK_POGLED = {
  RADNI: "radni",
  HUB: "hub",
};

export function ucitajSifrarnikPogled() {
  try {
    const v = localStorage.getItem(SIFRARNIK_POGLED_KEY);
    if (v === SIFRARNIK_POGLED.HUB) return SIFRARNIK_POGLED.HUB;
  } catch { /* ignore */ }
  return SIFRARNIK_POGLED.RADNI;
}

export function sacuvajSifrarnikPogled(pogled) {
  try {
    const v = pogled === SIFRARNIK_POGLED.HUB ? SIFRARNIK_POGLED.HUB : SIFRARNIK_POGLED.RADNI;
    localStorage.setItem(SIFRARNIK_POGLED_KEY, v);
  } catch { /* ignore */ }
}
