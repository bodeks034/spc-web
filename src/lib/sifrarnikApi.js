/** API šifrarnika — tipovi vozila, katalog defekata, barkod profili. */

import { supabase } from "./supabaseClient.js";
import { buildSadrzajBarkoda } from "./barkodEtiketa.js";
import {
  stripKarakteristikeForDbUpsert,
  normalizujKarakteristikuRed,
  KARAKTERISTIKE_UPSERT_CONFLICT,
  KARAKTERISTIKE_DB_COLS,
} from "./karakteristikaMerljive.js";
import { ensureDeoMasterMinimal, syncMerljiviSifrarnikZaDeo } from "./importDerivedSifrarnik.js";
import { normalizujIdDeo, jePunIdDeo } from "./idDeoUtil.js";
import { ucitajRedovePoIdDeo } from "./idDeoQuery.js";

function greskaNedostajeTabela(error) {
  const m = (error?.message || "").toLowerCase();
  return m.includes("does not exist") || m.includes("could not find") || error?.code === "42P01";
}

export async function fetchTipoviVozila() {
  const { data, error } = await supabase.from("tipovi_vozila")
    .select("*")
    .order("kod");
  if (error) {
    if (greskaNedostajeTabela(error)) return fetchTipoviIzKataloga();
    throw error;
  }
  return data || [];
}

/** Fallback ako migracija 39 još nije pokrenuta. */
async function fetchTipoviIzKataloga() {
  const { data, error } = await supabase.from("katalog_gresaka_vozilo")
    .select("vozilo_id");
  if (error) throw error;
  const kodovi = [...new Set((data || []).map((r) => r.vozilo_id).filter(Boolean))].sort();
  return kodovi.map((kod) => ({
    kod,
    naziv: kod,
    prefiks_id_deo: kod,
    slika_sop: null,
    dijagram_src: null,
    aktivan: true,
    napomena: "Iz katalog_gresaka_vozilo (pokreni 39_sifrarnik_modul.sql)",
  }));
}

