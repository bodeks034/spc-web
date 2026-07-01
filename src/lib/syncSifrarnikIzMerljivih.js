/**
 * Jedan izvor (karakteristike_merljive + opcione kolone) → delovi + sop_deo_varijabilni.
 */

/**
 * Jedan tab karakteristike_merljive — meta + auto-sync (SOP / delovi / RN).
 * Vizuelno u merni_instrument → atributivne (v. karakteristikaMerljive.js).
 */
import {
  jeAtributivnaPoInstrumentu,
  jeMerljivaPoInstrumentu,
  brojMerenjaIzReda,
  faiBrojMerenjaIzReda,
} from "./karakteristikaMerljive.js";
import { faiObaveznoIzReda } from "./faiWorkflow.js";

export const SYNC_META_COLS = [
  "radni_nalog",
  "faza_naziv",
  "linija_faza",
  "linija_id",
  "masina_id",
  "naziv_dela",
  "slika",
  "ukupno_kom",
  "kom_za_kontrolu_n",
  "nivo_kontrole",
  "fai_broj_merenja",
  "broj_merenja",
];

function norm(v) {
  return String(v ?? "").trim().toUpperCase();
}

export function daNe(v, fallback = false) {
  if (v === undefined || v === null || v === "") return fallback;
  const s = String(v).trim().toLowerCase();
  if (["da", "1", "true", "yes"].includes(s)) return true;
  if (["ne", "0", "false", "no"].includes(s)) return false;
  return fallback;
}

export function resolvePogonKod(row) {
  let pk = String(row?.pogon_kod || "").trim().toUpperCase();
  if (!pk && row?.linija_faza) pk = pogonIzLinijeFaze(row.linija_faza) || "";
  if (!pk && row?.radni_nalog) {
    const m = String(row.radni_nalog).trim().toUpperCase().match(/-([A-H])$/);
    if (m) pk = m[1];
  }
  return pk;
}

/** Pogon za SOP/RN — podrazumevano A kad deo ima merljive dimenzije bez pogona. */
export function effectivePogonMerljive(meta) {
  const pk = resolvePogonKod(meta);
  if (pk) return pk;
  return meta?.merljive ? "A" : "";
}

