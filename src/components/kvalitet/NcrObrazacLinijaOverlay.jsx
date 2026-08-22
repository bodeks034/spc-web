import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import {
  fetchNcrPogoni,
  fetchPrethodniNcrZaOkidac,
  snimiNcrCapa,
  fetchNcrSviZaExcel,
  validirajNcrPayload,
} from "../../lib/ncrCapa.js";
import { ncrIzBaze, prefillNcrIzUnosaLinije, praznaNcrForma, NCR_STATUS_LINija } from "../../lib/ncrObrazacPolja.js";
import {
  evaluiraj8dOkidace,
  primeni8dPreporuku,
} from "../../lib/ncr8dOkidaci.js";
import { syncKvalitetFolder } from "../../lib/kvalitetFolderSync.js";
import { stampajPrazanNcrObrazac, stampajNcrObrazac } from "../../lib/ncrObrazacPdf.js";
import NcrObrazacForma from "./NcrObrazacForma.jsx";

/** Pun ekran NCR obrazac — pokreće se iz Modula 1 (unos na liniji). */
export default function NcrObrazacLinijaOverlay({
  otvoren,
  onZatvori,
  prefill = null,
  korisnik,
  C,
  addToast,
  sviDelovi = [],
  onOtvori8D: _onOtvori8D,
}) {
  const [forma, setForma] = useState(null);
  const [greske, setGreske] = useState({});
  const [pogoni, setPogoni] = useState([]);
  const [busy, setBusy] = useState(false);

  const osveziPogoni = useCallback(async () => {
    try {
      setPogoni(await fetchNcrPogoni(supabase));
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (!otvoren) return;
    osveziPogoni();
    const baza = prefillNcrIzUnosaLinije(prefill || {});
    setForma(baza);
    setGreske({});
  }, [otvoren, prefill, osveziPogoni]);

  const syncFolder = async (aktivni) => {
    try {
      const lista = await fetchNcrSviZaExcel(supabase);
      await syncKvalitetFolder({ pogoni, listaNcr: lista, aktivniObrazac: aktivni });
    } catch { /* */ }
  };

  const snimi = async () => {
    if (!forma) return;
    const formaLinija = { ...forma, status: NCR_STATUS_LINija };
    const v = validirajNcrPayload(formaLinija);
    if (!v.ok) {
      setGreske(v.greske);
      addToast?.("Popuni obavezna polja", "greska");
      return;
    }
    setGreske({});
    setBusy(true);
    const noviZapis = !forma.id;
    try {
      const prethodni = await fetchPrethodniNcrZaOkidac(supabase, formaLinija);
      const ev = evaluiraj8dOkidace(formaLinija, { prethodniLista: prethodni });
      const payload = primeni8dPreporuku(formaLinija, ev);
      payload.status = NCR_STATUS_LINija;
      const row = await snimiNcrCapa(supabase, payload, {
        id: forma.id || null,
        kreiraoId: korisnik?.radnikId,
      });
      const sacuvano = ncrIzBaze(row);
      setForma(sacuvano);
      addToast?.(`✓ NCR ${row.broj_ncr} prijavljen — inženjer zatvara u Modulu 2`, "uspeh");
      if (noviZapis) {
        try {
          const { obavestiNcrLinija } = await import("../../lib/autoAkcije.js");
          await obavestiNcrLinija(supabase, row, prefill || {});
        } catch { /* obaveštenje ne blokira snimanje */ }
      }
      await syncFolder(sacuvano);
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setBusy(false);
    }
  };

  if (!otvoren || !forma) return null;

  return (
    <div
      data-testid="ncr-linija-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: C.bg,
        display: "flex",
        flexDirection: "column",
        fontFamily: "'IBM Plex Mono', monospace",
      }}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderBottom: `1px solid ${C.border}`,
        background: C.panel,
        flexShrink: 0,
        gap: 8,
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.tekst }}>NCR obrazac — prijava sa linije</div>
          <div style={{ fontSize: 9, color: C.sivi }}>Modul 1 · status ostaje OPEN · inženjer zatvara u Modulu 2</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            data-testid="ncr-linija-stampaj-prazan"
            onClick={() => { try { stampajPrazanNcrObrazac(); } catch (e) { addToast?.(e.message, "greska"); } }}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.sivi,
              padding: "8px 12px",
              fontSize: 10,
              cursor: "pointer",
            }}
          >
            🖨 Prazan obrazac
          </button>
          <button
            type="button"
            data-testid="ncr-linija-zatvori"
            onClick={onZatvori}
            style={{
              background: "transparent",
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.sivi,
              padding: "8px 12px",
              fontSize: 10,
              cursor: "pointer",
            }}
          >
            ← Nazad na unos
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 12px 24px" }}>
        <NcrObrazacForma
          form={forma}
          setForm={setForma}
          greske={greske}
          C={C}
          sviDelovi={sviDelovi}
          pogoni={pogoni}
          onSnimi={snimi}
          onStampaj={() => { try { stampajNcrObrazac(forma); } catch (e) { addToast?.(e.message, "greska"); } }}
          onStampajPrazan={() => { try { stampajPrazanNcrObrazac(); } catch (e) { addToast?.(e.message, "greska"); } }}
          busy={busy}
          rezimLinija
        />
      </div>
    </div>
  );
}

export { prefillNcrIzUnosaLinije, praznaNcrForma };
