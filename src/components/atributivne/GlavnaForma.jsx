import { ocistiRedZaInsert, dISO, dPrikaz, lokacijaDela, vreme, mozeAdminLokalno as mozeAdmin } from "../../lib/atributivneUnosHelper.js";
import { UnosCiljBanner, UnosAqlPanel } from "./UnosAqlBlok.jsx";
import SpcKarteAtributivne from "./spc/SpcKarteAtributivne.jsx";

import CrtezDela from "./CrtezDela.jsx";
import MobilniUnos from "./mobilni/MobilniUnos.jsx";
import MobilneKarte from "./mobilni/MobilneKarte.jsx";
import MobilniDashboard from "./mobilni/MobilniDashboard.jsx";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  mirrorKontrolniLogToExcel,
  exportKontrolniLogExcel,
  exportMasterWorkbook,
  importWorkbookToSupabase,
  previewImport,
  readWorkbookFromFile,
  downloadWorkbook,
  EXCEL_BUCKET,
  KONTROLNI_LOG_FILE,
  IMPORT_SHEETS,
} from "../../lib/excelSync.js";
import {
  INSPECTION_LEVELS, INSPECTION_TYPES, DEFECT_KLASE, planUzorka, planZaKlasu, aqlOdluka, kombinovanaOdluka,
  DEFAULT_AQL_LOT_SIZE, ucitajAqlLotVelicina, snimiAqlLotVelicina,
  ucitajAqlPodesavanja, snimiAqlPodesavanja, lotVelicinaZaAql,
} from "../../lib/aqlIso2859.js";
import {
  pendingFromLista, mergeSmenaStat, fetchSmenaStat,
} from "../../lib/spcStats.js";
import { LAB_FPY_PCT, LAB_FPY_KRATKO } from "../../lib/rtyFpy.js";
import { jeKontrolaCelogVozila } from "../../lib/spcPredlogKarti.js";
import UnosPokaYokeKorak from "../UnosPokaYokeKorak.jsx";
import AtrCrtezPregled from "../AtrCrtezPregled.jsx";
import InzenjerExcelPanel from "../../InzenjerExcelPanel.jsx";
import SifrarnikModul from "../sifrarnik/SifrarnikModul.jsx";
import DefinicijaUputstvo from "../DefinicijaUputstvo.jsx";
import { KontrolnaLista, ZahtevPrekid, ucitajOdobrenPrekid } from "../../lib/kontrolaSesije.jsx";
import {
  setListaOkSession,
  clearListaOkSession,
  getListaOkSession,
  procitajSmenuIzStorage,
  proveriKontrolnaListaDanas,
} from "../../lib/kontrolaLista.js";
import SkartDoradaOeePanel, { OeeKpiTab } from "../SkartDoradaOeePanel.jsx";
import KpiDoradaHub from "../KpiDoradaHub.jsx";
import { podrazumevaniKpiIzListeP } from "../../lib/oeeKpi.js";
import { porukaKpiGreske, fetchKpiUnos, agregirajKpiUnos, dodajKpiBlokPdf, pronadjiAgregiraniKpiAtributivne, snimiIliAzurirajKpiUnos, kpiVrednostiIzDb, saberiKpiVrednosti } from "../../lib/kpiUnos.js";
import { generisiPredajaSmenePdf } from "../../lib/predajaSmenePdf.js";
import { useOfflineQueue } from "../../lib/offlineQueue.js";
import { ensureSesija, novaSesija, clearSveSesije, getAktivnaSesija } from "../../lib/spcSesija.js";
import SchemaStatusPanel from "../SchemaStatusPanel.jsx";
import StatusServera from "../StatusServera.jsx";
import ShopFloorStatusBar from "../ShopFloorStatusBar.jsx";
import ErpMonitoringStrip from "../ErpMonitoringStrip.jsx";
import ZajednickiDashboard from "../ZajednickiDashboard.jsx";
import InteligencijaDeoPanel from "../InteligencijaDeoPanel.jsx";
import { procitajNavigaciju8d, predloziDodeljenogInzenjera, prefill8dIzEskalacije, normalizujPrefill8d } from "../../lib/eskalacijeHelper.js";
import { procitajSpoljnuNavigacijuTab, peekPendingWorkflowTab } from "../../lib/workflowAkcije.js";
import { exportOsmdIzvestajPdf, osmdPayloadIzForme, statusNaziv8d, stampajOsmdIzvestaj } from "../../lib/osmdIzvestajPdf.js";
import OsmdEditor from "../OsmdEditor.jsx";
import PfmeaCpModul from "../PfmeaCpModul.jsx";
import MerilaMsaHub from "../MerilaMsaHub.jsx";
import KontrolniPlanPanel from "../KontrolniPlanPanel.jsx";
import SmenaPogonaPanel from "../SmenaPogonaPanel.jsx";
import LogPregledFilter from "../LogPregledFilter.jsx";
import {
  filtrirajLogRedove,
  offlineKontrolniRedovi,
  spojiOfflineINadRedove,
  brojOfflineStavki,
} from "../../lib/logPregledHelper.js";
import AQLTabela from "../kvalitet/AQLTabela.jsx";
import EskalacijePanel from "../kvalitet/EskalacijePanel.jsx";
import NcrCapaPanel from "../kvalitet/NcrCapaPanel.jsx";
import OsmDIzvestaj from "../kvalitet/OsmDIzvestaj.jsx";
import { fetchPlaniranoKomZaDeo } from "../../lib/zajednickiDashboard.js";
import { parsiBarkod, primeniParsiraniBarkod, useBarcodeScanner, idBarkodInputHandleri } from "../../lib/barkod.js";
import {
  ucitajAktivniRadniNalog,
  ucitajNalogZaDeoIRn,
  izaberiRadniNalog,
  proveriRadniNalogUpozorenje,
  formatNalogToast,
} from "../../lib/radniNalog.js";
import { proveriAktivanKarantin } from "../../lib/karantinProvera.js";
import IdDeoBarkodRed from "../IdDeoBarkodRed.jsx";
import KarantinBlokada from "../KarantinBlokada.jsx";
import SmenaIdUnosRed from "../SmenaIdUnosRed.jsx";
import SmenaAutoPrikaz from "../SmenaAutoPrikaz.jsx";
import PogonIzborPanel from "../PogonIzborPanel.jsx";
import { useAutoSmena } from "../../hooks/useAutoSmena.js";
import { smenaPoSatu } from "../../lib/smena.js";
import {
  pogoniZaDeoAtributivne,
  pogonIzRn,
  deoInfoZaPogon,
  deloviRedoviZaId,
  labelPogona,
  jePogonOmogucen,
} from "../../lib/pogonSop.js";
import { kreirajAlarmNokAtributivne } from "../../lib/spcAlarmWorkflow.js";
import { posleSnimanjaAtributivne } from "../../lib/autoAkcije.js";
import { procitajPoslednjiDeo, sacuvajPoslednjiDeo } from "../../lib/poslednjiDeoLinija.js";
import { predloziDelovaZaTablet, sacuvajTabletPogon } from "../../lib/linijaDeoMapa.js";
import NotifikacijePodesavanja from "../NotifikacijePodesavanja.jsx";
import MeriloBarkodUputstvo from "../MeriloBarkodUputstvo.jsx";
import AdminKalibracijaPanel from "../AdminKalibracijaPanel.jsx";
import AdminPrekidiPanel from "../AdminPrekidiPanel.jsx";
import AdminSpcAlarmiPanel from "../AdminSpcAlarmiPanel.jsx";
import SpcAlarmBlokada from "../SpcAlarmBlokada.jsx";
import { useSpcAlarmGate } from "../../hooks/useSpcAlarmGate.js";
import SpcBaselinePanel from "../SpcBaselinePanel.jsx";
import RadniNaloziPanel from "../RadniNaloziPanel.jsx";
import OfflineSyncPanel from "../OfflineSyncPanel.jsx";
import TrasabilitetPanel from "../TrasabilitetPanel.jsx";
import useAdminZahtevNotifikacije from "../../hooks/useAdminZahtevNotifikacije.js";
import useAnalitikaBadges from "../../hooks/useAnalitikaBadges.js";
import {
  mozeTabAtributivne, opisUloge, podrazumevaniRezim, mozePrebacivanjeRezima,
  mozePrebacivanjeRezimaUTacci,
  mozeAnalitika, jeLinijaUloga, efektivniRezimRada, jeAdmin, jeKvalitetIliVise,
  jeKontrolorLinija, pocetniKorakUnosAtr, mozeInzenjerExcel, mozeInzenjerExcelUvoz,
  mozeSifrarnik, podrazumevaniTabAtributivne, mozeOdobrenjaQA, mozeNcrCapa,
} from "../../lib/uloge.js";
import AnalitikaHeader from "../analitika/AnalitikaHeader.jsx";
import AnalitikaPregledPanel from "../analitika/AnalitikaPregledPanel.jsx";
import SpcDashboardAtributivne from "../spc/SpcDashboardAtributivne.jsx";
import OdobrenjaQAPanel from "../analitika/OdobrenjaQAPanel.jsx";
import { AnalitikaFilterProvider, useAnalitikaFilter } from "../../lib/AnalitikaFilterContext.jsx";
import { spcFilterIzAnalitike } from "../../lib/analitikaFilterUtils.js";
import { ucitajAnalitikaTab, snimiAnalitikaTab } from "../../lib/analitikaSesija.js";
import {
  ANALITIKA_GRUPE_ATRIB,
  buildAnalitikaTaboviAtr,
  grupeSaDozvoljenimTabovima,
} from "../../lib/analitikaNav.js";
import { useEkran } from "../../lib/useEkran.js";
import { stilOmotLinija, onFocusTastatura } from "../../layout/tastaturaMobil.js";
import { dp } from "../../layout/dp.js";
import { TELEFON } from "../../layout/tokens/telefon.js";
import { TABLET } from "../../layout/tokens/tablet.js";
import LinijaDonjaTraka, { DugmeTraka } from "../LinijaDonjaTraka.jsx";
import LinijaWizardNav, { KORACI_ATRIB_LINIJA, KORACI_ATRIB_KONTROLOR } from "../LinijaWizardNav.jsx";
import VoziloZonaNav from "../VoziloZonaNav.jsx";
import { useVoziloDijagramSrc } from "../../lib/useVoziloDijagramSrc.js";
import {
  buildGreskeKatalog,
  filtrirajGreskeZaUnos,
  filtrirajKatalogVozilaZaUnos,
} from "../../lib/katalogFilter.js";
import { porukaDbGreske } from "../../lib/dbGreske.js";
import { supabase } from "../../lib/supabaseClient.js";
import { modulDozvoljen } from "../../lib/licenca.js";
import AppHeader from "../AppHeader.jsx";
import BrendingNaslov from "../BrendingNaslov.jsx";
import OProgramuPanel from "../OProgramuPanel.jsx";
import { Toast, Modal, AlarmBanner } from "../ui/SpcUi.jsx";
import AdminPanel from "../admin/AdminPanel.jsx";
import {
  FotoArhiva,
  KalibracijaMerila,
  CiljeviKvaliteta,
  IzvestajKupac,
  OCKriva,
  StabilnostProcesa,
  useOfflineCache,
  generisiIzvestajSmene,
} from "./AtrAnalitikaDodaci.jsx";



// ─── DASHBOARD ────────────────────────────────────────────────

function Dashboard({ C, addToast, onNavigacija, sviDelovi, korisnik, onOtvori8D }) {
  return (
    <SpcDashboardAtributivne
      C={C}
      addToast={addToast}
      onNavigacija={onNavigacija}
      sviDelovi={sviDelovi}
      korisnik={korisnik}
      onOtvori8D={onOtvori8D}
    />
  );
}



