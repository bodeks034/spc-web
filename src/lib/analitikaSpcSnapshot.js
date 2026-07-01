import {
  buildParetoFromLog,
  calcDPMO,
  calcPPM,
  groupSpcRows,
  sigmaIzDPMO,
  chartDataWithWesternElectric,
} from "./spcStats.js";
import { statAtributivneRedovi } from "./atributivneAgregacija.js";
import { datumOdIzPerioda } from "./analitikaFilterUtils.js";
import { brojMerenjaIzSop } from "./pogonSop.js";
import { fetchKpiUnos, agregirajKpiUnos } from "./kpiUnos.js";
import { graniceKarakteristike } from "./varijabilneUtils.js";
import {
  calcCpCpk,
  izracunajIMRKarte,
  izracunajXbarRKarte,
  agregatKvaliteta,
  paretoNokPoPoziciji,
  podgrupeMerenja,
  sigmaProcesa,
} from "./varijabilneSpcStats.js";

function filtrirajPeriod(rows, period) {
  if (!period || !rows?.length) return rows || [];
  const od = datumOdIzPerioda(period);
  return rows.filter((r) => String(r.datum || "") >= od);
}

function primeniSmena(q, smena) {
  if (smena !== "" && smena != null) return q.eq("smena", Number(smena));
  return q;
}

export function statusSpcMer({ cpk, vanKontrole, merenja, podgrupe }) {
  if ((merenja || 0) < 8 || (podgrupe || 0) < 2) {
    return { id: "nedovoljno", label: "Nedovoljno podataka" };
  }
  if (cpk != null && cpk < 1.0) {
    return { id: "kriticno", label: "Cpk < 1 — hitno" };
  }
  if ((vanKontrole || 0) > 0) {
    return { id: "kriticno", label: `${vanKontrole} van kontrole (X̄/R)` };
  }
  if (cpk != null && cpk < 1.33) {
    return { id: "upozorenje", label: "Cpk 1–1,33 — optimizacija" };
  }
  return { id: "ok", label: "U kontroli" };
}

export function statusSpcAtr({ dpmo, vanKontrole, n }) {
  if ((n || 0) < 5) {
    return { id: "nedovoljno", label: "Nedovoljno podataka" };
  }
  if ((vanKontrole || 0) > 0) {
    return { id: "kriticno", label: `${vanKontrole} van kontrole (p)` };
  }
  if (dpmo > 66807) {
    return { id: "kriticno", label: "DPMO > 3σ nivo" };
  }
  if (dpmo > 6210) {
    return { id: "upozorenje", label: "DPMO iznad 4σ" };
  }
  return { id: "ok", label: "U kontroli" };
}

function brojVanKontroleXbarR(spc) {
  const xVan = (spc.xbarPodaci || []).filter((d) => d.upozVanGranica || d.upozObrazac).length;
  const rVan = (spc.rPodaci || []).filter((d) => d.upozVanGranica || d.upozObrazac).length;
  return xVan + rVan;
}

function brojVanKontroleP(grupe) {
  if (!grupe?.length) return { van: 0, spark: [] };

  const ukN = grupe.reduce((s, g) => s + g.n, 0);
  const ukNok = grupe.reduce((s, g) => s + g.nok, 0);
  const pBar = ukN > 0 ? ukNok / ukN : 0;

  const podaci = grupe.map((g) => {
    const p = g.n > 0 ? g.nok / g.n : 0;
    const ucl = pBar + 3 * Math.sqrt((pBar * (1 - pBar)) / Math.max(g.n, 1));
    const lcl = Math.max(0, pBar - 3 * Math.sqrt((pBar * (1 - pBar)) / Math.max(g.n, 1)));
    return {
      val: +(p * 100).toFixed(3),
      cl: +(pBar * 100).toFixed(3),
      ucl: +(ucl * 100).toFixed(3),
      lcl: +(lcl * 100).toFixed(3),
    };
  });

  const oznaceni = chartDataWithWesternElectric(podaci, { obrazacPravila: grupe.length >= 8 });
  const spark = oznaceni.slice(-8).map((d) => ({
    v: d.val,
    bad: !!(d.upozVanGranica || d.upozObrazac),
  }));
  return {
    van: oznaceni.filter((d) => d.upozVanGranica || d.upozObrazac).length,
    spark,
  };
}

function kapabilitetPozicije(merenja, kar, nPodgrupa) {
  if (!kar || !merenja?.length) {
    return { cp: null, cpk: null, podgrupe: 0, spc: null, pozicija: kar?.pozicija || null };
  }
  const gr = graniceKarakteristike(kar);
  const podgrupe = podgrupeMerenja(merenja, nPodgrupa, gr.jedinica);
  const spc = izracunajXbarRKarte(podgrupe, nPodgrupa);
  const imr = izracunajIMRKarte(merenja, gr.jedinica);
  const sig = imr.sigmaHat || spc.sigmaHat;
  const mean = imr.xBar || spc.xbarBar;
  const { cp, cpk } = calcCpCpk(mean, sig, gr.lsl, gr.usl);
  return {
    cp,
    cpk,
    podgrupe: podgrupe.length,
    spc,
    imr,
    pozicija: kar.pozicija,
    gr,
  };
}

