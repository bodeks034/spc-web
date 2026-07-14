import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  fetchMomentJobDetalj,
  fetchMomentKlucevi,
} from "../lib/momentKljucApi.js";
import {
  ucitajMomentJoboveZaDeo,
  snimiMomentProtokol,
} from "../lib/momentKljucDb.js";
import {
  izracunajTolerancijuNm,
  proveriMomentOk,
  momentBlokadaZaKlasu,
  MOMENT_VENDOR_NAZIV,
} from "../lib/momentKljuc.js";
import { urlCrtezAsset } from "../lib/crtezAssets.js";
import { ucitajZavrseneMomentKorake, ucitajMomentKpiLinija, sledeciMomentKorak } from "../lib/momentKljucLinija.js";
import { filtrirajKlucevePoNm } from "../lib/momentKljucListApi.js";
import { MOMENT_ERROR_KOD } from "../lib/momentKljucList.js";
import CrtezSplitModal from "./CrtezSplitModal.jsx";
import DigitalniMomentKljucPanel from "./DigitalniMomentKljucPanel.jsx";
import LinijaWizardNav from "./LinijaWizardNav.jsx";
import MomentEkranKljuca from "./moment/MomentEkranKljuca.jsx";
import MomentLinijaKpiStrip from "./moment/MomentLinijaKpiStrip.jsx";
import MomentDijagramPregled from "./moment/MomentDijagramPregled.jsx";
import IdDeoBarkodRed from "./IdDeoBarkodRed.jsx";
import { normalizujVinBarkod } from "../lib/barkod.js";
import { lokalnaPutanjaMomentDijagram } from "../lib/crtezAssets.js";
import { hotspotZaPoz, viewBoxDijagrama } from "../lib/momentDijagramHotspot.js";
import { useEkran } from "../lib/useEkran.js";
import { stilOmotLinija } from "../layout/tastaturaMobil.js";

const KORACI = [
  { id: "id", label: "ID DELO" },
  { id: "job", label: "IZBOR JOB" },
  { id: "zatezanje", label: "ZATEZANJE" },
];

/**
 * Modul 1 — operator wizard za digitalni momentni ključ.
 */
