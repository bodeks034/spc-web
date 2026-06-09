/**
 * ERP light — aktivni radni nalozi iz tabele radni_nalozi.
 * Podržava šemu sa broj_naloga (03_schema) i legacy radni_nalog (01_schema).
 */

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
  return {
    broj_naloga: broj,
    kupac: row.kupac || null,
    rok_isporuke: row.rok_isporuke || null,
    kolicina: planiranoKomIzReda(row),
    id_deo: row.id_deo ? String(row.id_deo).toUpperCase() : null,
    status: row.status || "aktivan",
  };
}

/** Najnoviji aktivan nalog za id_deo. */
export async function ucitajAktivniRadniNalog(supabase, idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return null;

  const { data: novi } = await supabase
    .from("radni_nalozi")
    .select("broj_naloga,kupac,rok_isporuke,kolicina,status,naziv_dela,id_deo,created_at")
    .eq("id_deo", id)
    .eq("status", "aktivan")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const izNovog = normalizujNalog(novi);
  if (izNovog) return izNovog;

  const { data: legacy } = await supabase
    .from("radni_nalozi")
    .select("radni_nalog,kom_ukupno,kom_za_kontrolu,status,id_deo,created_at")
    .eq("id_deo", id)
    .eq("status", "aktivan")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return normalizujNalog(legacy);
}

async function nadjiNalogPoBroju(supabase, broj) {
  const rn = String(broj || "").trim().toUpperCase();
  if (!rn) return [];

  const { data: poBroju } = await supabase
    .from("radni_nalozi")
    .select("broj_naloga,radni_nalog,id_deo,status")
    .eq("broj_naloga", rn)
    .limit(5);
  if (poBroju?.length) return poBroju;

  const { data: poLegacy } = await supabase
    .from("radni_nalozi")
    .select("broj_naloga,radni_nalog,id_deo,status")
    .eq("radni_nalog", rn)
    .limit(5);
  return poLegacy || [];
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
