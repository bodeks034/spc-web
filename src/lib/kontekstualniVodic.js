/**
 * Kontekstualni vodič i scoring — pravila iz baze + pragovi, bez LLM-a.
 */

import { fetchKpiUnos, agregirajKpiUnos } from "./kpiUnos.js";
import { brojOtvorenihNcr, fetchNcrCapaLista } from "./ncrCapa.js";
import { aktivneAkcijeZaAnalitiku } from "./reakcioniPlanSpc.js";
import { WORKFLOW_TIP } from "./workflowAkcije.js";
import { primeniLinijaFilter } from "./digestLinija.js";

const TEZINE = {
  alarmKriticno: 35,
  alarmVisok: 22,
  ncrKriticno: 28,
  ncrVisok: 18,
  ncrOtvoreni: 8,
  nokUzastopna: 25,
  cpkNizak: 20,
  nemaDorade: 15,
  rokProsao: 22,
};

function danasIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Da li postoji unos / merenje za izabrani dan i filter. */
export function imaAktivnostDanas(kontekst = {}) {
  const { logRedovi = [], kpiRows = [], nokUzastopna = 0 } = kontekst;
  return logRedovi.length > 0 || kpiRows.length > 0 || nokUzastopna >= 2;
}

/** Filtriraj operativne alarme relevantne za konkretan deo i današnji kontekst. */
export function filtrirajAlarmeZaDeo(alarmi = [], idDeo, kontekst = {}) {
  const id = String(idDeo || "").trim().toUpperCase();
  const danasAktivno = imaAktivnostDanas(kontekst);

  return (alarmi || []).filter((a) => {
    const aid = String(a.id || "").toLowerCase();
    if (aid.startsWith("eskalacije") || aid === "oee_nizak" || aid === "offline") return false;
    if (aid === "nok_danas") return danasAktivno;
    if (aid.startsWith("deo_nok_")) {
      const deoIzId = aid.replace("deo_nok_", "").toUpperCase();
      return deoIzId === id;
    }
    const deo = String(a.id_deo || a.meta?.id_deo || "").toUpperCase();
    if (deo) return deo === id;
    return false;
  });
}

export function brojUzastopnihNok(redovi = [], poljePozicija = "pozicija") {
  let max = 0;
  let tren = 0;
  let poslednjaPoz = null;
  let pozicijaZaMax = null;
  for (const r of redovi) {
    const nok = (r.status || "").toUpperCase() === "NOK"
      || Number(r.nok_kolicina) > 0;
    const poz = r[poljePozicija] || r.greska_naziv || "?";
    if (nok) {
      if (poz === poslednjaPoz) tren += 1;
      else {
        poslednjaPoz = poz;
        tren = 1;
      }
      if (tren >= max) {
        max = tren;
        pozicijaZaMax = poz;
      }
    } else {
      tren = 0;
      poslednjaPoz = null;
    }
  }
  return { max, pozicija: pozicijaZaMax };
}

