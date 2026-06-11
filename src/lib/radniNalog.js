/**
 * ERP light — aktivni radni nalozi iz tabele radni_nalozi.
 * Šema 03: kolona broj_naloga (ne radni_nalog).
 */

import { pogonIzRn, pogonKodIzRnReda } from "./pogonSop.js";

export function brojNalogaIzReda(row) {
  if (!row) return "";
  return String(row.broj_naloga || row.radni_nalog || "").trim().toUpperCase();
}

export function planiranoKomIzReda(row) {
  if (!row) return 0;
  return Number(row.kolicina || row.kom_ukupno || row.kom_za_kontrolu || 0) || 0;
}

/** Prioritet: barkod/ručni > baza > SOP. */
export function izaberiRadniNalog({ eksplicitni, izBaze, izSop } = {}) {
  const e = String(eksplicitni || "").trim().toUpperCase();
  if (e) return e;
  const b = brojNalogaIzReda(izBaze);
  if (b) return b;
  return String(izSop || "").trim().toUpperCase();
}

function normalizujNalog(row) {
  if (!row) return null;
  const broj = brojNalogaIzReda(row);
  if (!broj) return null;
  const pogon = row.pogon_kod
    ? String(row.pogon_kod).toUpperCase()
    : pogonIzRn(broj);
  return {
    broj_naloga: broj,
    kupac: row.kupac || null,
    rok_isporuke: row.rok_isporuke || null,
    kolicina: planiranoKomIzReda(row),
    id_deo: row.id_deo ? String(row.id_deo).toUpperCase() : null,
    pogon_kod: pogon || null,
    status: row.status || "aktivan",
  };
}

const POLJA_NALOGA = "broj_naloga,kupac,rok_isporuke,kolicina,kom_ukupno,kom_za_kontrolu,status,naziv_dela,id_deo,pogon_kod,created_at";

function nadjiNalogZaPogon(redovi, pogon) {
  const p = String(pogon || "").trim().toUpperCase();
  if (!p) return redovi[0] || null;
  const direktan = redovi.find((r) => pogonKodIzRnReda(r) === p);
  if (direktan) return direktan;
  if (redovi.length === 1 && !pogonKodIzRnReda(redovi[0]) && p === "A") {
    return redovi[0];
  }
  return null;
}

/** Najnoviji aktivan nalog za id_deo (filtriran po pogon_kod ili sufiksu RN). */
export async function ucitajAktivniRadniNalog(supabase, idDeo, pogonKod) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return null;
  const pogon = String(pogonKod || "").trim().toUpperCase();

  const { data: novi, error } = await supabase
    .from("radni_nalozi")
    .select(POLJA_NALOGA)
    .eq("id_deo", id)
    .eq("status", "aktivan")
    .order("created_at", { ascending: false });

  if (error) return null;

  const aktivni = novi || [];
  if (!aktivni.length) return null;

  const red = nadjiNalogZaPogon(aktivni, pogon);
  return normalizujNalog(red);
}

async function nadjiNalogPoBroju(supabase, broj) {
  const rn = String(broj || "").trim().toUpperCase();
  if (!rn) return [];

  const { data: poBroju } = await supabase
    .from("radni_nalozi")
    .select("broj_naloga,id_deo,status")
    .eq("broj_naloga", rn)
    .limit(5);
  return poBroju || [];
}

/** Nalog za par id_deo + broj RN (količina lota za AQL). */
export async function ucitajNalogZaDeoIRn(supabase, idDeo, radniNalog) {
  const id = String(idDeo || "").trim().toUpperCase();
  const rn = String(radniNalog || "").trim().toUpperCase();
  if (!id || !rn) return null;

  const { data: poBroju, error } = await supabase
    .from("radni_nalozi")
    .select(POLJA_NALOGA)
    .eq("broj_naloga", rn)
    .eq("id_deo", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return normalizujNalog(poBroju);
}

/** Mekano upozorenje — ne blokira snimanje. */
export async function proveriRadniNalogUpozorenje(supabase, { idDeo, radniNalog }) {
  const rn = String(radniNalog || "").trim().toUpperCase();
  if (!rn) return null;

  const id = String(idDeo || "").trim().toUpperCase();
  const redovi = await nadjiNalogPoBroju(supabase, rn);

  if (!redovi.length) {
    return `RN ${rn} nije u šifrarniku radnih naloga`;
  }

  const aktivniZaDeo = redovi.filter(
    (r) => (r.status || "").toLowerCase() === "aktivan"
      && String(r.id_deo || "").toUpperCase() === id,
  );
  if (aktivniZaDeo.length) return null;

  const drugiDeo = redovi.find((r) => String(r.id_deo || "").toUpperCase() !== id);
  if (drugiDeo?.id_deo) {
    return `RN ${rn} pripada delu ${String(drugiDeo.id_deo).toUpperCase()}, ne ${id}`;
  }

  if (!redovi.some((r) => (r.status || "").toLowerCase() === "aktivan")) {
    return `RN ${rn} nije aktivan u šifrarniku`;
  }

  return `RN ${rn} nije povezan sa delom ${id}`;
}

export function formatNalogToast(nalog) {
  if (!nalog?.broj_naloga) return "";
  const kupac = nalog.kupac ? ` (${nalog.kupac})` : "";
  return `Nalog: ${nalog.broj_naloga}${kupac}`;
}
