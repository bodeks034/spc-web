/** Zajednički crteži — DWG izvor, SVG/PNG prikaz (deo, vozilo, moment, prilog). */

import { supabase } from "./supabaseClient.js";
import { STORAGE_BUCKET } from "./slikePaths.js";

export const CRTEZ_REF_TIP = {
  DEO: "deo",
  VOZILO: "vozilo",
  MOMENT_JOB: "moment_job",
  PFMEA_PRILOG: "pfmea_prilog",
  OSTALO: "ostalo",
};

export const CRTEZ_FOLDER = "crtezi";
export const CRTEZ_IZVOR = "izvor";
export const CRTEZ_PRIKAZ = "prikaz";

/** Storage: crtezi/izvor/{ref_tip}/{ref_id}/motor.dwg */
export function storagePutanjaCrtezIzvor(refTip, refId, imeFajla) {
  const tip = String(refTip || "ostalo").trim().toLowerCase();
  const ref = String(refId || "").trim().toUpperCase();
  const ime = String(imeFajla || "").trim().replace(/\\/g, "/");
  if (!ref || !ime) return null;
  return `${CRTEZ_FOLDER}/${CRTEZ_IZVOR}/${tip}/${ref}/${ime}`;
}

/** Storage: crtezi/prikaz/{ref_tip}/{ref_id}/motor.svg */
export function storagePutanjaCrtezPrikaz(refTip, refId, imeFajla) {
  const tip = String(refTip || "ostalo").trim().toLowerCase();
  const ref = String(refId || "").trim().toUpperCase();
  const ime = String(imeFajla || "").trim().replace(/\\/g, "/");
  if (!ref || !ime) return null;
  return `${CRTEZ_FOLDER}/${CRTEZ_PRIKAZ}/${tip}/${ref}/${ime}`;
}

/** Javni SVG iz public/moment/dijagrami/ (pilot sklopovi). */
export function lokalnaPutanjaMomentDijagram(imeFajla) {
  const ime = String(imeFajla || "").trim();
  if (!ime) return null;
  return `/moment/dijagrami/${encodeURIComponent(ime)}`;
}

export async function urlCrtezIzStorage(putanja) {
  if (!putanja) return null;
  if (String(putanja).startsWith("/")) return putanja;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(putanja);
  return data?.publicUrl || null;
}

/** Prikaz iz crtez_assets reda (public putanja ili Storage). */
export async function urlCrtezAsset(asset) {
  if (!asset?.prikaz_putanja) return null;
  return urlCrtezIzStorage(asset.prikaz_putanja);
}

export async function ucitajCrtezAsset(supabaseClient, { refTip, refId, samoAktivni = true } = {}) {
  let q = supabaseClient.from("crtez_assets")
    .select("*")
    .eq("ref_tip", refTip)
    .eq("ref_id", String(refId || "").trim().toUpperCase())
    .order("updated_at", { ascending: false });
  if (samoAktivni) q = q.eq("aktivna", true);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertCrtezAsset(supabaseClient, row) {
  const payload = {
    ref_tip: row.ref_tip,
    ref_id: String(row.ref_id || "").trim().toUpperCase(),
    naziv: row.naziv || null,
    izvor_format: row.izvor_format || null,
    izvor_putanja: row.izvor_putanja || null,
    prikaz_format: row.prikaz_format || "svg",
    prikaz_putanja: row.prikaz_putanja,
    revizija: row.revizija || "A",
    aktivna: row.aktivna !== false,
    napomena: row.napomena || null,
    updated_at: new Date().toISOString(),
  };
  if (!payload.ref_id || !payload.prikaz_putanja) {
    throw new Error("ref_id i prikaz_putanja su obavezni");
  }
  if (row.id) {
    const { data, error } = await supabaseClient.from("crtez_assets")
      .update(payload).eq("id", row.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabaseClient.from("crtez_assets")
    .insert(payload).select().single();
  if (error) throw error;
  return data;
}

/** Upload DWG izvora + već pripremljenog SVG/PNG prikaza. */
export async function uploadCrtezPar(fileIzvor, filePrikaz, {
  refTip,
  refId,
  revizija = "A",
  naziv = "",
}) {
  const ref = String(refId || "").trim().toUpperCase();
  if (!ref || !filePrikaz) throw new Error("refId i fajl prikaza su obavezni");

  let izvorPutanja = null;
  let izvorFormat = null;
  if (fileIzvor) {
    const ext = (fileIzvor.name.split(".").pop() || "dwg").toLowerCase();
    izvorFormat = ext === "dxf" ? "dxf" : ext === "dwg" ? "dwg" : "ostalo";
    izvorPutanja = storagePutanjaCrtezIzvor(refTip, ref, `${ref}_${revizija}.${ext}`);
    const { error } = await supabase.storage.from(STORAGE_BUCKET)
      .upload(izvorPutanja, fileIzvor, { upsert: true });
    if (error) throw error;
  }

  const pExt = (filePrikaz.name.split(".").pop() || "svg").toLowerCase();
  const prikazFormat = ["svg", "png", "jpg", "webp"].includes(pExt) ? pExt : "svg";
  const prikazPutanja = storagePutanjaCrtezPrikaz(refTip, ref, `${ref}_${revizija}.${pExt}`);
  const { error: errP } = await supabase.storage.from(STORAGE_BUCKET)
    .upload(prikazPutanja, filePrikaz, { upsert: true });
  if (errP) throw errP;

  return upsertCrtezAsset(supabase, {
    ref_tip: refTip,
    ref_id: ref,
    naziv: naziv || ref,
    izvor_format: izvorFormat,
    izvor_putanja: izvorPutanja,
    prikaz_format: prikazFormat,
    prikaz_putanja: prikazPutanja,
    revizija,
  });
}
