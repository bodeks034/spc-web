import { supabase } from "./supabaseClient.js";
import { fetchZajednickiDashboard } from "./zajednickiDashboard.js";
import { queueCounts, loadQueue, ensureQueueReady } from "./offlineQueue.js";

/**
 * Deljeni izvor podataka za dashboard.
 *
 * Ranije je svaka komponenta (ZajednickiDashboard, AnalitikaPregledKpi,
 * AnalitikaMiniKpi, SefSmenaDashboard) radila svoj set upita i držala svoj
 * realtime kanal — na jednom ekranu do pet paralelnih učitavanja. Ovde je
 * jedan keš po kombinaciji filtera i jedan realtime kanal za sve.
 */

const REALTIME_DEBOUNCE_MS = 8000;
const STALE_MS = 30000;

const unosi = new Map();
const slusaoci = new Set();
let kanal = null;
let debounceTimer = null;

function kljucFiltera(p = {}) {
  return JSON.stringify({
    period: Number(p.period || 7),
    idDeo: String(p.idDeo || "").trim().toUpperCase() || null,
    linija: String(p.linija || "").trim() || null,
    smena: p.smena === "" || p.smena == null ? null : Number(p.smena),
  });
}

function prazanUnos() {
  return { podaci: null, greska: null, loading: false, vreme: 0, promise: null };
}

function dohvatiUnos(kljuc) {
  let u = unosi.get(kljuc);
  if (!u) {
    u = prazanUnos();
    unosi.set(kljuc, u);
  }
  return u;
}

function obavesti() {
  slusaoci.forEach((fn) => fn());
}

async function ucitajZaKljuc(kljuc, { force = false } = {}) {
  const u = dohvatiUnos(kljuc);
  if (u.promise) return u.promise;
  if (!force && u.podaci && Date.now() - u.vreme < STALE_MS) return u.podaci;

  const filter = JSON.parse(kljuc);
  u.loading = true;
  obavesti();

  u.promise = (async () => {
    try {
      await ensureQueueReady();
      const offline = queueCounts(loadQueue());
      const d = await fetchZajednickiDashboard(supabase, {
        period: filter.period,
        offlinePaketi: offline.total,
        idDeo: filter.idDeo || undefined,
        linija: filter.linija || undefined,
        smena: filter.smena == null ? undefined : filter.smena,
      });
      u.podaci = d;
      u.greska = null;
      u.vreme = Date.now();
      return d;
    } catch (e) {
      // Stari podaci se namerno zadržavaju — bolje bajato nego prazan ekran.
      u.greska = e?.message || "Greška pri učitavanju dashboarda";
      throw e;
    } finally {
      u.loading = false;
      u.promise = null;
      obavesti();
    }
  })();

  return u.promise;
}

function osveziSve() {
  const kljucevi = [...unosi.keys()];
  kljucevi.forEach((k) => { ucitajZaKljuc(k, { force: true }).catch(() => {}); });
}

/** Realtime promene se grupišu — inače svaki unos u smeni okine pun reload. */
function zakaziOsvezavanje() {
  if (debounceTimer) return;
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    osveziSve();
  }, REALTIME_DEBOUNCE_MS);
}

function pretplatiKanal() {
  if (kanal) return;
  kanal = supabase.channel("dashboard_deljeni")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "kontrolni_log" }, zakaziOsvezavanje)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "merenja_varijabilna" }, zakaziOsvezavanje)
    .subscribe();
}

function otkaziKanal() {
  if (!kanal) return;
  supabase.removeChannel(kanal);
  kanal = null;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

export function pretplati(fn) {
  slusaoci.add(fn);
  pretplatiKanal();
  return () => {
    slusaoci.delete(fn);
    if (!slusaoci.size) otkaziKanal();
  };
}

export function stanjeZaFilter(filter) {
  return dohvatiUnos(kljucFiltera(filter));
}

export function ucitajZaFilter(filter, opts) {
  return ucitajZaKljuc(kljucFiltera(filter), opts);
}

/** Ručno poništavanje keša (npr. posle unosa iz iste sesije). */
export function ponistiKes() {
  unosi.clear();
  obavesti();
}

export const _test = { kljucFiltera, REALTIME_DEBOUNCE_MS, STALE_MS };
