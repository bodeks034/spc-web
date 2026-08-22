import { useState, useEffect, useCallback } from "react";

import ListeVrednostiPanel from "./ListeVrednostiPanel.jsx";

import GlavniUnosPanel from "./GlavniUnosPanel.jsx";
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
import MomentKljucHub from "./MomentKljucHub.jsx";

import BarkodStampaPanel from "./BarkodStampaPanel.jsx";

import SifrarnikIzvozPanel from "./SifrarnikIzvozPanel.jsx";
import SifrarnikOdrzavanjePanel from "./SifrarnikOdrzavanjePanel.jsx";
import ErpUvozPanel from "./ErpUvozPanel.jsx";
import SifrarnikNastaviBanner from "./SifrarnikNastaviBanner.jsx";
import SifrarnikMigracijeBanner from "./SifrarnikMigracijeBanner.jsx";
import SifrarnikGlobalPretraga from "./SifrarnikGlobalPretraga.jsx";
import SpcAlarmPragoviPanel from "../SpcAlarmPragoviPanel.jsx";

import RadniNaloziPanel from "../RadniNaloziPanel.jsx";

import { fetchDeloviListaZaRn } from "../../lib/sifrarnikApi.js";
import { supabase } from "../../lib/supabaseClient.js";
import { useEkran } from "../../layout/useEkran.js";
import {
  ONBOARDING_EVENT,
  onboardingIskljucen,
  zavrsiSifrarnikOnboarding,
} from "../../lib/sifrarnikOnboarding.js";

const ONBOARDING_TABOVI = new Set(["glavni_unos", "pogon_mapa", "odrzavanje", "liste"]);



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

      ["odrzavanje", "Održavanje"],

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

      ["spc_alarm", "SPC alarm %"],

      ["sop", "SOP po delu (pregled)"],

      ["merila", "Merila / kalibracija"],

    ],

  },

  {

    id: "vozilo",

    naziv: "Celo vozilo",

    tabovi: [

      ["vozila", "Tipovi vozila"],

      ["defekti", "Defekti vozila"],

      ["delovi_vozilo", "Delovi vozila"],

    ],

  },

  {

    id: "moment",

    naziv: "Moment ključ",

    tabovi: [

      ["moment_sifrarnik", "Šifrarnik JOB"],

      ["moment_kljucevi", "Ključevi / kalibracija"],

    ],

  },

  {

    id: "alati",

    naziv: "Alati",

    tabovi: [

      ["barkod", "Barkod"],

      ["erp", "ERP uvoz"],

      ["backup", "Backup"],

    ],

  },

];



const SVI_TABOVI = GRUPE.flatMap((g) => g.tabovi);



/**

 * Modul 0 — Šifrarnik. Sav unos master podataka u aplikaciji (bez Excela).

 */

