import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { KontrolnaLista, ZahtevPrekid, ucitajOdobrenPrekid, zatvoriPrekidZahtev } from "./lib/kontrolaSesije.jsx";
import {
  setListaOkSession,
  getListaOkSession,
  procitajSmenuIzStorage,
} from "./lib/kontrolaLista.js";
import {
  toDec, isStepen, koristiUgaoUnosKolone, inputModeMerenja,
  validirajUnos, proveriOkNok, bojaMerenja, bojaUnosMerenja,
  formatOpsegPlausibilnosti,
  svaMerenjaZavrsena, imaBiloSta, grupeMerenja, koloneZaGrupu,
  filterKeyUnos, sanitizujInputMerenja, unosMerenjaSpremanZaDodavanje,
} from "./lib/varijabilneUtils.js";
import { ucitajUrlSlike, lokalnaPutanjaSlike } from "./lib/slikePaths.js";
import MerljiveSpcKarte from "./MerljiveSpcKarte.jsx";
import MerljiveExcelPanel from "./MerljiveExcelPanel.jsx";
import GageRRPanel from "./components/GageRRPanel.jsx";
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
import InteligencijaDeoPanel from "./components/InteligencijaDeoPanel.jsx";
import { podrazumevaniKpiIzMerenja } from "./lib/oeeKpi.js";
import { snimiKpiUnos, porukaKpiGreske } from "./lib/kpiUnos.js";
import { useOfflineQueue } from "./lib/offlineQueue.js";
import { mozeTabMerljive, jeKvalitetIliVise, jeAdmin, opisUloge, mozeAnalitika as mozeAnalitikaUloga, mozePrebacivanjeRezima, jeKontrolorLinija, jeLinijaUloga, pocetniKorakUnosMer } from "./lib/uloge.js";
import {
  mapaMerila,
  upozorenjaInstrumentaZaKolone,
  kalibracijaBlokiraUnos,
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
  izaberiRadniNalog,
  proveriRadniNalogUpozorenje,
  formatNalogToast,
} from "./lib/radniNalog.js";
import IdDeoBarkodRed from "./components/IdDeoBarkodRed.jsx";
import SmenaIdUnosRed from "./components/SmenaIdUnosRed.jsx";
import { indeksSledecePrazno } from "./lib/meriloUvoz.js";
import { porukaDbGreske } from "./lib/dbGreske.js";
import LinijaWizardNav, { KORACI_MERLJIVE_LINIJA, KORACI_MERLJIVE_KONTROLOR } from "./components/LinijaWizardNav.jsx";
import MobilniMerljiviUnos from "./components/MobilniMerljiviUnos.jsx";
import SpcBaselinePanel from "./components/SpcBaselinePanel.jsx";
import MerljiveLinijaLeviPanel from "./components/MerljiveLinijaLeviPanel.jsx";
import AppHeader from "./components/AppHeader.jsx";
import MerljivaMobTabKarusel from "./components/MerljivaMobTabKarusel.jsx";

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
    ["msa", "MSA / Gage R&R"],
    ["merila", "MERILA"],
    ["heatmap", "HEAT MAP"],
    ["ciljevi", "CILJEVI"],
    ["nalozi", "NALOZI"],
    ["kupac", "KUPAC"],
    ["stabilnost", "STABILNOST"],
    ["oee", "OEE"],
    ["log", "LOG"],
    ...(mozeAnalitika ? [["trasabilitet", "TRASABILITET"]] : []),
    ...(mozeAdmin ? [["admin", "ADMIN"]] : []),
  ].filter(([id]) => mozeTabMerljive(id, korisnik?.uloga, rezimRada));

  const bojaTaba = (id) => {
    if (id === "karte") return C.narandzasta;
    if (id === "stanje") return C.ljubicasta;
    if (id === "admin") return C.zuta;
    if (id === "msa") return C.ljubicasta;
    if (id === "smena") return C.zuta;
    if (id === "merila") return C.plava;
    if (id === "heatmap") return "#f472b6";
    if (id === "ciljevi") return C.zelena;
    if (id === "nalozi") return C.plava;
    if (id === "kupac") return "#22d3ee";
    if (id === "stabilnost") return "#f472b6";
    if (id === "oee") return C.narandzasta;
    if (id === "trasabilitet") return "#22d3ee";
    return C.zelena;
  };
  const [datum, setDatum] = useState(danasSr());
  const [smena, setSmena] = useState(() => String(procitajSmenuIzStorage()));
  const [idDeo, setIdDeo] = useState("");
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
  const [aktivnaKolona, setAktivnaKolona] = useState(-1);
  const [merilaLista, setMerilaLista] = useState([]);
  const [kontrolnaListaOk, setKontrolnaListaOk] = useState(false);
  const [unosKorak, setUnosKorak] = useState("poka");
  const [linijaKorak, setLinijaKorak] = useState(1);
  const kalibracijaOdobrena = !!kalibracijaOdobrenId;
  const mozeUpRikosKalibracije = mozeAdmin || kalibracijaOdobrena;
  const prethodniKalOdobren = useRef(null);

  const deloviLista = useMemo(
    () => Object.values(sopMap).map(s => ({ id_deo: s.id_deo, naziv_dela: s.naziv_dela })),
    [sopMap],
  );

  const prethodniId = useRef("");
  const prethodniAB = useRef("");
  const prethodnaSmenaPoka = useRef(smena);
  const inputRefs = useRef([]);
  const koloneRef = useRef(kolone);
  koloneRef.current = kolone;
  const idUcitano = !!(idDeo && nazivDela && grupe.length && grupaAB);

  useEffect(() => {
    const noviDeo = idDeo && idDeo !== prethodniId.current;
    const novaSmena = smena !== prethodnaSmenaPoka.current;
    if (noviDeo || novaSmena) {
      setUnosKorak(pocetniKorakUnosMer(korisnik?.uloga, rezimRada));
      prethodnaSmenaPoka.current = smena;
    }
  }, [idDeo, smena, korisnik?.uloga, rezimRada]);

  useEffect(() => {
    localStorage.setItem("spc_smena", String(smena));
    sessionStorage.setItem("spc_smena", String(smena));
  }, [smena]);

  useEffect(() => {
    const sm = Number(smena);
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
  }, [smena, idDeo, idUcitano, jeLinija, linijaKorak]);

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

  useEffect(() => {
    if (!idDeo || idDeo.length < 3) return;
    fetchPlaniranoKomZaDeo(supabase, idDeo).then(plan => {
      if (plan > 0) setKpiSerija(p => ({ ...p, planirano_kom: plan }));
    });
  }, [idDeo, radniNalog]);

  const ciljSesije = grupe.length;
  const preostaloSesije = useMemo(() => {
    if (!idDeo || !grupe.length) return 0;
    return grupe.filter(g => !sacuvaneGrupe.includes(g)).length;
  }, [idDeo, grupe, sacuvaneGrupe]);

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
      const [kRes, sRes] = await Promise.all([
        supabase.from("karakteristike_merljive").select("*").order("id"),
        supabase.from("sop_deo_varijabilni").select("*"),
      ]);
      if (!ok) return;
      if (kRes.error || sRes.error) {
        setGreskaDb(
          (kRes.error || sRes.error).message
          + " — pokreni 11_varijabilne_schema.sql i import CSV."
        );
        setUcitava(false);
        return;
      }
      setKarakteristike(kRes.data || []);
      const map = {};
      for (const s of sRes.data || []) {
        map[String(s.id_deo).toUpperCase()] = s;
      }
      setSopMap(map);
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

  const punPristupTabovima = mozeAdmin || jeKvalitetIliVise(korisnik?.uloga);

  useEffect(() => {
    if (!jeLinija || punPristupTabovima) return;
    if (tab !== "unos" && tab !== "log") setTab("unos");
  }, [jeLinija, tab, punPristupTabovima]);

  const resetKolone = useCallback((broj) => {
    setKolone(prazneKolone(broj));
    setFotoPoPoziciji({});
    setKomentarPoPoziciji({});
  }, []);

  const ucitajDeo = useCallback(async (sID, { radniNalogEksplicitni } = {}) => {
    const id = String(sID || "").trim().toUpperCase();
    if (!id) return;
    if (!radniNalogEksplicitni && id === prethodniId.current) return;

    const sop = sopMap[id];
    if (!sop) {
      setPoruka(`ID ${id} nije u SOP listi varijabilnih delova.`);
      setNalogInfo(null);
      return;
    }
    setPoruka("");
    setNazivDela(sop.naziv_dela || "");
    setKontrolor(sop.kontrolor_ime || korisnik?.ime || "");
    setLinija(sop.linija || "");
    setMasina(sop.masina || "");
    setSlika(sop.slika || "");
    const br = sop.broj_merenja || 5;
    setPotrebanBroj(br);
    setSacuvaneGrupe([]);
    setPrekidOdobrenId(null);
    setFotoPoPoziciji({});
    setKomentarPoPoziciji({});

    const gs = grupeMerenja(karakteristike, id);
    if (!gs.length) {
      setPoruka(
        `ID ${id}: nema karakteristika u bazi (tabela karakteristike_merljive). `
        + "Admin → uvezi šifarnik (Excel ili docs/karakteristike_merljive.csv).",
      );
      setGrupe([]);
      setGrupaAB("");
      resetKolone(br);
      prethodniId.current = id;
      setNalogInfo(null);
      return;
    }
    setGrupe(gs);
    const ab = gs[0] || "";
    setGrupaAB(ab);
    prethodniAB.current = ab;
    const cols = koloneZaGrupu(karakteristike, id, ab, br);
    if (!cols.some(c => c.naziv !== "-")) {
      setPoruka(
        `ID ${id}: nema dimenzija za seriju ${ab}. Proveri karakteristike_merljive (sifra_merenja).`,
      );
    }
    setKolone(cols);
    setAktivnaKolona(indeksSledecePrazno(cols, br, 0));
    prethodniId.current = id;
    setUnosKorak(pocetniKorakUnosMer(korisnik?.uloga, rezimRada));
    if (jeLinija) setLinijaKorak(1);

    setNalogUcitava(true);
    let dbNalog = null;
    try {
      dbNalog = await ucitajAktivniRadniNalog(supabase, id);
    } finally {
      setNalogUcitava(false);
    }
    setNalogInfo(dbNalog);
    const rn = izaberiRadniNalog({
      eksplicitni: radniNalogEksplicitni,
      izBaze: dbNalog,
      izSop: sop.radni_nalog,
    });
    setRadniNalog(rn);
    if (dbNalog && !radniNalogEksplicitni && rn === dbNalog.broj_naloga) {
      addToast(`📋 ${formatNalogToast(dbNalog)}`, "info");
    }
    ensureSesija({
      modul: "merljive",
      idDeo: id,
      smena,
      radniNalog: rn,
    });
  }, [sopMap, karakteristike, korisnik, smena, rezimRada, jeLinija, resetKolone, addToast]);

  useEffect(() => {
    if (!slika) { setUrlSlike(null); return; }
    let ok = true;
    ucitajUrlSlike(supabase, "merljive", slika).then(url => {
      if (ok) setUrlSlike(url || lokalnaPutanjaSlike("merljive", slika));
    });
    return () => { ok = false; };
  }, [slika]);

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
    setPoruka("");
    setGrupaAB(ab);
    prethodniAB.current = ab;
    setFotoPoPoziciji({});
    setKomentarPoPoziciji({});
    const cols = koloneZaGrupu(karakteristike, idDeo, ab, potrebanBroj);
    const brojK = cols.filter(c => c.naziv !== "-").length;
    setKolone(cols);
    setKpiSerija(podrazumevaniKpiIzMerenja({ kolone: cols, potrebanBroj, brojKolona: brojK }));
    setAktivnaKolona(indeksSledecePrazno(cols, potrebanBroj, 0));
    if (idDeo) {
      setUnosKorak(pocetniKorakUnosMer(korisnik?.uloga, rezimRada));
      if (jeLinija && force) setLinijaKorak(koristiMobLinija ? 2 : 1);
    }
  };

  const prebaciNaSledecuSerijuPosleSnimanja = (sacuvanaSerija) => {
    const idx = grupe.indexOf(sacuvanaSerija);
    if (idx < 0 || idx >= grupe.length - 1) return false;
    const sledeca = grupe[idx + 1];
    prebaciGrupu(sledeca, true);
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
    setPoruka("");
  };

  const idUcitajTimer = useRef(null);

  const onIdChange = (v, { potvrdi = false, radniNalogEksplicitni } = {}) => {
    const s = String(v || "").trim().toUpperCase();
    if (prethodniId.current && s !== prethodniId.current && !mozePreskociti) {
      if (!svaMerenjaZavrsena(kolone, potrebanBroj)) {
        setPoruka("Moraš završiti sva merenja pre promene ID!");
        setIdDeo(prethodniId.current);
        return;
      }
    }
    setIdDeo(s);
    clearTimeout(idUcitajTimer.current);
    if (!s) {
      prethodniId.current = "";
      prethodniAB.current = "";
      setGrupe([]);
      setGrupaAB("");
      setSacuvaneGrupe([]);
      setPrekidOdobrenId(null);
      setRadniNalog("");
      setNalogInfo(null);
      resetKolone(5);
      return;
    }
    if (potvrdi && s.length >= 3) {
      ucitajDeo(s, { radniNalogEksplicitni });
      return;
    }
    if (s.length >= 3) {
      idUcitajTimer.current = setTimeout(
        () => ucitajDeo(s, { radniNalogEksplicitni }),
        500,
      );
    }
  };

  const potvrdiIdDeo = useCallback((v) => {
    const s = String(v ?? idDeo ?? "").trim().toUpperCase();
    clearTimeout(idUcitajTimer.current);
    if (s.length >= 3) onIdChange(s, { potvrdi: true });
  }, [idDeo]);

  const obradiBarkodSken = useCallback((raw) => {
    const p = parsiBarkod(raw);
    const eksplicitniRn = p?.radni_nalog
      ? String(p.radni_nalog).trim().toUpperCase()
      : "";
    const res = primeniParsiraniBarkod(p, {
      postaviId: (id) => onIdChange(id, { potvrdi: true, radniNalogEksplicitni: eksplicitniRn }),
      postaviSmena: setSmena,
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
    return imaBiloSta(kolone);
  }, [idDeo, kolone]);
  const mozeObrisati = useMemo(() => imaBiloSta(kolone), [kolone]);

  const kolonaJePuna = useCallback((k) => (
    k?.naziv !== "-" && (k?.merenja?.length || 0) >= potrebanBroj
  ), [potrebanBroj]);

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
      fokusirajKolonu(sledeca);
    }
    return sledeca;
  }, [potrebanBroj, fokusirajKolonu]);

  useEffect(() => {
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
  }, [aktivnaKolona, unosKorak, kolone, potrebanBroj, kolonaJePuna, fokusirajKolonu]);

  const indeksiMerljivih = useMemo(
    () => kolone.map((k, i) => (k.naziv !== "-" ? i : -1)).filter(i => i >= 0),
    [kolone],
  );

  const prikazIndeksKolone = useMemo(() => {
    if (L.mobTabKarusel) {
      if (aktivnaKolona >= 0 && aktivnaKolona < kolone.length) return aktivnaKolona;
      return 0;
    }
    if (!indeksiMerljivih.length) return -1;
    if (indeksiMerljivih.includes(aktivnaKolona)) return aktivnaKolona;
    return indeksiMerljivih[0];
  }, [L.mobTabKarusel, kolone.length, indeksiMerljivih, aktivnaKolona]);

  useEffect(() => {
    if (!L.mobTabKarusel || unosKorak !== "forma") return;
    if (aktivnaKolona < 0 || aktivnaKolona >= kolone.length) {
      setAktivnaKolona(0);
    }
  }, [L.mobTabKarusel, aktivnaKolona, unosKorak, kolone.length]);

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
    setAktivnaKolona((i) => {
      const tren = i < 0 ? 0 : i;
      const prazna = indeksSledecePrazno(koloneRef.current, potrebanBroj, tren + 1);
      if (prazna >= 0) return prazna;
      return tren < kolone.length - 1 ? tren + 1 : tren;
    });
    document.activeElement?.blur?.();
  }, [kolone.length, potrebanBroj]);

  const idiPrethodnaKolonaMob = useCallback(() => {
    setAktivnaKolona((i) => {
      const tren = i < 0 ? 0 : i;
      return tren > 0 ? tren - 1 : tren;
    });
    document.activeElement?.blur?.();
  }, []);

  const dodajMerenje = useCallback((idx, rawOverride) => {
    const k0 = koloneRef.current[idx];
    if (!k0 || k0.naziv === "-") return false;
    if (k0.merenja.length >= potrebanBroj) {
      prebaciNaSledecuPraznuKolonu(idx + 1);
      return false;
    }
    const kalBlok = kalUpozorenja.find(u => u.pozicija === k0.naziv && kalibracijaBlokiraUnos(u.status));
    if (kalBlok && !mozeUpRikosKalibracije) {
      setPoruka(
        `Merilo „${k0.instrument}” — kalibracija istekla. `
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
      setKolone(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], input: "" };
        return next;
      });
      return false;
    }

    setPoruka("");
    const status = proveriOkNok(val.vrednost, k0.lslDec, k0.uslDec, k0.jedinica);
    let sledecaIdx = idx;
    setKolone(prev => {
      const next = [...prev];
      const col = { ...next[idx] };
      col.merenja = [...col.merenja, { raw: val.vrednost, dec: val.dec }];
      if (status === "OK") col.cntOK += 1;
      else col.cntNOK += 1;
      col.input = "";
      col.ukupnoLabel = `${col.merenja.length} / ${potrebanBroj}`;
      next[idx] = col;
      if (col.merenja.length >= potrebanBroj) {
        sledecaIdx = indeksSledecePrazno(next, potrebanBroj, idx + 1);
      }
      return next;
    });

    if (sledecaIdx >= 0) {
      setAktivnaKolona(sledecaIdx);
      fokusirajKolonu(sledecaIdx);
    } else {
      setAktivnaKolona(-1);
    }
    return true;
  }, [potrebanBroj, kalUpozorenja, mozeUpRikosKalibracije, mozeAdmin, fokusirajKolonu, prebaciNaSledecuPraznuKolonu]);

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

  const blurInputMerenja = useCallback((i) => {
    const k = koloneRef.current[i];
    if (kolonaJePuna(k)) return;
    const inpVal = String(k?.input || "").trim();
    if (!inpVal) return;
    dodajMerenje(i, inpVal);
  }, [dodajMerenje, kolonaJePuna]);

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
      dodajMerenje(i);
      return;
    }
    if (e.key === "Tab" && !e.shiftKey && String(k.input || "").trim()) {
      e.preventDefault();
      dodajMerenje(i);
    }
  }, [dodajMerenje, kolonaJePuna, prebaciNaSledecuPraznuKolonu]);

  const obrisiPoslednje = () => {
    setKolone(prev => prev.map(k => {
      if (k.naziv === "-" || !k.merenja.length) return k;
      const col = { ...k };
      const last = col.merenja[col.merenja.length - 1];
      const st = proveriOkNok(last.raw, col.lslDec, col.uslDec, col.jedinica);
      if (st === "OK") col.cntOK = Math.max(0, col.cntOK - 1);
      else col.cntNOK = Math.max(0, col.cntNOK - 1);
      col.merenja = col.merenja.slice(0, -1);
      col.ukupnoLabel = `${col.merenja.length} / ${potrebanBroj}`;
      return col;
    }));
  };

  const parsirajDatum = (d) => {
    const m = String(d).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return new Date().toISOString().slice(0, 10);
  };

  const sacuvaj = async () => {
    if (snima || !idDeo) return;
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
      if (!prebaciNaSledecuSerijuPosleSnimanja(grupaAB)) {
        setPoruka(`Offline sačuvano. Sinhronizuj kada bude mreža. Sesija: ${sesija_id}`);
      }
      return;
    }

    const { error } = await supabase.from("merenja_varijabilna").insert(rows);
    if (!error) {
      const { error: errKpi } = await snimiKpiUnos(supabase, kpiPayload);
      if (errKpi) addToast(porukaKpiGreske(errKpi), "greska");
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

    if (prebaciNaSledecuSerijuPosleSnimanja(grupaAB)) {
      return;
    }
    const labelPrekid = !potpuna ? " (prekid sesije)" : "";
    setPoruka(`Serija ${grupaAB} sačuvana${labelPrekid}. Sva merenja za ovaj ID su kompletirana — forma se resetuje.`);
    novaSesija({ modul: "merljive", idDeo: "", smena, radniNalog: "" });
    setIdDeo("");
    setRadniNalog("");
    setNazivDela("");
    setLinija("");
    setMasina("-");
    setSlika("");
    prethodniId.current = "";
    prethodniAB.current = "";
    setGrupe([]);
    setGrupaAB("");
    setSacuvaneGrupe([]);
    setPrekidOdobrenId(null);
    setKpiSerija(podrazumevaniKpiIzMerenja({ kolone: [], potrebanBroj: 5, brojKolona: 0 }));
    resetKolone(5);
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
      <button type="button" disabled={!mozeSacuvati || snima || !!greskaDb} onClick={sacuvaj}
        style={{
          background: mozeSacuvati ? C.zelena : C.hover, border: "none", borderRadius: 6,
          color: "#fff",
          padding: "9px 8px",
          cursor: mozeSacuvati ? "pointer" : "not-allowed",
          fontWeight: 700, fontSize: 11, boxSizing: "border-box",
        }}>
        {snima ? "Snimam…" : (prekidOdobrenId && !serijaPotpuna ? "Sačuvaj (prekid)" : "Sačuvaj seriju")}
      </button>
    </div>
  );

  const prikaziMerljiveFormu = idDeo && grupaAB && unosKorak === "forma" && (
    !jeLinija || (koristiMobLinija && linijaKorak === 3) || (jeLinija && !koristiMobLinija)
  );
  const linijaListaDesktop = jeLinija && !koristiMobLinija && unosKorak === "forma" && idUcitano;

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
      <button type="button" disabled={!mozeSacuvati || snima || !!greskaDb} onClick={sacuvaj}
        style={{
          background: mozeSacuvati ? C.zelena : C.hover, border: "none", borderRadius: 6,
          color: "#fff", padding: "5px 8px", minHeight: 30,
          cursor: mozeSacuvati ? "pointer" : "not-allowed",
          fontWeight: 700, fontSize: 9, flex: 1, maxWidth: "48%", whiteSpace: "nowrap",
        }}>
        {snima ? "Snimam…" : (prekidOdobrenId && !serijaPotpuna
          ? (ekran.w < 360 ? "Sačuvaj*" : "Sačuvaj (prekid)")
          : (ekran.w < 360 ? "Sačuvaj" : "Sačuvaj seriju"))}
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

  const serijaDugmad = (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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
              ...inp,
              width: "auto",
              minWidth: 32,
              padding: "3px 8px",
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
      <label style={{ ...lblGen, ...flexPolje(G.polja.smena) }}>
        Smena
        <select style={inpGen} value={smena} onChange={e => setSmena(e.target.value)}>
          {["1", "2", "3"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
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
          title={nalogInfo?.kupac ? `Kupac: ${nalogInfo.kupac}` : undefined}
        />
      </label>
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
              {metaRed("Merni instrument", k.instrument, undefined, K)}
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
              Razuman opseg: {formatOpsegPlausibilnosti(k.plausibilnost, k.jedinica)}
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
                  {mobMetaCelija("Merni instrument", k.instrument, undefined, "right", K)}
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
                    inputMode={inputModeMerenja(k)}
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
                    }}
                    value={k.input}
                    onFocus={(e) => {
                      if (kolonaJePuna(k)) {
                        e.target.blur();
                        prebaciNaSledecuPraznuKolonu(i + 1);
                        return;
                      }
                      onFocusTastatura(e);
                      setAktivnaKolona(i);
                    }}
                    onChange={e => promeniInputMerenja(i, sanitizujInputMerenja(e.target.value, k), k)}
                    onBlur={() => blurInputMerenja(i)}
                    onKeyDown={e => keyDownInputMerenja(e, i, k)}
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
                  Razuman opseg: {formatOpsegPlausibilnosti(k.plausibilnost, k.jedinica)}
                </div>
              )}
              {!kolonaPuna && (
              <button type="button" onClick={() => dodajMerenje(i)}
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
                  }}
                  onChange={e => promeniInputMerenja(i, sanitizujInputMerenja(e.target.value, k), k)}
                  onBlur={() => blurInputMerenja(i)}
                  onKeyDown={e => keyDownInputMerenja(e, i, k)}
                  title={k.plausibilnost
                    ? `Dozvoljen opseg: ${formatOpsegPlausibilnosti(k.plausibilnost, k.jedinica)}`
                    : undefined}
                  placeholder={koristiUgaoUnosKolone(k)
                    ? "440000 = 44°00′00″"
                    : (k.plausibilnost ? "u opsegu npr. 33" : "0,00")}
                />
              )}
              {!kolonaPuna && (
              <button type="button" onClick={() => dodajMerenje(i)}
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

  const merljiveFormaBlok = prikaziMerljiveFormu && (
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
      {!L.mobTabKarusel && (
        <div style={{ fontSize: 10, color: C.zuta, marginBottom: 4, flexShrink: 0, flex: "0 0 auto" }}>
          Serija {grupaAB}: unesi {potrebanBroj} merenja po koloni, pa Sačuvaj.
          {ciljSesije > 0 && (
            <span style={{ color: C.sivi }}> · Preostalo serija: {preostaloSesije} / {ciljSesije}</span>
          )}
        </div>
      )}
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
            {idDeo && serijaPotpuna && (
              <div style={{ flexShrink: 0, overflowY: "auto", marginBottom: 2 }}>
                <SkartDoradaOeePanel C={C} kompakt vrednosti={kpiSerija} onChange={setKpiSerija}
                  podnaslov={`Serija ${grupaAB || "—"} · popunite pre Sačuvaj`} />
              </div>
            )}
            <MerljivaMobTabKarusel
              key={viewportKey}
              C={C}
              brojKolona={kolone.length}
              aktivnaKolona={prikazIndeksKolone}
              onPrethodna={idiPrethodnaKolonaMob}
              onSledeca={idiSledecaKolonaMob}
              urlSlike={urlSlike}
              slika={slika}
              idDeo={idDeo}
              onZoomSlika={() => setZoomSlika(true)}
              sredinaZaglavlje={mobSerijaStatus}
            >
              {renderKolonaKartica(kolone[prikazIndeksKolone], prikazIndeksKolone, true)}
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
                {kolone.map((k, i) => (
                  <div key={i} style={{
                    opacity: k.naziv === "-" ? 0.4 : 1,
                    height: "100%",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}>
                    {renderKolonaKartica(k, i, false)}
                  </div>
                ))}
              </div>
              {idDeo && serijaPotpuna && (
                <div style={{ flexShrink: 0, maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                  <SkartDoradaOeePanel C={C} kompakt vrednosti={kpiSerija} onChange={setKpiSerija}
                    podnaslov={`Serija ${grupaAB || "—"} · popunite pre Sačuvaj`} />
                </div>
              )}
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
    </div>
  );

  const trebaCekListaMer = tab === "unos" && !kontrolnaListaOk && (jeLinija ? !!(idDeo && idUcitano) : true);

  if (trebaCekListaMer) {
    const idZaListu = jeLinija && idDeo && idUcitano ? String(idDeo || "").trim().toUpperCase() : null;
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
              {mozePrebacivanjeRezima(korisnik?.uloga) && typeof onPromeniRezim === "function" && (
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
        <GageRRPanel C={C} addToast={addToast} korisnik={korisnik} />
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

      {tab === "merila" && (
        <KalibracijaMerilaPanel korisnik={korisnik} C={C} addToast={addToast} />
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
          setSmena={setSmena}
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
          ucitava={ucitava || nalogUcitava}
          poruka={poruka}
          idUcitano={idUcitano}
          unosKorak={unosKorak}
          setUnosKorak={setUnosKorak}
          korisnik={korisnik}
          kontrolnaListaOk={kontrolnaListaOk}
          kalUpozorenja={kalUpozorenja}
          kalibracijaOdobrena={kalibracijaOdobrena}
          mozeAdmin={mozeAdmin}
          onToggleKalibracijaOdobrenje={toggleKalibracijaOdobrenje}
          kalibracijaCeka={!!kalibracijaCekaId}
          onZahtevKalibracija={() => setPokaziZahtevKal(true)}
          onNoviDeo={noviDeoLinija}
          slikaNaziv={slika}
          urlSlike={urlSlike}
          C={C}
        >
          {linijaKorak === 3 && merljiveFormaBlok}
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
          {poruka && (
            <div style={{
              background: poruka.includes("uspešno") || poruka.includes("kompletirana") ? C.ok : `${C.zuta}20`,
              border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, marginBottom: 8, fontSize: 11,
            }}>
              {poruka}
            </div>
          )}
          {generalijeGornjiRed}
          {merljiveFormaBlok}
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
            setSmena={setSmena}
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
            poruka={poruka}
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
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.border, fontSize: 13 }}>
                Unesi ID dela i izaberi seriju
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
                  kontrolnaListaOk={kontrolnaListaOk}
                  kalibracijaOdobrena={kalibracijaOdobrena}
                  mozeAdmin={mozeAdmin}
                  kalibracijaCeka={!!kalibracijaCekaId}
                  onZahtevKalibracija={() => setPokaziZahtevKal(true)}
                  onToggleKalibracijaOdobrenje={toggleKalibracijaOdobrenje}
                  onDalje={() => setUnosKorak("forma")}
                  daljeLabel="Unos merenja →"
                />
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

        {desktopUnos ? generalijeGornjiRed : (
        <div style={{ marginBottom: 6, flexShrink: 0, width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
          <SmenaIdUnosRed
            C={C}
            akcent={C.zelena}
            smena={smena}
            setSmena={setSmena}
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
              {linija && nazivDela && (
                <span style={{ color: C.sivi, fontWeight: 400, marginLeft: 8, fontSize: 10 }}>{linija}</span>
              )}
            </div>
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
                kontrolnaListaOk={kontrolnaListaOk}
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

        {merljiveFormaBlok}
      </div>
      )}
    </div>
  );
}
