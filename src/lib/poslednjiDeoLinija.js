/** Zapamti poslednji id_deo po modulu (brži unos na liniji / tabletu). */

const KEY = "spc_poslednji_deo_linija";

export function sacuvajPoslednjiDeo(modul, idDeo, smena = null) {
  if (!modul || !idDeo) return;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    raw[modul] = {
      idDeo: String(idDeo).trim().toUpperCase(),
      smena: smena != null ? Number(smena) : null,
      ts: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(raw));
  } catch { /* */ }
}

export function procitajPoslednjiDeo(modul, smena = null) {
  if (!modul) return null;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    const e = raw[modul];
    if (!e?.idDeo) return null;
    if (smena != null && e.smena != null && Number(e.smena) !== Number(smena)) return null;
    return e.idDeo;
  } catch {
    return null;
  }
}

/** Briše zapamćeni id_deo pri izlasku iz modula (čist unos pri ponovnom ulasku). */
export function obrisiPoslednjiDeo(modul) {
  if (!modul) return;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    if (!raw[modul]) return;
    delete raw[modul];
    localStorage.setItem(KEY, JSON.stringify(raw));
  } catch { /* */ }
}
