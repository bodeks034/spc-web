/** Zajednička SPC / DPMO / Pareto logika — jedan izvor istine za dashboard, karte i unos. */

export function calcDPMO(nok, n) {
  return n > 0 ? Math.round((nok / n) * 1e6) : 0;
}

export function calcRTY(ok, n) {
  return n > 0 ? +((ok / n) * 100).toFixed(1) : 0;
}

export function calcP(nok, n) {
  return n > 0 ? +((nok / n) * 100).toFixed(2) : 0;
}

export function westernElectric(niz, cl, ucl, lcl) {
  const sigma = (ucl - cl) / 3;
  if (sigma <= 0) return [];
  const flag = new Set();
  const n = niz.length;
  for (let i = 0; i < n; i++) {
    const v = niz[i];
    if (v > ucl || v < lcl) flag.add(i);
    if (i >= 8) {
      const s = niz.slice(i - 8, i + 1);
      if (s.every(x => x > cl) || s.every(x => x < cl)) s.forEach((_, j) => flag.add(i - 8 + j));
    }
    if (i >= 5) {
      const s = niz.slice(i - 5, i + 1);
      if (s.every((x, j) => j === 0 || x > s[j - 1]) || s.every((x, j) => j === 0 || x < s[j - 1]))
        s.forEach((_, j) => flag.add(i - 5 + j));
    }
    if (i >= 2) {
      const s = niz.slice(i - 2, i + 1);
      const g = s.filter(x => x > cl + 2 * sigma).length;
      const d = s.filter(x => x < cl - 2 * sigma).length;
      if (g >= 2 || d >= 2) s.forEach((_, j) => flag.add(i - 2 + j));
    }
  }
  return [...flag];
}

export function aggregateLogRows(data) {
  if (!data?.length) return null;

  const ukN = data.reduce((s, r) => s + (r.ukupno_merenja || 0), 0);
  const ukNOK = data.reduce((s, r) => s + (r.nok_kolicina || 0), 0);
  const ukOK = data.reduce((s, r) => s + (r.ok_kolicina || 0), 0);
  const dpmo = calcDPMO(ukNOK, ukN);
  const rty = calcRTY(ukOK, ukN).toFixed(1);

  const gB = {};
  data.forEach(r => {
    if (r.greska_naziv && r.greska_naziv !== "OK")
      gB[r.greska_naziv] = (gB[r.greska_naziv] || 0) + (r.kom_nok || 0);
  });
  const pareto = Object.entries(gB).map(([naziv, count]) => ({ naziv, count }))
    .sort((a, b) => b.count - a.count);

  const dani = {};
  data.forEach(r => {
    if (!dani[r.datum]) dani[r.datum] = { datum: r.datum, ok: 0, nok: 0, n: 0 };
    dani[r.datum].ok += r.ok_kolicina || 0;
    dani[r.datum].nok += r.nok_kolicina || 0;
    dani[r.datum].n += r.ukupno_merenja || 0;
  });
  const trend = Object.values(dani).map(d => ({
    ...d,
    rty: calcRTY(d.ok, d.n),
    p: calcP(d.nok, d.n),
  }));

  const sm = { 1: { s: 1, ok: 0, nok: 0, n: 0 }, 2: { s: 2, ok: 0, nok: 0, n: 0 }, 3: { s: 3, ok: 0, nok: 0, n: 0 } };
  data.forEach(r => {
    const s = sm[r.smena];
    if (s) {
      s.ok += r.ok_kolicina || 0;
      s.nok += r.nok_kolicina || 0;
      s.n += r.ukupno_merenja || 0;
    }
  });

  return { ukN, ukNOK, ukOK, dpmo, rty, pareto, trend, smene: Object.values(sm) };
}

export function groupSpcRows(rawData, grupisanje) {
  const g = {};
  rawData.forEach(r => {
    const k = grupisanje === "dan_smena" ? `${r.datum}|S${r.smena}`
      : grupisanje === "smena" ? `S${r.smena}`
        : r.datum;
    const label = grupisanje === "dan_smena" ? `${r.datum?.substring(5) || ""} S${r.smena}`
      : grupisanje === "smena" ? `Smena ${r.smena}`
        : r.datum?.substring(5) || r.datum;
    if (!g[k]) g[k] = { key: k, label, datum: r.datum, nok: 0, ok: 0, n: 0, c: 0 };
    g[k].nok += r.nok_kolicina || 0;
    g[k].ok += r.ok_kolicina || 0;
    g[k].n += r.ukupno_merenja || 0;
    g[k].c += r.kom_nok || 0;
  });
  return Object.values(g).sort((a, b) =>
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

export function mergeSmenaStat(dbStat, pending) {
  const ok = (dbStat?.ok || 0) + (pending?.ok || 0);
  const nok = (dbStat?.nok || 0) + (pending?.nok || 0);
  const merenja = (dbStat?.merenja || 0) + (pending?.merenja || 0);
  const n = ok + nok;
  return {
    ok, nok, merenja,
    rty: calcRTY(ok, n),
    dpmo: calcDPMO(nok, n),
    p: calcP(nok, n),
  };
}

export async function fetchSmenaStat(supabase, { datum, smena, idDeo, kontrolorId }) {
  let q = supabase.from("kontrolni_log")
    .select("ok_kolicina,nok_kolicina")
    .eq("datum", datum)
    .eq("smena", smena);
  if (idDeo) q = q.eq("id_deo", idDeo);
  if (kontrolorId) q = q.eq("kontrolor_id", kontrolorId);
  const { data, error } = await q;
  if (error) throw error;
  const ok = (data || []).reduce((s, r) => s + (r.ok_kolicina || 0), 0);
  const nok = (data || []).reduce((s, r) => s + (r.nok_kolicina || 0), 0);
  return { ok, nok, merenja: (data || []).length };
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
    .select("ok_kolicina,nok_kolicina,ukupno_merenja")
    .eq("id_deo", idDeo)
    .eq("datum", datum);
  const ok = (data || []).reduce((s, r) => s + (r.ok_kolicina || 0), 0);
  const nok = (data || []).reduce((s, r) => s + (r.nok_kolicina || 0), 0);
  const n = (data || []).reduce((s, r) => s + (r.ukupno_merenja || 0), 0);
  return { ok, nok, n, dpmo: calcDPMO(nok, n || ok + nok), rty: calcRTY(ok, n || ok + nok) };
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

  const { data, error } = await supabase.from("eskalacije").insert({
    id_deo,
    opis: `${prefiks}: ${opis}`,
    prioritet,
    status: "otvoren",
    kreirao_id: kreirao_id || null,
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

export function chartDataWithWesternElectric(podaci) {
  if (!podaci?.length) return [];
  const flag = new Set();
  podaci.forEach((d, i) => {
    const sigma = (d.ucl - d.cl) / 3;
    if (sigma <= 0) return;
    if (d.val > d.ucl || d.val < d.lcl) flag.add(i);
  });
  const niz = podaci.map(p => p.val);
  if (podaci.length) {
    const d0 = podaci[0];
    westernElectric(niz, d0.cl, d0.ucl, d0.lcl).forEach(j => flag.add(j));
  }
  return podaci.map((d, i) => ({ ...d, upoz: flag.has(i) }));
}
