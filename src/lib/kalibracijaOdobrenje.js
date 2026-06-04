/** Admin dozvola za merenje uprkos istekloj kalibraciji (po ID dela, sesija). */

function kljuc(idDeo) {
  return `spc_kal_odobren_${String(idDeo || "").trim().toUpperCase()}`;
}

export function jeKalibracijaOdobrena(idDeo) {
  if (!idDeo) return false;
  try {
    return sessionStorage.getItem(kljuc(idDeo)) === "1";
  } catch {
    return false;
  }
}

export function postaviKalibracijaOdobrena(idDeo, odobreno) {
  if (!idDeo) return;
  try {
    if (odobreno) {
      sessionStorage.setItem(kljuc(idDeo), "1");
    } else {
      sessionStorage.removeItem(kljuc(idDeo));
    }
  } catch { /* */ }
}
