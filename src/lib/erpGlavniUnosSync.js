/** ERP master/QM podaci → Glavni unos, raspoređeno po SifraVozila. */

const LINIJA_PO_POGONU = {
  A: "Ulazna kontrola",
  B: "Preseraj",
  C: "Karoserija",
  D: "Lakirnica",
  E: "Montaža",
  F: "Završna kontrola",
  G: "Mašinska obrada",
  H: "Alatnica",
};

function norm(value) {
  return String(value || "").trim().toUpperCase();
}

export function erpGlavniUnosKljuc(karakteristika) {
  return [
    norm(karakteristika?.id_deo),
    norm(karakteristika?.pogon_kod || "A"),
    String(karakteristika?.sifra_merenja || karakteristika?.sifra_karakteristike || "").trim(),
    String(karakteristika?.pozicija || "").trim(),
  ].join("|");
}

function izaberiRadniNalog(karakteristika, nalozi) {
  const eksplicitni = norm(karakteristika.radni_nalog);
  if (eksplicitni) {
    const hit = nalozi.find((r) => norm(r.broj_naloga) === eksplicitni);
    if (hit) return hit;
  }
  const pogon = norm(karakteristika.pogon_kod);
  return nalozi
    .filter((r) => norm(r.pogon_kod) === pogon && norm(r.status) !== "ZAVRSEN")
    .sort((a, b) => {
      const datumA = String(a.datum_proizvodnje || a.datum_unosa || "");
      const datumB = String(b.datum_proizvodnje || b.datum_unosa || "");
      return datumB.localeCompare(datumA) || norm(a.broj_naloga).localeCompare(norm(b.broj_naloga));
    })[0] || null;
}

export function napraviErpGlavniUnosRedove({
  delovi = [],
  karakteristike = [],
  radniNalozi = [],
  sheetovi = [],
} = {}) {
  const deoById = new Map(delovi.map((r) => [norm(r.id_deo), r]));
  const sheetByVozilo = new Map(
    sheetovi
      .filter((r) => r.aktivan !== false && norm(r.sifra_vozila))
      .map((r) => [norm(r.sifra_vozila), r.naziv]),
  );
  const rnByDeo = new Map();
  for (const rn of radniNalozi) {
    const id = norm(rn.id_deo);
    if (!rnByDeo.has(id)) rnByDeo.set(id, []);
    rnByDeo.get(id).push(rn);
  }

  const redosledPoSheetu = new Map();
  const redovi = [];
  const bezMape = new Set();

  for (const kar of karakteristike) {
    const idDeo = norm(kar.id_deo);
    const deo = deoById.get(idDeo);
    if (!deo) continue;
    const sifraVozila = norm(deo.sifra_vozila);
    const sheetNaziv = sheetByVozilo.get(sifraVozila);
    if (!sheetNaziv) {
      if (sifraVozila) bezMape.add(sifraVozila);
      continue;
    }

    const rn = izaberiRadniNalog(kar, rnByDeo.get(idDeo) || []);
    const redosled = redosledPoSheetu.get(sheetNaziv) || 0;
    redosledPoSheetu.set(sheetNaziv, redosled + 1);
    const pogon = norm(kar.pogon_kod || "A");

    redovi.push({
      sheet_naziv: sheetNaziv,
      redosled,
      id_deo: idDeo,
      datum: rn?.datum_proizvodnje || rn?.datum_unosa || null,
      broj_crteza: deo.broj_crteza || idDeo,
      radni_nalog: rn?.broj_naloga || kar.radni_nalog || null,
      kupac: rn?.kupac || null,
      naziv_dela: deo.naziv_dela || kar.naziv_dela || null,
      slika: deo.slika_naziv || kar.slika || null,
      linija: kar.linija_faza || LINIJA_PO_POGONU[pogon] || null,
      operacija: kar.sifra_operacije || kar.faza_naziv || null,
      masina_id: kar.masina_id || null,
      ukupno_kom: rn?.kolicina || kar.ukupno_kom || null,
      kom_za_kontrolu_n: kar.kom_za_kontrolu_n || deo.kom_za_kontrolu || 30,
      karakteristika: kar.naziv_mere || kar.pozicija,
      klasa: kar.klasa || (kar.kriticna_karakteristika ? "Critical" : null),
      nominal: kar.nominala,
      usl: kar.usl,
      lsl: kar.lsl,
      jedinica: kar.jedinica || "mm",
      tip: kar.tip_karakteristike
        || (kar.nominala != null || kar.usl != null || kar.lsl != null ? "Merljiva" : "Atributivna"),
      instrument: kar.merni_instrument || kar.sifra_merila || null,
      nivo_kontrole_fac: kar.nivo_kontrole || null,
      fac_broj: kar.fai_broj_merenja || null,
      spc_broj_merenja: kar.broj_merenja || 5,
      reakcioni_plan: kar.napomena || null,
      podatke_uneo: "ERP CSV",
      pogon_kod: pogon,
      sifra_merenja: kar.sifra_merenja || kar.sifra_karakteristike || kar.pozicija,
      izvor: "erp",
      erp_kljuc: erpGlavniUnosKljuc(kar),
      updated_at: new Date().toISOString(),
    });
  }

  return { redovi, bezMape: [...bezMape].sort() };
}

