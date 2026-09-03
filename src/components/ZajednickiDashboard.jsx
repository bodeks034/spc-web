import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { useDashboardPodaci } from "../lib/useDashboardPodaci.js";
import { preuzmiDashboardCsv } from "../lib/dashboardCsvIzvoz.js";
import OperativniAlarmiStrip from "./OperativniAlarmiStrip.jsx";
import SefSmenaDashboard from "./SefSmenaDashboard.jsx";
import StaUradiTiSadaPanel from "./StaUradiTiSadaPanel.jsx";
import PrioritetSmenePanel from "./PrioritetSmenePanel.jsx";
import StanjePredikcijaPanel from "./StanjePredikcijaPanel.jsx";
import AnalitikaKpiSestPolja from "./analitika/AnalitikaKpiSestPolja.jsx";
import { bojaNivoa } from "../lib/operativniAlarmi.js";
import { mozeInteligencijaProcesa, jeAdmin } from "../lib/uloge.js";
import {
  ucitajPodesavanjaNotifikacija,
  obradiAlarmeNotifikacije,
  zatraziBrowserDozvolu,
} from "../lib/notifikacije.js";
import {
  proveriProaktivneDogadjaje,
  obradiProaktivneNotifikacije,
} from "../lib/proaktivneNotifikacije.js";
import { odrediModulZaDeo } from "../lib/deoModul.js";