export default function MomentLinijaPanel({
  C,
  korisnik,
  smena,
  linija,
  idDeo,
  onIdChange,
  onIdPotvrdi,
  radniNalog,
  listaSpremna = true,
  addToast,
  mozeAdmin = false,
  onKljucPovezanChange,
}) {
  const ekran = useEkran();
  const kompaktLinija = ekran.linijaUredjaj || ekran.nizak;
  const [korak, setKorak] = useState("id");
  const [jobovi, setJobovi] = useState([]);
  const [izabraniJobId, setIzabraniJobId] = useState(null);
  const [paket, setPaket] = useState(null);
  const [crtezUrl, setCrtezUrl] = useState(null);
  const [kljucevi, setKljucevi] = useState([]);
  const [meriloId, setMeriloId] = useState("");
  const [aktivniKorak, setAktivniKorak] = useState(null);
  const [ostvarenoNm, setOstvarenoNm] = useState("");
  const [ostvarenoUgao, setOstvarenoUgao] = useState("");
  const [snima, setSnima] = useState(false);
  const [ucitava, setUcitava] = useState(false);
  const [poslednjiStatus, setPoslednjiStatus] = useState(null);
  const [zoomCrtez, setZoomCrtez] = useState(false);
  const [kljucPovezan, setKljucPovezan] = useState(false);
  const [izvorOdcitavanja, setIzvorOdcitavanja] = useState("rucno");
  const [autoSnimi, setAutoSnimi] = useState(() => localStorage.getItem("moment_auto_snimi") === "1");
  const [kpiSnapshot, setKpiSnapshot] = useState(null);
  const [vinKomad, setVinKomad] = useState("");
  const [autoPanelOtvoren, setAutoPanelOtvoren] = useState(
    () => localStorage.getItem("moment_auto_panel") !== "0",
  );
  const snimaRef = useRef(false);
  const aktivniKorakRef = useRef(null);
  const autoSnimiRef = useRef(autoSnimi);
  const izvorRef = useRef("rucno");
  aktivniKorakRef.current = aktivniKorak;
  autoSnimiRef.current = autoSnimi;
  izvorRef.current = izvorOdcitavanja;

  const idNorm = String(idDeo || "").trim().toUpperCase();
  const idSpreman = idNorm.length >= 3;

  const vinStorageKey = izabraniJobId
    ? `moment_vin_${idNorm}_${izabraniJobId}`
    : null;

  useEffect(() => {
    if (!vinStorageKey) return;
    setVinKomad(localStorage.getItem(vinStorageKey) || "");
  }, [vinStorageKey]);

  const sacuvajVin = (v) => {
    const t = normalizujVinBarkod(v);
    setVinKomad(t);
    if (vinStorageKey) {
      if (t) localStorage.setItem(vinStorageKey, t);
      else localStorage.removeItem(vinStorageKey);
    }
  };

  const obradiVinBarkod = (sirovo) => {
    const t = normalizujVinBarkod(sirovo);
    if (!t) return;
    sacuvajVin(t);
    addToast?.(`VIN: ${t}`, "info", 2000);
  };

  const toggleAutoPanel = () => {
    const sledece = !autoPanelOtvoren;
    setAutoPanelOtvoren(sledece);
    localStorage.setItem("moment_auto_panel", sledece ? "1" : "0");
  };

  const akcentLj = C.ljubicasta || "#a78bfa";

  const ucitajJobove = useCallback(async () => {
    if (!idSpreman) {
      setJobovi([]);
      return;
    }
    setUcitava(true);
    try {
      const lista = await ucitajMomentJoboveZaDeo(supabase, {
        idDeo: idNorm,
        linija: linija || null,
      });
      setJobovi(lista);
      if (lista.length === 1) {
        setIzabraniJobId(lista[0].id);
      }
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setUcitava(false);
    }
  }, [idSpreman, idNorm, linija, addToast]);

  const osveziKpi = useCallback(async (jobId, brojKoraka = 0, vin = vinKomad) => {
    if (!jobId) {
      setKpiSnapshot(null);
      return;
    }
    try {
      const kpi = await ucitajMomentKpiLinija(supabase, {
        jobId,
        idDeo: idNorm,
        radniNalog,
        smena,
        ukupnoKoraka: brojKoraka,
        vin,
      });
      setKpiSnapshot(kpi);
    } catch {
      setKpiSnapshot({
        ok: 0, nok: 0, ukupno: 0, maxOk: 0, zavrseniCiklusi: 0,
        fpy: null, poslednjiNok: null, nedavna: [],
      });
    }
  }, [idNorm, radniNalog, smena, vinKomad]);

  const ucitajPaket = useCallback(async (jobId, vin = vinKomad) => {
    if (!jobId) {
      setPaket(null);
      setAktivniKorak(null);
      setCrtezUrl(null);
      return;
    }
    setUcitava(true);
    try {
      const p = await fetchMomentJobDetalj(supabase, jobId);
      setPaket(p);
      if (p?.crtez) {
        setCrtezUrl(await urlCrtezAsset(p.crtez));
      } else {
        setCrtezUrl(null);
      }
      const brojKoraka = p?.koraci?.length || 0;
      const { maxOk } = await ucitajZavrseneMomentKorake(supabase, {
        jobId,
        idDeo: idNorm,
        radniNalog,
        smena,
        ukupnoKoraka: brojKoraka,
        vin,
      });
      const sledeci = sledeciMomentKorak(p?.koraci, maxOk);
      setAktivniKorak(sledeci);
      setOstvarenoNm("");
      setOstvarenoUgao("");
      setPoslednjiStatus(null);
      await osveziKpi(jobId, brojKoraka, vin);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setUcitava(false);
    }
  }, [idNorm, radniNalog, smena, addToast, osveziKpi, vinKomad]);

  useEffect(() => {
    fetchMomentKlucevi(supabase).then(setKljucevi).catch(() => setKljucevi([]));
  }, []);

  useEffect(() => { ucitajJobove(); }, [ucitajJobove]);
  useEffect(() => { ucitajPaket(izabraniJobId); }, [izabraniJobId, ucitajPaket]);

  /** Osveži napredak kad operator skenira / promeni VIN (po komadu). */
  useEffect(() => {
    if (!izabraniJobId || korak !== "zatezanje" || !paket?.koraci?.length) return;
    let alive = true;
    (async () => {
      const brojKoraka = paket.koraci.length;
      const { maxOk } = await ucitajZavrseneMomentKorake(supabase, {
        jobId: izabraniJobId,
        idDeo: idNorm,
        radniNalog,
        smena,
        ukupnoKoraka: brojKoraka,
        vin: vinKomad,
      });
      if (!alive) return;
      setAktivniKorak(sledeciMomentKorak(paket.koraci, maxOk));
      await osveziKpi(izabraniJobId, brojKoraka, vinKomad);
    })();
    return () => { alive = false; };
  }, [vinKomad, izabraniJobId, korak, paket, idNorm, radniNalog, smena, osveziKpi]);

  const tol = useMemo(
    () => (aktivniKorak ? izracunajTolerancijuNm(aktivniKorak) : { min: null, max: null }),
    [aktivniKorak],
  );

  const ukupnoKoraka = paket?.koraci?.length || 0;
  const idxKoraka = aktivniKorak?.redosled || 0;

  const kljuceviZaKorak = useMemo(() => {
    if (!aktivniKorak) return kljucevi;
    return filtrirajKlucevePoNm(kljucevi, aktivniKorak.cilj_nm);
  }, [kljucevi, aktivniKorak]);

  const dijagramFajl = useMemo(() => {
    if (paket?.job?.dijagram_fajl) return paket.job.dijagram_fajl;
    const p = paket?.crtez?.prikaz_putanja || "";
    const m = String(p).match(/Sklop_\d+[^/\\]*\.svg/i);
    return m ? m[0] : null;
  }, [paket]);

  const pozInfo = useMemo(() => {
    if (!aktivniKorak?.poz_br || !paket?.pozicije) return null;
    return paket.pozicije.find((p) => String(p.poz_br) === String(aktivniKorak.poz_br));
  }, [aktivniKorak, paket]);

  const vendorProfil = useMemo(() => {
    if (meriloId) {
      const m = kljucevi.find((k) => String(k.id) === String(meriloId));
      if (m?.vendor_profil) return m.vendor_profil;
    }
    return paket?.job?.vendor_profil || "generic";
  }, [meriloId, kljucevi, paket]);

  const snimiKorak = useCallback(async ({
    nmOverride = null,
    ugaoOverride = null,
    izvor = null,
  } = {}) => {
    const korak = aktivniKorakRef.current;
    if (!korak || !paket?.job || snimaRef.current) return;
    const nmVal = nmOverride != null ? nmOverride : Number(ostvarenoNm);
    const ugaoVal = ugaoOverride != null
      ? ugaoOverride
      : (korak.ugao_cilj != null ? Number(ostvarenoUgao) : null);
    if (!Number.isFinite(nmVal)) return;

    snimaRef.current = true;
    setSnima(true);
    try {
      const izvorUpis = izvor || izvorOdcitavanja || "rucno";
      const { zapis, provera } = await snimiMomentProtokol(supabase, {
        smena: Number(smena),
        idDeo: idNorm,
        radniNalog,
        jobId: paket.job.id,
        korak,
        ostvarenoNm: nmVal,
        ostvarenoUgao: ugaoVal,
        meriloId: meriloId ? Number(meriloId) : null,
        radnikId: korisnik?.radnikId,
        operater: korisnik?.ime,
        linija,
        izvor: izvorUpis,
        vin: vinKomad || null,
      });
      setPoslednjiStatus(provera.ok ? "OK" : "NOK");

      if (provera.ok) {
        const upravoZavrsioKomad = korak.redosled === ukupnoKoraka && ukupnoKoraka > 0;
        const { maxOk, zavrseniCiklusi } = await ucitajZavrseneMomentKorake(supabase, {
          jobId: paket.job.id,
          idDeo: idNorm,
          radniNalog,
          smena,
          ukupnoKoraka,
          vin: vinKomad,
        });
        const sledeci = sledeciMomentKorak(paket.koraci, maxOk);
        if (sledeci) {
          if (upravoZavrsioKomad) {
            addToast?.(
              `✓ Komad ${zavrseniCiklusi} završen — skenirajte VIN za sledeći komad`,
              "uspeh",
            );
            sacuvajVin("");
          } else {
            addToast?.(`✓ Korak ${korak.redosled}/${ukupnoKoraka} OK`, "uspeh");
          }
          setAktivniKorak(sledeci);
          setOstvarenoNm("");
          setOstvarenoUgao("");
          setPoslednjiStatus(null);
        } else {
          addToast?.("✓ Sekvenca završena za ovaj JOB", "uspeh");
        }
      } else {
        const errKod = zapis?.error_kod;
        const errTekst = errKod && MOMENT_ERROR_KOD[errKod] ? ` [${errKod}]` : "";
        addToast?.(`✗ NOK — ${provera.razlog}${errTekst}`, "greska");
        if (momentBlokadaZaKlasu(korak.klasifikacija, korak.blokiraj_na_nok)) {
          addToast?.("VSK/KSK — ponovite zatezanje pre sledećeg koraka", "greska");
        }
      }
      await osveziKpi(paket.job.id, ukupnoKoraka);
      return zapis;
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      snimaRef.current = false;
      setSnima(false);
    }
  }, [
    paket, ostvarenoNm, ostvarenoUgao, meriloId, smena, idNorm, radniNalog,
    korisnik, linija, izvorOdcitavanja, ukupnoKoraka, addToast, osveziKpi, vinKomad,
  ]);

  const onOdcitavanjeKljuča = useCallback((p) => {
    const korak = aktivniKorakRef.current;
    if (!korak || p?.nm == null) return;
    setOstvarenoNm(String(p.nm));
    if (p.ugao != null) setOstvarenoUgao(String(p.ugao));
    const provera = proveriMomentOk(korak, p.nm, p.ugao);
    setPoslednjiStatus(provera.ok ? "OK" : "NOK");
    if (autoSnimiRef.current && provera.ok && !snimaRef.current) {
      snimiKorak({ nmOverride: p.nm, ugaoOverride: p.ugao, izvor: izvorRef.current });
    }
  }, [snimiKorak]);

  const onAutoSnimiChange = useCallback((v) => {
    setAutoSnimi(v);
    localStorage.setItem("moment_auto_snimi", v ? "1" : "0");
  }, []);

  const INP = {
    width: "100%",
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: C.tekst,
    fontSize: ekran.linijaUredjaj ? 22 : 16,
    fontWeight: 700,
    padding: ekran.linijaUredjaj ? "16px 14px" : "12px",
    textAlign: "center",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const INP_UNOS = {
    width: "100%",
    background: C.input,
    border: `2px solid ${C.border}`,
    borderRadius: 8,
    color: C.tekst,
    fontSize: kompaktLinija ? 20 : 18,
    fontWeight: 700,
    padding: "7px 8px",
    textAlign: "center",
    boxSizing: "border-box",
    fontFamily: "inherit",
    minHeight: 0,
  };

  const INP_SELECT = {
    width: "100%",
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.tekst,
    fontSize: 11,
    fontWeight: 500,
    padding: "4px 8px",
    textAlign: "left",
    boxSizing: "border-box",
    fontFamily: "inherit",
    minHeight: 0,
  };

  if (!listaSpremna && !mozeAdmin) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ color: C.zuta, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
            Prvo završite kontrolnu listu smene
          </div>
          <div style={{ color: C.sivi, fontSize: 11, lineHeight: 1.5 }}>
            Otvorite tab UNOS — ček lista se prikazuje na početku smene. Posle toga možete koristiti MOMENT.
          </div>
        </div>
      </div>
    );
  }

  const omot = (content, { skrol = true, padding = null } = {}) => (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      ...stilOmotLinija(ekran, { skrol }),
      ...(padding != null ? { padding } : {}),
    }}>
      <LinijaWizardNav
        korak={korak}
        koraci={KORACI}
        C={C}
        akcent={akcentLj}
        kompakt={ekran.linijaUredjaj || ekran.nizak}
        podnaslov={paket?.job ? `${paket.job.kod_job} · smena ${smena}` : `Smena ${smena}`}
      />
      {content}
    </div>
  );

  if (korak === "id") {
    return omot(
      <div data-testid="moment-linija" style={{ display: "flex", flexDirection: "column", gap: 14, padding: ekran.linijaUredjaj ? 12 : 16 }}>
        <label style={{ color: C.sivi, fontSize: 11, letterSpacing: 1 }}>ID DELO
          <input
            data-testid="moment-id-deo"
            value={idDeo}
            onChange={(e) => onIdChange?.(e.target.value)}
            onBlur={() => onIdPotvrdi?.(idDeo)}
            placeholder="npr. MRAP-001 ili MRAP1-001"
            autoFocus
            style={INP}
          />
        </label>
        <div style={{ color: C.sivi, fontSize: 11 }}>
          RN: <strong style={{ color: C.tekst }}>{radniNalog || "—"}</strong>
          {" · "}Linija: <strong style={{ color: C.tekst }}>{linija || "—"}</strong>
        </div>
        {ucitava && <div style={{ color: C.sivi, fontSize: 11 }}>Učitavam JOB-ove…</div>}
        {idSpreman && !ucitava && jobovi.length === 0 && (
          <div style={{ background: `${C.zuta}20`, border: `1px solid ${C.zuta}`, borderRadius: 8, padding: 12, fontSize: 11 }}>
            Nema JOB-ova za <code>{idNorm}</code>.
            {" "}Proverite tab MOMENT ili Šifrarnik → Moment ključ → Učitaj kompletan šifrarnik.
            {" "}Za MRAP komplet koristite <code>MRAP-001</code> (sekvence se povlače i sa MRAP1 šablona).
          </div>
        )}
        {idSpreman && jobovi.length > 0 && (
          <div style={{ color: C.zelena, fontSize: 12, fontWeight: 700 }}>
            ✓ {jobovi.length} JOB(ova) pronađeno
          </div>
        )}
        <button
          type="button"
          disabled={!idSpreman || jobovi.length === 0}
          onClick={() => setKorak(jobovi.length === 1 ? "zatezanje" : "job")}
          style={{
            marginTop: "auto",
            background: idSpreman && jobovi.length ? (C.ljubicasta || "#a78bfa") : C.hover,
            border: "none",
            borderRadius: 12,
            color: C.onAkcent,
            fontSize: ekran.linijaUredjaj ? 18 : 14,
            fontWeight: 700,
            padding: ekran.linijaUredjaj ? "18px" : "14px",
            cursor: idSpreman && jobovi.length ? "pointer" : "not-allowed",
          }}
        >
          {jobovi.length === 1 ? "Zatezanje →" : "Izaberi JOB →"}
        </button>
      </div>,
    );
  }

  if (korak === "job") {
    return omot(
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
        <button type="button" onClick={() => setKorak("id")} style={{ alignSelf: "flex-start", background: "none", border: "none", color: C.sivi, cursor: "pointer", fontSize: 12 }}>
          ← ID deo
        </button>
        <div style={{ color: C.sivi, fontSize: 10 }}>{idNorm} · izaberite posao na ključu</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {jobovi.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => {
                setIzabraniJobId(j.id);
                setKorak("zatezanje");
              }}
              style={{
                textAlign: "left",
                background: izabraniJobId === j.id ? `${C.ljubicasta || "#a78bfa"}18` : C.panel,
                border: `2px solid ${izabraniJobId === j.id ? (C.ljubicasta || "#a78bfa") : C.border}`,
                borderRadius: 10,
                padding: "14px 16px",
                cursor: "pointer",
                color: C.tekst,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15 }}>{j.kod_job}</div>
              <div style={{ color: C.sivi, fontSize: 11, marginTop: 4 }}>{j.naziv}</div>
              {j.vendor_profil && (
                <div style={{ color: C.sivi, fontSize: 9, marginTop: 4 }}>
                  {MOMENT_VENDOR_NAZIV[j.vendor_profil] || j.vendor_profil}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>,
    );
  }

  const imaSliku = !!(dijagramFajl || crtezUrl);

  const panelSlike = imaSliku && (
    <aside
      style={{
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        alignSelf: "stretch",
      }}
    >
      {dijagramFajl ? (
        <MomentDijagramPregled
          C={C}
          dijagram={dijagramFajl}
          pozBr={aktivniKorak?.poz_br}
          kompakt={ekran.linijaUredjaj}
          sidebar
          onZoom={() => setZoomCrtez(true)}
        />
      ) : (
        <div style={{
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: 6,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          boxSizing: "border-box",
        }}>
          <button
            type="button"
            onClick={() => setZoomCrtez(true)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              minHeight: 0,
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: "zoom-in",
            }}
            title="Uvećaj crtež"
          >
            <img
              src={crtezUrl}
              alt="Crtež dela"
              draggable={false}
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
            />
          </button>
          <button
            type="button"
            onClick={() => setZoomCrtez(true)}
            style={{
              marginTop: 4,
              alignSelf: "center",
              background: `${C.plava || "#3b82f6"}22`,
              border: `1px solid ${C.plava || "#3b82f6"}`,
              borderRadius: 6,
              color: C.plava || "#3b82f6",
              fontSize: 8,
              fontWeight: 700,
              padding: "3px 8px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            🔍
          </button>
        </div>
      )}
    </aside>
  );

  // zatezanje
  return (
    <>
      {omot(
    <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: 4, minHeight: 0, flex: 1, overflowY: "auto", overflowX: "hidden" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flexShrink: 0, minWidth: 0 }}>
        <button type="button" onClick={() => setKorak(jobovi.length > 1 ? "job" : "id")}
          style={{ background: "none", border: "none", color: C.sivi, cursor: "pointer", fontSize: 11, flexShrink: 0, padding: "0 0 6px" }}>
          ← {jobovi.length > 1 ? "JOB" : "ID"}
        </button>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          flex: 1,
          minWidth: 0,
          alignItems: "end",
        }}>
          <label style={{ color: C.sivi, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, minWidth: 0 }}>
            Ključ (SN)
            <select
              value={meriloId}
              onChange={(e) => setMeriloId(e.target.value)}
              style={{
                ...INP_SELECT,
                marginTop: 2,
                fontSize: kompaktLinija ? 11 : 10,
                padding: "6px 8px",
                minHeight: 34,
              }}
            >
              <option value="">Izaberi…</option>
              {kljuceviZaKorak.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.tool_kod || m.serijski_broj || m.naziv}
                  {m.nm_min != null ? ` (${m.nm_min}–${m.nm_max})` : ""}
                </option>
              ))}
            </select>
          </label>
          <IdDeoBarkodRed
            C={C}
            akcent={akcentLj}
            kompaktRed
            idLabel="VIN / serija"
            barkodLabel="📷"
            sirinaBarkod={kompaktLinija ? 36 : 40}
            onBarkodSken={obradiVinBarkod}
            lblStyle={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, marginBottom: 2, color: C.sivi }}
            unosStil={{ fontSize: 11, padding: "6px 8px", borderRadius: 6 }}
          >
            <input
              data-testid="moment-vin-unos"
              value={vinKomad}
              onChange={(e) => sacuvajVin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                obradiVinBarkod(e.currentTarget.value);
              }}
              placeholder="Sken / unos"
              autoComplete="off"
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: C.input,
                border: `1px solid ${vinKomad ? C.zelena : C.border}`,
                borderRadius: 6,
                color: C.tekst,
                fontSize: 11,
                padding: "6px 8px",
                fontFamily: "inherit",
                minHeight: 34,
              }}
            />
          </IdDeoBarkodRed>
        </div>
        <button
          type="button"
          onClick={() => {
            setIzabraniJobId(null);
            setKorak("id");
            onIdChange?.("");
          }}
          style={{
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.sivi,
            fontSize: 10,
            padding: "4px 6px",
            cursor: "pointer",
            flexShrink: 0,
            marginBottom: 2,
          }}
          title="Novi deo / JOB"
        >
          ↺
        </button>
      </div>

      {paket?.job && kpiSnapshot && (
        <MomentLinijaKpiStrip
          C={C}
          kpi={kpiSnapshot}
          ukupnoKoraka={ukupnoKoraka}
          jobKod={paket.job.kod_job}
          kompakt={kompaktLinija}
        />
      )}

      {!aktivniKorak && !ucitava && paket?.koraci?.length > 0 && (
        <div style={{ color: C.zelena, fontSize: 13, fontWeight: 700, textAlign: "center", padding: 16, flex: 1 }}>
          ✓ Komad završen za {paket?.job?.kod_job}
          {kpiSnapshot?.zavrseniCiklusi > 0 && (
            <span style={{ display: "block", color: C.sivi, fontSize: 11, fontWeight: 500, marginTop: 6 }}>
              Danas: {kpiSnapshot.zavrseniCiklusi} komad(a) · učitavam sledeći…
            </span>
          )}
        </div>
      )}

      {aktivniKorak && (
        <div style={{
          display: "grid",
          gridTemplateColumns: imaSliku ? "minmax(0, 3fr) minmax(0, 2fr)" : "1fr",
          flex: "1 1 auto",
          minHeight: 0,
          gap: 8,
          alignItems: "start",
        }}>
          <div style={{
            minWidth: 0,
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}>
          {/* 1. Automatski unos — savitljiv panel */}
          <div style={{
            border: `1px solid ${akcentLj}50`,
            borderRadius: 8,
            background: `${akcentLj}08`,
            flexShrink: 0,
            overflow: "hidden",
          }}>
            <button
              type="button"
              onClick={toggleAutoPanel}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "8px 10px",
                background: `${akcentLj}14`,
                border: "none",
                cursor: "pointer",
                color: akcentLj,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.4,
                textAlign: "left",
              }}
            >
              <span>
                AUTOMATSKI UPIS · KLJUČ
                {kljucPovezan && (
                  <span style={{ color: C.zelena, marginLeft: 6 }}>● povezan</span>
                )}
              </span>
              <span style={{ fontSize: 11, flexShrink: 0 }} aria-hidden>
                {autoPanelOtvoren ? "▲" : "▼"}
              </span>
            </button>
            {(autoPanelOtvoren || kljucPovezan) && (
              <div style={{ padding: autoPanelOtvoren ? "4px 8px 8px" : "4px 8px" }}>
                <DigitalniMomentKljucPanel
                  C={C}
                  addToast={addToast}
                  kompakt
                  bezZaglavlja
                  vendorProfil={vendorProfil}
                  ciljNm={aktivniKorak.cilj_nm}
                  autoSnimi={autoSnimi}
                  onAutoSnimiChange={onAutoSnimiChange}
                  onPovezanChange={(p, tip) => {
                    setKljucPovezan(p);
                    onKljucPovezanChange?.(p, tip);
                    if (tip) {
                      setIzvorOdcitavanja(tip);
                      izvorRef.current = tip;
                    }
                  }}
                  onOdcitavanje={onOdcitavanjeKljuča}
                  prikaziRucniUvoz={autoPanelOtvoren}
                />
              </div>
            )}
          </div>

          {/* 2. Ručni unos — ispod automatskog */}
          <div style={{
            background: `${akcentLj}10`,
            border: `1px solid ${kljucPovezan ? C.border : `${akcentLj}55`}`,
            borderRadius: 8,
            padding: "8px 10px",
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 9, color: C.sivi, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>
              RUČNI UNOS Nm
            </div>
            <div style={{
              fontSize: 10,
              color: C.sivi,
              flexShrink: 0,
              marginBottom: 6,
              lineHeight: 1.35,
            }}>
              {aktivniKorak.poz_br && (
                <span>
                  Poz. <strong style={{ color: C.zelena }}>{aktivniKorak.poz_br}</strong>
                  {pozInfo?.opis ? ` ${pozInfo.opis}` : ""}
                </span>
              )}
              {aktivniKorak.klasifikacija && (
                <span style={{ color: C.zuta, fontWeight: 700 }}>
                  {aktivniKorak.poz_br ? " · " : ""}{aktivniKorak.klasifikacija}
                </span>
              )}
              {aktivniKorak.cilj_nm != null && <span> · cilj {aktivniKorak.cilj_nm} Nm</span>}
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: aktivniKorak.ugao_cilj != null
                ? "1fr 48px auto"
                : "1fr auto",
              gap: 6,
              alignItems: "end",
            }}>
              <label style={{ color: C.sivi, fontSize: 11, fontWeight: 700, minWidth: 0 }}>
                Nm *
                <input
                  type="number"
                  step="0.1"
                  value={ostvarenoNm}
                  onChange={(e) => {
                    setIzvorOdcitavanja("rucno");
                    setOstvarenoNm(e.target.value);
                  }}
                  autoFocus={!kljucPovezan && !autoPanelOtvoren}
                  placeholder={String(aktivniKorak.cilj_nm ?? "")}
                  style={{
                    ...INP_UNOS,
                    marginTop: 2,
                    padding: "8px 10px",
                    fontSize: 20,
                    borderColor: poslednjiStatus === "OK" ? C.zelena : poslednjiStatus === "NOK" ? C.crvena : akcentLj,
                  }}
                />
              </label>
              {aktivniKorak.ugao_cilj != null && (
                <label style={{ color: C.sivi, fontSize: 11, fontWeight: 700 }}>
                  °
                  <input
                    type="number"
                    step="0.1"
                    value={ostvarenoUgao}
                    onChange={(e) => setOstvarenoUgao(e.target.value)}
                    style={{
                      ...INP_UNOS,
                      marginTop: 2,
                      padding: "6px 4px",
                      fontSize: 15,
                      borderColor: C.border,
                    }}
                  />
                </label>
              )}
              <button
                type="button"
                disabled={snima || !ostvarenoNm}
                onClick={() => snimiKorak({ izvor: izvorOdcitavanja })}
                style={{
                  background: snima || !ostvarenoNm ? C.hover : C.zelena,
                  border: "none",
                  borderRadius: 8,
                  color: C.onAkcent,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "12px 14px",
                  cursor: snima || !ostvarenoNm ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  alignSelf: "stretch",
                  minWidth: 92,
                }}
              >
                {snima ? "…" : `Snimi ${aktivniKorak.redosled}`}
              </button>
            </div>
            {ostvarenoNm && (
              <div style={{ fontSize: 10, marginTop: 6, lineHeight: 1.3 }}>
                <span style={{
                  color: proveriMomentOk(aktivniKorak, Number(ostvarenoNm), Number(ostvarenoUgao) || null).ok ? C.zelena : C.crvena,
                  fontWeight: 700,
                }}>
                  {proveriMomentOk(aktivniKorak, Number(ostvarenoNm), Number(ostvarenoUgao) || null).ok
                    ? "✓ OK"
                    : `✗ ${proveriMomentOk(aktivniKorak, Number(ostvarenoNm), Number(ostvarenoUgao) || null).razlog}`}
                </span>
                {tol.min != null && tol.max != null && (
                  <span style={{ color: C.sivi, marginLeft: 8 }}>Tolerancija {tol.min}–{tol.max} Nm</span>
                )}
              </div>
            )}
          </div>

          <MomentEkranKljuca
            C={C}
            mini
            visinaMini={kompaktLinija ? 120 : 136}
            jobKod={paket?.job?.kod_job}
            korakRedosled={aktivniKorak.redosled}
            ukupnoKoraka={ukupnoKoraka}
            prolaz={aktivniKorak.prolaz}
            ciljNm={aktivniKorak.cilj_nm}
            ostvarenoNm={ostvarenoNm}
            ostvarenoUgao={ostvarenoUgao}
            ugaoCilj={aktivniKorak.ugao_cilj}
            ugaoTol={aktivniKorak.ugao_tol}
            tolMin={tol.min}
            tolMax={tol.max}
            status={poslednjiStatus}
          />
          </div>

          {panelSlike}
        </div>
      )}
    </div>
      , { skrol: true, padding: "0 6px 6px" })}
      {zoomCrtez && (dijagramFajl || crtezUrl) && (
        <CrtezSplitModal
          fullscreen
          url={dijagramFajl ? lokalnaPutanjaMomentDijagram(dijagramFajl) : crtezUrl}
          C={C}
          onClose={() => setZoomCrtez(false)}
          title={paket?.job ? `${paket.job.kod_job} — poz. ${aktivniKorak?.poz_br || ""}` : "Dijagram"}
          hotspotTacke={dijagramFajl && aktivniKorak?.poz_br
            ? hotspotZaPoz(dijagramFajl, aktivniKorak.poz_br)
            : null}
          viewBox={dijagramFajl ? viewBoxDijagrama(dijagramFajl) : null}
        />
      )}
    </>
  );
}
