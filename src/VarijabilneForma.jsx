import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { KontrolnaLista, ZahtevPrekid, ucitajOdobrenPrekid, zatvoriPrekidZahtev } from "./lib/kontrolaSesije.jsx";
import {
  setListaOkSession,
  getListaOkSession,
  procitajSmenuIzStorage,
  proveriKontrolnaListaDanas,
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
  idSpremanZaUcitavanje, porukaNepoznatIdDeo, listaIdDeoIzKarakteristika,
} from "./lib/varijabilneUtils.js";
import { propagirajMetaKarakteristika } from "./lib/definicijaKarakteristika.js";
import { dodeliSerijeMerenja } from "./lib/karakteristikaMerljive.js";
import MerljiveUnosFormaConsumer from "./components/merljive/MerljiveUnosFormaConsumer.jsx";
import { MerljiveKoloneProvider } from "./components/merljive/MerljiveKoloneProvider.jsx";
import {
  LazyTab,
  MerljiveSpcKarte,
  MerljiveAnalitikaDashboard,
  InzenjerExcelPanel,
  MerilaMsaHub,
  KontrolniPlanPanel,
  FaiOdobrenjePanel,
  PfmeaCpModul,
  EskalacijePanel,
  OsmDIzvestaj,
  NcrCapaPanel,
  Iso3951Kalkulator,
  MomentLinijaPanel,
  TrasabilitetPanel,
  MerljiveHeatmapPregled,
  MerljiveAdminTab,
  MerljiveLogPregled,
  InteligencijaDeoPanel,
  AnalitikaPregledPanel,
  OdobrenjaQAPanel,
  SkartDoradaOeePanel,
  OeeKpiTab,
  IzvestajSmeneMerljive,
  CiljeviMerljive,
  KupacMerljive,
  IzvestajDobavljacPanel,
  StabilnostMerljive,
  OCKrivaPanel,
  RadniNaloziPanel,
} from "./components/merljive/VarijabilneLazyTabovi.jsx";
import { ucitajOdobrenFai, snimiFaiUnos, odobriFai, ucitajPoslednjiFai, faiImaNok, ucitajFaiPoId } from "./lib/faiWorkflow.js";
import FotoNokUnos from "./components/FotoNokUnos.jsx";
import KalibracijaMerilaPanel from "./components/KalibracijaMerilaPanel.jsx";
import { supabase } from "./lib/supabaseClient.js";
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
import KpiSerijaPanel from "./components/KpiSerijaPanel.jsx";
import KpiDoradaHub from "./components/KpiDoradaHub.jsx";
import { podrazumevaniKpiIzMerenja, agregirajKpiPoSerijama } from "./lib/oeeKpi.js";
import { snimiKpiUnos, snimiIliAzurirajKpiUnos, pronadjiKpiUnos, kpiVrednostiIzDb, porukaKpiGreske, fetchKpiUnos } from "./lib/kpiUnos.js";
import { ucitajPlanUzorkovanja, izracunajPlanUzorkovanja, datumSrUIso } from "./lib/planUzorkovanja.js";
import { useOfflineQueue, stampajClientIdNaRedove } from "./lib/offlineQueue.js";
import { useSpcAlarmGate } from "./hooks/useSpcAlarmGate.js";
import SpcAlarmBlokada from "./components/SpcAlarmBlokada.jsx";
import { proveriIKreirajAlarmeNokSerije, lokalniOfflineNokAlarm } from "./lib/spcAlarmWorkflow.js";
import { pozicijeSaPrekoracenimNok } from "./lib/spcAlarmPragovi.js";
import { posleSnimanjaMerljiva, posleSnimanjaKpiDorade } from "./lib/autoAkcije.js";
import { mozeTabMerljive, jeKvalitetIliVise, jeAdmin, opisUloge, mozeAnalitika as mozeAnalitikaUloga, mozePrebacivanjeRezimaUTacci, jeKontrolorLinija, jeLinijaUloga, pocetniKorakUnosMer, mozeInzenjerExcel, mozeInzenjerExcelUvoz, mozeOdobritiFai, mozePregledFaiOdobrenja, podrazumevaniTabMerljive, mozeOdobrenjaQA, mozeNcrCapa } from "./lib/uloge.js";
import AnalitikaHeader from "./components/analitika/AnalitikaHeader.jsx";
import useAnalitikaBadges from "./hooks/useAnalitikaBadges.js";
import { AnalitikaFilterProvider, useAnalitikaFilter } from "./lib/AnalitikaFilterContext.jsx";
import { spcFilterIzAnalitike } from "./lib/analitikaFilterUtils.js";
import { ucitajAnalitikaTab, snimiAnalitikaTab } from "./lib/analitikaSesija.js";
import {
  ANALITIKA_GRUPE_MER,
  buildAnalitikaTaboviMer,
  grupeSaDozvoljenimTabovima,
} from "./lib/analitikaNav.js";
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
import UnosPokaYokeKorak from "./components/UnosPokaYokeKorak.jsx";
import { procitajSpoljnuNavigacijuTab, peekPendingWorkflowTab } from "./lib/workflowAkcije.js";
import { ensureSesija, novaSesija, getAktivnaSesija } from "./lib/spcSesija.js";
import ShopFloorStatusBar from "./components/ShopFloorStatusBar.jsx";
import KarantinBlokada from "./components/KarantinBlokada.jsx";
import { proveriAktivanKarantin } from "./lib/karantinProvera.js";
import { buildMerenjeVarijabilnaRow, snimiJednoMerenjeVarijabilno } from "./lib/merenjaVarijabilnaSnimi.js";
import { syncPrijemnaIzMerenja } from "./lib/dobavljaciApi.js";
import PrijemMerenjeKontekst, {
  sacuvajPrijemKontekst,
  ucitajPrijemKontekst,
} from "./components/PrijemMerenjeKontekst.jsx";
import PrijemnaKontrolaPanel from "./components/atributivne/PrijemnaKontrolaPanel.jsx";
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
  uniqueDeloviIzSop,
} from "./lib/pogonSop.js";
import { radniNalogIzDeoPogona } from "./lib/syncSifrarnikIzMerljivih.js";
import { fetchPogonLinijaMapa } from "./lib/pogonLinijaApi.js";
import { fetchMerljiviSifrarnikZaDeo, fetchMerljiviSopIndeks } from "./lib/sifrarnikApi.js";
import { buildLookupsFromPogonRows } from "./lib/glavniUnosCore.js";
import { pogonLinijaMapIzGlavnogUnosa, setPogonLinijaMap } from "./lib/pogonLinijaLookup.js";
import IdDeoBarkodRed from "./components/IdDeoBarkodRed.jsx";
import SmenaIdUnosRed from "./components/SmenaIdUnosRed.jsx";
import SmenaAutoPrikaz from "./components/SmenaAutoPrikaz.jsx";
import PogonIzborPanel from "./components/PogonIzborPanel.jsx";
import { indeksSledecePrazno } from "./lib/meriloUvoz.js";
import { porukaDbGreske, jeMreznaGreska, jeDupliClientId } from "./lib/dbGreske.js";
import LinijaWizardNav, { KORACI_MERLJIVE_LINIJA, KORACI_MERLJIVE_KONTROLOR } from "./components/LinijaWizardNav.jsx";
import MobilniMerljiviUnos from "./components/MobilniMerljiviUnos.jsx";
import { normalizujPrefill8d, prefill8dIzEskalacije, procitajNavigacijuNcr } from "./lib/eskalacijeHelper.js";
import MerljiveLinijaLeviPanel from "./components/MerljiveLinijaLeviPanel.jsx";
import AppHeader from "./components/AppHeader.jsx";
import MerljiveGreskaUcitavanja from "./components/merljive/MerljiveGreskaUcitavanja.jsx";
import MerljiveFaiCekaBlok from "./components/merljive/MerljiveFaiCekaBlok.jsx";
import MerljiveGeneralijeRed from "./components/merljive/MerljiveGeneralijeRed.jsx";
import {
  MerljiveDugmadSerije,
  MerljiveMobDugmadAkcije,
  MerljiveMobSerijaStatus,
  MerljiveSerijaDugmad,
} from "./components/merljive/MerljiveUnosAkcije.jsx";
import { danasSrMerljive as danasSr, prazneKoloneMerljive as prazneKolone } from "./lib/merljiveFormaHelper.js";
import { ucitajPrikazSliku } from "./lib/slikePaths.js";

export default function VarijabilneForma(props) {
  return (
    <AnalitikaFilterProvider>
      <VarijabilneFormaInner {...props} />
    </AnalitikaFilterProvider>
  );
}