/** Ista logika kao MerljiveSpcKarte — jedna dimenzija ili najniži Cpk. */
function fokusPozicijaMer(karakteristike, sva, poNok, nPodgrupa) {
  const pozicije = [...new Set((karakteristike || []).map((k) => k.pozicija).filter(Boolean))];
  if (!pozicije.length) return null;

  if (pozicije.length === 1) {
    return karakteristike.find((k) => k.pozicija === pozicije[0]) || null;
  }

  const kandidati = [];
  if (poNok[0]?.naziv) {
    const karPareto = karakteristike.find((k) => k.pozicija === poNok[0].naziv);
    if (karPareto) kandidati.push(karPareto);
  }
  pozicije.forEach((p) => {
    const kar = karakteristike.find((k) => k.pozicija === p);
    if (kar && !kandidati.some((k) => k.pozicija === p)) kandidati.push(kar);
  });

  let najbolji = kandidati[0] || null;
  let minCpk = Infinity;
  for (const kar of kandidati) {
    const ms = sva.filter((m) => m.pozicija === kar.pozicija);
    const { cpk } = kapabilitetPozicije(ms, kar, nPodgrupa);
    if (cpk != null && cpk < minCpk) {
      minCpk = cpk;
      najbolji = kar;
    }
  }
  return najbolji;
}

function sparkIzXbarR(spc) {
  if (!spc) return { xbar: [], r: [] };
  return {
    xbar: (spc.xbarPodaci || []).slice(-8).map((d) => ({
      v: d.val,
      bad: !!(d.upozVanGranica || d.upozObrazac),
    })),
    r: (spc.rPodaci || []).slice(-8).map((d) => ({
      v: d.val,
      bad: !!(d.upozVanGranica || d.upozObrazac),
    })),
  };
}

/** Izračun snapshot-a merljivog SPC iz već učitanih podataka (ista logika kao MerljiveSpcKarte). */
export function buildSpcSnapshotMerljive({
  merenja,
  karakteristike,
  pozicija = "",
  nPodgrupa = 5,
  kpiPeriod = null,
  idDeo,
  nazivDela = "",
  period = "7",
} = {}) {
  const deo = String(idDeo || "").trim().toUpperCase();
  if (!deo) return null;

  const kars = (karakteristike || []).filter((k) => k.id_deo === deo);
  const sva = merenja || [];
  const uPeriodu = filtrirajPeriod(sva, period);
  const poNok = paretoNokPoPoziciji(uPeriodu, 3);
  const poNokSve = paretoNokPoPoziciji(sva, 3);

  const poz = String(pozicija || "").trim();
  let karFokus;
  let msFokus;
  if (poz) {
    karFokus = kars.find((k) => k.pozicija === poz) || null;
    msFokus = sva;
  } else {
    karFokus = fokusPozicijaMer(kars, sva, poNokSve, nPodgrupa);
    msFokus = karFokus ? sva.filter((m) => m.pozicija === karFokus.pozicija) : [];
  }

  const kap = karFokus ? kapabilitetPozicije(msFokus, karFokus, nPodgrupa) : {
    cp: null, cpk: null, podgrupe: 0, spc: null, imr: null,
  };

  let vanKontrole = 0;
  let sparkXbar = [];
  let sparkR = [];
  if (kap.spc) {
    vanKontrole = brojVanKontroleXbarR(kap.spc);
    const sp = sparkIzXbarR(kap.spc);
    sparkXbar = sp.xbar;
    sparkR = sp.r;
  }

  const agregat = agregatKvaliteta(
    sva,
    !poz && kpiPeriod?.ukupno_kom > 0 ? kpiPeriod : null,
  );
  const sigma = sigmaProcesa(
    kap,
    kap.imr?.sigmaHat || kap.spc?.sigmaHat || 0,
    agregat.dpmo ?? 0,
  );

  const status = statusSpcMer({
    cpk: kap.cpk,
    vanKontrole,
    merenja: poz ? sva.length : msFokus.length,
    podgrupe: kap.podgrupe,
  });

  return {
    modul: "merljive",
    idDeo: deo,
    nazivDela,
    status,
    cp: kap.cp ?? null,
    cpk: kap.cpk ?? null,
    sigma,
    dpmo: agregat.dpmo,
    ppm: agregat.n > 0 ? calcPPM(agregat.nok, agregat.n) : null,
    p: agregat.p,
    rty: agregat.rty,
    pozicija: poz || karFokus?.pozicija || null,
    pozicijaIzabrana: !!poz,
    vanKontrole,
    podgrupe: kap.podgrupe,
    merenjaUk: sva.length,
    merenjaPozicija: poz ? sva.length : msFokus.length,
    pareto: poNok,
    sparkXbar,
    sparkR,
    period,
    nPodgrupa,
  };
}