function nedostajeNovaSema(error) {
  const msg = String(error?.message || "").toLowerCase();
  return msg.includes("glavni_unos_sheetovi")
    || msg.includes("erp_kljuc")
    || msg.includes("schema cache")
    || error?.code === "42P01";
}

export async function syncErpGlavniUnos(supabase, idDelova) {
  const ids = [...new Set((idDelova || []).map(norm).filter(Boolean))];
  if (!ids.length) return { ok: true, upsertovano: 0, bezMape: [] };

  const sheetRes = await supabase
    .from("glavni_unos_sheetovi")
    .select("naziv,sifra_vozila,aktivan")
    .eq("aktivan", true)
    .order("redosled")
    .order("naziv");
  if (sheetRes.error) {
    if (nedostajeNovaSema(sheetRes.error)) {
      return { ok: false, nedostajeMigracija: true, error: sheetRes.error };
    }
    return { ok: false, error: sheetRes.error };
  }

  const [deoRes, karRes, rnRes] = await Promise.all([
    supabase.from("delovi")
      .select("id_deo,naziv_dela,sifra_vozila,broj_crteza,slika_naziv,kom_za_kontrolu")
      .in("id_deo", ids),
    supabase.from("karakteristike_merljive").select("*").in("id_deo", ids),
    supabase.from("radni_nalozi")
      .select("broj_naloga,id_deo,pogon_kod,kolicina,status,kupac,datum_proizvodnje,datum_unosa")
      .in("id_deo", ids),
  ]);
  const greska = deoRes.error || karRes.error || rnRes.error;
  if (greska) return { ok: false, error: greska };

  const priprema = napraviErpGlavniUnosRedove({
    delovi: deoRes.data || [],
    karakteristike: karRes.data || [],
    radniNalozi: rnRes.data || [],
    sheetovi: sheetRes.data || [],
  });
  if (!priprema.redovi.length) {
    return { ok: true, upsertovano: 0, bezMape: priprema.bezMape };
  }

  // ERP redove ponovo materijalizuj: tako se deo preseli ako mu se promeni SifraVozila/sheet.
  // Ručni redovi (izvor NULL) ostaju netaknuti.
  await supabase.from("glavni_unos_redovi")
    .delete()
    .in("id_deo", ids)
    .eq("izvor", "erp");

  // Ukloni i stare probne ERP redove nastale pre kolona iz migracije 68.
  await supabase.from("glavni_unos_redovi")
    .delete()
    .in("id_deo", ids)
    .eq("podatke_uneo", "ERP CSV")
    .is("erp_kljuc", null);

  let upsertovano = 0;
  for (let i = 0; i < priprema.redovi.length; i += 100) {
    const batch = priprema.redovi.slice(i, i + 100);
    const { error } = await supabase.from("glavni_unos_redovi")
      .upsert(batch, { onConflict: "sheet_naziv,erp_kljuc" });
    if (error) return { ok: false, error, upsertovano, bezMape: priprema.bezMape };
    upsertovano += batch.length;
  }
  return { ok: true, upsertovano, bezMape: priprema.bezMape };
}