export function izracunajRizikSkor({
  alarmi = [],
  ncrLista = [],
  kpiAgg = null,
  nokUzastopna = 0,
  nokPozicija = null,
  cpk = null,
  nemaDorade = false,
} = {}) {
  let skor = 0;
  const razlozi = [];

  const kriticni = alarmi.filter((a) => a.nivo === "kriticno" || a.nivo === "visok");
  if (kriticni.length) {
    skor += kriticni.some((a) => a.nivo === "kriticno") ? TEZINE.alarmKriticno : TEZINE.alarmVisok;
    razlozi.push(`${kriticni.length} operativni alarm`);
  }

  const ncrKrit = ncrLista.filter((n) => n.prioritet === "kriticno" || n.prioritet === "visok");
  if (ncrKrit.length) {
    skor += ncrKrit.some((n) => n.prioritet === "kriticno") ? TEZINE.ncrKriticno : TEZINE.ncrVisok;
    razlozi.push(`${ncrKrit.length} NCR visok prioritet`);
  } else if (ncrLista.length) {
    skor += Math.min(TEZINE.ncrOtvoreni * ncrLista.length, 24);
    razlozi.push(`${ncrLista.length} otvoren NCR`);
  }

  const rokProsao = ncrLista.filter((n) => n.rok && n.rok < danasIso());
  if (rokProsao.length) {
    skor += TEZINE.rokProsao;
    razlozi.push(`${rokProsao.length} NCR — rok prošao`);
  }

  if (nokUzastopna >= 3) {
    skor += TEZINE.nokUzastopna;
    razlozi.push(`${nokUzastopna} NOK uzastopna${nokPozicija ? ` (poz. ${nokPozicija})` : ""}`);
  } else if (nokUzastopna >= 2) {
    skor += Math.round(TEZINE.nokUzastopna * 0.6);
    razlozi.push(`${nokUzastopna} NOK uzastopna`);
  }

  if (Number.isFinite(cpk) && cpk < 1.33) {
    skor += TEZINE.cpkNizak;
    razlozi.push(`Cpk ${cpk} < 1,33`);
  }

  if (nemaDorade && (kpiAgg?.neusaglaseno > 0 || nokUzastopna > 0)) {
    skor += TEZINE.nemaDorade;
    razlozi.push("nema unosa dorade posle neusaglašenih");
  }

  if (kpiAgg?.neusaglaseno > 0 && !kpiAgg?.dorada) {
    skor += 10;
    if (!razlozi.some((r) => r.includes("dorade"))) {
      razlozi.push("neusaglašeno bez dorade");
    }
  }

  skor = Math.min(100, Math.round(skor));
  const nivo = skor >= 70 ? "kriticno" : skor >= 45 ? "visok" : skor >= 25 ? "srednji" : "nizak";
  return { skor, razlozi, nivo };
}

export function generisiKorake(kontekst = {}) {
  const koraci = [];
  const {
    idDeo,
    radniNalog,
    smena,
    datum,
    modul = "merljive",
    nokUzastopna = 0,
    nokPozicija,
    kpiAgg,
    ncrLista = [],
    alarmi = [],
    reakcije = [],
    poslednjaKalibracija,
  } = kontekst;

  if (nokUzastopna >= 3) {
    koraci.push({
      id: "pauziraj_seriju",
      redosled: 0,
      upozorenje: `⛔ ${nokUzastopna} NOK uzastopna — pauziraj seriju`,
      tekst: "Zahtevaj odobrenje QA pre nastavka proizvodnje",
      akcija: WORKFLOW_TIP.ODOBRENJA,
      payload: { idDeo, radniNalog, smena, modul },
    });
  }

  if (nokUzastopna >= 2) {
    koraci.push({
      id: "nok_uzastopna",
      redosled: 1,
      upozorenje: `⚠ ${nokUzastopna} NOK uzastopna${nokPozicija ? ` na poz. ${nokPozicija}` : ""}`,
      tekst: nokPozicija
        ? `Proveri alat / poziciju ${nokPozicija}${poslednjaKalibracija ? ` (kalibracija: ${poslednjaKalibracija})` : ""}`
        : "Proveri alat i podešavanje pre nastavka",
      akcija: WORKFLOW_TIP.KALIBRACIJA,
      payload: { idDeo, radniNalog, smena, modul },
    });
  }

  const visokAlarm = alarmi.find((a) => {
    const aid = String(a.id || "").toLowerCase();
    if (aid.startsWith("eskalacije")) return false;
    return a.nivo === "kriticno" || a.nivo === "visok";
  });
  if (visokAlarm) {
    koraci.push({
      id: "alarm_ncr",
      redosled: 2,
      upozorenje: visokAlarm.naslov,
      tekst: "Otvori NCR sa predlogom iz alarma",
      akcija: WORKFLOW_TIP.NCR_IZ_ALARMA,
      payload: {
        id_deo: idDeo || visokAlarm.id_deo,
        opis: visokAlarm.opis || visokAlarm.naslov,
        prioritet: visokAlarm.nivo === "kriticno" ? "kriticno" : "visok",
        izvor: "operativni_alarm",
        modul,
      },
    });
  }

  if (kpiAgg?.neusaglaseno > 0 && (kpiAgg.dorada || 0) < kpiAgg.neusaglaseno) {
    koraci.push({
      id: "kpi_dorada",
      redosled: 3,
      tekst: `Unesi doradu i OK posle dorade (${kpiAgg.neusaglaseno} neusaglašenih)`,
      akcija: WORKFLOW_TIP.KPI_DORADA,
      payload: { idDeo, datum, smena, radniNalog, modul },
    });
  }

  for (const r of reakcije.slice(0, 2)) {
    koraci.push({
      id: `reakcija_${r.id}`,
      redosled: 4,
      tekst: `${r.situacija} → ${r.akcija}`,
      akcija: null,
    });
  }

  const ncrBez8d = ncrLista.find((n) => n.status === "otvoren" || n.status === "analiza");
  if (ncrBez8d) {
    koraci.push({
      id: "ncr_8d",
      redosled: 5,
      tekst: `NCR ${ncrBez8d.broj_ncr} — pokreni 8D analizu`,
      akcija: WORKFLOW_TIP.OSMD_8D,
      payload: { ncr: ncrBez8d },
    });
  }

  if (idDeo && (imaAktivnostDanas(kontekst) || ncrLista.length > 0 || nokUzastopna >= 2)) {
    koraci.push({
      id: "trasabilitet",
      redosled: 9,
      tekst: "Pregledaj trasabilitet lanca za deo",
      akcija: WORKFLOW_TIP.TRASABILITET,
      payload: { idDeo, modul },
    });
  }

  return koraci.sort((a, b) => a.redosled - b.redosled).slice(0, 6);
}

