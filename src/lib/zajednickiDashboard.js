import { aggregateLogRows, calcDPMO, calcRTY } from "./spcStats.js";
import { fetchKpiUnos, agregirajKpiUnos } from "./kpiUnos.js";
import { izracunajOeeKpi } from "./oeeKpi.js";
import { evaluirajAlarme } from "./operativniAlarmi.js";
import { planiranoKomIzReda, ucitajAktivniRadniNalog } from "./radniNalog.js";
import { trendKvalitetaPoDanu } from "./varijabilneSpcStats.js";
import { analizirajProces } from "./spcInteligencija.js";

function datumOd(dana) {
  const od = new Date();
  od.setDate(od.getDate() - Number(dana));
  return od.toISOString().split("T")[0];
}

function daniDoKalibracije(sledeca) {
  if (!sledeca) return null;
  return Math.ceil((new Date(sledeca) - new Date()) / 86400000);
}

function statusMerila(m, upozorenjeDana = 30) {
  const kal = (m.kalibracije || [])
    .sort((a, b) => new Date(b.datum_kal) - new Date(a.datum_kal))[0];
  if (!kal?.sledeca_kal) return { kalStatus: "nepoznato", dani: null };
  const dani = daniDoKalibracije(kal.sledeca_kal);
  if (dani < 0) return { kalStatus: "istekla", dani };
  if (dani < upozorenjeDana) return { kalStatus: "uskoro", dani };
  return { kalStatus: "ok", dani };
}

