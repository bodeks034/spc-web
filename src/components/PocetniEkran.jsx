import { useState, useEffect, useCallback, useRef } from "react";
import { useEkran } from "../lib/useEkran.js";
import { useAutoSmena } from "../hooks/useAutoSmena.js";
import {
  mozeSifrarnik, mozePrebacivanjeRezima, jeAdmin as mozeAdmin,
  mozePocetniPregledProizvodnje, mozeLinijaAlarmiPocetna, jeLinijaUloga,
  mozePregledSemeAlarm,
} from "../lib/uloge.js";
import { modulDozvoljen } from "../lib/licenca.js";
import { TEME } from "../lib/teme.js";
import AppHeader from "./AppHeader.jsx";
import BrendingNaslov from "./BrendingNaslov.jsx";
import AppFooter from "./AppFooter.jsx";
import ZajednickiDashboard from "./ZajednickiDashboard.jsx";
import LinijaAlarmiPocetna from "./LinijaAlarmiPocetna.jsx";
import SchemaAlarmBanner from "./SchemaAlarmBanner.jsx";
import KpiDoradaHub from "./KpiDoradaHub.jsx";
import LicencaStatusPanel from "./LicencaStatusPanel.jsx";
import DnevniPregledPanel from "./DnevniPregledPanel.jsx";
import UputstvoHub from "./UputstvoHub.jsx";
import ZdravljeSistemaKartica from "./ZdravljeSistemaKartica.jsx";
import { procitajNavigacijuKpi, trebaSkrolKpiHub } from "../lib/workflowAkcije.js";
import { datumIsoUSr } from "../lib/kpiUnos.js";

