/** ID sesije serije — isti ciklus unosa (deo + smena + nalog). */

const KEYS = {
  atributivne: "spc_sesija_attr",
  merljive: "spc_sesija_var",
};

export function generisiSesijaId(modul) {
  const pref = modul === "merljive" ? "VAR" : "ATR";
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const r = Math.random().toString(36).slice(2, 10);
  return `SPC-${pref}-${d}-${r}`;
}

export function getAktivnaSesija(modul) {
  try {
    const raw = sessionStorage.getItem(KEYS[modul]);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Vraća sesija_id za tekući nalog; kreira novu ako se promenio deo/smena ili forceNew.
 */
export function ensureSesija({ modul, idDeo, smena, radniNalog, forceNew = false }) {
  const deo = String(idDeo || "").toUpperCase();
  const sm = Number(smena) || 1;
  const rn = radniNalog || null;
  const cur = getAktivnaSesija(modul);

  if (
    !forceNew && cur
    && cur.id_deo === deo
    && Number(cur.smena) === sm
    && (cur.radni_nalog || null) === rn
  ) {
    return cur.sesija_id;
  }

  const sesija_id = generisiSesijaId(modul);
  sessionStorage.setItem(
    KEYS[modul],
    JSON.stringify({
      sesija_id,
      modul,
      id_deo: deo,
      smena: sm,
      radni_nalog: rn,
      started_at: new Date().toISOString(),
    }),
  );
  return sesija_id;
}

export function novaSesija(params) {
  return ensureSesija({ ...params, forceNew: true });
}

export function clearSesija(modul) {
  sessionStorage.removeItem(KEYS[modul]);
}

export function clearSveSesije() {
  Object.values(KEYS).forEach(k => sessionStorage.removeItem(k));
}
