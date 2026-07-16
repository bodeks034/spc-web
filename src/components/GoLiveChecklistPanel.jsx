import { useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";

const STORAGE_KEY = "spc_go_live_checklist_v1";

const STAVKE = [
  { id: "docker", label: "Docker / Supabase radi (ping baze OK)" },
  { id: "migracije", label: "SQL migracije primenjene (Admin → Status šeme)" },
  { id: "auth", label: "Auth korisnici + radnici povezani" },
  { id: "licenca", label: "Licenca OK (proveri_licencu)" },
  { id: "sifrarnik", label: "Šifrarnik: bar 1 deo + greške / karakteristike" },
  { id: "unos", label: "Probni unos atributivne + merljive sačuvan" },
  { id: "backup", label: "Backup urađen (Admin → Backup ili npm run backup:db)" },
  { id: "https", label: "HTTPS / interni URL za tablete (firma)" },
  { id: "obuka", label: "Operateri imaju uputstvo / obuku" },
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
      const tabele = ["delovi", "radnici", "eskalacije", "radni_nalozi", "ciljevi"];
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
