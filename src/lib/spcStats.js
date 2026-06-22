/** Zajednička SPC / DPMO / Pareto logika — jedan izvor istine za dashboard, karte i unos. */

import {
  agregirajAtributivneJedinice,
  agregirajAtributivnePoKljuču,
  atributivniKomadKey,
} from "./atributivneAgregacija.js";

import { predloziDodeljenogInzenjera } from "./eskalacijeHelper.js";
import { calcFPY } from "./rtyFpy.js";

/** @deprecated Koristi calcFPY za jednu fazu; calcRTYIzFaza za više faza. */
export function calcRTY(ispravnoIzPrve, ukupno) {
  return calcFPY(ispravnoIzPrve, ukupno);
}

/** KPI red — FPY jedne faze (prolaz iz prve / ukupno). */
export function kvalitetIzPrveKpi(kpi = {}) {
  const ukupno = Number(kpi.ukupno_kom) || 0;
  const dorada = Number(kpi.dorada) || 0;
  const skart = Number(kpi.skart) || 0;
  let izPrve = Number(kpi.ispravno_iz_prve) || 0;
  const neusUneto = Number(kpi.neusaglaseno) || 0;

  // Dorada/škart smanjuju maks. prolaz iz prve (log često ima OK posle dorade u iz_prve).
  if (ukupno > 0 && (dorada > 0 || skart > 0)) {
    izPrve = Math.min(izPrve, Math.max(0, ukupno - dorada - skart));
  }

  const neusaglaseno = neusUneto > 0
    ? Math.max(neusUneto, dorada + skart, ukupno - izPrve)
    : Math.max(ukupno - izPrve, dorada + skart);

  const fpy = calcFPY(izPrve, ukupno);

  return {
    ukupno,
    ispravnoIzPrve: izPrve,
    neusaglaseno,
    okNakonDorade: Number(kpi.ok_nakon_dorade) || 0,
    dorada,
    skart,
    fpy,
    rty: fpy,
    dpmo: calcDPMO(neusaglaseno, ukupno),
    p: calcP(neusaglaseno, ukupno),
  };
}

export function calcDPMO(neusaglaseno, ukupno) {
  const uk = Number(ukupno) || 0;
  const neus = Number(neusaglaseno) || 0;
  return uk > 0 ? Math.round((neus / uk) * 1e6) : 0;
}

/** Kontrolni log / merenja — svaki unos = prva inspekcija tog komada/merenja. */
export function kvalitetIzPrveLoga({ ok = 0, nok = 0, n } = {}) {
  const izPrve = Number(ok) || 0;
  const neusaglaseno = Number(nok) || 0;
  const ukupno = Number(n) > 0 ? Number(n) : izPrve + neusaglaseno;
  return kvalitetIzPrveKpi({
    ukupno_kom: ukupno,
    ispravno_iz_prve: izPrve,
    neusaglaseno: neusaglaseno,
  });
}

/** KPI ima prednost kad postoji ukupno_kom (dorada se ne računa u RTY). */
export function kvalitetIzPrve({ kpi, ok, nok, n } = {}) {
  if (kpi && Number(kpi.ukupno_kom) > 0) return kvalitetIzPrveKpi(kpi);
  if (kpi && Number(kpi.ispravno_iz_prve) > 0) return kvalitetIzPrveKpi(kpi);
  return kvalitetIzPrveLoga({ ok, nok, n });
}

export function calcP(nok, n) {
  return n > 0 ? +((nok / n) * 100).toFixed(2) : 0;
}

/** Procesni sigma nivo iz DPMO (Motorola skala, max 6σ). */
export function sigmaIzDPMO(dpmo) {
  if (dpmo <= 0) return 6.0;
  const tbl = [[3.4, 6], [233, 5], [6210, 4], [66807, 3], [308538, 2], [691462, 1]];
  for (const [lim, s] of tbl) if (dpmo <= lim) return s;
  return 1;
}

const SPC_EPS = 1e-9;

/** Minimum tačaka za Western Electric obrazac (pravila 2–5). Ispod toga — samo van UCL/LCL. */
export const WE_MIN_PODGRUPA_OBRAZAC = 8;

export function vanKontrolnihGranica(val, ucl, lcl, eps = SPC_EPS) {
  if (!Number.isFinite(val) || !Number.isFinite(ucl) || !Number.isFinite(lcl)) return false;
  return val > ucl + eps || val < lcl - eps;
}

