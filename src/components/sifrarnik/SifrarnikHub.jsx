import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";

import ListeVrednostiPanel from "./ListeVrednostiPanel.jsx";

// Teški tabovi se učitavaju tek kad se otvore — inače su svi u početnom bundle-u.
const GlavniUnosPanel = lazy(() => import("./GlavniUnosPanel.jsx"));
import PogonMapaPanel from "./PogonMapaPanel.jsx";
import LinijaDeoMapaPanel from "./LinijaDeoMapaPanel.jsx";

import DeloviCrtezPanel from "./DeloviCrtezPanel.jsx";

import TipoviVozilaPanel from "./TipoviVozilaPanel.jsx";

import KatalogVoziloPanel from "./KatalogVoziloPanel.jsx";

import DeloviVoziloPanel from "./DeloviVoziloPanel.jsx";

import DeloviPanel from "./DeloviPanel.jsx";

import KupciPanel from "./KupciPanel.jsx";
import DobavljaciPanel from "./DobavljaciPanel.jsx";

import GreskeKatalogPanel from "./GreskeKatalogPanel.jsx";

import LinijePanel from "./LinijePanel.jsx";

import MasinePanel from "./MasinePanel.jsx";

import SmenePanel from "./SmenePanel.jsx";

import CiljeviPanel from "./CiljeviPanel.jsx";

import KontrolnaListaPanel from "./KontrolnaListaPanel.jsx";

import PogonAtributivniPanel from "./PogonAtributivniPanel.jsx";

import KarakteristikeMerljivePanel from "./KarakteristikeMerljivePanel.jsx";

import SopMerljivePanel from "./SopMerljivePanel.jsx";

import MerilaSifrarnikPanel from "./MerilaSifrarnikPanel.jsx";
const MomentKljucHub = lazy(() => import("./MomentKljucHub.jsx"));

const BarkodStampaPanel = lazy(() => import("./BarkodStampaPanel.jsx"));

import SifrarnikIzvozPanel from "./SifrarnikIzvozPanel.jsx";
import SifrarnikOdrzavanjePanel from "./SifrarnikOdrzavanjePanel.jsx";
const ErpUvozPanel = lazy(() => import("./ErpUvozPanel.jsx"));
import SifrarnikNastaviBanner from "./SifrarnikNastaviBanner.jsx";
import SifrarnikMigracijeBanner from "./SifrarnikMigracijeBanner.jsx";
import SifrarnikGlobalPretraga from "./SifrarnikGlobalPretraga.jsx";
import SifrarnikQuickStart from "./SifrarnikQuickStart.jsx";
import SifrarnikRadnaLinijaBar from "./SifrarnikRadnaLinijaBar.jsx";
import SifrarnikRadniRezim from "./SifrarnikRadniRezim.jsx";
import SpcAlarmPragoviPanel from "../SpcAlarmPragoviPanel.jsx";

import RadniNaloziPanel from "../RadniNaloziPanel.jsx";

import { fetchDeloviListaZaRn, fetchTipoviVozila } from "../../lib/sifrarnikApi.js";
import { supabase } from "../../lib/supabaseClient.js";
import { useEkran } from "../../layout/useEkran.js";
import {
  ONBOARDING_EVENT,
  onboardingIskljucen,
  zavrsiSifrarnikOnboarding,
} from "../../lib/sifrarnikOnboarding.js";
import { SIFRARNIK_NAV_EVENT, ucitajPendingSifrarnikNav } from "../../lib/sifrarnikNavEvent.js";
import { setSifrarnikAuditKorisnik } from "../../lib/sifrarnikAuditKorisnik.js";
import { pokreniSifrarnikStatusPolling } from "../../lib/sifrarnikStatusPolling.js";
import { GLAVNI_UNOS_SHEET_TIP } from "../../lib/glavniUnosSheetTip.js";
import {
  sacuvajRadnuLiniju,
  ucitajRadnuLiniju,
} from "../../lib/sifrarnikRadnaLinija.js";
import {
  SIFRARNIK_POGLED,
  ucitajSifrarnikPogled,
  sacuvajSifrarnikPogled,
} from "../../lib/sifrarnikPogled.js";
import { citajDeepLink, upisiDeepLink } from "../../lib/sifrarnikDeepLink.js";
import {
  ucitajGotovoSledeci,
  obrisiGotovoSledeci,
  beleziZatvorenDeoAsync,
  ucitajGotovoRed,
  postaviGotovoRed,
  obrisiGotovoRed,
  podeliGotovoRed,
} from "../../lib/sifrarnikRadniTok.js";
import { SIFRARNIK_STATUS_EVENT } from "../../lib/sifrarnikStatusEvent.js";
import { navigacijaZaIdDeo } from "../../lib/sifrarnikOdrzavanje.js";
import { normalizujKodLinije } from "../../lib/linijaProizvoda.js";
import { mozeSifrarnikNapredno } from "../../lib/uloge.js";

