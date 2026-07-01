/** Upload crteža u Supabase Storage — merljive / atributivne. */

import { supabase } from "./supabaseClient.js";
import { STORAGE_BUCKET, storagePutanjaSlike } from "./slikePaths.js";

/**
 * @param {File} file
 * @param {{ modul?: "merljive"|"atributivne", id?: string, imeFajla?: string }} opts
 * @returns {Promise<string>} ime fajla za upis u bazu
 */
export async function uploadSlikaSifrarnik(file, { modul = "merljive", id, imeFajla } = {}) {
  if (!file) throw new Error("Nije izabran fajl");
  const ref = String(id || "").trim().toUpperCase();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const ime = imeFajla?.trim() || (ref ? `${ref}.${ext}` : "");
  if (!ime) throw new Error("ID / referenca je obavezna za upload slike");

  const putanja = storagePutanjaSlike(modul, ime);
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(putanja, file, { upsert: true });
  if (error) throw error;
  return ime;
}

/** SOP dijagram celog vozila — npr. MRAP_SOP.jpg u atributivne/. */
export async function uploadSlikaVoziloSop(file, voziloKod) {
  const kod = String(voziloKod || "").trim().toUpperCase();
  if (!kod) throw new Error("Kod tipa vozila je obavezan");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  return uploadSlikaSifrarnik(file, {
    modul: "atributivne",
    id: kod,
    imeFajla: `${kod}_SOP.${ext}`,
  });
}

/** Silueta vozila za zone K/M/T pri unosu — Storage atributivne/vozilo-dijagram/. */
export async function uploadSlikaVoziloDijagram(file, voziloKod) {
  const kod = String(voziloKod || "").trim().toUpperCase();
  if (!kod) throw new Error("Kod tipa vozila je obavezan");
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  return uploadSlikaSifrarnik(file, {
    modul: "atributivne",
    id: kod,
    imeFajla: `vozilo-dijagram/${kod}.${ext}`,
  });
}
