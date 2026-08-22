/** Pregled i audit šifrarnika — duplikati, status dela. */
import { supabase } from "./supabaseClient.js";
import { fetchGlavniUnosBrojeviPoDeo } from "./glavniUnosApi.js";

export async function fetchDuplikatiKarakteristike({ limit = 5000 } = {}) {
  const { data, error } = await supabase
    .from("karakteristike_merljive")
    .select("id, id_deo, pogon_kod, pozicija, sifra_merenja, naziv_mere")
    .limit(limit);
  if (error) throw error;

  const grupe = new Map();
  for (const r of data || []) {
    const idDeo = String(r.id_deo || "").trim().toUpperCase();
    const pogon = String(r.pogon_kod || "").trim().toUpperCase();
    const poz = String(r.pozicija || r.sifra_merenja || "").trim().toUpperCase();
    if (!idDeo || !pogon || !poz) continue;
    const kljuc = `${idDeo}|${pogon}|${poz}`;
    if (!grupe.has(kljuc)) grupe.set(kljuc, []);
    grupe.get(kljuc).push(r);
  }

  return [...grupe.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([kljuc, rows]) => {
      const [idDeo, pogon, poz] = kljuc.split("|");
      return { idDeo, pogon, pozicija: poz, broj: rows.length, ids: rows.map((x) => x.id) };
    })
    .sort((a, b) => b.broj - a.broj || a.idDeo.localeCompare(b.idDeo));
}

export async function fetchGreskeBrojeviPoDeo() {
  const { data, error } = await supabase.from("greske_katalog").select("id_deo").limit(20000);
  if (error) throw error;
  const map = {};
  for (const r of data || []) {
    const id = String(r.id_deo || "").trim().toUpperCase();
    if (!id) continue;
    map[id] = (map[id] || 0) + 1;
  }
  return map;
}

export async function fetchBarkodProfiliSet() {
  const { data, error } = await supabase.from("barkod_profili").select("id_deo").limit(10000);
  if (error) {
    if (/does not exist|relation/i.test(error.message)) return new Set();
    throw error;
  }
  return new Set((data || []).map((r) => String(r.id_deo || "").trim().toUpperCase()).filter(Boolean));
}

/** @returns {'kompletan'|'delimicno'|'samo_master'} */
export function statusDeoUSifrarniku(deo, { guBroj = 0, greskeBroj = 0, imaBarkod = false } = {}) {
  const id = String(deo?.id_deo || "").trim();
  if (!id) return "samo_master";
  const imaCrtez = !!String(deo?.slika_naziv || "").trim();
  const imaGu = guBroj > 0;
  const imaGreske = greskeBroj > 0;
  const atrOk = imaGreske && imaCrtez;
  const barkodOk = imaBarkod;
  if (atrOk && (imaGu || barkodOk)) return "kompletan";
  if (imaGu || imaGreske || imaCrtez) return "delimicno";
  return "samo_master";
}

/** Lista stavki koje nedostaju za kompletan šifrarnik (za tooltip). */
export function nedostajeZaDeo(deo, { guBroj = 0, greskeBroj = 0, imaBarkod = false } = {}) {
  const ned = [];
  if (!(guBroj > 0)) ned.push("Glavni unos");
  if (!(greskeBroj > 0)) ned.push("Greške");
  if (!String(deo?.slika_naziv || "").trim()) ned.push("Crtež");
  const st = statusDeoUSifrarniku(deo, { guBroj, greskeBroj, imaBarkod });
  if (st !== "kompletan" && !imaBarkod && guBroj > 0) ned.push("Barkod profil");
  return ned;
}

export function tooltipStatusDeo(deo, opts) {
  const st = statusDeoUSifrarniku(deo, opts);
  if (st === "kompletan") return "Kompletan: GU + greške + crtež + (GU ili barkod)";
  const ned = nedostajeZaDeo(deo, opts);
  if (ned.length) return `Nedostaje: ${ned.join(", ")}`;
  return STATUS_DEO_LABEL[st]?.label || st;
}

export const STATUS_DEO_LABEL = {
  kompletan: { label: "Kompletan", boja: "zelena" },
  delimicno: { label: "Delimično", boja: "narandzasta" },
  samo_master: { label: "Samo master", boja: "sivi" },
};

