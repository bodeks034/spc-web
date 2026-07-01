import { supabase } from "./supabaseClient.js";
import { fetchPogonLinijaMapa } from "./glavniUnosApi.js";
import { LINIJA_FAZA_POGON_DEFAULT } from "./pogonLinijaLookup.js";
import listeSeed from "../data/sifrarnikListeSeed.json";

/** Jedinstveni ključ — bez obzira na velika/mala slova, razmake i dijakritike. */
export function normalizujLinijuKljuč(naziv) {
  return String(naziv || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function ocistiNaziv(naziv) {
  return String(naziv || "").trim().replace(/\s+/g, " ");
}

/** Preferiraj kanonski naziv (sa dijakritikom iz seed-a ako postoji). */
function kanonskiNaziv(kljuc, predlog) {
  const seedKeys = Object.keys(listeSeed?.linija_operacija || {});
  for (const k of seedKeys) {
    if (normalizujLinijuKljuč(k) === kljuc) return k;
  }
  for (const k of Object.keys(LINIJA_FAZA_POGON_DEFAULT)) {
    if (normalizujLinijuKljuč(k) === kljuc) return k;
  }
  return predlog;
}

/**
 * Jedna linija po ključu — spaja Preseraj/Preseraj , Montaža/Montaza, itd.
 * @returns Map<kljuc, { naziv, id }>
 */
function mapaJedinstvenihLinija() {
  return new Map();
}

function dodajLiniju(mapa, naziv, id = null) {
  const ociscen = ocistiNaziv(naziv);
  if (!ociscen) return;
  const kljuc = normalizujLinijuKljuč(ociscen);
  const postojeci = mapa.get(kljuc);
  if (!postojeci) {
    mapa.set(kljuc, {
      naziv: kanonskiNaziv(kljuc, ociscen),
      id: id != null ? String(id) : null,
    });
    return;
  }
  if (id != null && !postojeci.id) postojeci.id = String(id);
}

function vrednost(res) {
  if (!res || res.error) return [];
  return res.data || [];
}

function sortirajLinije(mapa) {
  return [...mapa.values()].sort((a, b) =>
    a.naziv.localeCompare(b.naziv, "sr"),
  );
}

/**
 * Distinct linije/faze za filter Modula 2.
 * Iz tabele linije uzima samo jedinstvene nazive kolone `linija` (ne po operaciji).
 */
export async function fetchLinijeZaAnalitikuFilter() {
  const mapa = mapaJedinstvenihLinija();

  const [linijeRes, pogonRows, karRes, merRes, masRes, deloviRes] = await Promise.all([
    supabase.from("linije").select("id,linija").order("linija"),
    fetchPogonLinijaMapa().catch(() => []),
    supabase.from("karakteristike_merljive").select("linija_faza").limit(5000),
    supabase.from("merenja_varijabilna").select("linija").not("linija", "is", null).limit(5000),
    supabase.from("masine").select("linija").not("linija", "is", null),
    supabase.from("delovi").select("linija_id, linija:linije(linija)").not("linija_id", "is", null),
  ]);

  const linijeRows = vrednost(linijeRes);
  const idPoKljucu = new Map();
  for (const r of linijeRows) {
    const kljuc = normalizujLinijuKljuč(r.linija);
    if (kljuc && !idPoKljucu.has(kljuc)) idPoKljucu.set(kljuc, r.id);
  }

  for (const r of linijeRows) {
    const kljuc = normalizujLinijuKljuč(r.linija);
    dodajLiniju(mapa, r.linija, idPoKljucu.get(kljuc));
  }
  for (const r of pogonRows || []) dodajLiniju(mapa, r.linija_faza);
  for (const r of vrednost(karRes)) dodajLiniju(mapa, r.linija_faza);
  for (const r of vrednost(merRes)) dodajLiniju(mapa, r.linija);
  for (const r of vrednost(masRes)) dodajLiniju(mapa, r.linija);
  for (const r of vrednost(deloviRes)) dodajLiniju(mapa, r.linija?.linija);
  for (const k of Object.keys(LINIJA_FAZA_POGON_DEFAULT)) dodajLiniju(mapa, k);
  for (const k of Object.keys(listeSeed?.linija_operacija || {})) dodajLiniju(mapa, k);

  return sortirajLinije(mapa).map(({ naziv, id }) => ({
    naziv,
    id: id || naziv,
  }));
}

function linijaSePoklapa(a, b) {
  return normalizujLinijuKljuč(a) === normalizujLinijuKljuč(b);
}

/** ID delova povezanih sa izabranom linijom/fazom (za filtriranje analitike). */
export async function idDeloviZaLinijuFilter(linijaNaziv) {
  const ln = ocistiNaziv(linijaNaziv);
  if (!ln) return null;

  const ids = new Set();

  const [deloviRes, karRes, linijeRes] = await Promise.all([
    supabase.from("delovi").select("id_deo, linija_id, linija:linije(linija)").eq("aktivan", true),
    supabase.from("karakteristike_merljive").select("id_deo, linija_faza").limit(5000),
    supabase.from("linije").select("id, linija"),
  ]);

  const poklapanjeLinija = (naziv) => linijaSePoklapa(naziv, ln);
  const linijaIds = new Set(
    (linijeRes.data || []).filter((r) => poklapanjeLinija(r.linija)).map((r) => r.id),
  );

  for (const d of deloviRes.data || []) {
    const naziv = d.linija?.linija;
    if (d.linija_id != null && linijaIds.has(d.linija_id) && d.id_deo) {
      ids.add(String(d.id_deo).toUpperCase());
    }
    if (naziv && poklapanjeLinija(naziv) && d.id_deo) {
      ids.add(String(d.id_deo).toUpperCase());
    }
  }
  for (const k of karRes.data || []) {
    if (k.linija_faza && poklapanjeLinija(k.linija_faza) && k.id_deo) {
      ids.add(String(k.id_deo).toUpperCase());
    }
  }

  return ids.size ? [...ids] : null;
}

export function merenjeNaLiniji(merenje, linijaNaziv) {
  if (!String(linijaNaziv || "").trim()) return true;
  return linijaSePoklapa(merenje?.linija, linijaNaziv);
}
