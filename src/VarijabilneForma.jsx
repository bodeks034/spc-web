import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { KontrolnaLista, ZahtevPrekid, ucitajOdobrenPrekid, zatvoriPrekidZahtev } from "./lib/kontrolaSesije.jsx";
import {
  setListaOkSession,
  getListaOkSession,
  procitajSmenuIzStorage,
} from "./lib/kontrolaLista.js";
import { useAutoSmena } from "./hooks/useAutoSmena.js";
import {
  toDec, isStepen, koristiUgaoUnosKolone, inputModeMerenja,
  validirajUnos, proveriOkNok, bojaMerenja, bojaUnosMerenja,
  formatOpsegPlausibilnosti,
  svaMerenjaZavrsena, imaBiloSta, grupeMerenja, grupeMerenjaSaMetom,
  brojMerenjaZaSeriju, labelSerije, metaSerije, koloneZaGrupu, koloneFaiZaDeo, faiPotrebanZaDeo,
  brojPotrebnihZaKolonu, kolonePetStranica,
  filterKeyUnos, sanitizujInputMerenja, unosMerenjaSpremanZaDodavanje, unosMerenjaNepotpun, primeniTastMerenja,
  unosKaoUgao, jeMerljivaKarakteristika,
  idSpremanZaUcitavanje, porukaNepoznatIdDeo,
} from "./lib/varijabilneUtils.js";
import { propagirajMetaKarakteristika } from "./lib/definicijaKarakteristika.js";
import { dodeliSerijeMerenja } from "./lib/karakteristikaMerljive.js";
import MerljiveExcelPanel from "./MerljiveExcelPanel.jsx";
import MerljiveSpcKarte from "./MerljiveSpcKarte.jsx";
import InzenjerExcelPanel from "./InzenjerExcelPanel.jsx";
import MerilaMsaHub from "./components/MerilaMsaHub.jsx";
import KontrolniPlanPanel from "./components/KontrolniPlanPanel.jsx";
import FaiUnosTraka from "./components/FaiUnosTraka.jsx";
import { ucitajOdobrenFai, snimiFaiUnos, odobriFai, ucitajPoslednjiFai } from "./lib/faiWorkflow.js";
import FotoNokUnos from "./components/FotoNokUnos.jsx";
import KalibracijaMerilaPanel from "./components/KalibracijaMerilaPanel.jsx";
import RadniNaloziPanel from "./components/RadniNaloziPanel.jsx";
import {
  IzvestajSmeneMerljive, CiljeviMerljive, KupacMerljive, StabilnostMerljive, HeatmapTabMerljive,
} from "./components/MerljiveOplTabovi.jsx";
import { supabase, supabase as supabaseShared } from "./lib/supabaseClient.js";
import {
  useEkran,
  resetSkrolPosleRotacije,
  layoutListaMerljive,
  layoutPokaYokeMerljive,
  DIM_GENERALIJE_RED,
  flexPolje,
  dimKolonaUnos,
  onFocusTastatura,
} from "./layout/index.js";
import SkartDoradaOeePanel, { OeeKpiTab } from "./components/SkartDoradaOeePanel.jsx";
import KpiSerijaPanel from "./components/KpiSerijaPanel.jsx";
import KpiDoradaHub from "./components/KpiDoradaHub.jsx";
import InteligencijaDeoPanel from "./components/InteligencijaDeoPanel.jsx";
import { podrazumevaniKpiIzMerenja, agregirajKpiPoSerijama } from "./lib/oeeKpi.js";
import { snimiKpiUnos, snimiIliAzurirajKpiUnos, pronadjiKpiUnos, kpiVrednostiIzDb, porukaKpiGreske, fetchKpiUnos } from "./lib/kpiUnos.js";
import { ucitajPlanUzorkovanja, izracunajPlanUzorkovanja, datumSrUIso } from "./lib/planUzorkovanja.js";
import { useOfflineQueue } from "./lib/offlineQueue.js";
import { useSpcAlarmGate } from "./hooks/useSpcAlarmGate.js";
import SpcAlarmBlokada from "./components/SpcAlarmBlokada.jsx";
import { proveriIKreirajAlarmeNokSerije } from "./lib/spcAlarmWorkflow.js";
import { mozeTabMerljive, jeKvalitetIliVise, jeAdmin, opisUloge, mozeAnalitika as mozeAnalitikaUloga, mozePrebacivanjeRezimaUTacci, jeKontrolorLinija, jeLinijaUloga, pocetniKorakUnosMer, mozeInzenjerExcel, mozeInzenjerExcelUvoz } from "./lib/uloge.js";
import {
  mapaMerila,
  upozorenjaInstrumentaZaKolone,
  kalibracijaBlokiraUnos,
  tekstInstrumentaSaBrojem,
} from "./lib/meriloStatus.js";
import {
  ucitajOdobrenuKalibraciju,
  ucitajCekaKalibraciju,
  adminPostaviOdobrenjeKalibracije,
  zatvoriKalibracijaOdobrenje,
} from "./lib/kalibracijaOdobrenje.js";
import ZahtevKalibracija from "./components/ZahtevKalibracija.jsx";
import AdminKalibracijaPanel from "./components/AdminKalibracijaPanel.jsx";
import UnosPokaYokeKorak from "./components/UnosPokaYokeKorak.jsx";
import OfflineSyncPanel from "./components/OfflineSyncPanel.jsx";
import KarakteristikeGraniceEditor from "./components/KarakteristikeGraniceEditor.jsx";
import TrasabilitetPanel from "./components/TrasabilitetPanel.jsx";
import { ensureSesija, novaSesija, getAktivnaSesija } from "./lib/spcSesija.js";
import SchemaStatusPanel from "./components/SchemaStatusPanel.jsx";
import NotifikacijePodesavanja from "./components/NotifikacijePodesavanja.jsx";
import MeriloBarkodUputstvo from "./components/MeriloBarkodUputstvo.jsx";
import DigitalnoMeriloPanel from "./components/DigitalnoMeriloPanel.jsx";
import CrtezZoomViewer from "./components/CrtezZoomViewer.jsx";
import CrtezPregledPanel from "./components/CrtezPregledPanel.jsx";
import { fetchPlaniranoKomZaDeo } from "./lib/zajednickiDashboard.js";
import { parsiBarkod, primeniParsiraniBarkod, useBarcodeScanner, idBarkodInputHandleri } from "./lib/barkod.js";
import {
  ucitajAktivniRadniNalog,
  ucitajNalogZaDeoIRn,
  izaberiRadniNalog,
  proveriRadniNalogUpozorenje,
  formatNalogToast,
} from "./lib/radniNalog.js";
import {
  buildSopMapPoPogonu,
  sopZaPogon,
  pogonIzRn,
  pogoniZaDeoSvi,
  pogoniZaUcitavanjeMerljive,
  pogoniIzKarakteristikaSaMerenjima,
  labelPogona,
  jePogonOmogucen,
  filtrirajKarakteristikePoPogonu,
  naloziZaDeoPoPogonu,
} from "./lib/pogonSop.js";
import { radniNalogIzDeoPogona } from "./lib/syncSifrarnikIzMerljivih.js";
import IdDeoBarkodRed from "./components/IdDeoBarkodRed.jsx";
import SmenaIdUnosRed from "./components/SmenaIdUnosRed.jsx";
import SmenaAutoPrikaz from "./components/SmenaAutoPrikaz.jsx";
import PogonIzborPanel from "./components/PogonIzborPanel.jsx";
import { indeksSledecePrazno } from "./lib/meriloUvoz.js";
import { porukaDbGreske } from "./lib/dbGreske.js";
import LinijaWizardNav, { KORACI_MERLJIVE_LINIJA, KORACI_MERLJIVE_KONTROLOR } from "./components/LinijaWizardNav.jsx";
import MobilniMerljiviUnos from "./components/MobilniMerljiviUnos.jsx";
import SpcBaselinePanel from "./components/SpcBaselinePanel.jsx";
import MerljiveLinijaLeviPanel from "./components/MerljiveLinijaLeviPanel.jsx";
import AppHeader from "./components/AppHeader.jsx";
import MerljivaMobTabKarusel from "./components/MerljivaMobTabKarusel.jsx";
import TastaturaBrojeviMerljive from "./components/TastaturaBrojeviMerljive.jsx";
import { ucitajPrikazSliku } from "./lib/slikePaths.js";

/** Vidljiva greška kad ID nije učitan (linija + analitika). */
function MerljiveGreskaUcitavanja({
  C, idDeo, ucitava, ucitavaDeo, nalogUcitava, poruka, greskaDb, trebaIzborPogona,
  karakteristikeBroj = 0, mozeAdmin = false, kompakt = false,
}) {
  if (!idDeo || !idSpremanZaUcitavanje(idDeo) || ucitava) return null;
  const ucitavaSada = ucitavaDeo || nalogUcitava;
  const imaGresku = !!(poruka || greskaDb);
  const praznaBaza = karakteristikeBroj === 0;

  const ucitavanjePanel = (tekst = "Učitavam NM/NT šifrarnik…") => (
    <div style={{
      flex: kompakt ? undefined : 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: kompakt ? 16 : 24,
      color: C.sivi,
      fontSize: kompakt ? 12 : 13,
      minHeight: kompakt ? 80 : 120,
      width: kompakt ? "100%" : undefined,
    }}>
      {tekst}
    </div>
  );

  /** ID validan, baza OK — čekamo ucitajDeo (bez crvenog „uvezi Excel“). */
  if (!imaGresku && !praznaBaza) {
    return ucitavanjePanel(ucitavaSada ? "Učitavam deo i radni nalog…" : "Učitavam NM/NT šifrarnik…");
  }

  if (!imaGresku && praznaBaza && ucitavaSada) {
    return ucitavanjePanel();
  }

  const kutija = (sadrzaj, extra = null) => (
    <div style={{
      flex: kompakt ? undefined : 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: kompakt ? "12px 10px" : 24,
      margin: kompakt ? "8px 0" : "8px 14px 0",
      background: `${C.crvena}12`,
      border: `2px solid ${C.crvena}`,
      borderRadius: 12,
      textAlign: "center",
      minHeight: kompakt ? undefined : 120,
      width: kompakt ? "100%" : undefined,
    }}>
      <div style={{ fontSize: kompakt ? 22 : 28 }}>⚠</div>
      <div style={{ color: C.crvena, fontWeight: 700, fontSize: kompakt ? 12 : 14 }}>
        Merljive karakteristike nisu učitane
      </div>
      <div style={{ color: C.tekst, fontSize: kompakt ? 11 : 12, lineHeight: 1.6, maxWidth: 420 }}>
        {sadrzaj}
      </div>
      {extra}
    </div>
  );
  const tekst = poruka || greskaDb || (
    <>
      Admin → uvezi <strong style={{ color: C.tekst }}>SPC_merljive.xlsx</strong>
      {" "}(tab <code>karakteristike_merljive</code>), pa Ctrl+F5.
      {trebaIzborPogona ? " Izaberi pogon (A = Ulazna kontrola, B = Preseraj, …)." : null}
    </>
  );
  const brojUKesu = (mozeAdmin || karakteristikeBroj > 0) && (
    <div style={{ marginTop: 8, color: C.sivi, fontSize: kompakt ? 10 : 11 }}>
      U aplikaciji je učitano{" "}
      <strong style={{ color: karakteristikeBroj > 0 ? C.zelena : C.crvena }}>
        {karakteristikeBroj}
      </strong>
      {" "}redova iz baze
      {karakteristikeBroj === 0 && mozeAdmin ? " — Admin → Excel → Uvezi merljive, pa Ctrl+F5" : "."}
    </div>
  );
  return kutija(
    <>
      {tekst}
      {brojUKesu}
    </>,
    ucitavaSada ? (
      <div style={{ color: C.sivi, fontSize: kompakt ? 10 : 11, marginTop: 4 }}>
        Proveravam ponovo…
      </div>
    ) : null,
  );
}

function danasSr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function prazneKolone(n) {
  return koloneZaGrupu([], "", "", n);
}