/** Grupiši redove po id_deo + pogon_kod (prazan pogon = jedan deo bez izbora pogona). */
export function grupisiKarakteristike(rows) {
  const groups = new Map();
  for (const r of rows || []) {
    const id = norm(r.id_deo);
    if (!id) continue;
    const resolved = resolvePogonKod(r);
    const eksplicitanPogon = resolved !== "";
    const pogon = eksplicitanPogon ? resolved : "";
    const key = `${id}|${eksplicitanPogon ? pogon : "__single__"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      ...r,
      id_deo: id,
      pogon_kod: pogon,
      _eksplicitanPogon: eksplicitanPogon,
    });
  }
  return groups;
}

/** Meta za grupu — prvi red sa popunjenim flagovima ili prvi red grupe. */
export function metaIzGrupe(rows) {
  const first = rows[0] || {};
  const meta = {};
  for (const r of rows) {
    for (const col of SYNC_META_COLS) {
      const v = r[col];
      if (v !== undefined && v !== null && String(v).trim() !== "" && meta[col] === undefined) {
        meta[col] = v;
      }
    }
  }

  const brojMerenja = rows.reduce((best, r) => {
    const n = brojMerenjaIzReda(r);
    if (Number.isFinite(n) && n > 0 && jeMerljivaPoInstrumentu(r)) return Math.max(best, n);
    return best;
  }, 0);
  const imaMerljivih = rows.some((r) => jeMerljivaPoInstrumentu(r));
  const atributivne = rows.some((r) => jeAtributivnaPoInstrumentu(r));

  const ukupnoKom = rows.reduce((v, r) => {
    const n = Number(r.ukupno_kom);
    return Number.isFinite(n) && n > 0 ? n : v;
  }, null);

  const eksplicitanPogon = rows.some((r) => r._eksplicitanPogon) || resolvePogonKod(first) !== "";
  const pogonResolved = resolvePogonKod(first)
    || rows.map(resolvePogonKod).find(Boolean)
    || "";

  return {
    id_deo: first.id_deo,
    pogon_kod: eksplicitanPogon ? pogonResolved : "",
    eksplicitanPogon,
    faza_naziv: first.faza_naziv || "",
    linija_faza: first.linija_faza || "",
    broj_merenja: brojMerenja > 0 ? brojMerenja : (imaMerljivih ? 5 : null),
    naziv_dela: meta.naziv_dela || "",
    radni_nalog: meta.radni_nalog
      ? String(meta.radni_nalog).trim().toUpperCase()
      : (eksplicitanPogon ? radniNalogIzDeoPogona(first.id_deo, first.pogon_kod) : ""),
    slika: meta.slika || "",
    linija_id: meta.linija_id !== undefined && meta.linija_id !== "" ? Number(meta.linija_id) : null,
    masina_id: meta.masina_id !== undefined && meta.masina_id !== "" ? Number(meta.masina_id) : null,
    kom_za_kontrolu_n: meta.kom_za_kontrolu_n !== undefined && meta.kom_za_kontrolu_n !== ""
      ? Number(meta.kom_za_kontrolu_n)
      : null,
    ukupno_kom: ukupnoKom,
    nivo_kontrole: meta.nivo_kontrole || null,
    fai_broj_merenja: meta.fai_broj_merenja !== undefined && meta.fai_broj_merenja !== ""
      ? faiBrojMerenjaIzReda({ fai_broj_merenja: meta.fai_broj_merenja })
      : null,
    atributivne,
    merljive: imaMerljivih,
  };
}

function napomenaDeloviIzMeta(m, stara = "") {
  const delovi = [];
  if (stara) delovi.push(stara);
  if (m.nivo_kontrole && faiObaveznoIzReda({ nivo_kontrole: m.nivo_kontrole })) {
    delovi.push(`FAI: ${m.fai_broj_merenja || 1} merenja/dim`);
  } else if (m.nivo_kontrole) {
    delovi.push(`Nivo kontrole: ${m.nivo_kontrole}`);
  }
  return [...new Set(delovi)].join(" · ");
}

function deoPogonKey(id, pogon) {
  return `${norm(id)}|${norm(pogon)}`;
}

/** RN-2026-NM001-A iz id_deo + pogon_kod */
export function radniNalogIzDeoPogona(idDeo, pogonKod) {
  const id = String(idDeo || "").trim().toUpperCase().replace(/-/g, "");
  const p = String(pogonKod || "").trim().toUpperCase();
  if (!id || !p) return "";
  return `RN-2026-${id}-${p}`;
}

/** Jedinstven broj_naloga za radni_nalozi (PK = broj_naloga, ne id_deo+pogon). */
export function brojNalogaZaGrupu(m) {
  const poPogonu = radniNalogIzDeoPogona(m.id_deo, m.pogon_kod);
  const explicit = String(m.radni_nalog || "").trim().toUpperCase();
  if (m.eksplicitanPogon) return poPogonu || explicit;
  return explicit || poPogonu;
}

import { pogonIzLinijeFaze, LINIJA_FAZA_POGON_DEFAULT as LINIJA_FAZA_POGON } from "./pogonLinijaLookup.js";
import { metaZaDeo, deoMetaMapa } from "./glavniUnosDemo.js";

export { pogonIzLinijeFaze, LINIJA_FAZA_POGON };

/** Generiši sop + delovi redove iz karakteristika. */
export function generisiIzKarakteristika(karRows, { postojeciSop = [], postojeciDelovi = [], deoMeta } = {}) {
  const groups = grupisiKarakteristike(karRows);
  const metaMap = deoMetaMapa(deoMeta);
  const sopByKey = new Map(
    (postojeciSop || []).map((r) => [deoPogonKey(r.id_deo, r.pogon_kod), r]),
  );
  const deloviByKey = new Map(
    (postojeciDelovi || []).map((r) => [deoPogonKey(r.id_deo, r.pogon_kod), r]),
  );
  const masterById = new Map();

  const sopOut = [];
  const deloviPogonOut = [];

  for (const rows of groups.values()) {
    const m = metaIzGrupe(rows);
    const pogonEff = effectivePogonMerljive(m);
    const key = deoPogonKey(m.id_deo, pogonEff);
    const stariSop = sopByKey.get(key) || sopByKey.get(deoPogonKey(m.id_deo, m.pogon_kod)) || {};
    const stariDeo = deloviByKey.get(key) || deloviByKey.get(deoPogonKey(m.id_deo, m.pogon_kod)) || {};

    const naziv = m.naziv_dela || stariSop.naziv_dela || stariDeo.naziv_dela || "";
    const rn = m.radni_nalog || stariSop.radni_nalog || stariDeo.radni_nalog || "";
    const slika = m.slika || stariSop.slika || stariDeo.slika_naziv || "";
    const linijaId = Number.isFinite(m.linija_id) ? m.linija_id : (stariDeo.linija_id ?? null);
    const masinaId = Number.isFinite(m.masina_id) ? m.masina_id : (stariDeo.masina_id ?? null);
    const dm = metaZaDeo(metaMap, m.id_deo);

    if (!masterById.has(m.id_deo)) {
      masterById.set(m.id_deo, {
        id_deo: m.id_deo,
        naziv_dela: naziv,
        karakteristika: m.faza_naziv || stariDeo.karakteristika || "Kontrola kvaliteta",
        linija_id: linijaId,
        masina_id: masinaId,
        kom_za_kontrolu: m.kom_za_kontrolu_n,
        slika_naziv: slika || null,
        aktivan: true,
        napomena: napomenaDeloviIzMeta(m, stariDeo.napomena || ""),
        tip_kontrole: dm.tip_kontrole || stariDeo.tip_kontrole || "deo",
        vozilo_katalog_id: dm.vozilo_katalog_id ?? stariDeo.vozilo_katalog_id ?? null,
        greska_katalog_id: stariDeo.greska_katalog_id || null,
      });
    }

    if (m.merljive && pogonEff) {
      sopOut.push({
        id_deo: m.id_deo,
        pogon_kod: pogonEff,
        radni_nalog: rn || radniNalogIzDeoPogona(m.id_deo, pogonEff) || null,
        naziv_dela: naziv || null,
        slika: slika || null,
        masina: stariSop.masina || null,
        linija: m.linija_faza || stariSop.linija || null,
        broj_merenja: m.broj_merenja,
        kontrolor_ime: stariSop.kontrolor_ime || null,
      });
    }

    // Svaki pogon → red za atributivni modul (izbor pogona, RN, vizuelna kontrola).
    if (pogonEff) {
      deloviPogonOut.push({
        id_deo: m.id_deo,
        pogon_kod: pogonEff,
        radni_nalog: rn || null,
        naziv_dela: naziv || null,
        karakteristika: m.faza_naziv
          || (m.merljive ? "Merljive kontrola" : stariDeo.karakteristika)
          || "Kontrola kvaliteta",
        linija_id: linijaId,
        masina_id: masinaId,
        kom_za_kontrolu: m.kom_za_kontrolu_n,
        slika_naziv: slika || null,
        aktivan: true,
        napomena: napomenaDeloviIzMeta(
          m,
          stariDeo.napomena || `Pogon ${m.pogon_kod} — ${m.linija_faza || ""}`.trim(),
        ),
      });
    }
  }

  return {
    sopRows: sopOut.sort((a, b) => {
      const c = a.id_deo.localeCompare(b.id_deo);
      return c !== 0 ? c : a.pogon_kod.localeCompare(b.pogon_kod);
    }),
    deloviPogonRows: deloviPogonOut.sort((a, b) => {
      const c = a.id_deo.localeCompare(b.id_deo);
      return c !== 0 ? c : a.pogon_kod.localeCompare(b.pogon_kod);
    }),
    masterRows: [...masterById.values()],
  };
}

/** Jedan red delovi → kolone Excel mastera. */
export function deoRedZaExcel(r, { bezPogona = false } = {}) {
  const id = r.id_deo || r["id dela*"] || "";
  return {
    "id dela*": id,
    "pogon kod": bezPogona ? "" : (r.pogon_kod || r["pogon kod"] || ""),
    "radni nalog": r.radni_nalog || r["radni nalog"] || "",
    "naziv dela*": r.naziv_dela || r["naziv dela*"] || "",
    "karakteristika kontrole*": r.karakteristika || r["karakteristika kontrole*"] || "",
    "linija id*": r.linija_id ?? r["linija id*"] ?? "",
    "masina id*": r.masina_id ?? r["masina id*"] ?? "",
    "kom za kontrolu n*": r.kom_za_kontrolu ?? r["kom za kontrolu n*"] ?? "",
    "slika/crtez": r.slika_naziv || r["slika/crtez"] || "",
    aktivan: r.aktivan === false || String(r.aktivan).toUpperCase() === "NE" ? "NE" : "DA",
    napomena: r.napomena || "",
    "tip kontrole": r.tip_kontrole || r["tip kontrole"] || "deo",
    "vozilo katalog id": r.vozilo_katalog_id || r["vozilo katalog id"] || "",
    "greska katalog id": r.greska_katalog_id || r["greska katalog id"] || "",
  };
}

/** Spoji auto-generisane delovi sa ručnim redovima (vozila, delovi bez karakteristika). */
export function spojiDeloviCsv(postojeciDelovi, deloviPogonRows, masterRows) {
  const autoIds = new Set((masterRows || []).map((r) => norm(r.id_deo)));
  const autoPogonKeys = new Set(
    (deloviPogonRows || []).map((r) => deoPogonKey(r.id_deo, r.pogon_kod)),
  );

  const rucni = (postojeciDelovi || []).filter((r) => {
    const id = norm(r.id_deo || r["id dela*"]);
    const pk = norm(r.pogon_kod || r["pogon kod"]);
    if (!id) return false;
    if (autoIds.has(id) && pk) return false;
    if (pk && autoPogonKeys.has(deoPogonKey(id, pk))) return false;
    if (!pk && autoIds.has(id)) return false;
    return true;
  });

  const out = rucni.map((r) => deoRedZaExcel(r));
  for (const p of deloviPogonRows || []) {
    out.push(deoRedZaExcel(p));
  }
  for (const m of masterRows || []) {
    const id = norm(m.id_deo);
    const imaPogon = (deloviPogonRows || []).some((p) => norm(p.id_deo) === id);
    if (!imaPogon) {
      out.push(deoRedZaExcel(m, { bezPogona: true }));
    }
  }

  return out.sort((a, b) => {
    const c = String(a["id dela*"]).localeCompare(String(b["id dela*"]));
    return c !== 0 ? c : String(a["pogon kod"]).localeCompare(String(b["pogon kod"]));
  });
}

/** Spoji auto SOP sa ručnim (delovi van karakteristika). */
export function spojiSopCsv(postojeciSop, sopRows) {
  const deoSaNovimSop = new Set((sopRows || []).map((r) => norm(r.id_deo)));
  const rucni = (postojeciSop || []).filter((r) => {
    const id = norm(r.id_deo);
    if (deoSaNovimSop.has(id)) return false;
    return true;
  });
  return [...rucni, ...(sopRows || [])].sort((a, b) => {
    const c = String(a.id_deo).localeCompare(String(b.id_deo));
    return c !== 0 ? c : String(a.pogon_kod).localeCompare(String(b.pogon_kod));
  });
}

/** Generiši radni_nalozi redove iz karakteristika (po id_deo + pogon). */
export function generisiRadniNaloge(karRows, { postojeciRn = [], podrazumevano = {}, kupacPoDeo = null } = {}) {
  const groups = grupisiKarakteristike(karRows);
  const postojeciKeys = new Set(
    (postojeciRn || []).map((r) => deoPogonKey(r.id_deo || r["id dela*"], r.pogon_kod)),
  );
  let maxId = (postojeciRn || []).reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);

  const out = [];
  for (const rows of groups.values()) {
    const m = metaIzGrupe(rows);
    if (!m.eksplicitanPogon) continue;
    const key = deoPogonKey(m.id_deo, m.pogon_kod);
    if (postojeciKeys.has(key)) continue;

    const rn = brojNalogaZaGrupu(m);
    if (!rn) continue;

    const deoRn = kupacPoDeo?.get?.(m.id_deo) || kupacPoDeo?.[m.id_deo] || null;

    maxId += 1;
    out.push({
      id: maxId,
      broj_naloga: deoRn?.radni_nalog ? String(deoRn.radni_nalog).trim().toUpperCase() : rn,
      id_deo: m.id_deo,
      naziv_dela: deoRn?.naziv_dela || m.naziv_dela || "",
      kolicina: deoRn?.ukupno_kom ?? m.ukupno_kom ?? podrazumevano.kolicina ?? 50,
      kupac: deoRn?.kupac || podrazumevano.kupac || "",
      datum_unosa: podrazumevano.datum_unosa ?? new Date().toISOString().slice(0, 10),
      rok_isporuke: podrazumevano.rok_isporuke ?? null,
      status: "aktivan",
      operater: podrazumevano.operater ?? "PERA OPERATER",
      napomena: podrazumevano.napomena ?? "",
      pogon_kod: m.pogon_kod,
    });
  }
  return out.sort((a, b) => String(a.broj_naloga).localeCompare(String(b.broj_naloga)));
}

export function spojiRadniNalogeCsv(postojeciRn, noviRn) {
  const autoKeys = new Set((noviRn || []).map((r) => deoPogonKey(r.id_deo, r.pogon_kod)));
  const rucni = (postojeciRn || []).filter(
    (r) => !autoKeys.has(deoPogonKey(r.id_deo, r.pogon_kod)),
  );
  return [...rucni, ...(noviRn || [])].sort((a, b) => Number(a.id) - Number(b.id));
}
