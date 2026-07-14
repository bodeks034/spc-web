/** Statistika smene po pogonima (A–I) i aktivni radni nalozi. */

import { agregirajAtributivneJedinice } from "./atributivneAgregacija.js";
import { primeniLinijaFilter, primeniPogonFilter } from "./digestLinija.js";
import { pogonMapaIzRedova, formatPogonOznaka } from "./pogonOznaka.js";
import { izracunajFpyIzDash } from "./sefSmenaDashboard.js";

function dIso() {
  return new Date().toISOString().split("T")[0];
}

function statMerljivihRedova(rows) {
  const n = rows.length;
  const nok = rows.filter((r) => (r.status || "").toUpperCase() === "NOK").length;
  return {
    n,
    ok: n - nok,
    nok,
    fpy: n > 0 ? +(((n - nok) / n) * 100).toFixed(1) : null,
  };
}

function statAtributivnihRedova(rows) {
  const { ok, nok, n } = agregirajAtributivneJedinice(rows);
  return {
    n,
    ok,
    nok,
    fpy: n > 0 ? +((ok / n) * 100).toFixed(1) : null,
  };
}

export function spojiStatModula(attr = {}, merljive = {}) {
  const ukN = (attr.n || 0) + (merljive.n || 0);
  const ukNok = (attr.nok || 0) + (merljive.nok || 0);
  const fpy = izracunajFpyIzDash(
    { ukN: attr.n || 0, ukNOK: attr.nok || 0 },
    { merenja: merljive.n || 0, nok: merljive.nok || 0 },
  );
  return {
    n: ukN,
    ok: (attr.ok || 0) + (merljive.ok || 0),
    nok: ukNok,
    fpy,
    dpmo: ukN > 0 ? Math.round((ukNok / ukN) * 1e6) : 0,
  };
}

export async function fetchListaPogona(supabase) {
  const { data } = await supabase.from("pogon_linija_mapa").select("pogon_kod,linija_faza").order("pogon_kod");
  const mapa = pogonMapaIzRedova(data || []);
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kod, linija]) => ({
      kod,
      linija,
      label: formatPogonOznaka(kod, mapa),
    }));
}

export async function fetchSmenaStatPoPogonima(supabase, {
  datum,
  smena,
  linija = null,
} = {}) {
  const d = datum || dIso();
  const sm = Number(smena) || 1;

  let merQ = supabase.from("merenja_varijabilna")
    .select("status,pogon_kod")
    .eq("datum", d)
    .eq("smena", sm);
  merQ = primeniLinijaFilter(merQ, linija);

  let atrQ = supabase.from("kontrolni_log")
    .select("ok_kolicina,nok_kolicina,kom_nok,ukupno_merenja,status,greska_naziv,inspekcija_id,sesija_id,created_at,id,datum,smena,pogon_kod")
    .eq("datum", d)
    .eq("smena", sm);
  atrQ = primeniLinijaFilter(atrQ, linija);

  const [merRes, atrRes, mapaRes] = await Promise.all([
    merQ,
    atrQ,
    supabase.from("pogon_linija_mapa").select("pogon_kod,linija_faza").order("pogon_kod"),
  ]);

  const mapa = pogonMapaIzRedova(mapaRes.data || []);
  const poKod = new Map();

  const bucket = (kod) => {
    const k = String(kod || "").trim().toUpperCase() || "?";
    if (!poKod.has(k)) {
      poKod.set(k, { pogon: k, linija: mapa.get(k) || "", merRows: [], atrRows: [] });
    }
    return poKod.get(k);
  };

  for (const r of merRes.data || []) bucket(r.pogon_kod).merRows.push(r);
  for (const r of atrRes.data || []) bucket(r.pogon_kod).atrRows.push(r);

  const redovi = [...poKod.values()]
    .map((b) => {
      const attr = statAtributivnihRedova(b.atrRows);
      const merljive = statMerljivihRedova(b.merRows);
      const ukupno = spojiStatModula(attr, merljive);
      return {
        pogon: b.pogon,
        linija: b.linija,
        label: formatPogonOznaka(b.pogon, mapa),
        attr,
        merljive,
        ukupno,
        imaPodatke: ukupno.n > 0,
      };
    })
    .filter((r) => r.imaPodatke)
    .sort((a, b) => a.pogon.localeCompare(b.pogon));

  return { datum: d, smena: sm, redovi, mapa };
}

export async function fetchAktivniRadniNalozi(supabase, { pogonKod = null, limit = 40 } = {}) {
  let q = supabase.from("radni_nalozi")
    .select("id_deo,pogon_kod,broj_naloga,kolicina,status")
    .eq("status", "aktivan")
    .order("pogon_kod")
    .limit(limit);
  q = primeniPogonFilter(q, pogonKod);
  const { data, error } = await q;
  if (error) return [];
  return data || [];
}

/** Tekstualni blok za email digest. */
export function formatPoPogonimaTekst(redovi) {
  if (!redovi?.length) return "";
  const linije = ["Po pogonima:"];
  for (const p of redovi) {
    const atr = p.attr?.n ? `atr ${p.attr.n} (${p.attr.fpy}%)` : "atr —";
    const mer = p.merljive?.n ? `mer ${p.merljive.n} (${p.merljive.fpy}%)` : "mer —";
    linije.push(`  ${p.label}: ${atr} · ${mer} · ukupno FPY ${p.ukupno?.fpy ?? "—"}%`);
  }
  return linije.join("\n");
}
