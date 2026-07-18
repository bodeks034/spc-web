import { supabase } from "./supabaseClient.js";

const DOBAVLJAC_POLJA = [
  "sifra_dobavljaca", "naziv_dobavljaca", "drzava", "grad",
  "pib", "kontakt", "telefon", "email", "aktivan", "updated_at",
].join(",");

export async function fetchDobavljaci({ samoAktivni = false } = {}) {
  let q = supabase.from("dobavljaci")
    .select(DOBAVLJAC_POLJA)
    .order("naziv_dobavljaca");
  if (samoAktivni) q = q.eq("aktivan", true);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function upsertDobavljac(red) {
  const sifra = String(red?.sifra_dobavljaca || "").trim().toUpperCase();
  const naziv = String(red?.naziv_dobavljaca || "").trim();
  if (!sifra) throw new Error("Šifra dobavljača je obavezna");
  if (!naziv) throw new Error("Naziv dobavljača je obavezan");

  const payload = {
    sifra_dobavljaca: sifra,
    naziv_dobavljaca: naziv,
    drzava: String(red.drzava || "").trim() || null,
    grad: String(red.grad || "").trim() || null,
    pib: String(red.pib || "").trim() || null,
    kontakt: String(red.kontakt || "").trim() || null,
    telefon: String(red.telefon || "").trim() || null,
    email: String(red.email || "").trim() || null,
    aktivan: red.aktivan !== false,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("dobavljaci")
    .upsert(payload, { onConflict: "sifra_dobavljaca" })
    .select(DOBAVLJAC_POLJA)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchMaterijaliDobavljaca({ samoAktivni = true } = {}) {
  let q = supabase.from("materijali")
    .select("sifra_materijala,naziv_materijala,standard,debljina,jedinica_mere,sifra_dobavljaca,aktivan")
    .order("sifra_materijala");
  if (samoAktivni) q = q.eq("aktivan", true);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function fetchPrijemneKontrole({
  sifraDobavljaca = null,
  datumOd = null,
  limit = 500,
} = {}) {
  let q = supabase.from("prijemna_kontrola_dobavljaca")
    .select("*")
    .order("datum", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (sifraDobavljaca) q = q.eq("sifra_dobavljaca", sifraDobavljaca);
  if (datumOd) q = q.gte("datum", datumOd);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

function nenegativanBroj(v, naziv) {
  const n = Number(v || 0);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${naziv} mora biti broj ≥ 0`);
  return n;
}

export async function upsertPrijemnaKontrola(red) {
  const sifraDobavljaca = String(red?.sifra_dobavljaca || "").trim().toUpperCase();
  if (!sifraDobavljaca) throw new Error("Dobavljač je obavezan");

  const primljeno = nenegativanBroj(red.primljeno, "Primljeno");
  const kontrolisano = nenegativanBroj(red.kontrolisano, "Kontrolisano");
  const ok = nenegativanBroj(red.ok_kolicina, "OK količina");
  const nok = nenegativanBroj(red.nok_kolicina, "NOK količina");
  if (kontrolisano > primljeno) throw new Error("Kontrolisano ne može biti veće od primljenog");
  if (ok + nok > kontrolisano) throw new Error("OK + NOK ne može biti veće od kontrolisanog");

  const erpKljuc = String(red.erp_kljuc || "").trim()
    || (red.id ? null : `PKD-${sifraDobavljaca}-${Date.now()}`);

  const payload = {
    datum: red.datum || new Date().toISOString().slice(0, 10),
    sifra_dobavljaca: sifraDobavljaca,
    sifra_materijala: String(red.sifra_materijala || "").trim().toUpperCase() || null,
    id_deo: String(red.id_deo || "").trim().toUpperCase() || null,
    broj_lota: String(red.broj_lota || "").trim() || null,
    broj_dokumenta: String(red.broj_dokumenta || "").trim() || null,
    primljeno,
    kontrolisano,
    ok_kolicina: ok,
    nok_kolicina: nok,
    defekt: String(red.defekt || "").trim() || null,
    foto_nok: String(red.foto_nok || "").trim() || null,
    foto_komentar: String(red.foto_komentar || "").trim() || null,
    status: ["prihvaceno", "uslovno", "odbijeno", "otvoreno"].includes(red.status)
      ? red.status
      : "otvoreno",
    napomena: String(red.napomena || "").trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (erpKljuc) payload.erp_kljuc = erpKljuc;

  let q;
  if (red.id) {
    q = supabase.from("prijemna_kontrola_dobavljaca").update(payload).eq("id", red.id);
  } else {
    q = supabase.from("prijemna_kontrola_dobavljaca").insert(payload);
  }
  const { data, error } = await q.select("*").single();
  if (error) throw error;
  return data;
}

/** Agregira atributivni kontrolni_log vezan za prijem i upiše OK/NOK u prijem. Status prijema ne menja. */
export async function syncPrijemnaIzKontrolnogLoga(prijemnaId) {
  const id = Number(prijemnaId);
  if (!Number.isFinite(id) || id <= 0) throw new Error("Nedostaje ID prijema");

  const { data: prijem, error: ePrijem } = await supabase
    .from("prijemna_kontrola_dobavljaca")
    .select("id,primljeno,status,ok_kolicina,nok_kolicina,kontrolisano")
    .eq("id", id)
    .single();
  if (ePrijem) throw ePrijem;

  const { data: logRows, error: eLog } = await supabase
    .from("kontrolni_log")
    .select("id,status,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,inspekcija_id,sesija_id,created_at,greska_naziv")
    .eq("prijemna_kontrola_id", id);
  if (eLog) {
    if (/prijemna_kontrola_id|does not exist|schema cache|column/i.test(String(eLog.message || ""))) {
      throw new Error("Pokreni migraciju 70_prijemna_veza_kontrolni_log.sql (veza prijema ↔ Ulazna kontrola).");
    }
    throw eLog;
  }

  const { agregirajAtributivneJedinice } = await import("./atributivneAgregacija.js");
  const { ok, nok, n } = agregirajAtributivneJedinice(logRows || []);
  let kontrolisano = n;
  let primljeno = Number(prijem.primljeno) || 0;
  if (kontrolisano > primljeno) primljeno = kontrolisano;

  const payload = {
    primljeno,
    kontrolisano,
    ok_kolicina: ok,
    nok_kolicina: nok,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("prijemna_kontrola_dobavljaca")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return { prijem: data, ok, nok, kontrolisano, brojRedova: (logRows || []).length };
}