/** Western Electric pravila 2–5 (obrazac). Pravilo 1 — van UCL/LCL — u chartDataWithWesternElectric. */
export function westernElectricObrazac(niz, cl, ucl, lcl) {
  const sigma = (ucl - cl) / 3;
  if (!Number.isFinite(sigma) || sigma <= SPC_EPS || !niz?.length) return [];

  const flag = new Set();
  const n = niz.length;

  for (let i = 0; i < n; i++) {
    if (i >= 2 && n >= 3) {
      const s = niz.slice(i - 2, i + 1);
      const iznad = s.filter((x) => x > cl + 2 * sigma + SPC_EPS).length;
      const ispod = s.filter((x) => x < cl - 2 * sigma - SPC_EPS).length;
      if (iznad >= 2 || ispod >= 2) {
        for (let j = 0; j < s.length; j++) flag.add(i - 2 + j);
      }
    }

    if (i >= 4 && n >= 5) {
      const s = niz.slice(i - 4, i + 1);
      const iznad = s.filter((x) => x > cl + sigma + SPC_EPS).length;
      const ispod = s.filter((x) => x < cl - sigma - SPC_EPS).length;
      if (iznad >= 4 || ispod >= 4) {
        for (let j = 0; j < s.length; j++) flag.add(i - 4 + j);
      }
    }

    if (i >= 7 && n >= 8) {
      const s = niz.slice(i - 7, i + 1);
      if (s.every((x) => x > cl + SPC_EPS) || s.every((x) => x < cl - SPC_EPS)) {
        for (let j = 0; j < s.length; j++) flag.add(i - 7 + j);
      }
    }

    if (i >= 5 && n >= 6) {
      const s = niz.slice(i - 5, i + 1);
      const raste = s.every((x, j) => j === 0 || x > s[j - 1] + SPC_EPS);
      const pada = s.every((x, j) => j === 0 || x < s[j - 1] - SPC_EPS);
      if (raste || pada) {
        for (let j = 0; j < s.length; j++) flag.add(i - 5 + j);
      }
    }
  }

  return [...flag];
}

/** Kompatibilnost — puna WE analiza (granica + obrazac). */
export function westernElectric(niz, cl, ucl, lcl) {
  const flag = new Set();
  for (let i = 0; i < niz.length; i++) {
    if (vanKontrolnihGranica(niz[i], ucl, lcl)) flag.add(i);
  }
  if (niz.length >= WE_MIN_PODGRUPA_OBRAZAC) {
    westernElectricObrazac(niz, cl, ucl, lcl).forEach((j) => flag.add(j));
  }
  return [...flag];
}

export function aggregateLogRows(data) {
  if (!data?.length) return null;

  const { ok: ukOK, nok: ukNOK, n: ukN, komNok } = agregirajAtributivneJedinice(data);
  const dpmo = calcDPMO(ukNOK, ukN);
  const rty = calcRTY(ukOK, ukN).toFixed(1);

  const gB = {};
  data.forEach(r => {
    if (r.greska_naziv && r.greska_naziv !== "OK")
      gB[r.greska_naziv] = (gB[r.greska_naziv] || 0) + (r.kom_nok || 0);
  });
  const pareto = Object.entries(gB).map(([naziv, count]) => ({ naziv, count }))
    .sort((a, b) => b.count - a.count);

  const daniGr = agregirajAtributivnePoKljuču(data, r => r.datum || "?");
  const trend = [...daniGr.entries()].map(([datum, rows]) => {
    const d = agregirajAtributivneJedinice(rows);
    return {
      datum,
      ok: d.ok,
      nok: d.nok,
      n: d.n,
      rty: calcRTY(d.ok, d.n),
      p: calcP(d.nok, d.n),
    };
  }).sort((a, b) => String(a.datum).localeCompare(String(b.datum)));

  const sm = { 1: { s: 1, ok: 0, nok: 0, n: 0 }, 2: { s: 2, ok: 0, nok: 0, n: 0 }, 3: { s: 3, ok: 0, nok: 0, n: 0 } };
  const smeneGr = agregirajAtributivnePoKljuču(data, r => Number(r.smena));
  for (const [smena, rows] of smeneGr.entries()) {
    const s = sm[smena];
    if (!s) continue;
    const d = agregirajAtributivneJedinice(rows);
    s.ok = d.ok;
    s.nok = d.nok;
    s.n = d.n;
  }

  return { ukN, ukNOK, ukOK, dpmo, rty, pareto, trend, smene: Object.values(sm), komNok };
}