function GlavnaFormaInner({ korisnik, onOdjava, onNazad, C, setC, rezimRada = "analitika", onPromeniRezim, nav8dTick = 0, licenca = null, listaPotvrdena = false }) {
  const ekran = useEkran();
  const jeLinija = rezimRada === "linija";
  const koristiMobLinija = jeLinija && ekran.linijaUredjaj;
  const koristiMobAnalitika = !jeLinija && (ekran.mob || ekran.tablet);
  const koristiMobUnos = koristiMobLinija || koristiMobAnalitika;
  const kontrolorLinija = jeKontrolorLinija(korisnik?.uloga, rezimRada);
  const LEva_W = "220px";
  const H = 1.5;
  const [sviDelovi,setSviDelovi] = useState([]);
  const [linije,setLinije]       = useState([]);
  const [masine,setMasine]       = useState([]);
  const [greskeKatalogRows, setGreskeKatalogRows] = useState([]);
  const [voziloKatalogRows,setVoziloKatalogRows] = useState([]);
  const [loadInit,setLoadInit]   = useState(true);
  const [idDeo,setIdDeo]         = useState("");
  const [deoInfo,setDeoInfo]     = useState(null);
  const [upoz,setUpoz]           = useState("");
  const [status,setStatus]       = useState("");
  const [kategorija,setKategorija] = useState("");
  const [podkat,setPodkat]         = useState("");
  const [defekt,setDefekt]         = useState("");
  const [voziloZona,setVoziloZona] = useState(null);
  const [kolicina,setKolicina]     = useState(1);
  const smena = useAutoSmena(false);
  const [listaG,setListaG]         = useState([]);
  const [listaP,setListaP]         = useState([]);
  const [dbSmena,setDbSmena]       = useState({ ok: 0, nok: 0, merenja: 0 });
  const [nalogInfo,setNalogInfo]   = useState(null);
  const [prekidOdobrenId,setPrekidOdobrenId] = useState(null);
  const [preostalo,setPreostalo]   = useState(0);
  const [cilj,setCilj]             = useState(0);
  const [modal,setModal]           = useState(null);
  const [alarm,setAlarm]           = useState(null);
  const [tab,setTab]               = useState(() => {
    if (rezimRada !== "linija") {
      const pending = peekPendingWorkflowTab("atributivne");
      if (pending && mozeTabAtributivne(pending, korisnik?.uloga, rezimRada)) return pending;
      const saved = ucitajAnalitikaTab("atributivne");
      if (saved && mozeTabAtributivne(saved, korisnik?.uloga, rezimRada)) return saved;
    }
    return podrazumevaniTabAtributivne(korisnik?.uloga, rezimRada);
  });
  const [spcTipNav, setSpcTipNav] = useState(null);
  const analitikaFilter = useAnalitikaFilter();
  const filterDeo = !jeLinija ? (analitikaFilter?.idDeo || "") : "";
  const [osmdPrefill,setOsmdPrefill] = useState(null);
  const [ncrPrefill, setNcrPrefill] = useState(null);
  const [pfmeaCpPrefillIz8d, setPfmeaCpPrefillIz8d] = useState(null);
  const primeniNavigaciju8d = () => {
    const { tab: tab8d, prefill } = procitajNavigaciju8d("atributivne");
    if (tab8d && mozeTabAtributivne(tab8d, korisnik.uloga, rezimRada)) setTab(tab8d);
    if (prefill) setOsmdPrefill(prefill);
  };
  const primeniSpoljnuNavigaciju = () => {
    const { tab: wfTab, prefillNcr } = procitajSpoljnuNavigacijuTab("atributivne");
    if (wfTab && mozeTabAtributivne(wfTab, korisnik.uloga, rezimRada)) {
      setTab(wfTab);
      snimiAnalitikaTab("atributivne", wfTab);
      if (wfTab === "ncr" && prefillNcr) setNcrPrefill(prefillNcr);
    }
  };
  useEffect(() => { primeniNavigaciju8d(); primeniSpoljnuNavigaciju(); }, [nav8dTick]); // eslint-disable-line
  const [saving,setSaving]         = useState(false);
  const [logD,setLogD]             = useState([]);
  const [loadLog,setLoadLog]       = useState(false);
  const [logFilterDatum,setLogFilterDatum] = useState(dISO);
  const [logFilterSmena,setLogFilterSmena] = useState("1");
  const [toasts,setToasts]         = useState([]);
  const [foto,setFoto]             = useState(null);
  const [pokaziZahtev,setPokaziZahtev] = useState(false);
  const [unosKorakAtr, setUnosKorakAtr] = useState("poka");
  const [kontrolnaListaOk, setKontrolnaListaOk] = useState(() => {
    if (!jeLinija || listaPotvrdena) return true;
    const sm = procitajSmenuIzStorage();
    return getListaOkSession("atributivne", sm);
  });
  /** Ček lista obavezna na unosu (linija), admin preskače. */
  const listaSpremna = kontrolnaListaOk || listaPotvrdena || mozeAdmin(korisnik?.uloga);
  const prethodniIdAtr = useRef("");
  const prethodnaSmenaAtr = useRef(smena);
  const barkodRnRef = useRef("");
  const [komentar,setKomentar]     = useState("");
  const [radniNalog,setRadniNalog] = useState("");
  const [karantinInfo, setKarantinInfo] = useState(null);
  const [pogonKod, setPogonKod] = useState("");
  const [porukaPogon, setPorukaPogon] = useState("");
  const [naloziZaPogon, setNaloziZaPogon] = useState([]);
  const [atributivniPogoni, setAtributivniPogoni] = useState([]);
  const [kpiSerija, setKpiSerija] = useState(() => podrazumevaniKpiIzListeP([]));
  const [kpiDb, setKpiDb] = useState(null);
  const [kpiHubOtvoren, setKpiHubOtvoren] = useState(false);
  const fotoRef = useRef(null);
  const idRef   = useRef(null);

  const addToast = useCallback((tekst,tip="info")=>{
    const id=Date.now(); setToasts(p=>[...p,{tekst,tip,id}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4500);
  },[]);

  const onFlushed = useCallback((res) => {
    if (res.syncedJobs > 0) {
      addToast(`✓ Sinhronizovano ${res.syncedJobs} offline paketa (${res.syncedRows} stavki)`, "uspeh");
    }
  }, [addToast]);

  const {
    online, queue, counts: offlineCounts, flushQueue,
    addAtributivneBatch,
  } = useOfflineQueue(supabase, {
    mirrorKontrolniLog: mirrorKontrolniLogToExcel,
    onFlushed,
  });

  const dostupniPogoni = useMemo(
    () => (idDeo.length >= 3 ? pogoniZaDeoAtributivne(atributivniPogoni, idDeo) : []),
    [atributivniPogoni, idDeo],
  );
  const omoguceniPogoni = useMemo(() => {
    if (idDeo.length < 3) return new Set();
    return new Set(
      dostupniPogoni.filter((p) => jePogonOmogucen({
        naloziRows: naloziZaPogon,
        deloviRows: sviDelovi,
        atributivniPogonRows: atributivniPogoni,
        idDeo,
        pogonKod: p,
        modul: "atributivne",
      })),
    );
  }, [dostupniPogoni, naloziZaPogon, sviDelovi, atributivniPogoni, idDeo]);
  const trebaIzborPogona = !!(idDeo && omoguceniPogoni.size > 1 && !pogonKod);
  const deoSpreman = !!(deoInfo && !trebaIzborPogona);

  const predloziDelovaTablet = useMemo(
    () => predloziDelovaZaTablet({
      atributivniPogoni,
      pogonKod: pogonKod || deoInfo?.pogon_kod,
    }),
    [atributivniPogoni, pogonKod, deoInfo?.pogon_kod],
  );

  useEffect(() => {
    if (!jeLinija || loadInit || idDeo) return;
    const saved = procitajPoslednjiDeo("atributivne", smena);
    if (saved) setIdDeo(saved);
  }, [jeLinija, loadInit, smena, idDeo]);

  useEffect(() => {
    if (!jeLinija || !deoSpreman || !idDeo) return;
    sacuvajPoslednjiDeo("atributivne", idDeo, smena);
  }, [jeLinija, deoSpreman, idDeo, smena]);

  const { alarm: spcAlarm, blokira: spcBlokira, osvezi: osveziSpcAlarm, ocistiAlarm: ocistiSpcAlarm } = useSpcAlarmGate(supabase, {
    idDeo,
    enabled: jeLinija && deoSpreman,
  });

  const voziloMode = jeKontrolaCelogVozila(deoInfo);
  const { url: voziloDijagramSrc, loading: voziloDijagramUcitava } = useVoziloDijagramSrc(deoInfo);
  const voziloFormaEkran = voziloMode && deoInfo && unosKorakAtr === "forma";
  const prikaziLokaciju = !voziloMode;
  /** Celo vozilo = pogon F (Završna), ne A (Ulazna). */
  const tekstKontrole = voziloMode
    ? "Završna kontrola"
    : (deoInfo?.karakteristika || "-");
  const tekstNapomene = voziloMode
    ? "F — Završna kontrola"
    : (deoInfo?.napomena || "-");

  useEffect(() => {
    if (voziloMode && pogonKod !== "F") {
      setPogonKod("F");
      sacuvajTabletPogon("F");
    }
  }, [voziloMode, pogonKod]);

  const pendingStat = useMemo(() => pendingFromLista(listaP), [listaP]);
  const smenaKpi = useMemo(() => {
    if (kpiDb && kpiSerija?.ukupno_kom) return saberiKpiVrednosti(kpiDb, kpiSerija);
    if (kpiSerija?.ukupno_kom) return kpiSerija;
    return kpiDb;
  }, [kpiDb, kpiSerija]);

  const smenaStat = useMemo(
    () => mergeSmenaStat(dbSmena, pendingStat, smenaKpi),
    [dbSmena, pendingStat, smenaKpi],
  );
  const smenaOK = smenaStat.ok;
  const smenaNOK = smenaStat.nok;
  const smenaTotal = smenaStat.merenja;
  const [lotAql, setLotAql] = useState(() => ucitajAqlLotVelicina());
  const [lotAqlIzvor, setLotAqlIzvor] = useState("rucno");
  const promeniLotAql = useCallback((n) => {
    const v = snimiAqlLotVelicina(n);
    setLotAql(v);
    setLotAqlIzvor("rucno");
    return v;
  }, []);

  useEffect(() => {
    if (idDeo.length < 3) return;
    let alive = true;

    (async () => {
      let nalog = nalogInfo;
      const rn = String(radniNalog || "").trim().toUpperCase();
      if (rn && (!nalog || nalog.broj_naloga !== rn)) {
        nalog = await ucitajNalogZaDeoIRn(supabase, idDeo, rn);
      }
      if (!alive) return;
      const { velicina, izvor } = lotVelicinaZaAql({
        nalog,
        deo: deoInfo,
        planiranoKom: kpiSerija?.planirano_kom,
      });
      setLotAql(velicina);
      setLotAqlIzvor(izvor);
    })();

    return () => { alive = false; };
  }, [idDeo, radniNalog, nalogInfo, deoInfo, kpiSerija?.planirano_kom]);

  useEffect(() => {
    if (!listaP.length) return;
    const base = podrazumevaniKpiIzListeP(listaP);
    setKpiSerija(prev => ({
      ...base,
      dorada: prev?.dorada ?? base.dorada,
      skart: prev?.skart ?? base.skart,
      ok_nakon_dorade: prev?.ok_nakon_dorade ?? base.ok_nakon_dorade,
      planirano_min: prev?.planirano_min ?? base.planirano_min,
      zastoj_min: prev?.zastoj_min ?? base.zastoj_min,
    }));
  }, [listaP]);
  const { linija: linijaNaziv, masina: masinaNaziv } = lokacijaDela(deoInfo, linije, masine);
  const koristiDefekte = voziloMode;

  const onVoziloZonaChange = useCallback((zonaId) => {
    setVoziloZona(zonaId);
    setKategorija("");
    setPodkat("");
    setDefekt("");
  }, []);

  const efektivniPogonGreske = trebaIzborPogona ? "" : (pogonKod || deoInfo?.pogon_kod || "");
  const greskeZaDeo = useMemo(
    () => buildGreskeKatalog(filtrirajGreskeZaUnos(greskeKatalogRows, deoInfo, efektivniPogonGreske)),
    [greskeKatalogRows, deoInfo, efektivniPogonGreske],
  );

  const voziloKatPoZoni = useMemo(() => {
    if (!voziloMode || !voziloZona) return { gr: {}, df: {} };
    const rows = filtrirajKatalogVozilaZaUnos(voziloKatalogRows, deoInfo, voziloZona);
    return buildGreskeKatalog(rows);
  }, [voziloMode, voziloZona, voziloKatalogRows, deoInfo]);

  const greskeZaUnos = voziloMode ? voziloKatPoZoni.gr : greskeZaDeo.gr;
  const defektiZaUnos = voziloMode ? voziloKatPoZoni.df : greskeZaDeo.df;

  useEffect(() => {
    if (!koristiDefekte) setDefekt("");
  }, [deoInfo?.id_deo, koristiDefekte]);

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

  const prethodniPrekid = useRef(null);
  useEffect(() => {
    if (prekidOdobrenId && !prethodniPrekid.current) {
      addToast("✓ Admin je odobrio prekid serije — možete zapisati u bazu", "uspeh");
    }
    prethodniPrekid.current = prekidOdobrenId;
  }, [prekidOdobrenId, addToast]);

  useEffect(() => {
    if (!korisnik?.radnikId) return;
    const ch = supabase.channel("prekidi_kontrolor")
      .on("postgres_changes", { event: "*", schema: "public", table: "prekidi_zahtevi" },
        () => proveriPrekid())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [korisnik?.radnikId, proveriPrekid]);

  /** Ako realtime ne stigne, povremeno proveri odobrenje dok serija nije završena. */
  useEffect(() => {
    if (!idDeo || idDeo.length < 3 || preostalo <= 0 || prekidOdobrenId) return;
    const t = setInterval(() => proveriPrekid(), 4000);
    return () => clearInterval(t);
  }, [idDeo, preostalo, prekidOdobrenId, proveriPrekid]);

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

  // Init
  useEffect(() => {
    let cancelled = false;
    let focusTimer = null;
    let ch = null;

    (async () => {
      try {
        const [{ data: d }, { data: ap }, { data: lin }, { data: mas }, { data: g }, { data: gv }, { data: rn }] = await Promise.all([
          supabase.from("delovi")
            .select("id_deo,naziv_dela,kom_za_kontrolu,karakteristika,slika_naziv,napomena,linija_id,masina_id,tip_kontrole,vozilo_katalog_id,greska_katalog_id,aktivan,linija:linije(linija,id),masina:masine(naziv,id)")
            .eq("aktivan", true),
          supabase.from("delovi_atributivni_pogon").select("*").eq("aktivan", true),
          supabase.from("linije").select("id,linija"),
          supabase.from("masine").select("id,naziv"),
          supabase.from("greske_katalog").select("kategorija,podkategorija,defekt,id_deo,katalog_id,pogon_kod").order("kategorija"),
          supabase.from("katalog_gresaka_vozilo").select("vozilo_id,kategorija,podkategorija,defekt").order("kategorija"),
          supabase.from("radni_nalozi").select("id_deo,pogon_kod,broj_naloga,status").eq("status", "aktivan"),
        ]);
        if (cancelled) return;
        setSviDelovi(d || []);
        setAtributivniPogoni(ap || []);
        setLinije(lin || []);
        setMasine(mas || []);
        setGreskeKatalogRows(g || []);
        setVoziloKatalogRows(gv || []);
        setNaloziZaPogon(rn || []);
      } catch (e) {
        if (!cancelled) addToast(e.message, "greska");
      } finally {
        if (!cancelled) {
          setLoadInit(false);
          focusTimer = setTimeout(() => idRef.current?.focus(), 100);
        }
      }
    })();

    ch = supabase.channel("spc_rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "kontrolni_log" }, (payload) => {
        const r = payload.new;
        if (r.status === "NOK") addToast(`🔴 NOK: ${r.id_deo} — ${r.greska_naziv} ×${r.nok_kolicina}`, "greska");
      }).subscribe();

    return () => {
      cancelled = true;
      if (focusTimer) clearTimeout(focusTimer);
      if (ch) supabase.removeChannel(ch);
    };
  }, []);

  const osveziSmenaStat = useCallback(async () => {
    try {
      const stat = await fetchSmenaStat(supabase, { datum: dISO(), smena });
      setDbSmena(stat);
    } catch { /* offline */ }
  }, [smena]);

  const osveziKpiDb = useCallback(async () => {
    if (!idDeo || idDeo.length < 3) {
      setKpiDb(null);
      return;
    }
    try {
      const row = await pronadjiAgregiraniKpiAtributivne(supabase, {
        idDeo,
        datum: dISO(),
        smena,
        radniNalog: radniNalog || undefined,
      });
      setKpiDb(row ? kpiVrednostiIzDb(row) : null);
    } catch {
      setKpiDb(null);
    }
  }, [idDeo, smena, radniNalog]);

  useEffect(() => { osveziSmenaStat(); }, [osveziSmenaStat]);
  useEffect(() => { osveziKpiDb(); }, [osveziKpiDb]);

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

  useEffect(() => {
    const ch = supabase.channel("spc_smena_rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "kontrolni_log" },
        () => osveziSmenaStat())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [osveziSmenaStat]);

  useEffect(() => {
    if (idDeo.length < 3) return;
    ensureSesija({ modul: "atributivne", idDeo, smena, radniNalog });
  }, [idDeo, smena, radniNalog]);

  useEffect(() => {
    if (idDeo.length < 3) return;
    fetchPlaniranoKomZaDeo(supabase, idDeo).then(plan => {
      if (plan > 0) setKpiSerija(p => ({ ...p, planirano_kom: plan }));
    });
  }, [idDeo, nalogInfo?.broj_naloga]);

  useEffect(() => {
    const sm = Number(smena);
    if (!jeLinija) {
      setKontrolnaListaOk(true);
      return;
    }
    if (mozeAdmin(korisnik?.uloga)) {
      setKontrolnaListaOk(true);
      return;
    }
    if (listaPotvrdena || getListaOkSession("atributivne", sm)) {
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
          setListaOkSession("atributivne", sm);
          return;
        }
      }
      if (!ok) return;
      setKontrolnaListaOk(getListaOkSession("atributivne", sm));
    })();
    return () => { ok = false; };
  }, [smena, jeLinija, listaPotvrdena, korisnik?.radnikId, korisnik?.uloga]);

  const zavrsiKontrolnuListu = useCallback(() => {
    setKontrolnaListaOk(true);
    setListaOkSession("atributivne", smena);
  }, [smena]);

  useEffect(() => {
    if (!jeLinija || !listaPotvrdena || loadInit || tab !== "unos") return;
    const t = setTimeout(() => idRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [listaPotvrdena, loadInit, jeLinija, tab]);

  const obradiBarkodSken = useCallback((raw) => {
    const parsed = parsiBarkod(raw);
    const res = primeniParsiraniBarkod(parsed, {
      postaviId: (id) => {
        barkodRnRef.current = parsed?.radni_nalog
          ? String(parsed.radni_nalog).trim().toUpperCase()
          : "";
        setIdDeo(id);
        setTimeout(() => idRef.current?.blur(), 50);
      },
    });
    if (!res) return;
    addToast(
      `📷 Skenirano: ${res.id}${res.radni_nalog ? ` · ${res.radni_nalog}` : ""}`,
      "uspeh",
    );
    window._vibrirajOK?.();
  }, [addToast]);

  useBarcodeScanner(useCallback((raw) => {
    obradiBarkodSken(raw);
  }, [obradiBarkodSken]), { enabled: tab === "unos", ignoreInputs: true });

  const idBarkodPolje = useMemo(
    () => idBarkodInputHandleri(obradiBarkodSken, { postaviId: setIdDeo, upperCase: true }),
    [obradiBarkodSken],
  );

  const ucitajRnZaDeo = useCallback(async (id, pogon, eksplicitniRn, { toast = false, noviDeo = false } = {}) => {
    const idU = String(id || "").trim().toUpperCase();
    if (!idU) return null;
    const p = String(pogon || "").trim().toUpperCase() || null;
    const rnEks = String(eksplicitniRn || "").trim().toUpperCase();
    let nalog = null;
    if (rnEks) {
      nalog = await ucitajNalogZaDeoIRn(supabase, idU, rnEks);
    }
    if (!nalog && p) {
      nalog = await ucitajAktivniRadniNalog(supabase, idU, p);
    }
    if (!nalog) {
      nalog = await ucitajAktivniRadniNalog(supabase, idU);
    }
    setNalogInfo(nalog || null);
    const deo = p ? deoInfoZaPogon(sviDelovi, atributivniPogoni, idU, p) : null;
    const rn = izaberiRadniNalog({ eksplicitni: rnEks, izBaze: nalog, izSop: deo?.radni_nalog });
    if (rn) setRadniNalog(rn);
    if (toast && noviDeo && !rnEks && rn) {
      const tekst = nalog ? formatNalogToast(nalog) : `RN ${rn}`;
      addToast(`📋 ${tekst}${p ? ` · ${labelPogona(p)}` : ""}`, "info");
    }
    return nalog;
  }, [addToast, sviDelovi, atributivniPogoni]);

  const onPogonChangeAtr = useCallback(async (pogon) => {
    const p = String(pogon || "").trim().toUpperCase();
    if (!p) return;
    setPogonKod(p);
    sacuvajTabletPogon(p);
    setPorukaPogon("");
    setKategorija("");
    setPodkat("");
    setDefekt("");
    if (idDeo.length < 3) return;
    const deo = deoInfoZaPogon(sviDelovi, atributivniPogoni, idDeo, p);
    if (deo) {
      setDeoInfo(deo);
      setCilj(deo.kom_za_kontrolu || 30);
      setPreostalo(deo.kom_za_kontrolu || 30);
    }
    await ucitajRnZaDeo(idDeo, p, "", { toast: true });
  }, [idDeo, sviDelovi, atributivniPogoni, ucitajRnZaDeo]);

  useEffect(() => {
    if (!deoInfo) return;
    if (smena !== prethodnaSmenaAtr.current) {
      setUnosKorakAtr(pocetniKorakUnosAtr(korisnik?.uloga, rezimRada, { voziloMode }));
      prethodnaSmenaAtr.current = smena;
    }
  }, [smena, deoInfo, korisnik?.uloga, rezimRada, voziloMode]);

  // ID deo lookup + barkod auto-popunjavanje + pogon A–H
  useEffect(()=>{
    if(idDeo.length<3){
      setDeoInfo(null);setUpoz("");setPogonKod("");setPorukaPogon("");
      prethodniIdAtr.current="";return;
    }
    const idNorm = idDeo.toUpperCase();
    const redovi = deloviRedoviZaId(sviDelovi, idNorm);
    const imaPogone = pogoniZaDeoAtributivne(atributivniPogoni, idNorm).length > 0;
    if (redovi.length || imaPogone) {
      const noviDeo = idNorm !== prethodniIdAtr.current.toUpperCase();
      const eksplicitniRn = barkodRnRef.current;
      barkodRnRef.current = "";
      const dostupni = pogoniZaDeoAtributivne(atributivniPogoni, idNorm);
      const omoguceni = dostupni.filter((p) => jePogonOmogucen({
        naloziRows: naloziZaPogon,
        deloviRows: sviDelovi,
        atributivniPogonRows: atributivniPogoni,
        idDeo: idNorm,
        pogonKod: p,
        modul: "atributivne",
      }));
      let pogon = pogonIzRn(eksplicitniRn);
      if (!pogon && omoguceni.length === 1) pogon = omoguceni[0];
      if (!pogon && !noviDeo && pogonKod && omoguceni.includes(pogonKod)) pogon = pogonKod;

      if (noviDeo) {
        const privremeni = deoInfoZaPogon(sviDelovi, atributivniPogoni, idNorm, pogon) || redovi[0];
        const voziloDeo = jeKontrolaCelogVozila(privremeni);
        setUnosKorakAtr(pocetniKorakUnosAtr(korisnik?.uloga, rezimRada, { voziloMode: voziloDeo }));
        setVoziloZona(null);
        prethodniIdAtr.current = idDeo;
        // Celo vozilo → uvek završna (F), nikad ulazna (A)
        setPogonKod(voziloDeo ? "F" : "");
        setRadniNalog("");
        if (voziloDeo) pogon = "F";
      }

      if (omoguceni.length > 1 && !pogon) {
        const priv = redovi[0] || deoInfoZaPogon(sviDelovi, atributivniPogoni, idNorm, dostupni[0]);
        if (priv) {
          setDeoInfo(priv);
          setCilj(priv.kom_za_kontrolu || 30);
          setPreostalo(priv.kom_za_kontrolu || 30);
        }
        setPogonKod("");
        setPorukaPogon(`ID ${idNorm}: izaberite pogon za vizuelnu kontrolu (tab delovi u Excelu).`);
      } else if (dostupni.length > 0 && omoguceni.length === 0) {
        const priv = redovi[0] || deoInfoZaPogon(sviDelovi, atributivniPogoni, idNorm, dostupni[0]);
        if (priv) setDeoInfo(priv);
        setPogonKod("");
        setPorukaPogon(`ID ${idNorm}: nema RN za izabrane pogone — proveri kolone radni nalog / NALOZI.`);
      } else {
        const n = deoInfoZaPogon(sviDelovi, atributivniPogoni, idNorm, pogon) || redovi[0];
        setDeoInfo(n);
        setCilj(n.kom_za_kontrolu || 30);
        setPreostalo(n.kom_za_kontrolu || 30);
        if (pogon) setPogonKod(pogon);
        setPorukaPogon("");
        ucitajRnZaDeo(idNorm, pogon, eksplicitniRn, { toast: true, noviDeo });
      }

      supabase.from("kontrolni_log")
        .select("greska_naziv").eq("id_deo",idDeo.toUpperCase()).eq("status","NOK")
        .order("created_at",{ascending:false}).limit(100)
        .then(({ data: greske }) => {
          if(greske?.length){
            const b={};greske.forEach(r=>{b[r.greska_naziv]=(b[r.greska_naziv]||0)+1;});
            const mx=Object.entries(b).sort((a,bb)=>bb[1]-a[1])[0];
            if(mx&&mx[1]>=2) setUpoz(`⚠ ČESTO: ${mx[0]} (${mx[1]}x)`); else setUpoz("");
          } else setUpoz("");
        });
    }else if (prethodniIdAtr.current.toUpperCase() !== idNorm) {
      setDeoInfo(null);setUpoz("");setPogonKod("");setPorukaPogon("");
      prethodniIdAtr.current="";
    }
  },[idDeo,sviDelovi,atributivniPogoni,naloziZaPogon,korisnik?.uloga,rezimRada,ucitajRnZaDeo,pogonKod]); // eslint-disable-line

  const dodajGresku=()=>{
    if(!deoInfo){setModal({poruka:"ID dela nije pronađen!",tip:"greska"});return;}
    if(!status) {setModal({poruka:"Izaberi STATUS!",tip:"greska"});return;}
    if(status==="NOK"&&voziloMode&&!voziloZona){setModal({poruka:"Izaberi zonu vozila na dijagramu!",tip:"greska"});return;}
    if(status==="NOK"&&(!kategorija||!podkat)){setModal({poruka:"Popuni NOK detalje!",tip:"greska"});return;}
    if(status==="NOK"&&koristiDefekte&&!defekt){setModal({poruka:"Izaberi DEFEKT (kontrola vozila)!",tip:"greska"});return;}
    const defektUnos = status==="OK" ? "-" : (koristiDefekte ? defekt : podkat);
    const stavka = {
      kat: status==="OK" ? "OK" : kategorija,
      pod: status==="OK" ? "-" : podkat,
      defekt: defektUnos,
      status,
      kolicina,
      foto: status==="NOK" ? foto : null,
      komentar: komentar || "",
    };
    const resetUnos = () => {
      setStatus(""); setKategorija(""); setPodkat(""); setDefekt("");
      setKolicina(1); setFoto(null); setKomentar("");
    };
    if (status === "OK") {
      if (preostalo <= 0) {
        setModal({ poruka: "Serija je već gotova!", tip: "greska" });
        return;
      }
      const snimljena = {
        ...stavka,
        idDeo: idDeo.toUpperCase(),
        datum: dISO(),
        vreme: vreme(),
        inspekcijaId: crypto.randomUUID(),
      };
      setListaP(p => [...p, snimljena]);
      setPreostalo(p => Math.max(0, p - 1));
      addToast(`✓ OK ×${kolicina} snimljeno`, "uspeh");
      window._vibrirajOK?.();
      resetUnos();
      return;
    }
    setListaG(p => [...p, stavka]);
    resetUnos();
  };

  const snimiDeo=()=>{
    if(!listaG.length){setModal({poruka:"Lista je prazna!",tip:"greska"});return;}
    if(preostalo<=0) {setModal({poruka:"Serija je već gotova!",tip:"greska"});return;}
    let ok=0,nok=0;
    const inspId = crypto.randomUUID();
    const np=listaG.map(s=>{
      if(s.status==="NOK") nok+=s.kolicina||1; else ok+=s.kolicina||1;
      return{...s,idDeo:idDeo.toUpperCase(),datum:dISO(),vreme:vreme(),inspekcijaId:inspId};
    });
    setListaP(p=>[...p,...np]);
    setPreostalo(p=>Math.max(0,p-1));setListaG([]);
    addToast(`✓ Sačuvano (OK:${ok} NOK:${nok})`,"uspeh");
    if(nok>0) window._vibrirajNOK?.();
    else window._vibrirajOK?.();
  };

  const zapisi=async()=>{
    if(saving) return;
    if(!listaP.length){setModal({poruka:"Lista pregleda je prazna!",tip:"greska"});return;}
    const mozeBezPreostalog = mozeAdmin(korisnik.uloga) || prekidOdobrenId;
    if(preostalo>0 && !mozeBezPreostalog){
      setModal({
        poruka:`Serija nije završena (preostalo ${preostalo} od ${cilj}).\n\nKontrolor mora poslati zahtev adminu za prekid merenja.`,
        tip:"greska",
        okTekst:"📤 Pošalji zahtev adminu",
        onOK:()=>{setModal(null);setPokaziZahtev(true);},
        onOtkazati:()=>setModal(null),
      });
      return;
    }
    if(!korisnik.radnikId){
      setModal({poruka:"Nalog nije povezan sa tabelom radnici (nema radnik ID).\nProverite email u Auth i u radnici.csv, pa se ponovo ulogujte.",tip:"greska"});
      return;
    }
    const rnUpoz = await proveriRadniNalogUpozorenje(supabase, { idDeo, radniNalog });
    if (rnUpoz) addToast(`⚠ ${rnUpoz}`, "greska");

    setSaving(true);
    const sesija_id = ensureSesija({ modul: "atributivne", idDeo, smena, radniNalog });
    const redovi=listaP.map(s=>{const j=s.status==="OK";return ocistiRedZaInsert({
      datum:s.datum,smena,radni_nalog:radniNalog||null,pogon_kod:pogonKod||null,id_deo:s.idDeo,naziv_dela:deoInfo?.naziv_dela||"",
      linija_id:deoInfo?.linija?.id||null,masina_id:deoInfo?.masina?.id||null,
      kontrolor_id:korisnik.radnikId,operater_id:korisnik.uloga==="operator"?korisnik.radnikId:null,
      status:s.status,
      greska_naziv:s.kat,podkategorija:s.pod,defekt:s.defekt||null,
      inspekcija_id:s.inspekcijaId||null,
      kom_nok:j?0:(s.kolicina||1),
      ok_kolicina:j?(s.kolicina||1):0,
      nok_kolicina:j?0:(s.kolicina||1),
      ukupno_merenja:s.kolicina||1,
      potreban_broj:cilj,
      komentar:s.komentar||null,
      sesija_id,
    });});
    const kpiPayload = {
      modul: "atributivne",
      datum: dISO(),
      smena,
      id_deo: idDeo,
      serija: null,
      radni_nalog: radniNalog,
      sesija_id,
      kpi: kpiSerija,
    };
    try{
      if(!online){
        addAtributivneBatch({ logRows: redovi, kpi: kpiPayload, sesija_id });
        addToast(`📶 Offline: paket u redu (${redovi.length} stavki + KPI)`,"info");
        setListaP([]);setListaG([]);noviNalog();
        return;
      }
      const{error}=await supabase.from("kontrolni_log").insert(redovi);
      if(error)throw error;
      const postojeciKpi = await pronadjiAgregiraniKpiAtributivne(supabase, {
        idDeo,
        datum: dISO(),
        smena,
        radniNalog: radniNalog || undefined,
      });
      const kpiZaSnimanje = postojeciKpi
        ? saberiKpiVrednosti(kpiVrednostiIzDb(postojeciKpi), kpiSerija)
        : kpiSerija;
      const { error: errKpi } = await snimiIliAzurirajKpiUnos(
        supabase,
        { ...kpiPayload, kpi: kpiZaSnimanje },
        postojeciKpi?.id,
      );
      if (errKpi) addToast(porukaKpiGreske(errKpi), "greska");
      else {
        const dor = Number(kpiZaSnimanje?.dorada) || 0;
        const neus = Number(kpiZaSnimanje?.neusaglaseno) || 0;
        if (dor > 0 && neus > 0) {
          const { posleSnimanjaKpiDorade } = await import("../../lib/autoAkcije.js");
          await posleSnimanjaKpiDorade(supabase, {
            idDeo,
            datum: dISO(),
            smena,
            dorada: dor,
            neusaglaseno: neus,
            kpiId: postojeciKpi?.id,
          });
        }
      }
      const mirror = await mirrorKontrolniLogToExcel(supabase, redovi, { kpi: kpiSerija });
      if (mirror.storage) addToast("📊 Excel kopija ažurirana (Supabase Storage)","info");
      else if (mirror.download) addToast("📊 Excel kopija preuzeta lokalno","info");
      const nok=redovi.filter(r=>r.status==="NOK").length,uk=redovi.length;
      const nokKom=redovi.reduce((s,r)=>s+(r.nok_kolicina||0),0);
      const okKom=redovi.reduce((s,r)=>s+(r.ok_kolicina||0),0);
      if(uk>0&&(nok/uk)>0.1) setAlarm(`p = ${((nok/uk)*100).toFixed(1)}% NOK za ${deoInfo?.naziv_dela}`);
      if (uk > 0 && nokKom / (nokKom + okKom) > 0.1) {
        try {
          const alarm = await kreirajAlarmNokAtributivne(supabase, {
            idDeo,
            nokKom,
            okKom,
            radnikId: korisnik.radnikId,
            nazivDela: deoInfo?.naziv_dela || "",
          });
          if (alarm) {
            await osveziSpcAlarm();
            addToast("📢 Obaveštenje poslato inženjeru/adminu (visok NOK)", "info");
          }
        } catch { /* */ }
      }
      try {
        await posleSnimanjaAtributivne(supabase, {
          idDeo,
          datum: dISO(),
          smena,
          radniNalog,
          kreiraoId: korisnik?.radnikId,
        }, { onToast: addToast });
      } catch (e) {
        addToast(`Auto pravilo (NOK streak): ${e.message || "greška"}`, "greska");
      }
      await osveziSmenaStat();
      await osveziKpiDb();
      if (prekidOdobrenId) {
        await supabase.from("prekidi_zahtevi").update({
          status: "zatvoren",
          updated_at: new Date().toISOString(),
        }).eq("id", prekidOdobrenId);
        setPrekidOdobrenId(null);
      }
      setListaP([]);
      setListaG([]);
      setModal({poruka:`✓ Sačuvano ${redovi.length} stavki u bazu!`,tip:"uspeh",
        onOK:()=>{setModal(null);noviNalog();}});
    }catch(e){addToast(porukaDbGreske(e),"greska");}
    finally{setSaving(false);}
  };

  const ucitajLog=async()=>{
    setLoadLog(true);
    try{
      let q=supabase.from("kontrolni_log")
        .select("datum,id_deo,naziv_dela,greska_naziv,podkategorija,status,ok_kolicina,nok_kolicina,smena,created_at")
        .order("created_at",{ascending:false}).limit(500);
      if(logFilterDatum) q=q.eq("datum",logFilterDatum);
      if(logFilterSmena&&logFilterSmena!=="sve") q=q.eq("smena",Number(logFilterSmena));
      const{data,error}=await q;
      if(error)throw error; setLogD(data||[]);
    }catch(e){addToast(e.message,"greska");}
    finally{setLoadLog(false);}
  };
  useEffect(()=>{
    if(tab!=="log") return;
    setLogFilterDatum(dISO());
    setLogFilterSmena(String(smena));
  },[tab,smena]);
  useEffect(()=>{if(tab==="log")ucitajLog();},[tab,logFilterDatum,logFilterSmena]);

  const logOfflineRows=useMemo(
    ()=>filtrirajLogRedove(offlineKontrolniRedovi(queue),{datum:logFilterDatum,smena:logFilterSmena}),
    [queue,logFilterDatum,logFilterSmena],
  );
  const logPrikaz=useMemo(
    ()=>spojiOfflineINadRedove(logOfflineRows,logD),
    [logOfflineRows,logD],
  );

  const noviNalog=()=>{
    novaSesija({ modul: "atributivne", idDeo: "", smena, radniNalog: "" });
    setIdDeo("");setDeoInfo(null);setUpoz("");setStatus("");
    setUnosKorakAtr(pocetniKorakUnosAtr(korisnik?.uloga, rezimRada, { voziloMode: false }));
    setKategorija("");setPodkat("");setDefekt("");setKolicina(1);
    setListaG([]);setListaP([]);setPreostalo(0);setCilj(0);setFoto(null);
    setKomentar("");setRadniNalog("");setPogonKod("");setPorukaPogon("");
    setNalogInfo(null);setPrekidOdobrenId(null);
    setVoziloZona(null);
    setKpiSerija(podrazumevaniKpiIzListeP([]));
    setTimeout(()=>idRef.current?.focus(),100);
  };

  const odjava=async()=>{ocistiUnosDraft();await supabase.auth.signOut();onOdjava();};

  const LBL={color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4,display:"block"};
  const INP={width:"100%",background:C.input,border:`1px solid ${C.border}`,borderRadius:6,
    color:C.tekst,fontSize:12,padding:"9px 11px",boxSizing:"border-box",outline:"none",fontFamily:"inherit"};
  const BTN=(bg,dis=false)=>({background:dis?C.hover:bg,border:"none",borderRadius:6,
    color:dis?C.sivi: C.onAkcent,fontSize:12,fontWeight:700,padding:"10px 0",
    cursor:dis?"not-allowed":"pointer",letterSpacing:1,width:"100%",opacity:dis?0.5:1,transition:"all 0.15s"});

  const TABOVI=[
    ["unos","UNOS"],["log","LOG"],["crtez","CRTEŽ"],["smena","SMENA"],["karte","KONTROLNE KARTE"],
    ["dashboard","DASHBOARD"],["stanje","STANJE"],["eskalacije","ESKALACIJE"],["8d","8D"],["pfmea-cp","PFMEA / CP"],["aql","ISO 2859"],
    ["foto","FOTO"],["oee","OEE"],["kalibracija","MERILA"],["ciljevi","CILJEVI"],["nalozi","NALOZI"],
    ["kupac","KUPAC"],["oc","OC KRIVA"],["stabilnost","STABILNOST"],
    ["trasabilitet","TRASABILITET"],
    ...(mozeInzenjerExcel(korisnik.uloga, rezimRada)?[["excel","EXCEL"]]:[]),
    ...(mozeAdmin(korisnik.uloga)?[["admin","ADMIN"]]:[]),
  ].filter(([id]) => mozeTabAtributivne(id, korisnik.uloga, rezimRada));

  const analitikaTabovi = buildAnalitikaTaboviAtr(korisnik.uloga, rezimRada);
  const analitikaGrupe = useMemo(
    () => grupeSaDozvoljenimTabovima(
      ANALITIKA_GRUPE_ATRIB,
      (id) => mozeTabAtributivne(id, korisnik.uloga, rezimRada),
    ),
    [korisnik.uloga, rezimRada],
  );
  const mozeQaOdobrenja = mozeOdobrenjaQA(korisnik.uloga) && !jeLinija;
  const { badgePoTabu, badgePoGrupi } = useAnalitikaBadges({
    enabled: !jeLinija,
    qaEnabled: mozeQaOdobrenja,
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
      snimiAnalitikaTab("atributivne", ciljTab);
      if (ciljTab === "ncr" && prefillNcr) setNcrPrefill(prefillNcr);
    }
  }, []);

  const onOtvoriNcrAnalitika = useCallback((prefill = {}) => {
    setNcrPrefill(prefill);
    setTab("ncr");
    snimiAnalitikaTab("atributivne", "ncr");
  }, []);

  useEffect(() => {
    if (!mozeTabAtributivne(tab, korisnik.uloga, rezimRada)) {
      setTab(podrazumevaniTabAtributivne(korisnik.uloga, rezimRada));
    }
  }, [tab, korisnik.uloga, rezimRada]);

  useEffect(() => {
    if (!jeLinija && tab) snimiAnalitikaTab("atributivne", tab);
  }, [tab, jeLinija]);

  const punPristupTabovima = (mozeAdmin(korisnik.uloga) || jeKvalitetIliVise(korisnik.uloga)) && !jeLinija;

  useEffect(() => {
    if (!jeLinija || punPristupTabovima) return;
    const dozvoljeni = ["unos", "log"];
    if (!dozvoljeni.includes(tab)) setTab("unos");
  }, [jeLinija, tab, punPristupTabovima, korisnik?.uloga]);

  if(loadInit)return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",color:C.sivi,fontFamily:"'IBM Plex Mono',monospace",fontSize:12}}>
      Učitavanje...
    </div>
  );

  const trebaCekListaAtr = tab === "unos" && jeLinija && !listaSpremna;

  if (trebaCekListaAtr) {
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
          onOdjava={odjava}
          onNazad={onNazad}
          C={C}
          onToggleTema={() => setC(p => p.naziv === "tamna" ? TEME.svetla : TEME.tamna)}
          temaTamna={C.naziv === "tamna"}
        />
        <KontrolnaLista
          korisnik={korisnik}
          smena={Number(smena)}
          naslovModul="Atributivne"
          onZavrsena={zavrsiKontrolnuListu}
          C={C}
        />
      </div>
    );
  }

  return(
    <div style={{
      minHeight:"100vh",
      ...(!jeLinija ? {
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      } : {}),
      background:C.bg,fontFamily:"'IBM Plex Mono',monospace",color:C.tekst,
    }}>
      {modal&&<Modal poruka={modal.poruka} tip={modal.tip} okTekst={modal.okTekst}
        onOK={modal.onOK||(()=>setModal(null))} onOtkazati={modal.onOtkazati} C={C}/>}
      {alarm&&<AlarmBanner poruka={alarm} onClose={()=>setAlarm(null)} C={C}/>}
      <Toast poruke={toasts} C={C}/>
      {pokaziZahtev&&<ZahtevPrekid
        korisnik={korisnik} idDeo={String(idDeo||"").toUpperCase()} nazivDela={deoInfo?.naziv_dela||""}
        preostalo={preostalo} cilj={cilj}
        onUspeh={()=>{setPokaziZahtev(false);proveriPrekid();addToast("✓ Zahtev poslat adminu — čeka odobrenje","uspeh");}}
        onOtkazati={()=>setPokaziZahtev(false)} C={C}
      />}

      {spcBlokira && spcAlarm && (
        <SpcAlarmBlokada
          alarm={spcAlarm}
          korisnik={korisnik}
          nazivDela={deoInfo?.naziv_dela || ""}
          radniNalog={radniNalog}
          podnaslov="Atributivne · linija"
          C={C}
          onPotvrdjeno={() => {
            ocistiSpcAlarm();
            osveziSpcAlarm();
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
          nazivDela={deoInfo?.naziv_dela || ""}
          podnaslov="Atributivne · linija"
          onOsvezi={osveziKarantin}
        />
      )}

      <KpiDoradaHub
        C={C}
        addToast={addToast}
        modul="atributivne"
        otvoren={kpiHubOtvoren}
        onZatvori={() => setKpiHubOtvoren(false)}
        pocetniIdDeo={idDeo}
        pocetnaSmena={String(smena)}
        pocetniDatum=""
        pocetniRadniNalog={radniNalog}
      />

      <AppHeader
        korisnik={korisnik}
        onOdjava={odjava}
        onNazad={onNazad}
        C={C}
        onToggleTema={() => setC(p => p.naziv === "tamna" ? TEME.svetla : TEME.tamna)}
        temaTamna={C.naziv === "tamna"}
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
            {(ekran.mob || ekran.tablet) && (
              <span title={online ? "Online" : `Offline (${offlineCounts.total})`} style={{ flexShrink: 0, display: "flex" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%",
                  background: online ? C.zelena : C.crvena, display: "inline-block" }} />
              </span>
            )}
            {jeLinija && koristiMobLinija && mozeTabAtributivne("log", korisnik.uloga, rezimRada) && (
              <button
                type="button"
                onClick={() => setTab(tab === "log" ? "unos" : "log")}
                style={{
                  background: tab === "log" ? `${C.plava}22` : C.hover,
                  border: `1px solid ${tab === "log" ? C.plava : C.border}`,
                  borderRadius: 5, color: tab === "log" ? C.plava : C.sivi,
                  fontSize: 8, padding: "1px 5px", cursor: "pointer", fontWeight: 700, flexShrink: 0,
                }}
              >
                {tab === "log" ? "←" : "LOG"}
              </button>
            )}
            {mozePrebacivanjeRezimaUTacci(korisnik.uloga) && typeof onPromeniRezim === "function" && (
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
          </>
        )}
        trakaIspod={(ekran.mob || ekran.tablet) ? null : (
          jeLinija ? (
            <ShopFloorStatusBar
              C={C}
              online={online}
              offlineTotal={offlineCounts.total}
              onSync={() => flushQueue()}
              digitalniUnos={false}
              idDeo={idDeo}
              smena={smena}
              linija={linijaNaziv || ""}
              modul="atributivne"
            />
          ) : (
            <ShopFloorStatusBar
              C={C}
              online={online}
              offlineTotal={offlineCounts.total}
              onSync={() => flushQueue()}
              digitalniUnos={false}
              idDeo={idDeo}
              smena={smena}
              linija={linijaNaziv || ""}
              modul="atributivne"
              kompakt
              onNavigacija={onNavigacijaAnalitika}
            />
          )
        )}
      />

      {/* TABOVI — linija: ravna traka; analitika: grupisana navigacija */}
      {(punPristupTabovima || !jeLinija || !ekran.linijaUredjaj) && prikazTabovi?.length > 1 && (
      jeLinija ? (
      <div style={{
        display: "flex",
        borderBottom: `1px solid ${C.border}`,
        background: C.panel,
        paddingLeft: (ekran.mob || ekran.tablet) ? 6 : 18,
        flexWrap: "nowrap",
        overflowX: (ekran.mob || ekran.tablet) ? "auto" : "visible",
        WebkitOverflowScrolling: "touch",
      }}>
        {TABOVI.map(([id,n])=>(
          <button key={id} type="button" onClick={()=>setTab(id)} style={{
            background:"none",border:"none", flexShrink: 0,
            borderBottom:tab===id?`2px solid ${id==="dashboard"?C.zelena:id==="karte"?C.narandzasta:id==="crtez"?C.ljubicasta:id==="stanje"?C.ljubicasta:id==="admin"?C.zuta:C.plava}`:"2px solid transparent",
            color:tab===id?(id==="dashboard"?C.zelena:id==="karte"?C.narandzasta:id==="crtez"?C.ljubicasta:id==="stanje"?C.ljubicasta:id==="admin"?C.zuta:C.plava):C.sivi,
            fontSize:(ekran.mob || ekran.tablet) ? 9 : 10,fontWeight:700,padding:(ekran.mob || ekran.tablet) ? "8px 10px" : "10px 14px",cursor:"pointer",letterSpacing:1}}>
            {n}
            {id==="unos"&&listaP.length>0&&<span style={{background:C.plava,color: C.onAkcent,fontSize:8,borderRadius:10,padding:"1px 5px",marginLeft:5}}>{listaP.length}</span>}
          </button>
        ))}
        <div style={{flex:1,minWidth:8}}/>
        {!(ekran.mob || ekran.tablet) && (
          <span style={{color:C.sivi,fontSize:9,alignSelf:"center",paddingRight:12,flexShrink:0}}>{dPrikaz()}</span>
        )}
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
            modul="atributivne"
            onNavigacija={onNavigacijaAnalitika}
          />
        </>
      )
      )}

            {/* ══ UNOS ══ */}
      {tab==="unos" && koristiMobUnos && (
        <MobilniUnos
          linijaMode={jeLinija}
          kontrolorLinija={kontrolorLinija}
          smena={smena}
          radniNalog={radniNalog}
          setRadniNalog={setRadniNalog}
          unosKorakAtr={unosKorakAtr}
          setUnosKorakAtr={setUnosKorakAtr}
          linijaNaziv={linijaNaziv}
          masinaNaziv={masinaNaziv}
          korisnikIme={korisnik?.ime}
          idDeo={idDeo} setIdDeo={setIdDeo} deoInfo={deoInfo} upoz={upoz}
          prikaziLokaciju={prikaziLokaciju}
          status={status} setStatus={setStatus}
          kategorija={kategorija} setKategorija={setKategorija}
          podkat={podkat} setPodkat={setPodkat}
          defekt={defekt} setDefekt={setDefekt}
          kolicina={kolicina} setKolicina={setKolicina}
          greskeKat={greskeZaUnos}
          defektiMap={defektiZaUnos}
          koristiDefekte={koristiDefekte}
          voziloMode={voziloMode}
          voziloZona={voziloZona}
          onVoziloZonaChange={onVoziloZonaChange}
          listaG={listaG} setListaG={setListaG}
          listaP={listaP} setListaP={setListaP}
          preostalo={preostalo} cilj={cilj}
          prekidOdobrenId={prekidOdobrenId}
          onZahtevPrekid={()=>setPokaziZahtev(true)}
          korisnik={korisnik}
          smenaOK={smenaOK} smenaNOK={smenaNOK} smenaTotal={smenaTotal}
          lotVelicina={lotAql}
          lotIzvor={lotAqlIzvor}
          onLotVelicinaChange={promeniLotAql}
          onOtvoriAqlTab={mozeTabAtributivne("aql", korisnik.uloga, rezimRada) ? () => setTab("aql") : undefined}
          dodajGresku={dodajGresku} snimiDeo={snimiDeo} zapisi={zapisi}
          noviNalog={noviNalog} saving={saving} online={online} offlineQueueTotal={offlineCounts.total} C={C}
          kpiSerija={kpiSerija} setKpiSerija={setKpiSerija}
          kontrolnaListaOk={listaSpremna}
          idRef={idRef}
          onBarkodSken={obradiBarkodSken}
          dostupniPogoni={dostupniPogoni}
          omoguceniPogoni={omoguceniPogoni}
          pogonKod={pogonKod}
          onPogonChange={onPogonChangeAtr}
          trebaIzborPogona={trebaIzborPogona}
          porukaPogon={porukaPogon}
          deoSpreman={deoSpreman}
          nalogInfo={nalogInfo}
          predloziDelova={predloziDelovaTablet}
        />
      )}
      {tab==="unos" && !koristiMobUnos && (
        <div style={{
          display:"grid",
          gridTemplateColumns: !deoInfo
            ? `${LEva_W} 1fr`
            : voziloFormaEkran
              ? `${LEva_W} minmax(480px, 1.35fr) minmax(280px, 0.65fr) 235px`
              : (voziloMode || unosKorakAtr === "forma" ? `${LEva_W} 1fr 235px` : `${LEva_W} 1fr`),
          height:"calc(100vh - 89px)",
        }}>
          {/* Leva */}
          <div style={{borderRight:`1px solid ${C.border}`,padding:Math.round(8*H),overflowY:"auto",display:"flex",flexDirection:"column",gap:Math.round(8*H)}}>
            <div>
              <IdDeoBarkodRed
                C={C}
                akcent={C.plava}
                onBarkodSken={obradiBarkodSken}
                lblStyle={{ ...LBL, fontSize: Math.round(8 * H), letterSpacing: 1, marginBottom: 4 }}
                idLabel="ID deo"
                kompaktRed
                sirinaBarkod={Math.round(44 * H)}
                unosStil={{
                  borderRadius: 6,
                  padding: `${Math.round(6 * H)}px ${Math.round(4 * H)}px`,
                  fontSize: Math.round(12 * H),
                }}
              >
                <input
                  ref={idRef}
                  data-testid="atr-id-deo"
                  value={idDeo}
                  {...idBarkodPolje}
                  placeholder="5501-A"
                  title="Ručni unos, USB čitač (fokus u polje) ili veb kamera"
                  style={{
                    ...INP,
                    borderColor: deoSpreman ? C.zelena : idDeo.length > 2 ? C.crvena : C.border,
                    background: deoSpreman ? C.ok : idDeo.length > 2 ? C.nok : C.input,
                    fontSize: Math.round(12 * H),
                    fontWeight: 700,
                    letterSpacing: 1,
                    textAlign: "center",
                    padding: `${Math.round(6 * H)}px ${Math.round(4 * H)}px`,
                  }}
                />
              </IdDeoBarkodRed>
              <label style={{ ...LBL, fontSize: Math.round(8 * H), letterSpacing: 1, marginTop: Math.round(4 * H), display: "block" }}>
                Radni nalog
                <input
                  value={radniNalog}
                  onChange={e => setRadniNalog(e.target.value.toUpperCase())}
                  placeholder="RN-2026-NM001-B"
                  title={[
                    nalogInfo?.kupac && `Kupac: ${nalogInfo.kupac}`,
                    nalogInfo?.rok_isporuke && `Rok: ${nalogInfo.rok_isporuke}`,
                  ].filter(Boolean).join(" · ") || "Automatski iz šifrarnika po ID dela i pogonu"}
                  style={{
                    ...INP,
                    marginTop: 4,
                    fontSize: Math.round(10 * H),
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    padding: `${Math.round(5 * H)}px ${Math.round(4 * H)}px`,
                  }}
                />
              </label>
              {(nalogInfo?.kupac || nalogInfo?.rok_isporuke) && (
                <div style={{
                  fontSize: Math.round(7 * H),
                  color: C.sivi,
                  lineHeight: 1.35,
                  marginTop: Math.round(2 * H),
                }}>
                  {nalogInfo.kupac && <span>Kupac: <strong style={{ color: C.tekst }}>{nalogInfo.kupac}</strong></span>}
                  {nalogInfo.kupac && nalogInfo.rok_isporuke && " · "}
                  {nalogInfo.rok_isporuke && (
                    <span>Rok: <strong style={{ color: C.tekst }}>{nalogInfo.rok_isporuke}</strong></span>
                  )}
                </div>
              )}
              {dostupniPogoni.length > 1 && !voziloMode && (
                <PogonIzborPanel
                  C={C}
                  akcent={C.plava}
                  pogoni={dostupniPogoni}
                  omoguceniPogoni={omoguceniPogoni}
                  pogonKod={pogonKod}
                  onIzaberi={onPogonChangeAtr}
                  kompakt
                  obavezan={trebaIzborPogona}
                />
              )}
              {porukaPogon && (
                <div style={{
                  color: C.zuta,
                  fontSize: Math.round(8 * H),
                  padding: `${Math.round(4 * H)}px ${Math.round(6 * H)}px`,
                  background: `${C.zuta}18`,
                  borderRadius: 4,
                  lineHeight: 1.3,
                  marginTop: Math.round(4 * H),
                }}>
                  {porukaPogon}
                </div>
              )}
              <SmenaAutoPrikaz
                smena={smena}
                C={C}
                lblStyle={{ ...LBL, fontSize: Math.round(8 * H), letterSpacing: 1, marginTop: Math.round(6 * H) }}
                inpStyle={{
                  ...INP,
                  marginTop: 4,
                  fontSize: Math.round(11 * H),
                  padding: `${Math.round(6 * H)}px ${Math.round(4 * H)}px`,
                }}
              />
            </div>

            {deoSpreman && (
              <div style={{background:C.ok,border:`1px solid ${C.zelena}26`,borderRadius:6,padding:Math.round(6*H)}}>
                <div style={{color:C.zelena,fontWeight:700,fontSize:Math.round(9*H),marginBottom:Math.round(4*H),lineHeight:1.3}}>
                  {deoInfo.naziv_dela}
                  {pogonKod && prikaziLokaciju && (
                    <span style={{ color: C.plava, marginLeft: 6, fontSize: Math.round(8 * H) }}>
                      {labelPogona(pogonKod)}
                    </span>
                  )}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:Math.round(4*H),marginBottom:Math.round(4*H)}}>
                  {[
                    ...(prikaziLokaciju ? [["Linija", linijaNaziv], ["Mašina", masinaNaziv]] : []),
                    ["Kontrola", tekstKontrole],
                    ["Napomena", tekstNapomene],
                  ].map(([l, v]) => (
                    <div key={l} style={{background:C.panel,borderRadius:4,padding:`${Math.round(4*H)}px ${Math.round(5*H)}px`}}>
                      <div style={{color:C.sivi,fontSize:Math.round(7*H),marginBottom:2}}>{l}</div>
                      <div style={{color:C.tekst,fontSize:Math.round(8*H),fontWeight:700,lineHeight:1.3}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:Math.round(6*H)}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:Math.round(8*H),marginBottom:2}}>
                    <span style={{color:C.sivi}}>PREOST.</span>
                    <span style={{color:preostalo===0?C.zelena:C.zuta,fontWeight:700}}>{preostalo}/{cilj}</span>
                  </div>
                  <div style={{background:C.hover,borderRadius:3,height:Math.round(4*H)}}>
                    <div style={{background:preostalo===0?C.zelena:C.plava,width:`${cilj>0?(cilj-preostalo)/cilj*100:0}%`,
                      height:Math.round(4*H),borderRadius:3,transition:"width 0.3s"}}/>
                  </div>
                </div>
              </div>
            )}

            {deoInfo && (
              <AtrCrtezPregled
                slikaNaziv={deoInfo.slika_naziv}
                idDeo={String(idDeo || "").toUpperCase()}
                C={C}
                kompakt
                visina={Math.round(120 * H)}
              />
            )}

            {upoz&&<div style={{color:C.crvena,fontSize:Math.round(8*H),padding:`${Math.round(4*H)}px ${Math.round(6*H)}px`,background:C.nok,borderRadius:4,lineHeight:1.3}}>{upoz}</div>}
            <UnosCiljBanner idDeo={idDeo} listaP={[...listaP,...listaG]} C={C}/>
            {!jeLinija && (
            <UnosAqlPanel
              lotVelicina={lotAql}
              lotIzvor={lotAqlIzvor}
              radniNalog={radniNalog}
              idDeo={idDeo}
              onLotVelicinaChange={promeniLotAql}
              onOtvoriAqlTab={mozeTabAtributivne("aql", korisnik.uloga, rezimRada) ? () => setTab("aql") : undefined}
              listaG={listaG}
              listaP={listaP}
              C={C}
              kompakt
              uskiPanel
            />
            )}

            <button onClick={noviNalog}
              style={{...BTN(C.hover),border:`1px solid ${C.border}`,color:C.sivi,fontSize:Math.round(8*H),padding:`${Math.round(6*H)}px ${Math.round(4*H)}px`,marginTop:"auto"}}>
              ↺ NOVI
            </button>
          </div>

          {!deoSpreman && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: Math.round(24 * H),
              minHeight: 0,
              textAlign: "center",
              gap: Math.round(12 * H),
              background: C.panel,
              border: `1px dashed ${C.border}`,
              borderRadius: 10,
              margin: Math.round(12 * H),
            }}>
              <div style={{ fontSize: Math.round(40 * H), opacity: 0.35, lineHeight: 1 }}>📷</div>
              <div style={{ color: C.tekst, fontSize: Math.round(14 * H), fontWeight: 700 }}>
                Unesite ID dela
              </div>
              <div style={{ color: C.sivi, fontSize: Math.round(11 * H), lineHeight: 1.55, maxWidth: 360 }}>
                Skenirajte barkod ili unesite šifru u levi panel (npr. 5501-A), zatim Enter.
                Posle učitavanja sledi POKA-YOKE provera, pa OK/NOK unos.
              </div>
              {trebaIzborPogona && (
                <div style={{ color: C.zuta, fontSize: Math.round(10 * H), maxWidth: 360 }}>
                  Za ovaj deo prvo izaberite pogon (A–H) u levom panelu.
                </div>
              )}
            </div>
          )}

          {deoSpreman && unosKorakAtr !== "forma" && (
            <div style={{ display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
              {kontrolorLinija && (
                <LinijaWizardNav
                  korak={unosKorakAtr}
                  koraci={KORACI_ATRIB_KONTROLOR}
                  C={C}
                  akcent={C.plava}
                />
              )}

              {unosKorakAtr === "poka" && (
                <div style={{
                  padding: 14,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  flex: 1,
                }}>
                  <UnosPokaYokeKorak
                    C={C}
                    modul="atributivne"
                    akcent={C.plava}
                    idDeo={String(idDeo || "").toUpperCase()}
                    nazivDela={deoInfo?.naziv_dela}
                    radniNalog={radniNalog}
                    linija={linijaNaziv}
                    masina={masinaNaziv}
                    kontrolor={korisnik?.ime}
                    kontrolnaListaOk={listaSpremna}
                    onDalje={() => setUnosKorakAtr("forma")}
                    daljeLabel="Unos OK/NOK →"
                  />
                </div>
              )}
            </div>
          )}

          {deoSpreman && unosKorakAtr !== "forma" && voziloMode && (
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", borderLeft: `1px solid ${C.border}` }}>
              <label style={LBL}>PREGLED ({listaP.length})</label>
              <div style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "auto", minHeight: 60 }}>
                {!listaP.length ? (
                  <div style={{ padding: 14, textAlign: "center", color: C.border, fontSize: 10 }}>Nema snimljenih</div>
                ) : listaP.map((s, i) => (
                  <div key={i} style={{ padding: "6px 9px", borderBottom: `1px solid ${C.border}`,
                    background: s.status === "OK" ? C.ok : C.nok, fontSize: 10 }}>
                    <div style={{ color: s.status === "OK" ? C.zelena : C.crvena, fontWeight: 700 }}>{s.status}</div>
                    <div style={{ color: C.tekst }}>{s.kat}</div>
                    <div style={{ color: C.sivi, fontSize: 9 }}>{s.pod}{s.defekt && s.defekt !== "-" ? ` › ${s.defekt}` : ""}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deoSpreman && unosKorakAtr === "forma" && (
          <>
          {voziloFormaEkran && (
            <div style={{
              padding: "10px 12px",
              minHeight: 0,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              borderRight: `1px solid ${C.border}`,
            }}>
              <VoziloZonaNav
                izabranaZona={voziloZona}
                onZonaChange={onVoziloZonaChange}
                diagramSrc={voziloDijagramSrc}
                diagramLoading={voziloDijagramUcitava}
                velicina="veliki"
                C={C}
              />
            </div>
          )}
          {/* Sredina — forma unosa */}
          <div style={{padding:14,overflowY:"auto",display:"flex",flexDirection:"column",gap:9,borderRight:`1px solid ${C.border}`}}>
            {kontrolorLinija && (
              <LinijaWizardNav
                korak="unos"
                koraci={KORACI_ATRIB_KONTROLOR}
                C={C}
                akcent={C.plava}
              />
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              <div>
                <label style={LBL}>STATUS</label>
                <select value={status} onChange={e=>{setStatus(e.target.value);if(e.target.value==="OK"){setKategorija("");setPodkat("");setDefekt("");}}}
                  style={{...INP,borderColor:status==="OK"?C.zelena:status==="NOK"?C.crvena:C.border,
                    background:status==="OK"?C.ok:status==="NOK"?C.nok:C.input,
                    fontWeight:700,fontSize:13,textAlign:"center",cursor:"pointer"}}>
                  <option value="">-- Status --</option>
                  <option value="OK">✓  OK</option><option value="NOK">✗  NOK</option>
                </select>
              </div>
              <div>
                <label style={LBL}>KOLIČINA</label>
                <select value={kolicina} onChange={e=>setKolicina(Number(e.target.value))} style={{...INP,cursor:"pointer"}}>
                  {Array.from({length:20},(_,i)=>i+1).map(k=><option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={LBL}>KATEGORIJA GREŠKE</label>
              <select value={kategorija} onChange={e=>{setKategorija(e.target.value);setPodkat("");setDefekt("");}}
                disabled={status!=="NOK"||(voziloMode&&!voziloZona)}
                style={{...INP,opacity:(status!=="NOK"||(voziloMode&&!voziloZona))?0.4:1,cursor:(status!=="NOK"||(voziloMode&&!voziloZona))?"not-allowed":"pointer"}}>
                <option value="">{voziloMode&&!voziloZona?"— prvo izaberi zonu —":"-- Izaberi kategoriju --"}</option>
                {Object.keys(greskeZaUnos).map(k=><option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div>
              <label style={LBL}>PODKATEGORIJA</label>
              <select value={podkat} onChange={e=>{setPodkat(e.target.value);setDefekt("");}}
                disabled={!kategorija||status!=="NOK"}
                style={{...INP,opacity:(!kategorija||status!=="NOK")?0.4:1,cursor:(!kategorija||status!=="NOK")?"not-allowed":"pointer"}}>
                <option value="">-- Izaberi podkategoriju --</option>
                {(greskeZaUnos[kategorija]||[]).map(p=><option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div>
              <label style={LBL}>
                DEFEKT
                {!koristiDefekte && (
                  <span style={{color:C.sivi,fontWeight:400,letterSpacing:0,marginLeft:6}}>
                    (samo kontrola celog vozila)
                  </span>
                )}
              </label>
              <select value={defekt} onChange={e=>setDefekt(e.target.value)}
                disabled={!koristiDefekte||!kategorija||!podkat||status!=="NOK"}
                style={{...INP,
                  opacity:(!koristiDefekte||!kategorija||!podkat||status!=="NOK")?0.35:1,
                  cursor:(!koristiDefekte||!kategorija||!podkat||status!=="NOK")?"not-allowed":"pointer",
                  background:!koristiDefekte?C.hover:C.input,
                  color:!koristiDefekte?C.sivi:C.tekst}}>
                <option value="">{koristiDefekte ? "-- Izaberi defekt --" : "— nije potrebno —"}</option>
                {koristiDefekte && ((defektiZaUnos[kategorija]||{})[podkat]||[]).map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginBottom:4,display:"block"}}>
                KOMENTAR (opciono)
              </label>
              <input value={komentar} onChange={e=>setKomentar(e.target.value)}
                placeholder="Npr: alat istrošen..."
                style={{...INP, fontSize:12}}/>
            </div>

            <button onClick={dodajGresku} disabled={!deoInfo || !status || (status === "NOK" && (
              (voziloMode && !voziloZona) || !kategorija || !podkat || (koristiDefekte && !defekt)
            ))}
              style={{...BTN(status === "OK" ? C.zelena : C.plava, !deoInfo), fontSize:13, padding:"14px", fontWeight:700}}>
              {status === "OK" ? "✓ SNIMI OK" : "+ DODAJ U LISTU"}
            </button>

            <label style={{...LBL,marginBottom:3}}>PRIVREMENA LISTA ({listaG.length})</label>
            <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden",flex:1,minHeight:60,maxHeight:250,overflowY:"auto"}}>
              {!listaG.length?<div style={{padding:14,textAlign:"center",color:C.border,fontSize:10}}>Dodaj stavke</div>
               :listaG.map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                  padding:"7px 10px",borderBottom:`1px solid ${C.border}`,background:s.status==="OK"?C.ok:C.nok}}>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    {s.foto&&<span style={{fontSize:10}}>📷</span>}
                    <span style={{color:s.status==="OK"?C.zelena:C.crvena,fontWeight:700,fontSize:10,minWidth:28}}>{s.status}</span>
                    <span style={{color:C.tekst,fontSize:10}}>{s.kat} › {s.pod}{s.defekt&&s.defekt!=="-"?` › ${s.defekt}`:""}</span>
                  </div>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    <span style={{color:C.sivi,fontSize:10}}>×{s.kolicina}</span>
                    <button onClick={()=>setListaG(p=>p.filter((_,j)=>j!==i))}
                      style={{background:"none",border:"none",color:C.crvena,cursor:"pointer",fontSize:12,padding:0}}>✕</button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={snimiDeo} disabled={!listaG.length}
              style={{...BTN(C.zelena,!listaG.length),fontSize:11,padding:"10px",
                boxShadow:listaG.length?`0 0 12px ${C.zelena}40`:"none"}}>
              ✓  SNIMI DEO
            </button>
          </div>

          {/* Desna */}
          <div style={{padding:14,display:"flex",flexDirection:"column",gap:10,overflowY:"auto",position:"relative"}}>
            {listaP.length > 0 && (
              <button onClick={zapisi} disabled={saving}
                style={{
                  ...BTN("#7c3aed", !listaP.length || saving),
                  fontSize: 11,
                  padding: "10px 12px",
                  boxShadow: listaP.length ? `0 0 12px #7c3aed50` : "none",
                  position: "sticky",
                  top: 0,
                  zIndex: 5,
                  flexShrink: 0,
                }}>
                {saving ? "Snimanje..." : (online ? `💾 ZAPIŠI (${listaP.length})` : "📶 OFFLINE")}
              </button>
            )}
            <div style={{background:C.panel,border:`1px solid ${C.border}`,borderRadius:8,padding:10}}>
              <div style={{color:C.sivi,fontSize:9,letterSpacing:1,marginBottom:5}}>SMENA TOTALI</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4,textAlign:"center"}}>
                {[["MER",smenaTotal,C.plava],["OK",smenaOK,C.zelena],["NOK",smenaNOK,C.crvena]].map(([l,v,b])=>(
                  <div key={l} style={{background:C.bg,borderRadius:5,padding:"6px 2px"}}>
                    <div style={{color:b,fontSize:16,fontWeight:700}}>{v}</div>
                    <div style={{color:C.sivi,fontSize:8}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:7,textAlign:"center",fontSize:11,borderTop:`1px solid ${C.border}`,paddingTop:7}}>
                <span style={{color:C.zuta,fontWeight:700}}>
                  {LAB_FPY_KRATKO}: {smenaStat.rty > 0 ? smenaStat.rty.toFixed(1) : "—"}%
                </span>
                <span style={{color:C.sivi,fontSize:9,marginLeft:10}}>
                  DPMO: {smenaStat.dpmo > 0 ? smenaStat.dpmo.toLocaleString() : "—"}
                </span>
              </div>
              <div style={{color:C.sivi,fontSize:8,marginTop:4,textAlign:"center"}}>iz baze · {dISO()} · S{smena}</div>
            </div>

            <label style={LBL}>PREGLED ({listaP.length})</label>
            <div style={{flex:1,border:`1px solid ${C.border}`,borderRadius:8,overflow:"auto",minHeight:60}}>
              {!listaP.length?<div style={{padding:14,textAlign:"center",color:C.border,fontSize:10}}>Nema snimljenih</div>
               :listaP.map((s,i)=>(
                <div key={i} style={{padding:"6px 9px",borderBottom:`1px solid ${C.border}`,
                  background:s.status==="OK"?C.ok:C.nok,fontSize:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{color:s.status==="OK"?C.zelena:C.crvena,fontWeight:700}}>{s.status}</span>
                    <div style={{display:"flex",gap:3,alignItems:"center"}}>
                      {s.foto&&<span style={{fontSize:9}}>📷</span>}
                      <span style={{color:C.sivi}}>×{s.kolicina}</span>
                    </div>
                  </div>
                  <div style={{color:C.tekst}}>{s.kat}</div>
                  <div style={{color:C.sivi,fontSize:9}}>{s.pod}{s.defekt&&s.defekt!=="-"?` › ${s.defekt}`:""} · {s.vreme}</div>
                  {s.komentar&&<div style={{color:C.zuta,fontSize:9,marginTop:2}}>💬 {s.komentar}</div>}
                </div>
              ))}
            </div>

            {!online&&offlineCounts.total>0&&(
              <div style={{background:"#3d2c00",border:`1px solid ${C.zuta}30`,borderRadius:5,
                padding:"7px 10px",fontSize:10,color:C.zuta}}>
                📶 {offlineCounts.total} paketa u offline redu ({offlineCounts.stavki} stavki)
              </div>
            )}

            {preostalo>0 && prekidOdobrenId && (
              <div style={{background:C.ok,border:`1px solid ${C.zelena}`,borderRadius:6,
                padding:"8px 10px",fontSize:10,color:C.zelena,fontWeight:700,textAlign:"center"}}>
                ✓ Prekid odobren — možete zapisati seriju
              </div>
            )}

            {preostalo>0 && !prekidOdobrenId && !mozeAdmin(korisnik.uloga) && listaP.length>0 && (
              <button type="button" onClick={()=>setPokaziZahtev(true)}
                style={{...BTN(C.zuta),fontSize:10,padding:"8px",
                  border:`1px solid ${C.zuta}`,color: C.onZuta}}>
                ⚠ Zahtev za prekid ({preostalo} preostalo)
              </button>
            )}

            {listaP.length > 0 && (
              <SkartDoradaOeePanel
                C={C}
                kompakt
                modul="atributivne"
                vrednosti={kpiSerija}
                onChange={setKpiSerija}
                podnaslov="Uz Zapiši u bazu (OK/NOK komadi, ne serije)"
              />
            )}
          </div>
          </>
          )}
        </div>
      )}

      {/* ══ CRTEŽ ══ */}
      {tab==="crtez"&&(
        <div style={{height:"calc(100vh - 89px)"}}>
          <CrtezDela
            deoInfo={deoInfo}
            C={C}
            addToast={addToast}
            onNazad={() => setTab("unos")}
            onSlikaSnimljena={(naziv) => {
              setDeoInfo(d => d ? { ...d, slika_naziv: naziv } : d);
              setSviDelovi(prev => prev.map(d =>
                d.id_deo === deoInfo?.id_deo ? { ...d, slika_naziv: naziv } : d
              ));
            }}
          />
        </div>
      )}

      {/* ══ LOG ══ */}
      {tab==="log"&&(
        <div style={{padding:16}}>
          <LogPregledFilter
            C={C}
            datum={logFilterDatum}
            onDatumChange={setLogFilterDatum}
            smena={logFilterSmena}
            onSmenaChange={setLogFilterSmena}
            onOsvezi={ucitajLog}
            onDanas={()=>{setLogFilterDatum(dISO());setLogFilterSmena(String(smena));}}
            loading={loadLog}
            offlineStavki={logOfflineRows.length}
            online={online}
            ukupnoPrikazano={logPrikaz.length}
          />
          {loadLog?<div style={{textAlign:"center",color:C.sivi,padding:30,fontSize:11}}>Učitavanje...</div>:(
            <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"24px 90px 70px 55px 1fr 1fr 55px 38px 38px",
                background:C.hover,padding:"8px 12px",fontSize:9,color:C.sivi,gap:6}}>
                <span />
                <span>DATUM</span><span>ID DEO</span><span>SMENA</span><span>KATEGORIJA</span>
                <span>PODKAT.</span><span>STATUS</span><span>OK</span><span>NOK</span>
              </div>
              {!logPrikaz.length?<div style={{padding:28,textAlign:"center",color:C.border,fontSize:11}}>
                Nema unosa za izabrani filter
                {brojOfflineStavki(queue,"atributivne")>0&&logFilterDatum!==dISO()
                  ?` (${brojOfflineStavki(queue,"atributivne")} u offline redu za druge datume)`
                  :""}
              </div>
               :logPrikaz.map((r,i)=>(
                <div key={r._offline?`off-${r._jobId}-${i}`:`db-${r.created_at}-${i}`}
                  style={{display:"grid",gridTemplateColumns:"24px 90px 70px 55px 1fr 1fr 55px 38px 38px",
                  padding:"7px 12px",borderTop:`1px solid ${C.border}`,
                  background:r._offline?`${C.zuta}14`:r.status==="OK"?C.ok:C.nok,fontSize:10,gap:6,alignItems:"center"}}>
                  <span style={{fontSize:9}} title={r._offline?"Offline — čeka sinhronizaciju":""}>
                    {r._offline?"📶":""}
                  </span>
                  <span style={{color:C.sivi}}>{r.datum}</span>
                  <span style={{color:C.tekst,fontWeight:700}}>{r.id_deo}</span>
                  <span style={{color:C.sivi}}>{r.smena}</span>
                  <span style={{color:C.tekst}}>{r.greska_naziv}</span>
                  <span style={{color:C.sivi}}>{r.podkategorija}</span>
                  <span style={{color:r.status==="OK"?C.zelena:C.crvena,fontWeight:700}}>{r.status}</span>
                  <span style={{color:C.zelena}}>{r.ok_kolicina}</span>
                  <span style={{color:C.crvena}}>{r.nok_kolicina}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ SMENA ══ */}
      {tab==="smena"&&(
        <div style={{padding:20,flex:1,overflow:"auto"}}>
          <SmenaPogonaPanel
            C={C}
            korisnik={korisnik}
            addToast={addToast}
            smena={Number(smena) || 1}
            modulKontekst="atributivne"
            prikaziModulPdf
          />
          <div style={{color:C.sivi,fontSize:10,letterSpacing:1.2,margin:"18px 0 12px"}}>
            ATRIBUTIVNI UNOSI — detalj · {dISO()} · smena {smena}
          </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-start"}}>
          {[["MERENJA",smenaTotal,C.plava],["OK",smenaOK,C.zelena],["NOK",smenaNOK,C.crvena],
            [LAB_FPY_PCT,smenaStat.rty > 0 ? smenaStat.rty.toFixed(1)+"%" : "-",C.zuta],
            ["DPMO",smenaStat.dpmo > 0 ? smenaStat.dpmo.toLocaleString() : "-",C.ljubicasta],
          ].map(([l,v,b])=>(
            <div key={l} style={{background:C.panel,border:`1px solid ${b}30`,borderRadius:10,
              padding:"18px 22px",minWidth:130,textAlign:"center"}}>
              <div style={{color:b,fontSize:28,fontWeight:700}}>{v}</div>
              <div style={{color:C.sivi,fontSize:9,letterSpacing:1.5,marginTop:5}}>{l}</div>
            </div>
          ))}
          <button onClick={()=>generisiIzvestajSmene(korisnik,smena,C,smenaStat)}
            style={{background:"#7c3aed",border:"none",borderRadius:8,
              color: C.onAkcent,fontSize:10,fontWeight:700,padding:"9px 15px",cursor:"pointer",marginTop:4}}>
            📄 Izveštaj smene PDF
          </button>

          {korisnik.uloga==="admin"&&(
            <div style={{color:C.sivi,fontSize:10,marginTop:8,maxWidth:280,lineHeight:1.5}}>
              Statistika smene se računa iz <strong>kontrolni_log</strong> (datum + smena). Nema lokalnog reset-a.
            </div>
          )}
        </div>
        </div>
      )}

      {tab==="admin" && mozeAdmin(korisnik.uloga) && (
        <AdminPanel korisnik={korisnik} onNazad={()=>setTab(jeLinija ? "unos" : "pregled")} C={C} uGravnojFormi />
      )}

      {tab === "pregled" && !jeLinija && (
        <div style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
        <AnalitikaPregledPanel
          C={C}
          addToast={addToast}
          korisnik={korisnik}
          modul="atributivne"
          onOtvoriOee={() => setTab("oee")}
          onOtvori8D={(d) => { setOsmdPrefill(d); setTab("8d"); }}
          onOtvoriNcr={onOtvoriNcrAnalitika}
          onNavigacija={onNavigacijaAnalitika}
        />
        </div>
      )}

      {tab==="odobrenja" && !jeLinija && mozeOdobrenjaQA(korisnik.uloga) && (
        <OdobrenjaQAPanel korisnik={korisnik} C={C} addToast={addToast} />
      )}

      {tab==="karte" && (ekran.mob
        ? <MobilneKarte sviDelovi={sviDelovi} C={C} addToast={addToast}/>
        : <SpcKarteAtributivne sviDelovi={sviDelovi} C={C} addToast={addToast} korisnik={korisnik}
            spoljniFilter={spcFilterAnalitika}
            pocetniTip={spcTipNav}
            onPocetniTipPotrosen={() => setSpcTipNav(null)}
            onNavigacijaKarte={({ spcTip }) => { if (spcTip) setSpcTipNav(spcTip); }}
            onOtvori8D={(d)=>{ setOsmdPrefill(d); setTab("8d"); }}/>)}
      {tab==="dashboard" && (
        <div style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
        {ekran.mob
          ? <MobilniDashboard C={C} addToast={addToast}/>
          : <Dashboard C={C} addToast={addToast} onNavigacija={onNavigacijaAnalitika} sviDelovi={sviDelovi}
              korisnik={korisnik} onOtvori8D={(d) => { setOsmdPrefill(normalizujPrefill8d(d)); setTab("8d"); }} />}
        </div>
      )}
      {tab==="stanje" && (
        <div style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
        <InteligencijaDeoPanel
          C={C}
          korisnik={korisnik}
          addToast={addToast}
          sviDelovi={sviDelovi}
          defaultIdDeo={filterDeo || idDeo || ""}
          onOtvori8D={(e) => {
            setOsmdPrefill(normalizujPrefill8d(e));
            setTab("8d");
          }}
        />
        </div>
      )}
      {tab==="eskalacije" && <EskalacijePanel korisnik={korisnik} C={C}
        addToast={addToast} sviDelovi={sviDelovi}
        onOtvori8D={(e) => {
          setOsmdPrefill(prefill8dIzEskalacije(e));
          setTab("8d");
        }}/>}
      {tab==="ncr" && (
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 20 }}>
          <NcrCapaPanel
            korisnik={korisnik}
            C={C}
            addToast={addToast}
            sviDelovi={sviDelovi}
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
        </div>
      )}
      {tab==="8d" && (
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <OsmDIzvestaj korisnik={korisnik} C={C}
        addToast={addToast} sviDelovi={sviDelovi}
        prefill={osmdPrefill} onPrefillUsed={()=>setOsmdPrefill(null)}
        onOtvoriPfmeaCp={(prefill) => {
          setPfmeaCpPrefillIz8d(prefill);
          setTab("pfmea-cp");
        }}/>
        </div>
      )}
      {tab==="pfmea-cp" && (
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
      )}
      {tab==="aql" && (
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}>
          <AQLTabela C={C} />
        </div>
      )}
      {tab==="foto"        && <FotoArhiva C={C} addToast={addToast}/>}
      {tab==="oee"         && <OeeKpiTab C={C} modul="atributivne" addToast={addToast} idDeoFilter={(filterDeo || idDeo) || undefined} datum={dISO()} smena={smena} radniNalog={radniNalog || undefined}/>}
      {tab==="kalibracija" && (
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}>
          <KalibracijaMerila korisnik={korisnik} C={C} addToast={addToast}/>
        </div>
      )}
      {tab==="ciljevi" && (
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}>
          <CiljeviKvaliteta C={C} addToast={addToast} sviDelovi={sviDelovi}/>
        </div>
      )}
      {tab==="nalozi" && (
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}>
          <RadniNaloziPanel C={C} addToast={addToast} sviDelovi={sviDelovi}/>
        </div>
      )}
      {tab==="kupac" && (
        <div style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          <IzvestajKupac C={C} addToast={addToast}/>
        </div>
      )}
      {tab==="oc" && (
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}>
          <OCKriva C={C}/>
        </div>
      )}
      {tab==="stabilnost"  && <StabilnostProcesa sviDelovi={sviDelovi} C={C} addToast={addToast}/>}
      {tab==="msa" && (
        <div style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          <MerilaMsaHub C={C} addToast={addToast} korisnik={korisnik} />
        </div>
      )}
      {tab==="kplan" && (
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}>
          <KontrolniPlanPanel
            C={C}
            addToast={addToast}
            korisnik={korisnik}
            idDeoFilter={filterDeo || idDeo || ""}
          />
        </div>
      )}
      {tab==="trasabilitet" && (
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 20 }}>
          <TrasabilitetPanel
            C={C}
            addToast={addToast}
            modul="atributivne"
            pocetniIdDeo={filterDeo || idDeo}
          />
        </div>
      )}
      {tab==="excel" && mozeInzenjerExcel(korisnik.uloga, rezimRada) && (
        <div style={{ padding: 20, overflow: "auto", maxWidth: 720, margin: "0 auto" }}>
          <InzenjerExcelPanel
            modul="atributivne"
            mozeUvoz={false}
            idDeoFilter={filterDeo || idDeo}
            C={C}
            addToast={addToast}
          />
        </div>
      )}
    </div>
  );
}

function GlavnaForma(props) {
  return (
    <AnalitikaFilterProvider>
      <GlavnaFormaInner {...props} />
    </AnalitikaFilterProvider>
  );
}


export default GlavnaForma;
export { GlavnaFormaInner };