function VarijabilneFormaInner({ korisnik, onOdjava, onNazad, C, onToggleTema, temaTamna, unosRezim = "rucni", rezimRada = "analitika", onPromeniRezim, onOtvori8D, nav8dTick = 0, licenca = null }) {
  const digitalniUnos = unosRezim === "digital";
  const ekran = useEkran();
  const { viewportKey } = ekran;
  const koristiTastMerenja = ekran.mob || ekran.tablet;

  const jeLinija = rezimRada === "linija";
  const kontrolorLinija = jeKontrolorLinija(korisnik?.uloga, rezimRada);
  const koristiMobLinija = jeLinija && ekran.linijaUredjaj;
  const L = layoutListaMerljive(ekran, { koristiMobLinija });
  const P = layoutPokaYokeMerljive(ekran);
  const [tab, setTab] = useState(() => {
    if (rezimRada !== "linija") {
      const pending = peekPendingWorkflowTab("varijabilne");
      if (pending && mozeTabMerljive(pending, korisnik?.uloga, rezimRada)) return pending;
      const saved = ucitajAnalitikaTab("merljive");
      if (saved && mozeTabMerljive(saved, korisnik?.uloga, rezimRada)) return saved;
    }
    return podrazumevaniTabMerljive(korisnik?.uloga, rezimRada);
  });
  const [spcTipNav, setSpcTipNav] = useState(null);
  const analitikaFilter = useAnalitikaFilter();
  const filterDeo = !jeLinija ? (analitikaFilter?.idDeo || "") : "";
  const [osmdPrefill, setOsmdPrefill] = useState(null);
  const [ncrPrefill, setNcrPrefill] = useState(null);
  const [pfmeaCpPrefillIz8d, setPfmeaCpPrefillIz8d] = useState(null);
  const [meriloPovezano, setMeriloPovezano] = useState(false);
  const [kljucPovezan, setKljucPovezan] = useState(false);
  const [karantinInfo, setKarantinInfo] = useState(null);
  const [meriloSimulacija, setMeriloSimulacija] = useState(false);
  const [autoSnimiMerilo, setAutoSnimiMerilo] = useState(
    () => localStorage.getItem("merilo_auto_snimi") === "1",
  );
  const meriloStopRef = useRef(null);
  const meriloSimulirajRef = useRef(null);
  const snimaMeriloRef = useRef(false);
  const prijemKontekstRef = useRef(ucitajPrijemKontekst("merljive"));
  const autoSnimiMeriloRef = useRef(autoSnimiMerilo);
  autoSnimiMeriloRef.current = autoSnimiMerilo;
  const [toasts, setToasts] = useState([]);
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

  const onAutoSnimiMeriloChange = useCallback((v) => {
    setAutoSnimiMerilo(v);
    localStorage.setItem("merilo_auto_snimi", v ? "1" : "0");
  }, []);

  const addToast = useCallback((tekst, tip = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { tekst, tip, id }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  }, []);

  useEffect(() => {
    const { tab: spoljniTab, prefillNcr } = procitajSpoljnuNavigacijuTab("varijabilne");
    if (spoljniTab && !jeLinija && mozeTabMerljive(spoljniTab, korisnik?.uloga, rezimRada)) {
      setTab(spoljniTab);
      snimiAnalitikaTab("merljive", spoljniTab);
      if (spoljniTab === "ncr" && prefillNcr) setNcrPrefill(prefillNcr);
    }
  }, [nav8dTick]); // eslint-disable-line

  const onFlushed = useCallback((res) => {
    if (res.syncedJobs > 0) {
      addToast(`✓ Sinhronizovano ${res.syncedJobs} offline paketa (${res.syncedRows} stavki)`, "uspeh");
      const prijemId = prijemKontekstRef.current?.id;
      if (prijemId) {
        syncPrijemnaIzMerenja(prijemId)
          .then((r) => addToast(`✓ Prijem #${prijemId}: OK ${r.ok} · NOK ${r.nok}`, "uspeh"))
          .catch((e) => addToast(`Prijem nije osvežen: ${e.message}`, "greska"));
      }
    }
  }, [addToast]);

  const {
    online, queue, counts: offlineCounts, addMerljiveSerija, flushQueue,
  } = useOfflineQueue(supabase, { onFlushed });

  const TABOVI = [
    ["unos", "UNOS"],
    ...(jeLinija && digitalniUnos ? [["moment", "MOMENT"]] : []),
    ["fai", "FAI"],
    ["prijemna", "PRIJEM"],
    ...(jeLinija ? [["povezi-prijem", "POVEŽI PRIJEM"]] : []),
    ["karte", "KONTROLNE KARTE"],
    ["stanje", "STANJE"],
    ["smena", "SMENA"],
    ["msa", "MSA / MERILA"],
    ["kplan", "KONTROLNI PLAN"],
    ["heatmap", "HEAT MAP"],
    ["ciljevi", "CILJEVI"],
    ["nalozi", "NALOZI"],
    ["kupac", "KUPAC"],
    ["dobavljac", "DOBAVLJAČI"],
    ["oc", "OC KRIVA"],
    ["stabilnost", "STABILNOST"],
    ["oee", "OEE"],
    ["log", "LOG"],
    ...(mozeAnalitika && !jeLinija ? [["trasabilitet", "TRASABILITET"]] : []),
    ...(mozeInzenjerExcel(korisnik?.uloga, rezimRada) ? [["excel", "EXCEL"]] : []),
  ].filter(([id]) => mozeTabMerljive(id, korisnik?.uloga, rezimRada));

  const analitikaTabovi = buildAnalitikaTaboviMer(korisnik?.uloga, rezimRada);
  const analitikaGrupe = useMemo(
    () => grupeSaDozvoljenimTabovima(
      ANALITIKA_GRUPE_MER,
      (id) => mozeTabMerljive(id, korisnik?.uloga, rezimRada),
    ),
    [korisnik?.uloga, rezimRada],
  );
  const mozeQaOdobrenja = mozeOdobrenjaQA(korisnik?.uloga) && !jeLinija;
  const { badgePoTabu, badgePoGrupi } = useAnalitikaBadges({
    enabled: !jeLinija,
    qaEnabled: mozeQaOdobrenja,
    faiEnabled: mozePregledFaiOdobrenja(korisnik?.uloga),
    ncrEnabled: mozeNcrCapa(korisnik?.uloga),
    grupe: analitikaGrupe,
  });
  const prikazTabovi = jeLinija ? TABOVI : analitikaTabovi;

  const spcFilterAnalitika = useMemo(
    () => (!jeLinija ? spcFilterIzAnalitike(analitikaFilter) : null),
    [jeLinija, analitikaFilter?.idDeo, analitikaFilter?.smena, analitikaFilter?.pozicija],
  );

  const onNavigacijaAnalitika = useCallback(({ tab: ciljTab, spcTip, prefillNcr }) => {
    if (spcTip) setSpcTipNav(spcTip);
    if (ciljTab) {
      setTab(ciljTab);
      snimiAnalitikaTab("merljive", ciljTab);
      if (ciljTab === "ncr" && prefillNcr) setNcrPrefill(prefillNcr);
    }
  }, []);

  const onOtvoriNcrAnalitika = useCallback((prefill = {}) => {
    setNcrPrefill(prefill);
    setTab("ncr");
    snimiAnalitikaTab("merljive", "ncr");
  }, []);

  const otvori8dLokalno = useCallback((d) => {
    setOsmdPrefill(normalizujPrefill8d(d));
    setTab("8d");
  }, []);

  const bojaTaba = (id) => {
    if (id === "pregled") return C.zelena;
    if (id === "karte") return C.narandzasta;
    if (id === "fai") return C.zuta;
    if (id === "stanje") return C.ljubicasta;
    if (id === "admin") return C.zuta;
    if (id === "msa") return C.ljubicasta;
    if (id === "kplan") return C.plava;
    if (id === "smena") return C.zuta;
    if (id === "heatmap") return "#f472b6";
    if (id === "ciljevi") return C.zelena;
    if (id === "nalozi") return C.plava;
    if (id === "kupac") return "#22d3ee";
    if (id === "dobavljac") return "#34d399";
    if (id === "oc") return "#a3e635";
    if (id === "stabilnost") return "#f472b6";
    if (id === "oee") return C.narandzasta;
    if (id === "moment") return C.ljubicasta || "#a78bfa";
    if (id === "trasabilitet") return "#22d3ee";
    if (id === "excel") return C.plava;
    return C.zelena;
  };
  const [datum, setDatum] = useState(danasSr());
  const smena = useAutoSmena(true);
  const [idDeo, setIdDeo] = useState("");
  const [prijemKontekst, setPrijemKontekst] = useState(prijemKontekstRef.current);
  prijemKontekstRef.current = prijemKontekst;
  const merljivaInspekcijaRef = useRef(new Map());
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
  const koloneBridgeRef = useRef(null);
  const inspekcijaIdZa = useCallback((grupa, indeks, sesijaId = "") => {
    const kljuc = `${sesijaId || "bez-sesije"}|${grupa || "serija"}|${Number(indeks) + 1}`;
    if (!merljivaInspekcijaRef.current.has(kljuc)) {
      merljivaInspekcijaRef.current.set(kljuc, crypto.randomUUID());
    }
    return merljivaInspekcijaRef.current.get(kljuc);
  }, []);
  const [koloneSnapshot, setKoloneSnapshot] = useState(() => prazneKolone(5));
  const kolone = koloneSnapshot;
  const onMerenjaChange = useCallback((cols) => setKoloneSnapshot(cols), []);
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
  const [merilaLista, setMerilaLista] = useState([]);
  const [kontrolnaListaOk, setKontrolnaListaOk] = useState(() => {
    const sm = procitajSmenuIzStorage();
    return getListaOkSession("varijabilne", sm);
  });
  /** Ček lista obavezna na tabu UNOS (linija i ručni), admin preskače. */
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
    const sopRows = [];
    for (const id of Object.keys(sopMap)) {
      for (const row of Object.values(sopMap[id] || {})) sopRows.push(row);
    }
    const izSop = uniqueDeloviIzSop(sopRows);
    const sopIds = new Set(izSop.map((d) => d.id_deo));
    const izKar = listaIdDeoIzKarakteristika(karakteristike)
      .filter((id) => !sopIds.has(id))
      .map((id) => {
        const k = karakteristike.find((r) => String(r.id_deo || "").toUpperCase() === id);
        return { id_deo: id, naziv_dela: k?.naziv_dela || id };
      });
    return [...izSop, ...izKar].sort((a, b) => a.id_deo.localeCompare(b.id_deo));
  }, [sopMap, karakteristike]);

  const sopIndeksBroj = useMemo(() => {
    let n = 0;
    for (const id of Object.keys(sopMap)) {
      n += Object.keys(sopMap[id] || {}).length;
    }
    return n;
  }, [sopMap]);

  const sifrarnikBroj = karakteristike.length || sopIndeksBroj;

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

  const ocKontekst = useMemo(() => {
    if (jeLinija) {
      const poz = kolone.find((c) => c.naziv !== "-" && c.merenja?.length)?.naziv || "";
      return {
        idDeo,
        pozicija: poz,
        radniNalog,
        smena,
        kolone,
        karakteristike,
      };
    }
    return {
      idDeo: filterDeo,
      pozicija: analitikaFilter?.pozicija || "",
      smena: analitikaFilter?.smena || "",
      karakteristike,
    };
  }, [
    jeLinija, idDeo, filterDeo, kolone, radniNalog, smena,
    analitikaFilter?.pozicija, analitikaFilter?.smena, karakteristike,
  ]);

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
  const faiProveraSeqRef = useRef(0);
  const prekidProveraSeqRef = useRef(0);
  const kalibracijaProveraSeqRef = useRef(0);
  const planProveraSeqRef = useRef(0);
  const faiKoloneKlucRef = useRef("");
  const koloneRef = useRef(kolone);
  koloneRef.current = kolone;
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
    if (mozeAdmin) {
      setKontrolnaListaOk(true);
      return;
    }
    let ok = true;
    (async () => {
      if (korisnik?.radnikId) {
        const { zavrsena } = await proveriKontrolnaListaDanas(supabase, {
          radnikId: korisnik.radnikId,
          smena: sm,
        });
        if (!ok) return;
        if (zavrsena) {
          setKontrolnaListaOk(true);
          setListaOkSession("varijabilne", sm);
          return;
        }
      }
      setKontrolnaListaOk(getListaOkSession("varijabilne", sm));
    })();
    return () => { ok = false; };
  }, [smena, korisnik?.radnikId, mozeAdmin]);

  const faiPotreban = useMemo(
    () => faiPotrebanZaDeo(karakteristike, idDeo, pogonKod),
    [karakteristike, idDeo, pogonKod],
  );
  const faiRezimAktivan = faiPotreban && !faiOdobren && !faiCekaOdobrenje;
  const trebaFaiEkran = faiPotreban && !faiOdobren;
  const brojFaiDimenzija = useMemo(
    () => (faiPotreban ? koloneFaiZaDeo(karakteristike, idDeo, pogonKod).length : 0),
    [faiPotreban, karakteristike, idDeo, pogonKod],
  );

  const proveriFai = useCallback(async () => {
    const seq = ++faiProveraSeqRef.current;
    const idZaProveru = idDeo;
    const pogonZaProveru = pogonKod;
    const rnZaProveru = radniNalog;
    const smenaZaProveru = smena;
    if (!idZaProveru || idZaProveru.length < 3) {
      if (seq !== faiProveraSeqRef.current) return;
      setFaiOdobren(false);
      setFaiCekaOdobrenje(false);
      setFaiPoslednjiId(null);
      return;
    }
    if (!faiPotreban) {
      if (seq !== faiProveraSeqRef.current) return;
      setFaiOdobren(true);
      setFaiCekaOdobrenje(false);
      setFaiPoslednjiId(null);
      return;
    }
    try {
      const odobren = await ucitajOdobrenFai(supabase, {
        idDeo: idZaProveru,
        pogonKod: pogonZaProveru,
        radniNalog: rnZaProveru,
        smena: smenaZaProveru,
      });
      if (seq !== faiProveraSeqRef.current || idDeoRef.current !== idZaProveru) return;
      if (odobren) {
        setFaiOdobren(true);
        setFaiCekaOdobrenje(false);
        setFaiPoslednjiId(odobren.id);
        return;
      }
      const poslednji = await ucitajPoslednjiFai(supabase, {
        idDeo: idZaProveru,
        pogonKod: pogonZaProveru,
        radniNalog: rnZaProveru,
        smena: smenaZaProveru,
      });
      if (seq !== faiProveraSeqRef.current || idDeoRef.current !== idZaProveru) return;
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
      if (seq !== faiProveraSeqRef.current) return;
      setFaiOdobren(false);
      setFaiCekaOdobrenje(false);
      setFaiPoslednjiId(null);
    }
  }, [idDeo, pogonKod, radniNalog, smena, faiPotreban]);

  useEffect(() => { proveriFai(); }, [proveriFai]);

  /** FAI se radi u koraku unosa — ne preskači poka-yoke. */
  useEffect(() => {
    if (!idUcitano || !listaSpremna || !idDeo || !trebaFaiEkran) return;
    if (unosKorak === "poka") return;
    if (unosKorak !== "forma") setUnosKorak("forma");
  }, [idUcitano, listaSpremna, idDeo, trebaFaiEkran, unosKorak]);

  useEffect(() => {
    if (!faiRezimAktivan) {
      faiKoloneKlucRef.current = "";
      return;
    }
    if (!idDeo || !grupaAB || unosKorak !== "forma") return;
    const kluc = `${idDeo}|${grupaAB}|${pogonKod}`;
    if (faiKoloneKlucRef.current === kluc) return;
    const cols = koloneFaiZaDeo(karakteristike, idDeo, pogonKod);
    if (!cols.length) return;
    faiKoloneKlucRef.current = kluc;
    setKoloneSpolja(cols);
    setFaiStranica(0);
    koloneBridgeRef.current?.setAktivnaKolona?.(indeksSledecePrazno(cols, 1, 0));
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
    setKontrolnaListaOk(true);
    setListaOkSession("varijabilne", Number(smena));
    setUnosKorak("poka");
    if (jeLinija) setLinijaKorak(idUcitano ? 2 : 1);
  }, [smena, jeLinija, idUcitano]);

  const proveriPrekid = useCallback(async () => {
    const seq = ++prekidProveraSeqRef.current;
    const idZaProveru = idDeo;
    const radnikZaProveru = korisnik?.radnikId;
    try {
      const pid = await ucitajOdobrenPrekid(supabase, {
        radnikId: radnikZaProveru,
        idDeo: idZaProveru,
      });
      if (seq !== prekidProveraSeqRef.current || idDeoRef.current !== idZaProveru) return;
      setPrekidOdobrenId(pid);
    } catch {
      if (seq !== prekidProveraSeqRef.current) return;
      setPrekidOdobrenId(null);
    }
  }, [idDeo, korisnik?.radnikId]);

  useEffect(() => { proveriPrekid(); }, [proveriPrekid]);

  const proveriKalibraciju = useCallback(async () => {
    const seq = ++kalibracijaProveraSeqRef.current;
    const idZaProveru = idDeo;
    const radnikZaProveru = korisnik?.radnikId;
    try {
      const [odobrenId, cekaId] = await Promise.all([
        ucitajOdobrenuKalibraciju(supabase, { radnikId: radnikZaProveru, idDeo: idZaProveru }),
        ucitajCekaKalibraciju(supabase, { radnikId: radnikZaProveru, idDeo: idZaProveru }),
      ]);
      if (seq !== kalibracijaProveraSeqRef.current || idDeoRef.current !== idZaProveru) return;
      setKalibracijaOdobrenId(odobrenId);
      setKalibracijaCekaId(cekaId);
    } catch {
      if (seq !== kalibracijaProveraSeqRef.current) return;
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
          return { ...prev, ...izDb };
        });
      } catch {
        /* KPI tabela možda nije migrirana */
      }
    })();
    return () => { ok = false; };
  }, [idDeo, datum, smena]);

  useEffect(() => {
    if (!idDeo || idDeo.length < 3) return;
    const seq = ++planProveraSeqRef.current;
    const idZaPlan = idDeo;
    fetchPlaniranoKomZaDeo(supabase, idZaPlan).then((plan) => {
      if (seq !== planProveraSeqRef.current || idDeoRef.current !== idZaPlan) return;
      if (plan > 0) setKpiSerija((p) => ({ ...p, planirano_kom: plan }));
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
      const dor = Number(kpiSerija?.dorada) || 0;
      const neus = Number(kpiSerija?.neusaglaseno) || 0;
      if (dor > 0 && neus > 0) {
        await posleSnimanjaKpiDorade(supabase, {
          idDeo,
          datum: parsirajDatum(datum),
          smena,
          dorada: dor,
          neusaglaseno: neus,
          kpiId: data?.id || kpiDbId,
        });
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
      const [sopRows, rnRes, pogonRows] = await Promise.all([
        fetchMerljiviSopIndeks().catch(() => []),
        supabase.from("radni_nalozi")
          .select("id_deo,pogon_kod,broj_naloga,status")
          .eq("status", "aktivan"),
        fetchPogonLinijaMapa().catch(() => []),
      ]);
      if (!ok) return;
      const lookups = buildLookupsFromPogonRows(pogonRows || []);
      setPogonLinijaMap(pogonLinijaMapIzGlavnogUnosa(lookups.pogonByLinija));
      if (rnRes.error) {
        setGreskaDb(
          rnRes.error.message
          + " — proveri SQL šemu (03_schema / 29_sop_pogon_kod) i uvezi CSV u NALOZI."
        );
        setUcitava(false);
        return;
      }
      setKarakteristike([]);
      setSopMap(buildSopMapPoPogonu(sopRows || []));
      setNaloziZaPogon(rnRes.data || []);
      if (!(sopRows || []).length) {
        setGreskaDb(
          "Šifrarnik SOP je prazan — Admin → uvezi SPC_merljive.xlsx "
          + "(tab sop_deo_varijabilni), pa Ctrl+F5.",
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
      setTab(podrazumevaniTabMerljive(korisnik?.uloga, rezimRada));
    }
  }, [tab, korisnik?.uloga, rezimRada]);

  useEffect(() => {
    if (tab === "moment" && (!digitalniUnos || !jeLinija)) {
      setTab("unos");
    }
  }, [tab, digitalniUnos, jeLinija]);

  useEffect(() => {
    if (!jeLinija && tab) snimiAnalitikaTab("merljive", tab);
  }, [tab, jeLinija]);

  const punPristupTabovima = (mozeAdmin || jeKvalitetIliVise(korisnik?.uloga)) && !jeLinija;
  const linijaTaboviVidljivi = jeLinija && TABOVI.length > 1;

  useEffect(() => {
    if (!idDeo?.trim() && !radniNalog?.trim()) {
      setKarantinInfo(null);
      return;
    }
    let ok = true;
    proveriAktivanKarantin(supabase, { idDeo, radniNalog })
      .then((r) => { if (ok) setKarantinInfo(r); })
      .catch(() => { if (ok) setKarantinInfo(null); });
    return () => { ok = false; };
  }, [idDeo, radniNalog]);

  const osveziKarantin = useCallback(() => {
    if (!idDeo?.trim() && !radniNalog?.trim()) {
      setKarantinInfo(null);
      return;
    }
    proveriAktivanKarantin(supabase, { idDeo, radniNalog })
      .then(setKarantinInfo)
      .catch(() => setKarantinInfo(null));
  }, [idDeo, radniNalog]);

  const resetKolone = useCallback((broj) => {
    koloneBridgeRef.current?.resetKolone?.(broj);
    setKoloneSnapshot(prazneKolone(broj));
  }, []);

  const setKoloneSpolja = useCallback((cols) => {
    koloneBridgeRef.current?.setKolone?.(cols);
    setKoloneSnapshot(cols);
  }, []);

  const kolonaJePuna = useCallback(
    (k) => k && k.naziv !== "-" && k.merenja.length >= brojPotrebnihZaKolonu(k, potrebanBroj),
    [potrebanBroj],
  );

  const obrisiPoslednje = useCallback(() => {
    koloneBridgeRef.current?.obrisiPoslednje?.();
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
    let karLista = karakteristike;
    let sopLokal = sopMap;

    const karakteristikeZaDeo = (karLista || []).some(
      (k) => String(k.id_deo || "").toUpperCase() === id,
    );

    if (!karakteristikeZaDeo) {
      const { karakteristike: karFetch, sop: sopFetch } = await fetchMerljiviSifrarnikZaDeo(id);
      if (seq !== ucitajDeoSeq.current) return;
      if (karFetch.length) {
        const postojeciIds = new Set((karLista || []).map((k) => k.id));
        const proc = dodeliSerijeMerenja(propagirajMetaKarakteristika(karFetch));
        karLista = [...(karLista || []), ...proc.filter((k) => !postojeciIds.has(k.id))];
        setKarakteristike(karLista);
      }
      if (sopFetch.length) {
        const novi = buildSopMapPoPogonu(sopFetch);
        sopLokal = { ...sopLokal };
        for (const deoId of Object.keys(novi)) {
          sopLokal[deoId] = { ...(sopLokal[deoId] || {}), ...novi[deoId] };
        }
        setSopMap(sopLokal);
      }
    }

    const imaKarZaDeo = (karLista || []).some(
      (k) => String(k.id_deo || "").toUpperCase() === id,
    );
    if (!imaKarZaDeo && !sopLokal[id]) {
      prikaziGresku(
        "Tabela karakteristike_merljive je prazna — Admin → uvezi SPC_merljive.xlsx, pa Ctrl+F5.",
      );
      return;
    }
    let pogon = String(pogonEksplicitni || "").trim().toUpperCase()
      || (radniNalogEksplicitni ? pogonIzRn(radniNalogEksplicitni) : null);
    if (!pogon) {
      const jeOmogucen = (p) => jePogonOmogucen({
        sopMap: sopLokal,
        naloziRows: naloziZaPogon,
        karakteristike: karLista,
        idDeo: id,
        pogonKod: p,
        modul: "merljive",
      });
      const kandidati = pogoniZaUcitavanjeMerljive(
        sopLokal, naloziZaPogon, karLista, id, { jeOmogucen },
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
          const biloSop = Object.values(sopLokal[id] || {})[0];
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
          `ID ${id}: nema merljivih dimenzija ni aktivnog pogona. `
          + "Ako je deo u Osnovnom unosu → Šifrarnik → Osnovno → „Sačuvaj i propagiraj“, pa ponovo pretraži.",
        );
        return;
      }
    }
    pogon = String(pogon).trim().toUpperCase();

    let sop = sopZaPogon(sopLokal, id, pogon);
    if (!sop) {
      const karZaPogon = filtrirajKarakteristikePoPogonu(karLista, id, pogon)
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
        const biloKoji = Object.values(sopLokal[id] || {})[0];
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
        `ID ${id} / pogon ${pogon}: nema u bazi (SOP / karakteristike). `
        + "Šifrarnik → Osnovno → „Sačuvaj i propagiraj“ za ovaj deo.",
      );
      return;
    }
    if (seq !== ucitajDeoSeq.current) return;
    pogonKodRef.current = pogon;
    setPogonKod(pogon);
    const sopFallback = sop.broj_merenja || 5;
    setSacuvaneGrupe([]);
    setPrekidOdobrenId(null);
    koloneBridgeRef.current?.clearFotoKomentar?.();

    const gsInit = grupeMerenja(karLista, id, pogon);
    const gs = gsInit;
    if (!gs.length) {
      if (seq !== ucitajDeoSeq.current) return;
      const imaKar = (karLista || []).some(
        (k) => String(k.id_deo || "").toUpperCase() === id,
      );
      prikaziGresku(
        imaKar
          ? `ID ${id} / ${labelPogona(pogon)}: nema merljivih dimenzija za ovaj pogon. Izaberi drugi pogon.`
          : porukaNepoznatIdDeo(karLista, id),
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
    const br = brojMerenjaZaSeriju(karLista, id, ab, sopFallback, pogon);
    setPotrebanBroj(br);
    const cols = koloneZaGrupu(karLista, id, ab, br, pogon);
    if (!cols.some(c => c.naziv !== "-")) {
      setPoruka(
        `ID ${id}: nema dimenzija za seriju ${ab} u pogonu ${pogon}. Proveri karakteristike_merljive.`,
      );
    }
    setKoloneSpolja(cols);
    koloneBridgeRef.current?.setAktivnaKolona?.(indeksSledecePrazno(cols, br, 0));
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
      if (unosKorak !== "forma") setUnosKorak("forma");
      if (jeLinija && koristiMobLinija && linijaKorak < 3) setLinijaKorak(3);
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
    koloneBridgeRef.current?.clearFotoKomentar?.();
    const sopFb = sopZaPogon(sopMap, idDeo, pogonKod)?.broj_merenja || 5;
    const br = brojMerenjaZaSeriju(karakteristike, idDeo, ab, sopFb, pogonKod);
    setPotrebanBroj(br);
    const cols = koloneZaGrupu(karakteristike, idDeo, ab, br, pogonKod);
    const brojK = cols.filter(c => c.naziv !== "-").length;
    setKoloneSpolja(cols);
    koloneBridgeRef.current?.setAktivnaKolona?.(indeksSledecePrazno(cols, br, 0));
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
    const s = String(v ?? "").toUpperCase().replace(/\s+/g, "");
    const prev = prethodniId.current;

    // Uvek ažuriraj polje — brisanje/kucanje mora da radi odmah
    setIdDeo(s);
    clearTimeout(idUcitajTimer.current);
    idUcitajTimer.current = null;

    if (!s) {
      prethodniId.current = "";
      prethodniPogon.current = "";
      prethodniAB.current = "";
      pogonKodRef.current = "";
      ucitajDeoSeq.current += 1;
      ucitajDeoAktivni.current = "";
      poslednjaGreskaIdRef.current = "";
      setPogonKod("");
      setGrupe([]);
      setGrupaAB("");
      setNazivDela("");
      setRadniNalog("");
      setNalogInfo(null);
      setPoruka("");
      setSacuvaneGrupe([]);
      setPrekidOdobrenId(null);
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
      return;
    }

    // Još se kuca / briše — ne učitavaj i ne vraćaj stari ID
    if (!potvrdi && !idSpremanZaUcitavanje(s)) {
      if (prev && s !== prev) {
        prethodniId.current = "";
        prethodniPogon.current = "";
        prethodniAB.current = "";
        pogonKodRef.current = "";
        setPogonKod("");
        setGrupe([]);
        setGrupaAB("");
        setNazivDela("");
        setRadniNalog("");
        setNalogInfo(null);
        setSacuvaneGrupe([]);
        setPoruka("");
      }
      return;
    }

    // Potvrda / kompletan ID — blokiraj promenu na drugi deo dok merenja nisu gotova
    if (prev && s !== prev && !mozePreskociti) {
      if (imaBiloSta(kolone) && !svaMerenjaZavrsena(kolone, potrebanBroj)) {
        setPoruka("Moraš završiti sva merenja pre promene ID!");
        setIdDeo(prev);
        return;
      }
    }

    if (s !== prev) {
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

  const onPokreniUlaznuKontrolu = useCallback((prijem) => {
    const id = String(prijem?.id_deo || "").trim().toUpperCase();
    if (!id) {
      addToast("Za Ulaznu kontrolu unesi ID deo na prijemu", "greska");
      return;
    }
    const kontekst = {
      id: prijem.id,
      sifra_dobavljaca: prijem.sifra_dobavljaca || "",
      broj_lota: prijem.broj_lota || "",
      broj_dokumenta: prijem.broj_dokumenta || "",
      primljeno: prijem.primljeno,
      id_deo: id,
    };
    setPrijemKontekst(kontekst);
    sacuvajPrijemKontekst("merljive", kontekst);
    if (!jeLinija && typeof onPromeniRezim === "function") {
      onPromeniRezim("linija");
    }
    setTab("unos");
    onIdChange(id, { potvrdi: true, pogonEksplicitni: "A" });
    addToast(`Ulazna kontrola (A) za prijem #${prijem.id} · ${id}`, "info");
  }, [addToast, jeLinija, onPromeniRezim, onIdChange]);

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
  const mozeOdobriFai = mozeOdobritiFai(korisnik?.uloga);
  const mozePregledFai = mozePregledFaiOdobrenja(korisnik?.uloga);

  const promeniFaiStranicu = useCallback((nova) => {
    setFaiStranica(nova);
    koloneBridgeRef.current?.setAktivnaKolona?.(-1);
    setTimeout(() => {
      const pag = kolonePetStranica(koloneRef.current, nova, 5);
      const prvi = pag.prikaz.find((p) => p.realniIndeks >= 0);
      if (prvi) koloneBridgeRef.current?.setAktivnaKolona?.(prvi.realniIndeks);
    }, 0);
  }, []);

  const ucitajKoloneSerije = useCallback(() => {
    if (!idDeo || !grupaAB) return;
    const sopFb = sopZaPogon(sopMap, idDeo, pogonKod)?.broj_merenja || 5;
    const br = brojMerenjaZaSeriju(karakteristike, idDeo, grupaAB, sopFb, pogonKod);
    setPotrebanBroj(br);
    const cols = koloneZaGrupu(karakteristike, idDeo, grupaAB, br, pogonKod);
    setKoloneSpolja(cols);
    koloneBridgeRef.current?.setAktivnaKolona?.(indeksSledecePrazno(cols, br, 0));
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
    const mozeOdobriSada = mozeOdobritiFai(korisnik?.uloga, { imaNok });
    /** Kontrolor/kvalitet sa svim OK — čuvanje = odobrenje (bez čekanja). */
    const snimiKaoOdobren = mozeOdobriSada && (odobri || !imaNok);
    if (odobri && !mozeOdobriSada) {
      addToast(imaNok ? "FAI ima NOK — samo kvalitet može odobriti" : "Nemate pravo odobrenja FAI", "greska");
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
        odobri: snimiKaoOdobren,
      });
      setFaiPoslednjiId(rec.id);
      if (rec.status === "odobren") {
        setFaiOdobren(true);
        setFaiCekaOdobrenje(false);
        addToast("✓ FAI odobren — možete meriti seriju", "uspeh");
        ucitajKoloneSerije();
      } else {
        setFaiCekaOdobrenje(true);
        addToast(
          imaNok ? "FAI sa NOK — čeka kvalitet" : "FAI sačuvan — odobrite na tabu FAI da nastavite seriju",
          "info",
        );
      }
    } catch (e) {
      addToast(e.message, "greska");
    } finally {
      setSnima(false);
    }
  };

  const odobriFaiKasnije = async () => {
    if (snima || !faiPoslednjiId) return;
    setSnima(true);
    try {
      const postojeci = await ucitajFaiPoId(supabase, faiPoslednjiId);
      const imaNok = faiImaNok(postojeci?.merenja_json);
      if (!mozeOdobritiFai(korisnik?.uloga, { imaNok })) {
        addToast(imaNok ? "FAI sa NOK — odobrava kvalitet" : "Nemate pravo odobrenja", "greska");
        return;
      }
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

  const oznaciMerenjeSnimljeno = useCallback((colIdx, merIdx) => {
    koloneBridgeRef.current?.oznaciMerenjeSnimljeno?.(colIdx, merIdx);
  }, []);

  const onMerenjeDodatoSaMerila = useCallback(async ({
    colIdx, merIdx, k, raw, dec, status,
  }) => {
    if (!autoSnimiMeriloRef.current || status !== "OK") return;
    if (!idDeo || !grupaAB || snimaMeriloRef.current || faiRezimAktivan) return;
    if (!k?.id) return;

    snimaMeriloRef.current = true;
    let row = null;
    let sesija_id = null;
    try {
      sesija_id = ensureSesija({
        modul: "merljive",
        idDeo,
        smena,
        radniNalog,
      });
      const prijemnaId = prijemKontekst?.id
        && String(pogonKod || "").toUpperCase() === "A"
        && String(prijemKontekst.id_deo || "").toUpperCase() === String(idDeo || "").toUpperCase()
        ? prijemKontekst.id
        : null;
      row = buildMerenjeVarijabilnaRow({
        datum: parsirajDatum(datum),
        smena,
        radniNalog,
        idDeo,
        pogonKod,
        grupaAB,
        kolona: k,
        merenje: { raw, dec },
        status,
        linija,
        kontrolor,
        operater: korisnik?.ime || "",
        masina,
        radnikId: korisnik?.radnikId,
        sesijaId: sesija_id,
        prijemnaKontrolaId: prijemnaId,
        inspekcijaId: prijemnaId ? inspekcijaIdZa(grupaAB, merIdx, sesija_id) : null,
      });

      if (!online) {
        addMerljiveSerija({ merenja: [row] }, sesija_id);
        oznaciMerenjeSnimljeno(colIdx, merIdx);
        addToast(`📶 Offline: ${k.naziv}=${raw} u redu`, "info");
        return;
      }

      await snimiJednoMerenjeVarijabilno(supabase, row);
      oznaciMerenjeSnimljeno(colIdx, merIdx);
      if (prijemnaId) {
        try {
          await syncPrijemnaIzMerenja(prijemnaId);
        } catch (e) {
          addToast(`Merenje je sačuvano, prijem nije osvežen: ${e.message}`, "greska");
        }
      }
      addToast(`✓ ${k.naziv}=${raw} u bazi`, "uspeh");
    } catch (e) {
      if (jeMreznaGreska(e) && row) {
        try {
          addMerljiveSerija({ merenja: [row] }, sesija_id);
          oznaciMerenjeSnimljeno(colIdx, merIdx);
          addToast(`📶 Mreža nestabilna: ${k.naziv}=${raw} u redu`, "info");
          return;
        } catch { /* */ }
      }
      addToast(e.message || "Greška auto-snimanja", "greska");
    } finally {
      snimaMeriloRef.current = false;
    }
  }, [
    idDeo, grupaAB, faiRezimAktivan, smena, radniNalog, pogonKod, linija, kontrolor,
    masina, korisnik, datum, online, addMerljiveSerija, addToast, oznaciMerenjeSnimljeno,
    prijemKontekst, inspekcijaIdZa,
  ]);

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
    const koloneZaSnim = koloneBridgeRef.current?.getKolone?.() ?? kolone;
    const fotoZaSnim = koloneBridgeRef.current?.getFotoPoPoziciji?.() ?? {};
    const komentarZaSnim = koloneBridgeRef.current?.getKomentarPoPoziciji?.() ?? {};
    try {
    const sesija_id = ensureSesija({
      modul: "merljive",
      idDeo,
      smena,
      radniNalog,
    });
    const prijemnaId = prijemKontekst?.id
      && String(pogonKod || "").toUpperCase() === "A"
      && String(prijemKontekst.id_deo || "").toUpperCase() === String(idDeo || "").toUpperCase()
      ? prijemKontekst.id
      : null;
    const rows = [];
    for (const k of koloneZaSnim) {
      if (k.naziv === "-") continue;
      for (const [merIdx, m] of k.merenja.entries()) {
        if (m.snimljenoDb) continue;
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
          foto: st === "NOK" ? (fotoZaSnim[k.naziv] || null) : null,
          komentar: st === "NOK" ? (komentarZaSnim[k.naziv]?.trim() || null) : null,
          sesija_id,
          ...(prijemnaId ? {
            prijemna_kontrola_id: prijemnaId,
            inspekcija_id: inspekcijaIdZa(grupaAB, merIdx, sesija_id),
          } : {}),
        });
      }
    }
    const rowsStamped = stampajClientIdNaRedove(rows);
    const rowsZaAlarm = [];
    for (const k of koloneZaSnim) {
      if (k.naziv === "-") continue;
      for (const m of k.merenja) {
        if (m.raw === "" || m.raw == null) continue;
        const st = proveriOkNok(m.raw, k.lslDec, k.uslDec, k.jedinica);
        if (!st) continue;
        rowsZaAlarm.push({
          pozicija: k.naziv,
          status: st,
          vrednost_raw: m.raw,
          vrednost_dec: m.dec,
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

    const svaSnimljena = !koloneZaSnim.some(
      (k) => k.naziv !== "-" && k.merenja.some((m) => !m.snimljenoDb),
    );
    if (!rowsStamped.length && !svaSnimljena) {
      setPoruka("Nema novih merenja za snimanje.");
      return;
    }

    const staviUOffline = (razlog) => {
      const klasaMap = Object.fromEntries(
        (koloneZaSnim || [])
          .filter((k) => k.naziv && k.naziv !== "-")
          .map((k) => [k.naziv, k.klasa]),
      );
      const paliNok = pozicijeSaPrekoracenimNok(rowsZaAlarm, klasaMap);
      addMerljiveSerija({
        merenja: rowsStamped,
        kpi: kpiPayload,
        meta: {
          grupaAB,
          idDeo,
          rowsZaAlarm,
          koloneZaAlarm: (koloneZaSnim || [])
            .filter((k) => k.naziv && k.naziv !== "-")
            .map((k) => ({
              naziv: k.naziv,
              lslDec: k.lslDec,
              uslDec: k.uslDec,
              jedinica: k.jedinica,
              klasa: k.klasa,
            })),
          pendingNokAlarm: paliNok.length > 0,
        },
      }, sesija_id);
      addToast(
        rowsStamped.length
          ? `📶 ${razlog}: serija ${grupaAB} u redu (${rowsStamped.length} merenja + KPI)`
          : `📶 ${razlog}: KPI serija ${grupaAB}`,
        "info",
      );
      koloneBridgeRef.current?.clearFotoKomentar?.();
      setSacuvaneGrupe(prev => [...prev, grupaAB]);
      bumpPlanPosleSnimanja();
      if (paliNok.length) {
        const lok = lokalniOfflineNokAlarm({ idDeo, serija: grupaAB, pali: paliNok });
        if (lok) {
          postaviSpcAlarm(lok);
          setPoruka(`⛔ SPC alarm (offline) — ${lok.pozicija} · potvrdite PIN/komentar pre nastavka.`);
          addToast(
            `⛔ Visok NOK (${paliNok[0].nok}/${paliNok[0].uk} na ${paliNok[0].pozicija}) — linija blokirana`,
            "greska",
          );
        }
        return true;
      }
      if (!prebaciNaSledecuSerijuPosleSnimanja(grupaAB)) {
        setPoruka(`Sačuvano offline. Sinhronizuj kada bude mreža. Sesija: ${sesija_id}`);
      }
      return false;
    };

    if (!online) {
      staviUOffline("Offline");
      return;
    }

    let error = null;
    if (rowsStamped.length) {
      const res = await supabase.from("merenja_varijabilna").upsert(rowsStamped, {
        onConflict: "client_id",
        ignoreDuplicates: true,
      });
      error = res.error;
      if (error && !jeMreznaGreska(error) && !jeDupliClientId(error)) {
        const res2 = await supabase.from("merenja_varijabilna").insert(rowsStamped);
        error = res2.error;
      }
      if (error && jeDupliClientId(error)) error = null;
    }
    if (error) {
      if (jeMreznaGreska(error)) {
        staviUOffline("Mreža nestabilna");
        return;
      }
      const msg = porukaDbGreske(error);
      setPoruka(
        msg.includes("prijemna_kontrola_id") || msg.includes("inspekcija_id")
          ? `${msg}\nPokreni 72_prijemna_veza_merljiva.sql u Supabase.`
          : msg.includes("19_fix_merenja_varijabilna_sequence")
          ? msg
          : msg.includes("sesija_id")
            ? `${msg}\nPokreni 15_sesija_id.sql u Supabase.`
            : msg.includes("foto") || msg.includes("komentar") || msg.includes("schema cache")
              ? `${msg}\nPokreni 13_merenja_varijabilna_foto.sql / 66_linija_pouzdanost.sql u Supabase.`
              : msg,
      );
      return;
    }

    if (prijemnaId) {
      try {
        const prijemZbir = await syncPrijemnaIzMerenja(prijemnaId);
        addToast(
          `✓ Prijem #${prijemnaId}: kontrolisano ${prijemZbir.kontrolisano} · OK ${prijemZbir.ok} · NOK ${prijemZbir.nok}`,
          "uspeh",
        );
      } catch (e) {
        addToast(`Prijem nije osvežen: ${e.message}`, "greska");
      }
    }

    const { data: kpiData, error: errKpi } = await snimiKpiUnos(supabase, kpiPayload);
    if (errKpi) {
      addToast(porukaKpiGreske(errKpi), "greska");
      setPoruka(porukaKpiGreske(errKpi));
      return;
    }
    if (kpiData?.id) {
      setKpiDbId(kpiData.id);
      setKpiDbIdPoSeriji(prev => ({ ...prev, [grupaAB]: kpiData.id }));
      setKpiPoSeriji(prev => ({ ...prev, [grupaAB]: kpiSerijaRef.current }));
    }

    koloneBridgeRef.current?.clearFotoKomentar?.();
    if (prekidOdobrenId) {
      await zatvoriPrekidZahtev(supabase, prekidOdobrenId);
      setPrekidOdobrenId(null);
    }
    if (kalibracijaOdobrenId) {
      await zatvoriKalibracijaOdobrenje(supabase, kalibracijaOdobrenId);
      setKalibracijaOdobrenId(null);
    }

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
        rows: rowsZaAlarm,
        idDeo,
        radnikId: korisnik?.radnikId,
        serija: grupaAB,
        kolone: koloneZaSnim,
      });
      try {
        await posleSnimanjaMerljiva(supabase, {
          idDeo,
          datum: parsirajDatum(datum),
          smena,
          radniNalog,
          kreiraoId: korisnik?.radnikId,
        }, { onToast: addToast });
      } catch (e) {
        addToast(`Auto pravilo (NOK streak): ${e.message || "greška"}`, "greska");
      }
      if (alarmiNok.length) {
        postaviSpcAlarm(alarmiNok[0]);
        await osveziSpcAlarm();
        setPoruka(`⛔ SPC alarm — ${alarmiNok[0].pozicija || "NOK"} · potvrdite pre nastavka.`);
        return;
      }
    } catch (e) {
      addToast(`SPC alarm (NOK serija): ${e.message || "greška"}`, "greska");
    }

    setSacuvaneGrupe(prev => [...prev, grupaAB]);

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
    } catch (e) {
      if (jeMreznaGreska(e)) {
        addToast("📶 Mreža nestabilna — pokušajte ponovo ili sačekajte offline sync", "greska");
        setPoruka("Mreža nestabilna. Ako je serija u offline redu, sinhronizovaće se automatski.");
      } else {
        addToast(e?.message || "Greška snimanja", "greska");
        setPoruka(e?.message || "Greška snimanja");
      }
    } finally {
      setSnima(false);
    }
  };

  const { stackVertikalno, desktopUnos } = L;
  const { telefon, telefonLandscape, uspravnoMobTab } = ekran;

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

  const padGlavni = L.padGlavni;

  const dugmadSerije = (
    <MerljiveDugmadSerije
      C={C}
      L={L}
      mozeObrisati={mozeObrisati}
      obrisiPoslednje={obrisiPoslednje}
      mozeSacuvati={mozeSacuvati}
      snima={snima}
      greskaDb={greskaDb}
      onSacuvajAkcija={onSacuvajAkcija}
      faiRezimAktivan={faiRezimAktivan}
      mozeOdobriFai={mozeOdobriFai}
      prekidOdobrenId={prekidOdobrenId}
      serijaPotpuna={serijaPotpuna}
    />
  );

  const prikaziMerljiveFormu = idDeo && grupaAB && unosKorak === "forma" && !faiCekaOdobrenje && (
    !jeLinija || (
      (faiRezimAktivan || faiOdobren || !faiPotreban) && (
        (koristiMobLinija && linijaKorak >= 3) || (jeLinija && !koristiMobLinija)
      )
    )
  );
  const prikaziFaiFormu = trebaFaiEkran && idDeo && grupaAB && unosKorak === "forma" && idUcitano && listaSpremna
    && ((koristiMobLinija && linijaKorak >= 3) || !koristiMobLinija || !jeLinija);
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

  const mobDugmadAkcije = (
    <MerljiveMobDugmadAkcije
      C={C}
      L={L}
      ekran={ekran}
      mozeObrisati={mozeObrisati}
      obrisiPoslednje={obrisiPoslednje}
      mozeSacuvati={mozeSacuvati}
      snima={snima}
      greskaDb={greskaDb}
      onSacuvajAkcija={onSacuvajAkcija}
      faiRezimAktivan={faiRezimAktivan}
      mozeOdobriFai={mozeOdobriFai}
      prekidOdobrenId={prekidOdobrenId}
      serijaPotpuna={serijaPotpuna}
    />
  );

  const mobSerijaStatus = (
    <MerljiveMobSerijaStatus
      C={C}
      L={L}
      grupe={grupe}
      grupaAB={grupaAB}
      sacuvaneGrupe={sacuvaneGrupe}
      indeksAktivne={indeksAktivne}
    />
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
    <MerljiveSerijaDugmad
      C={C}
      inp={inp}
      serijeMeta={serijeMeta}
      grupe={grupe}
      grupaAB={grupaAB}
      sacuvaneGrupe={sacuvaneGrupe}
      indeksAktivne={indeksAktivne}
      onGrupaChange={onGrupaChange}
    />
  );

  const generalijeGornjiRed = desktopUnos && (
    <MerljiveGeneralijeRed
      C={C}
      lbl={lbl}
      inp={inp}
      datum={datum}
      setDatum={setDatum}
      smena={smena}
      obradiBarkodSken={obradiBarkodSken}
      idBarkodPolje={idBarkodPolje}
      idDeo={idDeo}
      potvrdiIdDeo={potvrdiIdDeo}
      nalogUcitava={nalogUcitava}
      radniNalog={radniNalog}
      nalogInfo={nalogInfo}
      dostupniPogoni={dostupniPogoni}
      omoguceniPogoni={omoguceniPogoni}
      pogonKod={pogonKod}
      onPogonChange={onPogonChange}
      trebaIzborPogona={trebaIzborPogona}
      nazivDela={nazivDela}
      linija={linija}
      kontrolor={kontrolor}
      masina={masina}
      grupe={grupe}
      grupaAB={grupaAB}
      sacuvaneGrupe={sacuvaneGrupe}
      indeksAktivne={indeksAktivne}
      onGrupaChange={onGrupaChange}
      faiRezimAktivan={faiRezimAktivan}
      brojFaiDimenzija={brojFaiDimenzija}
    />
  );

  const merljiveFormaBlok = prikaziMerljiveFormu && (
    <MerljiveUnosFormaConsumer
      C={C}
      inp={inp}
      merilaMap={merilaMap}
      ekran={ekran}
      L={L}
      digitalniUnos={digitalniUnos}
      meriloPovezano={meriloPovezano}
      desktopUnos={desktopUnos}
      potrebanBroj={potrebanBroj}
      addToast={addToast}
      onMeriloPovezanChange={onMeriloPovezanChange}
      registerMeriloStop={registerMeriloStop}
      registerMeriloSimuliraj={registerMeriloSimuliraj}
      autoSnimiMerilo={autoSnimiMerilo}
      onAutoSnimiMeriloChange={onAutoSnimiMeriloChange}
      onMerenjeDodatoSaMerila={onMerenjeDodatoSaMerila}
      koristiTastMerenja={koristiTastMerenja}
      faiRezimAktivan={faiRezimAktivan}
      metaAktivneSerije={metaAktivneSerije}
      grupaAB={grupaAB}
      ciljSesije={ciljSesije}
      preostaloSesije={preostaloSesije}
      idDeo={idDeo}
      brojFaiDimenzija={brojFaiDimenzija}
      faiKompletno={faiKompletno}
      snima={snima}
      mozeOdobriFai={mozeOdobriFai}
      faiStranica={faiStranica}
      promeniFaiStranicu={promeniFaiStranicu}
      sacuvajFai={sacuvajFai}
      kpiPanelBlok={kpiPanelBlok}
      prekidOdobrenId={prekidOdobrenId}
      imaNepotpunuSesiju={imaNepotpunuSesiju}
      zoomSlika={zoomSlika}
      setZoomSlika={setZoomSlika}
      urlSlike={urlSlike}
      slika={slika}
      mobDugmadAkcije={mobDugmadAkcije}
      dugmadSerije={dugmadSerije}
      mobSerijaStatus={mobSerijaStatus}
      viewportKey={viewportKey}
      kolonaZaSlot={kolonaZaSlot}
    />
  );

  const faiCekaBlok = faiCekaOdobrenje && prikaziFaiFormu && (
    <MerljiveFaiCekaBlok
      C={C}
      korisnik={korisnik}
      smena={smena}
      pogonKod={pogonKod}
      idDeo={idDeo}
      brojFaiDimenzija={brojFaiDimenzija}
      mozeOdobriFai={mozeOdobriFai}
      snima={snima}
      odobriFaiKasnije={odobriFaiKasnije}
      faiPoslednjiId={faiPoslednjiId}
      addToast={addToast}
      kpiPanelBlok={kpiPanelBlok}
      onOdobreno={() => {
        setFaiOdobren(true);
        setFaiCekaOdobrenje(false);
        ucitajKoloneSerije();
      }}
    />
  );

  const faiFallbackBlok = prikaziFaiFormu && !faiCekaOdobrenje && faiRezimAktivan && brojFaiDimenzija === 0 && (
    <div style={{
      flex: 1, padding: 16, background: `${C.crvena}14`, border: `1px solid ${C.crvena}55`,
      borderRadius: 8, fontSize: 11, lineHeight: 1.5, color: C.crvena,
    }}>
      <strong>FAI je obavezan</strong>, ali za <code>{idDeo}</code> nema dimenzija sa{" "}
      <code>nivo_kontrole = DA</code> u šifrarniku (pogon {pogonKod || "—"}).
    </div>
  );

  const unosFormaSadrzaj = faiCekaBlok || merljiveFormaBlok || faiFallbackBlok;

  const trebaCekListaMer = tab === "unos" && !listaSpremna && !mozeAdmin;

  if (trebaCekListaMer) {
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
    <MerljiveKoloneProvider
      ref={koloneBridgeRef}
      potrebanBroj={potrebanBroj}
      koristiTastMerenja={koristiTastMerenja}
      unosKorak={unosKorak}
      kalUpozorenja={kalUpozorenja}
      mozeUpRikosKalibracije={mozeUpRikosKalibracije}
      mozeAdmin={mozeAdmin}
      setPoruka={setPoruka}
      onMerenjaChange={onMerenjaChange}
    >
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
            osveziKarantin();
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
          onNcrKreiran={(row) => addToast(`✓ NCR ${row.broj_ncr} kreiran iz alarma`, "uspeh")}
        />
      )}

      {jeLinija && karantinInfo?.aktivan && (
        <KarantinBlokada
          C={C}
          karantin={karantinInfo}
          idDeo={idDeo}
          radniNalog={radniNalog}
          nazivDela={nazivDela}
          podnaslov="Merljive · linija"
          onOsvezi={osveziKarantin}
        />
      )}

      {toasts.length > 0 && (
        <div style={{ position: "fixed", top: 12, right: 12, zIndex: 9999, display: "flex", flexDirection: "column", gap: 6 }}>
          {toasts.map(t => (
            <div key={t.id} style={{
              background: t.tip === "greska" ? C.crvena : t.tip === "uspeh" ? C.zelena : C.plava,
              color: C.onAkcent, padding: "10px 14px", borderRadius: 8, fontSize: 11, maxWidth: 320,
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

      {tab === "unos" && !ucitava && !Object.keys(sopMap).length && (
        <div style={{
          margin: "0 12px 8px",
          padding: "12px 16px",
          background: C.crvena,
          color: C.onAkcent,
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
                  title={meriloSimulacija
                    ? "Prekini simulaciju"
                    : `Merilo povezano${autoSnimiMerilo ? " · auto u bazu (OK)" : ""} — klik za prekid`}
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
                    ? (meriloSimulacija ? "Sim" : (autoSnimiMerilo ? "Mer·auto" : "Merilo"))
                    : (meriloSimulacija ? "Simulacija" : (autoSnimiMerilo ? "Merilo · auto" : "Merilo povezano"))}
                </button>
              )}
              {digitalniUnos && (
                <span title="Digitalni unos"
                  style={{ color: C.zelena, fontSize: 8, fontWeight: 700, flexShrink: 0 }}>±</span>
              )}
              {mozePrebacivanjeRezimaUTacci(korisnik?.uloga) && typeof onPromeniRezim === "function" && (
                <button
                  type="button"
                  onClick={() => onPromeniRezim(jeLinija ? "analitika" : "linija")}
                  title={jeLinija ? "Modul 2 — Analitika" : "Modul 1 — Unos"}
                  style={{
                    background: jeLinija ? `${C.zelena}22` : `${C.plava}22`,
                    border: `1px solid ${jeLinija ? C.zelena : C.plava}`,
                    borderRadius: 5, color: jeLinija ? C.zelena : C.plava,
                    fontSize: 8, padding: "1px 5px", cursor: "pointer", fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {(ekran.mob || ekran.tablet) ? (jeLinija ? "📊" : "🏭") : (jeLinija ? "📊 Modul 2 — Analitika" : "🏭 Modul 1 — Unos")}
                </button>
              )}
              {jeLinija && koristiMobLinija && digitalniUnos && mozeTabMerljive("moment", korisnik?.uloga, rezimRada) && (
                <button
                  type="button"
                  onClick={() => setTab(tab === "moment" ? "unos" : "moment")}
                  style={{
                    background: tab === "moment" ? `${C.ljubicasta || "#a78bfa"}22` : C.hover,
                    border: `1px solid ${tab === "moment" ? (C.ljubicasta || "#a78bfa") : C.border}`,
                    borderRadius: 5, color: tab === "moment" ? (C.ljubicasta || "#a78bfa") : C.sivi,
                    fontSize: 8, padding: "1px 5px", cursor: "pointer", fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {tab === "moment" ? "←" : "MOM"}
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
              {jeLinija && koristiMobLinija && mozeTabMerljive("prijemna", korisnik?.uloga, rezimRada) && (
                <button
                  type="button"
                  onClick={() => setTab(tab === "prijemna" ? "unos" : "prijemna")}
                  title="Prijemna kontrola dobavljača"
                  style={{
                    background: tab === "prijemna" ? `${C.plava}22` : C.hover,
                    border: `1px solid ${tab === "prijemna" ? C.plava : C.border}`,
                    borderRadius: 5, color: tab === "prijemna" ? C.plava : C.sivi,
                    fontSize: 8, padding: "1px 5px", cursor: "pointer", fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {tab === "prijemna" ? "←" : "PRIJEM"}
                </button>
              )}
              {jeLinija && koristiMobLinija && mozeTabMerljive("povezi-prijem", korisnik?.uloga, rezimRada) && (
                <button
                  type="button"
                  onClick={() => setTab(tab === "povezi-prijem" ? "unos" : "povezi-prijem")}
                  title="Poveži merenja sa prijemom dobavljača"
                  style={{
                    background: tab === "povezi-prijem" ? `${C.plava}22` : C.hover,
                    border: `1px solid ${tab === "povezi-prijem" ? C.plava : C.border}`,
                    borderRadius: 5, color: tab === "povezi-prijem" ? C.plava : C.sivi,
                    fontSize: 8, padding: "1px 5px", cursor: "pointer", fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {tab === "povezi-prijem" ? "←" : "POVEŽI"}
                </button>
              )}
            </>
          )}
          trakaIspod={ekran.telefon ? null : (
            jeLinija ? (
              <ShopFloorStatusBar
                C={C}
                online={online}
                offlineTotal={offlineCounts.total}
                onSync={() => flushQueue()}
                digitalniUnos={digitalniUnos}
                meriloPovezano={meriloPovezano}
                meriloSimulacija={meriloSimulacija}
                kljucPovezan={kljucPovezan}
                idDeo={idDeo}
                smena={smena}
                linija={linija}
                modul="merljive"
              />
            ) : (
              <ShopFloorStatusBar
                C={C}
                online={online}
                offlineTotal={offlineCounts.total}
                onSync={() => flushQueue()}
                digitalniUnos={digitalniUnos}
                meriloPovezano={meriloPovezano}
                meriloSimulacija={meriloSimulacija}
                kljucPovezan={kljucPovezan}
                idDeo={idDeo}
                smena={smena}
                linija={linija}
                modul="merljive"
                kompakt
                onNavigacija={onNavigacijaAnalitika}
              />
            )
          )}
        />
        {(punPristupTabovima || !jeLinija || linijaTaboviVidljivi || mozePregledFai) && prikazTabovi?.length > 1 && (
        jeLinija ? (
        <div style={{
          display: "flex",
          borderTop: `1px solid ${C.border}`,
          padding: (ekran.mob || ekran.tablet) ? "0 6px" : "0 12px",
          flexWrap: "nowrap",
          overflowX: (ekran.mob || ekran.tablet) ? "auto" : "visible",
          WebkitOverflowScrolling: "touch",
        }}>
          {TABOVI.map(([id, naziv]) => (
            <button key={id} type="button" data-testid={`tab-${id}`} onClick={() => setTab(id)} style={{
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
        ) : (
          <>
            <AnalitikaHeader
              grupe={analitikaGrupe}
              tab={tab}
              setTab={setTab}
              C={C}
              kompakt={ekran.mob || ekran.tablet}
              badgePoTabu={badgePoTabu}
              badgePoGrupi={badgePoGrupi}
              modul="merljive"
              onNavigacija={onNavigacijaAnalitika}
            />
          </>
        )
        )}
      </div>

      {tab === "unos" && (
        <PrijemMerenjeKontekst
          C={C}
          addToast={addToast}
          modul="merljive"
          idDeo={idDeo}
          kontekst={prijemKontekst}
          onKontekst={setPrijemKontekst}
          onAktiviran={() => setPogonKod("A")}
          kompakt={ekran.mob || ekran.tablet}
          rezim="banner"
          pogonKod={pogonKod}
        />
      )}

      {tab === "povezi-prijem" && (
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}>
          <PrijemMerenjeKontekst
            C={C}
            addToast={addToast}
            modul="merljive"
            idDeo={idDeo}
            kontekst={prijemKontekst}
            onKontekst={setPrijemKontekst}
            onAktiviran={() => setPogonKod("A")}
            onZatvori={() => setTab("unos")}
            kompakt={ekran.mob || ekran.tablet}
            rezim="panel"
            pogonKod={pogonKod}
          />
        </div>
      )}

      {tab === "pregled" && !jeLinija && (
        <LazyTab C={C} label="Učitavam pregled…">
        <AnalitikaPregledPanel
          C={C}
          addToast={addToast}
          korisnik={korisnik}
          modul="merljive"
          onOtvoriOee={() => setTab("oee")}
          onOtvori8D={otvori8dLokalno}
          onOtvoriNcr={onOtvoriNcrAnalitika}
          onNavigacija={onNavigacijaAnalitika}
        />
        </LazyTab>
      )}

      {tab === "odobrenja" && !jeLinija && mozeOdobrenjaQA(korisnik?.uloga) && (
        <LazyTab C={C} label="Učitavam odobrenja…">
          <OdobrenjaQAPanel korisnik={korisnik} C={C} addToast={addToast} />
        </LazyTab>
      )}

      {tab === "8d" && !jeLinija && (
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <LazyTab C={C} label="Učitavam 8D…">
        <OsmDIzvestaj
          korisnik={korisnik}
          C={C}
          addToast={addToast}
          sviDelovi={deloviLista}
          prefill={osmdPrefill}
          onPrefillUsed={() => setOsmdPrefill(null)}
          onOtvoriPfmeaCp={(prefill) => {
            setPfmeaCpPrefillIz8d(prefill);
            setTab("pfmea-cp");
          }}
        />
        </LazyTab>
        </div>
      )}

      {tab === "pfmea-cp" && !jeLinija && (
        <LazyTab C={C} label="Učitavam PFMEA/CP…">
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
        <PfmeaCpModul
          C={C}
          addToast={addToast}
          korisnik={korisnik}
          idDeoFilter={filterDeo || idDeo || ""}
          prefillIz8d={pfmeaCpPrefillIz8d}
          onPrefillIz8dUsed={() => setPfmeaCpPrefillIz8d(null)}
          onOtvori8d={async (payload) => {
            if (payload.otvoriPostojeci && (payload.osmdId || payload.broj8d)) {
              let q = supabase.from("osmd_izvestaji")
                .select("*,kreirao:radnici!osmd_izvestaji_kreirao_id_fkey(ime)");
              if (payload.osmdId) q = q.eq("id", payload.osmdId);
              else q = q.eq("broj_8d", payload.broj8d);
              const { data } = await q.maybeSingle();
              if (data) {
                setOsmdPrefill(data);
                setTab("8d");
                return;
              }
              addToast?.("Povezani 8D nije pronađen.", "greska");
              return;
            }
            setOsmdPrefill(normalizujPrefill8d(payload));
            setTab("8d");
          }}
          onUbaciU8d={(e) => {
            setOsmdPrefill(normalizujPrefill8d(e));
            setTab("8d");
          }}
        />
        </div>
        </LazyTab>
      )}

      {tab === "eskalacije" && !jeLinija && (
        <LazyTab C={C} label="Učitavam eskalacije…">
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "100%" }}>
        <EskalacijePanel
          korisnik={korisnik}
          C={C}
          addToast={addToast}
          sviDelovi={deloviLista}
          onOtvori8D={(e) => {
            setOsmdPrefill(prefill8dIzEskalacije(e));
            setTab("8d");
          }}
        />
        </div>
        </LazyTab>
      )}

      {tab === "ncr" && !jeLinija && (
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: 20, display: "flex", flexDirection: "column" }}>
          <LazyTab C={C} label="Učitavam NCR/CAPA…">
          <NcrCapaPanel
            korisnik={korisnik}
            C={C}
            addToast={addToast}
            sviDelovi={deloviLista}
            prefill={ncrPrefill}
            onPrefillUsed={() => setNcrPrefill(null)}
            onOtvori8D={(e) => {
              setOsmdPrefill(normalizujPrefill8d(e));
              setTab("8d");
            }}
            onOtvoriTab={(t) => setTab(t)}
            onOtvoriPfmeaCp={(prefill) => {
              setPfmeaCpPrefillIz8d(prefill);
              setTab("pfmea-cp");
            }}
          />
          </LazyTab>
        </div>
      )}

      {tab === "iso3951" && !jeLinija && (
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}>
          <LazyTab C={C} label="Učitavam ISO 3951…">
          <Iso3951Kalkulator C={C} />
          </LazyTab>
        </div>
      )}

      {tab === "moment" && jeLinija && digitalniUnos && (
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <LazyTab C={C} label="Učitavam moment…">
          <MomentLinijaPanel
            C={C}
            korisnik={korisnik}
            smena={smena}
            linija={linija}
            idDeo={idDeo}
            onIdChange={(v) => onIdChange(v)}
            onIdPotvrdi={potvrdiIdDeo}
            radniNalog={radniNalog}
            listaSpremna={listaSpremna}
            addToast={addToast}
            mozeAdmin={mozeAdmin}
            onKljucPovezanChange={setKljucPovezan}
          />
          </LazyTab>
        </div>
      )}

      {tab === "fai" && (
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <LazyTab C={C} label="Učitavam FAI…">
          <FaiOdobrenjePanel
            C={C}
            korisnik={korisnik}
            smena={smena}
            pogonKod={pogonKod}
            addToast={addToast}
            onOdobreno={() => proveriFai()}
          />
          </LazyTab>
        </div>
      )}

      {tab === "prijemna" && (
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}>
          <PrijemnaKontrolaPanel C={C} addToast={addToast} onPokreniKontrolu={onPokreniUlaznuKontrolu}/>
        </div>
      )}

      {tab === "dashboard" && !jeLinija && (
        <div style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
        <LazyTab C={C} label="Učitavam dashboard…">
        <MerljiveAnalitikaDashboard
          C={C}
          addToast={addToast}
          onNavigacija={onNavigacijaAnalitika}
          korisnik={korisnik}
          onOtvori8D={otvori8dLokalno}
        />
        </LazyTab>
        </div>
      )}

      {tab === "karte" && (
        <div style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          <LazyTab C={C} label="Učitavam SPC karte…">
          <MerljiveSpcKarte
            C={C}
            addToast={addToast}
            korisnik={korisnik}
            spoljniFilter={spcFilterAnalitika}
            pocetniTip={spcTipNav}
            onPocetniTipPotrosen={() => setSpcTipNav(null)}
            onNavigacijaKarte={({ spcTip }) => { if (spcTip) setSpcTipNav(spcTip); }}
          />
          </LazyTab>
        </div>
      )}

      {tab === "msa" && (
        <LazyTab C={C} label="Učitavam MSA…">
          <MerilaMsaHub C={C} addToast={addToast} korisnik={korisnik} />
        </LazyTab>
      )}

      {tab === "kplan" && (
        <LazyTab C={C} label="Učitavam kontrolni plan…">
          <KontrolniPlanPanel C={C} addToast={addToast} korisnik={korisnik} idDeoFilter={filterDeo || idDeo || ""} />
        </LazyTab>
      )}

      {tab === "smena" && (
        <LazyTab C={C} label="Učitavam izveštaj smene…">
        <IzvestajSmeneMerljive
          C={C}
          korisnik={korisnik}
          smena={smena}
          addToast={addToast}
          idDeo={(filterDeo || idDeo) || undefined}
        />
        </LazyTab>
      )}

      {tab === "heatmap" && (
        <LazyTab C={C} label="Učitavam heatmap…">
          <MerljiveHeatmapPregled C={C} addToast={addToast} />
        </LazyTab>
      )}

      {tab === "ciljevi" && (
        <LazyTab C={C} label="Učitavam ciljeve…">
          <CiljeviMerljive C={C} addToast={addToast} sviDelovi={deloviLista} />
        </LazyTab>
      )}

      {tab === "nalozi" && (
        <LazyTab C={C} label="Učitavam naloge…">
          <RadniNaloziPanel C={C} addToast={addToast} sviDelovi={deloviLista} />
        </LazyTab>
      )}

      {tab === "kupac" && (
        <LazyTab C={C} label="Učitavam kupca…">
          <KupacMerljive C={C} addToast={addToast} />
        </LazyTab>
      )}

      {tab === "dobavljac" && (
        <LazyTab C={C} label="Učitavam dobavljača…">
          <IzvestajDobavljacPanel C={C} addToast={addToast} korisnik={korisnik} />
        </LazyTab>
      )}

      {tab === "oc" && (
        <LazyTab C={C} label="Učitavam OC krivu…">
          <OCKrivaPanel C={C} kontekst={ocKontekst} addToast={addToast} />
        </LazyTab>
      )}

      {tab === "stabilnost" && (
        <LazyTab C={C} label="Učitavam stabilnost…">
          <StabilnostMerljive C={C} addToast={addToast} sviDelovi={deloviLista} />
        </LazyTab>
      )}

      {tab === "oee" && (
        <LazyTab C={C} label="Učitavam OEE…">
        <OeeKpiTab
          C={C}
          modul="merljive"
          addToast={addToast}
          idDeoFilter={(filterDeo || idDeo) || undefined}
          datum={datumSrUIso(datum)}
          smena={smena}
          radniNalog={radniNalog || undefined}
        />
        </LazyTab>
      )}

      {tab === "stanje" && (
        <div style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
        <LazyTab C={C} label="Učitavam stanje dela…">
        <InteligencijaDeoPanel
          C={C}
          korisnik={korisnik}
          addToast={addToast}
          sviDelovi={deloviLista}
          defaultIdDeo={filterDeo || idDeo || ""}
          onOtvori8D={otvori8dLokalno}
        />
        </LazyTab>
        </div>
      )}

      {tab === "trasabilitet" && mozeAnalitika && (
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <LazyTab C={C} label="Učitavam trasabilitet…">
          <TrasabilitetPanel
            C={C}
            addToast={addToast}
            modul="merljive"
            pocetniIdDeo={filterDeo || idDeo}
          />
          </LazyTab>
        </div>
      )}

      {tab === "excel" && mozeInzenjerExcel(korisnik?.uloga, rezimRada) && (
        <div style={{ flex: 1, overflow: "auto", padding: 20, maxWidth: 720, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
          <LazyTab C={C} label="Učitavam Excel panel…">
          <InzenjerExcelPanel
            modul="merljive"
            mozeUvoz={mozeInzenjerExcelUvoz(korisnik?.uloga, rezimRada)}
            idDeoFilter={filterDeo || idDeo}
            C={C}
            addToast={addToast}
          />
          </LazyTab>
        </div>
      )}

      {tab === "admin" && mozeAdmin && (
        <LazyTab C={C} label="Učitavam admin…">
        <MerljiveAdminTab
          supabase={supabase}
          C={C}
          korisnik={korisnik}
          addToast={addToast}
          online={online}
          onFlushed={onFlushed}
        />
        </LazyTab>
      )}

      {tab === "log" && (
        <LazyTab C={C} label="Učitavam log…">
          <MerljiveLogPregled
            C={C}
            ekran={ekran}
            padGlavni={padGlavni}
            addToast={addToast}
            pocetniDatum={datumSrUIso(datum)}
            pocetnaSmena={smena}
            queue={queue}
            online={online}
          />
        </LazyTab>
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
          {linijaKorak === 3 && unosFormaSadrzaj}
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
              background: poruka.includes("FAI") || poruka.includes("fai")
                ? `${C.zuta}28`
                : (poruka.includes("uspešno") || poruka.includes("kompletirana") ? C.ok : `${C.zuta}20`),
              border: poruka.includes("FAI") || poruka.includes("fai")
                ? `2px solid ${C.zuta}`
                : `1px solid ${C.border}`,
              borderRadius: 8, padding: 8, marginBottom: 8, fontSize: 11,
              color: poruka.includes("FAI") || poruka.includes("fai") ? C.zuta : undefined,
              fontWeight: poruka.includes("FAI") || poruka.includes("fai") ? 700 : 400,
            }}>
              {poruka}
            </div>
          )}
          {idUcitano && (
            <>
              {generalijeGornjiRed}
              {unosFormaSadrzaj}
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
                      : "Unesi pun ID dela (npr. 5502-A, NM-001)"}
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
                    karakteristikeBroj={sifrarnikBroj}
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
            {idUcitano && unosKorak === "poka" && (
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
            {idUcitano && unosKorak === "forma" && (
              <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                overflow: "hidden",
                padding: 14,
              }}>
                {unosFormaSadrzaj}
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
            karakteristikeBroj={sifrarnikBroj}
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

        {unosFormaSadrzaj}
      </div>
      )}
    </div>
    </MerljiveKoloneProvider>
  );
}