export default function ZajednickiDashboard({ C, addToast, kompakt, onIzborModula, korisnik, onOtvori8D, onOtvoriNcr, onWorkflow, filterIdDeo, filterPeriod, filterLinija, filterSmena, sakrijFilterTraku = false, sakrijNaslov = false, sakrijPregledSmene = false, modul = null, onNavigacija, ugradi = false, sakrijKpiSest = false }) {
  const [period, setPeriod] = useState(filterPeriod ?? (kompakt ? "1" : "7"));
  const [idDeo, setIdDeo] = useState(filterIdDeo ?? "");
  const [modulDeo, setModulDeo] = useState(modul || "merljive");
  const {
    podaci, loading, greska, osvezavaSe, osvezi: ucitaj,
  } = useDashboardPodaci({
    period: Number(period),
    idDeo: idDeo || "",
    linija: filterLinija || "",
    smena: filterSmena ?? "",
  });
  const [sakrijAlarme, setSakrijAlarme] = useState(false);
  const [sviDelovi, setSviDelovi] = useState([]);
  const [lokalniToast, setLokalniToast] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from("delovi").select("id_deo,naziv_dela").order("id_deo"),
      supabase.from("sop_deo_varijabilni").select("id_deo,naziv_dela").order("id_deo"),
    ]).then(([dRes, sRes]) => {
      const mapa = new Map();
      [...(dRes.data || []), ...(sRes.data || [])].forEach(d => {
        if (d?.id_deo) mapa.set(d.id_deo, d);
      });
      setSviDelovi([...mapa.values()].sort((a, b) => String(a.id_deo).localeCompare(String(b.id_deo))));
    }).catch(() => {
      setSviDelovi([]);
    });
  }, []);

  const vidiInteligenciju = mozeInteligencijaProcesa(korisnik?.uloga);

  const toastFn = addToast || ((msg, tip) => {
    setLokalniToast({ msg, tip });
    setTimeout(() => setLokalniToast(null), 4000);
  });

  useEffect(() => {
    if (filterPeriod !== undefined) setPeriod(filterPeriod);
  }, [filterPeriod]);

  useEffect(() => {
    if (filterIdDeo !== undefined) setIdDeo(filterIdDeo);
  }, [filterIdDeo]);

  useEffect(() => {
    const id = String(idDeo || "").trim().toUpperCase();
    if (id.length < 3) {
      setModulDeo(modul || "merljive");
      return;
    }
    let otkaz = false;
    odrediModulZaDeo(supabase, id).then((m) => {
      if (!otkaz) setModulDeo(m);
    }).catch(() => {
      if (!otkaz) setModulDeo(modul || "merljive");
    });
    return () => { otkaz = true; };
  }, [idDeo, modul]);

  useEffect(() => {
    zatraziBrowserDozvolu();
  }, []);

  useEffect(() => {
    if (!podaci) return;
    let otkaz = false;
    (async () => {
      const settings = await ucitajPodesavanjaNotifikacija(supabase);
      if (podaci.alarmi?.length) {
        await obradiAlarmeNotifikacije(supabase, podaci.alarmi, settings);
      }
      const proaktivni = await proveriProaktivneDogadjaje(supabase, {
        modul: modul || "merljive",
        smena: filterSmena,
        alarmi: podaci.alarmi || [],
      });
      if (!otkaz && proaktivni.length) {
        await obradiProaktivneNotifikacije(supabase, settings, proaktivni);
      }
    })();
    return () => { otkaz = true; };
  }, [podaci, filterSmena, modul]);

  const workflowHandlers = {
    ...(onWorkflow || {}),
    onOtvoriNcr: onOtvoriNcr || onWorkflow?.onOtvoriNcr,
    onOtvori8D: onOtvori8D || onWorkflow?.onOtvori8D,
    onOtvoriModul: onIzborModula || onWorkflow?.onOtvoriModul,
    onNavigacija: onNavigacija || onWorkflow?.onNavigacija,
  };

  const pad = kompakt ? 0 : 0;

  return (
    <div style={{ width: "100%", maxWidth: ugradi ? "none" : 960, padding: pad, boxSizing: "border-box" }}>
      {!sakrijNaslov && (
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 12, flexWrap: "wrap", gap: 8,
      }}>
        <span style={{ color: C.tekst, fontSize: kompakt ? 12 : 14, fontWeight: 700, letterSpacing: 1 }}>
          PREGLED PROIZVODNJE
          {modul === "atributivne" && (
            <span style={{ color: C.plava, fontSize: 10, marginLeft: 8, fontWeight: 600 }}>· ATR</span>
          )}
          {modul === "merljive" && (
            <span style={{ color: C.zelena, fontSize: 10, marginLeft: 8, fontWeight: 600 }}>· MER</span>
          )}
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {!sakrijFilterTraku && (
            <>
          {/* Lista delova zna da bude u stotinama — datalist daje pretragu bez nove zavisnosti. */}
          <input
            list="dashboard-delovi"
            value={idDeo}
            onChange={e => setIdDeo(e.target.value.toUpperCase())}
            placeholder="Svi delovi"
            aria-label="Filter po ID dela"
            title="Filter po ID dela — kucaj za pretragu"
            style={{
              background: C.input, border: `1px solid ${idDeo ? C.plava : C.border}`, borderRadius: 6,
              color: C.tekst, fontSize: 10, padding: "6px 10px", fontFamily: "inherit",
              maxWidth: kompakt ? 120 : 160,
            }}
          />
          <datalist id="dashboard-delovi">
            {sviDelovi.map(d => (
              <option key={d.id_deo} value={d.id_deo}>{d.naziv_dela || ""}</option>
            ))}
          </datalist>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            style={{
              background: C.input, border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.tekst, fontSize: 10, padding: "6px 10px", cursor: "pointer", fontFamily: "inherit",
            }}>
            <option value="1">Danas</option>
            <option value="7">7 dana</option>
            <option value="30">30 dana</option>
          </select>
          {podaci?.osvezeno && (
            <span style={{ color: C.sivi, fontSize: 9 }} title="Poslednje osveženo">
              {new Date(podaci.osvezeno).toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {!ugradi && podaci && (
            <button type="button" onClick={() => preuzmiDashboardCsv(podaci, idDeo ? `dashboard-${idDeo}` : "dashboard")}
              title="Izvezi prikazane KPI i TOP NOK u CSV" aria-label="Izvezi u CSV"
              style={{
                background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.sivi, fontSize: 10, padding: "6px 10px", cursor: "pointer",
              }}>
              CSV
            </button>
          )}
          <button type="button" onClick={ucitaj} disabled={osvezavaSe} aria-label="Osveži podatke"
            style={{
              background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.sivi, fontSize: 10, padding: "6px 10px", cursor: "pointer",
            }}>
            {loading ? "…" : "↻"}
          </button>
            </>
          )}
        </div>
      </div>
      )}

      {(korisnik?.uloga === "sef" || korisnik?.uloga === "admin" || korisnik?.uloga === "kvalitet") && (
        <>
          <PrioritetSmenePanel
            C={C}
            modul={modul || "merljive"}
            smena={filterSmena || undefined}
            kompakt={kompakt}
            onIzaberiDeo={(deo) => setIdDeo(deo)}
            onWorkflow={workflowHandlers}
          />
          {idDeo && (
            <StaUradiTiSadaPanel
              C={C}
              idDeo={idDeo}
              modul={modul || "merljive"}
              smena={filterSmena}
              alarmi={podaci?.alarmi || []}
              kompakt={kompakt}
              onWorkflow={workflowHandlers}
            />
          )}
          {!sakrijPregledSmene && (
          <SefSmenaDashboard
            C={C}
            smena={filterSmena || undefined}
            linija={filterLinija || ""}
            idDeo={idDeo}
            filterPeriod={period}
            onNavigacija={onNavigacija}
            onOtvoriAdmin={
              jeAdmin(korisnik?.uloga) && onIzborModula
                ? () => onIzborModula("admin")
                : undefined
            }
          />
          )}
        </>
      )}

      {!ugradi && !sakrijAlarme && podaci?.alarmi?.length > 0 && (
        <>
          <OperativniAlarmiStrip
            alarmi={podaci.alarmi}
            C={C}
            kompakt
            kontekst={{
              idDeo,
              smena: filterSmena,
              modul: modulDeo,
            }}
            onZatvori={() => setSakrijAlarme(true)}
            onWorkflow={workflowHandlers}
          />
        </>
      )}

      {lokalniToast && (
        <div style={{
          marginBottom: 10, padding: "8px 12px", borderRadius: 8, fontSize: 11,
          background: lokalniToast.tip === "uspeh" ? C.zelena + "22" : C.crvena + "22",
          color: lokalniToast.tip === "uspeh" ? C.zelena : C.crvena,
          border: `1px solid ${lokalniToast.tip === "uspeh" ? C.zelena : C.crvena}40`,
        }}>
          {lokalniToast.msg}
        </div>
      )}

      {greska && (
        <div role="alert" style={{
          marginBottom: 10, padding: "8px 12px", borderRadius: 8, fontSize: 11,
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
          background: C.crvena + "18", color: C.crvena, border: `1px solid ${C.crvena}40`,
        }}>
          <span>{podaci ? `Osvežavanje nije uspelo: ${greska} (prikazani raniji podaci)` : greska}</span>
          <button type="button" onClick={ucitaj} disabled={osvezavaSe}
            style={{
              background: "transparent", border: `1px solid ${C.crvena}60`, borderRadius: 6,
              color: C.crvena, fontSize: 10, padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap",
            }}>
            Pokušaj ponovo
          </button>
        </div>
      )}

      {!ugradi && podaci?.odsecen?.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          data-testid="dashboard-odsecen-upozorenje"
          style={{
          marginBottom: 10, padding: "8px 12px", borderRadius: 8, fontSize: 10,
          background: C.narandzasta + "18", color: C.narandzasta, border: `1px solid ${C.narandzasta}40`,
        }}>
          Prikazan je odsečen skup podataka ({podaci.odsecen.join(", ")}) — KPI za ovaj period
          mogu biti nepotpuni. Suzi period ili filtriraj po delu/liniji. Za punu skalu: migracija 90.
        </div>
      )}

      {loading && !podaci ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          data-testid="dashboard-ucitavanje"
          style={{
          color: C.sivi,
          fontSize: ugradi ? 10 : 12,
          padding: ugradi ? "2px 0 0" : 24,
          textAlign: ugradi ? "left" : "center",
        }}>
          {ugradi ? "Učitavanje KPI…" : "Učitavanje…"}
        </div>
      ) : !podaci ? (
        <div style={{
          color: C.border,
          fontSize: ugradi ? 10 : 12,
          padding: ugradi ? "2px 0 0" : 24,
          textAlign: ugradi ? "left" : "center",
        }}>
          {ugradi ? "Nema KPI podataka" : "Nema podataka"}
        </div>
      ) : (
        <>
          {!sakrijKpiSest && (
            <div style={{ width: "100%", marginBottom: ugradi ? 0 : 14, boxSizing: "border-box" }}>
              <AnalitikaKpiSestPolja
                C={C}
                podaci={podaci}
                modul={modul}
                onNavigacija={onNavigacija}
              />
            </div>
          )}

          {!ugradi && podaci.najslabijaFaza && podaci.fazeKvaliteta?.length > 1 && (
            <div style={{
              color: C.sivi, fontSize: 10, marginBottom: 12, padding: "8px 10px",
              background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`,
            }}>
              Dijagnostika faza: najslabija <strong style={{ color: C.narandzasta }}>
                {podaci.najslabijaFaza.naziv} FPY {podaci.najslabijaFaza.fpy}%
              </strong>
              {" "}→ vuče RTY pogona ({podaci.rtyPogon}%)
            </div>
          )}

          {!ugradi && period === "1" && (
            <div style={{
              color: C.sivi, fontSize: 10, marginBottom: 12, padding: "8px 10px",
              background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`,
            }}>
              Danas merljive: {podaci.merljive.danasUk} merenja · {podaci.merljive.danasNok} NOK
              {podaci.aktivniNalozi > 0 && ` · ${podaci.aktivniNalozi} aktivnih naloga`}
            </div>
          )}

          {!ugradi && vidiInteligenciju && (
            <StanjePredikcijaPanel
              podaci={podaci}
              C={C}
              kompakt={kompakt}
              korisnik={korisnik}
              addToast={toastFn}
              sviDelovi={sviDelovi}
              defaultIdDeo={podaci.idDeoFilter || idDeo}
              onOtvori8D={onOtvori8D}
            />
          )}

          {!ugradi && podaci.topNok.length > 0 && (
            <div style={{
              background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10,
              padding: 12, marginBottom: 12,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2 }}>TOP NOK</div>
                {onNavigacija && (
                  <button type="button" onClick={() => onNavigacija({ tab: "karte" })}
                    style={{
                      background: "none", border: "none", color: C.plava, fontSize: 9,
                      cursor: "pointer", fontFamily: "inherit",
                    }}>
                    SPC karte →
                  </button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {podaci.topNok.slice(0, kompakt ? 5 : 8).map((p, i) => (
                  <button
                    key={`${p.izvor}-${p.naziv}-${i}`}
                    type="button"
                    onClick={onNavigacija ? () => onNavigacija({
                      tab: p.izvor === "merljive" ? "karte" : "karte",
                      spcTip: p.izvor === "merljive" ? "pareto" : "pareto",
                    }) : undefined}
                    style={{
                      display: "flex", justifyContent: "space-between", fontSize: 10,
                      background: "none", border: "none", padding: "2px 0", cursor: onNavigacija ? "pointer" : "default",
                      fontFamily: "inherit", width: "100%", textAlign: "left",
                    }}
                  >
                    <span style={{ color: C.tekst }}>
                      <span style={{ color: p.izvor === "merljive" ? C.zelena : C.plava, fontSize: 8 }}>
                        {p.izvor === "merljive" ? "±" : "✓"}
                      </span>
                      {" "}{p.naziv}
                    </span>
                    <span style={{ color: C.crvena, fontWeight: 700 }}>{p.count}×</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!ugradi && !kompakt && podaci.alarmi.length > 0 && (
            <div style={{
              background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12,
            }}>
              <div style={{ color: C.sivi, fontSize: 9, letterSpacing: 1.2, marginBottom: 8 }}>
                SVI ALARMI ({podaci.alarmi.length})
              </div>
              {podaci.alarmi.map(a => (
                <div key={a.id} style={{
                  fontSize: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}`,
                  color: bojaNivoa(a.nivo, C),
                }}>
                  <strong>{a.naslov}</strong>
                  {a.opis && <span style={{ color: C.sivi, marginLeft: 6 }}>— {a.opis}</span>}
                </div>
              ))}
            </div>
          )}

        </>
      )}
    </div>
  );
}
