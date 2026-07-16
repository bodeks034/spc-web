import { useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const STORAGE_KEY = "spc_go_live_checklist_v1";

const STAVKE = [
  { id: "docker", label: "Docker / Supabase radi (ping baze OK)" },
  { id: "migracije", label: "SQL migracije primenjene (uključujući 66_linija_pouzdanost)" },
  { id: "auth", label: "Auth email ↔ radnici.user_id povezano (nema „nema radnik ID”)" },
  { id: "pin", label: "PIN postavljen za operatere/kontrolore na tabletu (Admin → PIN)" },
  { id: "licenca", label: "Licenca OK (proveri_licencu)" },
  { id: "sifrarnik", label: "Šifrarnik: delovi + greške / karakteristike" },
  { id: "lista", label: "Kontrolna lista: ≥5 aktivnih stavki" },
  { id: "rn", label: "Bar 1 aktivan radni nalog (RN) za pilot deo" },
  { id: "unos", label: "Probni unos atributivne + merljive sačuvan" },
  { id: "offline", label: "Probaj offline / nestabilnu mrežu — red se sinhronizuje" },
  { id: "alarm", label: "Alarm drill: blokada → potvrdi/zatvori sa komentarom" },
  { id: "backup", label: "Backup urađen (JSON ili npm run backup:db)" },
  { id: "restore", label: "Restore dump testiran (npm run restore:db)" },
  { id: "https", label: "HTTPS / interni URL za tablete (firma)" },
  { id: "obuka", label: "Operateri imaju Obuku Modul 1" },
  { id: "erp", label: "ERP drop folder / cron (ako se koristi)" },
];

function ucitaj() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Interaktivni go-live checklist (lokalno u browseru). */
export default function GoLiveChecklistPanel({ C, addToast }) {
  const [stanje, setStanje] = useState(ucitaj);
  const [busyBackup, setBusyBackup] = useState(false);

  const snimi = (next) => {
    setStanje(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const toggle = (id) => {
    snimi({ ...stanje, [id]: !stanje[id] });
  };

  const uradjeno = useMemo(
    () => STAVKE.filter((s) => stanje[s.id]).length,
    [stanje],
  );

  const reset = () => {
    snimi({});
    addToast?.("Checklist resetovan", "info");
  };

  const eksportJsonBackup = async () => {
    setBusyBackup(true);
    try {
      const tabele = ["delovi", "radnici", "eskalacije", "radni_nalozi", "ciljevi", "kontrolna_lista_stavke"];
      const out = { datum: new Date().toISOString(), tabele: {} };
      for (const t of tabele) {
        const { data, error } = await supabase.from(t).select("*").limit(5000);
        if (error) out.tabele[t] = { greska: error.message };
        else out.tabele[t] = data || [];
      }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `TRI-CORE_backup_light_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      snimi({ ...stanje, backup: true });
      addToast?.("✓ Light backup preuzet (JSON). Za puni SQL: npm run backup:db", "uspeh");
    } catch (e) {
      addToast?.(e.message || "Backup greška", "greska");
    } finally {
      setBusyBackup(false);
    }
  };

  const proveriPilotPodatke = async () => {
    try {
      const [lista, rn, radnici] = await Promise.all([
        supabase.from("kontrolna_lista_stavke").select("id", { count: "exact", head: true }).eq("aktivna", true),
        supabase.from("radni_nalozi").select("id", { count: "exact", head: true }).in("status", ["aktivan", "u_toku", "otvoren"]),
        supabase.from("radnici").select("id,user_id,pin_hash,aktivan").eq("aktivan", true).limit(200),
      ]);
      const listaN = lista.count || 0;
      const rnN = rn.count ?? (Array.isArray(rn.data) ? rn.data.length : 0);
      const rs = radnici.data || [];
      const saAuth = rs.filter((r) => r.user_id).length;
      const saPin = rs.filter((r) => r.pin_hash).length;
      const next = {
        ...stanje,
        lista: listaN >= 5,
        rn: rnN >= 1,
        auth: saAuth >= 1,
        pin: saPin >= 1,
      };
      snimi(next);
      addToast?.(
        `Pilot: lista ${listaN}, RN aktivnih ${rnN}, Auth ${saAuth}, PIN ${saPin}`,
        listaN >= 5 && rnN >= 1 && saAuth >= 1 ? "uspeh" : "info",
      );
    } catch (e) {
      addToast?.(e.message || "Provera nije uspela", "greska");
    }
  };

  return (
    <div style={{
      background: C.panel,
      border: `1px solid ${C.border}`,
      borderRadius: 12,
      padding: 18,
      marginBottom: 16,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 12, flexWrap: "wrap", gap: 8,
      }}>
        <div>
          <div style={{ color: C.tekst, fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
            GO-LIVE CHECKLIST
          </div>
          <div style={{ color: C.sivi, fontSize: 10, marginTop: 4 }}>
            {uradjeno}/{STAVKE.length} · čuva se u ovom pregledaču
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={proveriPilotPodatke}
            style={{
              background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.tekst, fontSize: 10, fontWeight: 700, padding: "7px 12px", cursor: "pointer",
            }}>
            Proveri pilot
          </button>
          <button type="button" onClick={eksportJsonBackup} disabled={busyBackup}
            style={{
              background: C.plava, border: "none", borderRadius: 6, color: C.onAkcent,
              fontSize: 10, fontWeight: 700, padding: "7px 12px", cursor: "pointer",
            }}>
            {busyBackup ? "Backup…" : "Backup (JSON)"}
          </button>
          <button type="button" onClick={reset}
            style={{
              background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
              color: C.sivi, fontSize: 10, padding: "7px 12px", cursor: "pointer",
            }}>
            Reset
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {STAVKE.map((s) => (
          <label key={s.id} style={{
            display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
            padding: "8px 10px", borderRadius: 8,
            background: stanje[s.id] ? `${C.zelena}12` : C.hover,
            border: `1px solid ${stanje[s.id] ? `${C.zelena}40` : C.border}`,
          }}>
            <input
              type="checkbox"
              checked={!!stanje[s.id]}
              onChange={() => toggle(s.id)}
              style={{ marginTop: 2 }}
            />
            <span style={{
              color: C.tekst, fontSize: 12,
              textDecoration: stanje[s.id] ? "line-through" : "none",
              opacity: stanje[s.id] ? 0.75 : 1,
            }}>
              {s.label}
            </span>
          </label>
        ))}
      </div>
      <div style={{ color: C.border, fontSize: 10, marginTop: 12, lineHeight: 1.45 }}>
        Pun SQL backup na serveru: <code>npm run backup:db</code> · Storage: <code>npm run backup:storage</code>
        · Uputstvo: GO_LIVE_RUNBOOK u Obuka paketu.
      </div>
    </div>
  );
}