/** SPC snapshot za merljive — Cpk po dimenziji, Pareto, DPMO kao SPC karte. */
export async function fetchSpcSnapshotMerljive(supabase, {
  idDeo, smena, period = "7", pozicija, datumOd, datumDo,
} = {}) {
  const deo = String(idDeo || "").trim().toUpperCase();
  if (!deo) return null;

  let qMer = supabase.from("merenja_varijabilna")
    .select("datum,smena,status,id_deo,pozicija,vrednost_raw,vrednost_dec,created_at")
    .eq("id_deo", deo)
    .order("datum", { ascending: true })
    .order("created_at", { ascending: true });
  if (pozicija) qMer = qMer.eq("pozicija", pozicija);
  if (datumOd) qMer = qMer.gte("datum", datumOd);
  if (datumDo) qMer = qMer.lte("datum", datumDo);
  qMer = primeniSmena(qMer, smena);

  const { data: merenja, error: merErr } = await qMer;
  if (merErr) throw merErr;

  const { data: karakteristike } = await supabase
    .from("karakteristike_merljive")
    .select("id_deo,pozicija,lsl,usl,nominala,jedinica")
    .eq("id_deo", deo);

  const { data: sopRows } = await supabase
    .from("sop_deo_varijabilni")
    .select("id_deo,naziv_dela,broj_merenja")
    .eq("id_deo", deo);

  const nPodgrupa = brojMerenjaIzSop(sopRows || [], deo);
  const sop = sopRows?.[0];

  let kpiPeriod = null;
  try {
    const kpiRows = await fetchKpiUnos(supabase, {
      modul: "merljive",
      idDeo: deo,
      datumOd: datumOd || undefined,
      datumDo: datumDo || undefined,
      smena: smena !== "" && smena != null ? Number(smena) : undefined,
      limit: 500,
    });
    kpiPeriod = agregirajKpiUnos(kpiRows, { modul: "merljive" });
  } catch {
    kpiPeriod = null;
  }

  return buildSpcSnapshotMerljive({
    merenja: merenja || [],
    karakteristike: karakteristike || [],
    pozicija,
    nPodgrupa,
    kpiPeriod,
    idDeo: deo,
    nazivDela: sop?.naziv_dela || "",
    period,
  });
}

/** SPC snapshot za atributivne — p, DPMO, Pareto grešaka, sigma. */
export async function fetchSpcSnapshotAtributivne(supabase, { idDeo, smena, period = "7" } = {}) {
  const deo = String(idDeo || "").trim().toUpperCase();
  if (!deo) return null;

  let qLog = supabase.from("kontrolni_log")
    .select("datum,smena,status,ok_kolicina,nok_kolicina,ukupno_merenja,kom_nok,greska_naziv,id_deo")
    .eq("id_deo", deo)
    .order("datum", { ascending: true });
  qLog = primeniSmena(qLog, smena);

  const { data: log, error: logErr } = await qLog;
  if (logErr) throw logErr;

  const sva = log || [];
  const uPeriodu = filtrirajPeriod(sva, period);
  const stat = statAtributivneRedovi(uPeriodu);
  const grupeSve = groupSpcRows(sva, "dan");
  const { van: vanKontrole, spark: sparkP } = brojVanKontroleP(grupeSve);

  const dpmo = stat.n > 0 ? calcDPMO(stat.nok, stat.n) : null;
  const ppm = stat.n > 0 ? calcPPM(stat.nok, stat.n) : null;
  const sigma = dpmo != null ? sigmaIzDPMO(dpmo) : null;
  const pareto = buildParetoFromLog(uPeriodu, 3);

  const { data: deoRow } = await supabase
    .from("delovi")
    .select("naziv_dela")
    .eq("id_deo", deo)
    .maybeSingle();

  const status = statusSpcAtr({
    dpmo: dpmo ?? 0,
    vanKontrole,
    n: stat.n,
  });

  return {
    modul: "atributivne",
    idDeo: deo,
    nazivDela: deoRow?.naziv_dela || "",
    status,
    p: stat.n > 0 ? +((stat.nok / stat.n) * 100).toFixed(2) : null,
    dpmo,
    ppm,
    sigma,
    vanKontrole,
    grupe: grupeSve.length,
    unosaUk: sva.length,
    pareto,
    sparkP,
    period,
  };
}

export async function fetchSpcSnapshot(supabase, { modul, idDeo, smena, period, pozicija } = {}) {
  if (modul === "merljive") {
    return fetchSpcSnapshotMerljive(supabase, { idDeo, smena, period, pozicija });
  }
  return fetchSpcSnapshotAtributivne(supabase, { idDeo, smena, period });
}