export async function fetchKontekstDeo(supabase, {
  idDeo,
  modul = "merljive",
  datum,
  smena,
  radniNalog,
} = {}) {
  const id = String(idDeo || "").trim().toUpperCase();
  if (id.length < 3) return null;

  const mod = String(modul || "merljive").toLowerCase();
  const iso = datum || danasIso();

  const [kpiRows, ncrOtvoreni, ncrLista] = await Promise.all([
    fetchKpiUnos(supabase, {
      modul: mod,
      idDeo: id,
      datum: iso,
      smena: smena || undefined,
      radniNalog: radniNalog || undefined,
      limit: 40,
    }),
    brojOtvorenihNcr(supabase, { idDeo: id }),
    fetchNcrCapaLista(supabase, { status: "otvoreni", idDeo: id, limit: 15 }),
  ]);

  let logRedovi = [];
  if (mod === "merljive") {
    const { data } = await supabase
      .from("merenja_varijabilna")
      .select("status,pozicija,created_at,datum,smena")
      .eq("id_deo", id)
      .eq("datum", iso)
      .order("created_at", { ascending: false })
      .limit(40);
    logRedovi = data || [];
  } else {
    const { data } = await supabase
      .from("kontrolni_log")
      .select("status,nok_kolicina,greska_naziv,created_at,datum,smena")
      .eq("id_deo", id)
      .eq("datum", iso)
      .order("created_at", { ascending: false })
      .limit(40);
    logRedovi = data || [];
  }

  const { max: nokUzastopna, pozicija: nokPozicija } = brojUzastopnihNok(
    logRedovi,
    mod === "merljive" ? "pozicija" : "greska_naziv",
  );

  const kpiAggRaw = agregirajKpiUnos(kpiRows, { modul: mod });
  const kpiAgg = kpiAggRaw ? { ...kpiAggRaw, ...(kpiAggRaw.kpi || {}) } : null;
  const nemaDorade = kpiAgg?.neusaglaseno > 0 && !(kpiAgg?.dorada > 0);

  const reakcije = aktivneAkcijeZaAnalitiku({
    nokUzastopna,
    nokSerija: nokUzastopna >= 3,
  });

  return {
    idDeo: id,
    modul: mod,
    datum: iso,
    smena,
    radniNalog,
    kpiRows,
    kpiAgg,
    ncrOtvoreni,
    ncrLista,
    logRedovi,
    nokUzastopna,
    nokPozicija,
    nemaDorade,
    reakcije,
    alarmi: [],
  };
}

