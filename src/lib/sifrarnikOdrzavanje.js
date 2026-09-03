/** Pregled i audit šifrarnika — duplikati, status dela. */
import { supabase } from "./supabaseClient.js";
import { fetchGlavniUnosBrojeviPoDeo, fetchGlavniUnosBrojZaDeo } from "./glavniUnosApi.js";
import { fetchDuplikatiIzMv, fetchKompletnostIzMv, fetchSpremniBatchIzMv, fetchDelimicniIzMv } from "./sifrarnikDeloviMv.js";
import { getSifrarnikAuditKorisnik } from "./sifrarnikAuditKorisnik.js";
import { deoPripadaLiniji, normalizujKodLinije, primeniFilterLinijeNaQuery } from "./linijaProizvoda.js";
import { GO_LIVE_RPC_PORUKA } from "./schemaCheck.js";

/** Maks. broj aktivnih delova u jednom skenu statusa (kompletnost, batch). */
export const SIFRARNIK_STATUS_SCAN_LIMIT = 2000;

function filtrirajPoLiniji(stavke, linijaKod) {
  const k = normalizujKodLinije(linijaKod);
  if (!k) return stavke || [];
  return (stavke || []).filter((s) => deoPripadaLiniji(s.deo || s, k));
}

async function filtrirajIdovePoLiniji(ids, linijaKod) {
  const k = normalizujKodLinije(linijaKod);
  if (!k || !ids?.length) return ids || [];
  const { data, error } = await supabase
    .from("delovi")
    .select("id_deo,vozilo_katalog_id,sifra_vozila")
    .in("id_deo", ids);
  if (error) throw error;
  const dozvoljeni = new Set(
    (data || []).filter((d) => deoPripadaLiniji(d, k)).map((d) => String(d.id_deo || "").trim().toUpperCase()),
  );
  return ids.filter((id) => dozvoljeni.has(String(id || "").trim().toUpperCase()));
}

async function countAktivnihDelova() {
  const { count, error } = await supabase
    .from("delovi")
    .select("*", { count: "exact", head: true })
    .eq("aktivan", true);
  if (error) throw error;
  return count || 0;
}

export function metaSkenaStatusa(skenirano, ukupnoAktivnih) {
  return {
    skenirano,
    ukupnoAktivnih,
    truncated: ukupnoAktivnih > skenirano,
    limit: SIFRARNIK_STATUS_SCAN_LIMIT,
  };
}