export default function SifrarnikHub({ C, addToast, korisnik }) {

  const { mob, linijaUredjaj } = useEkran();

  const [podtab, setPodtab] = useState("glavni_unos");

  const [voziloKod, setVoziloKod] = useState("MRAP");

  const [izabraniDeo, setIzabraniDeo] = useState(null);

  const [navCtx, setNavCtx] = useState(null);

  const [onboarding, setOnboarding] = useState(false);

  const [deloviZaRn, setDeloviZaRn] = useState([]);



  const idiNaTab = useCallback((tab, ctx = {}) => {

    setNavCtx({ ...ctx, ts: Date.now() });

    if (ctx.idDeo) {
      setIzabraniDeo({
        id_deo: ctx.idDeo,
        tip_kontrole: ctx.vozilo ? "vozilo" : "deo",
      });
    }

    setPodtab(tab);

  }, []);



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

    if (!ONBOARDING_TABOVI.has(podtab)) setPodtab("glavni_unos");

  }, [onboarding, podtab]);



  const iskljuciOnboarding = () => {

    zavrsiSifrarnikOnboarding();

    setOnboarding(false);

  };



  const ucitajDeloveRn = useCallback(async () => {

    try {

      setDeloviZaRn(await fetchDeloviListaZaRn());

    } catch (e) {

      addToast?.(e.message, "greska");

    }

  }, [addToast]);



  useEffect(() => { ucitajDeloveRn(); }, [ucitajDeloveRn]);



  const otvoriBarkod = (deo) => {

    setIzabraniDeo(deo);

    setPodtab("barkod");

  };



  const aktivnaGrupa = GRUPE.find((g) => g.tabovi.some(([id]) => id === podtab)) || GRUPE[0];

  const prikazGrupe = onboarding

    ? GRUPE.map((g) => ({

      ...g,

      tabovi: g.tabovi.filter(([id]) => ONBOARDING_TABOVI.has(id)),

    })).filter((g) => g.tabovi.length)

    : GRUPE;



  return (

    <div data-testid="sifrarnik-hub" style={{

      flex: 1, display: "flex", flexDirection: "column", minHeight: 0,

      padding: mob ? "8px 10px" : "12px 16px", overflow: "hidden",

    }}>

      {linijaUredjaj && (

        <div style={{

          marginBottom: 10, padding: "8px 10px", borderRadius: 8, flexShrink: 0,

          border: `1px solid ${C.zuta || "#b45309"}55`,

          background: `${C.zuta || "#b45309"}12`,

          color: C.tekst, fontSize: 10, lineHeight: 1.4,

        }}>

          Šifrarnik je namenjen desktop/laptop unosu. Na tabletu/telefonu liste se mogu pomerati horizontalno;

          za masovan unos koristi širi ekran.

        </div>

      )}

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

      <SifrarnikMigracijeBanner C={C} />

      <SifrarnikNastaviBanner C={C} onNavigate={idiNaTab} skriveno={onboarding} />

      <SifrarnikGlobalPretraga C={C} addToast={addToast} onNavigate={idiNaTab} />

      <div style={{ marginBottom: 12, flexShrink: 0 }}>

        <div style={{ color: C.tekst, fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>

          MODUL 0 — ŠIFRARNIK

        </div>

        <div style={{ color: C.sivi, fontSize: 10, marginTop: 4, lineHeight: 1.45 }}>

          Unos master podataka u aplikaciji. Glavni unos puni dimenzije i zavisne šifrarnike — ostali tabovi su pregled ili dopuna.

        </div>

      </div>



      <div style={{ display: "flex", gap: 12, marginBottom: 8, flexShrink: 0, flexWrap: "wrap" }}>

        {prikazGrupe.map((g) => (

          <button

            key={g.id}

            type="button"

            onClick={() => setPodtab(g.tabovi[0][0])}

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

            onClick={() => setPodtab(id)}

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

        {podtab === "glavni_unos" && (
          <GlavniUnosPanel
            C={C}
            addToast={addToast}
            korisnik={korisnik}
            onNavigate={idiNaTab}
            navSignal={navCtx}
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
          />
        )}

        {podtab === "odrzavanje" && (
          <SifrarnikOdrzavanjePanel C={C} addToast={addToast} onNavigate={idiNaTab} />
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
          />
        )}

        {podtab === "delovi_atr" && (
          <DeloviCrtezPanel
            C={C}
            addToast={addToast}
            pocetniIdDeo={navCtx?.idDeo}
            pocetniNavTs={navCtx?.ts}
            otvoriFormu={navCtx?.otvoriCrtezForm}
          />
        )}

        {podtab === "pogon_atr" && <PogonAtributivniPanel C={C} addToast={addToast} />}

        {podtab === "karakteristike" && <KarakteristikeMerljivePanel C={C} addToast={addToast} />}

        {podtab === "spc_alarm" && <SpcAlarmPragoviPanel C={C} addToast={addToast} />}

        {podtab === "sop" && <SopMerljivePanel C={C} addToast={addToast} />}

        {podtab === "merila" && <MerilaSifrarnikPanel C={C} addToast={addToast} korisnik={korisnik} />}

        {podtab === "moment_sifrarnik" && <MomentKljucHub C={C} addToast={addToast} />}

        {podtab === "moment_kljucevi" && <MerilaSifrarnikPanel C={C} addToast={addToast} korisnik={korisnik} />}

        {podtab === "vozila" && (

          <TipoviVozilaPanel C={C} addToast={addToast} voziloKod={voziloKod} onIzaberiVozilo={setVoziloKod} />

        )}

        {podtab === "defekti" && (

          <KatalogVoziloPanel C={C} addToast={addToast} voziloKod={voziloKod} onVoziloChange={setVoziloKod} />

        )}

        {podtab === "delovi_vozilo" && (

          <DeloviVoziloPanel C={C} addToast={addToast} voziloKod={voziloKod} onVoziloChange={setVoziloKod} onStampaj={otvoriBarkod} />

        )}

        {podtab === "barkod" && (

          <BarkodStampaPanel C={C} addToast={addToast} pocetniDeo={izabraniDeo || (navCtx?.idDeo ? { id_deo: navCtx.idDeo } : null)} />

        )}

        {podtab === "erp" && <ErpUvozPanel C={C} addToast={addToast} onNavigate={idiNaTab} />}

        {podtab === "backup" && <SifrarnikIzvozPanel C={C} addToast={addToast} />}

      </div>

    </div>

  );

}