const MAPA_NEDOSTAJE_TAB = {
  "Glavni unos": (idDeo, opts) => ({
    tab: "glavni_unos",
    ctx: { idDeo, otvoriWizard: !(opts.guBroj > 0) },
  }),
  "Greške": (idDeo) => ({ tab: "greske", ctx: { idDeo } }),
  "Crtež": (idDeo) => ({ tab: "delovi_atr", ctx: { idDeo, otvoriCrtezForm: true } }),
  "Barkod profil": (idDeo) => ({ tab: "barkod", ctx: { idDeo } }),
};

/** Svi koraci navigacije za status badge (meni ili prvi klik). */
export function koraciNavigacijeIzStatusDeo(deo, opts = {}) {
  const idDeo = String(deo?.id_deo || "").trim();
  if (!idDeo) return [];

  const st = statusDeoUSifrarniku(deo, opts);
  if (st === "kompletan") {
    return [{ label: "Glavni unos", tab: "glavni_unos", ctx: { idDeo } }];
  }

  return nedostajeZaDeo(deo, opts)
    .filter((n) => MAPA_NEDOSTAJE_TAB[n])
    .map((n) => {
      const { tab, ctx } = MAPA_NEDOSTAJE_TAB[n](idDeo, opts);
      return { label: n, tab, ctx: { ...ctx, idDeo } };
    });
}

/** Prvi nedostajući korak za status badge — klik vodi u odgovarajući tab. */
export function navigacijaIzStatusDeo(deo, opts = {}) {
  const koraci = koraciNavigacijeIzStatusDeo(deo, opts);
  const prvi = koraci[0];
  if (!prvi) return null;
  return { tab: prvi.tab, ctx: prvi.ctx };
}

export async function fetchMerenjaBrojeviPoDeo(idDeoLista) {
  const ids = [...new Set((idDeoLista || []).map((x) => String(x || "").trim().toUpperCase()).filter(Boolean))];
  if (!ids.length) return {};

  const { data, error } = await supabase
    .from("merenja_varijabilna")
    .select("id_deo")
    .in("id_deo", ids)
    .limit(50000);
  if (error) {
    if (/does not exist|relation/i.test(error.message)) return {};
    throw error;
  }

  const map = {};
  for (const r of data || []) {
    const id = String(r.id_deo || "").trim().toUpperCase();
    if (!id) continue;
    map[id] = (map[id] || 0) + 1;
  }
  return map;
}

export async function fetchKontrolniLogBrojeviPoDeo(idDeoLista) {
  const ids = [...new Set((idDeoLista || []).map((x) => String(x || "").trim().toUpperCase()).filter(Boolean))];
  if (!ids.length) return {};

  const { data, error } = await supabase
    .from("kontrolni_log")
    .select("id_deo")
    .in("id_deo", ids)
    .limit(50000);
  if (error) {
    if (/does not exist|relation/i.test(error.message)) return {};
    throw error;
  }

  const map = {};
  for (const r of data || []) {
    const id = String(r.id_deo || "").trim().toUpperCase();
    if (!id) continue;
    map[id] = (map[id] || 0) + 1;
  }
  return map;
}

/** Merenja + atributivni log po delu (upozorenje pre brisanja šifrarnika). */
export async function fetchOperativniBrojeviPoDeo(idDeoLista) {
  const ids = [...new Set((idDeoLista || []).map((x) => String(x || "").trim().toUpperCase()).filter(Boolean))];
  if (!ids.length) return {};

  const [merenja, log] = await Promise.all([
    fetchMerenjaBrojeviPoDeo(ids),
    fetchKontrolniLogBrojeviPoDeo(ids),
  ]);

  const map = {};
  for (const id of ids) {
    const u = String(id).toUpperCase();
    const m = merenja[u] || 0;
    const l = log[u] || 0;
    if (m || l) map[u] = { merenja: m, log: l, ukupno: m + l };
  }
  return map;
}