function groupSpcRowsByKomad(rawData) {
  const buckets = new Map();
  const sorted = [...(rawData || [])].sort((a, b) =>
    (a.datum || "").localeCompare(b.datum || "")
    || String(a.created_at || "").localeCompare(String(b.created_at || ""))
    || (Number(a.id) || 0) - (Number(b.id) || 0));

  sorted.forEach((r, idx) => {
    const key = atributivniKomadKey(r) || `seq|${idx}`;
    if (!buckets.has(key)) {
      const redni = buckets.size + 1;
      const label = r.datum?.substring(5)
        ? `${r.datum.substring(5)} #${redni}`
        : `#${redni}`;
      buckets.set(key, { key, label, datum: r.datum, rows: [] });
    }
    buckets.get(key).rows.push(r);
  });

  return [...buckets.values()].map(b => {
    const { ok, nok, n, komNok } = agregirajAtributivneJedinice(b.rows);
    return { key: b.key, label: b.label, datum: b.datum, nok, ok, n, c: komNok };
  });
}

/** Preporučeno grupisanje kad je sve u jednom danu a ima puno unosa. */
export function predloziGrupisanjeSpc(rawData, { vozilo = false } = {}) {
  const rows = rawData || [];
  if (!rows.length) return "dan";
  if (vozilo) return "komad";
  const poDanu = groupSpcRows(rows, "dan");
  if (poDanu.length <= 1 && rows.length >= 5) return "komad";
  return "dan";
}

export function groupSpcRows(rawData, grupisanje) {
  if (grupisanje === "komad") return groupSpcRowsByKomad(rawData);

  const buckets = {};
  rawData.forEach(r => {
    const k = grupisanje === "dan_smena" ? `${r.datum}|S${r.smena}`
      : grupisanje === "smena" ? `S${r.smena}`
        : r.datum;
    const label = grupisanje === "dan_smena" ? `${r.datum?.substring(5) || ""} S${r.smena}`
      : grupisanje === "smena" ? `Smena ${r.smena}`
        : r.datum?.substring(5) || r.datum;
    if (!buckets[k]) buckets[k] = { key: k, label, datum: r.datum, rows: [] };
    buckets[k].rows.push(r);
  });
  return Object.values(buckets).map(b => {
    const { ok, nok, n, komNok } = agregirajAtributivneJedinice(b.rows);
    return { key: b.key, label: b.label, datum: b.datum, nok, ok, n, c: komNok };
  }).sort((a, b) =>
    (a.datum || "").localeCompare(b.datum || "") || String(a.key).localeCompare(String(b.key)));
}

export function buildParetoFromLog(rawData, limit = 8) {
  const g = {};
  rawData.forEach(r => {
    if (r.greska_naziv && r.greska_naziv !== "OK")
      g[r.greska_naziv] = (g[r.greska_naziv] || 0) + (r.kom_nok || 0);
  });
  const sor = Object.entries(g).map(([naziv, count]) => ({ naziv, count }))
    .sort((a, b) => b.count - a.count).slice(0, limit);
  const uk = sor.reduce((s, d) => s + d.count, 0);
  let kum = 0;
  return sor.map(d => { kum += d.count; return { ...d, kum: uk > 0 ? +((kum / uk) * 100).toFixed(1) : 0 }; });
}

export function pendingFromLista(listaP) {
  let ok = 0;
  let nok = 0;
  (listaP || []).forEach(s => {
    if (s.status === "NOK") nok += s.kolicina || 0;
    else ok += s.kolicina || 0;
  });
  return { ok, nok, merenja: (listaP || []).length };
}

export function mergeSmenaStat(dbStat, pending, kpi = null) {
  const ok = (dbStat?.ok || 0) + (pending?.ok || 0);
  const nok = (dbStat?.nok || 0) + (pending?.nok || 0);
  const n = ok + nok;
  const k = kvalitetIzPrve({ kpi, ok, nok, n });
  return {
    ok: k.ispravnoIzPrve,
    nok: k.neusaglaseno,
    merenja: k.ukupno,
    okNakonDorade: k.okNakonDorade,
    rty: k.rty,
    dpmo: k.dpmo,
    p: k.p,
  };
}

