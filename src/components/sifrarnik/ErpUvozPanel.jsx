import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { formatErpUvozVreme } from "../../lib/erpUvozLog.js";
import {
  ERP_PRESET_LISTA,
  ucitajErpConfigBrowser,
  listaErpEntiteta,
} from "../../lib/erpUvozPresets.js";
import {
  previewErpUpload,
  pokreniErpUpload,
  formatErpUvozRezultat,
  sumErpRezultati,
} from "../../lib/erpUvozClient.js";
import {
  ucitajErpApiPodesavanja,
  sacuvajErpApiPodesavanja,
  proveriErpApi,
  pokreniErpServerTrigger,
  podrazumevaniErpApiUrl,
} from "../../lib/erpUvozApi.js";
import { btnStyle, inpStyle } from "./sifrarnikPanelStyle.js";
import ErpMonitoringStrip from "../ErpMonitoringStrip.jsx";

const CARD = (C) => ({
  background: C.panel,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "14px 16px",
  marginBottom: 12,
});

export default function ErpUvozPanel({ C, addToast }) {
  const [preset, setPreset] = useState("sap");
  const [mod, setMod] = useState("upload");
  const [fajlovi, setFajlovi] = useState([]);
  const [preview, setPreview] = useState(null);
  const [rezultat, setRezultat] = useState(null);
  const [busy, setBusy] = useState(false);
  const [logovi, setLogovi] = useState([]);
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiStatus, setApiStatus] = useState(null);

  const config = useMemo(() => {
    try {
      return ucitajErpConfigBrowser(preset);
    } catch {
      return null;
    }
  }, [preset]);

  const entiteti = useMemo(
    () => (config ? listaErpEntiteta(config) : []),
    [config],
  );

  const ucitajLog = useCallback(async () => {
    const { data } = await supabase
      .from("erp_uvoz_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12);
    setLogovi(data || []);
  }, []);

  useEffect(() => {
    const p = ucitajErpApiPodesavanja();
    setApiUrl(p.url);
    setApiKey(p.apiKey);
    ucitajLog();
  }, [ucitajLog]);

  const onFajlovi = async (e) => {
    const list = [...(e.target.files || [])];
    e.target.value = "";
    if (!list.length || !config) return;
    setFajlovi(list);
    setRezultat(null);
    try {
      const pv = await previewErpUpload(config, list);
      setPreview(pv);
    } catch (err) {
      addToast?.(err.message, "greska");
      setPreview(null);
    }
  };

  const uvozUpload = async (dryRun = false) => {
    if (!fajlovi.length) {
      addToast?.("Izaberi CSV fajlove", "greska");
      return;
    }
    setBusy(true);
    setRezultat(null);
    try {
      const res = await pokreniErpUpload(supabase, { preset, fajlovi, dryRun });
      setRezultat(res);
      if (res.ok) {
        const sum = sumErpRezultati(res.rezultati);
        addToast?.(
          dryRun
            ? `Preview: ${sum.validnih} validnih redova`
            : `✓ Uvezeno ${sum.upsertovano} redova u bazu`,
          "uspeh",
        );
        if (!dryRun) ucitajLog();
      } else {
        addToast?.(res.rezultati.find((r) => r.greska)?.greska || "Greška pri uvozu", "greska");
      }
    } catch (err) {
      addToast?.(err.message, "greska");
    } finally {
      setBusy(false);
    }
  };

  const testApi = async () => {
    sacuvajErpApiPodesavanja({ url: apiUrl, apiKey });
    setApiStatus("testiram");
    try {
      const info = await proveriErpApi({ url: apiUrl, apiKey });
      setApiStatus("ok");
      addToast?.(`ERP API OK — ${info.servis}`, "uspeh");
    } catch (err) {
      setApiStatus("greska");
      addToast?.(err.message, "greska");
    }
  };

  const serverTrigger = async (dryRun = false) => {
    sacuvajErpApiPodesavanja({ url: apiUrl, apiKey });
    setBusy(true);
    setRezultat(null);
    try {
      const res = await pokreniErpServerTrigger({ preset, dryRun, url: apiUrl, apiKey });
      setRezultat(res);
      if (res.ok) {
        const sum = sumErpRezultati(res.rezultati);
        addToast?.(
          dryRun
            ? `Server preview: ${sum.validnih} validnih`
            : `✓ Server uvoz: ${sum.upsertovano} redova`,
          "uspeh",
        );
        ucitajLog();
      } else {
        addToast?.(res.rezultati?.find((r) => r.greska)?.greska || "Server uvoz nije uspeo", "greska");
      }
    } catch (err) {
      addToast?.(err.message, "greska");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 820, color: C.sivi, fontSize: 11, lineHeight: 1.55 }}>
      <ErpMonitoringStrip C={C} addToast={addToast} />
      <div style={{ color: C.tekst, fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
        ERP uvoz u bazu
      </div>
      <p style={{ margin: "0 0 14px" }}>
        Direktan uvoz iz SAP / Pantheon CSV u Supabase — bez Excela. Konfiguracija:{" "}
        <code style={{ color: C.tekst }}>config/erp/</code>
      </p>

      <div style={CARD(C)}>
        <div style={{ color: C.tekst, fontWeight: 700, marginBottom: 10, fontSize: 12 }}>
          1. ERP sistem (preset)
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {ERP_PRESET_LISTA.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setPreset(p.id); setPreview(null); setRezultat(null); }}
              style={btnStyle(C, preset === p.id ? "#7c3aed" : C.hover, {
                disabled: false,
                color: preset === p.id ? C.onAkcent : C.tekst,
                border: preset === p.id ? "none" : `1px solid ${C.border}`,
              })}
            >
              {p.naziv}
            </button>
          ))}
        </div>
        {config && (
          <div style={{ marginTop: 8, fontSize: 10, color: C.sivi }}>
            {config.opis || config.erp_sistem}
          </div>
        )}
      </div>

      <div style={CARD(C)}>
        <div style={{ color: C.tekst, fontWeight: 700, marginBottom: 8, fontSize: 12 }}>
          Entiteti u configu
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {entiteti.map((e) => (
            <div key={e.id} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ color: e.ukljuceno ? C.zelena : C.sivi, width: 14 }}>
                {e.ukljuceno ? "●" : "○"}
              </span>
              <span style={{ color: C.tekst, minWidth: 110 }}>{e.id}</span>
              <span style={{ color: C.sivi }}>→ {e.tabela}</span>
              <span style={{ color: C.sivi, fontSize: 10 }}>({e.fajl})</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[
          ["upload", "📎 Upload CSV"],
          ["server", "🔄 Server trigger"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMod(id)}
            style={{
              ...btnStyle(C, mod === id ? C.plava : C.hover, {}),
              color: mod === id ? C.onAkcent : C.tekst,
              border: mod === id ? "none" : `1px solid ${C.border}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {mod === "upload" && (
        <div style={CARD(C)}>
          <div style={{ color: C.tekst, fontWeight: 700, marginBottom: 8 }}>Upload CSV fajlova</div>
          <p style={{ margin: "0 0 10px" }}>
            Izaberi jedan ili više CSV iz ERP izvoza. Imena fajlova se uparuju sa configom
            (npr. <code>delovi.csv</code>, <code>sap_radni_nalozi.csv</code>).
          </p>
          <label style={{ ...btnStyle(C, C.plava, { disabled: busy, display: "inline-block" }) }}>
            Izaberi CSV
            <input
              type="file"
              accept=".csv,text/csv"
              multiple
              onChange={onFajlovi}
              style={{ display: "none" }}
            />
          </label>
          {fajlovi.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 10 }}>
              {fajlovi.length} fajl(ova): {fajlovi.map((f) => f.name).join(", ")}
            </div>
          )}
          {preview?.nespojeni?.length > 0 && (
            <div style={{ marginTop: 8, color: C.crvena, fontSize: 10 }}>
              Nespojeni: {preview.nespojeni.join(", ")} — proveri imena u configu
            </div>
          )}
          {preview?.stavke?.length > 0 && (
            <div style={{ marginTop: 10, padding: 8, background: C.bg, borderRadius: 6 }}>
              {preview.stavke.map((s) => (
                <div key={s.entitet}>✓ {s.fajl} → {s.entitet}</div>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={busy || !fajlovi.length}
              onClick={() => uvozUpload(true)}
              style={btnStyle(C, C.hover, { disabled: busy || !fajlovi.length, color: C.tekst, border: `1px solid ${C.border}` })}
            >
              Preview (dry-run)
            </button>
            <button
              type="button"
              disabled={busy || !fajlovi.length}
              onClick={() => uvozUpload(false)}
              style={btnStyle(C, C.zelena, { disabled: busy || !fajlovi.length })}
            >
              {busy ? "Uvozim…" : "✓ Uvezi u bazu"}
            </button>
          </div>
        </div>
      )}

      {mod === "server" && (
        <div style={CARD(C)}>
          <div style={{ color: C.tekst, fontWeight: 700, marginBottom: 8 }}>Server trigger</div>
          <p style={{ margin: "0 0 10px" }}>
            Pokreće uvoz sa firm servera iz foldera{" "}
            <code>erp-drop/incoming/</code>. Prvo pokreni API:{" "}
            <code>npm run erp:api</code>
          </p>
          <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
            <label style={{ display: "block" }}>
              <span style={{ fontSize: 10 }}>API URL</span>
              <input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder={podrazumevaniErpApiUrl()}
                style={inpStyle(C, { width: "100%", marginTop: 4 })}
              />
            </label>
            <label style={{ display: "block" }}>
              <span style={{ fontSize: 10 }}>API ključ (ERP_API_KEY)</span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="opciono"
                style={inpStyle(C, { width: "100%", marginTop: 4 })}
              />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={testApi} style={btnStyle(C, C.hover, { color: C.tekst, border: `1px solid ${C.border}` })}>
              Test konekcije
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => serverTrigger(true)}
              style={btnStyle(C, C.hover, { disabled: busy, color: C.tekst, border: `1px solid ${C.border}` })}
            >
              Preview
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => serverTrigger(false)}
              style={btnStyle(C, C.zelena, { disabled: busy })}
            >
              {busy ? "Uvozim…" : "🔄 Osveži iz foldera"}
            </button>
            {apiStatus === "ok" && <span style={{ color: C.zelena }}>API dostupan</span>}
            {apiStatus === "greska" && <span style={{ color: C.crvena }}>API nedostupan</span>}
          </div>
        </div>
      )}

      {rezultat && (
        <div style={{ ...CARD(C), borderColor: rezultat.ok ? C.zelena : C.crvena }}>
          <div style={{ color: C.tekst, fontWeight: 700, marginBottom: 8 }}>Rezultat</div>
          <pre style={{
            margin: 0, whiteSpace: "pre-wrap", fontSize: 10, color: C.tekst,
            fontFamily: "inherit", lineHeight: 1.5,
          }}>
            {formatErpUvozRezultat(rezultat)}
          </pre>
          {rezultat.nespojeniFajlovi?.length > 0 && (
            <div style={{ marginTop: 8, color: C.crvena }}>
              Nespojeni: {rezultat.nespojeniFajlovi.join(", ")}
            </div>
          )}
        </div>
      )}

      <div style={CARD(C)}>
        <div style={{ color: C.tekst, fontWeight: 700, marginBottom: 8 }}>Istorija uvoza</div>
        {logovi.length === 0 ? (
          <div>Nema zapisa — pokreni uvoz ili cron.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
            <thead>
              <tr style={{ color: C.sivi, textAlign: "left" }}>
                <th style={{ padding: "4px 6px" }}>Vreme</th>
                <th style={{ padding: "4px 6px" }}>Izvor</th>
                <th style={{ padding: "4px 6px" }}>Upsert</th>
                <th style={{ padding: "4px 6px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logovi.map((l) => (
                <tr key={l.id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "6px", color: C.tekst }}>{formatErpUvozVreme(l.created_at)}</td>
                  <td style={{ padding: "6px" }}>{l.izvor}</td>
                  <td style={{ padding: "6px" }}>{l.upsertovano ?? 0}</td>
                  <td style={{ padding: "6px", color: l.uspeh ? C.zelena : C.crvena }}>
                    {l.uspeh ? "OK" : "Greška"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
