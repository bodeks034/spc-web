import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { fetchNcrSviZaExcel, fetchNcrPogoni } from "../../lib/ncrCapa.js";
import {
  strukturaDrvo,
  UPUTSTVO_LOKACIJA,
  KVALITET_ROOT_NAZIV,
} from "../../lib/kvalitetFolderStruktura.js";
import { stampajPrazanNcrObrazac } from "../../lib/ncrObrazacPdf.js";
import { stampajPrazanOsmdIzvestaj } from "../../lib/osmdIzvestajPdf.js";
import {
  poveziKvalitetFolder,
  syncKvalitetFolder,
  getKvalitetFolderStatus,
  otkaciKvalitetFolder,
  podrzavaFsAccess,
} from "../../lib/kvalitetFolderSync.js";

/** Upravljanje folderom KONTROLA KVALITETA — prikaz strukture i povezivanje sa diskom. */
export default function KvalitetFolderPanel({ C, addToast, forma = null, onStatusChange }) {
  const [status, setStatus] = useState({ povezan: false });
  const [pogoni, setPogoni] = useState([]);
  const [busy, setBusy] = useState(false);

  const osvezi = useCallback(async () => {
    const [st, pg] = await Promise.all([
      getKvalitetFolderStatus(),
      fetchNcrPogoni(supabase),
    ]);
    setStatus(st);
    setPogoni(pg);
  }, []);

  useEffect(() => { osvezi(); }, [osvezi]);

  useEffect(() => {
    onStatusChange?.(!!status.povezan);
  }, [status.povezan, onStatusChange]);

  const drvo = strukturaDrvo(pogoni);

  const kreirajFolder = async () => {
    setBusy(true);
    try {
      const lista = await fetchNcrSviZaExcel(supabase);
      const rez = await poveziKvalitetFolder({
        pogoni,
        listaNcr: lista,
        aktivniObrazac: forma,
      });
      await osvezi();
      addToast?.(
        `✓ Folder kreiran: ${rez.punaPutanja} · ${rez.procesFolderi.length} proces foldera`,
        "uspeh",
      );
    } catch (e) {
      addToast?.(e.message || "Greška pri kreiranju foldera", "greska");
    } finally {
      setBusy(false);
    }
  };

  const sinhronizuj = async () => {
    setBusy(true);
    try {
      const lista = await fetchNcrSviZaExcel(supabase);
      const rez = await syncKvalitetFolder({ pogoni, listaNcr: lista, aktivniObrazac: forma });
      if (rez.synced) addToast?.(`✓ Sinhronizovano: ${rez.putanja}`, "uspeh");
      else addToast?.(`Sinhronizacija preskočena (${rez.reason})`, "info");
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setBusy(false);
    }
  };

  const otkaci = async () => {
    await otkaciKvalitetFolder();
    await osvezi();
    addToast?.("Veza sa folderom uklonjena (fajlovi ostaju na disku)", "info");
  };

  const btn = (label, onClick, accent = C.plava, testId) => (
    <button type="button" data-testid={testId} disabled={busy} onClick={onClick}
      style={{
        background: `${accent}22`, border: `1px solid ${accent}`, borderRadius: 6,
        color: accent, padding: "8px 14px", fontWeight: 700, fontSize: 11,
        cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1,
      }}>
      {label}
    </button>
  );

  return (
    <div data-testid="kvalitet-folder-panel" style={{ padding: "4px 0 16px" }}>
      <div style={{
        padding: 14, borderRadius: 8, border: `1px solid ${C.border}`,
        background: C.panel, marginBottom: 12,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          📁 {KVALITET_ROOT_NAZIV} — glavni folder dokumentacije
        </div>
        <div style={{ fontSize: 10, color: C.sivi, lineHeight: 1.55, marginBottom: 10 }}>
          Svi NCR, 8D, PFMEA/CP i izveštaji (kupac, dobavljač, smena, trasabilitet, FAI, eskalacije)
          idu u jednu strukturu. Aplikacija kreira folder automatski — birate samo gde (npr. <strong>Dokumenti</strong>).
        </div>

        {status.povezan ? (
          <div data-testid="folder-status-povezan" style={{
            padding: 8, borderRadius: 6, background: `${C.zelena}15`,
            border: `1px solid ${C.zelena}`, fontSize: 10, marginBottom: 10,
          }}>
            <strong style={{ color: C.zelena }}>✓ Povezano</strong>
            <div style={{ marginTop: 4 }}>{status.punaPutanja || status.rootIme}</div>
          </div>
        ) : (
          <div style={{
            padding: 8, borderRadius: 6, background: `${C.zuta || "#eab308"}15`,
            border: `1px solid ${C.zuta || "#eab308"}`, fontSize: 10, marginBottom: 10,
          }}>
            Folder još nije povezan — kliknite <strong>Kreiraj folder</strong> (Chrome/Edge).
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {podrzavaFsAccess() && btn("📁 Kreiraj / poveži folder", kreirajFolder, C.plava, "kvalitet-folder-kreiraj")}
          {status.povezan && btn("↻ Sinhronizuj sada", sinhronizuj, C.plava, "kvalitet-folder-sync")}
          {status.povezan && btn("Otkači vezu", otkaci, C.sivi)}
          {btn("🖨 NCR prazan", () => stampajPrazanNcrObrazac(), C.sivi, "kvalitet-stampaj-ncr-prazan")}
          {btn("🖨 8D prazan", () => stampajPrazanOsmdIzvestaj().catch((e) => addToast?.(e.message, "greska")), C.sivi, "kvalitet-stampaj-8d-prazan")}
        </div>

        {!podrzavaFsAccess() && (
          <div style={{ fontSize: 10, color: C.crvena, marginTop: 8 }}>
            Direktno čuvanje na disk zahteva Chrome ili Edge. U Firefox-u koristite preuzimanje Excela.
          </div>
        )}
      </div>

      <div style={{
        fontFamily: "Consolas, monospace", fontSize: 11, lineHeight: 1.7,
        padding: 14, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg,
      }}>
        <div style={{ fontWeight: 700, marginBottom: 8, fontFamily: "inherit" }}>Struktura foldera</div>
        <div>📁 {drvo.root}/</div>
        {drvo.grane.map((g) => (
          <div key={g.id} style={{ marginLeft: 16 }}>
            <div>├── 📁 {g.folder}/</div>
            {g.fajl && <div style={{ marginLeft: 16, color: C.sivi }}>│     📊 {g.fajl}</div>}
            {g.primer && <div style={{ marginLeft: 16, color: C.sivi }}>│     📝 {g.primer}</div>}
            {g.deca?.map((d, i) => (
              <div key={d.folder} style={{ marginLeft: 16 }}>
                <div>│   ├── 📁 {d.folder}/</div>
                {d.fajlovi.map((f) => (
                  <div key={f} style={{ marginLeft: 32, color: C.sivi }}>│   │     📊 {f}</div>
                ))}
              </div>
            ))}
            <div style={{ marginLeft: 16, color: C.sivi, fontSize: 9 }}>│     {g.opis}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 9, color: C.sivi, marginTop: 12, lineHeight: 1.6 }}>
        {UPUTSTVO_LOKACIJA.map((l) => <div key={l}>· {l}</div>)}
      </div>
    </div>
  );
}
