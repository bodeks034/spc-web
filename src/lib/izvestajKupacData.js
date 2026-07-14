/**
 * Zajedničko učitavanje podataka za izveštaj kupca (atributivne + merljive).
 */

import { fetchAktuelniCilj } from "./spcStats.js";
import { analizirajKapabilitetPoPoziciji } from "./spcInteligencija.js";
import { brojMerenjaIzSop } from "./pogonSop.js";
import { trendKvalitetaPoDanu, paretoNokPoPoziciji } from "./varijabilneSpcStats.js";
import {
  agregirajPoDelu,
  paretoDefekata,
} from "./izvestajKupacPdf.js";
import {
  statAtributivneRedovi,
  agregirajAtributivnePoKljuču,
} from "./atributivneAgregacija.js";

const KONTROLNI_LOG_SELECT = [
  "datum", "id_deo", "naziv_dela", "ok_kolicina", "nok_kolicina", "ukupno_merenja",
  "greska_naziv", "podkategorija", "status", "smena",
  "inspekcija_id", "sesija_id", "created_at", "id", "kom_nok",
].join(",");

const MERENJA_SELECT = [
  "datum", "smena", "id_deo", "status", "pozicija", "vrednost_raw", "vrednost_dec", "radni_nalog",
].join(",");

const PAGE_SIZE = 1000;
const MAX_REDova = 50000;

const OTVORENI_NCR = ["otvoren", "analiza", "akcija", "verifikacija"];
const OTVORENI_8D = ["u_toku", "otvoren", "ceka", "u_izradi"];

function datumOdPerioda(period) {
  const od = new Date();
  od.setDate(od.getDate() - Number(period));
  return od.toISOString().split("T")[0];
}

/** Dnevni trend za atributivni kontrolni log (jedan komad po inspekciji). */
export function trendKvalitetaAtrPoDanu(log) {
  const grupe = agregirajAtributivnePoKljuču(log || [], (r) => r.datum || "?");
  return [...grupe.entries()]
    .map(([datum, rows]) => {
      const d = statAtributivneRedovi(rows);
      return {
        datum,
        ok: d.ok,
        nok: d.nok,
        n: d.n,
        rty: d.n > 0 ? +d.rty.toFixed(2) : 0,
        dpmo: d.n > 0 ? d.dpmo : 0,
        ppm: d.n > 0 ? d.dpmo : 0,
      };
    })
    .sort((a, b) => String(a.datum).localeCompare(String(b.datum)));
}

/** Ciljevi po delu upoređeni sa stvarnim KPI. */
export function uporediCiljeve(poDeo, ciljeviMap) {
  return (poDeo || []).map((d) => {
    const c = ciljeviMap?.[d.id_deo] || null;
    const rtySt = Number(d.rty);
    const dpmoSt = Number(d.ppm);
    const rtyCilj = c?.rty_cilj != null ? Number(c.rty_cilj) : null;
    const dpmoCilj = c?.dpmo_cilj != null ? Number(c.dpmo_cilj) : null;
    let status = "—";
    if (rtyCilj != null && dpmoCilj != null && Number.isFinite(rtySt) && Number.isFinite(dpmoSt)) {
      if (rtySt >= rtyCilj && dpmoSt <= dpmoCilj) status = "ISPUNJENO";
      else if (rtySt >= rtyCilj - 2 || dpmoSt <= dpmoCilj * 1.5) status = "GRANIČNO";
      else status = "ISPOD CILJA";
    }
    return {
      id_deo: d.id_deo,
      naziv: d.naziv,
      rty_stvarno: d.rty,
      rty_cilj: rtyCilj ?? "—",
      dpmo_stvarno: d.ppm,
      dpmo_cilj: dpmoCilj ?? "—",
      status,
    };
  });
}

function cpkStatus(cpk) {
  const v = Number(cpk);
  if (!Number.isFinite(v)) return "N/A";
  if (v >= 1.33) return "OK";
  if (v >= 1.0) return "PAŽNJA";
  return "KRITIČNO";
}

