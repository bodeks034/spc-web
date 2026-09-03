/**
 * Privremene linije vozila (VOZ-XX) i samostalnih proizvoda (PRO-XX).
 * Kod je stabilan; Naziv u tipovi_vozila menja inženjer kad sazna pravo ime.
 */

export const PREFIKS_VOZILO = "VOZ-";
export const PREFIKS_PROIZVOD = "PRO-";

export function normalizujKodLinije(kod) {
  return String(kod || "").trim().toUpperCase();
}

export function jeLinijaVozila(kod) {
  return /^VOZ-\d+$/i.test(normalizujKodLinije(kod));
}

export function jeLinijaProizvod(kod) {
  return /^PRO-\d+$/i.test(normalizujKodLinije(kod));
}

/** @param {Array<{ kod?: string, naziv?: string, aktivan?: boolean }>} lista */
export function grupisiLinije(lista) {
  const vozila = [];
  const proizvodi = [];
  const ostalo = [];
  for (const t of lista || []) {
    if (t.aktivan === false) continue;
    const kod = normalizujKodLinije(t.kod);
    if (jeLinijaVozila(kod)) vozila.push({ ...t, kod });
    else if (jeLinijaProizvod(kod)) proizvodi.push({ ...t, kod });
    else ostalo.push({ ...t, kod });
  }
  const poBroju = (a, b) => {
    const na = parseInt(String(a.kod).split("-")[1], 10) || 0;
    const nb = parseInt(String(b.kod).split("-")[1], 10) || 0;
    return na - nb || String(a.kod).localeCompare(String(b.kod));
  };
  vozila.sort(poBroju);
  proizvodi.sort(poBroju);
  ostalo.sort((a, b) => String(a.kod).localeCompare(String(b.kod)));
  return { vozila, proizvodi, ostalo };
}

export function oznakaLinije(kod) {
  if (jeLinijaVozila(kod)) return "Vozilo";
  if (jeLinijaProizvod(kod)) return "Proizvod";
  return "Linija";
}

/** Legacy linije (MRAP, NTV…) — nisu VOZ/PRO starter model. */
export function jeLegacyLinija(kod) {
  const k = normalizujKodLinije(kod);
  if (!k) return false;
  return !jeLinijaVozila(k) && !jeLinijaProizvod(k);
}

/** Da li deo pripada izabranoj liniji (vozilo_katalog_id / šifra / prefiks ID). */
export function deoPripadaLiniji(deo, kodLinije) {
  const k = normalizujKodLinije(kodLinije);
  if (!k || !deo) return true;
  const vk = normalizujKodLinije(deo.vozilo_katalog_id);
  const sv = normalizujKodLinije(deo.sifra_vozila);
  if (vk === k || sv === k) return true;
  const id = normalizujKodLinije(deo.id_deo);
  if (id.startsWith(`${k}-`)) return true;
  return false;
}

/** PostgREST `.or(...)` za fetch/count po radnoj liniji. */
export function primeniFilterLinijeNaQuery(q, linijaKod) {
  const k = normalizujKodLinije(linijaKod);
  if (!k || !q) return q;
  const esc = k.replace(/,/g, "");
  return q.or(`vozilo_katalog_id.eq.${esc},sifra_vozila.eq.${esc},id_deo.ilike.${esc}-%`);
}

export function predlogSheetaZaLiniju(kod, vrsta = "delovi") {
  const baza = normalizujKodLinije(kod).toLowerCase();
  return vrsta === "final" ? `${baza}_final` : `${baza}_delovi`;
}

/** Podrazumevani tip čarobnjaka po liniji i nameni unosa. */
export function tipUnosaZaLiniju(kod, namena = "komponenta") {
  if (namena === "final") {
    return jeLinijaVozila(kod) ? "final_vozilo" : "final_proizvod";
  }
  return "komponenta";
}
