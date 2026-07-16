import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { useAnalitikaFilter } from "../../lib/AnalitikaFilterContext.jsx";
import { datumOdIzPerioda } from "../../lib/analitikaFilterUtils.js";
import { brojMerenjaIzSop, uniqueDeloviIzSop } from "../../lib/pogonSop.js";
import {
  fetchMerenjaVarijabilna,
  nadjiKarakteristikuPoPoziciji,
} from "../../lib/merenjaVarijabilnaQuery.js";
import { fetchKpiUnos, agregirajKpiUnos } from "../../lib/kpiUnos.js";
import {
  podgrupeMerenja,
  izracunajXbarRKarte,
  izracunajIMRKarte,
  calcCpCpk,
  paretoNokPoPoziciji,
  statPoSmeni,
  trendKvalitetaPoDanu,
  agregatKvaliteta,
  nokPoPozicijiDashboard,
  sigmaProcesa,
} from "../../lib/varijabilneSpcStats.js";
import { graniceKarakteristike } from "../../lib/varijabilneUtils.js";
import { useEkran } from "../../lib/useEkran.js";
import AnalitikaSpcSnapshot from "../analitika/AnalitikaSpcSnapshot.jsx";
import SpcDashboardMerljive from "./SpcDashboardMerljive.jsx";
import SpcAsistent8dDugme from "./SpcAsistent8dDugme.jsx";
import { stampajEkran, preuzmiEkranPdf } from "../../lib/listaEkranIzvoz.js";

