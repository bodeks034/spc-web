/** Agregacija atributivnog loga na nivou inspekcije (komad), ne po defektu. */

export function atributivniNokBatchKey(r) {
  if (!r || !(Number(r.nok_kolicina) > 0)) return null;
  if (r.inspekcija_id) return `insp|${r.inspekcija_id}`;
  const ts = r.created_at ? new Date(r.created_at).toISOString().slice(0, 19) : "";
  if (r.sesija_id && ts) return `ses|${r.sesija_id}|${ts}`;
  if (r.id != null) return `id|${r.id}`;
  return `fb|${r.datum}|${r.smena}|${r.id_deo || ""}|${ts}`;
}

/** Jedan komad/vozilo za SPC grupisanje (OK red ili NOK inspekcija). */
export function atributivniKomadKey(r) {
  if (!r) return null;
  if (r.inspekcija_id) return `insp|${r.inspekcija_id}`;
  if (Number(r.nok_kolicina) > 0) return atributivniNokBatchKey(r);
  if (r.id != null) return `row|${r.id}`;
  const ts = r.created_at ? new Date(r.created_at).toISOString().slice(0, 19) : "";
  if (ts) return `ts|${r.datum || ""}|${ts}|${r.id_deo || ""}`;
  return null;
}

function kolicineIzReda(r) {
  let ok = Number(r.ok_kolicina) || 0;
  let nok = Number(r.nok_kolicina) || 0;
  const uk = Number(r.ukupno_merenja) || 0;
  if (ok + nok <= 0 && uk > 0) {
    const jeNok = String(r.status || "").toUpperCase() === "NOK"
      || (r.greska_naziv && r.greska_naziv !== "OK");
    if (jeNok) nok = uk;
    else ok = uk;
  }
  return { ok, nok };
}

/** OK komadi + NOK inspekcije (jedan komad po inspekciji, više defekata = jedan NOK). */
export function agregirajAtributivneJedinice(rows) {
  let ok = 0;
  let komNok = 0;
  const nokBatches = new Map();

  for (const r of rows || []) {
    const kol = kolicineIzReda(r);
    ok += kol.ok;
    komNok += Number(r.kom_nok) || 0;
    const nokKol = kol.nok;
    if (nokKol <= 0) continue;
    const key = atributivniNokBatchKey(r);
    if (!key) continue;
    const prev = nokBatches.get(key) || 0;
    nokBatches.set(key, Math.max(prev, nokKol));
  }

  const nok = [...nokBatches.values()].reduce((s, v) => s + v, 0);
  const n = ok + nok;
  return { ok, nok, n, komNok };
}

export function statAtributivneRedovi(rows) {
  const { ok, nok, n, komNok } = agregirajAtributivneJedinice(rows);
  return {
    ok,
    nok,
    n,
    komNok,
    rty: n > 0 ? +((ok / n) * 100).toFixed(1) : 0,
    p: n > 0 ? +((nok / n) * 100).toFixed(2) : 0,
    dpmo: n > 0 ? Math.round((nok / n) * 1e6) : 0,
  };
}

export function agregirajAtributivnePoKljuču(rows, kljucFn) {
  const grupe = new Map();
  for (const r of rows || []) {
    const k = kljucFn(r);
    if (!grupe.has(k)) grupe.set(k, []);
    grupe.get(k).push(r);
  }
  return grupe;
}