export default function PocetniEkran({
  korisnik, licenca, onIzbor, onOdjava, C, setC, rezimRada, onPromeniRezim, onOtvori8D, onOtvoriNcr, onOtvoriTab,
}) {
  const ekran = useEkran();
  const kpiHubRef = useRef(null);
  const [kpiModul, setKpiModul] = useState("merljive");
  const [kpiPrefill, setKpiPrefill] = useState(null);
  const [kpiToast, setKpiToast] = useState(null);
  const addKpiToast = useCallback((tekst, tip = "info") => {
    setKpiToast({ tekst, tip });
    window.setTimeout(() => setKpiToast(null), 4000);
  }, []);
  const pocetnaSmena = String(useAutoSmena(true));

  useEffect(() => {
    const nav = procitajNavigacijuKpi();
    if (nav) {
      setKpiPrefill(nav);
      if (nav.modul) setKpiModul(nav.modul);
    }
    if (trebaSkrolKpiHub() && kpiHubRef.current) {
      setTimeout(() => kpiHubRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    }
  }, []);

  const workflowHandlers = {
    onOtvoriNcr,
    onOtvori8D,
    onOtvoriModul: onIzbor,
    onNavigacija: ({ tab, modul }) => onOtvoriTab?.(tab, { modul }),
    onKpiDorada: (payload) => {
      setKpiPrefill({
        idDeo: payload.idDeo,
        datum: payload.datum,
        smena: payload.smena,
        radniNalog: payload.radniNalog,
        modul: payload.modul || "merljive",
      });
      if (payload.modul) setKpiModul(payload.modul);
      requestAnimationFrame(() => {
        kpiHubRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
    onSkrolKpi: () => {
      kpiHubRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  };
  const [izabraniPocetniModul, setIzabraniPocetniModul] = useState(
    () => (rezimRada === "analitika" ? 2 : 1),
  );
  const [uputstvoOtvoreno, setUputstvoOtvoreno] = useState(false);

  useEffect(() => {
    setIzabraniPocetniModul(rezimRada === "analitika" ? 2 : 1);
  }, [rezimRada]);

  const aktivniUnosModul = rezimRada === "linija" ? 1 : 2;
  const vidiPregledProizvodnje = mozePocetniPregledProizvodnje(korisnik.uloga);
  const vidiLinijaAlarme = mozeLinijaAlarmiPocetna(korisnik.uloga);
  const jeLinija = jeLinijaUloga(korisnik.uloga);
  const prefiksUnos = aktivniUnosModul === 1 ? "Modul 1 — " : "";
  const prefiksAnaliza = aktivniUnosModul === 2 ? "Analiza — " : "";

  const MODUL_SIFRARNIK = mozeSifrarnik(korisnik.uloga) ? [{
    id: "sifrarnik",
    modulBroj: 0,
    ikon: "📋",
    naziv: "Modul 0 — Šifrarnik",
    opis: "Osnovni unos delova · RN · kupci · dimenzije · greške · vozila · merila",
    boja: "#a78bfa",
    dostupan: modulDozvoljen(licenca, "sifrarnik"),
    key: "sifrarnik",
    blokPoruka: "Nije u licenci",
  }] : [];

  const MODULI_UNOS = [
    {
      id: "atributivne",
      modulBroj: aktivniUnosModul,
      ikon: "✗✓",
      naziv: aktivniUnosModul === 1
        ? `${prefiksUnos}Atributivne kontrole`
        : `${prefiksAnaliza}atributivne`,
      opis: aktivniUnosModul === 1
        ? "OK/NOK unos na liniji · p, C, u karte"
        : "OK/NOK · p, C, u, np, nC karte · Pareto · DPMO",
      boja: C.plava,
      dostupan: modulDozvoljen(licenca, "atributivne"),
      blokPoruka: "Nije u licenci",
    },
    {
      id: "varijabilne",
      modulBroj: aktivniUnosModul,
      ikon: "⌨",
      naziv: aktivniUnosModul === 1
        ? `${prefiksUnos}Varijabilne — ručni unos`
        : `${prefiksAnaliza}varijabilne`,
      opis: aktivniUnosModul === 1
        ? "Kucanje merenja na liniji · X̄/R"
        : "Kucanje merenja · X̄/R karte · Cp/Cpk",
      boja: C.zelena,
      dostupan: modulDozvoljen(licenca, "varijabilne"),
      rezim: "rucni",
      blokPoruka: "Nije u licenci",
    },
    {
      id: "varijabilne",
      modulBroj: aktivniUnosModul,
      ikon: "📟",
      naziv: aktivniUnosModul === 1
        ? `${prefiksUnos}Varijabilne — digitalni unos`
        : `${prefiksAnaliza}varijabilne digitalni unos`,
      opis: "Digitalna merila · USB / paste · serije A/B",
      boja: C.zelena,
      dostupan: modulDozvoljen(licenca, "varijabilne"),
      rezim: "digital",
      key: "varijabilne-digital",
      blokPoruka: "Nije u licenci",
    },
  ];

  const MODULI_ADMIN = mozeAdmin(korisnik.uloga) ? [{
    id: "admin",
    modulBroj: 99,
    ikon: "🔧",
    naziv: "Admin Panel",
    opis: "Excel ↔ Supabase · radnici · prekidi · reset smene",
    boja: C.zuta,
    dostupan: modulDozvoljen(licenca, "admin"),
    key: "admin",
    blokPoruka: "Nije u licenci",
  }] : [];

  const PREKIDAC_MODULA = [
    ...(mozeSifrarnik(korisnik.uloga) ? [{
      v: 0,
      label: "📋 Modul 0 — Šifrarnik",
      boja: "#a78bfa",
      onClick: () => setIzabraniPocetniModul(0),
    }] : []),
    ...(mozePrebacivanjeRezima(korisnik.uloga) ? [
      {
        v: 1,
        label: "🏭 Modul 1 — Unos",
        boja: C.zelena,
        onClick: () => {
          setIzabraniPocetniModul(1);
          onPromeniRezim?.("linija");
        },
      },
      {
        v: 2,
        label: "📊 Modul 2 — Analiza",
        boja: C.plava,
        onClick: () => {
          setIzabraniPocetniModul(2);
          onPromeniRezim?.("analitika");
        },
      },
    ] : []),
  ];

  const renderModulKarticu = (m) => (
    <button
      key={m.key || m.id}
      type="button"
      data-testid={`modul-${m.key || m.id}`}
      onClick={() => {
        if (!m.dostupan) return;
        if (m.rezim) sessionStorage.setItem("spc_mer_unos_rezim", m.rezim);
        onIzbor(m.id);
      }}
      style={{
        background: C.panel,
        border: `2px solid ${m.dostupan ? m.boja + "50" : C.border}`,
        borderRadius: 16,
        padding: ekran.mob ? "24px 20px" : "32px 28px",
        cursor: m.dostupan ? "pointer" : "not-allowed",
        textAlign: "left",
        transition: "all 0.2s",
        opacity: m.dostupan ? 1 : 0.5,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => { if (m.dostupan) e.currentTarget.style.borderColor = m.boja; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = m.dostupan ? m.boja + "50" : C.border; }}
    >
      <div style={{
        position: "absolute", top: -20, right: -20,
        fontSize: 80, opacity: 0.05, lineHeight: 1,
      }}>{m.ikon}</div>
      <div style={{
        color: m.boja, fontSize: ekran.mob ? 28 : 36,
        fontWeight: 700, marginBottom: 12, letterSpacing: -1,
      }}>{m.ikon}</div>
      <div style={{
        color: C.tekst, fontSize: ekran.mob ? 15 : 17,
        fontWeight: 700, marginBottom: 8, letterSpacing: 0.5,
      }}>{m.naziv}</div>
      <div style={{ color: C.sivi, fontSize: ekran.mob ? 11 : 12, lineHeight: 1.6 }}>
        {m.opis}
      </div>
      {!m.dostupan && (
        <div style={{
          marginTop: 12, background: C.zuta + "20",
          border: `1px solid ${C.zuta}40`,
          borderRadius: 6, padding: "4px 10px",
          color: C.zuta, fontSize: 10, display: "inline-block",
        }}>{m.blokPoruka || "Nije dostupno"}</div>
      )}
      {m.dostupan && (
        <div style={{
          marginTop: 14, color: m.boja,
          fontSize: 12, fontWeight: 700, letterSpacing: 1,
        }}>Otvori →</div>
      )}
    </button>
  );

  return (
    <div data-testid="pocetni-ekran" style={{
      minHeight:"100vh", background:C.bg,
      fontFamily:"'IBM Plex Mono',monospace", color:C.tekst,
      display:"flex", flexDirection:"column",
    }}>
      <AppHeader
        korisnik={korisnik}
        onOdjava={onOdjava}
        C={C}
        onToggleTema={() => setC(p => p.naziv === "tamna" ? TEME.svetla : TEME.tamna)}
        temaTamna={C.naziv === "tamna"}
        desnoExtra={(
          <button
            type="button"
            data-testid="btn-uputstvo"
            onClick={() => setUputstvoOtvoreno(true)}
            style={{
              background: `${C.plava}18`,
              border: `1px solid ${C.plava}55`,
              borderRadius: 5,
              color: C.plava,
              fontSize: 10,
              padding: "2px 8px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontWeight: 700,
            }}
          >
            📘 Uputstvo
          </button>
        )}
      />

      {uputstvoOtvoreno && (
        <UputstvoHub
          C={C}
          korisnik={korisnik}
          onZatvori={() => setUputstvoOtvoreno(false)}
        />
      )}

      {/* Sadržaj */}
      <div style={{
        flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent: jeLinija && !vidiPregledProizvodnje ? "center" : "flex-start",
        padding: ekran.mob ? "16px 12px 32px" : "24px 24px 40px",
        gap: ekran.mob ? 20 : 28,
        overflowY: "auto",
      }}>
        <div style={{ width: "100%", maxWidth: 960 }}>
          <BrendingNaslov
            C={C}
            varijanta={ekran.mob ? "kompakt" : "pocetna"}
            dobrodoslica={korisnik.ime}
          />
          <div style={{
            marginTop: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: C.hover,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 11,
            color: C.sivi,
          }}>
            Uloga:
            <strong style={{ color: C.tekst, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {korisnik.uloga || "—"}
            </strong>
          </div>
        </div>

        {(mozeAdmin(korisnik.uloga) || mozePregledSemeAlarm(korisnik.uloga)) && (
          <div style={{ width: "100%", maxWidth: 960 }}>
            <ZdravljeSistemaKartica
              C={C}
              korisnik={korisnik}
              onOtvoriAdmin={
                mozeAdmin(korisnik.uloga) && modulDozvoljen(licenca, "admin")
                  ? () => onIzbor("admin")
                  : undefined
              }
            />
          </div>
        )}

        {mozePregledSemeAlarm(korisnik.uloga) && (
          <div style={{ width: "100%", maxWidth: 960 }}>
            <SchemaAlarmBanner
              C={C}
              onOtvoriAdmin={
                mozeAdmin(korisnik.uloga) && modulDozvoljen(licenca, "admin")
                  ? () => onIzbor("admin")
                  : undefined
              }
            />
          </div>
        )}

        {vidiPregledProizvodnje && (
          <div style={{ width: "100%", maxWidth: 960 }}>
            <DnevniPregledPanel
              C={C}
              korisnik={korisnik}
              pocetnaSmena={pocetnaSmena}
              addToast={addKpiToast}
              onOtvoriModul={onIzbor}
              onOtvoriTab={onOtvoriTab}
              onOtvoriNcr={onOtvoriNcr}
              onKpiDorada={workflowHandlers.onKpiDorada}
            />
          </div>
        )}

        {vidiPregledProizvodnje && (
          <div style={{ width: "100%", maxWidth: 960, boxSizing: "border-box" }}>
            <ZajednickiDashboard
              C={C}
              kompakt
              sakrijPregledSmene
              korisnik={korisnik}
              onOtvori8D={onOtvori8D}
              onOtvoriNcr={onOtvoriNcr}
              onIzborModula={onIzbor}
              onWorkflow={workflowHandlers}
              filterSmena={pocetnaSmena}
            />
          </div>
        )}

        {vidiLinijaAlarme && <LinijaAlarmiPocetna C={C} />}

        {PREKIDAC_MODULA.length > 0 && (
          <div style={{
            display: "flex", gap: 8, width: "100%", maxWidth: 960,
            justifyContent: "stretch",
          }}>
            {PREKIDAC_MODULA.map((m) => {
              const aktivan = izabraniPocetniModul === m.v;
              return (
                <button
                  key={m.v}
                  type="button"
                  data-testid={m.v === 1 ? "rezim-linija" : m.v === 2 ? "rezim-analitika" : `modul-prekidac-${m.v}`}
                  onClick={m.onClick}
                  style={{
                    flex: 1,
                    background: aktivan ? `${m.boja}22` : C.panel,
                    border: `2px solid ${aktivan ? m.boja : C.border}`,
                    borderRadius: 10,
                    padding: "10px 16px",
                    cursor: "pointer",
                    color: aktivan ? C.tekst : C.sivi,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    textAlign: "center",
                    minHeight: 44,
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        )}

        {izabraniPocetniModul === 0 && MODUL_SIFRARNIK.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: ekran.mob ? "1fr" : "repeat(2, 1fr)",
            gap: 16, width: "100%", maxWidth: 960,
          }}>
            {MODUL_SIFRARNIK.map(renderModulKarticu)}
          </div>
        )}

        {izabraniPocetniModul !== 0 && (
        <>
        <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2, width: "100%", maxWidth: 960 }}>
          MODUL {aktivniUnosModul} — {aktivniUnosModul === 1 ? "UNOS" : "ANALIZA"}
        </div>

        <div style={{
          display:"grid",
          gridTemplateColumns: ekran.mob ? "1fr" : "repeat(2, 1fr)",
          gap:16, width:"100%", maxWidth:960,
        }}>
          {[...MODULI_UNOS, ...MODULI_ADMIN].map(renderModulKarticu)}
        </div>
        </>
        )}

        {vidiPregledProizvodnje && (
        <div ref={kpiHubRef} style={{ width: "100%", maxWidth: 960 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 10,
            flexWrap: "wrap",
          }}>
            <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2 }}>
              KPI DORADA / ŠKART
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { id: "merljive", label: "Merljive" },
                { id: "atributivne", label: "Atributivne" },
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setKpiModul(m.id)}
                  style={{
                    background: kpiModul === m.id ? `${C.zelena}22` : C.panel,
                    border: `1px solid ${kpiModul === m.id ? C.zelena : C.border}`,
                    borderRadius: 6,
                    color: kpiModul === m.id ? C.zelena : C.sivi,
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "5px 10px",
                    cursor: "pointer",
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <KpiDoradaHub
            C={C}
            addToast={addKpiToast}
            modul={kpiModul}
            inline
            otvoren
            pocetnaSmena={kpiPrefill?.smena || pocetnaSmena}
            pocetniIdDeo={kpiPrefill?.idDeo || ""}
            pocetniDatum={kpiPrefill?.datum ? datumIsoUSr(kpiPrefill.datum) : ""}
            pocetniRadniNalog={kpiPrefill?.radniNalog || ""}
            naslov={`KPI dorada · ${kpiModul === "merljive" ? "merljive" : "atributivne"}`}
          />
        </div>
        )}

        {kpiToast && (
          <div style={{
            position: "fixed",
            top: 12,
            right: 12,
            zIndex: 9999,
            background: kpiToast.tip === "greska" ? C.crvena : kpiToast.tip === "uspeh" ? C.zelena : C.plava,
            color: C.onAkcent,
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 11,
            maxWidth: 320,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}>
            {kpiToast.tekst}
          </div>
        )}

        {licenca && (
          <div style={{ width: "100%", maxWidth: 960 }}>
            <LicencaStatusPanel licenca={licenca} C={C} kompakt samoStatus={jeLinija} />
          </div>
        )}

        <AppFooter C={C} kompakt prikaziAutora />
      </div>
    </div>
  );
}

