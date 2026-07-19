import { agregirajAtributivneJedinice } from "./atributivneAgregacija.js";

/** Merljivi uzorak je NOK ako je bilo koja njegova dimenzija NOK. */
export function agregirajMerljiveUzorke(rows = []) {
  const uzorci = new Map();
  for (const r of rows) {
    const kljuc = r.inspekcija_id
      || `${r.sesija_id || "bez-sesije"}|${r.sifra_merenja || ""}|${r.client_id || r.id || ""}`;
    const prethodni = uzorci.get(kljuc) || { nok: false };
    if (String(r.status || "").toUpperCase() === "NOK") prethodni.nok = true;
    uzorci.set(kljuc, prethodni);
  }
  let nok = 0;
  for (const u of uzorci.values()) if (u.nok) nok += 1;
  const n = uzorci.size;
  return { ok: n - nok, nok, n };
}

/**
 * Jedan prijem može imati atributivnu ili merljivu kontrolu.
 * Ako se koriste obe, njihove kontrolisane jedinice se sabiraju — isti fizički
 * uzorak ne treba unositi dvaput u oba modula.
 */
export function agregirajPrijemIzMerenja(atributivni = [], merljivi = []) {
  const a = agregirajAtributivneJedinice(atributivni);
  const m = agregirajMerljiveUzorke(merljivi);
  return {
    ok: a.ok + m.ok,
    nok: a.nok + m.nok,
    n: a.n + m.n,
    atributivni: a,
    merljivi: m,
  };
}
