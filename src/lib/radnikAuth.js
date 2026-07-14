const RADNIK_SELECT = "ime,uloga,id,user_id,email,aktivan";

function radnikJeAktivan(r) {
  return !!r && r.aktivan !== false;
}

export async function nadjiRadnikaPoEmail(supabase, email) {
  const e = (email || "").trim().toLowerCase();
  if (!e) return null;
  const alt = e.includes("@fabrika.com")
    ? e.replace("@fabrika.com", "@fabrika.rs")
    : e.replace("@fabrika.rs", "@fabrika.com");

  for (const em of [e, alt]) {
    const { data } = await supabase.from("radnici")
      .select(RADNIK_SELECT).eq("email", em).maybeSingle();
    if (data) return data;
    const { data: ilike } = await supabase.from("radnici")
      .select(RADNIK_SELECT).ilike("email", em).maybeSingle();
    if (ilike) return ilike;
  }
  return null;
}

export async function ucitajRadnika(supabase, user) {
  if (!user) return null;
  const email = (user.email || "").trim().toLowerCase();

  let { data: r } = await supabase.from("radnici")
    .select(RADNIK_SELECT).eq("user_id", user.id).maybeSingle();

  if (!r && email) {
    r = await nadjiRadnikaPoEmail(supabase, email);
    if (r) {
      if (radnikJeAktivan(r) && !r.user_id) {
        const { error: linkErr } = await supabase.from("radnici")
          .update({ user_id: user.id, email })
          .eq("id", r.id);
        if (!linkErr) r = { ...r, user_id: user.id, email };
      } else if (r.user_id && r.user_id !== user.id) {
        r = null;
      }
    }
  }

  const deaktiviran = !!r && !radnikJeAktivan(r);
  const ulogaRaw = (r?.uloga || "kontrolor").toLowerCase().trim();
  const uloga = ["admin", "kontrolor", "operator", "kvalitet", "sef"].includes(ulogaRaw) ? ulogaRaw : "kontrolor";

  return {
    id: user.id,
    email: user.email,
    ime: r?.ime || user.email?.split("@")[0] || "Korisnik",
    uloga,
    radnikId: deaktiviran ? null : (r?.id ?? null),
    deaktiviran,
    userLinked: !!r?.user_id,
  };
}