export async function fetchSmenaStat(supabase, { datum, smena, idDeo, kontrolorId }) {
  let q = supabase.from("kontrolni_log")
    .select("ok_kolicina,nok_kolicina,kom_nok,inspekcija_id,sesija_id,created_at,id_deo,datum,smena,id")
    .eq("datum", datum)
    .eq("smena", smena);
  if (idDeo) q = q.eq("id_deo", idDeo);
  if (kontrolorId) q = q.eq("kontrolor_id", kontrolorId);
  const { data, error } = await q;
  if (error) throw error;
  const { ok, nok } = agregirajAtributivneJedinice(data || []);
  return { ok, nok, merenja: ok + nok };
}

export async function fetchAktuelniCilj(supabase, idDeo) {
  const { data } = await supabase.from("ciljevi")
    .select("*")
    .eq("id_deo", idDeo)
    .order("vazi_od", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function fetchDeoStatDanas(supabase, idDeo, datum) {
  const { data } = await supabase.from("kontrolni_log")
    .select("ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,inspekcija_id,sesija_id,created_at,id_deo,datum,smena,id")
    .eq("id_deo", idDeo)
    .eq("datum", datum);
  const { ok, nok, n } = agregirajAtributivneJedinice(data || []);
  return { ok, nok, n, dpmo: calcDPMO(nok, n), rty: calcRTY(ok, n) };
}

/** Mapiranje NOK stavki na AQL klase (heuristika po nazivu kategorije). */
export function nokPoAqlKlasi(stavke) {
  const out = { critical: 0, major: 0, minor: 0 };
  (stavke || []).forEach(s => {
    if (s.status !== "NOK") return;
    const k = (s.kat || s.greska_naziv || "").toLowerCase();
    const qty = s.kolicina || s.nok_kolicina || 1;
    if (k.includes("krit") || k.includes("critical") || k.includes("sigurn")) out.critical += qty;
    else if (k.includes("minor") || k.includes("manji") || k.includes("estet")) out.minor += qty;
    else out.major += qty;
  });
  return out;
}

export async function kreirajAutoEskalaciju(supabase, {
  id_deo, opis, prioritet = "visok", kreirao_id, prefiks = "AUTO",
  korektivna_akcija = null,
}) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase.from("eskalacije")
    .select("id")
    .eq("id_deo", id_deo)
    .in("status", ["otvoren", "u_toku"])
    .gte("created_at", since)
    .ilike("opis", `${prefiks}%`)
    .limit(1);
  if (existing?.length) return existing[0];

  const { dodeljen_id } = await predloziDodeljenogInzenjera(supabase);
  const { data, error } = await supabase.from("eskalacije").insert({
    id_deo,
    opis: `${prefiks}: ${opis}`,
    korektivna_akcija,
    prioritet,
    status: "otvoren",
    kreirao_id: kreirao_id || null,
    dodeljen_id: dodeljen_id || null,
    rok: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  }).select("id").single();
  if (error) throw error;
  return data;
}

export async function upisiSpcAlarm(supabase, alarm) {
  const { data: dup } = await supabase.from("spc_alarmi")
    .select("id")
    .eq("id_deo", alarm.id_deo)
    .eq("datum", alarm.datum)
    .eq("tip_karte", alarm.tip_karte)
    .eq("pravilo", alarm.pravilo)
    .eq("status", "otvoren")
    .limit(1);
  if (dup?.length) return dup[0];

  const { data, error } = await supabase.from("spc_alarmi").insert(alarm).select("id").single();
  if (error) throw error;
  return data;
}

export function chartDataWithWesternElectric(podaci, {
  obrazacPravila = true,
  minTačakaObrazac = WE_MIN_PODGRUPA_OBRAZAC,
} = {}) {
  if (!podaci?.length) return [];

  const vanGranica = new Set();
  podaci.forEach((d, i) => {
    if (vanKontrolnihGranica(d.val, d.ucl, d.lcl)) vanGranica.add(i);
  });

  const obrazac = new Set();
  if (obrazacPravila && podaci.length >= minTačakaObrazac) {
    const niz = podaci.map((p) => p.val);
    const d0 = podaci[0];
    const limitiIsti = podaci.every(
      (d) => d.ucl === d0.ucl && d.cl === d0.cl && d.lcl === d0.lcl,
    );
    if (limitiIsti) {
      westernElectricObrazac(niz, d0.cl, d0.ucl, d0.lcl).forEach((j) => obrazac.add(j));
    }
  }

  return podaci.map((d, i) => ({
    ...d,
    upozVanGranica: vanGranica.has(i),
    upozObrazac: obrazac.has(i),
    upoz: vanGranica.has(i) || obrazac.has(i),
  }));
}
