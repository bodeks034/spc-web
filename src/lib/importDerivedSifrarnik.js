/**
 * Iz karakteristike_merljive (sa meta kolonama) automatski puni:
 * sop_deo_varijabilni, delovi + delovi_atributivni_pogon, radni_nalozi.
 */
import { podeliDeloviUvoz } from "./deloviAtributivni.js";
import { normalizujDatum } from "./radniNaloziUvoz.js";
import { dedupeRowsForUpsert } from "./upsertUtil.js";
import {
  generisiIzKarakteristika,
  generisiRadniNaloge,
  radniNalogIzDeoPogona,
  grupisiKarakteristike,
  metaIzGrupe,
} from "./syncSifrarnikIzMerljivih.js";

async function upsertBatches(supabase, table, rows, onConflict) {
  if (!rows?.length) return 0;
  const deduped = dedupeRowsForUpsert(rows, onConflict);
  const batchSize = 100;
  let total = 0;
  for (let i = 0; i < deduped.length; i += batchSize) {
    const batch = deduped.slice(i, i + batchSize);
    const opts = onConflict ? { onConflict } : undefined;
    const { error } = await supabase.from(table).upsert(batch, opts);
    if (error) throw new Error(`${table}: ${error.message}`);
    total += batch.length;
  }
  return total;
}

function deoPogonKey(id, pogon) {
  return `${String(id || "").toUpperCase()}|${String(pogon || "").toUpperCase()}`;
}

/** Minimalni master red u delovi (FK za karakteristike_merljive). */
function minimalDeloviMasterIzKar(karRows) {
  const groups = grupisiKarakteristike(karRows);
  const out = [];
  const seen = new Set();
  for (const rows of groups.values()) {
    const m = metaIzGrupe(rows);
    if (seen.has(m.id_deo)) continue;
    seen.add(m.id_deo);
    out.push({
      id_deo: m.id_deo,
      naziv_dela: m.naziv_dela || m.id_deo,
      karakteristika: m.faza_naziv || "Merljive",
      linija_id: Number.isFinite(m.linija_id) ? m.linija_id : 1,
      masina_id: Number.isFinite(m.masina_id) ? m.masina_id : 1,
      kom_za_kontrolu: m.kom_za_kontrolu_n ?? null,
      slika_naziv: m.slika || null,
      aktivan: true,
      tip_kontrole: "deo",
    });
  }
  return out;
}

function spojiMasterDelovi(autoMaster, minimalMaster) {
  const byId = new Map((autoMaster || []).map((r) => [String(r.id_deo).toUpperCase(), r]));
  for (const m of minimalMaster || []) {
    const id = String(m.id_deo).toUpperCase();
    if (!byId.has(id)) byId.set(id, m);
  }
  return [...byId.values()];
}

