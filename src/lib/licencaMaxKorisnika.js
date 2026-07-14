/** Provera kvote korisnika iz licence (max_korisnika). */

export async function brojAktivnihRadnika(supabase) {
  const { count, error } = await supabase
    .from("radnici")
    .select("id", { count: "exact", head: true })
    .eq("aktivan", true);
  if (!error) return count ?? 0;

  const { data, error: err2 } = await supabase
    .from("radnici")
    .select("id")
    .eq("aktivan", true);
  if (err2) throw err2;
  return data?.length ?? 0;
}

/**
 * Pri loginu: dozvoli postojeće aktivne radnike; blokiraj nove kad je kvota puna.
 */
export async function proveriMaxKorisnika(supabase, { maxKorisnika, radnikId } = {}) {
  const max = Number(maxKorisnika);
  if (!Number.isFinite(max) || max <= 0) return { ok: true };

  const count = await brojAktivnihRadnika(supabase);

  if (radnikId) {
    const { data } = await supabase
      .from("radnici")
      .select("aktivan")
      .eq("id", radnikId)
      .maybeSingle();
    if (data?.aktivan) {
      return { ok: true, count, max, prekoraceno: count > max };
    }
  }

  if (count >= max) {
    return {
      ok: false,
      kod: "max_korisnika",
      count,
      max,
      poruka: `Licenca dozvoljava najviše ${max} aktivnih korisnika (trenutno ${count}). `
        + "Deaktivirajte nekog u Admin → Radnici ili kontaktirajte dobavljača za produženje.",
    };
  }

  return { ok: true, count, max };
}

/** Admin — da li može dodati novog aktivnog radnika. */
export async function mozeDodatiAktivnogRadnika(supabase, maxKorisnika) {
  const max = Number(maxKorisnika);
  if (!Number.isFinite(max) || max <= 0) return { ok: true };
  const count = await brojAktivnihRadnika(supabase);
  if (count >= max) {
    return {
      ok: false,
      poruka: `Dostignut limit licence: ${max} aktivnih korisnika (trenutno ${count}).`,
    };
  }
  return { ok: true, count, max };
}
