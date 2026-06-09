/** Odobrenje merenja uprkos istekloj kalibraciji — Supabase (sinhronizacija između uređaja). */

import { obavestiAdminZahtev } from "./adminZahtevNotifikacije.js";

function normDeo(idDeo) {
  return String(idDeo || "").trim().toUpperCase();
}

/** Da li postoji odobrenje za deo (globalno ili za konkretnog operatera). */
export async function ucitajOdobrenuKalibraciju(supabaseClient, { radnikId, idDeo }) {
  const deo = normDeo(idDeo);
  if (deo.length < 3) return null;

  const operaterId = Number(radnikId);
  let query = supabaseClient
    .from("kalibracija_zahtevi")
    .select("id,status,operater_id,id_deo,updated_at")
    .eq("id_deo", deo)
    .eq("status", "odobreno")
    .order("id", { ascending: false })
    .limit(1);

  if (Number.isFinite(operaterId)) {
    query = query.or(`operater_id.is.null,operater_id.eq.${operaterId}`);
  } else {
    query = query.is("operater_id", null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("ucitajOdobrenuKalibraciju:", error.message);
    return null;
  }
  return data?.id ?? null;
}

/** Aktivan zahtev operatera koji čeka admina. */
export async function ucitajCekaKalibraciju(supabaseClient, { radnikId, idDeo }) {
  const deo = normDeo(idDeo);
  const operaterId = Number(radnikId);
  if (deo.length < 3 || !Number.isFinite(operaterId)) return null;

  const { data, error } = await supabaseClient
    .from("kalibracija_zahtevi")
    .select("id,created_at")
    .eq("id_deo", deo)
    .eq("operater_id", operaterId)
    .eq("status", "ceka")
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("ucitajCekaKalibraciju:", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function posaljiZahtevKalibracije(supabaseClient, {
  operaterId,
  operaterIme,
  idDeo,
  nazivDela,
  instrumenti,
  razlog,
}) {
  const deo = normDeo(idDeo);
  const opId = Number(operaterId);
  if (!deo || !Number.isFinite(opId) || !String(razlog || "").trim()) {
    throw new Error("Nedostaju podaci za zahtev.");
  }

  const postojeci = await ucitajCekaKalibraciju(supabaseClient, { radnikId: opId, idDeo: deo });
  if (postojeci) {
    throw new Error("Zahtev za ovaj deo već čeka odobrenje admina.");
  }

  const { data, error } = await supabaseClient.from("kalibracija_zahtevi").insert({
    operater_id: opId,
    id_deo: deo,
    naziv_dela: nazivDela || null,
    instrumenti: instrumenti || null,
    razlog: String(razlog).trim(),
    status: "ceka",
  }).select("id,id_deo,naziv_dela,instrumenti,razlog,status").single();
  if (error) throw error;

  obavestiAdminZahtev(supabaseClient, {
    tip: "kalibracija",
    kanali: "remote",
    zahtev: {
      ...data,
      operater_ime: operaterIme || null,
    },
  }).catch(() => {});
}

/** Admin uključi/isključi dozvolu — važi na svim uređajima za taj id_deo. */
export async function adminPostaviOdobrenjeKalibracije(supabaseClient, {
  adminId,
  idDeo,
  nazivDela,
  instrumenti,
  odobreno,
}) {
  const deo = normDeo(idDeo);
  const admin = Number(adminId);
  if (!deo || !Number.isFinite(admin)) return { ok: false, greska: "Nedostaju podaci." };

  const ts = new Date().toISOString();

  if (!odobreno) {
    const { error } = await supabaseClient
      .from("kalibracija_zahtevi")
      .update({ status: "zatvoren", admin_id: admin, updated_at: ts })
      .eq("id_deo", deo)
      .in("status", ["odobreno", "ceka"]);
    if (error) return { ok: false, greska: error.message };
    return { ok: true };
  }

  const { error: errCeka } = await supabaseClient
    .from("kalibracija_zahtevi")
    .update({ status: "odobreno", admin_id: admin, updated_at: ts })
    .eq("id_deo", deo)
    .eq("status", "ceka");
  if (errCeka) return { ok: false, greska: errCeka.message };

  const postojece = await ucitajOdobrenuKalibraciju(supabaseClient, { radnikId: null, idDeo: deo });
  if (postojece) return { ok: true, id: postojece };

  const { data, error } = await supabaseClient
    .from("kalibracija_zahtevi")
    .insert({
      operater_id: null,
      id_deo: deo,
      naziv_dela: nazivDela || null,
      instrumenti: instrumenti || null,
      razlog: "Admin dozvolio merenje uprkos kalibraciji",
      status: "odobreno",
      admin_id: admin,
      updated_at: ts,
    })
    .select("id")
    .single();

  if (error) return { ok: false, greska: error.message };
  return { ok: true, id: data?.id };
}

export async function adminOdluciKalibraciju(supabaseClient, {
  zahtevId,
  adminId,
  odluka,
  napomena = "",
}) {
  const { error } = await supabaseClient
    .from("kalibracija_zahtevi")
    .update({
      status: odluka,
      admin_id: Number(adminId),
      napomena: napomena || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", zahtevId);
  if (error) throw error;
}

export async function zatvoriKalibracijaOdobrenje(supabaseClient, odobrenId) {
  if (!odobrenId) return;
  await supabaseClient
    .from("kalibracija_zahtevi")
    .update({
      status: "zatvoren",
      updated_at: new Date().toISOString(),
    })
    .eq("id", odobrenId)
    .eq("status", "odobreno");
}

/** @deprecated Koristi ucitajOdobrenuKalibraciju — ostaje za kompatibilnost. */
export function jeKalibracijaOdobrena() {
  return false;
}

/** @deprecated */
export function postaviKalibracijaOdobrena() {
  /* sessionStorage više ne koristimo */
}