export async function fetchDuplikatiKarakteristike({ limit = 5000 } = {}) {
  const rpc = await fetchDuplikatiIzMv({ limit: Math.min(limit, 500) });
  if (rpc?.length) return rpc;

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

export async function fetchGreskeBrojZaDeo(idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return 0;
  const { count, error } = await supabase
    .from("greske_katalog")
    .select("*", { count: "exact", head: true })
    .eq("id_deo", id);
  if (error) throw error;
  return count || 0;
}

export async function fetchImaBarkodZaDeo(idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return false;
  const { count, error } = await supabase
    .from("barkod_profili")
    .select("*", { count: "exact", head: true })
    .eq("id_deo", id);
  if (error) {
    if (/does not exist|relation/i.test(error.message)) return false;
    throw error;
  }
  return (count || 0) > 0;
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

/** Filter po nedostajućem koraku (Delovi pregled). */
export const NEDOSTAJE_FILTER_OPCIJE = [
  { id: "", label: "Svi delovi" },
  { id: "gu", label: "Nedostaje GU" },
  { id: "greske", label: "Nedostaje greške" },
  { id: "crtez", label: "Nedostaje crtež" },
  { id: "barkod", label: "Nedostaje barkod" },
];

export const NEDOSTAJE_FILTER_MAP = {
  gu: "Glavni unos",
  greske: "Greške",
  crtez: "Crtež",
  barkod: "Barkod profil",
};

export function deoOdgovaraNedostajeFilter(deo, opts, filterKey) {
  const key = String(filterKey || "").trim();
  if (!key) return true;
  const label = NEDOSTAJE_FILTER_MAP[key];
  if (!label) return true;
  return nedostajeZaDeo(deo, opts).includes(label);
}

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

/** Normalizuje listu ID-eva dela na jedinstvene velike bez razmaka. */
function normalizujIdListu(idDeoLista) {
  return [...new Set(
    (idDeoLista || []).map((x) => String(x || "").trim().toUpperCase()).filter(Boolean),
  )];
}

/**
 * Broji zapise po delu preko RPC agregata (migracija 94).
 *
 * Fallback povlači redove i broji u JS-u — radi i pre nego što migracija
 * bude primenjena, ali je odsečen na limitu, pa se koristi samo kao rezerva.
 */
async function brojPoDelu({ rpc, tabela, ids }) {
  const { data, error } = await supabase.rpc(rpc, { p_ids: ids });
  if (!error) {
    const map = {};
    for (const r of data || []) {
      const id = String(r.id_deo || "").trim().toUpperCase();
      if (id) map[id] = Number(r.broj) || 0;
    }
    return map;
  }
  if (!/does not exist|not find|schema cache/i.test(error.message || "")) throw error;

  const LIMIT = 50000;
  const { data: redovi, error: e2 } = await supabase
    .from(tabela)
    .select("id_deo")
    .in("id_deo", ids)
    .limit(LIMIT);
  if (e2) {
    if (/does not exist|relation/i.test(e2.message)) return {};
    throw e2;
  }
  if ((redovi || []).length === LIMIT) {
    console.warn(`[sifrarnikOdrzavanje] ${tabela}: odsečeno na ${LIMIT} — primeni migraciju 94 za tačan broj.`);
  }

  const map = {};
  for (const r of redovi || []) {
    const id = String(r.id_deo || "").trim().toUpperCase();
    if (!id) continue;
    map[id] = (map[id] || 0) + 1;
  }
  return map;
}

export async function fetchMerenjaBrojeviPoDeo(idDeoLista) {
  const ids = normalizujIdListu(idDeoLista);
  if (!ids.length) return {};
  return brojPoDelu({ rpc: "broj_merenja_po_delu", tabela: "merenja_varijabilna", ids });
}

export async function fetchKontrolniLogBrojeviPoDeo(idDeoLista) {
  const ids = normalizujIdListu(idDeoLista);
  if (!ids.length) return {};
  return brojPoDelu({ rpc: "broj_kontrolni_log_po_delu", tabela: "kontrolni_log", ids });
}

/** Merenja + atributivni log po delu (upozorenje pre brisanja šifrarnika). */
export async function fetchOperativniBrojeviPoDeo(idDeoLista) {
  const ids = normalizujIdListu(idDeoLista);
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

/** Statistika kompletnosti aktivnih delova (za Održavanje / admin). */
export function izracunajKompletnostDelova(delovi, gu, gr, barkodSet) {
  const bk = barkodSet instanceof Set ? barkodSet : new Set(barkodSet || []);
  let kompletno = 0;
  let delimicno = 0;
  let samoMaster = 0;

  for (const d of delovi || []) {
    const id = String(d?.id_deo || "").trim().toUpperCase();
    const opts = {
      guBroj: gu[id] || gu[d?.id_deo] || 0,
      greskeBroj: gr[id] || gr[d?.id_deo] || 0,
      imaBarkod: bk.has(id),
    };
    const st = statusDeoUSifrarniku(d, opts);
    if (st === "kompletan") kompletno += 1;
    else if (st === "delimicno") delimicno += 1;
    else samoMaster += 1;
  }

  const ukupno = (delovi || []).length;
  const procenat = ukupno ? Math.round((kompletno / ukupno) * 100) : 100;
  return { ukupno, kompletno, delimicno, samoMaster, procenat };
}

export async function fetchKompletnostStatistika({ linijaKod = null } = {}) {
  const linija = normalizujKodLinije(linijaKod);
  if (!linija) {
    const mv = await fetchKompletnostIzMv();
    if (mv) return mv;
  }

  let q = supabase
    .from("delovi")
    .select("id_deo,slika_naziv,vozilo_katalog_id,sifra_vozila")
    .eq("aktivan", true)
    .limit(SIFRARNIK_STATUS_SCAN_LIMIT);
  q = primeniFilterLinijeNaQuery(q, linija);

  const [ukupnoAktivnih, deloviRes] = await Promise.all([
    (async () => {
      let cq = supabase.from("delovi").select("*", { count: "exact", head: true }).eq("aktivan", true);
      cq = primeniFilterLinijeNaQuery(cq, linija);
      const { count, error } = await cq;
      if (error) throw error;
      return count || 0;
    })(),
    q,
  ]);
  if (deloviRes.error) throw deloviRes.error;
  const delovi = deloviRes.data || [];

  const [gu, gr, bk] = await Promise.all([
    fetchGlavniUnosBrojeviPoDeo(),
    fetchGreskeBrojeviPoDeo(),
    fetchBarkodProfiliSet(),
  ]);

  return {
    ...izracunajKompletnostDelova(delovi, gu, gr, bk),
    ...metaSkenaStatusa(delovi.length, ukupnoAktivnih),
  };
}

/** Prvi aktivni deo koji nije kompletan — za „Nastavi checklist“ banner. */
export function pickPrviDelimicniDeo(delovi, gu, gr, barkodSet, { preskociIdDeo = null } = {}) {
  const bk = barkodSet instanceof Set ? barkodSet : new Set(barkodSet || []);
  const preskoci = String(preskociIdDeo || "").trim().toUpperCase();
  const sorted = [...(delovi || [])].sort((a, b) =>
    String(a.id_deo || "").localeCompare(String(b.id_deo || "")),
  );

  for (const d of sorted) {
    const id = String(d?.id_deo || "").trim().toUpperCase();
    if (preskoci && id === preskoci) continue;
    const opts = {
      guBroj: gu[id] || gu[d?.id_deo] || 0,
      greskeBroj: gr[id] || gr[d?.id_deo] || 0,
      imaBarkod: bk.has(id),
    };
    const status = statusDeoUSifrarniku(d, opts);
    if (status === "kompletan") continue;
    return {
      deo: d,
      status,
      opts,
      koraci: koraciNavigacijeIzStatusDeo(d, opts),
      nedostaje: nedostajeZaDeo(d, opts),
    };
  }
  return null;
}

export async function fetchAktivniDeloviSaStatusom({ linijaKod = null } = {}) {
  const linija = normalizujKodLinije(linijaKod);
  let q = supabase
    .from("delovi")
    .select("id_deo,naziv_dela,slika_naziv,aktivan,vozilo_katalog_id,sifra_vozila")
    .eq("aktivan", true)
    .limit(SIFRARNIK_STATUS_SCAN_LIMIT);
  q = primeniFilterLinijeNaQuery(q, linija);

  const [ukupnoAktivnih, deloviRes] = await Promise.all([
    (async () => {
      let cq = supabase.from("delovi").select("*", { count: "exact", head: true }).eq("aktivan", true);
      cq = primeniFilterLinijeNaQuery(cq, linija);
      const { count, error } = await cq;
      if (error) throw error;
      return count || 0;
    })(),
    q,
  ]);
  if (deloviRes.error) throw deloviRes.error;
  const delovi = deloviRes.data || [];

  const [gu, gr, bk] = await Promise.all([
    fetchGlavniUnosBrojeviPoDeo(),
    fetchGreskeBrojeviPoDeo(),
    fetchBarkodProfiliSet(),
  ]);

  const stavke = delovi.map((d) => {
    const id = String(d?.id_deo || "").trim().toUpperCase();
    const opts = {
      guBroj: gu[id] || gu[d?.id_deo] || 0,
      greskeBroj: gr[id] || gr[d?.id_deo] || 0,
      imaBarkod: bk.has(id),
    };
    const status = statusDeoUSifrarniku(d, opts);
    return {
      deo: d,
      status,
      opts,
      nedostaje: nedostajeZaDeo(d, opts),
      koraci: koraciNavigacijeIzStatusDeo(d, opts),
    };
  });

  return { stavke, ...metaSkenaStatusa(delovi.length, ukupnoAktivnih) };
}

/** GU + greške + crtež — spreman za batch propagaciju. */
export function jeSpremanZaBatchObjavu(deo, { guBroj = 0, greskeBroj = 0 } = {}) {
  return (guBroj > 0)
    && (greskeBroj > 0)
    && !!String(deo?.slika_naziv || "").trim();
}

export async function fetchNastaviChecklist({ preskociIdDeo = null, linijaKod = null } = {}) {
  const delimicni = await fetchDelimicniDeloviSvi({ linijaKod });
  return nastaviChecklistIzDelimicnih(delimicni, { preskociIdDeo });
}

/** Pura logika — prvi delimični + redni broj u queue-u. */
export function nastaviChecklistIzDelimicnih(delimicni, { preskociIdDeo = null } = {}) {
  if (!delimicni?.length) return null;

  const preskoci = String(preskociIdDeo || "").trim().toUpperCase();
  const stavka = preskoci
    ? delimicni.find(({ deo }) => String(deo?.id_deo || "").trim().toUpperCase() !== preskoci)
    : delimicni[0];
  if (!stavka) return null;

  const id = String(stavka.deo?.id_deo || "").trim().toUpperCase();
  const redniBroj = delimicni.findIndex(
    ({ deo }) => String(deo?.id_deo || "").trim().toUpperCase() === id,
  ) + 1;

  return {
    ...stavka,
    redniBroj,
    ukupnoDelimicnih: delimicni.length,
  };
}

export async function fetchDelimicniDeloviSvi({ maxScan = 15000, linijaKod = null } = {}) {
  const linija = normalizujKodLinije(linijaKod);
  const rez = [];
  let offset = 0;
  const batch = 500;
  let mvOk = false;
  while (offset < maxScan) {
    const chunk = await fetchDelimicniIzMv({ limit: batch, offset });
    if (chunk == null) break;
    mvOk = true;
    if (chunk.length) {
      rez.push(...filtrirajPoLiniji(chunk, linija));
      if (chunk.length < batch) break;
      offset += batch;
      continue;
    }
    break;
  }
  if (mvOk) return rez;

  const [gu, gr, bk] = await Promise.all([
    fetchGlavniUnosBrojeviPoDeo(),
    fetchGreskeBrojeviPoDeo(),
    fetchBarkodProfiliSet(),
  ]);

  const legacy = [];
  let legacyOffset = 0;

  while (legacyOffset < maxScan) {
    let q = supabase
      .from("delovi")
      .select("id_deo,naziv_dela,slika_naziv,aktivan,vozilo_katalog_id,sifra_vozila")
      .eq("aktivan", true)
      .order("id_deo")
      .range(legacyOffset, legacyOffset + batch - 1);
    q = primeniFilterLinijeNaQuery(q, linija);
    const { data, error } = await q;
    if (error) throw error;
    const delovi = data || [];
    if (!delovi.length) break;

    for (const d of delovi) {
      const id = String(d?.id_deo || "").trim().toUpperCase();
      const opts = {
        guBroj: gu[id] || 0,
        greskeBroj: gr[id] || 0,
        imaBarkod: bk.has(id),
      };
      const status = statusDeoUSifrarniku(d, opts);
      if (status === "kompletan") continue;
      legacy.push({
        deo: d,
        status,
        opts,
        nedostaje: nedostajeZaDeo(d, opts),
        koraci: koraciNavigacijeIzStatusDeo(d, opts),
      });
    }

    legacyOffset += delovi.length;
    if (delovi.length < batch) break;
  }

  return legacy.sort((a, b) => a.deo.id_deo.localeCompare(b.deo.id_deo));
}

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** CSV izveštaj delimičnih delova (preuzimanje u browseru). */
export function delimicniDeloviUCsv(stavke) {
  const header = ["id_deo", "naziv", "status", "nedostaje"].join(",");
  const redovi = (stavke || []).map(({ deo, status, nedostaje }) => [
    csvEscape(deo?.id_deo),
    csvEscape(deo?.naziv_dela),
    csvEscape(STATUS_DEO_LABEL[status]?.label || status),
    csvEscape((nedostaje || []).join("; ")),
  ].join(","));
  return `\uFEFF${[header, ...redovi].join("\n")}`;
}

export function preuzmiDelimicniCsv(stavke, { imeFajla } = {}) {
  const csv = delimicniDeloviUCsv(stavke);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = imeFajla || `sifrarnik_delimicni_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Globalna pretraga — navigacija za ID dela. */
export async function navigacijaZaIdDeo(idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return null;

  const { data: deo, error } = await supabase
    .from("delovi")
    .select("id_deo,naziv_dela,slika_naziv,aktivan,vozilo_katalog_id,sifra_vozila")
    .eq("id_deo", id)
    .maybeSingle();
  if (error) throw error;
  if (!deo) return { pronadjen: false, idDeo: id };

  const [guBroj, greskeBroj, imaBarkod] = await Promise.all([
    fetchGlavniUnosBrojZaDeo(id),
    fetchGreskeBrojZaDeo(id),
    fetchImaBarkodZaDeo(id),
  ]);
  const opts = { guBroj, greskeBroj, imaBarkod };
  const status = statusDeoUSifrarniku(deo, opts);
  const nav = navigacijaIzStatusDeo(deo, opts);
  return {
    pronadjen: true,
    deo,
    status,
    opts,
    nav,
    koraci: koraciNavigacijeIzStatusDeo(deo, opts),
    nedostaje: nedostajeZaDeo(deo, opts),
  };
}

/** Aktivni delovi bez redova u Glavnom unosu (posle ERP uvoza). */
export async function fetchDeloviBezGlavnogUnosa({ limit = 500 } = {}) {
  const { data: delovi, error } = await supabase
    .from("delovi")
    .select("id_deo")
    .eq("aktivan", true)
    .limit(limit);
  if (error) throw error;

  const gu = await fetchGlavniUnosBrojeviPoDeo();
  const ids = (delovi || [])
    .map((d) => String(d.id_deo || "").trim().toUpperCase())
    .filter((id) => id && !(gu[id] > 0));

  return { broj: ids.length, primer: ids.slice(0, 8), ids };
}

/** Delovi sa statusom ≠ kompletan (pregled u Održavanju). */
export async function fetchDelimicniDeloviPreview({ limit = 12, linijaKod = null } = {}) {
  const linija = normalizujKodLinije(linijaKod);
  let q = supabase
    .from("delovi")
    .select("id_deo,naziv_dela,slika_naziv,aktivan,vozilo_katalog_id,sifra_vozila")
    .eq("aktivan", true)
    .limit(linija ? 800 : 400);
  q = primeniFilterLinijeNaQuery(q, linija);
  const { data: delovi, error } = await q;
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
    rez.push({
      deo: d,
      opts,
      status: st,
      nedostaje: nedostajeZaDeo(d, opts),
      koraci: koraciNavigacijeIzStatusDeo(d, opts),
    });
    if (rez.length >= limit) break;
  }
  return rez.sort((a, b) => a.deo.id_deo.localeCompare(b.deo.id_deo));
}

export { filtrirajIdovePoLiniji };

const DEMO_ID_RE = /^(DEMO|TEST|SAMPLE|XXX)[-_]/i;

export function jeDemoIdDeo(idDeo) {
  return DEMO_ID_RE.test(String(idDeo || "").trim());
}

function rpcNedostaje(error) {
  return error && /function.*does not exist|could not find/i.test(error.message);
}

/** Greška brisanja kada deo ima povezane (operativne) unose. */
export class ZavisnostiDelaError extends Error {
  constructor(poruka, { idDeo, blokade } = {}) {
    super(poruka);
    this.name = "ZavisnostiDelaError";
    this.kod = "zavisnosti";
    this.idDeo = idDeo;
    this.blokade = blokade || [];
  }
}

/**
 * Briše deo i povezane šifrarnik redove.
 * Bez `saOperativom` RPC odbija brisanje ako postoje operativni unosi (merenja,
 * kontrolni_log…) umesto da padne na foreign key violation.
 * Zahteva migraciju 88+ (klijentski fallback je ukinut zbog uloga/kaskade).
 */
export async function obrisiDeoIzSifrarnika(idDeo, { saOperativom = false } = {}) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) throw new Error("ID dela je obavezan");

  const { data: rpcData, error: rpcErr } = await supabase.rpc("obrisi_deo_iz_sifrarnika", {
    p_id_deo: id,
    p_potvrdi: "OBRISI_DEO",
    p_sa_operativom: saOperativom,
  });
  if (!rpcErr && rpcData?.ok) {
    // DB trigger (91) već piše audit — ne dupliramo semantički log.
    return { idDeo: id, rpc: true, obrisano: rpcData.obrisano || {} };
  }
  if (!rpcErr && rpcData && rpcData.ok === false) {
    if (rpcData.kod === "zavisnosti") {
      throw new ZavisnostiDelaError(rpcData.poruka || `Deo ${id} ima povezane unose`, {
        idDeo: id,
        blokade: rpcData.blokade,
      });
    }
    throw new Error(rpcData.poruka || `Brisanje dela ${id} odbijeno`);
  }
  if (rpcErr && rpcNedostaje(rpcErr)) {
    throw new Error(`${GO_LIVE_RPC_PORUKA} (brisanje: 88 + 95_obrisi_deo_eskalacije_fk.sql)`);
  }
  throw rpcErr || new Error(`Brisanje dela ${id} nije uspelo`);
}

/** Meko brisanje — deo ostaje u bazi, izlazi iz aktivnog šifrarnika. */
export async function arhivirajDeo(idDeo, { razlog = "", korisnik = "" } = {}) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) throw new Error("ID dela je obavezan");

  const { data, error } = await supabase.rpc("arhiviraj_deo", {
    p_id_deo: id,
    p_razlog: razlog || null,
    p_korisnik: korisnik || getSifrarnikAuditKorisnik() || null,
  });
  if (!error) {
    if (data && data.ok === false) throw new Error(data.poruka || `Arhiviranje dela ${id} odbijeno`);
    return { idDeo: id, arhiviran: true };
  }
  if (rpcNedostaje(error)) {
    throw new Error(`${GO_LIVE_RPC_PORUKA} (arhiva: 91/92)`);
  }
  throw error;
}

export async function vratiDeoIzArhive(idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) throw new Error("ID dela je obavezan");

  const { data, error } = await supabase.rpc("vrati_deo_iz_arhive", { p_id_deo: id });
  if (!error) {
    if (data && data.ok === false) throw new Error(data.poruka || `Vraćanje dela ${id} odbijeno`);
    return { idDeo: id, arhiviran: false };
  }
  if (rpcNedostaje(error)) {
    throw new Error(`${GO_LIVE_RPC_PORUKA} (arhiva: 91/92)`);
  }
  throw error;
}

/** Gde se deo koristi — broj redova po tabeli sa stranim ključem na `delovi`. */
export async function fetchZavisnostiDela(idDeo) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (!id) return [];

  const { data, error } = await supabase.rpc("deo_zavisnosti", { p_id_deo: id });
  if (error) {
    if (rpcNedostaje(error)) return null;
    throw error;
  }
  return (data || []).map((r) => ({
    tabela: r.tabela,
    kolona: r.kolona,
    redova: Number(r.redova) || 0,
    kaskadno: !!r.kaskadno,
  }));
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
  if (bulkErr && rpcNedostaje(bulkErr)) {
    throw new Error(`${GO_LIVE_RPC_PORUKA} (demo bulk: 79/88)`);
  }
  if (bulkErr) throw bulkErr;
  throw new Error("Bulk brisanje demo delova nije uspelo");
}
