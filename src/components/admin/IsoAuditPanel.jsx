import { useState, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import {
  ucitajPoslednjeAkcije,
  ucitajPoslednjeRunove,
} from "../../lib/autoRunLog.js";
import {
  isoAuditKombinovanoCsv,
  isoAuditPaketKombinovano,
  preuzmiCsvBrowser,
  safeImeFajla,
} from "../../lib/isoAuditPaket.js";
import { ucitajAqlPodesavanja, ucitajAqlLotVelicina } from "../../lib/aqlIso2859.js";
import { ucitajIso3951Podesavanja } from "../../lib/iso3951.js";
import { PODRAZUMEVANI_SPC_ALARM_PRAGOVI, spcAlarmPragoviIzPodesavanja } from "../../lib/spcAlarmPragovi.js";
import { fetchPfmeaCpAuditSnapshot } from "../../lib/pfmeaCpDb.js";
import {
  ucitajTrasabilitetPoLotu,
  preuzmiTrasabilitetPdfPoLotu,
} from "../../lib/trasabilitetIzvestaj.js";

function danasMinus(dana) {
  const d = new Date();
  d.setDate(d.getDate() - dana);
  return d.toISOString().slice(0, 10);
}

/** Admin — ISO audit paket: export audit loga + trasabilitet PDF po lotu. */
export default function IsoAuditPanel({ C, addToast }) {
  const [datumOd, setDatumOd] = useState(danasMinus(30));
  const [datumDo, setDatumDo] = useState(new Date().toISOString().slice(0, 10));
  const [lot, setLot] = useState("");
  const [idDeo, setIdDeo] = useState("");
  const [brojAkcija, setBrojAkcija] = useState(0);
  const [brojRun, setBrojRun] = useState(0);
  const [loading, setLoading] = useState(false);
  const [ukljuciAnalitiku, setUkljuciAnalitiku] = useState(true);
  const [brojPfmea, setBrojPfmea] = useState(0);
  const [pdfBusy, setPdfBusy] = useState(false);

  const osveziBrojace = useCallback(async () => {
    const [akc, run, pfmea] = await Promise.all([
      ucitajPoslednjeAkcije(supabase, { datumOd, datumDo }),
      ucitajPoslednjeRunove(supabase, { datumOd, datumDo }),
      fetchPfmeaCpAuditSnapshot(supabase).catch(() => []),
    ]);
    setBrojAkcija(akc.length);
    setBrojRun(run.length);
    setBrojPfmea(pfmea.length);
  }, [datumOd, datumDo]);

  const izveziAuditCsv = async () => {
    setLoading(true);
    try {
      const [akcije, runovi, pfmea] = await Promise.all([
        ucitajPoslednjeAkcije(supabase, { datumOd, datumDo }),
        ucitajPoslednjeRunove(supabase, { datumOd, datumDo }),
        ukljuciAnalitiku ? fetchPfmeaCpAuditSnapshot(supabase).catch(() => []) : Promise.resolve([]),
      ]);

      let pragovi = PODRAZUMEVANI_SPC_ALARM_PRAGOVI;
      try {
        const { data } = await supabase.from("app_podesavanja").select("kljuc,vrednost");
        const settings = {};
        (data || []).forEach((r) => { settings[r.kljuc] = r.vrednost ?? ""; });
        pragovi = spcAlarmPragoviIzPodesavanja(settings);
      } catch { /* localStorage fallback u browseru */ }

      const csv = ukljuciAnalitiku
        ? isoAuditPaketKombinovano({
          akcije,
          runovi,
          pragovi,
          iso3951: ucitajIso3951Podesavanja(),
          aql: ucitajAqlPodesavanja(),
          pfmea,
          lotVelicinaAql: ucitajAqlLotVelicina(),
        })
        : isoAuditKombinovanoCsv({ akcije, runovi });

      const ime = ukljuciAnalitiku
        ? `ISO_audit_paket_${datumOd}_${datumDo}.csv`
        : `ISO_audit_${datumOd}_${datumDo}.csv`;
      preuzmiCsvBrowser(csv, ime);
      const extra = ukljuciAnalitiku ? ` · + ISO3951/AQL/pragovi/PfMEA (${pfmea.length})` : "";
      addToast?.(`Izvezeno: ${akcije.length} akcija, ${runovi.length} runova${extra}`, "uspeh");
    } catch (e) {
      addToast?.(e.message || "Greška exporta", "greska");
    } finally {
      setLoading(false);
    }
  };

  const pdfPoLotu = async () => {
    const lotQ = lot.trim();
    if (!lotQ) {
      addToast?.("Unesite lot ili VIN", "greska");
      return;
    }
    setPdfBusy(true);
    try {
      const pod = await ucitajTrasabilitetPoLotu(supabase, {
        lot: lotQ,
        idDeo: idDeo.trim() || null,
      });
      if (pod.greska) {
        addToast?.(pod.greska, "greska");
        return;
      }
      await preuzmiTrasabilitetPdfPoLotu(pod, lotQ);
      addToast?.(`PDF lot ${lotQ} preuzet`, "uspeh");
    } catch (e) {
      addToast?.(e.message || "Greška PDF-a", "greska");
    } finally {
      setPdfBusy(false);
    }
  };

  const INP = {
    background: C.input,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    color: C.tekst,
    fontSize: 11,
    padding: "8px 10px",
    boxSizing: "border-box",
  };

  return (
    <div
      data-testid="iso-audit-panel"
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
        ISO AUDIT PAKET
      </div>
      <p style={{ color: C.sivi, fontSize: 9, margin: "0 0 12px", lineHeight: 1.5 }}>
        Export auto audit loga (akcije + cron), trasabilitet PDF po lotu, i snapshot ISO 3951 / AQL / SPC pragova / PfMEA za reviziju.
        CLI: <code>npm run iso:audit</code>
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <label style={{ fontSize: 10, color: C.sivi }}>
          Od
          <input type="date" value={datumOd} onChange={(e) => setDatumOd(e.target.value)} style={{ ...INP, display: "block", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 10, color: C.sivi }}>
          Do
          <input type="date" value={datumDo} onChange={(e) => setDatumDo(e.target.value)} style={{ ...INP, display: "block", marginTop: 4 }} />
        </label>
        <button
          type="button"
          onClick={osveziBrojace}
          style={{ alignSelf: "flex-end", ...INP, cursor: "pointer", fontWeight: 700 }}
        >
          Pregled broja
        </button>
      </div>

      {(brojAkcija > 0 || brojRun > 0 || brojPfmea > 0) && (
        <div style={{ fontSize: 10, color: C.tekst, marginBottom: 10 }}>
          U periodu: <strong>{brojAkcija}</strong> auto-akcija · <strong>{brojRun}</strong> cron runova
          {brojPfmea > 0 && <> · <strong>{brojPfmea}</strong> PfMEA/CP dok.</>}
        </div>
      )}

      <label style={{
        display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.sivi,
        marginBottom: 10,
      }}>
        <input
          type="checkbox"
          checked={ukljuciAnalitiku}
          onChange={(e) => setUkljuciAnalitiku(e.target.checked)}
          data-testid="iso-audit-ukljuci-analitiku"
        />
        Uključi ISO 3951, AQL, SPC pragove i PfMEA u export (analitika ostaje nezavisna u aplikaciji)
      </label>

      <button
        type="button"
        data-testid="iso-audit-export-csv"
        onClick={izveziAuditCsv}
        disabled={loading}
        style={{
          background: C.plava,
          border: "none",
          borderRadius: 6,
          color: C.onAkcent,
          fontSize: 11,
          fontWeight: 700,
          padding: "10px 16px",
          cursor: loading ? "wait" : "pointer",
          marginBottom: 16,
        }}
      >
        {loading ? "…" : ukljuciAnalitiku ? "⬇ Export audit paket (CSV)" : "⬇ Export audit log (CSV)"}
      </button>

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.tekst, marginBottom: 8 }}>
          Trasabilitet PDF po lotu
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
          <label style={{ fontSize: 10, color: C.sivi, flex: "1 1 120px" }}>
            Lot / VIN *
            <input
              data-testid="iso-audit-lot"
              value={lot}
              onChange={(e) => setLot(e.target.value.toUpperCase())}
              placeholder="npr. LOT-A1"
              style={{ ...INP, display: "block", marginTop: 4, width: "100%" }}
            />
          </label>
          <label style={{ fontSize: 10, color: C.sivi, flex: "1 1 120px" }}>
            ID delo (opciono)
            <input
              value={idDeo}
              onChange={(e) => setIdDeo(e.target.value.toUpperCase())}
              placeholder="5502-A"
              style={{ ...INP, display: "block", marginTop: 4, width: "100%" }}
            />
          </label>
          <button
            type="button"
            data-testid="iso-audit-pdf-lot"
            onClick={pdfPoLotu}
            disabled={pdfBusy || !lot.trim()}
            style={{
              background: C.zelena,
              border: "none",
              borderRadius: 6,
              color: C.onAkcent,
              fontSize: 11,
              fontWeight: 700,
              padding: "10px 16px",
              cursor: pdfBusy ? "wait" : "pointer",
            }}
          >
            {pdfBusy ? "…" : "⬇ PDF po lotu"}
          </button>
        </div>
        <p style={{ color: C.sivi, fontSize: 9, margin: "8px 0 0" }}>
          Fajl: ISO_trasabilitet_{safeImeFajla(lot || "LOT")}_…pdf
        </p>
      </div>
    </div>
  );
}
