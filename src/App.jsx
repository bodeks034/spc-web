import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { KontrolnaLista } from "./lib/kontrolaSesije.jsx";
import {
  setListaOkSession,
  getListaOkSession,
  procitajSmenuIzStorage,
} from "./lib/kontrolaLista.js";
import { normalizujPrefill8d, sacuvajNavigacijuNcr } from "./lib/eskalacijeHelper.js";
import { sacuvajSpoljnuNavigacijuTab } from "./lib/workflowAkcije.js";
import { modulZaRouting } from "./lib/deoModul.js";
import {
  podrazumevaniRezim,
  mozePrebacivanjeRezima,
  jeLinijaUloga,
  efektivniRezimRada,
  jeAdmin,
  mozeOdobrenjaQA,
  mozeSifrarnik,
} from "./lib/uloge.js";
import { supabase } from "./lib/supabaseClient.js";
import useLicencaGate from "./hooks/useLicencaGate.js";
import useAdminZahtevNotifikacije from "./hooks/useAdminZahtevNotifikacije.js";
import LicencaBlokada from "./components/LicencaBlokada.jsx";
import LicencaUpozorenje from "./components/LicencaUpozorenje.jsx";
import ModulBlokiran from "./components/ModulBlokiran.jsx";
import { modulDozvoljen } from "./lib/licenca.js";
import AppHeader from "./components/AppHeader.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import PocetniEkran from "./components/PocetniEkran.jsx";
import TabletZakljucaj from "./components/TabletZakljucaj.jsx";
import { TabletSmenaContext } from "./lib/TabletSmenaContext.jsx";
const SifrarnikModul = lazy(() => import("./components/sifrarnik/SifrarnikModul.jsx"));
const VarijabilneForma = lazy(() => import("./VarijabilneForma.jsx"));
const GlavnaForma = lazy(() => import("./components/atributivne/GlavnaForma.jsx"));
const AdminPanel = lazy(() => import("./components/admin/AdminPanel.jsx"));
import { Toast } from "./components/ui/SpcUi.jsx";
import { TEME } from "./lib/teme.js";
import { ucitajRadnika } from "./lib/radnikAuth.js";
import { proveriMaxKorisnika } from "./lib/licencaMaxKorisnika.js";
import { registrujUredjajLicence } from "./lib/licencaUredjaj.js";
import { ocistiUnosDraft } from "./lib/unosDraft.js";
import { obrisiPoslednjiDeo } from "./lib/poslednjiDeoLinija.js";
import { clearSesija } from "./lib/spcSesija.js";
import { registrujPWA } from "./lib/pwa.js";
import { initSpcAlarmPragoviSync, ucitajSpcAlarmPragove } from "./lib/spcAlarmPragovi.js";

function ModulUcitavanje({ C }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: C.tekst,
      fontFamily: "'IBM Plex Mono',monospace",
      fontSize: 14,
    }}>
      Učitavam modul…
    </div>
  );
}

