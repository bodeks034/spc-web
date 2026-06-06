import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ZahtevPrekid, ucitajOdobrenPrekid, zatvoriPrekidZahtev } from "./lib/kontrolaSesije.jsx";
import {
  toDec, isStepen, koristiUgaoUnosKolone, validirajUnos, proveriOkNok, bojaMerenja, bojaUnosMerenja,
  formatOpsegPlausibilnosti,
  svaMerenjaZavrsena, imaBiloSta, grupeMerenja, koloneZaGrupu,
  filterKeyUnos, sanitizujInputMerenja,
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
import { useEkran, layoutListaMerljive, layoutPokaYokeMerljive } from "./layout/index.js";
import SkartDoradaOeePanel, { OeeKpiTab } from "./components/SkartDoradaOeePanel.jsx";
import { podrazumevaniKpiIzMerenja } from "./lib/oeeKpi.js";
import { snimiKpiUnos, porukaKpiGreske } from "./lib/kpiUnos.js";
import { useOfflineQueue } from "./lib/offlineQueue.js";
import { mozeTabMerljive, jeKvalitetIliVise, jeAdmin, opisUloge, mozeAnalitika as mozeAnalitikaUloga, mozePrebacivanjeRezima, jeKontrolorLinija, pocetniKorakUnosMer } from "./lib/uloge.js";
import {
  mapaMerila,
  upozorenjaInstrumentaZaKolone,
  kalibracijaBlokiraUnos,
} from "./lib/meriloStatus.js";
import {
  jeKalibracijaOdobrena,
  postaviKalibracijaOdobrena,
} from "./lib/kalibracijaOdobrenje.js";
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
import { parsiBarkod, useBarcodeScanner } from "./lib/barkod.js";
import { indeksSledecePrazno } from "./lib/meriloUvoz.js";
import { porukaDbGreske } from "./lib/dbGreske.js";
import LinijaWizardNav, { KORACI_MERLJIVE_LINIJA, KORACI_MERLJIVE_KONTROLOR } from "./components/LinijaWizardNav.jsx";
import MobilniMerljiviUnos from "./components/MobilniMerljiviUnos.jsx";
import MerljiveLinijaLeviPanel from "./components/MerljiveLinijaLeviPanel.jsx";
import MerljivaMobTabKarusel from "./components/MerljivaMobTabKarusel.jsx";

function danasSr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function prazneKolone(n) {
  return koloneZaGrupu([], "", "", n);
}

export default function VarijabilneForma({ korisnik, onOdjava, onNazad, C, unosRezim = "rucni", rezimRada = "analitika", onPromeniRezim }) {
  const digitalniUnos = unosRezim === "digital";
  const ekran = useEkran();
  const jeLinija = rezimRada === "linija";
  const kontrolorLinija = jeKontrolorLinija(korisnik?.uloga, rezimRada);
  const koristiMobLinija = jeLinija && ekran.linijaUredjaj;
  const L = layoutListaMerljive(ekran, { koristiMobLinija });
  const P = layoutPokaYokeMerljive(ekran);
  const [tab, setTab] = useState("unos");
  const [toasts, setToasts] = useState([]);
  const [logD, setLogD] = useState([]);
  const [loadLog, setLoadLog] = useState(false);
  const mozeAdmin = jeAdmin(korisnik?.uloga);
  const mozeAnalitika = mozeAnalitikaUloga(korisnik?.uloga);

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
  const [smena, setSmena] = useState("1");
  const [idDeo, setIdDeo] = useState("");
  const [radniNalog, setRadniNalog] = useState("");
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
  const [prekidOdobrenId, setPrekidOdobrenId] = useState(null);
  const [pokaziZahtev, setPokaziZahtev] = useState(false);
  const [fotoPoPoziciji, setFotoPoPoziciji] = useState({});
  const [komentarPoPoziciji, setKomentarPoPoziciji] = useState({});
  const [merenjaHeatmap, setMerenjaHeatmap] = useState([]);
  const [kpiSerija, setKpiSerija] = useState(() => podrazumevaniKpiIzMerenja({ kolone: [], potrebanBroj: 5, brojKolona: 0 }));
  const [aktivnaKolona, setAktivnaKolona] = useState(-1);
  const [merilaLista, setMerilaLista] = useState([]);
  const [kontrolnaListaOk, setKontrolnaListaOk] = useState(
    () => sessionStorage.getItem("spc_lista_ok_varijabilne") === "1",
  );
  const [kalOdobrenRev, setKalOdobrenRev] = useState(0);
  const [unosKorak, setUnosKorak] = useState("poka");
  const [linijaKorak, setLinijaKorak] = useState(1);
  const kalibracijaOdobrena = useMemo(
    () => jeKalibracijaOdobrena(idDeo),
    [idDeo, kalOdobrenRev],
  );
  const mozeUpRikosKalibracije = mozeAdmin || kalibracijaOdobrena;

  const deloviLista = useMemo(
    () => Object.values(sopMap).map(s => ({ id_deo: s.id_deo, naziv_dela: s.naziv_dela })),
    [sopMap],
  );

  const prethodniId = useRef("");
  const prethodniAB = useRef("");
  const prethodnaSmenaPoka = useRef(smena);
  const inputRefs = useRef([]);

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

  useEffect(() => {
    if (!mozeTabMerljive(tab, korisnik?.uloga, rezimRada)) {
      setTab("unos");
    }
  }, [tab, korisnik?.uloga, rezimRada]);

  useEffect(() => {
    if (jeLinija && tab !== "unos" && tab !== "log") setTab("unos");
  }, [jeLinija, tab]);

  const resetKolone = useCallback((broj) => {
    setKolone(prazneKolone(broj));
    setFotoPoPoziciji({});
    setKomentarPoPoziciji({});
  }, []);

  const ucitajDeo = useCallback((sID) => {
    const id = String(sID || "").trim().toUpperCase();
    if (!id) return;

    const sop = sopMap[id];
    if (!sop) {
      setPoruka(`ID ${id} nije u SOP listi varijabilnih delova.`);
      return;
    }
    setPoruka("");
    setRadniNalog(sop.radni_nalog || "");
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
    setAktivnaKolona(indeksSledecePrazno(cols, potrebanBroj, 0));
    prethodniId.current = id;
    setUnosKorak(pocetniKorakUnosMer(korisnik?.uloga, rezimRada));
    if (jeLinija) setLinijaKorak(1);
    ensureSesija({
      modul: "merljive",
      idDeo: id,
      smena,
      radniNalog: sop.radni_nalog || radniNalog,
    });
  }, [sopMap, karakteristike, korisnik, smena, radniNalog, rezimRada]);

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

  const idUcitano = !!(idDeo && nazivDela && grupe.length && grupaAB);

  useEffect(() => {
    if (!idDeo || idDeo.length < 3) setLinijaKorak(1);
  }, [idDeo]);

  const noviDeoLinija = () => {
    onIdChange("");
    setLinijaKorak(1);
    setUnosKorak("poka");
    setPoruka("");
  };

  const onIdChange = (v) => {
    const s = String(v || "").trim().toUpperCase();
    if (prethodniId.current && s !== prethodniId.current && !mozePreskociti) {
      if (!svaMerenjaZavrsena(kolone, potrebanBroj)) {
        setPoruka("Moraš završiti sva merenja pre promene ID!");
        setIdDeo(prethodniId.current);
        return;
      }
    }
    setIdDeo(s);
    if (s) ucitajDeo(s);
    else {
      prethodniId.current = "";
      prethodniAB.current = "";
      setGrupe([]);
      setGrupaAB("");
      setSacuvaneGrupe([]);
      setPrekidOdobrenId(null);
      resetKolone(5);
    }
  };

  const onGrupaChange = (ab) => prebaciGrupu(ab);

  useBarcodeScanner(useCallback((raw) => {
    if (tab !== "unos") return;
    const p = parsiBarkod(raw);
    if (!p?.id_deo) return;
    onIdChange(p.id_deo.toUpperCase());
    addToast(`📷 Barkod: ${p.id_deo}${p.radni_nalog ? ` · ${p.radni_nalog}` : ""}`, "uspeh");
    if (p.smena && [1, 2, 3].includes(p.smena)) setSmena(String(p.smena));
  }, [tab, addToast, onIdChange]), { enabled: tab === "unos", ignoreInputs: true });

  const mozeSacuvati = useMemo(() => {
    if (!idDeo) return false;
    if (svaMerenjaZavrsena(kolone, potrebanBroj)) return true;
    return mozePreskociti && imaBiloSta(kolone);
  }, [kolone, potrebanBroj, idDeo, mozePreskociti]);
  const mozeObrisati = useMemo(() => imaBiloSta(kolone), [kolone]);

  useEffect(() => {
    if (unosKorak !== "forma" || aktivnaKolona < 0) return;
    const id = requestAnimationFrame(() => {
      inputRefs.current[aktivnaKolona]?.focus?.();
    });
    return () => cancelAnimationFrame(id);
  }, [aktivnaKolona, unosKorak]);

  const indeksiMerljivih = useMemo(
    () => kolone.map((k, i) => (k.naziv !== "-" ? i : -1)).filter(i => i >= 0),
    [kolone],
  );

  useEffect(() => {
    if (!L.mobTabKarusel || unosKorak !== "forma" || !indeksiMerljivih.length) return;
    if (!indeksiMerljivih.includes(aktivnaKolona)) {
      setAktivnaKolona(indeksiMerljivih[0]);
    }
  }, [L.mobTabKarusel, indeksiMerljivih, aktivnaKolona, unosKorak, ekran.viewportKey]);

  const idiPrethodnaKolona = useCallback(() => {
    const idx = indeksiMerljivih.indexOf(aktivnaKolona);
    if (idx > 0) setAktivnaKolona(indeksiMerljivih[idx - 1]);
  }, [indeksiMerljivih, aktivnaKolona]);

  const idiSledecaKolona = useCallback(() => {
    const idx = indeksiMerljivih.indexOf(aktivnaKolona);
    if (idx >= 0 && idx < indeksiMerljivih.length - 1) setAktivnaKolona(indeksiMerljivih[idx + 1]);
  }, [indeksiMerljivih, aktivnaKolona]);

  const dodajMerenje = (idx) => {
    const k = kolone[idx];
    if (!k || k.naziv === "-") return;
    if (k.merenja.length >= potrebanBroj) {
      setPoruka(`Već ste uneli maksimalan broj merenja (${potrebanBroj})!`);
      return;
    }
    const kalBlok = kalUpozorenja.find(u => u.pozicija === k.naziv && kalibracijaBlokiraUnos(u.status));
    if (kalBlok && !mozeUpRikosKalibracije) {
      setPoruka(
        `Merilo „${k.instrument}” — kalibracija istekla. `
        + (mozeAdmin
          ? "Klikni „Admin: dozvoli merenje“ ispod ili kalibriši merilo u tabu MERILA."
          : "Obavesti admina ili kalibriši merilo."),
      );
      return;
    }

    const val = validirajUnos(k.input, k.jedinica, {
      lslDec: k.lslDec,
      uslDec: k.uslDec,
      nominalDec: k.nominalDec,
    });
    if (!val.ok) {
      if (val.poruka) setPoruka(val.poruka);
      setKolone(prev => {
        const next = [...prev];
        next[idx] = { ...next[idx], input: "" };
        return next;
      });
      return;
    }
    setPoruka("");
    const status = proveriOkNok(val.vrednost, k.lslDec, k.uslDec, k.jedinica);
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
    setAktivnaKolona(sledecaIdx);
    if (sledecaIdx >= 0) {
      requestAnimationFrame(() => inputRefs.current[sledecaIdx]?.focus?.());
    }
  };

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
    const potpuna = svaMerenjaZavrsena(kolone, potrebanBroj);
    if (!potpuna && !mozePreskociti) {
      setPoruka(
        `Serija ${grupaAB} nije završena (${potrebanBroj} merenja po koloni). Pošalji zahtev adminu za prekid sesije.`
      );
      setPokaziZahtev(true);
      return;
    }
    if (!imaBiloSta(kolone)) {
      setPoruka("Nema merenja za snimanje.");
      return;
    }
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

  const metaRed = (naslov, vrednost, accent) => (
    <div style={{ fontSize: 10, marginBottom: 3, lineHeight: 1.25, flexShrink: 0 }}>
      <span style={{ color: C.border, fontSize: 8, display: "block", textTransform: "uppercase", letterSpacing: 0.4 }}>
        {naslov}
      </span>
      <span style={{ color: accent || C.tekst, fontWeight: accent ? 600 : 400, fontSize: 10 }}>{vrednost || "—"}</span>
    </div>
  );

  const metaLevoDesno = (levoNaslov, levoVal, desnoNaslov, desnoVal, levoBoja, desnoBoja) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      gap: 6, marginBottom: 3, flexShrink: 0, fontSize: 10, lineHeight: 1.25,
    }}>
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <span style={{ color: C.border, fontSize: 8, display: "block", textTransform: "uppercase", letterSpacing: 0.4 }}>
          {levoNaslov}
        </span>
        <span style={{ color: levoBoja || C.tekst, fontWeight: 500, fontSize: 10 }}>{levoVal ?? "—"}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
        <span style={{ color: C.border, fontSize: 8, display: "block", textTransform: "uppercase", letterSpacing: 0.4 }}>
          {desnoNaslov}
        </span>
        <span style={{ color: desnoBoja || C.tekst, fontWeight: 500, fontSize: 10 }}>{desnoVal ?? "—"}</span>
      </div>
    </div>
  );

  const metaBrojaciOkNok = (nok, ok) => (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 5,
      marginBottom: 5,
      flexShrink: 0,
    }}>
      <div style={{
        background: `${C.crvena}14`,
        border: `1px solid ${C.crvena}40`,
        borderRadius: 5,
        padding: "4px 4px",
        textAlign: "center",
        minHeight: 36,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}>
        <span style={{ color: C.border, fontSize: 8, letterSpacing: 0.8, marginBottom: 2 }}>NOK</span>
        <span style={{
          color: C.crvena, fontSize: 16, fontWeight: 800, lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}>
          {nok ?? 0}
        </span>
      </div>
      <div style={{
        background: `${C.zelena}14`,
        border: `1px solid ${C.zelena}40`,
        borderRadius: 5,
        padding: "4px 4px",
        textAlign: "center",
        minHeight: 36,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}>
        <span style={{ color: C.border, fontSize: 8, letterSpacing: 0.8, marginBottom: 2 }}>OK</span>
        <span style={{
          color: C.zelena, fontSize: 16, fontWeight: 800, lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}>
          {ok ?? 0}
        </span>
      </div>
    </div>
  );

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

  const inpMerenje = {
    ...inp,
    padding: "7px 8px",
    minHeight: 34,
    fontSize: 13,
    fontWeight: 600,
  };

  const padGlavni = L.padGlavni;

  const prikaziZahtevPrekid = imaNepotpunuSesiju && !prekidOdobrenId && !mozeAdmin && imaBiloSta(kolone);

  const dugmadSerije = (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: 6,
      flexShrink: 0,
      width: "100%",
    }}>
      {prikaziZahtevPrekid && (
        <button type="button" onClick={() => setPokaziZahtev(true)}
          style={{
            background: C.zuta, border: "none", borderRadius: 6, color: "#000",
            padding: "10px 12px", cursor: "pointer", fontWeight: 700, fontSize: 11,
            width: "100%", boxSizing: "border-box", lineHeight: 1.3,
          }}>
          ⚠ Zahtev za prekid ({preostaloSesije} serija)
        </button>
      )}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 6,
        width: "100%",
      }}>
        <button type="button" disabled={!mozeObrisati} onClick={obrisiPoslednje}
          style={{
            background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.tekst, padding: "9px 8px", cursor: mozeObrisati ? "pointer" : "not-allowed",
            fontSize: 10, fontWeight: 600, boxSizing: "border-box",
          }}>
          Obriši poslednje
        </button>
        <button type="button" disabled={!mozeSacuvati || snima || !!greskaDb} onClick={sacuvaj}
          style={{
            background: mozeSacuvati ? C.zelena : C.hover, border: "none", borderRadius: 6,
            color: "#fff", padding: "9px 8px", cursor: mozeSacuvati ? "pointer" : "not-allowed",
            fontWeight: 700, fontSize: 11, boxSizing: "border-box",
          }}>
          {snima ? "Snimam…" : (prekidOdobrenId && !serijaPotpuna ? "Sačuvaj (prekid)" : "Sačuvaj seriju")}
        </button>
      </div>
    </div>
  );

  const prikaziMerljiveFormu = idDeo && grupaAB && unosKorak === "forma" && (
    !jeLinija || (koristiMobLinija && linijaKorak === 3) || (jeLinija && !koristiMobLinija)
  );
  const linijaListaDesktop = jeLinija && !koristiMobLinija && unosKorak === "forma" && idUcitano;

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

  const generalijeGornjiRed = desktopUnos && (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
      gap: 8,
      marginBottom: 6,
      flexShrink: 0,
      width: "100%",
    }}>
      <label style={lbl}>Datum<input style={inp} value={datum} onChange={e => setDatum(e.target.value)} /></label>
      <label style={lbl}>Smena
        <select style={inp} value={smena} onChange={e => setSmena(e.target.value)}>
          {["1", "2", "3"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      <label style={lbl}>ID deo *
        <input
          style={inp}
          value={idDeo}
          onChange={e => onIdChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && idDeo.length >= 3) ucitajDeo(idDeo);
          }}
          placeholder="5502-A"
          title={digitalniUnos ? "USB barkod čitač" : "Šifra dela"}
        />
      </label>
      <label style={lbl}>Radni nalog<input style={inp} value={radniNalog} readOnly /></label>
      <label style={lbl}>Naziv dela<input style={inp} value={nazivDela} readOnly /></label>
      <label style={lbl}>Linija<input style={inp} value={linija} readOnly /></label>
      <label style={lbl}>Kontrolor<input style={inp} value={kontrolor} readOnly /></label>
      <label style={lbl}>Mašina<input style={inp} value={masina || "-"} readOnly /></label>
      <label style={lbl}>Serija{serijaDugmad}</label>
    </div>
  );

  const renderKolonaKartica = (k, i, kompakt = false) => (
    <div style={{
      background: C.panel,
      border: aktivnaKolona === i && k.naziv !== "-"
        ? `2px solid ${C.zelena}`
        : `1px solid ${C.border}`,
      borderRadius: 8,
      padding: ekran.mob ? 6 : 8,
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
          {metaRed("Šta se meri", k.naziv, C.plava)}
          {k.nazivMere ? metaRed("Nominala / oznaka", k.nazivMere) : null}
          {metaRed("Merni instrument", k.instrument)}
          {metaRed("Broj merenja", k.ukupnoLabel, C.zuta)}
          {metaLevoDesno("LSL", k.lslText, "USL", k.uslText)}
          {k.plausibilnost && (
            <div style={{ color: C.sivi, fontSize: 8, marginTop: 2, marginBottom: 1, lineHeight: 1.35 }}>
              Razuman opseg: {formatOpsegPlausibilnosti(k.plausibilnost, k.jedinica)}
            </div>
          )}
          <div style={{
            color: C.border, fontSize: 8, textTransform: "uppercase",
            letterSpacing: 0.4, marginTop: 4, marginBottom: 3, flexShrink: 0,
          }}>
            Unos merenja
          </div>
          <input
            ref={el => { inputRefs.current[i] = el; }}
            style={{
              ...inpMerenje,
              marginBottom: 5,
              flexShrink: 0,
              background: bojaUnosMerenja(k.input, k.lslDec, k.uslDec, k.nominalDec, k.jedinica, C),
              outline: aktivnaKolona === i ? `2px solid ${C.zelena}55` : "none",
            }}
            value={k.input}
            onFocus={() => setAktivnaKolona(i)}
            onChange={e => {
              const v = sanitizujInputMerenja(e.target.value, k);
              setKolone(prev => {
                const next = [...prev];
                next[i] = { ...next[i], input: v };
                return next;
              });
            }}
            onBlur={() => {
              const inpVal = String(k.input || "").trim();
              if (!inpVal) return;
              const v = validirajUnos(inpVal, k.jedinica, {
                lslDec: k.lslDec,
                uslDec: k.uslDec,
                nominalDec: k.nominalDec,
              });
              if (!v.ok) {
                setKolone(prev => {
                  const next = [...prev];
                  next[i] = { ...next[i], input: "" };
                  return next;
                });
              }
            }}
            onKeyDown={e => {
              const f = filterKeyUnos(e.key, k.input, k.jedinica, k.plausibilnost);
              if (f === null && e.key.length === 1) e.preventDefault();
              if (e.key === "Enter") { e.preventDefault(); dodajMerenje(i); }
            }}
            title={k.plausibilnost
              ? `Dozvoljen opseg: ${formatOpsegPlausibilnosti(k.plausibilnost, k.jedinica)}`
              : undefined}
            placeholder={koristiUgaoUnosKolone(k)
              ? "440000 = 44°00′00″"
              : (k.plausibilnost ? "u opsegu npr. 33" : "0,00")}
          />
          <button type="button" onClick={() => dodajMerenje(i)}
            style={{
              width: "100%", background: C.plava, border: "none", borderRadius: 5,
              color: "#fff", padding: "5px 0", cursor: "pointer", fontSize: 11,
              marginBottom: 5, flexShrink: 0,
            }}>
            + Dodaj
          </button>
          {metaBrojaciOkNok(k.cntNOK, k.cntOK)}
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
            color: C.border, fontSize: 8, textTransform: "uppercase",
            letterSpacing: 0.4, marginBottom: 2, flexShrink: 0,
          }}>
            Lista merenja
          </div>
          <ul style={{
            listStyle: "none", padding: 0, margin: 0, flex: 1,
            minHeight: kompakt ? 48 : 0,
            maxHeight: kompakt ? 120 : undefined,
            overflow: "auto", fontSize: 11,
            fontVariantNumeric: "tabular-nums",
          }}>
            {k.merenja.map((m, j) => (
              <li key={j} style={{
                padding: "2px 5px",
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

  const merljiveFormaBlok = prikaziMerljiveFormu && (
    <div
      key={L.mobTabKarusel ? `lista-${ekran.viewportKey}` : "lista-desk"}
      style={{
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
        />
      )}
      <div style={{ fontSize: 10, color: C.zuta, marginBottom: 4, flexShrink: 0, flex: "0 0 auto" }}>
        Serija {grupaAB}: unesi {potrebanBroj} merenja po koloni, pa Sačuvaj.
        {ciljSesije > 0 && (
          <span style={{ color: C.sivi }}> · Preostalo serija: {preostaloSesije} / {ciljSesije}</span>
        )}
      </div>
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
        gap: 8,
        overflow: "hidden",
      }}>
        {L.mobTabKarusel ? (
          <>
            {idDeo && serijaPotpuna && (
              <div style={{ flexShrink: 0, overflowY: "auto", marginBottom: 4 }}>
                <SkartDoradaOeePanel C={C} kompakt vrednosti={kpiSerija} onChange={setKpiSerija}
                  podnaslov={`Serija ${grupaAB || "—"} · popunite pre Sačuvaj`} />
              </div>
            )}
            <MerljivaMobTabKarusel
              C={C}
              kolone={kolone}
              aktivnaKolona={aktivnaKolona}
              indeksiMerljivih={indeksiMerljivih}
              onPrethodna={idiPrethodnaKolona}
              onSledeca={idiSledecaKolona}
              crtezVisina={L.crtezVisinaDno}
              urlSlike={urlSlike}
              slika={slika}
              idDeo={idDeo}
              onZoomSlika={() => setZoomSlika(true)}
              dugmadSerije={dugmadSerije}
              CrtezZoomViewer={CrtezZoomViewer}
              indeksUListe={Math.max(0, indeksiMerljivih.indexOf(aktivnaKolona))}
            >
              {indeksiMerljivih.includes(aktivnaKolona)
                && renderKolonaKartica(kolone[aktivnaKolona], aktivnaKolona, true)}
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

  return (
    <div style={{
      height: stackVertikalno ? "100dvh" : "100vh",
      minHeight: stackVertikalno ? "100dvh" : "100vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: C.bg,
      fontFamily: "'IBM Plex Mono', monospace",
      color: C.tekst,
    }}>
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

      <div style={{
        background: C.panel, borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div style={{
          padding: ekran.mob ? "0 6px" : ekran.wide ? "0 8px" : "0 12px",
          minHeight: 48,
          height: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          paddingTop: 8,
          paddingBottom: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <button type="button" onClick={onNazad} style={{ background: "none", border: "none", color: C.sivi, cursor: "pointer", fontSize: ekran.mob ? 16 : 14 }}>←</button>
            <span style={{ color: C.zelena, fontWeight: 700, fontSize: ekran.mob ? 12 : 13 }}>
              {digitalniUnos ? "± DIGITALNI UNOS" : "± RUČNI UNOS"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.sivi }}>
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
            {!ekran.mob && (
              <span style={{ color: C.sivi, fontSize: 10 }} title={opisUloge(korisnik?.uloga, rezimRada)}>
                {korisnik?.ime} · {korisnik?.uloga}
              </span>
            )}
            {mozePrebacivanjeRezima(korisnik?.uloga) && typeof onPromeniRezim === "function" && (
              <button
                type="button"
                onClick={() => onPromeniRezim(jeLinija ? "analitika" : "linija")}
                style={{
                  background: jeLinija ? `${C.zelena}22` : `${C.plava}22`,
                  border: `1px solid ${jeLinija ? C.zelena : C.plava}`,
                  borderRadius: 5, color: jeLinija ? C.zelena : C.plava,
                  fontSize: 9, padding: "3px 8px", cursor: "pointer", fontWeight: 700,
                }}
              >
                {jeLinija ? "📊 Analitika" : "🏭 Linija"}
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
                  fontSize: 9, padding: "3px 8px", cursor: "pointer", fontWeight: 700,
                }}
              >
                {tab === "log" ? "← Unos" : "LOG"}
              </button>
            )}
            <button type="button" onClick={onOdjava} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, color: C.sivi, fontSize: 10, padding: "3px 10px", cursor: "pointer" }}>Odjava</button>
          </div>
        </div>
        {(!jeLinija || !ekran.linijaUredjaj) && TABOVI.length > 1 && (
        <div style={{
          display: "flex",
          borderTop: `1px solid ${C.border}`,
          padding: ekran.mob ? "0 6px" : "0 12px",
          flexWrap: "wrap",
          overflowX: ekran.mob ? "auto" : "visible",
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
        <MerljiveSpcKarte C={C} addToast={addToast} korisnik={korisnik} />
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

      {tab === "trasabilitet" && mozeAnalitika && (
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <TrasabilitetPanel C={C} addToast={addToast} modul="merljive" />
        </div>
      )}

      {tab === "admin" && mozeAdmin && (
        <div style={{ flex: 1, overflow: "auto", padding: 20, maxWidth: 800, margin: "0 auto", width: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 20 }}>
          <OfflineSyncPanel supabase={supabase} C={C} addToast={addToast} online={online} onSync={onFlushed} />
          <SchemaStatusPanel C={C} />
          <KarakteristikeGraniceEditor C={C} korisnik={korisnik} addToast={addToast} />
          <MeriloBarkodUputstvo C={C} />
          <NotifikacijePodesavanja C={C} addToast={addToast} />
          <MerljiveExcelPanel C={C} addToast={addToast} />
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
          potrebanBroj={potrebanBroj}
          ucitava={ucitava}
          poruka={poruka}
          idUcitano={idUcitano}
          unosKorak={unosKorak}
          setUnosKorak={setUnosKorak}
          korisnik={korisnik}
          kontrolnaListaOk={kontrolnaListaOk}
          kalUpozorenja={kalUpozorenja}
          kalibracijaOdobrena={kalibracijaOdobrena}
          mozeAdmin={mozeAdmin}
          onToggleKalibracijaOdobrenje={() => {
            const novo = !kalibracijaOdobrena;
            postaviKalibracijaOdobrena(idDeo, novo);
            setKalOdobrenRev(r => r + 1);
            addToast(
              novo ? "✓ Admin dozvolio merenje uprkos kalibraciji" : "Kalibracija: blokada ponovo uključena",
              novo ? "uspeh" : "info",
            );
          }}
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
                  onToggleKalibracijaOdobrenje={() => {
                    const novo = !kalibracijaOdobrena;
                    postaviKalibracijaOdobrena(idDeo, novo);
                    setKalOdobrenRev(r => r + 1);
                    addToast(
                      novo ? "✓ Admin dozvolio merenje uprkos kalibraciji" : "Kalibracija: blokada ponovo uključena",
                      novo ? "uspeh" : "info",
                    );
                  }}
                  onDalje={() => setUnosKorak("forma")}
                  daljeLabel="Unos merenja →"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "unos" && !jeLinija && (
      <div
        key={stackVertikalno ? `unos-${ekran.viewportKey}` : "unos-desk"}
        style={{
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
        <div style={{
          display: "grid",
          gridTemplateColumns: koristiMobLinija
            ? "repeat(2, minmax(0, 1fr))"
            : L.gridGeneralije,
          gap: koristiMobLinija ? 10 : L.gridGeneralijeGap,
          marginBottom: 6,
          flexShrink: 0,
          width: "100%",
        }}>
          <label style={lbl}>Smena
            <select style={inp} value={smena} onChange={e => setSmena(e.target.value)}>
              {["1", "2", "3"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={{ ...lbl, gridColumn: koristiMobLinija ? "1 / -1" : undefined }}>ID deo *
            <input
              style={{ ...inp, fontSize: koristiMobLinija ? 18 : undefined, fontWeight: koristiMobLinija ? 700 : undefined, textAlign: koristiMobLinija ? "center" : undefined }}
              value={idDeo}
              onChange={e => onIdChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && idDeo.length >= 3) ucitajDeo(idDeo);
              }}
              placeholder="5502-A"
              title={digitalniUnos ? "USB barkod čitač" : "Šifra dela"}
            />
          </label>
          {koristiMobLinija && nazivDela && (
            <div style={{
              gridColumn: "1 / -1", background: `${C.zelena}18`, border: `1px solid ${C.zelena}40`,
              borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 700, color: C.zelena,
            }}>
              {nazivDela}
              {linija && <span style={{ color: C.sivi, fontWeight: 400, marginLeft: 8, fontSize: 10 }}>{linija}</span>}
            </div>
          )}
          <label style={{ ...lbl, gridColumn: koristiMobLinija ? "1 / -1" : undefined }}>Serija{serijaDugmad}</label>
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
                urlSlike={P.urlSlikeUPokaKomponenti ? urlSlike : undefined}
                onToggleKalibracijaOdobrenje={() => {
                  const novo = !kalibracijaOdobrena;
                  postaviKalibracijaOdobrena(idDeo, novo);
                  setKalOdobrenRev(r => r + 1);
                  addToast(
                    novo
                      ? "✓ Admin dozvolio merenje uprkos kalibraciji"
                      : "Kalibracija: blokada ponovo uključena",
                    novo ? "uspeh" : "info",
                  );
                }}
                onDalje={() => setUnosKorak("forma")}
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