export async function upsertTipVozila(tip) {
  const payload = {
    kod: String(tip.kod || "").trim().toUpperCase(),
    naziv: String(tip.naziv || tip.kod || "").trim(),
    prefiks_id_deo: tip.prefiks_id_deo?.trim() || null,
    slika_sop: tip.slika_sop?.trim() || null,
    dijagram_src: tip.dijagram_src?.trim() || null,
    aktivan: tip.aktivan !== false,
    napomena: tip.napomena?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("tipovi_vozila")
    .upsert(payload, { onConflict: "kod" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchKatalogVozilo(voziloId) {
  const { data, error } = await supabase.from("katalog_gresaka_vozilo")
    .select("*")
    .order("kategorija")
    .order("podkategorija")
    .order("defekt");
  if (error) throw error;

  const all = data || [];
  const v = String(voziloId || "").trim().toUpperCase();
  if (!v) return all;

  const tacno = all.filter((r) => String(r.vozilo_id || "").toUpperCase() === v);
  if (tacno.length) return tacno;

  return all.filter((r) => {
    const vid = String(r.vozilo_id || "").toUpperCase();
    return vid.startsWith(`${v}-`) || vid === v;
  });
}

export async function upsertDefektVozilo(row) {
  const payload = {
    vozilo_id: String(row.vozilo_id || "").trim().toUpperCase(),
    kategorija: String(row.kategorija || "").trim(),
    podkategorija: String(row.podkategorija || "").trim(),
    defekt: String(row.defekt || "").trim(),
  };
  if (row.id) {
    const { data, error } = await supabase.from("katalog_gresaka_vozilo")
      .update(payload)
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("katalog_gresaka_vozilo")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDefektVozilo(id) {
  const { error } = await supabase.from("katalog_gresaka_vozilo").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchDelovi({ tipKontrole = null, voziloKatalogId = null, samoAktivni = false } = {}) {
  let q = supabase.from("delovi")
    .select("id,id_deo,naziv_dela,karakteristika,tip_kontrole,vozilo_katalog_id,slika_naziv,aktivan,napomena,kom_za_kontrolu,greska_katalog_id,linija_id,masina_id")
    .order("id_deo");
  if (samoAktivni) q = q.eq("aktivan", true);
  if (tipKontrole) q = q.eq("tip_kontrole", tipKontrole);
  if (voziloKatalogId) q = q.eq("vozilo_katalog_id", String(voziloKatalogId).trim().toUpperCase());
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function upsertDeo(deo) {
  const idDeo = String(deo.id_deo || "").trim().toUpperCase();
  if (!idDeo) throw new Error("ID dela je obavezan");
  const tip = String(deo.tip_kontrole || "deo").toLowerCase() === "vozilo" ? "vozilo" : "deo";
  const payload = {
    id_deo: idDeo,
    naziv_dela: String(deo.naziv_dela || idDeo).trim(),
    karakteristika: deo.karakteristika?.trim() || null,
    tip_kontrole: tip,
    vozilo_katalog_id: deo.vozilo_katalog_id?.trim().toUpperCase() || (tip === "vozilo" ? idDeo.split("-")[0] : null),
    kom_za_kontrolu: deo.kom_za_kontrolu != null ? Number(deo.kom_za_kontrolu) : 30,
    slika_naziv: deo.slika_naziv?.trim() || null,
    aktivan: deo.aktivan !== false,
    napomena: deo.napomena?.trim() || null,
    greska_katalog_id: deo.greska_katalog_id?.trim() || null,
  };
  const { data, error } = await supabase.from("delovi")
    .upsert(payload, { onConflict: "id_deo" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchKupci({ samoAktivni = false } = {}) {
  let q = supabase.from("kupci").select("*").order("naziv");
  if (samoAktivni) q = q.eq("aktivan", true);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function upsertKupac(kupac) {
  const naziv = String(kupac.naziv || "").trim();
  if (!naziv) throw new Error("Naziv kupca je obavezan");
  const payload = {
    naziv,
    aktivan: kupac.aktivan !== false,
  };
  if (kupac.id) {
    const { data, error } = await supabase.from("kupci")
      .update(payload)
      .eq("id", kupac.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("kupci")
    .upsert(payload, { onConflict: "naziv" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchGreskeKatalog({ idDeo = null, pogonKod = null } = {}) {
  let q = supabase.from("greske_katalog")
    .select("*")
    .order("kategorija")
    .order("podkategorija")
    .order("defekt");
  if (idDeo) q = q.eq("id_deo", String(idDeo).trim().toUpperCase());
  if (pogonKod) q = q.eq("pogon_kod", String(pogonKod).trim().toUpperCase());
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function upsertGreskaKatalog(row) {
  const payload = {
    kategorija: String(row.kategorija || "").trim(),
    podkategorija: String(row.podkategorija || "").trim(),
    defekt: String(row.defekt || row.podkategorija || "").trim(),
    opis: row.opis?.trim() || null,
    id_deo: row.id_deo ? String(row.id_deo).trim().toUpperCase() : null,
    katalog_id: row.katalog_id?.trim() || null,
    pogon_kod: row.pogon_kod ? String(row.pogon_kod).trim().toUpperCase() : null,
  };
  if (!payload.kategorija) throw new Error("Kategorija je obavezna");
  if (row.id) {
    const { data, error } = await supabase.from("greske_katalog")
      .update(payload)
      .eq("id", row.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("greske_katalog")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGreskaKatalog(id) {
  const { error } = await supabase.from("greske_katalog").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchDeloviListaZaRn() {
  const { data, error } = await supabase.from("delovi")
    .select("id_deo,naziv_dela,aktivan")
    .eq("aktivan", true)
    .order("id_deo");
  if (error) throw error;
  return data || [];
}

function jeDuplicateKey(error) {
  return error?.code === "23505" || /duplicate key/i.test(error?.message || "");
}

function formatujGreskuSifrarnik(error, { entitet, naziv }) {
  const msg = (error?.message || "").toLowerCase();
  if (!jeDuplicateKey(error)) {
    return error instanceof Error ? error : new Error(error?.message || String(error));
  }
  if (msg.includes("naziv") || msg.includes("linija")) {
    return new Error(
      `${entitet} «${naziv}» već postoji — izmeni postojeći zapis ili koristi drugi naziv.`
    );
  }
  if (msg.includes("_pkey") || msg.includes("(id)")) {
    return new Error(
      `Sekvenca ID za ${entitet.toLowerCase()} nije usklađena posle uvoza — pokreni 43_fix_sifrarnik_sequence.sql u Supabase.`
    );
  }
  return new Error(error.message);
}

/** Posle seed-a sa eksplicitnim id vrednostima SERIAL sekvenca može ostati na 1. */
async function insertSifrarnikRed(tabela, payload, { entitet, uniqueKolona }) {
  const naziv = uniqueKolona ? payload[uniqueKolona] : "";
  const { data, error } = await supabase.from(tabela).insert(payload).select("*").single();
  if (!error) return data;

  if (jeDuplicateKey(error)) {
    const msg = (error.message || "").toLowerCase();
    if (uniqueKolona && msg.includes(uniqueKolona)) {
      throw formatujGreskuSifrarnik(error, { entitet, naziv });
    }
    if (msg.includes("_pkey") || msg.includes("(id)")) {
      const { data: maxRow } = await supabase
        .from(tabela)
        .select("id")
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextId = (Number(maxRow?.id) || 0) + 1;
      const { data: data2, error: err2 } = await supabase
        .from(tabela)
        .insert({ ...payload, id: nextId })
        .select("*")
        .single();
      if (!err2) return data2;
      throw formatujGreskuSifrarnik(err2, { entitet, naziv });
    }
  }

  throw formatujGreskuSifrarnik(error, { entitet, naziv });
}

// ——— Linije, mašine, smene ———
export async function fetchLinije() {
  const { data, error } = await supabase.from("linije").select("*").order("id");
  if (error) throw error;
  return data || [];
}

export async function upsertLinija(row) {
  const payload = {
    linija: String(row.linija || "").trim(),
    proces: row.proces?.trim() || null,
    operacija: row.operacija?.trim() || null,
    greske: row.greske?.trim() || null,
  };
  if (!payload.linija) throw new Error("Naziv linije je obavezan");
  if (row.id) {
    const { data, error } = await supabase.from("linije").update(payload).eq("id", row.id).select("*").single();
    if (error) throw formatujGreskuSifrarnik(error, { entitet: "Linija", naziv: payload.linija });
    return data;
  }
  return insertSifrarnikRed("linije", payload, { entitet: "Linija", uniqueKolona: "linija" });
}

export async function deleteLinija(id) {
  const { error } = await supabase.from("linije").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchMasine() {
  const { data, error } = await supabase.from("masine").select("*").order("id");
  if (error) throw error;
  return data || [];
}

export async function upsertMasina(row) {
  const payload = {
    naziv: String(row.naziv || "").trim(),
    linija: row.linija?.trim() || null,
  };
  if (!payload.naziv) throw new Error("Naziv mašine je obavezan");
  if (row.id) {
    const { data, error } = await supabase.from("masine").update(payload).eq("id", row.id).select("*").single();
    if (error) throw formatujGreskuSifrarnik(error, { entitet: "Mašina", naziv: payload.naziv });
    return data;
  }
  return insertSifrarnikRed("masine", payload, { entitet: "Mašina", uniqueKolona: "naziv" });
}

export async function deleteMasina(id) {
  const { error } = await supabase.from("masine").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchSmene() {
  const { data, error } = await supabase.from("smene").select("*").order("id");
  if (error) throw error;
  return data || [];
}

export async function upsertSmena(row) {
  const payload = {
    naziv: String(row.naziv || "").trim(),
    pocetak: row.pocetak?.trim() || null,
    kraj: row.kraj?.trim() || null,
  };
  if (!payload.naziv) throw new Error("Naziv smene je obavezan");
  if (row.id) {
    const { data, error } = await supabase.from("smene").update(payload).eq("id", row.id).select("*").single();
    if (error) throw formatujGreskuSifrarnik(error, { entitet: "Smena", naziv: payload.naziv });
    return data;
  }
  return insertSifrarnikRed("smene", payload, { entitet: "Smena", uniqueKolona: "naziv" });
}

export async function deleteSmena(id) {
  const { error } = await supabase.from("smene").delete().eq("id", id);
  if (error) throw error;
}

// ——— Ciljevi ———
export async function fetchCiljevi() {
  const { data, error } = await supabase.from("ciljevi").select("*").order("vazi_od", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function upsertCilj(row) {
  const payload = {
    id_deo: row.id_deo ? String(row.id_deo).trim().toUpperCase() : null,
    naziv: row.naziv?.trim() || null,
    rty_cilj: row.rty_cilj != null && row.rty_cilj !== "" ? Number(row.rty_cilj) : null,
    dpmo_cilj: row.dpmo_cilj != null && row.dpmo_cilj !== "" ? Number(row.dpmo_cilj) : null,
    p_cilj: row.p_cilj != null && row.p_cilj !== "" ? Number(row.p_cilj) : null,
    vazi_od: row.vazi_od || new Date().toISOString().split("T")[0],
    napomena: row.napomena?.trim() || null,
  };
  if (!payload.id_deo) throw new Error("ID dela je obavezan");
  if (row.id) {
    const { data, error } = await supabase.from("ciljevi").update(payload).eq("id", row.id).select("*").single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("ciljevi").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteCilj(id) {
  const { error } = await supabase.from("ciljevi").delete().eq("id", id);
  if (error) throw error;
}

// ——— Kontrolna lista ———
export async function fetchKontrolnaLista() {
  const { data, error } = await supabase.from("kontrolna_lista_stavke")
    .select("*")
    .order("redosled")
    .order("kategorija");
  if (error) throw error;
  return data || [];
}

export async function upsertKontrolnaStavka(row) {
  const payload = {
    kategorija: String(row.kategorija || "").trim(),
    stavka: String(row.stavka || "").trim(),
    redosled: row.redosled != null && row.redosled !== "" ? Number(row.redosled) : 0,
    aktivna: row.aktivna !== false,
  };
  if (!payload.stavka) throw new Error("Stavka je obavezna");
  if (row.id) {
    const { data, error } = await supabase.from("kontrolna_lista_stavke")
      .update(payload).eq("id", row.id).select("*").single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from("kontrolna_lista_stavke").insert(payload).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteKontrolnaStavka(id) {
  const { error } = await supabase.from("kontrolna_lista_stavke").delete().eq("id", id);
  if (error) throw error;
}

// ——— Merljive: SOP + karakteristike ———
function primeniIdFilter(q, idDeo) {
  const id = normalizujIdDeo(idDeo);
  if (!id) return q;
  if (jePunIdDeo(id)) return q.eq("id_deo", id);
  return q.ilike("id_deo", `%${id}%`);
}

const SIFRARNIK_FETCH_LIMIT = 20000;

const SOP_INDEKS_KOLONE = "id_deo,pogon_kod,radni_nalog,naziv_dela,slika,masina,linija,broj_merenja,kontrolor_ime";

/** Lagani indeks SOP redova — bez karakteristika (učitavaju se po id_deo). */
export async function fetchMerljiviSopIndeks() {
  const { data, error } = await supabase.from("sop_deo_varijabilni")
    .select(SOP_INDEKS_KOLONE)
    .order("id_deo")
    .limit(SIFRARNIK_FETCH_LIMIT);
  if (error) {
    if (greskaNedostajeTabela(error)) return [];
    throw error;
  }
  return data || [];
}

export async function fetchSopMerljive({ idDeo = null } = {}) {
  if (idDeo && jePunIdDeo(idDeo)) {
    return ucitajRedovePoIdDeo(supabase, "sop_deo_varijabilni", idDeo, {
      order: [["id_deo", { ascending: true }]],
      limit: SIFRARNIK_FETCH_LIMIT,
    });
  }

  let q = supabase.from("sop_deo_varijabilni").select("*").order("id_deo").limit(SIFRARNIK_FETCH_LIMIT);
  if (idDeo) q = primeniIdFilter(q, idDeo);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function upsertSopMerljive(row) {
  const payload = {
    id_deo: String(row.id_deo || "").trim().toUpperCase(),
    pogon_kod: String(row.pogon_kod || "A").trim().toUpperCase(),
    radni_nalog: row.radni_nalog?.trim().toUpperCase() || null,
    naziv_dela: row.naziv_dela?.trim() || null,
    slika: row.slika?.trim() || null,
    masina: row.masina?.trim() || null,
    linija: row.linija?.trim() || null,
    broj_merenja: row.broj_merenja != null ? Number(row.broj_merenja) : 5,
    kontrolor_ime: row.kontrolor_ime?.trim() || null,
  };
  if (!payload.id_deo) throw new Error("ID dela je obavezan");
  await ensureDeoMasterMinimal(supabase, {
    id_deo: payload.id_deo,
    naziv_dela: payload.naziv_dela,
  });
  const { data, error } = await supabase.from("sop_deo_varijabilni")
    .upsert(payload, { onConflict: "id_deo,pogon_kod" })
    .select("*")
    .single();
  if (error) throw error;
  try {
    await syncMerljiviSifrarnikZaDeo(supabase, data.id_deo);
  } catch (syncErr) {
    console.warn("syncMerljiviSifrarnikZaDeo (SOP):", syncErr?.message || syncErr);
  }
  return data;
}

export async function deleteSopMerljive(idDeo, pogonKod) {
  const { error } = await supabase.from("sop_deo_varijabilni")
    .delete()
    .eq("id_deo", String(idDeo).trim().toUpperCase())
    .eq("pogon_kod", String(pogonKod).trim().toUpperCase());
  if (error) throw error;
}

export async function fetchKarakteristikeMerljive({ idDeo = null, pogonKod = null } = {}) {
  if (idDeo && jePunIdDeo(idDeo)) {
    let rows = await ucitajRedovePoIdDeo(supabase, "karakteristike_merljive", idDeo, {
      order: [
        ["id_deo", { ascending: true }],
        ["pogon_kod", { ascending: true }],
        ["pozicija", { ascending: true }],
      ],
      limit: SIFRARNIK_FETCH_LIMIT,
    });
    if (pogonKod) {
      const p = String(pogonKod).trim().toUpperCase();
      rows = rows.filter((r) => String(r.pogon_kod || "").trim().toUpperCase() === p);
    }
    return rows;
  }

  let q = supabase.from("karakteristike_merljive")
    .select("*")
    .order("id_deo")
    .order("pogon_kod")
    .order("pozicija")
    .limit(SIFRARNIK_FETCH_LIMIT);
  if (idDeo) q = primeniIdFilter(q, idDeo);
  if (pogonKod) q = q.eq("pogon_kod", String(pogonKod).trim().toUpperCase());
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/** Učitaj karakteristike + SOP za jedan deo (merenje / filter). */
export async function fetchMerljiviSifrarnikZaDeo(idDeo) {
  const id = normalizujIdDeo(idDeo);
  if (!id) return { karakteristike: [], sop: [] };
  const [karakteristike, sop] = await Promise.all([
    fetchKarakteristikeMerljive({ idDeo: id }),
    fetchSopMerljive({ idDeo: id }),
  ]);
  return { karakteristike, sop };
}

export async function upsertKarakteristikaMerljiva(row) {
  const normalized = normalizujKarakteristikuRed(row);
  const payload = stripKarakteristikeForDbUpsert(normalized, KARAKTERISTIKE_DB_COLS);
  if (!payload.id_deo || !payload.pozicija) {
    throw new Error("ID dela i pozicija (dimenzija) su obavezni");
  }
  const { data, error } = await supabase.from("karakteristike_merljive")
    .upsert(payload, { onConflict: KARAKTERISTIKE_UPSERT_CONFLICT })
    .select("*")
    .single();
  if (error) throw error;
  try {
    await syncMerljiviSifrarnikZaDeo(supabase, data.id_deo);
  } catch (syncErr) {
    console.warn("syncMerljiviSifrarnikZaDeo:", syncErr?.message || syncErr);
  }
  return data;
}

export async function deleteKarakteristikaMerljiva(id) {
  const { error } = await supabase.from("karakteristike_merljive").delete().eq("id", id);
  if (error) throw error;
}

// ——— Atributivni: pogon po delu ———
export async function fetchPogonAtributivni({ idDeo = null } = {}) {
  let q = supabase.from("delovi_atributivni_pogon").select("*").order("id_deo");
  if (idDeo) q = q.eq("id_deo", String(idDeo).trim().toUpperCase());
  const { data, error } = await q;
  if (error) {
    if (greskaNedostajeTabela(error)) return [];
    throw error;
  }
  return data || [];
}

export async function upsertPogonAtributivni(row) {
  const payload = {
    id_deo: String(row.id_deo || "").trim().toUpperCase(),
    pogon_kod: String(row.pogon_kod || "").trim().toUpperCase(),
    radni_nalog: row.radni_nalog?.trim().toUpperCase() || null,
    naziv_dela: row.naziv_dela?.trim() || null,
    karakteristika: row.karakteristika?.trim() || null,
    linija_id: row.linija_id != null && row.linija_id !== "" ? Number(row.linija_id) : null,
    masina_id: row.masina_id != null && row.masina_id !== "" ? Number(row.masina_id) : null,
    kom_za_kontrolu: row.kom_za_kontrolu != null && row.kom_za_kontrolu !== "" ? Number(row.kom_za_kontrolu) : null,
    napomena: row.napomena?.trim() || null,
    aktivan: row.aktivan !== false,
  };
  if (!payload.id_deo || !payload.pogon_kod) throw new Error("ID dela i pogon su obavezni");
  const { data, error } = await supabase.from("delovi_atributivni_pogon")
    .upsert(payload, { onConflict: "id_deo,pogon_kod" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deletePogonAtributivni(idDeo, pogonKod) {
  const { error } = await supabase.from("delovi_atributivni_pogon")
    .delete()
    .eq("id_deo", String(idDeo).trim().toUpperCase())
    .eq("pogon_kod", String(pogonKod).trim().toUpperCase());
  if (error) throw error;
}

export async function fetchBarkodProfili(idDeo = null) {
  let q = supabase.from("barkod_profili").select("*").order("id_deo");
  if (idDeo) q = q.eq("id_deo", String(idDeo).trim().toUpperCase());
  const { data, error } = await q;
  if (error) {
    if (greskaNedostajeTabela(error)) return [];
    throw error;
  }
  return data || [];
}

export async function upsertBarkodProfil(profil, deo = {}) {
  const idDeo = String(profil.id_deo || deo.id_deo || "").trim().toUpperCase();
  const format = profil.format || "id";
  const sadrzaj = profil.sadrzaj_barkoda || buildSadrzajBarkoda({
    idDeo,
    format,
    radniNalog: profil.radni_nalog,
    smena: profil.smena,
  });
  const payload = {
    id_deo: idDeo,
    format,
    sadrzaj_barkoda: sadrzaj,
    radni_nalog: profil.radni_nalog?.trim() || null,
    tip_koda: profil.tip_koda || "oba",
    aktivna: profil.aktivna !== false,
    napomena: profil.napomena?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("barkod_profili")
    .upsert(payload, { onConflict: "id_deo,format" })
    .select("*")
    .single();
  if (error) {
    if (greskaNedostajeTabela(error)) {
      return { ...payload, id: null, _lokalno: true };
    }
    throw error;
  }
  return data;
}

/** Profili iz baze ili podrazumevani iz dela. */
export async function profiliZaDeo(deo, { radniNalog = "", smena = null } = {}) {
  const izBaze = await fetchBarkodProfili(deo.id_deo);
  const aktivni = izBaze.filter((p) => p.aktivna !== false);
  if (aktivni.length) return aktivni;
  const formati = ["id", "id_rn"];
  return formati.map((format) => ({
    id_deo: deo.id_deo,
    format,
    sadrzaj_barkoda: buildSadrzajBarkoda({
      idDeo: deo.id_deo,
      format,
      radniNalog,
      smena,
    }),
    radni_nalog: radniNalog || null,
    tip_koda: "oba",
    aktivna: true,
    napomena: format,
    _podrazumevano: true,
  }));
}