/** Delovi sa statusom ≠ kompletan (pregled u Održavanju). */
export async function fetchDelimicniDeloviPreview({ limit = 12 } = {}) {
  const { data: delovi, error } = await supabase
    .from("delovi")
    .select("id_deo,naziv_dela,slika_naziv,aktivan")
    .eq("aktivan", true)
    .limit(400);
  if (error) throw error;

  const [gu, gr, bk] = await Promise.all([
    fetchGlavniUnosBrojeviPoDeo(),
    fetchGreskeBrojeviPoDeo(),
    fetchBarkodProfiliSet(),
  ]);

  const rez = [];
  for (const d of delovi || []) {
    const opts = {
      guBroj: gu[d.id_deo] || 0,
      greskeBroj: gr[d.id_deo] || 0,
      imaBarkod: bk.has(String(d.id_deo || "").toUpperCase()),
    };
    const st = statusDeoUSifrarniku(d, opts);
    if (st === "kompletan") continue;
    rez.push({ deo: d, opts, status: st, koraci: koraciNavigacijeIzStatusDeo(d, opts) });
    if (rez.length >= limit) break;
  }
  return rez.sort((a, b) => a.deo.id_deo.localeCompare(b.deo.id_deo));
}

const DEMO_ID_RE = /^(DEMO|TEST|SAMPLE|XXX)[-_]/i;

export function jeDemoIdDeo(idDeo) {
  return DEMO_ID_RE.test(String(idDeo || "").trim());
}

async function obrisiPoIdDeo(tabela, idDeo) {
  const { error } = await supabase.from(tabela).delete().eq("id_deo", idDeo);
  if (error && !/does not exist|relation/i.test(error.message)) throw error;
}

function rpcNedostaje(error) {
  return error && /function.*does not exist|could not find/i.test(error.message);
}

/** Briše deo i povezane šifrarnik redove (ne merenja — operativa ostaje). */
export async function obrisiDeoIzSifrarnika(idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) throw new Error("ID dela je obavezan");

  const { data: rpcData, error: rpcErr } = await supabase.rpc("obrisi_deo_iz_sifrarnika", {
    p_id_deo: id,
    p_potvrdi: "OBRISI_DEO",
  });
  if (!rpcErr && rpcData?.ok) return { idDeo: id, rpc: true };
  if (rpcErr && !rpcNedostaje(rpcErr)) throw rpcErr;

  await obrisiPoIdDeo("glavni_unos_redovi", id);
  await obrisiPoIdDeo("greske_katalog", id);
  await obrisiPoIdDeo("karakteristike_merljive", id);
  await obrisiPoIdDeo("sop_deo_varijabilni", id);
  await obrisiPoIdDeo("delovi_atributivni_pogon", id);
  await obrisiPoIdDeo("barkod_profili", id);
  await obrisiPoIdDeo("radni_nalozi", id);
  await obrisiPoIdDeo("ciljevi", id);
  const { error } = await supabase.from("delovi").delete().eq("id_deo", id);
  if (error) throw error;
  return { idDeo: id };
}

/** Bulk brisanje — samo DEMO/TEST/SAMPLE/XXX prefiks. */
export async function obrisiDemoDelove(idDeoLista) {
  const ids = [...new Set((idDeoLista || []).map((x) => String(x || "").trim().toUpperCase()).filter(Boolean))];
  const neDemo = ids.filter((id) => !jeDemoIdDeo(id));
  if (neDemo.length) {
    throw new Error(`Dozvoljeno samo DEMO/TEST ID. Odbijeno: ${neDemo.slice(0, 5).join(", ")}`);
  }

  const { data: bulk, error: bulkErr } = await supabase.rpc("obrisi_demo_delove_iz_sifrarnika", {
    p_id_deo_list: ids,
    p_potvrdi: "OBRISI_DEMO",
  });
  if (!bulkErr && bulk?.ok) {
    return { obrisano: bulk.obrisano ?? ids.length, ids: bulk.ids || ids };
  }
  if (!bulkErr && bulk && bulk.ok === false) {
    throw new Error(bulk.poruka || "Bulk brisanje demo delova odbijeno");
  }
  if (bulkErr && !rpcNedostaje(bulkErr)) {
    throw bulkErr;
  }

  const rez = [];
  for (const id of ids) {
    rez.push(await obrisiDeoIzSifrarnika(id));
  }
  return { obrisano: rez.length, ids: rez.map((r) => r.idDeo) };
}