export async function fetchZajednickiDashboard(supabase, { period = 7, offlinePaketi = 0 } = {}) {
  const od = datumOd(period);
  const danas = new Date().toISOString().split("T")[0];

  const [
    logRes, merRes, merDanasRes, kpiRes, eskRes, merilaRes, nalogRes,
  ] = await Promise.all([
    supabase.from("kontrolni_log")
      .select("datum,status,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,smena,id_deo")
      .gte("datum", od),
    supabase.from("merenja_varijabilna")
      .select("datum,status,id_deo,pozicija,smena")
      .gte("datum", od),
    supabase.from("merenja_varijabilna")
      .select("datum,status,id_deo")
      .eq("datum", danas),
    fetchKpiUnos(supabase, { datumOd: od, limit: 300 }).catch(() => []),
    supabase.from("eskalacije")
      .select("id,id_deo,opis,prioritet,status,created_at,rok")
      .order("created_at", { ascending: false })
      .limit(80),
    supabase.from("merila")
      .select("id,naziv,serijski_broj,kalibracije(sledeca_kal,datum_kal)")
      .eq("aktivno", true),
    supabase.from("radni_nalozi")
      .select("id_deo,broj_naloga,kolicina,kom_ukupno,kom_za_kontrolu,status")
      .eq("status", "aktivan"),
  ]);

  const logData = logRes.data || [];
  const merData = merRes.data || [];
  const merDanas = merDanasRes.data || [];
  const kpiRows = kpiRes || [];
  const eskalacije = eskRes.data || [];

  const attrAgg = aggregateLogRows(logData) || {};
  const merN = merData.length;
  const merNok = merData.filter(r => (r.status || "").toUpperCase() === "NOK").length;
  const merOk = merN - merNok;

  const merDanasNok = merDanas.filter(r => (r.status || "").toUpperCase() === "NOK").length;

  const paretoMer = {};
  merData.forEach(r => {
    if ((r.status || "").toUpperCase() === "NOK") {
      const k = r.pozicija || "?";
      paretoMer[k] = (paretoMer[k] || 0) + 1;
    }
  });
  const paretoMerArr = Object.entries(paretoMer)
    .map(([naziv, count]) => ({ naziv, count, izvor: "merljive" }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const paretoAttr = (attrAgg.pareto || []).slice(0, 8).map(p => ({
    ...p, izvor: "atributivne",
  }));

  const topNok = [...paretoAttr, ...paretoMerArr]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const kpiAgg = agregirajKpiUnos(kpiRows);
  let oeeProsek = null;
  if (kpiRows.length) {
    let s = 0;
    let n = 0;
    kpiRows.forEach(r => {
      const planKom = r.planirano_kom || nalogRes.data?.find(
        n => n.id_deo === r.id_deo,
      )?.kom_ukupno || 0;
      const k = izracunajOeeKpi({ ...r, planirano_kom: planKom });
      if (k.oee != null) { s += k.oee; n++; }
    });
    oeeProsek = n ? +(s / n).toFixed(1) : null;
  }

  const merila = (merilaRes.data || []).map(m => ({
    id: m.id,
    naziv: m.naziv,
    ...statusMerila(m),
  }));

  const deoNok = {};
  logData.filter(r => r.datum === danas).forEach(r => {
    if (!r.id_deo) return;
    if (!deoNok[r.id_deo]) deoNok[r.id_deo] = { id_deo: r.id_deo, n: 0, nok: 0, modul: "atributivne" };
    deoNok[r.id_deo].n += r.ukupno_merenja || 0;
    deoNok[r.id_deo].nok += r.nok_kolicina || 0;
  });
  merDanas.forEach(r => {
    if (!r.id_deo) return;
    if (!deoNok[r.id_deo]) deoNok[r.id_deo] = { id_deo: r.id_deo, n: 0, nok: 0, modul: "merljive" };
    deoNok[r.id_deo].n += 1;
    if ((r.status || "").toUpperCase() === "NOK") deoNok[r.id_deo].nok += 1;
    if (deoNok[r.id_deo].modul === "atributivne") deoNok[r.id_deo].modul = "oba";
    else deoNok[r.id_deo].modul = deoNok[r.id_deo].modul || "merljive";
  });
  const visokNokDelovi = Object.values(deoNok)
    .map(d => ({ ...d, pNok: d.n > 0 ? +((d.nok / d.n) * 100).toFixed(1) : 0 }))
    .filter(d => d.n >= 5 && d.pNok >= 10)
    .sort((a, b) => b.pNok - a.pNok)
    .slice(0, 5);

  const { alarmi } = evaluirajAlarme({
    attr: { ukN: attrAgg.ukN, ukNOK: attrAgg.ukNOK, ukOK: attrAgg.ukOK },
    merljive: { merenja: merN, nok: merNok, ok: merOk, danasNok: merDanasNok },
    oee: { prosek: oeeProsek, kpiBroj: kpiRows.length },
    eskalacije,
    merila,
    offlinePaketi,
    visokNokDelovi,
  });

  const trend = attrAgg.trend || [];
  const trendMer = trendKvalitetaPoDanu(merData);
  const aktivniNalozi = (nalogRes.data || []).length;

  const inteligencija = analizirajProces({
    attr: {
      ukN: attrAgg.ukN || 0,
      ukNOK: attrAgg.ukNOK || 0,
      rty: attrAgg.rty || "0",
      dpmo: attrAgg.dpmo || 0,
    },
    merljive: {
      merenja: merN,
      nok: merNok,
      rty: calcRTY(merOk, merN),
      dpmo: calcDPMO(merNok, merN),
    },
    trendAttr: trend,
    trendMer,
    topNok,
    alarmi,
    eskalacije: {
      otvorene: eskalacije.filter(e => ["otvoren", "u_toku", "aktivan", "open"].includes((e.status || "").toLowerCase())).length,
    },
    oee: { prosek: oeeProsek },
    period,
  });

  return {
    period,
    od,
    danas,
    attr: {
      ukN: attrAgg.ukN || 0,
      ukNOK: attrAgg.ukNOK || 0,
      rty: attrAgg.rty || "0",
      dpmo: attrAgg.dpmo || 0,
    },
    merljive: {
      merenja: merN,
      nok: merNok,
      rty: calcRTY(merOk, merN),
      dpmo: calcDPMO(merNok, merN),
      danasUk: merDanas.length,
      danasNok: merDanasNok,
    },
    oee: {
      prosek: oeeProsek,
      kpiBroj: kpiRows.length,
      skart: kpiAgg?.skart ?? 0,
      dorada: kpiAgg?.dorada ?? 0,
      kpi: kpiAgg?.kpi,
    },
    topNok,
    eskalacije: {
      otvorene: eskalacije.filter(e => ["otvoren", "u_toku", "aktivan", "open"].includes((e.status || "").toLowerCase())).length,
      ukupno: eskalacije.length,
      lista: eskalacije.slice(0, 8),
    },
    merila: {
      ukupno: merila.length,
      istekla: merila.filter(m => m.kalStatus === "istekla").length,
      uskoro: merila.filter(m => m.kalStatus === "uskoro").length,
      lista: merila.filter(m => m.kalStatus !== "ok").slice(0, 6),
    },
    aktivniNalozi,
    alarmi,
    trend,
    trendMer,
    inteligencija,
  };
}

/** Planirana količina iz aktivnog radnog naloga za deo. */
export async function fetchPlaniranoKomZaDeo(supabase, idDeo) {
  const nalog = await ucitajAktivniRadniNalog(supabase, idDeo);
  return planiranoKomIzReda(nalog);
}