const ONBOARDING_TABOVI = new Set(["glavni_unos", "pogon_mapa", "liste"]);



const GRUPE = [

  {

    id: "master",

    naziv: "Osnovno",

    tabovi: [

      ["glavni_unos", "Glavni unos"],

      ["pogon_mapa", "Pogon mapa"],

      ["linija_deo", "Linija ↔ deo"],

      ["liste", "Liste (dropdown)"],

      ["delovi", "Delovi (pregled)"],

      ["rn", "Radni nalozi"],

      ["kupci", "Kupci"],

      ["dobavljaci", "Dobavljači"],

      ["linije", "Linije"],

      ["masine", "Mašine"],

      ["smene", "Smene"],

      ["ciljevi", "Ciljevi"],

      ["kontrolna", "Kontrolna lista"],

      ["barkod", "Barkod"],

    ],

  },

  {

    id: "atributivne",

    naziv: "Atributivne",

    tabovi: [

      ["greske", "Katalog grešaka"],

      ["delovi_atr", "Crtež dela"],

      ["pogon_atr", "Pogoni po delu"],

    ],

  },

  {

    id: "merljive",

    naziv: "Merljive",

    tabovi: [

      ["karakteristike", "Dimenzije (pregled)"],

      ["sop", "SOP po delu (pregled)"],

      ["merila", "Merila / kalibracija"],

    ],

  },

  {

    id: "linije_proizvoda",

    naziv: "Linije proizvoda",

    tabovi: [

      ["vozila", "Tipovi linija"],

      ["defekti", "Defekti po liniji"],

      ["delovi_vozilo", "Delovi po liniji"],

    ],

  },

  {

    id: "napredno",

    naziv: "Napredno",

    tabovi: [

      ["odrzavanje", "Održavanje"],

      ["spc_alarm", "SPC alarm %"],

      ["moment_sifrarnik", "Moment JOB"],

      ["moment_kljucevi", "Moment ključevi"],

      ["erp", "ERP uvoz"],

      ["backup", "Backup / izvoz"],

    ],

  },

];



const SVI_TABOVI = GRUPE.flatMap((g) => g.tabovi);



/**

 * Modul 0 — Šifrarnik. Sav unos master podataka u aplikaciji (bez Excela).

 */