/** SPC Cp/Cpk sažetak za više delova (merljive). */
export function izracunajSpcSazetak({ merenja, karakteristike, sopRows, idDeoList }) {
  const karPoDeo = {};
  for (const k of karakteristike || []) {
    const id = String(k.id_deo || "").toUpperCase();
    if (!karPoDeo[id]) karPoDeo[id] = [];
    karPoDeo[id].push(k);
  }
  const merPoDeo = {};
  for (const m of merenja || []) {
    const id = String(m.id_deo || "").toUpperCase();
    if (!merPoDeo[id]) merPoDeo[id] = [];
    merPoDeo[id].push(m);
  }

  const out = [];
  for (const idDeo of idDeoList || []) {
    const id = String(idDeo).toUpperCase();
    const ms = merPoDeo[id] || [];
    if (!ms.length) continue;
    const n = brojMerenjaIzSop(sopRows, id);
    const kap = analizirajKapabilitetPoPoziciji(karPoDeo[id] || [], ms, n);
    for (const k of kap) {
      out.push({
        id_deo: id,
        pozicija: k.pozicija,
        cp: k.cp != null ? Number(k.cp).toFixed(2) : "—",
        cpk: k.cpk != null ? Number(k.cpk).toFixed(2) : "—",
        merenja: k.merenja,
        status: cpkStatus(k.cpk),
        nominala: k.nominala,
        lsl: k.lsl,
        usl: k.usl,
      });
    }
  }
  return out.sort((a, b) => {
    const ac = Number(a.cpk);
    const bc = Number(b.cpk);
    if (Number.isFinite(ac) && Number.isFinite(bc)) return ac - bc;
    return String(a.id_deo).localeCompare(String(b.id_deo));
  });
}

async function ucitajCiljeve(supabase, idDeoList) {
  const map = {};
  await Promise.all((idDeoList || []).map(async (id) => {
    try {
      const c = await fetchAktuelniCilj(supabase, id);
      if (c) map[String(id).toUpperCase()] = c;
    } catch { /* */ }
  }));
  return map;
}

async function ucitajNcr(supabase, idDeoList) {
  if (!idDeoList?.length) return [];
  try {
    const { data } = await supabase.from("ncr_capa")
      .select("broj_ncr,id_deo,status,prioritet,opis,rok,created_at")
      .in("id_deo", idDeoList)
      .in("status", OTVORENI_NCR)
      .order("created_at", { ascending: false })
      .limit(25);
    return data || [];
  } catch {
    return [];
  }
}

async function ucitajOsmd(supabase, { idDeoList, kupac }) {
  const out = [];
  try {
    if (idDeoList?.length) {
      const { data } = await supabase.from("osmd_izvestaji")
        .select("id,id_deo,broj_8d,status,kupac_ime_id,d2_opis_problema,datum_otvaranja_8d,created_at")
        .in("id_deo", idDeoList)
        .in("status", OTVORENI_8D)
        .order("created_at", { ascending: false })
        .limit(20);
      out.push(...(data || []));
    }
  } catch { /* */ }
  try {
    if (kupac) {
      const { data } = await supabase.from("osmd_izvestaji")
        .select("id,id_deo,broj_8d,status,kupac_ime_id,d2_opis_problema,datum_otvaranja_8d,created_at")
        .ilike("kupac_ime_id", `%${kupac}%`)
        .in("status", OTVORENI_8D)
        .order("created_at", { ascending: false })
        .limit(10);
      const ids = new Set(out.map((r) => r.id));
      for (const r of data || []) {
        if (!ids.has(r.id)) out.push(r);
      }
    }
  } catch { /* */ }
  return out.slice(0, 25);
}

function nazivPoDeluIzNaloga(nalozi) {
  const map = {};
  for (const n of nalozi || []) {
    const id = String(n.id_deo || "").toUpperCase();
    if (id && n.naziv_dela && !map[id]) map[id] = n.naziv_dela;
  }
  return map;
}

function obogatiPoDeoNazivima(poDeo, nalozi) {
  const map = nazivPoDeluIzNaloga(nalozi);
  return (poDeo || []).map((d) => ({
    ...d,
    naziv: d.naziv || map[d.id_deo] || "",
  }));
}

function statIzLoga(log, { merljive = false } = {}) {
  if (merljive) {
    const n = (log || []).length;
    const nok = (log || []).filter((r) => (r.status || "").toUpperCase() === "NOK").length;
    const ok = n - nok;
    return {
      n, nok, ok,
      rty: n > 0 ? ((ok / n) * 100).toFixed(2) : "—",
      dpmo: n > 0 ? Math.round((nok / n) * 1e6) : "—",
    };
  }
  const d = statAtributivneRedovi(log || []);
  return {
    n: d.n,
    nok: d.nok,
    ok: d.ok,
    rty: d.n > 0 ? d.rty.toFixed(2) : "—",
    dpmo: d.n > 0 ? String(d.dpmo) : "—",
  };
}

