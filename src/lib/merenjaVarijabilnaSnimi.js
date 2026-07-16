/** Pojedinačno snimanje digitalnog merenja u merenja_varijabilna. */

import { stampajClientIdNaRedove } from "./offlineQueue.js";
import { jeDupliClientId } from "./dbGreske.js";

export function buildMerenjeVarijabilnaRow({
  datum,
  smena,
  radniNalog,
  idDeo,
  pogonKod,
  grupaAB,
  kolona,
  merenje,
  status,
  linija,
  kontrolor,
  operater,
  masina,
  radnikId,
  sesijaId,
  foto = null,
  komentar = null,
  clientId = null,
}) {
  const [row] = stampajClientIdNaRedove([{
    datum,
    smena: Number(smena) || 1,
    radni_nalog: radniNalog || null,
    id_deo: String(idDeo || "").trim().toUpperCase(),
    pogon_kod: pogonKod || null,
    karakteristika_id: kolona.id,
    sifra_merenja: grupaAB,
    pozicija: kolona.naziv,
    vrednost_raw: merenje.raw,
    vrednost_dec: merenje.dec,
    status,
    linija: linija || null,
    kontrolor: kontrolor || null,
    operater: operater || "",
    merni_instrument: kolona.instrument || null,
    masina: masina || null,
    radnik_id: radnikId || null,
    foto: status === "NOK" ? foto : null,
    komentar: status === "NOK" ? komentar : null,
    sesija_id: sesijaId,
    client_id: clientId || undefined,
  }]);
  return row;
}

export async function snimiJednoMerenjeVarijabilno(supabase, row) {
  const stamped = stampajClientIdNaRedove([row])[0];
  const { data, error } = await supabase
    .from("merenja_varijabilna")
    .upsert(stamped, { onConflict: "client_id", ignoreDuplicates: true })
    .select("id")
    .maybeSingle();
  if (!error) return data;
  if (jeDupliClientId(error)) return { id: null, client_id: stamped.client_id };
  const { data: d2, error: e2 } = await supabase
    .from("merenja_varijabilna")
    .insert(stamped)
    .select("id")
    .single();
  if (e2 && jeDupliClientId(e2)) return { id: null, client_id: stamped.client_id };
  if (e2) throw e2;
  return d2;
}