export async function fetchPrioritetSmene(supabase, {
  modul = "merljive",
  datum,
  smena,
  linija = null,
  limit = 12,
} = {}) {
  const iso = datum || danasIso();
  const mod = String(modul || "merljive").toLowerCase();
  const tabela = mod === "merljive" ? "merenja_varijabilna" : "kontrolni_log";
  const polje = mod === "merljive" ? "pozicija" : "greska_naziv";

  const select = mod === "merljive"
    ? `id_deo,status,created_at,${polje}`
    : `id_deo,status,nok_kolicina,created_at,${polje}`;

  let q = supabase.from(tabela).select(select)
    .eq("datum", iso);
  if (smena) q = q.eq("smena", Number(smena));
  q = primeniLinijaFilter(q, linija);
  const { data: logData } = await q.order("created_at", { ascending: false }).limit(400);

  const poDeu = new Map();
  for (const r of logData || []) {
    const deo = String(r.id_deo || "").toUpperCase();
    if (!deo) continue;
    if (!poDeu.has(deo)) poDeu.set(deo, []);
    poDeu.get(deo).push(r);
  }

  const delovi = [...poDeu.keys()];
  const rezultati = await Promise.all(delovi.map(async (idDeo) => {
    const ctx = await fetchKontekstDeo(supabase, { idDeo, modul: mod, datum: iso, smena });
    const { max } = brojUzastopnihNok(ctx?.logRedovi || [], polje);
    const rizik = izracunajRizikSkor({
      ncrLista: ctx?.ncrLista || [],
      kpiAgg: ctx?.kpiAgg,
      nokUzastopna: max,
      nemaDorade: ctx?.nemaDorade,
    });
    return {
      idDeo,
      skor: rizik.skor,
      nivo: rizik.nivo,
      razlozi: rizik.razlozi,
      ncrOtvoreni: ctx?.ncrOtvoreni || 0,
      neusaglaseno: ctx?.kpiAgg?.neusaglaseno || 0,
    };
  }));

  return rezultati
    .filter((r) => r.skor > 0)
    .sort((a, b) => b.skor - a.skor)
    .slice(0, limit);
}

export function obogatiKontekstAlarmima(kontekst, alarmi = []) {
  if (!kontekst) return null;
  const id = kontekst.idDeo;
  const relevantni = filtrirajAlarmeZaDeo(alarmi, id, kontekst);
  const danasImaUnos = imaAktivnostDanas(kontekst);
  const imaOtvorenNcr = (kontekst.ncrLista || []).length > 0;

  if (!danasImaUnos && !imaOtvorenNcr) {
    return {
      ...kontekst,
      alarmi: [],
      rizik: { skor: 0, razlozi: [], nivo: "nizak" },
      koraci: [],
    };
  }

  const rizik = izracunajRizikSkor({
    alarmi: relevantni,
    ncrLista: kontekst.ncrLista,
    kpiAgg: kontekst.kpiAgg,
    nokUzastopna: kontekst.nokUzastopna,
    nokPozicija: kontekst.nokPozicija,
    nemaDorade: kontekst.nemaDorade,
  });
  const koraci = generisiKorake({ ...kontekst, alarmi: relevantni });
  return { ...kontekst, alarmi: relevantni, rizik, koraci };
}
