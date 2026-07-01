import { aggregateLogRows } from "./spcStats.js";
import { agregirajAtributivnePoKljuču, statAtributivneRedovi } from "./atributivneAgregacija.js";
import {
  fetchKpiUnos,
  agregirajKpiUnos,
  agregirajKvalitetDashboardAttr,
  agregirajKvalitetDashboardMer,
  trendKvalitetaDashboardAttr,
  trendKvalitetaDashboardMer,
} from "./kpiUnos.js";
import { izracunajOeeKpi, izracunajOeePogon } from "./oeeKpi.js";
import { fazeKvalitetaPogona, najslabijaFaza } from "./rtyFpy.js";
import { evaluirajAlarme } from "./operativniAlarmi.js";
import { planiranoKomIzReda, ucitajAktivniRadniNalog } from "./radniNalog.js";
import { analizirajProces } from "./spcInteligencija.js";
import { idDeloviZaLinijuFilter, merenjeNaLiniji } from "./analitikaFilterData.js";

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

export async function fetchZajednickiDashboard(supabase, { period = 7, offlinePaketi = 0, idDeo = "", linija = "", smena = "" } = {}) {
  const od = datumOd(period);
  const danas = new Date().toISOString().split("T")[0];
  const deoFilter = String(idDeo || "").trim().toUpperCase();
  const linijaFilter = String(linija || "").trim();
  const smenaFilter = smena !== "" && smena != null ? Number(smena) : null;

  const logQ = supabase.from("kontrolni_log")
    .select("datum,status,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,smena,id_deo,inspekcija_id,sesija_id,created_at,id")
    .gte("datum", od);
  const merQ = supabase.from("merenja_varijabilna")
    .select("datum,status,id_deo,pozicija,smena,linija")
    .gte("datum", od);
  const merDanasQ = supabase.from("merenja_varijabilna")
    .select("datum,status,id_deo,linija")
    .eq("datum", danas);
  const eskQ = supabase.from("eskalacije")
    .select("id,id_deo,opis,prioritet,status,created_at,rok")
    .order("created_at", { ascending: false })
    .limit(80);

  if (deoFilter) {
    logQ.eq("id_deo", deoFilter);
    merQ.eq("id_deo", deoFilter);
    merDanasQ.eq("id_deo", deoFilter);
    eskQ.eq("id_deo", deoFilter);
  }
  if (smenaFilter) {
    logQ.eq("smena", smenaFilter);
    merQ.eq("smena", smenaFilter);
  }

  let idDelovaLinija = null;
  if (linijaFilter && !deoFilter) {
    idDelovaLinija = await idDeloviZaLinijuFilter(linijaFilter);
  }

  const [
    logRes, merRes, merDanasRes, kpiRes, eskRes, merilaRes, nalogRes,
  ] = await Promise.all([
    logQ,
    merQ,
    merDanasQ,
    fetchKpiUnos(supabase, { datumOd: od, idDeo: deoFilter || undefined, limit: 300 }).catch(() => []),
    eskQ,
    supabase.from("merila")
      .select("id,naziv,serijski_broj,kalibracije(sledeca_kal,datum_kal)")
      .eq("aktivno", true),
    deoFilter
      ? supabase.from("radni_nalozi")
        .select("id_deo,broj_naloga,kolicina,status")
        .eq("status", "aktivan")
        .eq("id_deo", deoFilter)
      : supabase.from("radni_nalozi")
        .select("id_deo,broj_naloga,kolicina,status")
        .eq("status", "aktivan"),
  ]);

  let logData = logRes.data || [];
  let merData = merRes.data || [];
  let merDanas = merDanasRes.data || [];
  if (linijaFilter && !deoFilter) {
    const idSet = idDelovaLinija?.length ? new Set(idDelovaLinija) : null;
    if (idSet) {
      logData = logData.filter((r) => idSet.has(String(r.id_deo || "").toUpperCase()));
      eskRes.data = (eskRes.data || []).filter((r) => idSet.has(String(r.id_deo || "").toUpperCase()));
    }
    merData = merData.filter((r) =>
      merenjeNaLiniji(r, linijaFilter)
      || (idSet?.has(String(r.id_deo || "").toUpperCase()) ?? false),
    );
    merDanas = merDanas.filter((r) =>
      merenjeNaLiniji(r, linijaFilter)
      || (idSet?.has(String(r.id_deo || "").toUpperCase()) ?? false),
    );
  }
  const kpiRows = kpiRes || [];
  const eskalacije = eskRes.data || [];
  const kpiAttrRows = kpiRows.filter((r) => r.modul === "atributivne");
  const kpiMerRows = kpiRows.filter((r) => r.modul === "merljive");

  const attrAgg = aggregateLogRows(logData) || {};

  const merDanasNok = merDanas.filter(r => (r.status || "").toUpperCase() === "NOK").length;

  const attrKval = agregirajKvalitetDashboardAttr(logData, kpiAttrRows);
  const merKval = agregirajKvalitetDashboardMer(merData, kpiMerRows);
  const { faze: fazeKvaliteta, rty: rtyPogon } = fazeKvalitetaPogona({ attr: attrKval, merljive: merKval });
  const najslabija = najslabijaFaza(fazeKvaliteta);

  const trend = trendKvalitetaDashboardAttr(logData, kpiAttrRows);
  const trendMer = trendKvalitetaDashboardMer(merData, kpiMerRows);

  const kpiAgg = agregirajKpiUnos(kpiRows);
  let oeeProsek = null;
  let oeePogon = null;
  if (kpiAgg?.ukupno_kom > 0) {
    const planKom = Math.max(
      kpiAgg.planirano_kom || 0,
      ...(kpiRows.map(r => Number(r.planirano_kom) || 0)),
      ...(nalogRes.data || []).map(n => Number(n.kolicina) || 0),
    );
    oeePogon = izracunajOeePogon({
      ...kpiAgg,
      planirano_kom: planKom,
      attr: attrKval,
      merljive: merKval,
    });
    oeeProsek = oeePogon.oee;
  } else if (rtyPogon != null) {
    oeePogon = izracunajOeePogon({
      attr: attrKval,
      merljive: merKval,
      ukupno_kom: (attrKval.ukupno || 0) + (merKval.ukupno || 0),
    });
    oeeProsek = oeePogon.oee;
  }

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

  const otvoreniStatusi = ["otvoren", "u_toku", "aktivan", "open"];
  const eskOtvorene = eskalacije.filter(e =>
    otvoreniStatusi.includes((e.status || "").toLowerCase()),
  );
  const eskAuto = eskOtvorene.filter(e => /^(AUTO|AUTO-VAR|INTEL)/i.test(e.opis || ""));
  const eskRucne = eskOtvorene.length - eskAuto.length;

  const merila = (merilaRes.data || []).map(m => ({
    id: m.id,
    naziv: m.naziv,
    ...statusMerila(m),
  }));

  const deoNok = {};
  const danasAttr = logData.filter(r => r.datum === danas);
  const attrPoDeo = agregirajAtributivnePoKljuču(danasAttr, r => r.id_deo || "?");
  for (const [idDeo, rows] of attrPoDeo.entries()) {
    if (!idDeo || idDeo === "?") continue;
    const st = statAtributivneRedovi(rows);
    deoNok[idDeo] = { id_deo: idDeo, n: st.n, nok: st.nok, modul: "atributivne" };
  }
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
    attr: { ukN: attrKval.ukupno, ukNOK: attrKval.neusaglaseno, ukOK: attrKval.ispravnoIzPrve },
    merljive: { merenja: merKval.ukupno, nok: merKval.neusaglaseno, ok: merKval.ispravnoIzPrve, danasNok: merDanasNok },
    oee: { prosek: oeeProsek, kpiBroj: kpiRows.length },
    eskalacije,
    merila,
    offlinePaketi,
    visokNokDelovi,
  });

  const aktivniNalozi = (nalogRes.data || []).length;

  const inteligencija = analizirajProces({
    attr: {
      ukN: attrKval.ukupno,
      ukNOK: attrKval.neusaglaseno,
      fpy: attrKval.fpy,
      rty: String(attrKval.fpy),
      dpmo: attrKval.dpmo,
      dorada: attrKval.dorada,
    },
    merljive: {
      merenja: merKval.ukupno,
      nok: merKval.neusaglaseno,
      fpy: merKval.fpy,
      rty: merKval.fpy,
      dpmo: merKval.dpmo,
      dorada: merKval.dorada,
    },
    rtyPogon,
    fazeKvaliteta,
    trendAttr: trend,
    trendMer,
    topNok,
    alarmi,
    eskalacije: {
      otvorene: eskOtvorene.length,
    },
    oee: { prosek: oeeProsek, rty: rtyPogon },
    period,
    idDeo: deoFilter || null,
  });

  return {
    period,
    od,
    danas,
    idDeoFilter: deoFilter || null,
    attr: {
      ukN: attrKval.ukupno,
      ukNOK: attrKval.neusaglaseno,
      fpy: attrKval.fpy,
      rty: String(attrKval.fpy),
      dpmo: attrKval.dpmo,
    },
    merljive: {
      merenja: merKval.ukupno,
      nok: merKval.neusaglaseno,
      fpy: merKval.fpy,
      rty: merKval.fpy,
      dpmo: merKval.dpmo,
      danasUk: merDanas.length,
      danasNok: merDanasNok,
    },
    rtyPogon,
    fazeKvaliteta,
    najslabijaFaza: najslabija,
    oee: {
      prosek: oeeProsek,
      kpiBroj: kpiRows.length,
      skart: kpiAgg?.skart ?? 0,
      dorada: kpiAgg?.dorada ?? 0,
      kpi: oeePogon || kpiAgg?.kpi,
      imaKpi: (kpiAgg?.ukupno_kom || 0) > 0,
      rty: rtyPogon,
      faze: fazeKvaliteta,
    },
    topNok,
    eskalacije: {
      otvorene: eskOtvorene.length,
      auto: eskAuto.length,
      rucne: eskRucne,
      ukupno: eskalacije.length,
      lista: eskalacije.slice(0, 8),
    },
    merila: {
      ukupno: merila.length,
      istekla: merila.filter(m => m.kalStatus === "istekla").length,
      uskoro: merila.filter(m => m.kalStatus === "uskoro").length,
      nepoznato: merila.filter(m => m.kalStatus === "nepoznato").length,
      upozorenja: merila.filter(m => m.kalStatus === "istekla" || m.kalStatus === "uskoro").length,
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