export default function VarijabilneForma({ korisnik, onOdjava, onNazad, C, onToggleTema, temaTamna, unosRezim = "rucni", rezimRada = "analitika", onPromeniRezim, onOtvori8D, licenca = null }) {
  const digitalniUnos = unosRezim === "digital";
  const ekran = useEkran();
  const { viewportKey } = ekran;
  const koristiTastMerenja = ekran.mob || ekran.tablet;

  const jeLinija = rezimRada === "linija";
  const kontrolorLinija = jeKontrolorLinija(korisnik?.uloga, rezimRada);
  const koristiMobLinija = jeLinija && ekran.linijaUredjaj;
  const L = layoutListaMerljive(ekran, { koristiMobLinija });
  const P = layoutPokaYokeMerljive(ekran);
  const [tab, setTab] = useState("unos");
  const [meriloPovezano, setMeriloPovezano] = useState(false);
  const [meriloSimulacija, setMeriloSimulacija] = useState(false);
  const meriloStopRef = useRef(null);
  const meriloSimulirajRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [logD, setLogD] = useState([]);
  const [loadLog, setLoadLog] = useState(false);
  const mozeAdmin = jeAdmin(korisnik?.uloga);
  const mozeAnalitika = mozeAnalitikaUloga(korisnik?.uloga);

  const registerMeriloStop = useCallback((fn) => {
    meriloStopRef.current = fn;
  }, []);

  const registerMeriloSimuliraj = useCallback((fn) => {
    meriloSimulirajRef.current = fn;
  }, []);

  const onMeriloPovezanChange = useCallback((povezan, opts = {}) => {
    setMeriloPovezano(povezan);
    setMeriloSimulacija(!!opts.simulacija);
  }, []);

  const addToast = useCallback((tekst, tip = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { tekst, tip, id }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  }, []);

  const onFlushed = useCallback((res) => {
    if (res.syncedJobs > 0) {
      addToast(`✓ Sinhronizovano ${res.syncedJobs} offline paketa (${res.syncedRows} stavki)`, "uspeh");
    }
  }, [addToast]);

  const {
    online, counts: offlineCounts, addMerljiveSerija, flushQueue,
  } = useOfflineQueue(supabase, { onFlushed });

  useEffect(() => {
    if (tab !== "log") return;
    let ok = true;
    (async () => {
      setLoadLog(true);
      const { data, error } = await supabase
        .from("merenja_varijabilna")
        .select("datum,smena,id_deo,pozicija,vrednost_raw,status,linija,kontrolor,created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (ok) {
        if (error) addToast(error.message, "greska");
        else setLogD(data || []);
        setLoadLog(false);
      }
    })();
    return () => { ok = false; };
  }, [tab, addToast]);

  useEffect(() => {
    if (tab !== "heatmap") return;
    let ok = true;
    const od = new Date();
    od.setDate(od.getDate() - 30);
    (async () => {
      const { data, error } = await supabaseShared.from("merenja_varijabilna")
        .select("datum,smena,status,id_deo")
        .gte("datum", od.toISOString().split("T")[0])
        .order("datum", { ascending: true });
      if (!ok) return;
      if (error) addToast(error.message, "greska");
      else setMerenjaHeatmap(data || []);
    })();
    return () => { ok = false; };
  }, [tab, addToast]);

  const TABOVI = [
    ["unos", "UNOS"],
    ["karte", "SPC KARTE"],
    ["stanje", "STANJE"],
    ["smena", "SMENA"],
    ["msa", "MSA / MERILA"],
    ["kplan", "KONTROLNI PLAN"],
    ["heatmap", "HEAT MAP"],
    ["ciljevi", "CILJEVI"],
    ["nalozi", "NALOZI"],
    ["kupac", "KUPAC"],
    ["stabilnost", "STABILNOST"],
    ["oee", "OEE"],
    ["log", "LOG"],
    ...(mozeAnalitika && !jeLinija ? [["trasabilitet", "TRASABILITET"]] : []),
    ...(mozeInzenjerExcel(korisnik?.uloga, rezimRada) ? [["excel", "EXCEL"]] : []),
    ...(mozeAdmin && !jeLinija ? [["admin", "ADMIN"]] : []),
  ].filter(([id]) => mozeTabMerljive(id, korisnik?.uloga, rezimRada));

  const bojaTaba = (id) => {
    if (id === "karte") return C.narandzasta;
    if (id === "stanje") return C.ljubicasta;
    if (id === "admin") return C.zuta;
    if (id === "msa") return C.ljubicasta;
    if (id === "kplan") return C.plava;
    if (id === "smena") return C.zuta;
    if (id === "heatmap") return "#f472b6";
    if (id === "ciljevi") return C.zelena;
    if (id === "nalozi") return C.plava;
    if (id === "kupac") return "#22d3ee";
    if (id === "stabilnost") return "#f472b6";
    if (id === "oee") return C.narandzasta;
    if (id === "trasabilitet") return "#22d3ee";
    if (id === "excel") return C.plava;
    return C.zelena;
  };
  const [datum, setDatum] = useState(danasSr());
  const smena = useAutoSmena(true);
  const [idDeo, setIdDeo] = useState("");
  const [pogonKod, setPogonKod] = useState("");
  const [radniNalog, setRadniNalog] = useState("");
  const [nalogInfo, setNalogInfo] = useState(null);
  const [nalogUcitava, setNalogUcitava] = useState(false);
  const [nazivDela, setNazivDela] = useState("");
  const [kontrolor, setKontrolor] = useState("");
  const [linija, setLinija] = useState("");
  const [masina, setMasina] = useState("");
  const [slika, setSlika] = useState("");
  const [potrebanBroj, setPotrebanBroj] = useState(5);
  const [grupaAB, setGrupaAB] = useState("");
  const [grupe, setGrupe] = useState([]);
  const [kolone, setKolone] = useState(() => prazneKolone(5));
  const [karakteristike, setKarakteristike] = useState([]);
  const [sopMap, setSopMap] = useState({});
  const [ucitava, setUcitava] = useState(true);
  const [greskaDb, setGreskaDb] = useState("");
  const [poruka, setPoruka] = useState("");
  const [snima, setSnima] = useState(false);
  const [sacuvaneGrupe, setSacuvaneGrupe] = useState([]);
  const [planUzorkovanja, setPlanUzorkovanja] = useState(null);
  const [ucestalostPlan, setUcestalostPlan] = useState("");
  const [urlSlike, setUrlSlike] = useState(null);
  const [zoomSlika, setZoomSlika] = useState(false);

  useEffect(() => {
    resetSkrolPosleRotacije();
    setZoomSlika(false);
  }, [viewportKey]);

  const [prekidOdobrenId, setPrekidOdobrenId] = useState(null);
  const [pokaziZahtev, setPokaziZahtev] = useState(false);
  const [pokaziZahtevKal, setPokaziZahtevKal] = useState(false);
  const [kalibracijaOdobrenId, setKalibracijaOdobrenId] = useState(null);
  const [kalibracijaCekaId, setKalibracijaCekaId] = useState(null);
  const [fotoPoPoziciji, setFotoPoPoziciji] = useState({});
  const [komentarPoPoziciji, setKomentarPoPoziciji] = useState({});
  const [merenjaHeatmap, setMerenjaHeatmap] = useState([]);
  const [kpiSerija, setKpiSerija] = useState(() => podrazumevaniKpiIzMerenja({ kolone: [], potrebanBroj: 5, brojKolona: 0 }));
  const [kpiPoSeriji, setKpiPoSeriji] = useState({});
  const [kpiDbId, setKpiDbId] = useState(null);
  const [kpiDbIdPoSeriji, setKpiDbIdPoSeriji] = useState({});
  const [kpiPanelOtvoren, setKpiPanelOtvoren] = useState(false);
  const [kpiHubOtvoren, setKpiHubOtvoren] = useState(false);
  const kpiSerijaRef = useRef(kpiSerija);
  const kpiRucniUnos = useRef(false);
  const kpiDbIdRef = useRef(kpiDbId);
  kpiSerijaRef.current = kpiSerija;
  kpiDbIdRef.current = kpiDbId;
  const [snimaKpi, setSnimaKpi] = useState(false);
  const [aktivnaKolona, setAktivnaKolona] = useState(-1);
  const [tastMerenjaVidljiva, setTastMerenjaVidljiva] = useState(false);
  const [merilaLista, setMerilaLista] = useState([]);
  const [kontrolnaListaOk, setKontrolnaListaOk] = useState(() => {
    const sm = procitajSmenuIzStorage();
    return getListaOkSession("varijabilne", sm, null);
  });
  /** Admin preskače listu; svi ostali (uključujući operatore linije) moraju je popuniti. */
  const listaSpremna = kontrolnaListaOk || mozeAdmin;
  const [ucitavaDeo, setUcitavaDeo] = useState(false);
  const [unosKorak, setUnosKorak] = useState("poka");
  const [linijaKorak, setLinijaKorak] = useState(1);
  const [faiOdobren, setFaiOdobren] = useState(false);
  const [faiCekaOdobrenje, setFaiCekaOdobrenje] = useState(false);
  const [faiPoslednjiId, setFaiPoslednjiId] = useState(null);
  const [faiStranica, setFaiStranica] = useState(0);
  const kalibracijaOdobrena = !!kalibracijaOdobrenId;
  const mozeUpRikosKalibracije = mozeAdmin || kalibracijaOdobrena;
  const prethodniKalOdobren = useRef(null);

  const deloviLista = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const id of Object.keys(sopMap)) {
      if (seen.has(id)) continue;
      seen.add(id);
      const prvi = Object.values(sopMap[id] || {})[0];
      if (prvi) out.push({ id_deo: id, naziv_dela: prvi.naziv_dela });
    }
    return out;
  }, [sopMap]);

  const [naloziZaPogon, setNaloziZaPogon] = useState([]);

  const dostupniPogoni = useMemo(() => {
    if (!idDeo) return [];
    const izKar = pogoniIzKarakteristikaSaMerenjima(karakteristike, idDeo);
    if (izKar.length) return izKar;
    return pogoniZaDeoSvi(sopMap, naloziZaPogon, idDeo, karakteristike);
  }, [sopMap, naloziZaPogon, idDeo, karakteristike]);

  const omoguceniPogoni = useMemo(() => {
    if (!idDeo) return new Set();
    const jeOmogucen = (p) => jePogonOmogucen({
      sopMap,
      naloziRows: naloziZaPogon,
      karakteristike,
      idDeo,
      pogonKod: p,
      modul: "merljive",
    });
    const kandidati = pogoniZaUcitavanjeMerljive(
      sopMap, naloziZaPogon, karakteristike, idDeo, { jeOmogucen },
    );
    if (kandidati.length) return new Set(kandidati);
    return new Set(dostupniPogoni);
  }, [dostupniPogoni, sopMap, naloziZaPogon, karakteristike, idDeo]);

  const trebaIzborPogona = !!(idDeo && omoguceniPogoni.size > 1 && !pogonKod);

  const prethodniId = useRef("");
  const prethodniPogon = useRef("");
  const prethodniAB = useRef("");
  const pogonKodRef = useRef("");
  const idDeoRef = useRef(idDeo);
  const grupeRef = useRef(grupe);
  const ucitajDeoSeq = useRef(0);
  const ucitajDeoAktivni = useRef("");
  const poslednjaGreskaIdRef = useRef("");
  const pendingUcitajId = useRef("");
  const prethodnaSmenaPoka = useRef(smena);
  const inputRefs = useRef([]);
  const koloneRef = useRef(kolone);
  koloneRef.current = kolone;
  const poslednjaKolonaUnosRef = useRef(-1);
  grupeRef.current = grupe;
  const idUcitano = !!(idDeo && nazivDela && grupe.length && grupaAB);
  const { alarm: spcAlarm, blokira: spcBlokira, osvezi: osveziSpcAlarm, postaviAlarm: postaviSpcAlarm, ocistiAlarm: ocistiSpcAlarm } = useSpcAlarmGate(supabase, {
    idDeo,
    enabled: jeLinija && idUcitano,
  });

  useEffect(() => {
    pogonKodRef.current = pogonKod;
  }, [pogonKod]);

  useEffect(() => {
    idDeoRef.current = idDeo;
  }, [idDeo]);

  useEffect(() => {
    if (smena !== prethodnaSmenaPoka.current) {
      setUnosKorak(pocetniKorakUnosMer(korisnik?.uloga, rezimRada));
      prethodnaSmenaPoka.current = smena;
    }
  }, [smena, korisnik?.uloga, rezimRada]);

  useEffect(() => {
    const sm = Number(smena);
    if (mozeAdmin || jeKvalitetIliVise(korisnik?.uloga)) {
      setKontrolnaListaOk(true);
      return;
    }
    const idZaListu = jeLinija && idDeo && idUcitano ? String(idDeo || "").trim().toUpperCase() : null;

    if (jeLinija && !idZaListu) {
      setKontrolnaListaOk(false);
      return;
    }

    const sessionOk = getListaOkSession("varijabilne", sm, idZaListu);
    setKontrolnaListaOk(sessionOk);

    if (!sessionOk && jeLinija && idZaListu && linijaKorak >= 3) {
      setLinijaKorak(2);
      setUnosKorak("poka");
    }
  }, [smena, idDeo, idUcitano, jeLinija, linijaKorak, korisnik?.uloga, mozeAdmin]);

  const faiPotreban = useMemo(
    () => faiPotrebanZaDeo(karakteristike, idDeo, pogonKod),
    [karakteristike, idDeo, pogonKod],
  );
  const faiRezimAktivan = jeLinija && faiPotreban && !faiOdobren && !faiCekaOdobrenje;
  const brojFaiDimenzija = useMemo(
    () => (faiPotreban ? koloneFaiZaDeo(karakteristike, idDeo, pogonKod).length : 0),
    [faiPotreban, karakteristike, idDeo, pogonKod],
  );

  const proveriFai = useCallback(async () => {
    if (!jeLinija || !idDeo || idDeo.length < 3) {
      setFaiOdobren(!jeLinija);
      setFaiCekaOdobrenje(false);
      setFaiPoslednjiId(null);
      return;
    }
    if (!faiPotreban) {
      setFaiOdobren(true);
      setFaiCekaOdobrenje(false);
      setFaiPoslednjiId(null);
      return;
    }
    try {
      const odobren = await ucitajOdobrenFai(supabase, {
        idDeo,
        pogonKod,
        radniNalog,
        smena,
      });
      if (odobren) {
        setFaiOdobren(true);
        setFaiCekaOdobrenje(false);
        setFaiPoslednjiId(odobren.id);
        return;
      }
      const poslednji = await ucitajPoslednjiFai(supabase, {
        idDeo,
        pogonKod,
        radniNalog,
        smena,
      });
      if (poslednji?.status === "ceka") {
        setFaiOdobren(false);
        setFaiCekaOdobrenje(true);
        setFaiPoslednjiId(poslednji.id);
      } else {
        setFaiOdobren(false);
        setFaiCekaOdobrenje(false);
        setFaiPoslednjiId(null);
      }
    } catch {
      setFaiOdobren(false);
      setFaiCekaOdobrenje(false);
      setFaiPoslednjiId(null);
    }
  }, [jeLinija, idDeo, pogonKod, radniNalog, smena, faiPotreban]);

  useEffect(() => { proveriFai(); }, [proveriFai]);

  useEffect(() => {
    if (!idDeo || !grupaAB || unosKorak !== "forma" || !faiRezimAktivan) return;
    const cols = koloneFaiZaDeo(karakteristike, idDeo, pogonKod);
    if (!cols.length) return;
    setKolone(cols);
    setFaiStranica(0);
    setAktivnaKolona(indeksSledecePrazno(cols, 1, 0));
    setTastMerenjaVidljiva(false);
  }, [faiRezimAktivan, idDeo, grupaAB, pogonKod, karakteristike, unosKorak]);

  const faiPaginacija = useMemo(() => {
    if (!faiRezimAktivan) return null;
    return kolonePetStranica(kolone, faiStranica, 5);
  }, [faiRezimAktivan, kolone, faiStranica]);

  const realniIndeksKolone = useCallback((slotIdx) => {
    if (!faiRezimAktivan || !faiPaginacija) return slotIdx;
    const p = faiPaginacija.prikaz[slotIdx];
    return p?.realniIndeks ?? -1;
  }, [faiRezimAktivan, faiPaginacija]);

  const kolonaZaSlot = useCallback((slotIdx) => {
    const ri = realniIndeksKolone(slotIdx);
    if (ri >= 0) return kolone[ri];
    if (faiRezimAktivan && faiPaginacija) return faiPaginacija.prikaz[slotIdx]?.kolona;
    return kolone[slotIdx];
  }, [realniIndeksKolone, kolone, faiRezimAktivan, faiPaginacija]);

  const zavrsiKontrolnuListu = useCallback(() => {
    const idZaListu = jeLinija && idDeo && idUcitano ? String(idDeo || "").trim().toUpperCase() : null;
    setKontrolnaListaOk(true);
    setListaOkSession("varijabilne", Number(smena), idZaListu);
  }, [smena, jeLinija, idDeo, idUcitano]);

  const proveriPrekid = useCallback(async () => {
    try {
      const id = await ucitajOdobrenPrekid(supabase, {
        radnikId: korisnik?.radnikId,
        idDeo,
      });
      setPrekidOdobrenId(id);
    } catch {
      setPrekidOdobrenId(null);
    }
  }, [idDeo, korisnik?.radnikId]);

  useEffect(() => { proveriPrekid(); }, [proveriPrekid]);

  const proveriKalibraciju = useCallback(async () => {
    try {
      const [odobrenId, cekaId] = await Promise.all([
        ucitajOdobrenuKalibraciju(supabase, { radnikId: korisnik?.radnikId, idDeo }),
        ucitajCekaKalibraciju(supabase, { radnikId: korisnik?.radnikId, idDeo }),
      ]);
      setKalibracijaOdobrenId(odobrenId);
      setKalibracijaCekaId(cekaId);
    } catch {
      setKalibracijaOdobrenId(null);
      setKalibracijaCekaId(null);
    }
  }, [idDeo, korisnik?.radnikId]);

  useEffect(() => { proveriKalibraciju(); }, [proveriKalibraciju]);

  useEffect(() => {
    if (kalibracijaOdobrenId && !prethodniKalOdobren.current) {
      addToast("✓ Admin je odobrio merenje uprkos kalibraciji", "uspeh");
    }
    prethodniKalOdobren.current = kalibracijaOdobrenId;
  }, [kalibracijaOdobrenId, addToast]);

  useEffect(() => {
    const osvezi = () => {
      if (document.visibilityState === "visible") proveriKalibraciju();
    };
    document.addEventListener("visibilitychange", osvezi);
    window.addEventListener("focus", proveriKalibraciju);
    return () => {
      document.removeEventListener("visibilitychange", osvezi);
      window.removeEventListener("focus", proveriKalibraciju);
    };
  }, [proveriKalibraciju]);

  useEffect(() => {
    if (!korisnik?.radnikId) return;
    const ch = supabase.channel("kalibracija_merljive")
      .on("postgres_changes", { event: "*", schema: "public", table: "kalibracija_zahtevi" },
        () => proveriKalibraciju())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [korisnik?.radnikId, proveriKalibraciju]);

  const brojKolonaMer = useMemo(
    () => kolone.filter(k => k.naziv !== "-").length,
    [kolone],
  );

  useEffect(() => {
    if (!idDeo) return;
    const base = podrazumevaniKpiIzMerenja({ kolone, potrebanBroj, brojKolona: brojKolonaMer });
    const imaUnetihMerenja = kolone.some(
      k => k.naziv !== "-" && ((k.merenja?.length || 0) > 0 || String(k.input || "").trim()),
    );
    setKpiSerija(prev => {
      if (!imaUnetihMerenja) {
        return {
          ...base,
          planirano_kom: prev?.planirano_kom > 0 ? prev.planirano_kom : base.planirano_kom,
          planirano_min: prev?.planirano_min ?? base.planirano_min,
          zastoj_min: prev?.zastoj_min ?? base.zastoj_min,
        };
      }
      if (kpiRucniUnos.current) {
        return {
          ...prev,
          ukupno_kom: base.ukupno_kom,
          ispravno_iz_prve: base.ispravno_iz_prve,
          neusaglaseno: base.neusaglaseno,
          planirano_min: prev?.planirano_min ?? base.planirano_min,
          zastoj_min: prev?.zastoj_min ?? base.zastoj_min,
          planirano_kom: prev?.planirano_kom ?? base.planirano_kom,
        };
      }
      return {
        ...base,
        dorada: prev?.dorada ?? base.dorada,
        skart: prev?.skart ?? base.skart,
        ok_nakon_dorade: prev?.ok_nakon_dorade ?? base.ok_nakon_dorade,
        planirano_min: prev?.planirano_min ?? base.planirano_min,
        zastoj_min: prev?.zastoj_min ?? base.zastoj_min,
        planirano_kom: prev?.planirano_kom ?? base.planirano_kom,
      };
    });
  }, [kolone, potrebanBroj, brojKolonaMer, idDeo]);

  const promeniKpiSerija = useCallback((next) => {
    kpiRucniUnos.current = true;
    setKpiSerija(prev => {
      const resolved = typeof next === "function" ? next(prev) : next;
      if (grupaAB) {
        setKpiPoSeriji(p => ({ ...p, [grupaAB]: resolved }));
      }
      return resolved;
    });
  }, [grupaAB]);

  const kpiUkupnoZaDeo = useMemo(
    () => agregirajKpiPoSerijama(kpiPoSeriji, grupaAB, kpiSerija),
    [kpiPoSeriji, grupaAB, kpiSerija],
  );

  useEffect(() => {
    if (!grupaAB) return;
    setKpiPoSeriji(prev => ({ ...prev, [grupaAB]: kpiSerija }));
  }, [kpiSerija, grupaAB]);

  useEffect(() => {
    if (!idDeo || idDeo.length < 3) return;
    let ok = true;
    (async () => {
      try {
        const rows = await fetchKpiUnos(supabase, {
          modul: "merljive",
          idDeo,
          datum: datumSrUIso(datum),
          smena,
          limit: 80,
        });
        if (!ok || !rows?.length) return;
        setKpiPoSeriji(prev => {
          const izDb = {};
          for (const r of rows) {
            const s = String(r.serija || "").trim();
            if (!s) continue;
            const v = kpiVrednostiIzDb(r);
            if (v) izDb[s] = v;
          }
          return { ...izDb, ...prev };
        });
      } catch {
        /* KPI tabela možda nije migrirana */
      }
    })();
    return () => { ok = false; };
  }, [idDeo, datum, smena]);

  useEffect(() => {
    if (!idDeo || idDeo.length < 3) return;
    fetchPlaniranoKomZaDeo(supabase, idDeo).then(plan => {
      if (plan > 0) setKpiSerija(p => ({ ...p, planirano_kom: plan }));
    });
  }, [idDeo, radniNalog]);

  const serijaJeSacuvana = grupaAB && sacuvaneGrupe.includes(grupaAB);

  const kpiPayloadZaSnimanje = useCallback(() => ({
    modul: "merljive",
    datum: datumSrUIso(datum),
    smena,
    id_deo: idDeo,
    serija: grupaAB,
    radni_nalog: radniNalog,
    sesija_id: getAktivnaSesija("merljive")?.sesija_id || null,
    kpi: kpiSerija,
  }), [datum, smena, idDeo, grupaAB, radniNalog, kpiSerija]);

  const ucitajKpiIzBaze = useCallback(async () => {
    if (!idDeo || !grupaAB) {
      setKpiDbId(null);
      return;
    }
    try {
      const row = await pronadjiKpiUnos(supabase, {
        modul: "merljive",
        idDeo,
        datum: datumSrUIso(datum),
        smena,
        serija: grupaAB,
        radniNalog,
        sesija_id: getAktivnaSesija("merljive")?.sesija_id,
      });
      if (row) {
        setKpiDbId(row.id);
        setKpiDbIdPoSeriji(prev => ({ ...prev, [grupaAB]: row.id }));
        const izDb = kpiVrednostiIzDb(row);
        if (izDb) {
          kpiRucniUnos.current = true;
          setKpiSerija(prev => ({ ...prev, ...izDb }));
          setKpiPoSeriji(prev => ({ ...prev, [grupaAB]: { ...prev[grupaAB], ...izDb } }));
        }
      } else {
        setKpiDbId(null);
        setKpiDbIdPoSeriji(prev => ({ ...prev, [grupaAB]: null }));
      }
    } catch {
      setKpiDbId(null);
    }
  }, [idDeo, grupaAB, datum, smena, radniNalog]);

  useEffect(() => {
    if (!serijaJeSacuvana) {
      setKpiDbId(null);
      return;
    }
    ucitajKpiIzBaze();
  }, [serijaJeSacuvana, ucitajKpiIzBaze, sacuvaneGrupe, grupaAB]);

  const azurirajKpiKasnije = useCallback(async () => {
    if (!idDeo || !grupaAB || snimaKpi) return;
    if (!serijaJeSacuvana && !kpiDbId) {
      addToast("Prvo sačuvaj seriju merenja, pa KPI.", "greska");
      return;
    }
    setSnimaKpi(true);
    try {
      const payload = kpiPayloadZaSnimanje();
      const { data, error } = await snimiIliAzurirajKpiUnos(supabase, payload, kpiDbId);
      if (error) {
        addToast(porukaKpiGreske(error), "greska");
        return;
      }
      if (data?.id) {
        setKpiDbId(data.id);
        setKpiDbIdPoSeriji(prev => ({ ...prev, [grupaAB]: data.id }));
      }
      addToast("✓ KPI ažuriran (dorada / škart)", "uspeh");
    } finally {
      setSnimaKpi(false);
    }
  }, [idDeo, grupaAB, snimaKpi, serijaJeSacuvana, kpiDbId, kpiPayloadZaSnimanje, addToast]);

  const ciljSesije = grupe.length;
  const preostaloSesije = useMemo(() => {
    if (!idDeo || !grupe.length) return 0;
    return grupe.filter(g => !sacuvaneGrupe.includes(g)).length;
  }, [idDeo, grupe, sacuvaneGrupe]);

  const osveziPlanUzorkovanja = useCallback(async () => {
    if (!idDeo || !grupaAB) {
      setPlanUzorkovanja(null);
      setUcestalostPlan("");
      return;
    }
    try {
      const { plan, ucestalost } = await ucitajPlanUzorkovanja(supabase, {
        karakteristike,
        idDeo,
        serija: grupaAB,
        pogonKod,
        poTuri: potrebanBroj,
        datum,
        smena,
        radniNalog,
      });
      setPlanUzorkovanja(plan);
      setUcestalostPlan(ucestalost);
    } catch {
      setPlanUzorkovanja(izracunajPlanUzorkovanja({
        ciljKom: 0,
        poTuri: potrebanBroj,
        uradjeneTure: 0,
      }));
      setUcestalostPlan("");
    }
  }, [idDeo, grupaAB, pogonKod, potrebanBroj, datum, smena, radniNalog, karakteristike]);

  useEffect(() => {
    osveziPlanUzorkovanja();
  }, [osveziPlanUzorkovanja]);

  const bumpPlanPosleSnimanja = useCallback(() => {
    setPlanUzorkovanja((prev) => {
      if (!prev) return prev;
      return izracunajPlanUzorkovanja({
        ciljKom: prev.ciljKom,
        poTuri: prev.poTuri,
        uradjeneTure: prev.uradjeneTure + 1,
      });
    });
  }, []);

  const mozePreskociti = mozeAdmin || !!prekidOdobrenId;
  const serijaPotpuna = svaMerenjaZavrsena(kolone, potrebanBroj);
  const imaNepotpunuSesiju = idDeo && (preostaloSesije > 0 || (grupaAB && !serijaPotpuna && imaBiloSta(kolone)));

  useEffect(() => {
    if (!idDeo || preostaloSesije <= 0 || prekidOdobrenId) return;
    const t = setInterval(() => proveriPrekid(), 4000);
    return () => clearInterval(t);
  }, [idDeo, preostaloSesije, prekidOdobrenId, proveriPrekid]);

  useEffect(() => {
    const osvezi = () => {
      if (document.visibilityState === "visible") proveriPrekid();
    };
    document.addEventListener("visibilitychange", osvezi);
    window.addEventListener("focus", proveriPrekid);
    return () => {
      document.removeEventListener("visibilitychange", osvezi);
      window.removeEventListener("focus", proveriPrekid);
    };
  }, [proveriPrekid]);

  useEffect(() => {
    if (!korisnik?.radnikId) return;
    const ch = supabase.channel("prekidi_merljive")
      .on("postgres_changes", { event: "*", schema: "public", table: "prekidi_zahtevi" },
        () => proveriPrekid())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [korisnik?.radnikId, proveriPrekid]);

  useEffect(() => {
    let ok = true;
    (async () => {
      setUcitava(true);
      setGreskaDb("");
      const [kRes, sRes, rnRes] = await Promise.all([
        supabase.from("karakteristike_merljive").select("*").order("id"),
        supabase.from("sop_deo_varijabilni").select("*"),
        supabase.from("radni_nalozi")
          .select("id_deo,pogon_kod,broj_naloga,status")
          .eq("status", "aktivan"),
      ]);
      if (!ok) return;
      if (kRes.error || sRes.error || rnRes.error) {
        setGreskaDb(
          (kRes.error || sRes.error || rnRes.error).message
          + " — proveri SQL šemu (03_schema / 29_sop_pogon_kod) i uvezi CSV u NALOZI."
        );
        setUcitava(false);
        return;
      }
      setKarakteristike(
        dodeliSerijeMerenja(propagirajMetaKarakteristika(kRes.data || [])),
      );
      setSopMap(buildSopMapPoPogonu(sRes.data || []));
      setNaloziZaPogon(rnRes.data || []);
      if (!(kRes.data || []).length) {
        setGreskaDb(
          "Tabela karakteristike_merljive je prazna — Admin → uvezi SPC_merljive.xlsx "
          + "(tab karakteristike_merljive), pa Ctrl+F5.",
        );
      }
      setUcitava(false);
    })();
    return () => { ok = false; };
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("merila")
        .select("id,naziv,serijski_broj,kalibracije(datum_kal,sledeca_kal)")
        .eq("aktivno", true);
      if (error) {
        console.warn("merila učitavanje:", error.message);
        setMerilaLista([]);
        return;
      }
      setMerilaLista(data || []);
    })();
  }, []);

  const merilaMap = useMemo(() => mapaMerila(merilaLista), [merilaLista]);
  const kalUpozorenja = useMemo(
    () => upozorenjaInstrumentaZaKolone(kolone, merilaMap),
    [kolone, merilaMap],
  );

  const kalBlokAktivan = useMemo(
    () => kalUpozorenja.some(k => kalibracijaBlokiraUnos(k.status)) && !kalibracijaOdobrena,
    [kalUpozorenja, kalibracijaOdobrena],
  );

  useEffect(() => {
    if (!idDeo || !kalBlokAktivan) return;
    const t = setInterval(() => proveriKalibraciju(), 4000);
    return () => clearInterval(t);
  }, [idDeo, kalBlokAktivan, proveriKalibraciju]);

  const instrumentiKalTekst = useMemo(
    () => kalUpozorenja
      .filter(k => kalibracijaBlokiraUnos(k.status))
      .map(k => k.instrument)
      .join(", "),
    [kalUpozorenja],
  );

  const toggleKalibracijaOdobrenje = useCallback(async () => {
    const novo = !kalibracijaOdobrena;
    const res = await adminPostaviOdobrenjeKalibracije(supabase, {
      adminId: korisnik?.radnikId,
      idDeo,
      nazivDela,
      instrumenti: instrumentiKalTekst,
      odobreno: novo,
    });
    if (!res.ok) {
      addToast(res.greska || "Greška pri čuvanju odobrenja", "greska");
      return;
    }
    await proveriKalibraciju();
    addToast(
      novo ? "✓ Merenje dozvoljeno na svim uređajima" : "Kalibracija: blokada ponovo uključena",
      novo ? "uspeh" : "info",
    );
  }, [
    kalibracijaOdobrena, korisnik?.radnikId, idDeo, nazivDela,
    instrumentiKalTekst, proveriKalibraciju, addToast,
  ]);

  useEffect(() => {
    if (!mozeTabMerljive(tab, korisnik?.uloga, rezimRada)) {
      setTab("unos");
    }
  }, [tab, korisnik?.uloga, rezimRada]);

  const punPristupTabovima = (mozeAdmin || jeKvalitetIliVise(korisnik?.uloga)) && !jeLinija;

  useEffect(() => {
    if (!jeLinija || punPristupTabovima) return;
    if (tab !== "unos" && tab !== "log") setTab("unos");
  }, [jeLinija, tab, punPristupTabovima]);

  const resetKolone = useCallback((broj) => {
    poslednjaKolonaUnosRef.current = -1;
    setKolone(prazneKolone(broj));
    setFotoPoPoziciji({});
    setKomentarPoPoziciji({});
  }, []);

  const ucitajDeo = useCallback(async (sID, { radniNalogEksplicitni, pogonEksplicitni } = {}) => {
    const seq = ++ucitajDeoSeq.current;
    const id = String(sID || "").trim().toUpperCase();
    if (!id || !idSpremanZaUcitavanje(id)) return;
    if (ucitava) {
      pendingUcitajId.current = id;
      return;
    }
    if (ucitajDeoAktivni.current === id) return;
    ucitajDeoAktivni.current = id;
    setUcitavaDeo(true);
    const resetPosleGreske = () => {
      setGrupe([]);
      setGrupaAB("");
      setNazivDela("");
      setRadniNalog("");
      setNalogInfo(null);
      resetKolone(5);
      setUnosKorak(pocetniKorakUnosMer(korisnik?.uloga, rezimRada));
      if (jeLinija) setLinijaKorak(1);
      poslednjaGreskaIdRef.current = id;
    };
    const prikaziGresku = (msg) => {
      if (seq !== ucitajDeoSeq.current) return;
      setPoruka(msg);
      resetPosleGreske();
    };
    try {
    if (!karakteristike?.length) {
      prikaziGresku(
        "Tabela karakteristike_merljive je prazna — Admin → uvezi SPC_merljive.xlsx, pa Ctrl+F5.",
      );
      return;
    }
    let pogon = String(pogonEksplicitni || "").trim().toUpperCase()
      || (radniNalogEksplicitni ? pogonIzRn(radniNalogEksplicitni) : null);
    if (!pogon) {
      const jeOmogucen = (p) => jePogonOmogucen({
        sopMap,
        naloziRows: naloziZaPogon,
        karakteristike,
        idDeo: id,
        pogonKod: p,
        modul: "merljive",
      });
      const kandidati = pogoniZaUcitavanjeMerljive(
        sopMap, naloziZaPogon, karakteristike, id, { jeOmogucen },
      );
      if (kandidati.length === 1) {
        pogon = kandidati[0];
      } else if (kandidati.length > 1) {
        const izabran = String(pogonEksplicitni || pogonKodRef.current || "").trim().toUpperCase();
        if (!izabran || !kandidati.includes(izabran)) {
          if (seq !== ucitajDeoSeq.current) return;
          setPogonKod("");
          pogonKodRef.current = "";
          setGrupe([]);
          setGrupaAB("");
          resetKolone(5);
          const biloSop = Object.values(sopMap[id] || {})[0];
          setNazivDela(biloSop?.naziv_dela || id);
          setPoruka(
            `Izaberi pogon za ${id} (${kandidati.map((p) => labelPogona(p)).join(", ")}). `
            + "A = Ulazna kontrola, B = Preseraj, …",
          );
          return;
        }
        pogon = izabran;
      } else {
        prikaziGresku(
          `ID ${id}: nema merljivih dimenzija ni aktivnog pogona. Admin → uvezi šifrarnik, pa Ctrl+F5.`,
        );
        return;
      }
    }
    pogon = String(pogon).trim().toUpperCase();

    let sop = sopZaPogon(sopMap, id, pogon);
    if (!sop) {
      const karZaPogon = filtrirajKarakteristikePoPogonu(karakteristike, id, pogon)
        .filter(jeMerljivaKarakteristika);
      const prvi = karZaPogon[0];
      if (prvi) {
        sop = {
          id_deo: id,
          pogon_kod: pogon,
          naziv_dela: prvi.naziv_dela || id,
          radni_nalog: prvi.radni_nalog || radniNalogIzDeoPogona(id, pogon),
          slika: prvi.slika || null,
          masina: null,
          linija: prvi.linija_faza || "",
          broj_merenja: Number(prvi.broj_merenja) > 0 ? Number(prvi.broj_merenja) : 5,
          kontrolor_ime: null,
        };
      }
    }
    if (!sop) {
      const rnRed = naloziZaDeoPoPogonu(naloziZaPogon, id)[pogon];
      const rn = rnRed?.broj_naloga || radniNalogIzDeoPogona(id, pogon);
      if (rn) {
        const biloKoji = Object.values(sopMap[id] || {})[0];
        sop = {
          id_deo: id,
          pogon_kod: pogon,
          naziv_dela: biloKoji?.naziv_dela || id,
          radni_nalog: rn,
          slika: biloKoji?.slika || null,
          masina: biloKoji?.masina || null,
          linija: biloKoji?.linija || "",
          broj_merenja: biloKoji?.broj_merenja || 5,
          kontrolor_ime: null,
        };
      }
    }
    if (!sop) {
      prikaziGresku(
        `ID ${id} / pogon ${pogon}: nema u bazi (SOP / karakteristike). Admin → uvezi SPC_merljive.xlsx, pa Ctrl+F5.`,
      );
      return;
    }
    if (seq !== ucitajDeoSeq.current) return;
    pogonKodRef.current = pogon;
    setPogonKod(pogon);
    const sopFallback = sop.broj_merenja || 5;
    setSacuvaneGrupe([]);
    setPrekidOdobrenId(null);
    setFotoPoPoziciji({});
    setKomentarPoPoziciji({});

    const gsInit = grupeMerenja(karakteristike, id, pogon);
    const gs = gsInit;
    if (!gs.length) {
      if (seq !== ucitajDeoSeq.current) return;
      const imaKar = (karakteristike || []).some(
        (k) => String(k.id_deo || "").toUpperCase() === id,
      );
      prikaziGresku(
        imaKar
          ? `ID ${id} / ${labelPogona(pogon)}: nema merljivih dimenzija za ovaj pogon. Izaberi drugi pogon.`
          : porukaNepoznatIdDeo(karakteristike, id),
      );
      return;
    }
    poslednjaGreskaIdRef.current = "";
    setPoruka("");
    setNazivDela(sop.naziv_dela || "");
    setKontrolor(sop.kontrolor_ime || korisnik?.ime || "");
    setLinija(sop.linija || "");
    setMasina(sop.masina || "");
    setSlika(sop.slika || "");
    setGrupe(gs);
    const ab = gs[0] || "";
    setGrupaAB(ab);
    prethodniAB.current = ab;
    const br = brojMerenjaZaSeriju(karakteristike, id, ab, sopFallback, pogon);
    setPotrebanBroj(br);
    const cols = koloneZaGrupu(karakteristike, id, ab, br, pogon);
    if (!cols.some(c => c.naziv !== "-")) {
      setPoruka(
        `ID ${id}: nema dimenzija za seriju ${ab} u pogonu ${pogon}. Proveri karakteristike_merljive.`,
      );
    }
    setKolone(cols);
    setAktivnaKolona(indeksSledecePrazno(cols, br, 0));
    prethodniId.current = id;
    prethodniPogon.current = pogon;
    setUnosKorak(pocetniKorakUnosMer(korisnik?.uloga, rezimRada));
    if (jeLinija) setLinijaKorak(1);

    setNalogUcitava(true);
    let dbNalog = null;
    try {
      const rnPrivremeno = radniNalogEksplicitni || sop.radni_nalog;
      if (rnPrivremeno) {
        dbNalog = await ucitajNalogZaDeoIRn(supabase, id, rnPrivremeno);
      }
      if (!dbNalog) {
        dbNalog = await ucitajAktivniRadniNalog(supabase, id, pogon);
      }
    } finally {
      if (seq === ucitajDeoSeq.current) setNalogUcitava(false);
    }
    if (seq !== ucitajDeoSeq.current) return;
    setNalogInfo(dbNalog);
    const rn = izaberiRadniNalog({
      eksplicitni: radniNalogEksplicitni,
      izBaze: dbNalog,
      izSop: sop.radni_nalog,
    });
    setRadniNalog(rn);
    if (dbNalog && !radniNalogEksplicitni && rn === dbNalog.broj_naloga) {
      addToast(`📋 ${formatNalogToast(dbNalog)} · ${labelPogona(pogon)}`, "info");
    }
    ensureSesija({
      modul: "merljive",
      idDeo: id,
      smena,
      radniNalog: rn,
    });
    } finally {
      if (seq === ucitajDeoSeq.current) {
        setUcitavaDeo(false);
        if (ucitajDeoAktivni.current === id) ucitajDeoAktivni.current = "";
      }
    }
  }, [sopMap, karakteristike, naloziZaPogon, korisnik, smena, rezimRada, jeLinija, mozeAdmin, resetKolone, addToast, ucitava]);

  /** Ponovo učitaj deo kad stigne šifrarnik ili pending ID sa tastature (ne na svaki keystroke). */
  useEffect(() => {
    if (ucitava) return;
    const pending = String(pendingUcitajId.current || "").trim().toUpperCase();
    if (pending) {
      pendingUcitajId.current = "";
      if (idSpremanZaUcitavanje(pending)) {
        ucitajDeo(pending, { pogonEksplicitni: pogonKodRef.current || undefined });
      }
      return;
    }
    const id = String(idDeoRef.current || "").trim().toUpperCase();
    if (!idSpremanZaUcitavanje(id)) return;
    const pk = String(pogonKodRef.current || "").trim().toUpperCase();
    if (grupeRef.current.length > 0 && id === prethodniId.current) {
      if (!pk || pk === prethodniPogon.current) return;
    }
    if (id === poslednjaGreskaIdRef.current && !grupeRef.current.length && !pk) return;
    ucitajDeo(id, { pogonEksplicitni: pk || undefined });
  }, [ucitava, karakteristike, sopMap, naloziZaPogon, ucitajDeo]);

  useEffect(() => {
    if (!slika && !idDeo) { setUrlSlike(null); return; }
    let ok = true;
    ucitajPrikazSliku(supabase, "merljive", slika, idDeo).then((url) => {
      if (ok) setUrlSlike(url);
    });
    return () => { ok = false; };
  }, [slika, idDeo]);

  /** Samo redom: A → B. Ručni skok na B dok A nije sačuvana — zabranjeno. */
  const indeksAktivne = grupe.indexOf(grupaAB);
  const mozeNaGrupu = (ab) => {
    const idx = grupe.indexOf(ab);
    if (idx < 0) return false;
    if (idx === indeksAktivne) return true;
    if (idx < indeksAktivne) return sacuvaneGrupe.includes(ab);
    return false;
  };

  const prebaciGrupu = (ab, force = false) => {
    if (!force && (faiRezimAktivan || faiCekaOdobrenje)) {
      setPoruka("Završite FAI (prvo parče) pre promene serije.");
      return;
    }
    if (!force && ab !== grupaAB && !mozePreskociti) {
      const idxCilj = grupe.indexOf(ab);
      const idxTren = grupe.indexOf(grupaAB);
      if (idxCilj > idxTren && !svaMerenjaZavrsena(kolone, potrebanBroj)) {
        setPoruka(`Završi i sačuvaj seriju ${grupaAB} pre prelaska na ${ab}!`);
        return;
      }
      if (idxCilj > idxTren && !sacuvaneGrupe.includes(grupaAB)) {
        setPoruka(`Prvo sačuvaj seriju ${grupaAB}, pa prelazi na ${ab}.`);
        return;
      }
      if (!mozeNaGrupu(ab)) {
        setPoruka(`Serija ${ab} je još zaključana.`);
        return;
      }
    }
    if (prethodniAB.current && ab !== prethodniAB.current && !force && !mozePreskociti) {
      if (!svaMerenjaZavrsena(kolone, potrebanBroj)) {
        setPoruka("Završi merenja u tekućoj seriji pre promene A/B!");
        return;
      }
    }
    const staraSerija = grupaAB;
    setPoruka("");
    setGrupaAB(ab);
    prethodniAB.current = ab;
    setFotoPoPoziciji({});
    setKomentarPoPoziciji({});
    const sopFb = sopZaPogon(sopMap, idDeo, pogonKod)?.broj_merenja || 5;
    const br = brojMerenjaZaSeriju(karakteristike, idDeo, ab, sopFb, pogonKod);
    setPotrebanBroj(br);
    const cols = koloneZaGrupu(karakteristike, idDeo, ab, br, pogonKod);
    const brojK = cols.filter(c => c.naziv !== "-").length;
    setKolone(cols);
    setKpiPoSeriji(prev => {
      const next = staraSerija && staraSerija !== ab
        ? { ...prev, [staraSerija]: kpiSerijaRef.current }
        : { ...prev };
      const sacuvanKpi = next[ab];
      const osnovniKpi = podrazumevaniKpiIzMerenja({ kolone: cols, potrebanBroj: br, brojKolona: brojK });
      kpiRucniUnos.current = !!sacuvanKpi;
      setKpiSerija(sacuvanKpi ? { ...osnovniKpi, ...sacuvanKpi } : osnovniKpi);
      return next;
    });
    setKpiDbIdPoSeriji(prev => {
      const next = staraSerija && staraSerija !== ab
        ? { ...prev, [staraSerija]: kpiDbIdRef.current }
        : { ...prev };
      setKpiDbId(next[ab] ?? null);
      return next;
    });
    setAktivnaKolona(indeksSledecePrazno(cols, br, 0));
    if (idDeo && force) {
      setUnosKorak("forma");
      if (jeLinija && koristiMobLinija) setLinijaKorak(3);
    }
  };

  const metaAktivneSerije = idDeo && grupaAB
    ? metaSerije(
      karakteristike,
      idDeo,
      grupaAB,
      sopZaPogon(sopMap, idDeo, pogonKod)?.broj_merenja || 5,
      pogonKod,
    )
    : null;

  const prebaciNaSledecuSerijuPosleSnimanja = (sacuvanaSerija) => {
    const idx = grupe.indexOf(sacuvanaSerija);
    if (idx < 0 || idx >= grupe.length - 1) return false;
    const sledeca = grupe[idx + 1];
    prebaciGrupu(sledeca, true);
    setUnosKorak("forma");
    if (jeLinija && koristiMobLinija) setLinijaKorak(3);
    setPoruka(`Serija ${sacuvanaSerija} sačuvana. Unos merenja — serija ${sledeca}.`);
    addToast(`Serija ${sacuvanaSerija} sačuvana → ${sledeca}`, "uspeh");
    return true;
  };

  useEffect(() => {
    if (!idDeo || idDeo.length < 3) setLinijaKorak(1);
  }, [idDeo]);

  const noviDeoLinija = () => {
    onIdChange("");
    setLinijaKorak(1);
    setUnosKorak("poka");
    setFaiOdobren(false);
    setFaiCekaOdobrenje(false);
    setFaiPoslednjiId(null);
    setPoruka("");
  };

  const idUcitajTimer = useRef(null);

  const onIdChange = (v, { potvrdi = false, radniNalogEksplicitni, pogonEksplicitni } = {}) => {
    const s = String(v || "").trim().toUpperCase();
    if (prethodniId.current && s !== prethodniId.current && !mozePreskociti) {
      if (imaBiloSta(kolone) && !svaMerenjaZavrsena(kolone, potrebanBroj)) {
        setPoruka("Moraš završiti sva merenja pre promene ID!");
        setIdDeo(prethodniId.current);
        return;
      }
    }
    setIdDeo(s);
    clearTimeout(idUcitajTimer.current);
    idUcitajTimer.current = null;
    if (s !== prethodniId.current) {
      ucitajDeoSeq.current += 1;
      ucitajDeoAktivni.current = "";
      poslednjaGreskaIdRef.current = "";
      pogonKodRef.current = "";
      setPogonKod("");
      setGrupe([]);
      setGrupaAB("");
      setNazivDela("");
      setRadniNalog("");
      setNalogInfo(null);
      setPoruka("");
      setSacuvaneGrupe([]);
      resetKolone(5);
      setKpiPoSeriji({});
      setKpiDbIdPoSeriji({});
      kpiRucniUnos.current = false;
      setUnosKorak(pocetniKorakUnosMer(korisnik?.uloga, rezimRada));
      if (jeLinija) {
        setLinijaKorak(1);
        setFaiOdobren(false);
        setFaiCekaOdobrenje(false);
        setFaiPoslednjiId(null);
      }
    }
    if (!s) {
      prethodniId.current = "";
      prethodniPogon.current = "";
      prethodniAB.current = "";
      pogonKodRef.current = "";
      setGrupe([]);
      setGrupaAB("");
      setSacuvaneGrupe([]);
      setPrekidOdobrenId(null);
      setRadniNalog("");
      setPogonKod("");
      setNalogInfo(null);
      resetKolone(5);
      return;
    }
    const pogonZaUcitavanje = pogonEksplicitni || pogonKodRef.current || undefined;
    if (!idSpremanZaUcitavanje(s)) {
      if (s.length >= 3 && s.includes("-") && s.endsWith("-")) {
        setPoruka("");
      }
      return;
    }
    if (ucitava) {
      pendingUcitajId.current = s;
      return;
    }
    const vecUcitano = s === prethodniId.current && grupeRef.current.length > 0;
    const vecNeuspelo = s === poslednjaGreskaIdRef.current && !grupeRef.current.length;
    if (vecUcitano) return;
    if (vecNeuspelo && !potvrdi && !pogonEksplicitni) return;
    ucitajDeo(s, { radniNalogEksplicitni, pogonEksplicitni: pogonZaUcitavanje });
  };

  const potvrdiIdDeo = useCallback((v) => {
    const s = String(v ?? idDeo ?? "").trim().toUpperCase();
    clearTimeout(idUcitajTimer.current);
    if (idSpremanZaUcitavanje(s)) onIdChange(s, { potvrdi: true });
  }, [idDeo, onIdChange]);

  const onPogonChange = useCallback((pogon) => {
    const p = String(pogon || "").trim().toUpperCase();
    if (!p || !idDeo) return;
    clearTimeout(idUcitajTimer.current);
    idUcitajTimer.current = null;
    pogonKodRef.current = p;
    setPogonKod(p);
    setSacuvaneGrupe([]);
    prethodniAB.current = "";
    poslednjaGreskaIdRef.current = "";
    ucitajDeo(idDeo, { pogonEksplicitni: p, radniNalogEksplicitni: "" });
  }, [idDeo, ucitajDeo]);

  const obradiBarkodSken = useCallback((raw) => {
    const p = parsiBarkod(raw);
    const eksplicitniRn = p?.radni_nalog
      ? String(p.radni_nalog).trim().toUpperCase()
      : "";
    const res = primeniParsiraniBarkod(p, {
      postaviId: (id) => onIdChange(id, { potvrdi: true, radniNalogEksplicitni: eksplicitniRn }),
    });
    if (!res) return;
    addToast(
      `📷 Barkod: ${res.id}${res.radni_nalog ? ` · ${res.radni_nalog}` : ""}`,
      "uspeh",
    );
    window._vibrirajOK?.();
  }, [onIdChange, addToast]);

  const onGrupaChange = (ab) => prebaciGrupu(ab);

  useBarcodeScanner(useCallback((raw) => {
    if (tab !== "unos") return;
    obradiBarkodSken(raw);
  }, [tab, obradiBarkodSken]), { enabled: tab === "unos", ignoreInputs: true });

  const idBarkodPolje = useMemo(
    () => idBarkodInputHandleri(obradiBarkodSken, {
      postaviId: (v) => onIdChange(v),
      potvrdiId: potvrdiIdDeo,
    }),
    [obradiBarkodSken, onIdChange, potvrdiIdDeo],
  );

  const mozeSacuvati = useMemo(() => {
    if (!idDeo) return false;
    if (!imaBiloSta(kolone)) return false;
    if (faiRezimAktivan) return svaMerenjaZavrsena(kolone, potrebanBroj);
    return true;
  }, [idDeo, kolone, faiRezimAktivan, potrebanBroj]);
  const mozeObrisati = useMemo(() => imaBiloSta(kolone), [kolone]);
  const faiKompletno = useMemo(
    () => faiRezimAktivan && svaMerenjaZavrsena(kolone, potrebanBroj),
    [faiRezimAktivan, kolone, potrebanBroj],
  );
  const mozeOdobriFai = jeAdmin(korisnik?.uloga) || jeKvalitetIliVise(korisnik?.uloga);

  const kolonaJePuna = useCallback((k) => (
    k?.naziv !== "-" && (k?.merenja?.length || 0) >= brojPotrebnihZaKolonu(k, potrebanBroj)
  ), [potrebanBroj]);

  useEffect(() => {
    setTastMerenjaVidljiva(false);
  }, [idDeo, pogonKod, grupaAB, unosKorak]);

  const fokusirajKolonu = useCallback((idx) => {
    if (idx < 0) return;
    const f = () => inputRefs.current[idx]?.focus?.({ preventScroll: false });
    requestAnimationFrame(() => requestAnimationFrame(f));
    setTimeout(f, 60);
  }, []);

  const prebaciNaSledecuPraznuKolonu = useCallback((odIdx = 0) => {
    const sledeca = indeksSledecePrazno(koloneRef.current, potrebanBroj, odIdx);
    if (sledeca >= 0) {
      setAktivnaKolona(sledeca);
      if (koristiTastMerenja) setTastMerenjaVidljiva(false);
      else fokusirajKolonu(sledeca);
    }
    return sledeca;
  }, [potrebanBroj, fokusirajKolonu, koristiTastMerenja]);

  useEffect(() => {
    if (koristiTastMerenja) return;
    if (unosKorak !== "forma" || aktivnaKolona < 0) return;
    const k = koloneRef.current[aktivnaKolona];
    if (kolonaJePuna(k)) {
      const sledeca = indeksSledecePrazno(koloneRef.current, potrebanBroj, aktivnaKolona + 1);
      if (sledeca >= 0 && sledeca !== aktivnaKolona) {
        setAktivnaKolona(sledeca);
        return;
      }
      return;
    }
    fokusirajKolonu(aktivnaKolona);
  }, [aktivnaKolona, unosKorak, potrebanBroj, kolonaJePuna, fokusirajKolonu, koristiTastMerenja]);

  const indeksiMerljivih = useMemo(
    () => kolone.map((k, i) => (k.naziv !== "-" ? i : -1)).filter(i => i >= 0),
    [kolone],
  );

  const prikazIndeksKolone = useMemo(() => {
    if (L.mobTabKarusel && faiRezimAktivan && faiPaginacija) {
      const rel = aktivnaKolona - faiPaginacija.start;
      if (rel >= 0 && rel < 5) {
        const ri = faiPaginacija.prikaz[rel]?.realniIndeks ?? -1;
        if (ri >= 0) return rel;
      }
      for (let s = 0; s < 5; s += 1) {
        if ((faiPaginacija.prikaz[s]?.realniIndeks ?? -1) >= 0) return s;
      }
      return 0;
    }
    if (L.mobTabKarusel) {
      if (aktivnaKolona >= 0 && aktivnaKolona < kolone.length) return aktivnaKolona;
      return 0;
    }
    if (!indeksiMerljivih.length) return -1;
    if (indeksiMerljivih.includes(aktivnaKolona)) return aktivnaKolona;
    return indeksiMerljivih[0];
  }, [L.mobTabKarusel, kolone.length, indeksiMerljivih, aktivnaKolona, faiRezimAktivan, faiPaginacija]);

  useEffect(() => {
    if (!L.mobTabKarusel || unosKorak !== "forma") return;
    if (faiRezimAktivan) return;
    if (aktivnaKolona < 0 || aktivnaKolona >= kolone.length) {
      setAktivnaKolona(0);
    }
  }, [L.mobTabKarusel, aktivnaKolona, unosKorak, kolone.length, faiRezimAktivan]);

  const idiPrethodnaKolona = useCallback(() => {
    if (!indeksiMerljivih.length) return;
    const tren = indeksiMerljivih.includes(aktivnaKolona) ? aktivnaKolona : indeksiMerljivih[0];
    const idx = indeksiMerljivih.indexOf(tren);
    if (idx > 0) setAktivnaKolona(indeksiMerljivih[idx - 1]);
  }, [indeksiMerljivih, aktivnaKolona]);

  const idiSledecaKolona = useCallback(() => {
    if (!indeksiMerljivih.length) return;
    const tren = indeksiMerljivih.includes(aktivnaKolona) ? aktivnaKolona : indeksiMerljivih[0];
    const idx = indeksiMerljivih.indexOf(tren);
    if (idx < indeksiMerljivih.length - 1) {
      setAktivnaKolona(indeksiMerljivih[idx + 1]);
    }
  }, [indeksiMerljivih, aktivnaKolona]);

  const idiSledecaKolonaMob = useCallback(() => {
    if (faiRezimAktivan && faiPaginacija) {
      const rel = Math.max(0, aktivnaKolona - faiPaginacija.start);
      for (let s = rel + 1; s < 5; s += 1) {
        const ri = faiPaginacija.prikaz[s]?.realniIndeks ?? -1;
        if (ri >= 0) {
          setAktivnaKolona(ri);
          setTastMerenjaVidljiva(false);
          document.activeElement?.blur?.();
          return;
        }
      }
      return;
    }
    setAktivnaKolona((i) => {
      const tren = i < 0 ? 0 : i;
      const prazna = indeksSledecePrazno(koloneRef.current, potrebanBroj, tren + 1);
      if (prazna >= 0) return prazna;
      return tren < kolone.length - 1 ? tren + 1 : tren;
    });
    setTastMerenjaVidljiva(false);
    document.activeElement?.blur?.();
  }, [kolone.length, potrebanBroj, faiRezimAktivan, faiPaginacija, aktivnaKolona]);

  const idiPrethodnaKolonaMob = useCallback(() => {
    if (faiRezimAktivan && faiPaginacija) {
      const rel = Math.max(0, aktivnaKolona - faiPaginacija.start);
      for (let s = rel - 1; s >= 0; s -= 1) {
        const ri = faiPaginacija.prikaz[s]?.realniIndeks ?? -1;
        if (ri >= 0) {
          setAktivnaKolona(ri);
          setTastMerenjaVidljiva(false);
          document.activeElement?.blur?.();
          return;
        }
      }
      return;
    }
    setAktivnaKolona((i) => {
      const tren = i < 0 ? 0 : i;
      return tren > 0 ? tren - 1 : tren;
    });
    setTastMerenjaVidljiva(false);
    document.activeElement?.blur?.();
  }, [faiRezimAktivan, faiPaginacija, aktivnaKolona]);

  const promeniFaiStranicu = useCallback((nova) => {
    setFaiStranica(nova);
    setAktivnaKolona(-1);
    setTimeout(() => {
      const pag = kolonePetStranica(koloneRef.current, nova, 5);
      const prvi = pag.prikaz.find((p) => p.realniIndeks >= 0);
      if (prvi) setAktivnaKolona(prvi.realniIndeks);
    }, 0);
  }, []);

  const dodajMerenje = useCallback((idx, rawOverride) => {
    const k0 = koloneRef.current[idx];
    if (!k0 || k0.naziv === "-") return false;
    if (k0.merenja.length >= brojPotrebnihZaKolonu(k0, potrebanBroj)) {
      prebaciNaSledecuPraznuKolonu(idx + 1);
      return false;
    }
    const kalBlok = kalUpozorenja.find(u => u.pozicija === k0.naziv && kalibracijaBlokiraUnos(u.status));
    if (kalBlok && !mozeUpRikosKalibracije) {
      setPoruka(
        `Merilo „${k0.instrument}”${kalBlok.meriloBroj ? ` (#${kalBlok.meriloBroj})` : ""} — kalibracija istekla. `
        + (mozeAdmin
          ? "Klikni „Admin: dozvoli merenje“ ispod ili kalibriši merilo u tabu MERILA."
          : "Obavesti admina ili kalibriši merilo."),
      );
      return false;
    }

    const inp = rawOverride !== undefined ? String(rawOverride) : k0.input;
    const val = validirajUnos(inp, k0.jedinica, {
      lslDec: k0.lslDec,
      uslDec: k0.uslDec,
      nominalDec: k0.nominalDec,
    });
    if (!val.ok) {
      if (val.poruka) setPoruka(val.poruka);
      if (!val.zadrziUnos) {
        setKolone(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], input: "" };
          return next;
        });
      }
      return false;
    }

    setPoruka("");
    const status = proveriOkNok(val.vrednost, k0.lslDec, k0.uslDec, k0.jedinica);
    let sledecaIdx = idx;
    poslednjaKolonaUnosRef.current = idx;
    setKolone(prev => {
      const next = [...prev];
      const col = { ...next[idx] };
      col.merenja = [...col.merenja, { raw: val.vrednost, dec: val.dec }];
      if (status === "OK") col.cntOK += 1;
      else col.cntNOK += 1;
      col.input = "";
      col.ukupnoLabel = `${col.merenja.length} / ${brojPotrebnihZaKolonu(col, potrebanBroj)}`;
      next[idx] = col;
      if (col.merenja.length >= brojPotrebnihZaKolonu(col, potrebanBroj)) {
        sledecaIdx = indeksSledecePrazno(next, potrebanBroj, idx + 1);
      }
      return next;
    });

    if (sledecaIdx >= 0) {
      setAktivnaKolona(sledecaIdx);
      if (koristiTastMerenja) {
        setTastMerenjaVidljiva(true);
        requestAnimationFrame(() => inputRefs.current[sledecaIdx]?.focus?.({ preventScroll: true }));
      } else {
        fokusirajKolonu(sledecaIdx);
      }
    } else {
      setAktivnaKolona(-1);
      if (koristiTastMerenja) setTastMerenjaVidljiva(false);
    }
    return true;
  }, [potrebanBroj, kalUpozorenja, mozeUpRikosKalibracije, mozeAdmin, fokusirajKolonu, prebaciNaSledecuPraznuKolonu, koristiTastMerenja]);

  const promeniInputMerenja = useCallback((i, v, k) => {
    if (kolonaJePuna(k)) return;
    setKolone(prev => {
      const next = [...prev];
      next[i] = { ...next[i], input: v };
      return next;
    });
    if (unosMerenjaSpremanZaDodavanje(v, k)) {
      queueMicrotask(() => dodajMerenje(i, v));
    }
  }, [dodajMerenje, kolonaJePuna]);

  const pokusajDodajMerenje = useCallback((i) => {
    const k = koloneRef.current[i];
    if (!k || kolonaJePuna(k)) return;
    const inpVal = String(k?.input || "").trim();
    if (inpVal && unosMerenjaNepotpun(inpVal, {
      lslDec: k.lslDec,
      uslDec: k.uslDec,
      nominalDec: k.nominalDec,
      jedinica: k.jedinica,
    })) return;
    dodajMerenje(i);
  }, [dodajMerenje, kolonaJePuna]);

  const blurInputMerenja = useCallback((i) => {
    pokusajDodajMerenje(i);
  }, [pokusajDodajMerenje]);

  const keyDownInputMerenja = useCallback((e, i, k) => {
    if (kolonaJePuna(k)) {
      e.preventDefault();
      prebaciNaSledecuPraznuKolonu(i + 1);
      return;
    }
    const f = filterKeyUnos(e.key, k.input, k.jedinica, k.plausibilnost);
    if (f === null && e.key.length === 1) e.preventDefault();
    if (e.key === "Enter") {
      e.preventDefault();
      pokusajDodajMerenje(i);
      return;
    }
    if (e.key === "Tab" && !e.shiftKey && String(k.input || "").trim()) {
      e.preventDefault();
      pokusajDodajMerenje(i);
    }
  }, [pokusajDodajMerenje, kolonaJePuna, prebaciNaSledecuPraznuKolonu]);

  const primeniTastaturuMerenja = useCallback((akcija, cifra) => {
    const i = aktivnaKolona;
    if (i < 0) return;
    const k = koloneRef.current[i];
    if (!k || kolonaJePuna(k) || k.naziv === "-") return;
    const v = primeniTastMerenja(akcija, k.input, k, cifra);
    promeniInputMerenja(i, v, k);
  }, [aktivnaKolona, kolonaJePuna, promeniInputMerenja]);

  const zatvoriTastMerenja = useCallback(() => {
    const i = aktivnaKolona;
    if (i >= 0) {
      blurInputMerenja(i);
      inputRefs.current[i]?.blur?.();
    }
    setTastMerenjaVidljiva(false);
    setAktivnaKolona(-1);
  }, [aktivnaKolona, blurInputMerenja]);

  const gotovoDodajTastMerenja = useCallback(() => {
    const i = aktivnaKolona;
    if (i < 0) {
      setTastMerenjaVidljiva(false);
      return;
    }
    const k = koloneRef.current[i];
    if (!k || k.naziv === "-" || kolonaJePuna(k)) {
      zatvoriTastMerenja();
      return;
    }
    if (!String(k.input || "").trim()) {
      zatvoriTastMerenja();
      return;
    }
    pokusajDodajMerenje(i);
  }, [aktivnaKolona, kolonaJePuna, zatvoriTastMerenja, pokusajDodajMerenje]);

  const klikDodajMerenje = useCallback((i) => {
    pokusajDodajMerenje(i);
  }, [pokusajDodajMerenje]);

  const obrisiPoslednje = () => {
    const cols = koloneRef.current;
    let idx = poslednjaKolonaUnosRef.current;
    if (idx < 0 || !cols[idx]?.merenja?.length) {
      if (aktivnaKolona >= 0 && cols[aktivnaKolona]?.merenja?.length) {
        idx = aktivnaKolona;
      } else {
        for (let i = cols.length - 1; i >= 0; i -= 1) {
          if (cols[i].naziv !== "-" && cols[i].merenja?.length) {
            idx = i;
            break;
          }
        }
      }
    }
    if (idx < 0 || !cols[idx]?.merenja?.length) return;

    setKolone(prev => {
      const next = [...prev];
      const k = next[idx];
      if (!k || k.naziv === "-" || !k.merenja.length) return prev;
      const col = { ...k };
      const last = col.merenja[col.merenja.length - 1];
      const st = proveriOkNok(last.raw, col.lslDec, col.uslDec, col.jedinica);
      if (st === "OK") col.cntOK = Math.max(0, col.cntOK - 1);
      else col.cntNOK = Math.max(0, col.cntNOK - 1);
      col.merenja = col.merenja.slice(0, -1);
      col.ukupnoLabel = `${col.merenja.length} / ${brojPotrebnihZaKolonu(col, potrebanBroj)}`;
      next[idx] = col;
      return next;
    });
    poslednjaKolonaUnosRef.current = idx;
    setAktivnaKolona(idx);
  };

  const ucitajKoloneSerije = useCallback(() => {
    if (!idDeo || !grupaAB) return;
    const sopFb = sopZaPogon(sopMap, idDeo, pogonKod)?.broj_merenja || 5;
    const br = brojMerenjaZaSeriju(karakteristike, idDeo, grupaAB, sopFb, pogonKod);
    setPotrebanBroj(br);
    const cols = koloneZaGrupu(karakteristike, idDeo, grupaAB, br, pogonKod);
    setKolone(cols);
    setAktivnaKolona(indeksSledecePrazno(cols, br, 0));
  }, [idDeo, grupaAB, pogonKod, karakteristike, sopMap]);

  const sacuvajFai = async (odobri = false) => {
    if (snima || !idDeo || !faiRezimAktivan) return;
    if (!imaBiloSta(kolone)) {
      setPoruka("Nema FAI merenja.");
      return;
    }
    if (!svaMerenjaZavrsena(kolone, potrebanBroj)) {
      setPoruka("Unesite sva FAI merenja za sve dimenzije.");
      return;
    }
    const merenjaJson = [];
    for (const k of kolone) {
      if (k.naziv === "-") continue;
      for (const m of k.merenja) {
        merenjaJson.push({
          pozicija: k.naziv,
          vrednost: m.raw,
          status: proveriOkNok(m.raw, k.lslDec, k.uslDec, k.jedinica),
        });
      }
    }
    const imaNok = merenjaJson.some((e) => e.status === "NOK");
    if (odobri && imaNok && !mozeOdobriFai) {
      addToast("FAI ima NOK — samo kvalitet može odobriti", "greska");
      return;
    }
    setSnima(true);
    setPoruka("");
    try {
      const rec = await snimiFaiUnos(supabase, {
        idDeo,
        pogonKod,
        radniNalog,
        smena,
        merenja: merenjaJson,
        komentar: null,
        korisnik,
        odobri: odobri && (!imaNok || mozeOdobriFai),
      });
      setFaiPoslednjiId(rec.id);
      if (rec.status === "odobren") {
        setFaiOdobren(true);
        setFaiCekaOdobrenje(false);
        addToast("✓ FAI odobren — možete meriti seriju", "uspeh");
        ucitajKoloneSerije();
      } else {
        setFaiCekaOdobrenje(true);
        addToast(imaNok ? "FAI sa NOK — čeka kvalitet" : "FAI sačuvan — čeka odobrenje", "info");
      }
    } catch (e) {
      addToast(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const odobriFaiKasnije = async () => {
    if (snima || !faiPoslednjiId || !mozeOdobriFai) return;
    setSnima(true);
    try {
      const rec = await odobriFai(supabase, faiPoslednjiId, korisnik);
      if (rec.status === "odobren") {
        setFaiOdobren(true);
        setFaiCekaOdobrenje(false);
        addToast("✓ FAI odobren — možete meriti seriju", "uspeh");
        ucitajKoloneSerije();
      }
    } catch (e) {
      addToast(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const onSacuvajAkcija = () => {
    if (faiRezimAktivan) sacuvajFai(false);
    else sacuvaj();
  };

  const parsirajDatum = (d) => {
    const m = String(d).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return new Date().toISOString().slice(0, 10);
  };

  const sacuvaj = async () => {
    if (snima || !idDeo) return;
    if (faiRezimAktivan) {
      sacuvajFai(false);
      return;
    }
    if (sacuvaneGrupe.includes(grupaAB)) {
      if (prebaciNaSledecuSerijuPosleSnimanja(grupaAB)) return;
      addToast(`Serija ${grupaAB} je već sačuvana.`, "info");
      return;
    }
    if (!imaBiloSta(kolone)) {
      setPoruka("Nema merenja za snimanje.");
      return;
    }
    const potpuna = svaMerenjaZavrsena(kolone, potrebanBroj);
    if (!potpuna && !mozePreskociti) {
      setPoruka("");
      setPokaziZahtev(true);
      return;
    }
    const rnUpoz = await proveriRadniNalogUpozorenje(supabase, { idDeo, radniNalog });
    if (rnUpoz) addToast(`⚠ ${rnUpoz}`, "greska");

    setSnima(true);
    setPoruka("");
    const sesija_id = ensureSesija({
      modul: "merljive",
      idDeo,
      smena,
      radniNalog,
    });
    const rows = [];
    for (const k of kolone) {
      if (k.naziv === "-") continue;
      for (const m of k.merenja) {
        const st = proveriOkNok(m.raw, k.lslDec, k.uslDec, k.jedinica);
        rows.push({
          datum: parsirajDatum(datum),
          smena: Number(smena) || 1,
          radni_nalog: radniNalog,
          id_deo: idDeo,
          pogon_kod: pogonKod || null,
          karakteristika_id: k.id,
          sifra_merenja: grupaAB,
          pozicija: k.naziv,
          vrednost_raw: m.raw,
          vrednost_dec: m.dec,
          status: st,
          linija,
          kontrolor,
          operater: korisnik?.ime || "",
          merni_instrument: k.instrument,
          masina,
          radnik_id: korisnik?.radnikId || null,
          foto: st === "NOK" ? (fotoPoPoziciji[k.naziv] || null) : null,
          komentar: st === "NOK" ? (komentarPoPoziciji[k.naziv]?.trim() || null) : null,
          sesija_id,
        });
      }
    }
    const kpiPayload = {
      modul: "merljive",
      datum: parsirajDatum(datum),
      smena,
      id_deo: idDeo,
      serija: grupaAB,
      radni_nalog: radniNalog,
      sesija_id,
      kpi: kpiSerija,
    };

    if (!online) {
      addMerljiveSerija({
        merenja: rows,
        kpi: kpiPayload,
        meta: { grupaAB, idDeo },
      }, sesija_id);
      addToast(`📶 Offline: serija ${grupaAB} u redu (${rows.length} merenja + KPI)`, "info");
      setSnima(false);
      setFotoPoPoziciji({});
      setKomentarPoPoziciji({});
      setSacuvaneGrupe(prev => [...prev, grupaAB]);
      bumpPlanPosleSnimanja();
      if (!prebaciNaSledecuSerijuPosleSnimanja(grupaAB)) {
        setPoruka(`Offline sačuvano. Sinhronizuj kada bude mreža. Sesija: ${sesija_id}`);
      }
      return;
    }

    const { error } = await supabase.from("merenja_varijabilna").insert(rows);
    if (!error) {
      const { data: kpiData, error: errKpi } = await snimiKpiUnos(supabase, kpiPayload);
      if (errKpi) addToast(porukaKpiGreske(errKpi), "greska");
      else if (kpiData?.id) {
        setKpiDbId(kpiData.id);
        setKpiDbIdPoSeriji(prev => ({ ...prev, [grupaAB]: kpiData.id }));
        setKpiPoSeriji(prev => ({ ...prev, [grupaAB]: kpiSerijaRef.current }));
      }
    }
    setSnima(false);
    if (error) {
      const msg = porukaDbGreske(error);
      setPoruka(
        msg.includes("19_fix_merenja_varijabilna_sequence")
          ? msg
          : msg.includes("sesija_id")
            ? `${msg}\nPokreni 15_sesija_id.sql u Supabase.`
            : msg.includes("foto") || msg.includes("komentar") || msg.includes("schema cache")
              ? `${msg}\nPokreni 13_merenja_varijabilna_foto.sql u Supabase.`
              : msg,
      );
      return;
    }
    setFotoPoPoziciji({});
    setKomentarPoPoziciji({});
    if (prekidOdobrenId) {
      await zatvoriPrekidZahtev(supabase, prekidOdobrenId);
      setPrekidOdobrenId(null);
    }
    if (kalibracijaOdobrenId) {
      await zatvoriKalibracijaOdobrenje(supabase, kalibracijaOdobrenId);
      setKalibracijaOdobrenId(null);
    }
    setSacuvaneGrupe(prev => [...prev, grupaAB]);
    const neusTekucaSerija = Number(kpiSerija?.neusaglaseno) || 0;
    if (neusTekucaSerija > 0) {
      setKpiPanelOtvoren(true);
      addToast(`KPI: ${neusTekucaSerija} neusaglašeno — unesite doradu/škart`, "info");
    } else {
      setKpiPanelOtvoren(false);
    }
    await osveziPlanUzorkovanja();

    try {
      const alarmiNok = await proveriIKreirajAlarmeNokSerije(supabase, {
        rows,
        idDeo,
        radnikId: korisnik?.radnikId,
        serija: grupaAB,
        kolone,
      });
      if (alarmiNok.length) {
        postaviSpcAlarm(alarmiNok[0]);
        await osveziSpcAlarm();
        setPoruka(`⛔ SPC alarm — ${alarmiNok[0].pozicija || "NOK"} · potvrdite pre nastavka.`);
        return;
      }
    } catch (e) {
      addToast(`SPC alarm (NOK serija): ${e.message || "greška"}`, "greska");
    }

    if (prebaciNaSledecuSerijuPosleSnimanja(grupaAB)) {
      return;
    }
    const labelPrekid = !potpuna ? " (prekid sesije)" : "";
    const deoZaKpi = idDeo;
    const neusUkupno = agregirajKpiPoSerijama(
      { ...kpiPoSeriji, [grupaAB]: kpiSerija },
      grupaAB,
      kpiSerija,
    ).neusaglaseno || 0;
    setPoruka(`Serija ${grupaAB} sačuvana${labelPrekid}. Sva merenja za ovaj ID su kompletirana — forma se resetuje.`);
    novaSesija({ modul: "merljive", idDeo: "", smena, radniNalog: "" });
    setIdDeo("");
    setPogonKod("");
    setRadniNalog("");
    setNazivDela("");
    setLinija("");
    setMasina("-");
    setSlika("");
    prethodniId.current = "";
    prethodniPogon.current = "";
    prethodniAB.current = "";
    setGrupe([]);
    setGrupaAB("");
    setSacuvaneGrupe([]);
    setPrekidOdobrenId(null);
    setKpiSerija(podrazumevaniKpiIzMerenja({ kolone: [], potrebanBroj: 5, brojKolona: 0 }));
    setKpiPoSeriji({});
    setKpiDbId(null);
    setKpiDbIdPoSeriji({});
    kpiRucniUnos.current = false;
    setKpiPanelOtvoren(false);
    resetKolone(5);
    if (neusUkupno > 0 && deoZaKpi) {
      setKpiHubOtvoren(true);
      addToast(`ID ${deoZaKpi}: unesite doradu za ${neusUkupno} neusaglašenih (KPI panel)`, "info");
    }
  };

  const { stackVertikalno, desktopUnos } = L;
  const { telefon, telefonLandscape, uspravnoMobTab } = ekran;

  const metaRed = (naslov, vrednost, accent, K) => {
    const M = K.metaRed;
    return (
      <div style={{
        fontSize: M.vrednostFont,
        marginBottom: M.marginBottom,
        lineHeight: M.lineHeight,
        flexShrink: 0,
      }}>
        <span style={{
          color: C.border,
          fontSize: M.naslovFont,
          display: "block",
          textTransform: "uppercase",
          letterSpacing: M.naslovLetterSpacing,
        }}>
          {naslov}
        </span>
        <span style={{
          color: accent || C.tekst,
          fontWeight: accent ? M.vrednostFontWeightAccent : M.vrednostFontWeight,
          fontSize: M.vrednostFont,
        }}>
          {vrednost || "—"}
        </span>
      </div>
    );
  };

  const mobMetaCelija = (naslov, vrednost, accent, poravnanje = "left", K) => {
    const M = K.metaRed;
    return (
      <div style={{ flex: 1, minWidth: 0, textAlign: poravnanje }}>
        <div style={{
          color: C.border, fontSize: M.naslovFont, textTransform: "uppercase",
          letterSpacing: M.naslovLetterSpacing, lineHeight: 1.2, marginBottom: 1,
        }}>
          {naslov}
        </div>
        <div style={{
          color: accent || C.tekst,
          fontSize: M.vrednostFont,
          fontWeight: accent ? M.vrednostFontWeightAccent : M.vrednostFontWeight,
          lineHeight: 1.2,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {vrednost || "—"}
        </div>
      </div>
    );
  };

  const metaLevoDesno = (levoNaslov, levoVal, desnoNaslov, desnoVal, levoBoja, desnoBoja, K) => {
    const M = K.metaRed;
    const lslUsl = K.metaLslUsl;
    const naslovStil = {
      color: C.border,
      fontSize: M.naslovFont,
      display: "block",
      textTransform: "uppercase",
      letterSpacing: M.naslovLetterSpacing,
    };
    const vrednostStil = (boja) => ({
      color: boja || C.tekst,
      fontWeight: lslUsl.vrednostFontWeight,
      fontSize: M.vrednostFont,
    });
    return (
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: lslUsl.gap,
        marginBottom: lslUsl.marginBottom,
        flexShrink: 0,
        fontSize: M.vrednostFont,
        lineHeight: M.lineHeight,
      }}>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <span style={naslovStil}>{levoNaslov}</span>
          <span style={vrednostStil(levoBoja)}>{levoVal ?? "—"}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
          <span style={naslovStil}>{desnoNaslov}</span>
          <span style={vrednostStil(desnoBoja)}>{desnoVal ?? "—"}</span>
        </div>
      </div>
    );
  };

  const lbl = { display: "block", fontSize: L.fontLabel, color: C.sivi, marginBottom: 3 };

  const inp = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    padding: L.inpPadding,
    fontSize: L.fontInput,
    width: "100%",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  const inpMerenjeBaza = (kompakt) => {
    const K = dimKolonaUnos({ kompakt });
    return {
      ...inp,
      fontSize: K.inputMerenje.fontSize,
      fontWeight: K.inputMerenje.fontWeight,
      padding: K.inputMerenje.padding,
      minHeight: K.inputMerenje.minHeight,
      borderRadius: K.inputMerenje.borderRadius,
      boxSizing: "border-box",
    };
  };

  const padGlavni = L.padGlavni;

  const dugmadSerije = !L.mobTabKarusel && (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 6,
      flexShrink: 0,
      width: "100%",
    }}>
      <button type="button" disabled={!mozeObrisati} onClick={obrisiPoslednje}
        style={{
          background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6,
          color: C.tekst,
          padding: "9px 8px",
          cursor: mozeObrisati ? "pointer" : "not-allowed",
          fontSize: 10, fontWeight: 600, boxSizing: "border-box",
        }}>
        Obriši poslednje
      </button>
      <button type="button" disabled={!mozeSacuvati || snima || !!greskaDb} onClick={onSacuvajAkcija}
        style={{
          background: mozeSacuvati ? C.zelena : C.hover, border: "none", borderRadius: 6,
          color: "#fff",
          padding: "9px 8px",
          cursor: mozeSacuvati ? "pointer" : "not-allowed",
          fontWeight: 700, fontSize: 11, boxSizing: "border-box",
        }}>
        {snima ? "Snimam…" : (faiRezimAktivan
          ? "Sačuvaj FAI"
          : (prekidOdobrenId && !serijaPotpuna ? "Sačuvaj (prekid)" : "Sačuvaj seriju"))}
      </button>
    </div>
  );

  const prikaziMerljiveFormu = idDeo && grupaAB && unosKorak === "forma" && (
    !jeLinija || (
      (faiRezimAktivan || faiOdobren || !faiPotreban) && (
        (koristiMobLinija && linijaKorak >= 3) || (jeLinija && !koristiMobLinija)
      )
    )
  );
  const linijaListaDesktop = jeLinija && !koristiMobLinija && unosKorak === "forma"
    && idUcitano && !ucitavaDeo && !nalogUcitava
    && (faiRezimAktivan || faiOdobren || faiCekaOdobrenje || !faiPotreban);

  const kpiPanelVidljiv = idDeo && grupaAB && (
    prikaziMerljiveFormu || serijaJeSacuvana || faiCekaOdobrenje
  );

  const kpiPanelBlok = kpiPanelVidljiv ? (
    <KpiSerijaPanel
      C={C}
      kompakt
      idDeo={idDeo}
      vrednosti={kpiSerija}
      ukupnoZaDeo={kpiUkupnoZaDeo}
      onChange={promeniKpiSerija}
      grupaAB={grupaAB}
      otvoren={kpiPanelOtvoren}
      onToggle={() => setKpiPanelOtvoren(v => !v)}
      onZatvori={() => setKpiPanelOtvoren(false)}
      serijaSacuvana={!!serijaJeSacuvana}
      kpiUpisan={!!kpiDbId}
      snimaKpi={snimaKpi}
      onAzurirajKpi={azurirajKpiKasnije}
      mozeAzurirati={(!faiRezimAktivan && (!!kpiDbId || !!serijaJeSacuvana))}
      onOtvoriHub={() => setKpiHubOtvoren(true)}
      faiRezim={!!faiRezimAktivan}
      trakaJedanRed={L.mobTabKarusel}
    />
  ) : null;

  const mobDugmadAkcije = L.mobTabKarusel && (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
      flexShrink: 0, marginBottom: 2,
    }}>
      <button type="button" disabled={!mozeObrisati} onClick={obrisiPoslednje}
        style={{
          background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6,
          color: C.tekst, padding: "5px 8px", minHeight: 30,
          cursor: mozeObrisati ? "pointer" : "not-allowed",
          fontSize: 9, fontWeight: 600, whiteSpace: "nowrap", flex: 1, maxWidth: "48%",
        }}>
        {ekran.w < 340 ? "Obriši" : "Obriši poslednje"}
      </button>
      <button type="button" disabled={!mozeSacuvati || snima || !!greskaDb} onClick={onSacuvajAkcija}
        style={{
          background: mozeSacuvati ? C.zelena : C.hover, border: "none", borderRadius: 6,
          color: "#fff", padding: "5px 8px", minHeight: 30,
          cursor: mozeSacuvati ? "pointer" : "not-allowed",
          fontWeight: 700, fontSize: 9, flex: 1, maxWidth: "48%", whiteSpace: "nowrap",
        }}>
        {snima ? "Snimam…" : (faiRezimAktivan
          ? (ekran.w < 360 ? "FAI" : "Sačuvaj FAI")
          : (prekidOdobrenId && !serijaPotpuna
            ? (ekran.w < 360 ? "Sačuvaj*" : "Sačuvaj (prekid)")
            : (ekran.w < 360 ? "Sačuvaj" : "Sačuvaj seriju")))}
      </button>
    </div>
  );

  const mobSerijaStatus = L.mobTabKarusel && grupe.length > 0 && (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
      flexShrink: 0, padding: "4px 0 6px",
    }}>
      {grupe.map((g, gi) => {
        const idx = grupe.indexOf(g);
        const aktivna = g === grupaAB;
        const zavrsena = sacuvaneGrupe.includes(g);
        const buduca = idx > indeksAktivne && !zavrsena;
        return (
          <span key={g} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {gi > 0 && (
              <span style={{ color: C.border, fontSize: 9, opacity: 0.45 }}>|</span>
            )}
            <span style={{
              fontSize: aktivna ? 10 : 9,
              fontWeight: aktivna ? 700 : 500,
              letterSpacing: 0.6,
              color: aktivna ? C.zelena : zavrsena ? C.plava : C.sivi,
              opacity: aktivna ? 1 : buduca ? 0.28 : zavrsena ? 0.85 : 0.55,
            }}>
              Serija {g}{zavrsena && !aktivna ? " ✓" : ""}
            </span>
          </span>
        );
      })}
    </div>
  );

  const serijeMeta = idDeo
    ? grupeMerenjaSaMetom(
      karakteristike,
      idDeo,
      sopZaPogon(sopMap, idDeo, pogonKod)?.broj_merenja || 5,
      pogonKod,
    )
    : [];

  const serijaDugmad = (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {serijeMeta.map((meta) => {
        const g = meta.sifra;
        const idx = grupe.indexOf(g);
        const aktivna = g === grupaAB;
        const zavrsena = sacuvaneGrupe.includes(g);
        const zakljucana = idx > indeksAktivne && !zavrsena;
        const kratko = meta.faza_naziv
          ? `${g} · ${meta.faza_naziv} (${meta.broj_merenja}×)`
          : `${g} (${meta.broj_merenja}×)`;
        return (
          <button
            key={g}
            type="button"
            disabled={zakljucana}
            onClick={() => !zakljucana && onGrupaChange(g)}
            title={zakljucana ? `Prvo završi seriju ${grupe[idx - 1] || "prethodnu"}` : labelSerije(meta)}
            style={{
              ...inp,
              width: "auto",
              minWidth: 32,
              padding: "3px 8px",
              cursor: zakljucana ? "not-allowed" : "pointer",
              opacity: zakljucana ? 0.4 : 1,
              borderColor: aktivna ? C.zelena : zavrsena ? C.plava : C.border,
              background: aktivna ? `${C.zelena}22` : C.input,
              fontWeight: aktivna ? 700 : 400,
              fontSize: 10,
            }}
          >
            {kratko}{zavrsena ? " ✓" : ""}
          </button>
        );
      })}
      {!serijeMeta.length && <span style={{ color: C.sivi, fontSize: 10 }}>—</span>}
    </div>
  );

  const G = DIM_GENERALIJE_RED;
  const lblGen = { ...lbl, ...G.label, letterSpacing: 0.6 };
  const inpGen = {
    ...inp,
    fontSize: G.input.fontSize,
    padding: G.input.padding,
    borderRadius: G.input.borderRadius,
    lineHeight: G.input.lineHeight,
    height: G.input.visina,
    minHeight: G.input.visina,
    maxHeight: G.input.visina,
    boxSizing: "border-box",
  };

  const generalijeGornjiRed = desktopUnos && (
    <div style={{
      display: "flex",
      flexWrap: "nowrap",
      gap: G.gap,
      alignItems: "flex-end",
      marginBottom: 6,
      flexShrink: 0,
      width: "100%",
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
    }}>
      <label style={{ ...lblGen, ...flexPolje(G.polja.datum) }}>
        Datum
        <input style={inpGen} value={datum} onChange={e => setDatum(e.target.value)} />
      </label>
      <div style={flexPolje(G.polja.smena)}>
        <SmenaAutoPrikaz
          smena={smena}
          C={C}
          lblStyle={lblGen}
          inpStyle={inpGen}
        />
      </div>
      <div style={flexPolje(G.polja.idDeo)}>
        <IdDeoBarkodRed
          C={C}
          akcent={C.zelena}
          onBarkodSken={obradiBarkodSken}
          lblStyle={lblGen}
          idLabel="ID deo *"
          kompaktRed
          sirinaBarkod={G.kamera.sirina}
          razmakKolona={G.kamera.razmakOdId}
          unosStil={{
            borderRadius: G.input.borderRadius,
            padding: G.input.padding,
            fontSize: G.input.fontSize,
          }}
        >
          <input
            style={{
              ...inpGen,
              letterSpacing: 0.5,
              textAlign: "center",
            }}
            value={idDeo}
            {...idBarkodPolje}
            onBlur={e => potvrdiIdDeo(e.target.value)}
            placeholder="5502-A"
            title="Ručni unos, USB čitač ili 📷 kamera"
          />
        </IdDeoBarkodRed>
      </div>
      <label style={{ ...lblGen, ...flexPolje(G.polja.radniNalog) }}>
        Radni nalog
        <input
          style={inpGen}
          value={nalogUcitava ? "…" : (radniNalog || "—")}
          readOnly
          title={[
            nalogInfo?.kupac && `Kupac: ${nalogInfo.kupac}`,
            nalogInfo?.rok_isporuke && `Rok: ${nalogInfo.rok_isporuke}`,
          ].filter(Boolean).join(" · ") || undefined}
        />
      </label>
      {(nalogInfo?.kupac || nalogInfo?.rok_isporuke) && (
        <div style={{
          flex: "1 1 100%",
          fontSize: 9,
          color: C.sivi,
          lineHeight: 1.35,
          padding: "2px 4px",
        }}>
          {nalogInfo.kupac && <span>Kupac: <strong style={{ color: C.tekst }}>{nalogInfo.kupac}</strong></span>}
          {nalogInfo.kupac && nalogInfo.rok_isporuke && " · "}
          {nalogInfo.rok_isporuke && <span>Rok isporuke: <strong style={{ color: C.tekst }}>{nalogInfo.rok_isporuke}</strong></span>}
        </div>
      )}
      {dostupniPogoni.length > 1 && (
        <div style={{ flex: "0 0 auto", minWidth: 200, maxWidth: 320 }}>
          <PogonIzborPanel
            C={C}
            pogoni={dostupniPogoni}
            omoguceniPogoni={omoguceniPogoni}
            pogonKod={pogonKod}
            onIzaberi={onPogonChange}
            kompakt
            obavezan={trebaIzborPogona}
          />
        </div>
      )}
      {pogonKod && dostupniPogoni.length <= 1 && (
        <label style={{ ...lblGen, flex: "0 0 auto", minWidth: 0 }}>
          Pogon
          <input style={inpGen} value={labelPogona(pogonKod)} readOnly />
        </label>
      )}
      <label style={{ ...lblGen, ...flexPolje(G.polja.nazivDela) }}>
        Naziv dela
        <input style={inpGen} value={nazivDela} readOnly />
      </label>
      <label style={{ ...lblGen, ...flexPolje(G.polja.linija) }}>
        Linija
        <input style={inpGen} value={linija} readOnly />
      </label>
      <label style={{ ...lblGen, ...flexPolje(G.polja.kontrolor) }}>
        Kontrolor
        <input style={inpGen} value={kontrolor} readOnly />
      </label>
      <label style={{ ...lblGen, ...flexPolje(G.polja.masina) }}>
        Mašina
        <input style={inpGen} value={masina || "-"} readOnly />
      </label>
      <label style={{ ...lblGen, flex: "0 0 auto", minWidth: 0 }}>
        Serija
        <div style={{ display: "flex", gap: 3, flexWrap: "nowrap" }}>
          {grupe.map((g) => {
            const idx = grupe.indexOf(g);
            const aktivna = g === grupaAB;
            const zavrsena = sacuvaneGrupe.includes(g);
            const zakljucana = idx > indeksAktivne && !zavrsena;
            return (
              <button
                key={g}
                type="button"
                disabled={zakljucana}
                onClick={() => !zakljucana && onGrupaChange(g)}
                title={zakljucana ? `Prvo završi seriju ${grupe[idx - 1] || "prethodnu"}` : g}
                style={{
                  ...inpGen,
                  width: "auto",
                  minWidth: 26,
                  padding: "4px 6px",
                  cursor: zakljucana ? "not-allowed" : "pointer",
                  opacity: zakljucana ? 0.4 : 1,
                  borderColor: aktivna ? C.zelena : zavrsena ? C.plava : C.border,
                  background: aktivna ? `${C.zelena}22` : C.input,
                  fontWeight: aktivna ? 700 : 400,
                }}
              >
                {g}{zavrsena ? " ✓" : ""}
              </button>
            );
          })}
          {!grupe.length && <span style={{ color: C.sivi, fontSize: 10 }}>—</span>}
        </div>
      </label>
      {faiRezimAktivan && (
        <div style={{
          flex: "0 0 auto",
          alignSelf: "center",
          background: `${C.zuta}18`,
          border: `1px solid ${C.zuta}55`,
          borderRadius: 6,
          padding: "6px 10px",
          maxWidth: 280,
        }}>
          <div style={{ color: C.zuta, fontSize: 10, fontWeight: 700 }}>FAI — prvo parče 1</div>
          <div style={{ color: C.sivi, fontSize: 9, marginTop: 2, lineHeight: 1.35 }}>
            <code style={{ fontSize: 9 }}>nivo_kontrole = DA</code>
            {" "}· {brojFaiDimenzija} dim.
          </div>
        </div>
      )}
    </div>
  );

  const renderKolonaKompletna = (k, K, kompakt) => (
    <div style={{
      width: "100%",
      flexShrink: 0,
      background: `${C.zelena}14`,
      border: `1px solid ${C.zelena}55`,
      borderRadius: K.kartica.borderRadius,
      padding: kompakt ? "10px 8px" : K.inputMerenje.padding,
      minHeight: kompakt ? 40 : K.inputMerenje.minHeight,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginBottom: kompakt ? 0 : K.inputMerenje.marginBottom,
      color: C.zelena,
      fontSize: kompakt ? 11 : 12,
      fontWeight: 700,
      boxSizing: "border-box",
    }}>
      <span>✓</span>
      <span>Kompletno · {k.ukupnoLabel}</span>
    </div>
  );

  const renderKolonaKartica = (k, i, kompakt = false) => {
    const K = dimKolonaUnos({ kompakt });
    const inpMerenje = inpMerenjeBaza(kompakt);
    const kolonaPuna = kolonaJePuna(k);
    return (
    <div style={{
      background: C.panel,
      border: kolonaPuna
        ? `2px solid ${C.zelena}`
        : aktivnaKolona === i && k.naziv !== "-"
        ? `${K.kartica.borderAktivna}px solid ${C.zelena}`
        : `${K.kartica.borderObicna}px solid ${C.border}`,
      opacity: kolonaPuna ? 0.92 : 1,
      borderRadius: K.kartica.borderRadius,
      padding: K.kartica.padding,
      boxSizing: "border-box",
      width: "100%",
      height: kompakt ? undefined : "100%",
      flex: kompakt ? undefined : 1,
      minHeight: kompakt ? undefined : 0,
      display: "flex",
      flexDirection: "column",
    }}>
      {k.naziv !== "-" ? (
        <>
          {!kompakt && (
            <>
              {metaRed("Šta se meri", k.naziv, C.plava, K)}
              {k.nazivMere ? metaRed("Nominala / oznaka", k.nazivMere, undefined, K) : null}
              {metaRed("Merni instrument", tekstInstrumentaSaBrojem(k.instrument, merilaMap), undefined, K)}
              {k.klasaLabel ? metaRed("Klasa defekta", k.klasaLabel, C.sivi, K) : null}
              {metaRed("Broj merenja", k.ukupnoLabel, C.zuta, K)}
            </>
          )}
          {!kompakt && metaLevoDesno("LSL", k.lslText, "USL", k.uslText, undefined, undefined, K)}
          {!kompakt && k.plausibilnost && (
            <div style={{
              color: C.sivi,
              fontSize: K.plausibilnost.fontSize,
              marginTop: K.plausibilnost.marginTop,
              marginBottom: K.plausibilnost.marginBottom,
              lineHeight: 1.35,
            }}>
              Opseg: {formatOpsegPlausibilnosti(k.plausibilnost, k.jedinica)}
            </div>
          )}
          {kompakt ? (
            <>
              <div style={{
                background: C.input,
                border: `1px solid ${C.border}`,
                borderRadius: K.kartica.borderRadius,
                padding: "6px 8px",
                marginBottom: 4,
                flexShrink: 0,
              }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {mobMetaCelija("Šta se meri", k.naziv, C.plava, "left", K)}
                  {mobMetaCelija("Broj merenja", k.ukupnoLabel, C.zuta, "center", K)}
                  {mobMetaCelija("Merni instrument", tekstInstrumentaSaBrojem(k.instrument, merilaMap), undefined, "right", K)}
                </div>
                <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                  {mobMetaCelija("LSL", k.lslText, undefined, "left", K)}
                  {mobMetaCelija("Nominala / oznaka", k.nazivMere || "—", undefined, "center", K)}
                  {mobMetaCelija("USL", k.uslText, undefined, "right", K)}
                </div>
                {kolonaPuna ? renderKolonaKompletna(k, K, true) : (
                  <input
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    readOnly={koristiTastMerenja}
                    inputMode={koristiTastMerenja ? "none" : inputModeMerenja(k)}
                    enterKeyHint="done"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    style={{
                      ...inpMerenje,
                      width: "100%",
                      marginBottom: 0,
                      background: bojaUnosMerenja(k.input, k.lslDec, k.uslDec, k.nominalDec, k.jedinica, C),
                      outline: aktivnaKolona === i ? `2px solid ${C.zelena}55` : "none",
                      border: `1px solid ${C.border}`,
                      cursor: koristiTastMerenja ? "pointer" : undefined,
                    }}
                    value={k.input}
                    onFocus={(e) => {
                      if (kolonaJePuna(k)) {
                        e.target.blur();
                        prebaciNaSledecuPraznuKolonu(i + 1);
                        return;
                      }
                      if (!koristiTastMerenja) onFocusTastatura(e);
                      setAktivnaKolona(i);
                      if (koristiTastMerenja) setTastMerenjaVidljiva(true);
                    }}
                    onChange={koristiTastMerenja
                      ? undefined
                      : (e => promeniInputMerenja(i, sanitizujInputMerenja(e.target.value, k), k))}
                    onBlur={() => {
                      if (koristiTastMerenja) setTastMerenjaVidljiva(false);
                      blurInputMerenja(i);
                    }}
                    onKeyDown={koristiTastMerenja ? undefined : (e => keyDownInputMerenja(e, i, k))}
                    placeholder={koristiUgaoUnosKolone(k)
                      ? "440000 = 44°00′00″"
                      : (k.plausibilnost ? "u opsegu npr. 33" : "0,00")}
                  />
                )}
              </div>
              {k.plausibilnost && !kolonaPuna && (
                <div style={{
                  color: C.sivi,
                  fontSize: K.plausibilnost.fontSize,
                  marginTop: 1,
                  marginBottom: 3,
                  lineHeight: 1.3,
                }}>
                  Opseg: {formatOpsegPlausibilnosti(k.plausibilnost, k.jedinica)}
                </div>
              )}
              {!kolonaPuna && !(koristiTastMerenja && tastMerenjaVidljiva && aktivnaKolona === i) && (
              <button type="button" onClick={() => klikDodajMerenje(i)}
                style={{
                  width: K.dugmeDodaj.width,
                  background: C.plava,
                  border: "none",
                  borderRadius: K.dugmeDodaj.borderRadius,
                  color: "#fff",
                  padding: K.dugmeDodaj.padding,
                  minHeight: K.dugmeDodaj.minHeight,
                  cursor: "pointer",
                  fontSize: K.dugmeDodaj.fontSize,
                  fontWeight: K.dugmeDodaj.fontWeight,
                  marginBottom: K.dugmeDodaj.marginBottom,
                  flexShrink: 0,
                  boxSizing: "border-box",
                }}>
                + Dodaj
              </button>
              )}
            </>
          ) : (
            <>
              <div style={{
                color: C.border,
                fontSize: K.labelUnos.fontSize,
                textTransform: "uppercase",
                letterSpacing: K.labelUnos.letterSpacing,
                marginTop: K.labelUnos.marginTop,
                marginBottom: K.labelUnos.marginBottom,
                flexShrink: 0,
              }}>
                Unos merenja
              </div>
              {kolonaPuna ? renderKolonaKompletna(k, K, false) : (
                <input
                  ref={el => { inputRefs.current[i] = el; }}
                  style={{
                    ...inpMerenje,
                    marginBottom: K.inputMerenje.marginBottom,
                    flexShrink: 0,
                    width: "100%",
                    background: bojaUnosMerenja(k.input, k.lslDec, k.uslDec, k.nominalDec, k.jedinica, C),
                    outline: aktivnaKolona === i ? `2px solid ${C.zelena}55` : "none",
                  }}
                  value={k.input}
                  onFocus={() => {
                    if (kolonaJePuna(k)) {
                      prebaciNaSledecuPraznuKolonu(i + 1);
                      return;
                    }
                    setAktivnaKolona(i);
                    if (koristiTastMerenja) setTastMerenjaVidljiva(true);
                  }}
                  onChange={e => promeniInputMerenja(i, sanitizujInputMerenja(e.target.value, k), k)}
                  onBlur={() => {
                    if (koristiTastMerenja) setTastMerenjaVidljiva(false);
                    blurInputMerenja(i);
                  }}
                  onKeyDown={e => keyDownInputMerenja(e, i, k)}
                  title={k.plausibilnost
                    ? `Dozvoljen opseg: ${formatOpsegPlausibilnosti(k.plausibilnost, k.jedinica)}`
                    : undefined}
                  placeholder={koristiUgaoUnosKolone(k)
                    ? "440000 = 44°00′00″"
                    : (k.plausibilnost ? "u opsegu npr. 33" : "0,00")}
                />
              )}
              {!kolonaPuna && !(koristiTastMerenja && tastMerenjaVidljiva && aktivnaKolona === i) && (
              <button type="button" onClick={() => klikDodajMerenje(i)}
                style={{
                  width: K.dugmeDodaj.width,
                  background: C.plava,
                  border: "none",
                  borderRadius: K.dugmeDodaj.borderRadius,
                  color: "#fff",
                  padding: K.dugmeDodaj.padding,
                  minHeight: K.dugmeDodaj.minHeight,
                  cursor: "pointer",
                  fontSize: K.dugmeDodaj.fontSize,
                  fontWeight: K.dugmeDodaj.fontWeight,
                  marginBottom: K.dugmeDodaj.marginBottom,
                  flexShrink: 0,
                  boxSizing: "border-box",
                }}>
                + Dodaj
              </button>
              )}
            </>
          )}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: K.okNok.gap,
            marginBottom: K.okNok.marginBottom,
            flexShrink: 0,
          }}>
            {[["NOK", k.cntNOK, C.crvena], ["OK", k.cntOK, C.zelena]].map(([lblOk, br, boja]) => (
              <div key={lblOk} style={{
                background: `${boja}14`,
                border: `1px solid ${boja}40`,
                borderRadius: K.okNok.borderRadius,
                padding: K.okNok.padding,
                textAlign: "center",
                minHeight: K.okNok.minHeight,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}>
                <span style={{ color: C.border, fontSize: K.okNok.labelFont, letterSpacing: 0.8, marginBottom: 2 }}>{lblOk}</span>
                <span style={{
                  color: boja, fontSize: K.okNok.brojFont, fontWeight: 800, lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}>
                  {br ?? 0}
                </span>
              </div>
            ))}
          </div>
          <FotoNokUnos
            C={C}
            kompakt
            foto={fotoPoPoziciji[k.naziv] || null}
            komentar={komentarPoPoziciji[k.naziv] || ""}
            onFoto={url => setFotoPoPoziciji(p => {
              const next = { ...p };
              if (url) next[k.naziv] = url;
              else delete next[k.naziv];
              return next;
            })}
            onKomentar={t => setKomentarPoPoziciji(p => ({ ...p, [k.naziv]: t }))}
            onGreska={m => setPoruka(m)}
          />
          <div style={{
            color: C.border,
            fontSize: K.lista.labelFont,
            textTransform: "uppercase",
            letterSpacing: 0.4,
            marginBottom: K.lista.marginBottom,
            flexShrink: 0,
          }}>
            Lista merenja
          </div>
          <ul style={{
            listStyle: "none", padding: 0, margin: 0, flex: 1,
            minHeight: K.lista.minHeight,
            maxHeight: K.lista.maxHeight ?? undefined,
            overflow: "auto",
            fontSize: K.lista.fontSize,
            fontVariantNumeric: "tabular-nums",
          }}>
            {k.merenja.map((m, j) => (
              <li key={j} style={{
                padding: K.lista.itemPadding,
                marginBottom: 1,
                borderRadius: 3,
                background: proveriOkNok(m.raw, k.lslDec, k.uslDec, k.jedinica) === "OK"
                  ? `${C.zelena}12` : `${C.crvena}12`,
                color: proveriOkNok(m.raw, k.lslDec, k.uslDec, k.jedinica) === "OK" ? C.zelena : C.crvena,
                fontWeight: 600,
              }}>
                {m.raw}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div style={{ color: C.border, fontSize: 11, textAlign: "center", margin: "auto" }}>—</div>
      )}
    </div>
    );
  };

  const faiCekaBlok = jeLinija && faiCekaOdobrenje && unosKorak === "forma" && (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, gap: 6, overflow: "hidden" }}>
      {kpiPanelBlok}
      <div style={{ flex: 1, padding: "0 0 8px", overflowY: "auto", minHeight: 0 }}>
        <FaiUnosTraka
          C={C}
          idDeo={idDeo}
          brojDimenzija={brojFaiDimenzija}
          kompletno={false}
          snima={snima}
          mozeOdobri={mozeOdobriFai}
          cekaOdobrenje
          onOdobri={odobriFaiKasnije}
        />
      </div>
    </div>
  );

  const merljiveFormaBlok = prikaziMerljiveFormu && (() => {
    const aktivnaKol = aktivnaKolona >= 0 ? kolone[aktivnaKolona] : null;
    const prikaziTastMerenja = koristiTastMerenja
      && tastMerenjaVidljiva
      && aktivnaKol
      && aktivnaKol.naziv !== "-"
      && !kolonaJePuna(aktivnaKol);
    const ugaoTast = aktivnaKol && (
      koristiUgaoUnosKolone(aktivnaKol)
      || unosKaoUgao(aktivnaKol.jedinica, aktivnaKol.input, aktivnaKol.lslDec, aktivnaKol.uslDec)
    );

    return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: L.mobTabKarusel ? 0 : (desktopUnos ? 0 : undefined),
      height: desktopUnos || L.mobTabKarusel ? "100%" : undefined,
      overflow: "hidden",
    }}>
      {digitalniUnos && (
        <DigitalnoMeriloPanel
          C={C}
          kolone={kolone}
          setKolone={setKolone}
          potrebanBroj={potrebanBroj}
          aktivnaKolona={aktivnaKolona}
          setAktivnaKolona={setAktivnaKolona}
          addToast={addToast}
          kompakt={ekran.telefon}
          onPovezanChange={onMeriloPovezanChange}
          registerStop={registerMeriloStop}
          registerSimuliraj={registerMeriloSimuliraj}
        />
      )}
      {!L.mobTabKarusel && !faiRezimAktivan && (
        <div style={{ fontSize: 10, color: C.zuta, marginBottom: 4, flexShrink: 0, flex: "0 0 auto" }}>
          {metaAktivneSerije ? labelSerije(metaAktivneSerije) : `Serija ${grupaAB}`}
          : unesi {potrebanBroj} merenja po koloni, pa Sačuvaj.
          {ciljSesije > 0 && (
            <span style={{ color: C.sivi }}> · Preostalo serija: {preostaloSesije} / {ciljSesije}</span>
          )}
        </div>
      )}
      {faiRezimAktivan && (
        <FaiUnosTraka
          C={C}
          idDeo={idDeo}
          brojDimenzija={brojFaiDimenzija}
          kompletno={faiKompletno}
          snima={snima}
          mozeOdobri={mozeOdobriFai}
          stranica={faiPaginacija?.stranica ?? 0}
          ukupnoStranica={faiPaginacija?.ukupnoStranica ?? 1}
          onPrethodnaStranica={() => promeniFaiStranicu(Math.max(0, (faiPaginacija?.stranica ?? 0) - 1))}
          onSledecaStranica={() => promeniFaiStranicu(
            Math.min((faiPaginacija?.ukupnoStranica ?? 1) - 1, (faiPaginacija?.stranica ?? 0) + 1),
          )}
          onSacuvaj={sacuvajFai}
          onOdobri={() => sacuvajFai(true)}
          kompakt={L.mobTabKarusel}
        />
      )}
      {kpiPanelBlok}
      {prekidOdobrenId && imaNepotpunuSesiju && (
        <div style={{
          background: C.ok, border: `1px solid ${C.zelena}`, borderRadius: 6,
          padding: "8px 10px", fontSize: 10, color: C.zelena, fontWeight: 700, marginBottom: 6,
        }}>
          ✓ Prekid odobren — možete sačuvati nepotpunu seriju
        </div>
      )}
      {zoomSlika && urlSlike && (
        <div role="presentation" onClick={() => setZoomSlika(false)}
          style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.88)", display: "flex", flexDirection: "column", padding: 16 }}>
          <div role="presentation" onClick={e => e.stopPropagation()}
            style={{ flex: 1, background: C.panel, borderRadius: 10, border: `1px solid ${C.border}`, padding: 12, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <CrtezZoomViewer url={urlSlike} C={C} onClose={() => setZoomSlika(false)} />
          </div>
        </div>
      )}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        gap: L.mobTabKarusel ? 4 : 8,
        overflow: "hidden",
      }}>
        {L.mobTabKarusel ? (
          <>
            {mobDugmadAkcije}
            <MerljivaMobTabKarusel
              key={`${viewportKey}-f${faiStranica}`}
              C={C}
              brojKolona={faiRezimAktivan ? 5 : kolone.length}
              aktivnaKolona={prikazIndeksKolone}
              onPrethodna={idiPrethodnaKolonaMob}
              onSledeca={idiSledecaKolonaMob}
              urlSlike={urlSlike}
              slika={slika}
              idDeo={idDeo}
              onZoomSlika={() => setZoomSlika(true)}
              sredinaZaglavlje={faiRezimAktivan ? null : mobSerijaStatus}
            >
              {(() => {
                const slot = prikazIndeksKolone;
                const ri = faiRezimAktivan && faiPaginacija
                  ? (faiPaginacija.prikaz[slot]?.realniIndeks ?? -1)
                  : slot;
                const k = ri >= 0 ? kolone[ri] : kolonaZaSlot(slot);
                return renderKolonaKartica(k, ri >= 0 ? ri : slot, true);
              })()}
            </MerljivaMobTabKarusel>
          </>
        ) : (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "row",
            gap: 10,
            alignItems: "stretch",
            minHeight: 0,
            overflow: "hidden",
          }}>
            <div style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              minHeight: 0,
              height: "100%",
            }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                gap: L.koloneGap,
                flex: 1,
                width: "100%",
                minHeight: 0,
                maxHeight: "100%",
                height: "100%",
                overflow: "hidden",
                alignContent: "stretch",
              }}>
                {(faiRezimAktivan && faiPaginacija
                  ? faiPaginacija.prikaz
                  : kolone.map((k, i) => ({ kolona: k, realniIndeks: i, slot: i }))
                ).map((p) => {
                  const ri = p.realniIndeks ?? -1;
                  const k = p.kolona;
                  const key = faiRezimAktivan ? `f-${faiStranica}-${p.slot}` : `s-${p.slot}`;
                  return (
                  <div key={key} style={{
                    opacity: k.naziv === "-" ? 0.4 : 1,
                    height: "100%",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}>
                    {renderKolonaKartica(k, ri >= 0 ? ri : p.slot, false)}
                  </div>
                  );
                })}
              </div>
            </div>
            <aside style={{
              flex: `0 0 ${L.slikaSirina}px`,
              width: L.slikaSirina,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              height: "100%",
              gap: 6,
            }}>
              <div style={{
                background: C.panel,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                width: "100%",
                flex: 1,
                minHeight: 100,
                boxSizing: "border-box",
                padding: 6,
                display: "flex",
                flexDirection: "column",
              }}>
                <div style={{ fontSize: 9, color: C.sivi, marginBottom: 2, textAlign: "center", flexShrink: 0 }}>
                  Crtež · klik = ceo ekran
                </div>
                {urlSlike ? (
                  <CrtezZoomViewer url={urlSlike} C={C} onFullscreen={() => setZoomSlika(true)} />
                ) : (
                  <div style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.border,
                    fontSize: 10,
                    textAlign: "center",
                    padding: 8,
                    background: C.input,
                    borderRadius: 6,
                    border: `1px solid ${C.border}`,
                  }}>
                    {idDeo ? (slika ? "Nije učitana" : "Nema crteža") : "Unesi ID"}
                  </div>
                )}
              </div>
              {dugmadSerije}
            </aside>
          </div>
        )}
      </div>
      {prikaziTastMerenja && (
        <TastaturaBrojeviMerljive
          C={C}
          ugao={!!ugaoTast}
          onTaster={primeniTastaturuMerenja}
          onGotovoDodaj={gotovoDodajTastMerenja}
          kompakt
        />
      )}
    </div>
    );
  })();

  const trebaCekListaMer = tab === "unos" && !listaSpremna && !jeLinija && !mozeAdmin;
  const trebaEmbeddedListaMer = tab === "unos" && !listaSpremna && jeLinija && idUcitano
    && koristiMobLinija && !mozeAdmin;

  if (trebaCekListaMer) {
    const idZaListu = null;
    return (
      <div style={{
        minHeight: "100dvh",
        background: C.bg,
        fontFamily: "'IBM Plex Mono', monospace",
        display: "flex",
        flexDirection: "column",
      }}>
        <AppHeader
          korisnik={korisnik}
          onOdjava={onOdjava}
          onNazad={onNazad}
          C={C}
          onToggleTema={onToggleTema}
          temaTamna={temaTamna}
        />
        <KontrolnaLista
          korisnik={korisnik}
          smena={Number(smena)}
          idDeo={idZaListu}
          naslovModul="Merljive"
          akcent={C.zelena}
          onZavrsena={zavrsiKontrolnuListu}
          C={C}
        />
      </div>
    );
  }

  const mobVisina = stackVertikalno || ekran.linijaUredjaj;

  return (
    <div
      key={viewportKey}
      style={{
      height: mobVisina ? `${ekran.visinaLayout}px` : "100vh",
      minHeight: mobVisina ? `${ekran.visinaLayout}px` : "100vh",
      maxHeight: mobVisina ? `${ekran.visinaLayout}px` : undefined,
      display: "flex",
      flexDirection: "column",
      overflow: mobVisina && ekran.tastaturaOtvorena ? "auto" : "hidden",
      WebkitOverflowScrolling: mobVisina && ekran.tastaturaOtvorena ? "touch" : undefined,
      background: C.bg,
      fontFamily: "'IBM Plex Mono', monospace",
      color: C.tekst,
    }}>
      {pokaziZahtevKal && idDeo && (
        <ZahtevKalibracija
          korisnik={korisnik}
          idDeo={idDeo}
          nazivDela={nazivDela}
          instrumenti={instrumentiKalTekst}
          onUspeh={() => {
            setPokaziZahtevKal(false);
            proveriKalibraciju();
            addToast("✓ Zahtev poslat adminu — čeka odobrenje kalibracije", "uspeh");
          }}
          onOtkazati={() => setPokaziZahtevKal(false)}
          C={C}
        />
      )}

      {pokaziZahtev && idDeo && (
        <ZahtevPrekid
          korisnik={korisnik}
          idDeo={idDeo}
          nazivDela={nazivDela}
          preostalo={preostaloSesije}
          cilj={ciljSesije || 1}
          podnaslov="Merljive · nepotpuna serija A/B"
          onUspeh={() => {
            setPokaziZahtev(false);
            proveriPrekid();
            addToast("✓ Zahtev poslat adminu — čeka odobrenje", "uspeh");
          }}
          onOtkazati={() => setPokaziZahtev(false)}
          C={C}
        />
      )}

      {spcBlokira && spcAlarm && (
        <SpcAlarmBlokada
          alarm={spcAlarm}
          korisnik={korisnik}
          nazivDela={nazivDela}
          radniNalog={radniNalog}
          podnaslov="Merljive · linija"
          C={C}
          onPotvrdjeno={() => {
            ocistiSpcAlarm();
            osveziSpcAlarm();
            if (grupaAB && sacuvaneGrupe.includes(grupaAB)) {
              prebaciNaSledecuSerijuPosleSnimanja(grupaAB);
            }
            addToast("✓ SPC alarm potvrđen — možete nastaviti unos", "uspeh");
          }}
          onKarantin={() => {
            ocistiSpcAlarm();
            osveziSpcAlarm();
            addToast("🔒 Karantin aktivan — eskalacija poslata, čeka kvalitet", "greska");
          }}
          onZatvoreno={() => {
            ocistiSpcAlarm();
            osveziSpcAlarm();
            if (grupaAB && sacuvaneGrupe.includes(grupaAB)) {
              prebaciNaSledecuSerijuPosleSnimanja(grupaAB);
            }
            addToast("✓ SPC alarm zatvoren", "uspeh");
          }}
          onOsvezi={osveziSpcAlarm}
          onZahtevPrekid={() => setPokaziZahtev(true)}
        />
      )}

      {toasts.length > 0 && (
        <div style={{ position: "fixed", top: 12, right: 12, zIndex: 9999, display: "flex", flexDirection: "column", gap: 6 }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              background: t.tip === "greska" ? C.crvena : t.tip === "uspeh" ? C.zelena : C.plava,
              color: "#fff", padding: "10px 14px", borderRadius: 8, fontSize: 11, maxWidth: 320,
              whiteSpace: "pre-wrap", boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}>
              {t.tekst}
            </div>
          ))}
        </div>
      )}

      <KpiDoradaHub
        C={C}
        addToast={addToast}
        modul="merljive"
        otvoren={kpiHubOtvoren}
        onZatvori={() => setKpiHubOtvoren(false)}
        pocetniIdDeo={idDeo}
        pocetnaSmena={smena}
        pocetniDatum={datum}
        pocetniRadniNalog={radniNalog}
      />

      {tab === "unos" && !ucitava && !karakteristike.length && (
        <div style={{
          margin: "0 12px 8px",
          padding: "12px 16px",
          background: C.crvena,
          color: "#fff",
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1.5,
          flexShrink: 0,
        }}>
          ⚠ Baza nema karakteristike_merljive — u Admin tabu uvezi SPC_merljive.xlsx, pa Ctrl+F5.
          {mozeAdmin && " (Admin → tab EXCEL → Uvezi merljive)"}
        </div>
      )}

      <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <AppHeader
          korisnik={korisnik}
          onOdjava={onOdjava}
          onNazad={onNazad}
          C={C}
          onToggleTema={onToggleTema}
          temaTamna={temaTamna}
          desnoExtra={(
            <>
              <button
                type="button"
                onClick={() => setKpiHubOtvoren(true)}
                title="KPI dorada i škart po ID delu"
                style={{
                  background: `${C.zelena}22`,
                  border: `1px solid ${C.zelena}`,
                  borderRadius: 5,
                  color: C.zelena,
                  fontSize: 8,
                  padding: "1px 6px",
                  cursor: "pointer",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {(ekran.mob || ekran.tablet) ? "KPI" : "KPI dorada"}
              </button>
              {digitalniUnos && meriloPovezano && meriloSimulacija && (
                <button
                  type="button"
                  onClick={() => meriloSimulirajRef.current?.()}
                  title="Pošalji test merenje (simulacija)"
                  style={{
                    background: `${C.zuta}22`,
                    border: `1px solid ${C.zuta}`,
                    borderRadius: 5,
                    color: C.zuta,
                    fontSize: 8,
                    padding: "1px 6px",
                    cursor: "pointer",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  📤
                </button>
              )}
              {digitalniUnos && meriloPovezano && (
                <button
                  type="button"
                  onClick={() => meriloStopRef.current?.()}
                  title={meriloSimulacija ? "Prekini simulaciju" : "Merilo povezano — klik za prekid"}
                  style={{
                    background: meriloSimulacija ? `${C.zuta}22` : `${C.zelena}22`,
                    border: `1px solid ${meriloSimulacija ? C.zuta : C.zelena}`,
                    borderRadius: 5,
                    color: meriloSimulacija ? C.zuta : C.zelena,
                    fontSize: 8,
                    padding: "1px 6px",
                    cursor: "pointer",
                    fontWeight: 700,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: meriloSimulacija ? C.zuta : C.zelena,
                    display: "inline-block",
                  }} />
                  {(ekran.mob || ekran.tablet)
                    ? (meriloSimulacija ? "Sim" : "Merilo")
                    : (meriloSimulacija ? "Simulacija" : "Merilo povezano")}
                </button>
              )}
              {(ekran.mob || ekran.tablet) && (
                <>
                  <span title={digitalniUnos ? "Digitalni unos" : "Ručni unos"}
                    style={{ color: C.zelena, fontSize: 8, fontWeight: 700, flexShrink: 0 }}>±</span>
                  <span title={online ? "Online" : `Offline (${offlineCounts.total})`} style={{ flexShrink: 0, display: "flex" }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: online ? C.zelena : C.crvena, display: "inline-block",
                    }} />
                  </span>
                  {!online && offlineCounts.total > 0 && (
                    <button type="button" onClick={() => flushQueue()} title="Sync"
                      style={{
                        background: C.zuta, border: "none", borderRadius: 5, color: "#000",
                        fontSize: 8, padding: "1px 5px", cursor: "pointer", fontWeight: 700, flexShrink: 0,
                      }}>↻</button>
                  )}
                </>
              )}
              {mozePrebacivanjeRezimaUTacci(korisnik?.uloga) && typeof onPromeniRezim === "function" && (
                <button
                  type="button"
                  onClick={() => onPromeniRezim(jeLinija ? "analitika" : "linija")}
                  title={jeLinija ? "Analitika" : "Linija"}
                  style={{
                    background: jeLinija ? `${C.zelena}22` : `${C.plava}22`,
                    border: `1px solid ${jeLinija ? C.zelena : C.plava}`,
                    borderRadius: 5, color: jeLinija ? C.zelena : C.plava,
                    fontSize: 8, padding: "1px 5px", cursor: "pointer", fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {(ekran.mob || ekran.tablet) ? (jeLinija ? "📊" : "🏭") : (jeLinija ? "📊 Analitika" : "🏭 Linija")}
                </button>
              )}
              {jeLinija && koristiMobLinija && mozeTabMerljive("log", korisnik?.uloga, rezimRada) && (
                <button
                  type="button"
                  onClick={() => setTab(tab === "log" ? "unos" : "log")}
                  style={{
                    background: tab === "log" ? `${C.zelena}22` : C.hover,
                    border: `1px solid ${tab === "log" ? C.zelena : C.border}`,
                    borderRadius: 5, color: tab === "log" ? C.zelena : C.sivi,
                    fontSize: 8, padding: "1px 5px", cursor: "pointer", fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {tab === "log" ? "←" : "LOG"}
                </button>
              )}
            </>
          )}
          trakaIspod={(ekran.mob || ekran.tablet) ? null : (
            <div style={{
              background: C.panel, borderBottom: `1px solid ${C.border}`,
              padding: "6px 20px", display: "flex", alignItems: "center",
              gap: 10, fontSize: 10, flexWrap: "wrap",
            }}>
              <span style={{ color: C.zelena, fontWeight: 700, fontSize: 10 }}>
                {digitalniUnos
                  ? (meriloPovezano
                    ? (meriloSimulacija ? "± Digitalni · simulacija" : "± Digitalni · merilo povezano")
                    : "± Digitalni unos")
                  : "± Ručni unos"}
              </span>
              <span style={{ color: C.border }}>|</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.sivi }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: online ? C.zelena : C.crvena, display: "inline-block",
                }} />
                {online ? "Online" : `Offline (${offlineCounts.total})`}
              </span>
              {getAktivnaSesija("merljive")?.sesija_id && (
                <span style={{ color: C.border, fontSize: 8 }} title="ID sesije serije">
                  {getAktivnaSesija("merljive").sesija_id.slice(0, 18)}…
                </span>
              )}
              {!online && offlineCounts.total > 0 && (
                <button type="button" onClick={() => flushQueue()}
                  style={{
                    background: C.zuta, border: "none", borderRadius: 5, color: "#000",
                    fontSize: 9, padding: "3px 8px", cursor: "pointer", fontWeight: 700,
                  }}>
                  ↻ Sync
                </button>
              )}
            </div>
          )}
        />
        {(punPristupTabovima || !jeLinija || !ekran.linijaUredjaj) && TABOVI.length > 1 && (
        <div style={{
          display: "flex",
          borderTop: `1px solid ${C.border}`,
          padding: (ekran.mob || ekran.tablet) ? "0 6px" : "0 12px",
          flexWrap: "nowrap",
          overflowX: (ekran.mob || ekran.tablet) ? "auto" : "visible",
          WebkitOverflowScrolling: "touch",
        }}>
          {TABOVI.map(([id, naziv]) => (
            <button key={id} type="button" onClick={() => setTab(id)} style={{
              background: "none", border: "none",
              borderBottom: tab === id ? `2px solid ${bojaTaba(id)}` : "2px solid transparent",
              color: tab === id ? bojaTaba(id) : C.sivi,
              fontSize: ekran.mob ? 9 : 10, fontWeight: 700, padding: ekran.mob ? "8px 10px" : "8px 14px", cursor: "pointer", letterSpacing: 0.5,
              flexShrink: 0,
            }}>
              {naziv}
            </button>
          ))}
        </div>
        )}
      </div>

      {tab === "karte" && (
        <div style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          <MerljiveSpcKarte C={C} addToast={addToast} korisnik={korisnik} />
        </div>
      )}

      {tab === "msa" && (
        <MerilaMsaHub C={C} addToast={addToast} korisnik={korisnik} />
      )}

      {tab === "kplan" && (
        <KontrolniPlanPanel C={C} addToast={addToast} korisnik={korisnik} idDeoFilter={idDeo || ""} />
      )}

      {tab === "smena" && (
        <IzvestajSmeneMerljive
          C={C}
          korisnik={korisnik}
          smena={smena}
          addToast={addToast}
          idDeo={idDeo || undefined}
        />
      )}

      {tab === "heatmap" && (
        <HeatmapTabMerljive merenja={merenjaHeatmap} C={C} />
      )}

      {tab === "ciljevi" && (
        <CiljeviMerljive C={C} addToast={addToast} sviDelovi={deloviLista} />
      )}

      {tab === "nalozi" && (
        <RadniNaloziPanel C={C} addToast={addToast} sviDelovi={deloviLista} />
      )}

      {tab === "kupac" && (
        <KupacMerljive C={C} addToast={addToast} />
      )}

      {tab === "stabilnost" && (
        <StabilnostMerljive C={C} addToast={addToast} sviDelovi={deloviLista} />
      )}

      {tab === "oee" && (
        <OeeKpiTab C={C} modul="merljive" addToast={addToast} idDeoFilter={idDeo || undefined} />
      )}

      {tab === "stanje" && (
        <InteligencijaDeoPanel
          C={C}
          korisnik={korisnik}
          addToast={addToast}
          sviDelovi={deloviLista}
          defaultIdDeo={idDeo || ""}
          onOtvori8D={onOtvori8D}
        />
      )}

      {tab === "trasabilitet" && mozeAnalitika && (
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <TrasabilitetPanel C={C} addToast={addToast} modul="merljive" />
        </div>
      )}

      {tab === "excel" && mozeInzenjerExcel(korisnik?.uloga, rezimRada) && (
        <div style={{ flex: 1, overflow: "auto", padding: 20, maxWidth: 720, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
          <InzenjerExcelPanel
            modul="merljive"
            mozeUvoz={mozeInzenjerExcelUvoz(korisnik?.uloga, rezimRada)}
            idDeoFilter={idDeo}
            C={C}
            addToast={addToast}
          />
        </div>
      )}

      {tab === "admin" && mozeAdmin && (
        <div style={{ flex: 1, overflow: "auto", padding: 20, maxWidth: 800, margin: "0 auto", width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 20 }}>
          <OfflineSyncPanel supabase={supabase} C={C} addToast={addToast} online={online} onSync={onFlushed} />
          <SchemaStatusPanel C={C} />
          <SpcBaselinePanel C={C} korisnik={korisnik} modul="merljive" addToast={addToast} />
          <KarakteristikeGraniceEditor C={C} korisnik={korisnik} addToast={addToast} />
          <MeriloBarkodUputstvo C={C} />
          <NotifikacijePodesavanja C={C} addToast={addToast} />
          <MerljiveExcelPanel C={C} addToast={addToast} />
          <AdminKalibracijaPanel korisnik={korisnik} C={C} addToast={addToast} />
        </div>
      )}

      {tab === "log" && (
        <div style={{ flex: 1, overflow: "auto", padding: padGlavni, minHeight: 0 }}>
          {loadLog ? (
            <div style={{ color: C.sivi, fontSize: 12 }}>Učitavam log…</div>
          ) : (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", minWidth: ekran.mob ? 520 : 0, borderCollapse: "collapse", fontSize: ekran.mob ? 9 : 10 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.sivi, textAlign: "left" }}>
                  {["Datum", "Smena", "ID", "Dimenzija", "Vrednost", "Status", "Linija"].map(h => (
                    <th key={h} style={{ padding: "6px 8px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logD.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.hover}` }}>
                    <td style={{ padding: "5px 8px" }}>{r.datum}</td>
                    <td style={{ padding: "5px 8px" }}>{r.smena}</td>
                    <td style={{ padding: "5px 8px" }}>{r.id_deo}</td>
                    <td style={{ padding: "5px 8px" }}>{r.pozicija}</td>
                    <td style={{ padding: "5px 8px" }}>{r.vrednost_raw}</td>
                    <td style={{ padding: "5px 8px", color: r.status === "NOK" ? C.crvena : C.zelena }}>{r.status}</td>
                    <td style={{ padding: "5px 8px" }}>{r.linija}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
          {!loadLog && !logD.length && (
            <div style={{ color: C.border, textAlign: "center", padding: 40 }}>Nema unosa</div>
          )}
        </div>
      )}

      {tab === "unos" && jeLinija && !koristiMobLinija && (
        <LinijaWizardNav
          korak={!idDeo || !grupaAB ? "id" : unosKorak === "forma" ? "unos" : unosKorak}
          koraci={kontrolorLinija ? KORACI_MERLJIVE_KONTROLOR : KORACI_MERLJIVE_LINIJA}
          C={C}
          akcent={C.zelena}
        />
      )}

      {tab === "unos" && jeLinija && koristiMobLinija && (
        <MobilniMerljiviUnos
          linijaKorak={linijaKorak}
          setLinijaKorak={setLinijaKorak}
          kontrolorLinija={kontrolorLinija}
          idDeo={idDeo}
          onIdChange={onIdChange}
          onIdPotvrdi={potvrdiIdDeo}
          onBarkodSken={obradiBarkodSken}
          smena={smena}
          grupe={grupe}
          grupaAB={grupaAB}
          onGrupaChange={onGrupaChange}
          sacuvaneGrupe={sacuvaneGrupe}
          indeksAktivne={indeksAktivne}
          nazivDela={nazivDela}
          linija={linija}
          masina={masina}
          radniNalog={radniNalog}
          nalogInfo={nalogInfo}
          potrebanBroj={potrebanBroj}
          ucitava={ucitava || nalogUcitava || ucitavaDeo}
          poruka={poruka}
          dostupniPogoni={dostupniPogoni}
          omoguceniPogoni={omoguceniPogoni}
          pogonKod={pogonKod}
          onPogonChange={onPogonChange}
          trebaIzborPogona={trebaIzborPogona}
          idUcitano={idUcitano}
          unosKorak={unosKorak}
          setUnosKorak={setUnosKorak}
          korisnik={korisnik}
          kontrolnaListaOk={listaSpremna}
          onKontrolnaListaZavrsena={zavrsiKontrolnuListu}
          kalUpozorenja={kalUpozorenja}
          kalibracijaOdobrena={kalibracijaOdobrena}
          mozeAdmin={mozeAdmin}
          onToggleKalibracijaOdobrenje={toggleKalibracijaOdobrenje}
          kalibracijaCeka={!!kalibracijaCekaId}
          onZahtevKalibracija={() => setPokaziZahtevKal(true)}
          onNoviDeo={noviDeoLinija}
          slikaNaziv={slika}
          urlSlike={urlSlike}
          kolone={kolone}
          faiPotreban={faiPotreban}
          faiRezimAktivan={faiRezimAktivan}
          faiCekaOdobrenje={faiCekaOdobrenje}
          C={C}
        >
          {linijaKorak === 3 && (faiCekaBlok || merljiveFormaBlok)}
        </MobilniMerljiviUnos>
      )}

      {tab === "unos" && jeLinija && !koristiMobLinija && linijaListaDesktop && (
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: padGlavni,
          minHeight: 0,
          overflow: "hidden",
          boxSizing: "border-box",
        }}>
          {greskaDb && (
            <div style={{ background: C.nok, border: `1px solid ${C.crvena}`, borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 11 }}>
              {greskaDb}
            </div>
          )}
          {poruka && !idUcitano && (
            <div style={{
              background: `${C.crvena}18`,
              border: `2px solid ${C.crvena}`,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 8,
              fontSize: 12,
              color: C.crvena,
              fontWeight: 600,
              lineHeight: 1.5,
            }}>
              {poruka}
            </div>
          )}
          {poruka && idUcitano && (
            <div style={{
              background: poruka.includes("uspešno") || poruka.includes("kompletirana") ? C.ok : `${C.zuta}20`,
              border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, marginBottom: 8, fontSize: 11,
            }}>
              {poruka}
            </div>
          )}
          {idUcitano && !listaSpremna && !mozeAdmin && (
            <div style={{ flex: 1, padding: 14, overflowY: "auto", minHeight: 0 }}>
              <KontrolnaLista
                korisnik={korisnik}
                smena={Number(smena)}
                idDeo={String(idDeo || "").trim().toUpperCase()}
                naslovModul="Merljive"
                akcent={C.zelena}
                onZavrsena={zavrsiKontrolnuListu}
                C={C}
                ugradjen
              />
            </div>
          )}
          {idUcitano && listaSpremna && (
            <>
              {generalijeGornjiRed}
              {merljiveFormaBlok}
            </>
          )}
        </div>
      )}

      {tab === "unos" && jeLinija && !koristiMobLinija && !linijaListaDesktop && (
        <div style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          minHeight: 0,
          height: "calc(100vh - 89px)",
          overflow: "hidden",
        }}>
          <MerljiveLinijaLeviPanel
            C={C}
            idDeo={idDeo}
            onIdChange={onIdChange}
            onBarkodSken={obradiBarkodSken}
            onIdPotvrdi={potvrdiIdDeo}
            smena={smena}
            grupe={grupe}
            grupaAB={grupaAB}
            onGrupaChange={onGrupaChange}
            sacuvaneGrupe={sacuvaneGrupe}
            indeksAktivne={indeksAktivne}
            idUcitano={idUcitano}
            nazivDela={nazivDela}
            linija={linija}
            masina={masina}
            radniNalog={radniNalog}
            potrebanBroj={potrebanBroj}
            preostaloSesije={preostaloSesije}
            ciljSesije={ciljSesije}
            planUzorkovanja={planUzorkovanja}
            ucestalostPlan={ucestalostPlan}
            poruka={poruka}
            dostupniPogoni={dostupniPogoni}
            omoguceniPogoni={omoguceniPogoni}
            pogonKod={pogonKod}
            onPogonChange={onPogonChange}
            trebaIzborPogona={trebaIzborPogona}
            onNoviDeo={noviDeoLinija}
            slikaNaziv={slika}
            urlSlike={urlSlike}
          />
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            {greskaDb && (
              <div style={{ background: C.nok, border: `1px solid ${C.crvena}`, borderRadius: 8, padding: 10, margin: "8px 14px 0", fontSize: 11 }}>
                {greskaDb}
              </div>
            )}
            {!idUcitano && (
              <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                padding: 20,
                minHeight: 0,
                overflowY: "auto",
                width: "100%",
              }}>
                {idDeo && !idSpremanZaUcitavanje(idDeo) && (
                  <span style={{ color: C.sivi, fontSize: 13 }}>
                    {trebaIzborPogona
                      ? "Izaberite pogon u levom panelu (A–H)"
                      : "Unesi pun ID dela (npr. NM-001)"}
                  </span>
                )}
                {(!idDeo || idSpremanZaUcitavanje(idDeo)) && (
                  <MerljiveGreskaUcitavanja
                    C={C}
                    idDeo={idDeo}
                    ucitava={ucitava}
                    ucitavaDeo={ucitavaDeo}
                    nalogUcitava={nalogUcitava}
                    poruka={poruka}
                    greskaDb={greskaDb}
                    trebaIzborPogona={trebaIzborPogona}
                    karakteristikeBroj={karakteristike.length}
                    mozeAdmin={mozeAdmin}
                    kompakt
                  />
                )}
                {!idDeo && (
                  <span style={{ color: C.sivi, fontSize: 13 }}>
                    Unesi ID dela (npr. NM-001) i izaberi seriju
                  </span>
                )}
                {trebaIzborPogona && !(idDeo && idSpremanZaUcitavanje(idDeo)) && (
                  <div style={{ width: "100%", maxWidth: 360 }}>
                    <PogonIzborPanel
                      C={C}
                      pogoni={dostupniPogoni}
                      omoguceniPogoni={omoguceniPogoni}
                      pogonKod={pogonKod}
                      onIzaberi={onPogonChange}
                      obavezan
                    />
                  </div>
                )}
              </div>
            )}
            {idUcitano && !listaSpremna && !koristiMobLinija && !mozeAdmin && (
              <div style={{ flex: 1, padding: 14, overflowY: "auto", minHeight: 0 }}>
                <KontrolnaLista
                  korisnik={korisnik}
                  smena={Number(smena)}
                  idDeo={String(idDeo || "").trim().toUpperCase()}
                  naslovModul="Merljive"
                  akcent={C.zelena}
                  onZavrsena={zavrsiKontrolnuListu}
                  C={C}
                  ugradjen
                />
              </div>
            )}
            {idUcitano && listaSpremna && unosKorak === "poka" && (
              <div style={{ flex: 1, padding: 14, overflowY: "auto", display: "flex", flexDirection: "column", minHeight: 0 }}>
                <UnosPokaYokeKorak
                  C={C}
                  modul="merljive"
                  akcent={C.zelena}
                  idDeo={idDeo}
                  nazivDela={nazivDela}
                  radniNalog={radniNalog}
                  linija={linija}
                  masina={masina}
                  kontrolor={kontrolor}
                  grupaAB={grupaAB}
                  potrebanBroj={potrebanBroj}
                  kalUpozorenja={kalUpozorenja}
                  kontrolnaListaOk={listaSpremna}
                  kalibracijaOdobrena={kalibracijaOdobrena}
                  mozeAdmin={mozeAdmin}
                  kalibracijaCeka={!!kalibracijaCekaId}
                  onZahtevKalibracija={() => setPokaziZahtevKal(true)}
                  onToggleKalibracijaOdobrenje={toggleKalibracijaOdobrenje}
                  onDalje={() => {
                    setUnosKorak("forma");
                    if (jeLinija && koristiMobLinija) setLinijaKorak(3);
                  }}
                  daljeLabel={faiPotreban ? "FAI / unos merenja →" : "Unos merenja →"}
                />
              </div>
            )}
            {idUcitano && listaSpremna && unosKorak === "forma" && (
              <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                overflow: "hidden",
                padding: 14,
              }}>
                {faiCekaBlok || merljiveFormaBlok}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "unos" && !jeLinija && (
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: padGlavni,
        minHeight: 0,
        overflow: "hidden",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "100%",
      }}>
        {greskaDb && (
          <div style={{ background: C.nok, border: `1px solid ${C.crvena}`, borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 11 }}>
            {greskaDb}
          </div>
        )}
        {ucitava && <div style={{ color: C.sivi, marginBottom: 8, fontSize: 11 }}>Učitavam karakteristike…</div>}
        {poruka && (
          <div style={{
            background: poruka.includes("uspešno") || poruka.includes("kompletirana") ? C.ok : `${C.zuta}20`,
            border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, marginBottom: 8, fontSize: 11,
          }}>
            {poruka}
          </div>
        )}
        {idDeo && idSpremanZaUcitavanje(idDeo) && !ucitava && !ucitavaDeo && !nalogUcitava && !idUcitano && (
          <MerljiveGreskaUcitavanja
            C={C}
            idDeo={idDeo}
            ucitava={ucitava}
            ucitavaDeo={ucitavaDeo}
            nalogUcitava={nalogUcitava}
            poruka={poruka}
            greskaDb={greskaDb}
            trebaIzborPogona={trebaIzborPogona}
            karakteristikeBroj={karakteristike.length}
            mozeAdmin={mozeAdmin}
          />
        )}
        {trebaIzborPogona && !desktopUnos && (
          <PogonIzborPanel
            C={C}
            pogoni={dostupniPogoni}
            omoguceniPogoni={omoguceniPogoni}
            pogonKod={pogonKod}
            onIzaberi={onPogonChange}
            obavezan
          />
        )}

        {desktopUnos ? generalijeGornjiRed : (
        <div style={{ marginBottom: 6, flexShrink: 0, width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
          <SmenaIdUnosRed
            C={C}
            akcent={C.zelena}
            smena={smena}
            onBarkodSken={obradiBarkodSken}
            lblStyle={lbl}
            idLabel="ID deo *"
            prikaziCrtez={false}
            sirinaSmena={ekran.tablet ? 52 : 44}
            sirinaBarkod={ekran.tablet ? 40 : 36}
            inpStyle={{
              borderRadius: 6,
              padding: L.inpPadding,
              fontSize: L.fontInput,
            }}
          >
            <input
              style={{
                ...inp,
                fontWeight: 700,
                textAlign: "center",
              }}
              value={idDeo}
              {...idBarkodPolje}
              onBlur={e => potvrdiIdDeo(e.target.value)}
              placeholder="5502-A"
              title="Ručni unos, USB čitač (fokus u polje) ili kamera"
            />
          </SmenaIdUnosRed>
          <div style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            width: "100%",
            minWidth: 0,
          }}>
            <div style={{
              flex: 1,
              minWidth: 0,
              background: nazivDela ? `${C.zelena}18` : C.panel,
              border: `1px solid ${nazivDela ? `${C.zelena}40` : C.border}`,
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 11,
              fontWeight: nazivDela ? 700 : 400,
              color: nazivDela ? C.zelena : C.sivi,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {nazivDela || "Naziv dela"}
              {pogonKod && nazivDela && (
                <span style={{ color: C.plava, fontWeight: 600, marginLeft: 6, fontSize: 10 }}>
                  {labelPogona(pogonKod)}
                </span>
              )}
              {linija && nazivDela && (
                <span style={{ color: C.sivi, fontWeight: 400, marginLeft: 8, fontSize: 10 }}>{linija}</span>
              )}
            </div>
            {dostupniPogoni.length > 1 && (
              <div style={{ flex: "1 1 100%", width: "100%" }}>
                <PogonIzborPanel
                  C={C}
                  pogoni={dostupniPogoni}
                  omoguceniPogoni={omoguceniPogoni}
                  pogonKod={pogonKod}
                  onIzaberi={onPogonChange}
                  kompakt
                  obavezan={trebaIzborPogona}
                />
              </div>
            )}
            <div style={{
              flex: "0 0 auto",
              display: "flex",
              alignItems: "center",
              gap: 4,
              minWidth: 0,
            }}>
              <span style={{ fontSize: L.fontLabel, color: C.sivi, flexShrink: 0 }}>Serija</span>
              {serijaDugmad}
            </div>
          </div>
        </div>
        )}

        {idDeo && grupaAB && unosKorak === "poka" && (
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: P.desktopUnos ? "row" : "column",
            gap: P.redGap,
            minHeight: stackVertikalno ? P.visinaGlavneOblasti : 0,
            overflow: stackVertikalno ? "auto" : "hidden",
            WebkitOverflowScrolling: "touch",
          }}>
            {P.prikaziCrtezLevo && (
              <aside style={{
                flex: `0 0 ${P.sirinaCrtezLevo}px`,
                width: P.sirinaCrtezLevo,
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                alignSelf: "stretch",
              }}>
                <CrtezPregledPanel
                  modul="merljive"
                  slikaNaziv={slika}
                  urlDirect={urlSlike}
                  idDeo={idDeo}
                  C={C}
                  punPanel
                  visina={P.crtezVisina}
                  akcent={C.zelena}
                />
              </aside>
            )}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <UnosPokaYokeKorak
                C={C}
                modul="merljive"
                akcent={C.zelena}
                idDeo={idDeo}
                nazivDela={nazivDela}
                radniNalog={radniNalog}
                linija={linija}
                masina={masina}
                kontrolor={kontrolor}
                grupaAB={grupaAB}
                potrebanBroj={potrebanBroj}
                kalUpozorenja={kalUpozorenja}
                kontrolnaListaOk={listaSpremna}
                kalibracijaOdobrena={kalibracijaOdobrena}
                mozeAdmin={mozeAdmin}
                kalibracijaCeka={!!kalibracijaCekaId}
                onZahtevKalibracija={() => setPokaziZahtevKal(true)}
                urlSlike={P.urlSlikeUPokaKomponenti ? urlSlike : undefined}
                onToggleKalibracijaOdobrenje={toggleKalibracijaOdobrenje}
                onDalje={() => setUnosKorak("forma")}
                stekListaDugmeSlika
              />
            </div>
          </div>
        )}

        {faiCekaBlok}
        {merljiveFormaBlok}
      </div>
      )}
    </div>
  );
}