async function ucitajPostojeceZaDelove(supabase, idDeos) {
  const ids = [...new Set(idDeos.map((d) => String(d).toUpperCase()))];
  if (!ids.length) {
    return { sop: [], deloviPogon: [], rn: [] };
  }

  const [sopRes, pogonRes, delRes, rnRes] = await Promise.all([
    supabase.from("sop_deo_varijabilni").select("*").in("id_deo", ids),
    supabase.from("delovi_atributivni_pogon").select("*").in("id_deo", ids),
    supabase.from("delovi").select("*").in("id_deo", ids),
    supabase.from("radni_nalozi").select("*").in("id_deo", ids),
  ]);

  for (const err of [sopRes.error, pogonRes.error, delRes.error, rnRes.error]) {
    if (err) throw err;
  }

  const deloviById = new Map((delRes.data || []).map((d) => [d.id_deo, d]));
  const postojeciDelovi = (pogonRes.data || []).map((p) => {
    const m = deloviById.get(p.id_deo) || {};
    return {
      id_deo: p.id_deo,
      pogon_kod: p.pogon_kod,
      radni_nalog: p.radni_nalog,
      naziv_dela: p.naziv_dela || m.naziv_dela,
      karakteristika: p.karakteristika || m.karakteristika,
      linija_id: p.linija_id ?? m.linija_id,
      masina_id: p.masina_id ?? m.masina_id,
      kom_za_kontrolu: p.kom_za_kontrolu ?? m.kom_za_kontrolu,
      slika_naziv: m.slika_naziv,
      napomena: p.napomena || m.napomena,
      tip_kontrole: m.tip_kontrole,
    };
  });

  return {
    sop: sopRes.data || [],
    deloviPogon: postojeciDelovi,
    rn: rnRes.data || [],
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string[]} idDeos — delovi iz uvezenih karakteristika
 * @param {{ karRows?: object[] }} [opts] — redovi sa meta kolonama (Definicija/CSV)
 */
export async function syncDerivedSifrarnikForDelove(supabase, idDeos, opts = {}) {
  const ids = [...new Set((idDeos || []).map((d) => String(d).trim().toUpperCase()).filter(Boolean))];
  if (!ids.length) return [];

  let karRows = opts.karRows;
  if (!karRows?.length) {
    const { data: karData, error: karErr } = await supabase
      .from("karakteristike_merljive")
      .select("*")
      .in("id_deo", ids);
    if (karErr) throw new Error(`karakteristike_merljive: ${karErr.message}`);
    karRows = karData || [];
  }
  if (!karRows.length) return [];

  const { sop, deloviPogon, rn } = await ucitajPostojeceZaDelove(supabase, ids);
  const gen = generisiIzKarakteristika(karRows, {
    postojeciSop: sop,
    postojeciDelovi: deloviPogon,
  });

  const noviRn = generisiRadniNaloge(karRows, {
    postojeciRn: rn,
    podrazumevano: {
      kolicina: 50,
      kupac: "Kupac",
      datum_unosa: new Date().toISOString().slice(0, 10),
      rok_isporuke: null,
      operater: "PERA OPERATER",
    },
  });

  const rnKeys = new Set([...rn, ...noviRn].map((r) => deoPogonKey(r.id_deo, r.pogon_kod)));
  let maxRnId = [...rn, ...noviRn].reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
  const rnIzSop = [];
  for (const s of gen.sopRows) {
    const key = deoPogonKey(s.id_deo, s.pogon_kod);
    if (rnKeys.has(key)) continue;
    rnKeys.add(key);
    maxRnId += 1;
    rnIzSop.push({
      id: maxRnId,
      broj_naloga: radniNalogIzDeoPogona(s.id_deo, s.pogon_kod) || s.radni_nalog,
      id_deo: s.id_deo,
      naziv_dela: s.naziv_dela || "",
      kolicina: 50,
      kupac: "Kupac",
      datum_unosa: new Date().toISOString().slice(0, 10),
      rok_isporuke: null,
      status: "aktivan",
      operater: "PERA OPERATER",
      napomena: null,
      pogon_kod: s.pogon_kod,
    });
  }

  const results = [];

  const deloviRows = gen.deloviPogonRows.map((p) => ({
    id_deo: p.id_deo,
    pogon_kod: p.pogon_kod,
    radni_nalog: p.radni_nalog,
    naziv_dela: p.naziv_dela,
    karakteristika: p.karakteristika,
    linija_id: p.linija_id,
    masina_id: p.masina_id,
    kom_za_kontrolu: p.kom_za_kontrolu,
    slika_naziv: p.slika_naziv,
    aktivan: p.aktivan !== false,
    napomena: p.napomena,
    tip_kontrole: p.tip_kontrole || "deo",
    vozilo_katalog_id: p.vozilo_katalog_id,
    greska_katalog_id: p.greska_katalog_id,
  }));

  const minimalMaster = minimalDeloviMasterIzKar(karRows);
  const { masterRows: masterFromPogon, pogonRows } = podeliDeloviUvoz(deloviRows);
  const mergedMaster = spojiMasterDelovi(spojiMasterDelovi(masterFromPogon, gen.masterRows), minimalMaster);

  // FK: sop_deo_varijabilni i karakteristike_merljive → delovi(id_deo) — prvo delovi
  if (mergedMaster.length || pogonRows.length) {
    const mCount = mergedMaster.length
      ? await upsertBatches(supabase, "delovi", mergedMaster, "id_deo")
      : 0;
    const pCount = pogonRows.length
      ? await upsertBatches(supabase, "delovi_atributivni_pogon", pogonRows, "id_deo,pogon_kod")
      : 0;
    results.push({
      sheet: "delovi (auto)",
      status: "ok",
      count: mCount + pCount,
    });
  }

  if (gen.sopRows.length) {
    const n = await upsertBatches(supabase, "sop_deo_varijabilni", gen.sopRows, "id_deo,pogon_kod");
    results.push({ sheet: "sop_deo_varijabilni (auto)", status: "ok", count: n });
  }

  const sviRn = [...noviRn, ...rnIzSop];
  if (sviRn.length) {
    const rnRows = sviRn.map((r) => ({
      broj_naloga: r.broj_naloga,
      id_deo: r.id_deo,
      naziv_dela: r.naziv_dela,
      kolicina: r.kolicina,
      kupac: r.kupac,
      datum_unosa: normalizujDatum(r.datum_unosa) ?? new Date().toISOString().slice(0, 10),
      rok_isporuke: normalizujDatum(r.rok_isporuke),
      status: r.status || "aktivan",
      operater: r.operater,
      napomena: r.napomena || null,
      pogon_kod: r.pogon_kod,
    }));
    const n = await upsertBatches(supabase, "radni_nalozi", rnRows, "broj_naloga");
    results.push({ sheet: "radni_nalozi (auto)", status: "ok", count: n });
  }

  return results;
}
