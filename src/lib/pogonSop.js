import { jeValidanPogon, nazivPogona } from "./pogonKodovi.js";
import { spojiDeoIPogon } from "./deloviAtributivni.js";
import { jeMerljivaKarakteristika } from "./varijabilneUtils.js";

/** RN-2026-NM001-B → B; RN-2026-NM001 → null (mora izbor pogona). */
export function pogonIzRn(brojNaloga) {
  const rn = String(brojNaloga || "").trim().toUpperCase();
  if (!rn) return null;
  const m = rn.match(/-([A-H])$/);
  return m ? m[1] : null;
}

/** Mapa SOP: sopMap[id_deo][pogon_kod] = red. */
export function buildSopMapPoPogonu(sopRows) {
  const map = {};
  for (const s of sopRows || []) {
    const id = String(s.id_deo || "").trim().toUpperCase();
    const pogon = String(s.pogon_kod || "A").trim().toUpperCase();
    if (!id) continue;
    if (!map[id]) map[id] = {};
    map[id][pogon] = { ...s, id_deo: id, pogon_kod: pogon };
  }
  return map;
}

export function sopZaPogon(sopMap, idDeo, pogonKod) {
  const id = String(idDeo || "").trim().toUpperCase();
  const pogon = String(pogonKod || "").trim().toUpperCase();
  return sopMap?.[id]?.[pogon] || null;
}

export function pogoniZaDeo(sopMap, idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  const keys = Object.keys(sopMap?.[id] || {}).sort();
  return keys.filter(jeValidanPogon);
}

/** Aktivni redovi delovi za id_deo. */
export function deloviRedoviZaId(deloviRows, idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  return (deloviRows || []).filter(
    (r) => String(r.id_deo || "").toUpperCase() === id && r.aktivan !== false,
  );
}

/** Pogoni za atributivne — iz delovi_atributivni_pogon (Excel: pogon kod). */
export function pogoniZaDeoAtributivne(atributivniPogonRows, idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  const pogoni = (atributivniPogonRows || [])
    .filter((r) => String(r.id_deo || "").toUpperCase() === id && r.aktivan !== false)
    .map((r) => String(r.pogon_kod || "").trim().toUpperCase())
    .filter((p) => p && jeValidanPogon(p));
  return [...new Set(pogoni)].sort();
}

/** Master deo + pogon red za atributivni unos. */
export function deoInfoZaPogon(deloviRows, atributivniPogonRows, idDeo, pogonKod) {
  const id = String(idDeo || "").trim().toUpperCase();
  const p = String(pogonKod || "").trim().toUpperCase();
  const master = deloviRedoviZaId(deloviRows, id)[0] || null;
  const pogoni = (atributivniPogonRows || []).filter(
    (r) => String(r.id_deo || "").toUpperCase() === id && r.aktivan !== false,
  );

  if (p) {
    const pogonRed = pogoni.find((r) => String(r.pogon_kod || "").toUpperCase() === p);
    if (pogonRed) return spojiDeoIPogon(master, pogonRed);
  }
  if (!p && !pogoni.length && master) return master;
  return null;
}

/** Pogoni iz SOP (merljive) + aktivnih radnih naloga (merljive). */
export function pogoniZaDeoSvi(sopMap, rnRows, idDeo) {
  const merged = new Set(pogoniZaDeo(sopMap, idDeo));
  const id = String(idDeo || "").trim().toUpperCase();
  for (const r of rnRows || []) {
    if (String(r.id_deo || "").toUpperCase() !== id) continue;
    const brojRn = String(r.broj_naloga || r.radni_nalog || "").trim().toUpperCase();
    const p = String(r.pogon_kod || "").trim().toUpperCase()
      || pogonIzRn(brojRn);
    if (p && jeValidanPogon(p)) merged.add(p);
  }
  return [...merged].sort();
}

export function labelPogona(kod) {
  const k = String(kod || "").trim().toUpperCase();
  const naziv = nazivPogona(k);
  return naziv ? `${k} — ${naziv}` : k;
}

/** Jedinstveni delovi za padajuće liste (NM-001 × 8 pogona → jedan red). */
export function uniqueDeloviIzSop(sopRows) {
  const seen = new Map();
  for (const s of sopRows || []) {
    const id = String(s.id_deo || "").trim().toUpperCase();
    if (!id || seen.has(id)) continue;
    seen.set(id, {
      id_deo: id,
      naziv_dela: s.naziv_dela,
      broj_merenja: s.broj_merenja,
    });
  }
  return [...seen.values()].sort((a, b) => a.id_deo.localeCompare(b.id_deo));
}