/** Modul 2 — SPC Dashboard merljive (filter iz hedera). */
export default function MerljiveAnalitikaDashboard({ C, addToast, onNavigacija, korisnik, onOtvori8D }) {
  const ekran = useEkran();
  const filter = useAnalitikaFilter();
  const idDeo = String(filter?.idDeo || "").trim().toUpperCase();
  const pozicija = filter?.pozicija || "";
  const smena = filter?.smena || "";
  const period = filter?.period || "7";

  const [karakteristike, setKarakteristike] = useState([]);
  const [nPodgrupa, setNPodgrupa] = useState(5);
  const [nazivDela, setNazivDela] = useState("");
  const [rawData, setRawData] = useState([]);
  const [kpiPeriod, setKpiPeriod] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!idDeo) {
      setKarakteristike([]);
      return undefined;
    }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("karakteristike_merljive")
        .select("id_deo,pozicija,lsl,usl,nominala,jedinica")
        .eq("id_deo", idDeo)
        .order("pozicija");
      if (alive) setKarakteristike(data || []);
    })();
    return () => { alive = false; };
  }, [idDeo]);

  const ucitaj = useCallback(async () => {
    if (!idDeo) {
      setRawData([]);
      setNazivDela("");
      return;
    }
    setLoading(true);
    try {
      const od = datumOdIzPerioda(period);
      const [merenja, sopRes] = await Promise.all([
        fetchMerenjaVarijabilna(supabase, {
          idDeo,
          select: "*",
          datumOd: od,
          smena: smena || undefined,
          pozicija: pozicija || undefined,
        }),
        supabase.from("sop_deo_varijabilni").select("id_deo,naziv_dela,broj_merenja").eq("id_deo", idDeo),
      ]);
      setRawData(merenja);
      const delovi = uniqueDeloviIzSop(sopRes.data || []);
      setNazivDela(delovi.find((d) => d.id_deo === idDeo)?.naziv_dela || sopRes.data?.[0]?.naziv_dela || "");
      setNPodgrupa(brojMerenjaIzSop(sopRes.data || [], idDeo));
    } catch (e) {
      addToast?.(e.message, "greska");
      setRawData([]);
    } finally {
      setLoading(false);
    }
  }, [idDeo, pozicija, smena, period, addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  useEffect(() => {
    if (!idDeo) {
      setKpiPeriod(null);
      return undefined;
    }
    let alive = true;
    (async () => {
      try {
        const od = datumOdIzPerioda(period);
        const rows = await fetchKpiUnos(supabase, {
          modul: "merljive",
          idDeo,
          datumOd: od,
          smena: smena || undefined,
          limit: 500,
        });
        if (!alive) return;
        setKpiPeriod(agregirajKpiUnos(rows, { modul: "merljive" }));
      } catch {
        if (alive) setKpiPeriod(null);
      }
    })();
    return () => { alive = false; };
  }, [idDeo, smena, period]);

  const kar = useMemo(() => {
    if (!pozicija || !idDeo) return null;
    return nadjiKarakteristikuPoPoziciji(karakteristike, idDeo, pozicija);
  }, [karakteristike, idDeo, pozicija]);

  const gr = useMemo(() => graniceKarakteristike(kar), [kar]);
  const podgrupe = useMemo(
    () => podgrupeMerenja(rawData, nPodgrupa, gr.jedinica),
    [rawData, nPodgrupa, gr.jedinica],
  );
  const spc = useMemo(() => izracunajXbarRKarte(podgrupe, nPodgrupa), [podgrupe, nPodgrupa]);
  const imr = useMemo(() => izracunajIMRKarte(rawData, gr.jedinica), [rawData, gr.jedinica]);
  const cpk = useMemo(() => {
    const sig = imr.sigmaHat || spc.sigmaHat;
    const mean = imr.xBar || spc.xbarBar;
    return calcCpCpk(mean, sig, gr.lsl, gr.usl);
  }, [imr, spc, gr.lsl, gr.usl]);
  const agregat = useMemo(
    () => agregatKvaliteta(rawData, !pozicija && kpiPeriod?.ukupno_kom > 0 ? kpiPeriod : null),
    [rawData, kpiPeriod, pozicija],
  );
  const sigmaNivo = sigmaProcesa(cpk, imr.sigmaHat || spc.sigmaHat, agregat.dpmo);
  const sigmaBoja = sigmaNivo >= 5 ? C.zelena : sigmaNivo >= 4 ? C.zuta : sigmaNivo >= 3 ? C.narandzasta : C.crvena;
  const paretoData = useMemo(() => paretoNokPoPoziciji(rawData, 8), [rawData]);
  const poSmeni = useMemo(() => statPoSmeni(rawData), [rawData]);
  const rtyTrend = useMemo(() => trendKvalitetaPoDanu(rawData), [rawData]);
  const poPoziciji = useMemo(() => nokPoPozicijiDashboard(rawData), [rawData]);

  const xbarPodaci = spc?.xbarPodaci || [];
  const rPodaci = spc?.rPodaci || [];
  const vanX = xbarPodaci.filter((d) => d.upozVanGranica || d.upozObrazac).length;
  const vanR = rPodaci.filter((d) => d.upozVanGranica || d.upozObrazac).length;

  const asistentMerljiveProps = useMemo(() => ({
    idDeo,
    nazivDela,
    period,
    pozicija,
    agregat,
    cpk,
    spc,
    paretoData,
    poSmeni,
    rawData,
    vanX,
    vanR,
  }), [
    idDeo, nazivDela, period, pozicija, agregat, cpk, spc,
    paretoData, poSmeni, rawData, vanX, vanR,
  ]);

  const navKarte = onNavigacija
    ? (spcTip) => onNavigacija({ tab: "karte", spcTip })
    : undefined;

  const [busyPdf, setBusyPdf] = useState(false);
  const izvozRef = useRef(null);

  const stampaj = async () => {
    if (!idDeo || !rawData.length) {
      addToast?.("Nema podataka za štampu — izaberi deo sa merenjima", "greska");
      return;
    }
    try {
      await stampajEkran(izvozRef.current, { naslov: "Dashboard — merljive", bgColor: C.bg });
    } catch (e) {
      addToast?.(e.message || "Štampa greška", "greska");
    }
  };

  const exportPdf = async () => {
    if (!idDeo || !rawData.length) {
      addToast?.("Nema podataka za PDF — izaberi deo sa merenjima", "greska");
      return;
    }
    setBusyPdf(true);
    try {
      await preuzmiEkranPdf(izvozRef.current, {
        naslov: "Dashboard — merljive",
        prefiksFajla: "Dashboard",
        bgColor: C.bg,
      });
      addToast?.("✓ PDF preuzet", "uspeh");
    } catch (e) {
      addToast?.(e.message || "PDF greška", "greska");
    } finally {
      setBusyPdf(false);
    }
  };

  return (
    <div style={{ padding: 16, overflow: "auto", flex: 1, boxSizing: "border-box" }}>
      <div ref={izvozRef} style={{ width: "100%", maxWidth: 960, margin: "0 auto" }}>
        <AnalitikaSpcSnapshot
          C={C}
          modul="merljive"
          uklopljen
          onNavigacija={onNavigacija}
          liveMerenja={idDeo ? rawData : undefined}
          liveKarakteristike={karakteristike}
          liveNPodgrupa={nPodgrupa}
          liveKpiPeriod={kpiPeriod}
          pozicijaOverride={pozicija}
          nazivDelaOverride={nazivDela}
        />

        <div style={{
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: "14px 14px 12px",
          marginTop: 14,
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 12,
          }}>
            <div style={{
              color: C.tekst,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.8,
            }}>
              ANALITIKA
              {idDeo && (
                <span style={{ color: C.sivi, fontWeight: 400, marginLeft: 8, fontSize: 10 }}>
                  {idDeo}{nazivDela ? ` · ${nazivDela}` : ""}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <div data-izvoz-hide style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={stampaj}
                  disabled={!rawData.length}
                  style={{
                    background: C.hover,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    color: C.tekst,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "7px 14px",
                    cursor: rawData.length ? "pointer" : "not-allowed",
                    opacity: rawData.length ? 1 : 0.5,
                  }}
                >
                  Štampaj
                </button>
                <button
                  type="button"
                  onClick={exportPdf}
                  disabled={busyPdf || !rawData.length}
                  style={{
                    background: busyPdf || !rawData.length ? C.hover : "#7c3aed",
                    border: "none",
                    borderRadius: 6,
                    color: busyPdf || !rawData.length ? C.sivi : C.onAkcent,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "7px 14px",
                    cursor: busyPdf || !rawData.length ? "not-allowed" : "pointer",
                  }}
                >
                  {busyPdf ? "PDF…" : "PDF"}
                </button>
              </div>
              {onOtvori8D && idDeo && rawData.length > 0 && (
                <SpcAsistent8dDugme
                  C={C}
                  korisnik={korisnik}
                  izvor="merljive"
                  onOtvori8D={onOtvori8D}
                  addToast={addToast}
                  disabled={loading}
                  merljiveProps={asistentMerljiveProps}
                />
              )}
            </div>
          </div>

          {!idDeo ? (
            <div style={{ color: C.border, fontSize: 12, textAlign: "center", padding: 40 }}>
              Izaberi deo u filteru hedera
            </div>
          ) : loading ? (
            <div style={{ color: C.sivi, fontSize: 12, textAlign: "center", padding: 40 }}>Učitavanje…</div>
          ) : rawData.length === 0 ? (
            <div style={{ color: C.border, fontSize: 12, textAlign: "center", padding: 40 }}>Nema merenja u periodu</div>
          ) : (
            <SpcDashboardMerljive
              C={C}
              ekran={ekran}
              idDeo={idDeo}
              pozicija={pozicija}
              kar={kar}
              spc={spc}
              cpk={cpk}
              agregat={agregat}
              sigmaNivo={sigmaNivo}
              sigmaBoja={sigmaBoja}
              paretoData={paretoData}
              poPoziciji={poPoziciji}
              poSmeni={poSmeni}
              rtyTrend={rtyTrend}
              podgrupe={podgrupe}
              nPodgrupa={nPodgrupa}
              onOpenTab={navKarte}
            />
          )}
        </div>
      </div>
    </div>
  );
}
