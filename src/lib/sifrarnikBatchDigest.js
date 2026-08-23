/** Rezime batch objave — Teams/email/browser preko notifikacija. */
import { supabase } from "./supabaseClient.js";
import { ucitajPodesavanjaNotifikacija, posaljiObavestenje } from "./notifikacije.js";

export function formatBatchObjavaDigest(rezultati = []) {
  const uspeh = rezultati.filter((r) => r.ok);
  const neuspelo = rezultati.filter((r) => !r.ok);
  const linije = [
    `Batch objava šifrarnika: ${uspeh.length}/${rezultati.length} uspešno`,
    ...uspeh.slice(0, 15).map((r) => `✓ ${r.idDeo} (${r.karakteristike || 0} dim)`),
    ...neuspelo.slice(0, 10).map((r) => `✗ ${r.idDeo}: ${r.greska}`),
  ];
  if (uspeh.length > 15) linije.push(`… +${uspeh.length - 15} uspešnih`);
  if (neuspelo.length > 10) linije.push(`… +${neuspelo.length - 10} grešaka`);
  return linije.join("\n");
}

export async function posaljiBatchObjavaDigest(rezultati = []) {
  if (!rezultati.length) return { preskoceno: true };
  const settings = await ucitajPodesavanjaNotifikacija(supabase);
  const neuspelo = rezultati.filter((r) => !r.ok).length;
  const alarmId = `batch_objavi_${Date.now()}`;
  return posaljiObavestenje(supabase, settings, {
    id: alarmId,
    naslov: `Šifrarnik batch: ${rezultati.length - neuspelo}/${rezultati.length}`,
    opis: formatBatchObjavaDigest(rezultati),
    nivo: neuspelo ? "srednji" : "nizak",
  });
}