export default function App() {
  const licenca = useLicencaGate();
  const [korisnik, setKorisnik] = useState(null);
  const [checking, setChecking] = useState(true);
  const [modul, setModul] = useState(null);
  const [tabletZakljucan, setTabletZakljucan] = useState(false);
  const [C, setC] = useState(() => {
    const saved = localStorage.getItem("spc_tema");
    return saved === "svetla" ? TEME.svetla : TEME.tamna;
  });
  const [listaOk, setListaOk] = useState(false);
  const [listaOkVar, setListaOkVar] = useState(false);

  useEffect(() => {
    if (!korisnik) return;
    initSpcAlarmPragoviSync();
    ucitajSpcAlarmPragove(supabase).catch(() => {});
  }, [korisnik]);

  useEffect(() => {
    if (modul === null) {
      setListaOk(false);
      setListaOkVar(false);
    }
  }, [modul]);

  useEffect(() => {
    if (modul !== "atributivne" && modul !== "varijabilne") return;
    const sm = procitajSmenuIzStorage();
    if (modul === "atributivne") {
      setListaOk(getListaOkSession("atributivne", sm));
    } else {
      setListaOkVar(getListaOkSession("varijabilne", sm));
    }
  }, [modul, korisnik?.uloga]);

  const [loginKey, setLoginKey] = useState(0);
  const [nav8dTick, setNav8dTick] = useState(0);
  const otvoriModulAnalitika = (targetModul) => {
    setRezimRada("analitika");
    sessionStorage.setItem("spc_rezim_rada", "analitika");
    setNav8dTick((t) => t + 1);
    if (modul !== targetModul) setModul(targetModul);
  };
  const otvori8dIzvana = (esk, { modul = "atributivne" } = {}) => {
    const target = modulZaRouting(modul);
    sessionStorage.setItem("spc_8d_prefill", JSON.stringify(normalizujPrefill8d(esk)));
    sacuvajSpoljnuNavigacijuTab("8d", { modul: target });
    otvoriModulAnalitika(target);
  };
  const otvoriSpoljniTab = (tab, { prefillNcr, modul = "atributivne" } = {}) => {
    const target = modulZaRouting(modul);
    sacuvajSpoljnuNavigacijuTab(tab, { prefillNcr, modul: target });
    otvoriModulAnalitika(target);
  };
  const otvoriNcrIzvana = (prefill = {}, { modul = "atributivne" } = {}) => {
    const target = modulZaRouting(modul);
    sacuvajNavigacijuNcr(prefill, target);
    otvoriModulAnalitika(target);
  };
  const [rezimRada, setRezimRada] = useState(() =>
    sessionStorage.getItem("spc_rezim_rada") || "linija",
  );

  useEffect(() => {
    if (!korisnik) return;
    if (jeLinijaUloga(korisnik.uloga)) {
      setRezimRada("linija");
      sessionStorage.setItem("spc_rezim_rada", "linija");
      return;
    }
    const saved = sessionStorage.getItem("spc_rezim_rada");
    if (!saved) {
      const r = podrazumevaniRezim(korisnik.uloga);
      setRezimRada(r);
      sessionStorage.setItem("spc_rezim_rada", r);
    }
  }, [korisnik]);

  const promeniRezim = (novi) => {
    if (!korisnik || !mozePrebacivanjeRezima(korisnik.uloga)) return;
    setRezimRada(novi);
    sessionStorage.setItem("spc_rezim_rada", novi);
  };

  const izadjiIzModula = useCallback((targetModul = modul) => {
    if (targetModul === "varijabilne") {
      obrisiPoslednjiDeo("varijabilne");
      clearSesija("merljive");
    } else if (targetModul === "atributivne") {
      obrisiPoslednjiDeo("atributivne");
      clearSesija("atributivne");
    }
    setModul(null);
  }, [modul]);

  const aktivniRezim = korisnik
    ? efektivniRezimRada(korisnik.uloga, rezimRada)
    : rezimRada;

  useEffect(() => { localStorage.setItem("spc_tema", C.naziv); }, [C]);
  useEffect(() => { registrujPWA(); }, []);

  const [globalToasts, setGlobalToasts] = useState([]);
  const addGlobalToast = useCallback((tekst, tip = "info") => {
    const id = Date.now();
    setGlobalToasts((p) => [...p, { tekst, tip, id }]);
    setTimeout(() => setGlobalToasts((p) => p.filter((t) => t.id !== id)), 4500);
  }, []);
  const globalToastEl = <Toast poruke={globalToasts} C={C} />;

  useAdminZahtevNotifikacije({
    supabase,
    korisnik,
    enabled: !!korisnik && mozeOdobrenjaQA(korisnik.uloga),
    onInAppToast: addGlobalToast,
  });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        ocistiUnosDraft();
        const k = await ucitajRadnika(supabase, session.user);
        if (!k?.radnikId) {
          await supabase.auth.signOut();
          setKorisnik(null);
        } else {
          setKorisnik(k);
        }
      }
      setChecking(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        setKorisnik(null);
        setModul(null);
        setLoginKey((k) => k + 1);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!korisnik?.radnikId || licenca.ucitava) return;
    (async () => {
      const kvota = await proveriMaxKorisnika(supabase, {
        maxKorisnika: licenca.max_korisnika,
        radnikId: korisnik.radnikId,
      });
      if (!kvota.ok) {
        await supabase.auth.signOut();
        setKorisnik(null);
        setModul(null);
        setLoginKey((k) => k + 1);
        return;
      }
      const uredjaj = await registrujUredjajLicence(supabase, {
        maxUredjaja: licenca.max_uredjaja,
      });
      if (!uredjaj.ok) {
        await supabase.auth.signOut();
        setKorisnik(null);
        setModul(null);
        setLoginKey((k) => k + 1);
      }
    })();
  }, [korisnik?.radnikId, licenca.ucitava, licenca.max_korisnika, licenca.max_uredjaja]);

  const odjava = async () => {
    await supabase.auth.signOut();
    ocistiUnosDraft();
    setKorisnik(null);
    setModul(null);
    setTabletZakljucan(false);
    setLoginKey((k) => k + 1);
  };

  const tabletOverlay = korisnik ? (
    <TabletZakljucaj
      C={C}
      korisnik={korisnik}
      zakljucano={tabletZakljucan}
      onZatraziZakljucaj={() => setTabletZakljucan(true)}
      onOtkljucaj={(k) => {
        if (k) setKorisnik(k);
        setTabletZakljucan(false);
      }}
      onPromeniRadnika={setKorisnik}
    />
  ) : null;

  const wrapSaTabletom = (node) => (
    <TabletSmenaContext.Provider value={() => setTabletZakljucan(true)}>
      {tabletOverlay}
      {node}
    </TabletSmenaContext.Provider>
  );

  if (licenca.ucitava || checking) {
    return (
      <div style={{
        minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center",
        justifyContent: "center", color: C.sivi, fontFamily: "monospace", fontSize: 12,
      }}>
        {licenca.ucitava ? "Provera licence..." : "Provera sesije..."}
      </div>
    );
  }

  if (!licenca.ok) {
    return <LicencaBlokada poruka={licenca.poruka} kod={licenca.kod} C={C} />;
  }

  if (!korisnik) return <LoginScreen key={loginKey} onLogin={setKorisnik} C={C} licenca={licenca} />;

  if (!modul) {
    return wrapSaTabletom(
      <>
        {globalToastEl}
        <LicencaUpozorenje licenca={licenca} C={C} />
        <PocetniEkran
          korisnik={korisnik}
          licenca={licenca}
          onIzbor={setModul}
          onOdjava={odjava}
          C={C}
          setC={setC}
          rezimRada={aktivniRezim}
          onPromeniRezim={promeniRezim}
          onOtvori8D={otvori8dIzvana}
          onOtvoriNcr={otvoriNcrIzvana}
          onOtvoriTab={otvoriSpoljniTab}
        />
      </>,
    );
  }

  if (modul === "atributivne" && !modulDozvoljen(licenca, "atributivne")) {
    return <ModulBlokiran nazivModula="Atributivne kontrole" C={C} onNazad={() => izadjiIzModula("atributivne")} />;
  }
  if (modul === "varijabilne" && !modulDozvoljen(licenca, "varijabilne")) {
    return <ModulBlokiran nazivModula="Merljive (varijabilne)" C={C} onNazad={() => izadjiIzModula("varijabilne")} />;
  }
  if (modul === "admin" && !modulDozvoljen(licenca, "admin")) {
    return <ModulBlokiran nazivModula="Admin panel" C={C} onNazad={() => setModul(null)} />;
  }
  if (modul === "sifrarnik" && !modulDozvoljen(licenca, "sifrarnik")) {
    return <ModulBlokiran nazivModula="Modul 0 — Šifrarnik" C={C} onNazad={() => setModul(null)} />;
  }

  if (modul === "atributivne" && aktivniRezim === "linija" && !listaOk && !jeAdmin(korisnik?.uloga)) {
    return wrapSaTabletom(
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono',monospace" }}>
        <AppHeader
          korisnik={korisnik}
          onOdjava={odjava}
          onNazad={() => izadjiIzModula("atributivne")}
          C={C}
          onToggleTema={() => setC((p) => (p.naziv === "tamna" ? TEME.svetla : TEME.tamna))}
          temaTamna={C.naziv === "tamna"}
        />
        <KontrolnaLista
          korisnik={korisnik}
          smena={procitajSmenuIzStorage()}
          naslovModul="Atributivne"
          onZavrsena={() => {
            const sm = procitajSmenuIzStorage();
            setListaOkSession("atributivne", sm);
            setListaOk(true);
          }}
          C={C}
        />
      </div>,
    );
  }

  if (modul === "varijabilne" && aktivniRezim === "linija" && !listaOkVar && !jeAdmin(korisnik?.uloga)) {
    return wrapSaTabletom(
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'IBM Plex Mono',monospace" }}>
        <AppHeader
          korisnik={korisnik}
          onOdjava={odjava}
          onNazad={() => izadjiIzModula("varijabilne")}
          C={C}
          onToggleTema={() => setC((p) => (p.naziv === "tamna" ? TEME.svetla : TEME.tamna))}
          temaTamna={C.naziv === "tamna"}
        />
        <KontrolnaLista
          korisnik={korisnik}
          smena={procitajSmenuIzStorage()}
          naslovModul="Merljive"
          akcent={C.zelena}
          onZavrsena={() => {
            const sm = procitajSmenuIzStorage();
            setListaOkSession("varijabilne", sm);
            setListaOkVar(true);
          }}
          C={C}
        />
      </div>,
    );
  }

  if (modul === "admin") {
    return jeAdmin(korisnik.uloga) ? wrapSaTabletom(
      <>
        {globalToastEl}
        <LicencaUpozorenje licenca={licenca} C={C} />
        <Suspense fallback={<ModulUcitavanje C={C} />}>
          <AdminPanel
            korisnik={korisnik}
            licenca={licenca}
            onNazad={() => setModul(null)}
            C={C}
          />
        </Suspense>
      </>,
    ) : (
      <div style={{
        minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "monospace", color: C.tekst,
      }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <div>Nemate pristup Admin panelu.</div>
        <button type="button" onClick={() => setModul(null)} style={{
          background: C.plava, border: "none", borderRadius: 8,
          color: C.onAkcent, padding: "10px 20px", cursor: "pointer",
        }}>
          ← Nazad
        </button>
      </div>
    );
  }

  if (modul === "sifrarnik") {
    return mozeSifrarnik(korisnik.uloga) ? wrapSaTabletom(
      <>
        <LicencaUpozorenje licenca={licenca} C={C} />
        <Suspense fallback={<ModulUcitavanje C={C} />}>
          <SifrarnikModul
            korisnik={korisnik}
            onOdjava={odjava}
            onNazad={() => setModul(null)}
            C={C}
            onToggleTema={() => setC((p) => (p.naziv === "tamna" ? TEME.svetla : TEME.tamna))}
            temaTamna={C.naziv === "tamna"}
          />
        </Suspense>
      </>,
    ) : (
      <div style={{
        minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: 16, fontFamily: "monospace", color: C.tekst,
      }}>
        <div style={{ fontSize: 48 }}>🔒</div>
        <div>Nemate pristup modulu Šifrarnik.</div>
        <button type="button" onClick={() => setModul(null)} style={{
          background: C.plava, border: "none", borderRadius: 8,
          color: C.onAkcent, padding: "10px 20px", cursor: "pointer",
        }}>
          ← Nazad
        </button>
      </div>
    );
  }

  if (modul === "atributivne") {
    return wrapSaTabletom(
      <>
        {globalToastEl}
        <Suspense fallback={<ModulUcitavanje C={C} />}>
          <GlavnaForma
            korisnik={korisnik}
            onOdjava={odjava}
            onNazad={() => izadjiIzModula("atributivne")}
            C={C}
            setC={setC}
            rezimRada={aktivniRezim}
            onPromeniRezim={promeniRezim}
            nav8dTick={nav8dTick}
            licenca={licenca}
            listaPotvrdena={listaOk}
          />
        </Suspense>
      </>,
    );
  }

  if (modul === "varijabilne") {
    return wrapSaTabletom(
      <>
        {globalToastEl}
        <Suspense fallback={<ModulUcitavanje C={C} />}>
          <VarijabilneForma
            korisnik={korisnik}
            onOdjava={odjava}
            onNazad={() => izadjiIzModula("varijabilne")}
            C={C}
            onToggleTema={() => setC((p) => (p.naziv === "tamna" ? TEME.svetla : TEME.tamna))}
            temaTamna={C.naziv === "tamna"}
            rezimRada={aktivniRezim}
            onPromeniRezim={promeniRezim}
            unosRezim={sessionStorage.getItem("spc_mer_unos_rezim") === "digital" ? "digital" : "rucni"}
            onOtvori8D={otvori8dIzvana}
            nav8dTick={nav8dTick}
            licenca={licenca}
          />
        </Suspense>
      </>,
    );
  }

  return null;
}
