import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import {
  fetchNcrCapaLista,
  fetchNcrSviZaExcel,
  fetchNcrPogoni,
  fetchPrethodniNcrZaOkidac,
  snimiNcrCapa,
  azurirajNcrStatus,
  NCR_STATUSI,
  NCR_PRIORITETI,
  prefill8dIzNcr,
  validirajNcrPayload,
  dozvoljeniNcrStatusi,
  labelStatusa,
} from "../../lib/ncrCapa.js";
import { praznaNcrForma, ncrIzBaze } from "../../lib/ncrObrazacPolja.js";
import { NCR_CAPA_TOOLTIP } from "../../lib/analitikaOpisi.js";
import { normalizujPrefill8d } from "../../lib/eskalacijeHelper.js";
import { stampajEkran, preuzmiEkranPdf } from "../../lib/listaEkranIzvoz.js";
import { stampajNcrCapa, preuzmiNcrCapaPdf } from "../../lib/ncrCapaPdf.js";
import { stampajNcrObrazac, preuzmiNcrObrazacPdf, stampajPrazanNcrObrazac, preuzmiPrazanNcrObrazacPdf } from "../../lib/ncrObrazacPdf.js";
import {
  preuzmiNcrRegistarMaster,
  preuzmiNcrObrazacTemplate,
  preuzmiNcrPojedinacniObrazac,
} from "../../lib/ncrExcelExport.js";
import {
  NCR_REGISTAR_MASTER,
  NCR_OBRAZAC_TEMPLATE,
  KVALITET_ROOT_NAZIV,
} from "../../lib/kvalitetFolderStruktura.js";
import {
  syncKvalitetFolder,
  imaPovezanKvalitetFolder,
  podrzavaFsAccess,
} from "../../lib/kvalitetFolderSync.js";
import ListaIzvozDugmad from "../ListaIzvozDugmad.jsx";
import NcrWorkflowVeza from "./NcrWorkflowVeza.jsx";
import NcrRegistarTabela from "./NcrRegistarTabela.jsx";
import NcrObrazacForma from "./NcrObrazacForma.jsx";
import Ncr8dOkidaciPanel from "./Ncr8dOkidaciPanel.jsx";
import KvalitetFolderPanel from "./KvalitetFolderPanel.jsx";
import {
  evaluiraj8dOkidace,
  primeni8dPreporuku,
  ncrMozeZatvoritiBez8d,
} from "../../lib/ncr8dOkidaci.js";

const bojaStatus = (s, C) => {
  if (s === "closed") return C.zelena;
  if (s === "verification") return C.plava;
  if (s === "osmd_progress") return C.ljubicasta || C.plava;
  if (s === "disposition") return C.narandzasta || C.zuta;
  if (s === "containment") return C.zuta;
  return C.crvena;
};