/** Najveći broj_merenja za deo (SPC podgrupe) — po pogonu ili max svih pogona. */
export function brojMerenjaIzSop(sopRows, idDeo, pogonKod) {
  const id = String(idDeo || "").trim().toUpperCase();
  const pogon = String(pogonKod || "").trim().toUpperCase();
  const rows = (sopRows || []).filter((r) => String(r.id_deo || "").toUpperCase() === id);
  if (!rows.length) return 5;
  if (pogon) {
    const jedan = rows.find((r) => String(r.pogon_kod || "A").toUpperCase() === pogon);
    return Number(jedan?.broj_merenja) || 5;
  }
  return Math.max(5, ...rows.map((r) => Number(r.broj_merenja) || 5));
}

/** Pogon iz reda radni_nalozi (kolona ili sufiks RN). */
export function pogonKodIzRnReda(row) {
  if (!row) return null;
  const pk = String(row.pogon_kod || "").trim().toUpperCase();
  if (pk && jeValidanPogon(pk)) return pk;
  const brojRn = String(row.broj_naloga || row.radni_nalog || "").trim().toUpperCase();
  return pogonIzRn(brojRn);
}

/** Aktivni nalozi za deo, mapa pogon_kod → red. */
export function naloziZaDeoPoPogonu(naloziRows, idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  const map = {};
  for (const r of naloziRows || []) {
    if (String(r.id_deo || "").toUpperCase() !== id) continue;
    if (String(r.status || "aktivan").toLowerCase() !== "aktivan") continue;
    const p = pogonKodIzRnReda(r);
    if (!p) continue;
    map[p] = r;
  }
  return map;
}

/** Da li postoji RN za id_deo + pogon (radni_nalozi, delovi ili SOP za merljive). */
export function imaAktivanRnZaPogon(naloziRows, idDeo, pogonKod, {
  sopMap, deloviRows, atributivniPogonRows, modul,
} = {}) {
  const p = String(pogonKod || "").trim().toUpperCase();
  if (!p) return false;
  if (naloziZaDeoPoPogonu(naloziRows, idDeo)[p]) return true;

  const deoRn = deoInfoZaPogon(deloviRows, atributivniPogonRows, idDeo, pogonKod)?.radni_nalog;
  if (deoRn) return true;

  const id = String(idDeo || "").trim().toUpperCase();
  const aktivni = (naloziRows || []).filter(
    (r) => String(r.id_deo || "").toUpperCase() === id
      && String(r.status || "aktivan").toLowerCase() === "aktivan",
  );
  if (aktivni.length === 1 && !pogonKodIzRnReda(aktivni[0])) {
    return p === "A";
  }

  if (modul !== "atributivne") {
    const sopRn = sopZaPogon(sopMap, idDeo, pogonKod)?.radni_nalog;
    if (sopRn) return true;
  }

  return false;
}

/**
 * Pogon je klikabilan ako ima RN (i SOP/karakteristike za merljive).
 * modul: "merljive" | "atributivne"
 */
export function jePogonOmogucen({
  sopMap,
  naloziRows,
  deloviRows,
  atributivniPogonRows,
  karakteristike,
  idDeo,
  pogonKod,
  modul = "atributivne",
}) {
  const id = String(idDeo || "").trim().toUpperCase();
  const p = String(pogonKod || "").trim().toUpperCase();
  if (!id || !p) return false;

  if (modul === "atributivne") {
    const uDelovima = pogoniZaDeoAtributivne(atributivniPogonRows, id);
    if (uDelovima.length > 0 && !uDelovima.includes(p)) return false;
    return imaAktivanRnZaPogon(naloziRows, id, p, {
      sopMap, deloviRows, atributivniPogonRows, modul,
    });
  }

  if (!imaAktivanRnZaPogon(naloziRows, id, p, {
    sopMap, deloviRows, atributivniPogonRows, modul,
  })) return false;

  const imaSopZaDeo = Object.keys(sopMap?.[id] || {}).length > 0;
  if (imaSopZaDeo && !sopZaPogon(sopMap, idDeo, p)) return false;
  return filtrirajKarakteristikePoPogonu(karakteristike, idDeo, p)
    .filter(jeMerljivaKarakteristika).length > 0;
}

/** Karakteristike za id_deo + pogon. */
export function filtrirajKarakteristikePoPogonu(rows, idDeo, pogonKod) {
  const id = String(idDeo || "").trim().toUpperCase();
  const pogon = String(pogonKod || "").trim().toUpperCase();
  return (rows || []).filter((r) => {
    if (String(r.id_deo || "").toUpperCase() !== id) return false;
    if (!pogon) return true;
    const pk = String(r.pogon_kod || "").trim().toUpperCase();
    return !pk || pk === pogon;
  });
}
