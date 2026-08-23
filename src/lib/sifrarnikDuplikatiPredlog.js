/** Predlog rešenja duplih dimenzija (pogon + pozicija). */
import { supabase } from "./supabaseClient.js";
import { logSifrarnikAudit } from "./sifrarnikAudit.js";
import { obavestiPromenuStatusaSifrarnika } from "./sifrarnikStatusEvent.js";

export function predlogZadrziRed(rows = []) {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => {
    const score = (r) => [
      r.nominala != null && r.nominala !== "" ? 1 : 0,
      r.lsl != null && r.lsl !== "" ? 1 : 0,
      r.usl != null && r.usl !== "" ? 1 : 0,
      r.naziv_mere ? 1 : 0,
    ].reduce((s, v) => s + v, 0);
    const diff = score(b) - score(a);
    if (diff !== 0) return diff;
    return (a.id || 0) - (b.id || 0);
  });
  const zadrzi = sorted[0];
  const obrisi = sorted.slice(1);
  return {
    zadrziId: zadrzi.id,
    zadrziPozicija: zadrzi.pozicija || zadrzi.sifra_merenja,
    obrisiIds: obrisi.map((r) => r.id),
    razlog: "Zadrži red sa najviše popunjenih granica (nominala/LSL/USL)",
  };
}

/** Obriši duplikate prema predlogu i zapiši audit. */
export async function primeniPredlogDuplikata(entry) {
  const ids = entry?.predlog?.obrisiIds || [];
  if (!ids.length) return { obrisano: 0 };
  const { error } = await supabase.from("karakteristike_merljive").delete().in("id", ids);
  if (error) throw error;
  await logSifrarnikAudit({
    idDeo: entry.idDeo,
    akcija: "obrisi_duplikat",
    izvor: "odrzavanje",
    detalji: { zadrziId: entry.predlog.zadrziId, obrisano: ids },
  });
  obavestiPromenuStatusaSifrarnika({ izvor: "odrzavanje", akcija: "obrisi_duplikat" });
  return { obrisano: ids.length, zadrziId: entry.predlog.zadrziId };
}

/** Primeni predloge za više duplikata (audit po delu). */
export async function primeniSvePredlogeDuplikata(entries = [], { onProgress } = {}) {
  const rezultati = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    onProgress?.({ trenutni: i + 1, ukupno: entries.length, idDeo: entry.idDeo });
    try {
      const res = await primeniPredlogDuplikata(entry);
      rezultati.push({ idDeo: entry.idDeo, ok: true, ...res });
    } catch (e) {
      rezultati.push({ idDeo: entry.idDeo, ok: false, greska: e.message || String(e) });
    }
  }
  const uspeh = rezultati.filter((r) => r.ok).length;
  await logSifrarnikAudit({
    akcija: "obrisi_duplikat_bulk",
    izvor: "odrzavanje",
    detalji: { uspeh, ukupno: rezultati.length, rezultati: rezultati.slice(0, 30) },
  });
  return { rezultati, uspeh, neuspelo: rezultati.length - uspeh };
}

export async function fetchPredlogDuplikata(duplikat) {
  const ids = duplikat?.ids || [];
  if (!ids.length) return null;
  const { data, error } = await supabase
    .from("karakteristike_merljive")
    .select("id,id_deo,pogon_kod,pozicija,sifra_merenja,nominala,lsl,usl,naziv_mere")
    .in("id", ids);
  if (error) throw error;
  const predlog = predlogZadrziRed(data || []);
  if (!predlog) return null;
  return {
    ...duplikat,
    predlog,
    redovi: data || [],
  };
}