export default function NcrCapaPanel({
  korisnik, C, addToast, sviDelovi = [], onOtvori8D, onOtvoriTab, onOtvoriPfmeaCp,
  prefill = null, onPrefillUsed, idDeoIzFiltera = "",
}) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("otvoreni");
  const [filterDeo, setFilterDeo] = useState("");
  const [deloviMaster, setDeloviMaster] = useState([]);
  const [linijeSifrarnik, setLinijeSifrarnik] = useState([]);
  const idIzHedera = String(idDeoIzFiltera || "").trim().toUpperCase();
  const idZaListu = idIzHedera || String(filterDeo || "").trim().toUpperCase();
  const [filterPogon, setFilterPogon] = useState("");
  const [filterPrioritet, setFilterPrioritet] = useState("");
  const [pogoni, setPogoni] = useState([]);
  const [folderPovezan, setFolderPovezan] = useState(false);
  const [filterSmena, setFilterSmena] = useState("");
  const [samoRokProsao, setSamoRokProsao] = useState(false);
  const [tab, setTab] = useState("registar");
  const [forma, setForma] = useState(null);
  const [greske, setGreske] = useState({});
  const [busyEkran, setBusyEkran] = useState(false);
  const [busyForma, setBusyForma] = useState(false);
  const [busySnimi, setBusySnimi] = useState(false);
  const izvozRef = useRef(null);

  const rokProsao = (n) => {
    if (!n?.rok) return false;
    return n.rok < new Date().toISOString().slice(0, 10);
  };

  const osveziPogoni = useCallback(async () => {
    try {
      const p = await fetchNcrPogoni(supabase);
      setPogoni(p);
    } catch { /* */ }
  }, []);

  useEffect(() => { osveziPogoni(); }, [osveziPogoni]);

  useEffect(() => {
    let cancelled = false;
    supabase.from("linije").select("linija").then(({ data }) => {
      if (!cancelled) setLinijeSifrarnik(data || []);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!podrzavaFsAccess()) return;
    imaPovezanKvalitetFolder().then(setFolderPovezan);
  }, []);

  const syncKvalitet = async (aktivniObrazac) => {
    try {
      const listaSvi = await fetchNcrSviZaExcel(supabase);
      const rez = await syncKvalitetFolder({
        pogoni,
        listaNcr: listaSvi,
        aktivniObrazac,
      });
      if (rez.synced) {
        addToast?.(`✓ NCR folder ažuriran (Master + ${rez.obrasciPutanja || "obrasci"})`, "info");
      }
    } catch { /* */ }
  };

  const preuzmiExcelFirma = async () => {
    try {
      const listaSvi = await fetchNcrSviZaExcel(supabase);
      preuzmiNcrRegistarMaster({ lista: listaSvi });
      addToast?.(`✓ Preuzet ${NCR_REGISTAR_MASTER}`, "uspeh");
    } catch (e) {
      addToast?.(e.message || "Excel greška", "greska");
    }
  };

  const preuzmiSablon = () => {
    try {
      preuzmiNcrObrazacTemplate();
      addToast?.(`✓ Preuzet blanko šablon ${NCR_OBRAZAC_TEMPLATE}`, "uspeh");
    } catch (e) {
      addToast?.(e.message || "Excel greška", "greska");
    }
  };

  const otvoriObrazacIzRegistra = (n) => {
    setForma(ncrIzBaze(n));
    setTab("obrazac");
  };

  useEffect(() => {
    if (!prefill) return;
    if (prefill._otvoriDetaljId) {
      if (loading) return;
      const trazeni = String(prefill._otvoriDetaljId);
      const n = lista.find((r) => String(r.id) === trazeni);
      if (n) {
        setForma(ncrIzBaze(n));
        setTab("obrazac");
      }
      onPrefillUsed?.();
      return;
    }
    setForma({ ...praznaNcrForma(), ...prefill });
    setGreske({});
    setTab("obrazac");
    onPrefillUsed?.();
  }, [prefill, lista, loading]); // eslint-disable-line

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchNcrCapaLista(supabase, {
        status: filter === "sve" ? null : filter === "closed" ? "closed" : filter,
        idDeo: idZaListu || null,
        pogon: filterPogon || null,
        prioritet: filterPrioritet || null,
        smena: filterSmena || null,
        samoRokProsao,
      });
      setLista(data);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [filter, idZaListu, filterPogon, filterPrioritet, filterSmena, samoRokProsao, addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const idsDelova = useMemo(() => (
    [...new Set(lista.map((n) => String(n.id_deo || "").trim().toUpperCase()).filter(Boolean))].sort().join(",")
  ), [lista]);

  useEffect(() => {
    const ids = idsDelova ? idsDelova.split(",") : [];
    if (!ids.length) {
      setDeloviMaster([]);
      return undefined;
    }
    let cancelled = false;
    supabase.from("delovi")
      .select("id_deo,naziv_dela,linija:linije(linija)")
      .in("id_deo", ids)
      .then(({ data }) => { if (!cancelled) setDeloviMaster(data || []); });
    return () => { cancelled = true; };
  }, [idsDelova]);

  const deloviZaPrikaz = useMemo(() => {
    const poId = new Map();
    for (const d of sviDelovi || []) {
      const id = String(d?.id_deo || "").trim().toUpperCase();
      if (id) poId.set(id, d);
    }
    for (const d of deloviMaster) {
      const id = String(d?.id_deo || "").trim().toUpperCase();
      if (id) poId.set(id, { ...poId.get(id), ...d });
    }
    return [...poId.values()];
  }, [sviDelovi, deloviMaster]);

  useEffect(() => {
    if (!forma?.id) return;
    const fresh = lista.find((r) => r.id === forma.id);
    if (fresh) {
      const merged = ncrIzBaze(fresh);
      if (JSON.stringify(merged) !== JSON.stringify(forma)) setForma(merged);
    }
  }, [lista, forma?.id]); // eslint-disable-line

  const snimi = async () => {
    if (!forma) return;
    const v = validirajNcrPayload(forma);
    if (!v.ok) {
      setGreske(v.greske);
      addToast?.("Popuni obavezna polja", "greska");
      return;
    }

    setGreske({});
    setBusySnimi(true);
    try {
      const prethodni = await fetchPrethodniNcrZaOkidac(supabase, forma);
      const ev = evaluiraj8dOkidace(forma, { prethodniLista: prethodni });

      if (forma.status === "closed") {
        const z = ncrMozeZatvoritiBez8d(forma, ev);
        if (!z.ok) {
          addToast?.(z.greska, "greska");
          setBusySnimi(false);
          return;
        }
      }

      const payload = primeni8dPreporuku(forma, ev);

      const row = await snimiNcrCapa(supabase, payload, {
        id: forma.id || null,
        kreiraoId: korisnik?.radnikId,
      });
      addToast?.(`✓ NCR ${row.broj_ncr} sačuvan — Registar ažuriran`, "uspeh");
      if (ev.obavezan8d && !forma.osmd_id) {
        addToast?.("⚠ 8D je obavezan — otvorite 8D izveštaj (Word u 02_8D_Izvestaji)", "info");
      }
      if (row._eskalacijeZatvorene?.length) {
        addToast?.(`✓ Auto-zatvoreno ${row._eskalacijeZatvorene.length} eskalacija`, "info");
      }
      if (row._spcAlarmiZatvoreni?.length) {
        addToast?.(`✓ Auto-zatvoreno ${row._spcAlarmiZatvoreni.length} SPC alarma`, "info");
      }
      setForma(ncrIzBaze(row));
      await ucitaj();
      await osveziPogoni();
      await syncKvalitet(ncrIzBaze(row));
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setBusySnimi(false);
    }
  };

  const promeniStatus = async (status) => {
    if (!forma?.id) return;
    if (status === "closed") {
      const prethodni = await fetchPrethodniNcrZaOkidac(supabase, forma);
      const ev = evaluiraj8dOkidace(forma, { prethodniLista: prethodni });
      const z = ncrMozeZatvoritiBez8d(forma, ev);
      if (!z.ok) {
        addToast?.(z.greska, "greska");
        return;
      }
    }
    try {
      const row = await azurirajNcrStatus(supabase, forma.id, status);
      setForma(ncrIzBaze(row));
      addToast?.(`Status → ${labelStatusa(status)}`, "uspeh");
      await ucitaj();
      await syncKvalitet(ncrIzBaze(row));
    } catch (e) {
      addToast?.(e.message, "greska");
    }
  };

  const primeni8dPreporukuFn = (ev) => {
    setForma(primeni8dPreporuku(forma, ev, { prepisiRazlog: true }));
    addToast?.("Preporuka primenjena — 8D pokrenut = DA", "info");
  };

  const otvori8d = (ncr) => {
    onOtvori8D?.(normalizujPrefill8d(prefill8dIzNcr(ncr)));
  };

  const izaberiRed = (n) => {
    setForma(ncrIzBaze(n));
    setGreske({});
    setTab("obrazac");
  };

  const noviNcr = () => {
    const baza = praznaNcrForma();
    if (filterPogon) baza.pogon = filterPogon;
    setForma(baza);
    setGreske({});
    setTab("obrazac");
  };

  const exportOptsNaslov = idZaListu ? `NCR Registar — ${idZaListu}` : "NCR Registar";
  const exportOpts = { naslov: exportOptsNaslov, filter, filterDeo: idZaListu, filterPrioritet };

  const stampajEkranFn = async () => {
    if (!lista.length) { addToast?.("Nema NCR zapisa za štampu", "greska"); return; }
    try {
      await stampajEkran(izvozRef.current, { naslov: exportOptsNaslov, bgColor: C.bg });
    } catch (e) {
      addToast?.(e.message || "Štampa greška", "greska");
    }
  };

  const exportPdfEkran = async () => {
    if (!lista.length) { addToast?.("Nema NCR zapisa za PDF", "greska"); return; }
    setBusyEkran(true);
    try {
      await preuzmiEkranPdf(izvozRef.current, {
        naslov: exportOptsNaslov,
        prefiksFajla: "NCR_Registar",
        bgColor: C.bg,
      });
      addToast?.("✓ PDF preuzet", "uspeh");
    } catch (e) {
      addToast?.(e.message || "PDF greška", "greska");
    } finally {
      setBusyEkran(false);
    }
  };

  const stampajFormaFn = () => {
    if (!lista.length) { addToast?.("Nema NCR zapisa za štampu", "greska"); return; }
    try {
      stampajNcrCapa(lista, exportOpts);
    } catch (e) {
      addToast?.(e.message || "Štampa greška", "greska");
    }
  };

  const exportPdfForma = async () => {
    if (!lista.length) { addToast?.("Nema NCR zapisa za PDF", "greska"); return; }
    setBusyForma(true);
    try {
      await preuzmiNcrCapaPdf(lista, exportOpts);
      addToast?.("✓ PDF preuzet", "uspeh");
    } catch (e) {
      addToast?.(e.message || "PDF greška", "greska");
    } finally {
      setBusyForma(false);
    }
  };

  const stampajObrazacFn = () => {
    if (!forma) return;
    try {
      stampajNcrObrazac(forma);
    } catch (e) {
      addToast?.(e.message || "Štampa greška", "greska");
    }
  };

  const pdfObrazacFn = async () => {
    if (!forma) return;
    setBusySnimi(true);
    try {
      await preuzmiNcrObrazacPdf(forma);
      addToast?.("✓ PDF obrasca preuzet", "uspeh");
    } catch (e) {
      addToast?.(e.message || "PDF greška", "greska");
    } finally {
      setBusySnimi(false);
    }
  };

  const stampajPrazanObrazacFn = () => {
    try {
      stampajPrazanNcrObrazac();
    } catch (e) {
      addToast?.(e.message || "Štampa greška", "greska");
    }
  };

  const pdfPrazanObrazacFn = async () => {
    setBusyForma(true);
    try {
      await preuzmiPrazanNcrObrazacPdf();
      addToast?.("✓ Prazan NCR obrazac preuzet", "uspeh");
    } catch (e) {
      addToast?.(e.message || "PDF greška", "greska");
    } finally {
      setBusyForma(false);
    }
  };

  const INP = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 11,
    padding: "6px 8px",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div ref={izvozRef} data-testid="ncr-panel" style={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      height: "100%",
      minHeight: 0,
      maxWidth: "100%",
      boxSizing: "border-box",
      color: C.tekst,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 12, gap: 8, flexWrap: "wrap", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }} title={NCR_CAPA_TOOLTIP}>
            NCR — Registar Master + pojedinačni obrasci
          </div>
          <div style={{ fontSize: 10, color: C.sivi, marginTop: 4 }} title={NCR_CAPA_TOOLTIP}>
            Modul 2 · Master registar za statistiku · obrazac po NCR-u · {KVALITET_ROOT_NAZIV}/NCR_KVALITET
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" data-testid="ncr-excel-preuzmi" onClick={preuzmiExcelFirma}
            title={`Preuzmi ${NCR_REGISTAR_MASTER} — master registar (statistika)`}
            style={{
              background: `${C.plava}22`, border: `1px solid ${C.plava}`, borderRadius: 6,
              color: C.plava, padding: "8px 12px", fontWeight: 700, fontSize: 10, cursor: "pointer",
            }}>
            📥 Master registar
          </button>
          <button type="button" data-testid="ncr-excel-sablon" onClick={preuzmiSablon}
            title={`Preuzmi ${NCR_OBRAZAC_TEMPLATE} — blanko šablon (Save As)`}
            style={{
              background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.sivi, padding: "8px 12px", fontWeight: 700, fontSize: 10, cursor: "pointer",
            }}>
            📄 Blanko šablon
          </button>
          {podrzavaFsAccess() && (
            <button type="button" data-testid="ncr-folder-tab" onClick={() => setTab("folder")}
              title={`${KVALITET_ROOT_NAZIV} — struktura i povezivanje sa diskom`}
              style={{
                background: folderPovezan ? `${C.zelena}22` : "transparent",
                border: `1px solid ${folderPovezan ? C.zelena : C.border}`,
                borderRadius: 6, color: folderPovezan ? C.zelena : C.sivi,
                padding: "8px 12px", fontWeight: 700, fontSize: 10, cursor: "pointer",
              }}>
              {folderPovezan ? "✓ Folder" : "📁 Folder kvaliteta"}
            </button>
          )}
          {tab === "registar" && (
            <ListaIzvozDugmad
              C={C}
              disabled={!lista.length || loading}
              busyEkran={busyEkran}
              busyForma={busyForma}
              akcent={C.plava}
              onStampajEkran={stampajEkranFn}
              onPdfEkran={exportPdfEkran}
              onStampajForma={stampajFormaFn}
              onPdfForma={exportPdfForma}
            />
          )}
          <button type="button" data-testid="ncr-novi" onClick={noviNcr}
            title="Novi NCR"
            style={{
              background: C.crvena, border: "none", borderRadius: 6, color: C.onAkcent,
              padding: "8px 14px", fontWeight: 700, fontSize: 11, cursor: "pointer",
            }}>
            + Novi NCR
          </button>
          <button type="button" data-testid="ncr-stampaj-prazan" onClick={stampajPrazanObrazacFn}
            title="Štampaj prazan NCR obrazac (A–H) za ručno popunjavanje"
            style={{
              background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.sivi, padding: "8px 12px", fontWeight: 700, fontSize: 10, cursor: "pointer",
            }}>
            🖨 Prazan obrazac
          </button>
          <button type="button" data-testid="ncr-pdf-prazan" onClick={pdfPrazanObrazacFn}
            disabled={busyForma}
            title="Preuzmi prazan NCR obrazac kao PDF"
            style={{
              background: "transparent", border: `1px solid ${C.plava}55`, borderRadius: 6,
              color: C.plava, padding: "8px 12px", fontWeight: 700, fontSize: 10, cursor: "pointer",
            }}>
            PDF prazan
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexShrink: 0 }}>
        {[["registar", "Registar (Master)"], ["obrazac", "Obrazac"], ["folder", "Folder kvaliteta"]].map(([id, label]) => (
          <button key={id} type="button" data-testid={`ncr-tab-${id}`} onClick={() => setTab(id)}
            style={{
              background: tab === id ? `${C.plava}22` : "transparent",
              border: `1px solid ${tab === id ? C.plava : C.border}`,
              borderRadius: 6, padding: "6px 14px", fontSize: 11, cursor: "pointer",
              color: tab === id ? C.plava : C.sivi, fontWeight: tab === id ? 700 : 400,
            }}>
            {label}
          </button>
        ))}
      </div>

      {tab === "registar" && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", flexShrink: 0 }}>
            {[["otvoreni", "Otvoreni"], ["sve", "Svi"], ["closed", "Zatvoreni"]].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setFilter(id)}
                style={{
                  background: filter === id ? `${C.plava}22` : "transparent",
                  border: `1px solid ${filter === id ? C.plava : C.border}`,
                  borderRadius: 6, padding: "5px 10px", fontSize: 10, cursor: "pointer",
                  color: filter === id ? C.plava : C.sivi, fontWeight: filter === id ? 700 : 400,
                }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 6,
            marginBottom: 12,
            flexShrink: 0,
          }}>
            <input style={INP} value={idZaListu}
              onChange={(e) => { if (!idIzHedera) setFilterDeo(e.target.value.toUpperCase()); }}
              readOnly={!!idIzHedera}
              title={idIzHedera ? "Deo je izabran u filteru zaglavlja" : undefined}
              placeholder="ID deo filter" list="ncr-dela-filter" />
            <select
              data-testid="ncr-filter-pogon"
              style={INP}
              value={filterPogon}
              onChange={(e) => setFilterPogon(e.target.value)}
            >
              <option value="">Svi pogoni</option>
              {pogoni.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select style={INP} value={filterPrioritet} onChange={(e) => setFilterPrioritet(e.target.value)}>
              <option value="">Svi prioriteti</option>
              {NCR_PRIORITETI.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select style={INP} value={filterSmena} onChange={(e) => setFilterSmena(e.target.value)}>
              <option value="">Sve smene</option>
              {["1", "2", "3"].map((s) => <option key={s} value={s}>Smena {s}</option>)}
            </select>
            <label style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.sivi,
              padding: "6px 8px", border: `1px solid ${C.border}`, borderRadius: 6,
            }}>
              <input type="checkbox" checked={samoRokProsao} onChange={(e) => setSamoRokProsao(e.target.checked)} />
              Rok prošao
            </label>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <NcrRegistarTabela
              lista={lista}
              delovi={deloviZaPrikaz}
              linije={linijeSifrarnik}
              C={C}
              loading={loading}
              selektovanId={forma?.id}
              onIzaberi={izaberiRed}
              onOtvoriObrazac={otvoriObrazacIzRegistra}
              rokProsao={rokProsao}
            />
          </div>
        </>
      )}

      {tab === "obrazac" && (
        <div style={{
          flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden",
          WebkitOverflowScrolling: "touch", paddingBottom: 12,
        }}>
          <Ncr8dOkidaciPanel
            forma={forma}
            C={C}
            onOtvori8D={onOtvori8D && forma ? () => otvori8d(forma) : null}
            onPrimeniPreporuku={forma ? primeni8dPreporukuFn : null}
          />
          <NcrObrazacForma
            form={forma}
            setForm={setForma}
            greske={greske}
            C={C}
            sviDelovi={sviDelovi}
            pogoni={pogoni}
            onSnimi={snimi}
            onStampaj={stampajObrazacFn}
            onStampajPrazan={stampajPrazanObrazacFn}
            onOtvori8D={onOtvori8D ? otvori8d : null}
            busy={busySnimi}
          />
          {forma?.broj_ncr && (
            <div style={{ marginTop: 8, padding: "0 4px" }}>
              <button
                type="button"
                data-testid="ncr-excel-pojedinacni"
                onClick={() => {
                  preuzmiNcrPojedinacniObrazac(forma);
                  addToast?.(`✓ Preuzet ${forma.broj_ncr}.xlsx`, "uspeh");
                }}
                style={{
                  background: `${C.plava}18`, border: `1px solid ${C.plava}55`, borderRadius: 6,
                  color: C.plava, padding: "6px 12px", fontWeight: 700, fontSize: 10, cursor: "pointer",
                }}
              >
                📥 Preuzmi {forma.broj_ncr}.xlsx
              </button>
            </div>
          )}
          {forma?.id && (
            <div style={{ marginTop: 8, padding: "0 4px" }} onClick={(e) => e.stopPropagation()}>
              <NcrWorkflowVeza
                ncr={lista.find((r) => r.id === forma.id) || forma}
                C={C}
                onOtvori8D={onOtvori8D}
                onOtvoriTab={onOtvoriTab}
                onOtvoriPfmeaCp={onOtvoriPfmeaCp}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {NCR_STATUSI.filter(([s]) => dozvoljeniNcrStatusi(forma.status).includes(s)).map(([s, label]) => (
                  <button key={s} type="button" data-testid={`ncr-status-${s}`}
                    onClick={() => promeniStatus(s)}
                    style={{
                      background: `${bojaStatus(s, C)}18`,
                      border: `1px solid ${bojaStatus(s, C)}55`,
                      borderRadius: 5, padding: "4px 8px", fontSize: 9,
                      cursor: "pointer", color: bojaStatus(s, C),
                    }}>
                    → {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "folder" && (
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <KvalitetFolderPanel
            C={C}
            addToast={addToast}
            forma={forma}
            onStatusChange={setFolderPovezan}
          />
        </div>
      )}

      {sviDelovi.length > 0 && (
        <datalist id="ncr-dela-filter">
          {sviDelovi.map((d) => <option key={d.id_deo} value={d.id_deo} />)}
        </datalist>
      )}
    </div>
  );
}
