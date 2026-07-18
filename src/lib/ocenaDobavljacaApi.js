import { supabase } from "./supabaseClient.js";
import { izracunajUkupnuOcenu } from "./ocenaDobavljaca.js";

export async function fetchOceneDobavljaca(sifraDobavljaca, limit = 24) {
  const sifra = String(sifraDobavljaca || "").trim().toUpperCase();
  if (!sifra) return [];
  const { data, error } = await supabase
    .from("ocene_dobavljaca")
    .select("*")
    .eq("sifra_dobavljaca", sifra)
    .order("period_do", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

function ocena0do100(v, naziv) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    throw new Error(`${naziv} mora biti od 0 do 100`);
  }
  return +n.toFixed(2);
}

export async function sacuvajOcenuDobavljaca({
  sifraDobavljaca,
  periodOd,
  periodDo,
  stat,
  ocena,
  izvor = "rucno",
  obrazlozenje,
  odobreno = false,
  radnikId = null,
}) {
  const sifra = String(sifraDobavljaca || "").trim().toUpperCase();
  if (!sifra) throw new Error("Dobavljač je obavezan");
  if (!periodOd || !periodDo) throw new Error("Period ocene je obavezan");
  const razlog = String(obrazlozenje || "").trim();
  if (razlog.length < 5) throw new Error("Unesi obrazloženje ocene (najmanje 5 znakova)");

  const kvalitet = ocena0do100(ocena?.kvalitet, "Kvalitet");
  const isporuka = ocena0do100(ocena?.isporuka, "Isporuka");
  const dokumentacija = ocena0do100(ocena?.dokumentacija, "Dokumentacija");
  const reakcija = ocena0do100(ocena?.reakcija, "Reakcija");
  const { ukupno, klasa } = izracunajUkupnuOcenu({
    kvalitet, isporuka, dokumentacija, reakcija,
  });
  const validanRadnikId = Number(radnikId) > 0 ? Number(radnikId) : null;
  const sada = new Date().toISOString();
  const payload = {
    sifra_dobavljaca: sifra,
    period_od: periodOd,
    period_do: periodDo,
    kvalitet_skor: kvalitet,
    isporuka_skor: isporuka,
    dokumentacija_skor: dokumentacija,
    reakcija_skor: reakcija,
    ukupna_ocena: ukupno,
    klasa,
    ppm: Math.max(0, Math.round(Number(stat?.ppm) || 0)),
    kontrolisano: Math.max(0, Number(stat?.kontrolisano) || 0),
    broj_prijema: Math.max(0, Math.round(Number(stat?.prijema) || 0)),
    odbijeno_prijema: Math.max(0, Math.round(Number(stat?.odbijeno) || 0)),
    uslovno_prijema: Math.max(0, Math.round(Number(stat?.uslovno) || 0)),
    izvor_ostalih_ocena: izvor === "erp" ? "erp" : "rucno",
    obrazlozenje: razlog,
    status: odobreno ? "odobreno" : "nacrt",
    kreirao_radnik_id: validanRadnikId,
    odobrio_radnik_id: odobreno ? validanRadnikId : null,
    odobreno_at: odobreno ? sada : null,
    updated_at: sada,
  };
  const { data, error } = await supabase
    .from("ocene_dobavljaca")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    if (/ocene_dobavljaca|does not exist|schema cache/i.test(String(error.message || ""))) {
      throw new Error("Pokreni migraciju 71_ocena_dobavljaca.sql.");
    }
    throw error;
  }
  return data;
}