export default function SifrarnikHub({ C, addToast, korisnik, onOtvoriModul }) {

  const { mob, linijaUredjaj } = useEkran();

  const [podtab, setPodtab] = useState(() => citajDeepLink()?.tab || "glavni_unos");

  const [voziloKod, setVoziloKod] = useState(() => ucitajRadnuLiniju() || "");

  const [radnaLinija, setRadnaLinija] = useState(() => citajDeepLink()?.linija || ucitajRadnuLiniju());
  const [quickStartOtvoren, setQuickStartOtvoren] = useState(false);

  const [izabraniDeo, setIzabraniDeo] = useState(null);

  const [navCtx, setNavCtx] = useState(null);

  const [onboarding, setOnboarding] = useState(false);

  const [deloviZaRn, setDeloviZaRn] = useState([]);
  const [tipoviVozila, setTipoviVozila] = useState([]);
  const [pogled, setPogled] = useState(() => ucitajSifrarnikPogled());
  const [gotovoBanner, setGotovoBanner] = useState(() => ucitajGotovoSledeci());
  const [gotovoRed, setGotovoRed] = useState(() => ucitajGotovoRed());
  const [autoOtvoriSledeci, setAutoOtvoriSledeci] = useState(false);
  const guDirtyRef = useRef(false);

  const setGuDirtySafe = useCallback((v) => {
    guDirtyRef.current = !!v;
  }, []);

  // Tab, deo i linija se drže u URL-u da refresh i Back ne izgube kontekst.
  useEffect(() => {
    upisiDeepLink({
      tab: podtab,
      idDeo: navCtx?.idDeo || izabraniDeo?.id_deo || null,
      linija: radnaLinija || null,
    });
  }, [podtab, navCtx?.idDeo, izabraniDeo?.id_deo, radnaLinija]);

  useEffect(() => {
    const naPromenuHasha = () => {
      const link = citajDeepLink();
      if (link?.tab && link.tab !== podtab) setPodtab(link.tab);
    };
    window.addEventListener("popstate", naPromenuHasha);
    return () => window.removeEventListener("popstate", naPromenuHasha);
  }, [podtab]);

  const forsiraHub = useCallback(() => {
    setPogled(SIFRARNIK_POGLED.HUB);
    sacuvajSifrarnikPogled(SIFRARNIK_POGLED.HUB);
  }, []);

  // Link ka konkretnom tabu podrazumeva pun Hub, ne Radni režim.
  useEffect(() => {
    if (citajDeepLink()?.tab) forsiraHub();
  }, [forsiraHub]);

  const otvoriHub = useCallback(() => {
    if (linijaUredjaj) {
      const ok = window.confirm(
        "Pun Hub je namenjen desktopu. Na tabletu/telefonu koristi Radni režim.\n\nIpak otvoriti sve tabove?",
      );
      if (!ok) return;
    }
    forsiraHub();
  }, [linijaUredjaj, forsiraHub]);

  const potvrdiNapustanjeGu = useCallback((ciljniTab) => {
    if (!guDirtyRef.current) return true;
    if (ciljniTab === "glavni_unos") return true;
    return window.confirm("Nesačuvane izmene u Glavnom unosu — napustiti tab bez snimanja?");
  }, []);

  const otvoriRadniRezim = useCallback(() => {
    if (guDirtyRef.current && !window.confirm("Nesačuvane izmene u Glavnom unosu — nazad na Radni režim?")) {
      return;
    }
    setPogled(SIFRARNIK_POGLED.RADNI);
    sacuvajSifrarnikPogled(SIFRARNIK_POGLED.RADNI);
  }, []);

  const promeniPodtab = useCallback((tab) => {
    if (!potvrdiNapustanjeGu(tab)) return;
    forsiraHub();
    setPodtab(tab);
  }, [potvrdiNapustanjeGu, forsiraHub]);

  const idiNaTab = useCallback((tab, ctx = {}) => {
    if (!potvrdiNapustanjeGu(tab)) return;

    forsiraHub();

    setNavCtx({
      otvoriWizard: false,
      wizardLinija: null,
      wizardTip: null,
      wizardAutoPotvrdi: false,
      ...ctx,
      ts: Date.now(),
    });

    if (ctx.idDeo) {
      setIzabraniDeo({
        id_deo: ctx.idDeo,
        tip_kontrole: ctx.vozilo ? "vozilo" : "deo",
      });
    }

    const lk = normalizujKodLinije(ctx.radnaLinijaFilter || ctx.linijaKod || ctx.voziloKod || "");
    if (lk) {
      setRadnaLinija(lk);
      sacuvajRadnuLiniju(lk);
      setVoziloKod(lk);
    }

    setPodtab(tab);

  }, [potvrdiNapustanjeGu, forsiraHub]);

  const klikGotovoSledeci = useCallback(async () => {
    const g = ucitajGotovoSledeci();
    const ids = (g?.idDeovi?.length
      ? g.idDeovi
      : (g?.idDeo ? [g.idDeo] : [])
    ).map((x) => String(x).trim().toUpperCase()).filter(Boolean);

    obrisiGotovoSledeci();
    setGotovoBanner(null);
    if (guDirtyRef.current) guDirtyRef.current = false;

    if (!ids.length) {
      obrisiGotovoRed();
      setGotovoRed([]);
      setAutoOtvoriSledeci(true);
      setPogled(SIFRARNIK_POGLED.RADNI);
      sacuvajSifrarnikPogled(SIFRARNIK_POGLED.RADNI);
      return;
    }

    const navLista = [];
    for (const id of ids) {
      try {
        const nav = await navigacijaZaIdDeo(id);
        if (!nav?.pronadjen) continue;
        navLista.push({ id, status: nav.status, koraci: nav.koraci });
      } catch { /* ignore */ }
    }

    const { kompletirani, pending } = podeliGotovoRed(navLista);
    for (const id of kompletirani) {
      await beleziZatvorenDeoAsync(id);
    }

    if (!pending.length) {
      obrisiGotovoRed();
      setGotovoRed([]);
      setAutoOtvoriSledeci(true);
      setPogled(SIFRARNIK_POGLED.RADNI);
      sacuvajSifrarnikPogled(SIFRARNIK_POGLED.RADNI);
      addToast?.(
        kompletirani.length
          ? `✓ Zatvoreno ${kompletirani.length} — otvaram sledeći delimični`
          : "Nema koraka u seriji — otvaram sledeći delimični",
        "uspeh",
      );
      return;
    }

    const [first, ...rest] = pending;
    const restIds = rest.map((p) => p.id);
    postaviGotovoRed(restIds);
    setGotovoRed(restIds);

    addToast?.(
      restIds.length
        ? `Sledeći u seriji: ${first.id} · još ${restIds.length} u redu`
        : `Sledeći u seriji: ${first.id}`,
      "info",
    );

    idiNaTab(first.korak.tab, {
      ...(first.korak.ctx || {}),
      idDeo: first.id,
    });
  }, [idiNaTab, addToast]);

  const klikSledeciURedu = useCallback(async () => {
    const ids = ucitajGotovoRed();
    if (!ids.length) {
      setGotovoRed([]);
      return;
    }
    const navLista = [];
    for (const id of ids) {
      try {
        const nav = await navigacijaZaIdDeo(id);
        if (!nav?.pronadjen) continue;
        navLista.push({ id, status: nav.status, koraci: nav.koraci });
      } catch { /* ignore */ }
    }
    const { kompletirani, pending } = podeliGotovoRed(navLista);
    for (const id of kompletirani) {
      await beleziZatvorenDeoAsync(id);
    }
    if (!pending.length) {
      obrisiGotovoRed();
      setGotovoRed([]);
      setAutoOtvoriSledeci(true);
      setPogled(SIFRARNIK_POGLED.RADNI);
      sacuvajSifrarnikPogled(SIFRARNIK_POGLED.RADNI);
      return;
    }
    const [first, ...rest] = pending;
    const restIds = rest.map((p) => p.id);
    postaviGotovoRed(restIds);
    setGotovoRed(restIds);
    idiNaTab(first.korak.tab, {
      ...(first.korak.ctx || {}),
      idDeo: first.id,
    });
  }, [idiNaTab]);

  const promeniRadnuLiniju = useCallback((kod) => {
    const k = normalizujKodLinije(kod);
    setRadnaLinija(k);
    sacuvajRadnuLiniju(k);
    if (k) setVoziloKod(k);
  }, []);

  const otvoriNoviDeoNaLiniji = useCallback((linijaKod) => {
    promeniRadnuLiniju(linijaKod);
    idiNaTab("glavni_unos", {
      otvoriWizard: true,
      wizardLinija: linijaKod || null,
      wizardTip: GLAVNI_UNOS_SHEET_TIP.PROJEKAT,
      wizardAutoPotvrdi: true,
    });
  }, [idiNaTab, promeniRadnuLiniju]);



  const preimenujRadnuLiniju = useCallback((linijaKod) => {
    const k = String(linijaKod || "").trim().toUpperCase();
    if (k) {
      promeniRadnuLiniju(k);
      setVoziloKod(k);
    }
    idiNaTab("vozila");
  }, [idiNaTab, promeniRadnuLiniju]);



  const quickStartNavigate = useCallback((tab, ctx = {}) => {

    if (ctx.wizardLinija) promeniRadnuLiniju(ctx.wizardLinija);

    idiNaTab(tab, ctx);

  }, [idiNaTab, promeniRadnuLiniju]);



  useEffect(() => {
    const handler = (e) => {
      setGotovoBanner(ucitajGotovoSledeci());
      const id = e?.detail?.idDeo;
      if (!id) return;
      navigacijaZaIdDeo(id).then((nav) => {
        if (nav?.status === "kompletan") beleziZatvorenDeoAsync(id);
      }).catch(() => {});
    };
    window.addEventListener(SIFRARNIK_STATUS_EVENT, handler);
    return () => window.removeEventListener(SIFRARNIK_STATUS_EVENT, handler);
  }, []);

  useEffect(() => {
    setSifrarnikAuditKorisnik(korisnik);
    return () => setSifrarnikAuditKorisnik(null);
  }, [korisnik]);

  useEffect(() => pokreniSifrarnikStatusPolling(), []);

  useEffect(() => {
    const pending = ucitajPendingSifrarnikNav();
    if (pending?.tab) idiNaTab(pending.tab, pending.ctx || {});
  }, [idiNaTab]);

  useEffect(() => {
    const handler = (e) => {
      const { tab, ctx } = e.detail || {};
      if (tab) idiNaTab(tab, ctx || {});
    };
    window.addEventListener(SIFRARNIK_NAV_EVENT, handler);
    return () => window.removeEventListener(SIFRARNIK_NAV_EVENT, handler);
  }, [idiNaTab]);



  useEffect(() => {

    if (onboardingIskljucen()) return;

    (async () => {

      try {

        const { count } = await supabase

          .from("karakteristike_merljive")

          .select("*", { count: "exact", head: true });

        setOnboarding((count || 0) < 5);

      } catch {

        setOnboarding(false);

      }

    })();

  }, []);



  useEffect(() => {

    const handler = () => setOnboarding(false);

    window.addEventListener(ONBOARDING_EVENT, handler);

    return () => window.removeEventListener(ONBOARDING_EVENT, handler);

  }, []);



  useEffect(() => {

    if (!onboarding) return;

    if (!ONBOARDING_TABOVI.has(podtab) && potvrdiNapustanjeGu("glavni_unos")) {
      setPodtab("glavni_unos");
    }

  }, [onboarding, podtab, potvrdiNapustanjeGu]);



  const iskljuciOnboarding = () => {
    zavrsiSifrarnikOnboarding();
    setOnboarding(false);
    otvoriHub();
  };



  const ucitajDeloveRn = useCallback(async () => {

    try {

      setDeloviZaRn(await fetchDeloviListaZaRn());

    } catch (e) {

      addToast?.(e.message, "greska");

    }

  }, [addToast]);



  useEffect(() => { ucitajDeloveRn(); }, [ucitajDeloveRn]);

  const osveziTipoveLinija = useCallback(() => {
    fetchTipoviVozila().then(setTipoviVozila).catch(() => setTipoviVozila([]));
  }, []);

  useEffect(() => { osveziTipoveLinija(); }, [osveziTipoveLinija]);

  // Posle Preimenuj / Tipovi linija — dropdown „Radim na liniji“ vidi novi naziv
  useEffect(() => {
    if (podtab === "vozila") osveziTipoveLinija();
  }, [podtab, osveziTipoveLinija]);



  const otvoriBarkod = (deo) => {
    if (!potvrdiNapustanjeGu("barkod")) return;
    setIzabraniDeo(deo);
    setPodtab("barkod");
  };



  const jeAdminSifrarnik = mozeSifrarnikNapredno(korisnik?.uloga);

  const aktivnaGrupa = GRUPE.find((g) => g.tabovi.some(([id]) => id === podtab)) || GRUPE[0];

  const bazaGrupe = onboarding
    ? GRUPE.map((g) => ({
      ...g,
      tabovi: g.tabovi.filter(([id]) => ONBOARDING_TABOVI.has(id)),
    })).filter((g) => g.tabovi.length)
    : GRUPE;

  const prikazGrupe = jeAdminSifrarnik
    ? bazaGrupe
    : bazaGrupe.filter((g) => g.id !== "napredno");



  return (

    <div data-testid="sifrarnik-hub" style={{

      flex: 1, display: "flex", flexDirection: "column", minHeight: 0,

      padding: mob ? "8px 10px" : "12px 16px", overflow: "hidden",

    }}>

      {linijaUredjaj && (
        <div
          data-testid="sifrarnik-tablet-warn"
          style={{
          marginBottom: 10, padding: "8px 10px", borderRadius: 8, flexShrink: 0,
          border: `1px solid ${C.zuta || "#b45309"}55`,
          background: `${C.zuta || "#b45309"}12`,
          color: C.tekst, fontSize: 10, lineHeight: 1.4,
        }}
        >
          {pogled === SIFRARNIK_POGLED.HUB
            ? (
              <>
                Tablet/telefon: pun Hub je zbijen. Preferiraj{" "}
                <button
                  type="button"
                  onClick={otvoriRadniRezim}
                  style={{ background: "none", border: "none", color: C.plava, cursor: "pointer", fontWeight: 700, padding: 0, fontSize: 10 }}
                >
                  Radni režim
                </button>
                {" "}za dnevni unos.
              </>
            )
            : "Na tabletu/telefonu radi u Radnom režimu. Pun Hub je za širi ekran."}
        </div>
      )}

      {jeAdminSifrarnik && <SifrarnikMigracijeBanner C={C} />}

      {gotovoRed.length > 0 && (
        <div
          data-testid="sifrarnik-gotovo-red"
          style={{
            marginBottom: 8,
            flexShrink: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderRadius: 8,
            border: `1px solid ${C.plava}55`,
            background: `${C.plava}10`,
          }}
        >
          <span style={{ color: C.tekst, fontSize: 10 }}>
            U redu još <strong style={{ color: C.plava }}>{gotovoRed.length}</strong>
            {": "}
            {gotovoRed.slice(0, 4).join(", ")}
            {gotovoRed.length > 4 ? "…" : ""}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              data-testid="sifrarnik-gotovo-red-dismiss"
              onClick={() => {
                obrisiGotovoRed();
                setGotovoRed([]);
              }}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.sivi,
                fontSize: 9,
                padding: "5px 10px",
                cursor: "pointer",
              }}
            >
              Otkaži red
            </button>
            <button
              type="button"
              data-testid="sifrarnik-gotovo-red-cta"
              onClick={klikSledeciURedu}
              style={{
                background: C.plava,
                border: "none",
                borderRadius: 6,
                color: C.onAkcent || "#fff",
                fontSize: 10,
                fontWeight: 700,
                padding: "5px 12px",
                cursor: "pointer",
              }}
            >
              Sledeći u redu →
            </button>
          </div>
        </div>
      )}

      {pogled === SIFRARNIK_POGLED.RADNI ? (
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
          {onboarding && (
            <div style={{
              marginBottom: 10, padding: "10px 12px", borderRadius: 8,
              border: `1px solid ${C.plava}55`, background: `${C.plava}12`,
              color: C.tekst, fontSize: 10, lineHeight: 1.45,
            }}
            >
              <strong>Prvi korak:</strong> izaberi liniju → <strong>+ Novi deo</strong> → popuni → Objavi.
              {" "}
              <button type="button" onClick={iskljuciOnboarding}
                style={{ background: "none", border: "none", color: C.plava, cursor: "pointer", fontWeight: 700, padding: 0 }}>
                Prikaži sve tabove
              </button>
            </div>
          )}
          <SifrarnikRadniRezim
            C={C}
            tipoviVozila={tipoviVozila}
            radnaLinija={radnaLinija}
            onPromeniLiniju={promeniRadnuLiniju}
            onNoviDeo={otvoriNoviDeoNaLiniji}
            onNavigate={idiNaTab}
            onOtvoriHub={otvoriHub}
            addToast={addToast}
            prikaziTehnicko={jeAdminSifrarnik}
            autoOtvoriSledeci={autoOtvoriSledeci}
            onAutoSledeciPotrosen={() => setAutoOtvoriSledeci(false)}
            sakrijHub={false}
          />
        </div>
      ) : (
        <>

      {onboarding && (

        <div style={{

          marginBottom: 10, padding: "10px 12px", borderRadius: 8, flexShrink: 0,

          border: `1px solid ${C.plava}55`, background: `${C.plava}12`,

          color: C.tekst, fontSize: 10, lineHeight: 1.45,

        }}>

          <strong>Prvi korak:</strong> Modul 0 → <strong>Glavni unos</strong> →{" "}

          <strong>+ Novi deo</strong> → popuni → <strong>Objavi u šifrarnik</strong>.

          {" "}

          Ostali tabovi su sakriveni dok ne objaviš prvih dimenzija.

          {" "}

          <button type="button" onClick={iskljuciOnboarding}

            style={{ background: "none", border: "none", color: C.plava, cursor: "pointer", fontWeight: 700, padding: 0 }}>

            Prikaži sve tabove

          </button>

        </div>

      )}

      <div style={{
        marginBottom: 8,
        flexShrink: 0,
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
        padding: "8px 10px",
        borderRadius: 8,
        border: `1px solid ${C.plava}44`,
        background: `${C.plava}0d`,
      }}
      >
        <button
          type="button"
          data-testid="sifrarnik-nazad-radni"
          onClick={otvoriRadniRezim}
          style={{
            background: C.plava,
            border: "none",
            borderRadius: 6,
            color: C.onAkcent,
            fontSize: 10,
            fontWeight: 700,
            padding: "6px 12px",
            cursor: "pointer",
          }}
        >
          ← Radni režim
        </button>
        <span style={{ color: C.sivi, fontSize: 9, lineHeight: 1.35 }}>
          Pun hub · tab{" "}
          <strong style={{ color: C.tekst }}>
            {SVI_TABOVI.find(([id]) => id === podtab)?.[1] || podtab}
          </strong>
          {radnaLinija ? ` · linija ${radnaLinija}` : ""}
          {" — "}posle koraka vrati se na dnevni sto
        </span>
      </div>

      {gotovoBanner && (
        <div
          data-testid="sifrarnik-gotovo-sledeci"
          style={{
            marginBottom: 8,
            flexShrink: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 12px",
            borderRadius: 8,
            border: `1px solid ${(C.zelena || "#22c55e")}66`,
            background: `${C.zelena || "#22c55e"}14`,
          }}
        >
          <span style={{ color: C.tekst, fontSize: 11, fontWeight: 700 }}>
            Snimljeno
            {gotovoBanner.idDeovi?.length > 1 ? (
              <span style={{ color: C.plava }}> · {gotovoBanner.idDeovi.length} dela</span>
            ) : gotovoBanner.idDeo ? (
              <>
                {" · "}
                <span style={{ color: C.plava }}>{gotovoBanner.idDeo}</span>
              </>
            ) : null}
            {gotovoBanner.akcija ? (
              <span style={{ color: C.sivi, fontWeight: 400 }}> ({gotovoBanner.akcija})</span>
            ) : null}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              data-testid="sifrarnik-gotovo-dismiss"
              onClick={() => {
                obrisiGotovoSledeci();
                setGotovoBanner(null);
              }}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.sivi,
                fontSize: 9,
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              Ostani ovde
            </button>
            <button
              type="button"
              data-testid="sifrarnik-gotovo-cta"
              onClick={klikGotovoSledeci}
              style={{
                background: C.zelena || "#22c55e",
                border: "none",
                borderRadius: 6,
                color: C.onAkcent || "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "6px 14px",
                cursor: "pointer",
              }}
            >
              Gotovo → sledeći
            </button>
          </div>
        </div>
      )}

      {!onboarding && (
        <SifrarnikRadnaLinijaBar
          C={C}
          tipoviVozila={tipoviVozila}
          radnaLinija={radnaLinija}
          onPromeni={promeniRadnuLiniju}
          onNoviDeo={otvoriNoviDeoNaLiniji}
          onPreimenuj={preimenujRadnuLiniju}
          desnoExtra={(
            <SifrarnikGlobalPretraga
              C={C}
              addToast={addToast}
              onNavigate={idiNaTab}
              radnaLinija={radnaLinija}
              kompakt
            />
          )}
        />
      )}

      {!onboarding && !radnaLinija && (
        <SifrarnikQuickStart
          C={C}
          onNavigate={quickStartNavigate}
          tipoviVozila={tipoviVozila}
          skriveno={onboarding}
          radnaLinija={radnaLinija}
          prikaziTehnicko={jeAdminSifrarnik}
        />
      )}

      {!onboarding && radnaLinija && (
        <div
          data-testid="sifrarnik-fokus-traka"
          style={{
            marginBottom: 8,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            data-testid="sifrarnik-quick-start-toggle"
            onClick={() => setQuickStartOtvoren((v) => !v)}
            style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              padding: "5px 10px",
              cursor: "pointer",
              fontSize: 9,
              color: C.sivi,
            }}
          >
            {quickStartOtvoren ? "Sakrij brzi start" : "Brzi start…"}
          </button>
          <SifrarnikNastaviBanner C={C} onNavigate={idiNaTab} skriveno={false} radnaLinija={radnaLinija} kompakt />
        </div>
      )}

      {radnaLinija && quickStartOtvoren && (
        <SifrarnikQuickStart
          C={C}
          onNavigate={quickStartNavigate}
          tipoviVozila={tipoviVozila}
          skriveno={onboarding}
          radnaLinija={radnaLinija}
          prikaziTehnicko={jeAdminSifrarnik}
        />
      )}

      {!radnaLinija && (
        <SifrarnikNastaviBanner C={C} onNavigate={idiNaTab} skriveno={onboarding} radnaLinija={radnaLinija} />
      )}

      {!radnaLinija && !onboarding && (
        <SifrarnikGlobalPretraga C={C} addToast={addToast} onNavigate={idiNaTab} radnaLinija={radnaLinija} />
      )}

      {onboarding && (
        <SifrarnikGlobalPretraga C={C} addToast={addToast} onNavigate={idiNaTab} radnaLinija={radnaLinija} />
      )}

      <div style={{ marginBottom: radnaLinija ? 8 : 12, flexShrink: 0 }}>

        <div style={{ color: C.tekst, fontSize: radnaLinija ? 13 : 15, fontWeight: 700, letterSpacing: 0.5 }}>

          MODUL 0 — ŠIFRARNIK
          {radnaLinija ? (
            <span style={{ color: C.plava, fontSize: 11, fontWeight: 700, marginLeft: 8 }}>{radnaLinija}</span>
          ) : null}

        </div>

        {!radnaLinija && (
          <div style={{ color: C.sivi, fontSize: 10, marginTop: 4, lineHeight: 1.45 }}>

            Unos master podataka u aplikaciji. Glavni unos puni dimenzije i zavisne šifrarnike — ostali tabovi su pregled ili dopuna.

          </div>
        )}

      </div>



      <div style={{ display: "flex", gap: 12, marginBottom: 8, flexShrink: 0, flexWrap: "wrap" }}>

        {prikazGrupe.map((g) => (

          <button

            key={g.id}

            type="button"

            data-testid={`sifrarnik-grupa-${g.id}`}

            onClick={() => promeniPodtab(g.tabovi[0][0])}

            style={{

              background: aktivnaGrupa.id === g.id ? `${"#a78bfa"}18` : "transparent",

              border: `1px solid ${aktivnaGrupa.id === g.id ? "#a78bfa" : C.border}`,

              borderRadius: 6, padding: "4px 10px", cursor: "pointer",

              fontSize: 9, fontWeight: aktivnaGrupa.id === g.id ? 700 : 400,

              color: aktivnaGrupa.id === g.id ? "#a78bfa" : C.sivi,

              letterSpacing: 0.6,

            }}

          >

            {g.naziv.toUpperCase()}

          </button>

        ))}

      </div>



      <div style={{

        display: "flex", borderBottom: `1px solid ${C.border}`,

        marginBottom: 12, flexShrink: 0, flexWrap: "wrap", overflowX: "auto",

      }}>

        {(prikazGrupe.find((g) => g.id === aktivnaGrupa.id)?.tabovi || prikazGrupe[0]?.tabovi || []).map(([id, naziv]) => (

          <button

            key={id}

            type="button"

            data-testid={`sifrarnik-tab-${id}`}

            onClick={() => promeniPodtab(id)}

            style={{

              background: "none", border: "none",

              borderBottom: podtab === id ? "2px solid #a78bfa" : "2px solid transparent",

              color: podtab === id ? "#a78bfa" : C.sivi,

              fontSize: 10, fontWeight: 700, padding: "8px 12px", cursor: "pointer",

              whiteSpace: "nowrap",

            }}

          >

            {naziv}

          </button>

        ))}

      </div>



      <div style={{ flex: 1, minHeight: 0, overflow: "auto", WebkitOverflowScrolling: "touch" }}>

        <Suspense fallback={<div style={{ color: C.sivi, fontSize: 11, padding: 16 }}>Učitavanje panela…</div>}>

        {podtab === "glavni_unos" && (
          <GlavniUnosPanel
            C={C}
            addToast={addToast}
            korisnik={korisnik}
            onNavigate={idiNaTab}
            navSignal={navCtx}
            tipoviVozilaHub={tipoviVozila}
            radnaLinija={radnaLinija}
            onDirtyChange={setGuDirtySafe}
          />
        )}

        {podtab === "pogon_mapa" && <PogonMapaPanel C={C} addToast={addToast} />}

        {podtab === "linija_deo" && <LinijaDeoMapaPanel C={C} addToast={addToast} />}

        {podtab === "liste" && <ListeVrednostiPanel C={C} addToast={addToast} />}

        {podtab === "delovi" && (
          <DeloviPanel
            C={C}
            addToast={addToast}
            onStampaj={otvoriBarkod}
            onOtvoriGlavniUnos={(idDeo, opts = {}) => idiNaTab("glavni_unos", { idDeo, ...opts })}
            onNavigacijaStatus={(tab, ctx) => idiNaTab(tab, ctx)}
            navSignal={navCtx}
            onBulkBarkod={(ids) => idiNaTab("barkod", { bulkIds: ids })}
            radnaLinija={radnaLinija}
            korisnik={korisnik}
          />
        )}

        {podtab === "odrzavanje" && (
          <SifrarnikOdrzavanjePanel
            C={C}
            addToast={addToast}
            onNavigate={idiNaTab}
            onOtvoriModul={onOtvoriModul}
            jeAdmin={jeAdminSifrarnik}
            radnaLinija={radnaLinija}
          />
        )}

        {podtab === "rn" && <RadniNaloziPanel C={C} addToast={addToast} sviDelovi={deloviZaRn} />}

        {podtab === "kupci" && <KupciPanel C={C} addToast={addToast} />}

        {podtab === "dobavljaci" && <DobavljaciPanel C={C} addToast={addToast} />}

        {podtab === "linije" && <LinijePanel C={C} addToast={addToast} />}

        {podtab === "masine" && <MasinePanel C={C} addToast={addToast} />}

        {podtab === "smene" && <SmenePanel C={C} addToast={addToast} />}

        {podtab === "ciljevi" && <CiljeviPanel C={C} addToast={addToast} />}

        {podtab === "kontrolna" && <KontrolnaListaPanel C={C} addToast={addToast} />}

        {podtab === "greske" && (
          <GreskeKatalogPanel
            C={C}
            addToast={addToast}
            pocetniIdDeo={navCtx?.idDeo}
            pocetniNavTs={navCtx?.ts}
            voziloSablon={navCtx?.vozilo}
            radnaLinija={radnaLinija}
          />
        )}

        {podtab === "delovi_atr" && (
          <DeloviCrtezPanel
            C={C}
            addToast={addToast}
            pocetniIdDeo={navCtx?.idDeo}
            pocetniNavTs={navCtx?.ts}
            otvoriFormu={navCtx?.otvoriCrtezForm}
            radnaLinija={radnaLinija}
          />
        )}

        {podtab === "pogon_atr" && <PogonAtributivniPanel C={C} addToast={addToast} />}

        {podtab === "karakteristike" && (
          <KarakteristikeMerljivePanel C={C} addToast={addToast} navSignal={navCtx} onOtvoriModul={onOtvoriModul} />
        )}

        {podtab === "spc_alarm" && <SpcAlarmPragoviPanel C={C} addToast={addToast} />}

        {podtab === "sop" && <SopMerljivePanel C={C} addToast={addToast} />}

        {podtab === "merila" && <MerilaSifrarnikPanel C={C} addToast={addToast} korisnik={korisnik} />}

        {podtab === "moment_sifrarnik" && <MomentKljucHub C={C} addToast={addToast} />}

        {podtab === "moment_kljucevi" && <MerilaSifrarnikPanel C={C} addToast={addToast} korisnik={korisnik} />}

        {podtab === "vozila" && (
          <TipoviVozilaPanel
            C={C}
            addToast={addToast}
            voziloKod={voziloKod}
            onIzaberiVozilo={setVoziloKod}
            onTipoviPromenjeni={osveziTipoveLinija}
            otvoriIzmenuZa={voziloKod}
          />
        )}

        {podtab === "defekti" && (

          <KatalogVoziloPanel C={C} addToast={addToast} voziloKod={voziloKod} onVoziloChange={setVoziloKod} />

        )}

        {podtab === "delovi_vozilo" && (

          <DeloviVoziloPanel C={C} addToast={addToast} voziloKod={voziloKod} onVoziloChange={setVoziloKod} onStampaj={otvoriBarkod} />

        )}

        {podtab === "barkod" && (

          <BarkodStampaPanel
            C={C}
            addToast={addToast}
            pocetniDeo={izabraniDeo || (navCtx?.idDeo ? { id_deo: navCtx.idDeo } : null)}
            bulkIds={navCtx?.bulkIds}
            radnaLinija={radnaLinija}
          />

        )}

        {podtab === "erp" && <ErpUvozPanel C={C} addToast={addToast} onNavigate={idiNaTab} />}

        {podtab === "backup" && <SifrarnikIzvozPanel C={C} addToast={addToast} />}

        </Suspense>

      </div>

        </>
      )}

    </div>

  );

}