async function ucitajPaginirano(supabase, {
  tabela,
  select,
  idDeoList,
  datumOd,
  order = [{ col: "datum", asc: true }, { col: "created_at", asc: true }],
}) {
  const out = [];
  for (let from = 0; from < MAX_REDova; from += PAGE_SIZE) {
    let q = supabase.from(tabela)
      .select(select)
      .in("id_deo", idDeoList)
      .gte("datum", datumOd);
    for (const { col, asc } of order) {
      q = q.order(col, { ascending: asc });
    }
    const { data, error } = await q.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const chunk = data || [];
    out.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
  }
  return out;
}

/**
 * Kompletan izveštaj za kupca — jedan poziv za oba modula.
 */
export async function fetchIzvestajKupacPodaci(supabase, {
  kupac,
  period = "30",
  modul = "atributivne",
} = {}) {
  if (!kupac) throw new Error("Izaberite kupca");

  const datumOd = datumOdPerioda(period);
  const merljive = modul === "merljive";

  const { data: nalozi, error: rnErr } = await supabase.from("radni_nalozi")
    .select("id_deo,naziv_dela,broj_naloga,kolicina,rok_isporuke,status")
    .eq("kupac", kupac);
  if (rnErr) throw rnErr;

  const idDeoList = [...new Set((nalozi || []).map((n) => String(n.id_deo || "").toUpperCase()).filter(Boolean))];
  if (!idDeoList.length) {
    return {
      kupac, period, modul,
      nalozi: [], log: [], poDeo: [], defekti: [], trend: [],
      ciljevi: [], spcSummary: [], ncr: [], osmd: [],
      stat: { n: 0, nok: 0, ok: 0, rty: "—", dpmo: "—" },
    };
  }

  let log = [];
  if (merljive) {
    log = await ucitajPaginirano(supabase, {
      tabela: "merenja_varijabilna",
      select: MERENJA_SELECT,
      idDeoList,
      datumOd,
      order: [{ col: "datum", asc: true }],
    });
  } else {
    log = await ucitajPaginirano(supabase, {
      tabela: "kontrolni_log",
      select: KONTROLNI_LOG_SELECT,
      idDeoList,
      datumOd,
    });
  }

  const [ciljeviMap, ncr, osmd] = await Promise.all([
    ucitajCiljeve(supabase, idDeoList),
    ucitajNcr(supabase, idDeoList),
    ucitajOsmd(supabase, { idDeoList, kupac }),
  ]);

  let karakteristike = [];
  let sopRows = [];
  let spcSummary = [];

  if (merljive) {
    const [karRes, sopRes] = await Promise.all([
      supabase.from("karakteristike_merljive")
        .select("id_deo,pozicija,lsl,usl,nominala,jedinica")
        .in("id_deo", idDeoList),
      supabase.from("sop_deo_varijabilni")
        .select("id_deo,broj_merenja")
        .in("id_deo", idDeoList),
    ]);
    karakteristike = karRes.data || [];
    sopRows = sopRes.data || [];
    spcSummary = izracunajSpcSazetak({ merenja: log, karakteristike, sopRows, idDeoList });
  }

  const poDeo = obogatiPoDeoNazivima(agregirajPoDelu(log, { merljive }), nalozi);
  const stat = statIzLoga(log, { merljive });
  const ciljevi = uporediCiljeve(poDeo, ciljeviMap);

  const defekti = merljive
    ? paretoNokPoPoziciji(log, 8).map((d) => ({ defekt: `Poz. ${d.naziv}`, kolicina: d.count }))
    : paretoDefekata(log);

  const trend = merljive
    ? trendKvalitetaPoDanu(log)
    : trendKvalitetaAtrPoDanu(log);

  return {
    kupac,
    period,
    modul,
    nalozi: nalozi || [],
    log,
    stat,
    poDeo,
    defekti,
    trend,
    ciljevi,
    spcSummary,
    ncr,
    osmd,
  };
}
