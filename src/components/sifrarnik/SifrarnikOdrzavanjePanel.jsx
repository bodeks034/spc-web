import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { btnStyle } from "./sifrarnikPanelStyle.js";

async function countTable(table, filter = {}) {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filter)) {
    q = q.eq(k, v);
  }
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

export default function SifrarnikOdrzavanjePanel({ C, addToast, onNavigate }) {
  const [podaci, setPodaci] = useState(null);
  const [loading, setLoading] = useState(true);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const [delovi, rnAktivni, merila, karakteristike] = await Promise.all([
        countTable("delovi"),
        countTable("radni_nalozi", { status: "aktivan" }),
        countTable("merila"),
        countTable("karakteristike_merljive"),
      ]);
      setPodaci({ delovi, rnAktivni, merila, karakteristike });
    } catch (e) {
      addToast?.(e.message, "greska");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  const stavke = [
    { tab: "rn", label: "Radni nalozi", hint: "Proveri zastarele aktivne RN" },
    { tab: "merila", label: "Merila / kalibracija", hint: "Kalibracije pred istek" },
    { tab: "karakteristike", label: "Dimenzije (pregled)", hint: "Duplikati pogon + pozicija" },
    { tab: "delovi", label: "Delovi (pregled)", hint: "Neaktivni / demo delovi" },
    { tab: "pogon_mapa", label: "Pogon mapa", hint: "Audit A–F pre go-live" },
    { tab: "glavni_unos", label: "Glavni unos", hint: "Novi delovi i propagacija" },
  ];

  return (
    <div>
      <div style={{ color: C.sivi, fontSize: 10, marginBottom: 12, lineHeight: 1.5 }}>
        Mesečna provera šifrarnika — brzi pregled i prečice ka tabovima.
      </div>

      {loading ? (
        <div style={{ color: C.sivi, fontSize: 11 }}>Učitavanje…</div>
      ) : podaci && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          gap: 8,
          marginBottom: 16,
        }}
        >
          {[
            ["Delovi", podaci.delovi],
            ["RN aktivni", podaci.rnAktivni],
            ["Merila", podaci.merila],
            ["Dimenzije", podaci.karakteristike],
          ].map(([lab, n]) => (
            <div key={lab} style={{
              background: C.panel,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: 10,
              textAlign: "center",
            }}
            >
              <div style={{ color: C.sivi, fontSize: 9 }}>{lab}</div>
              <div style={{ color: C.tekst, fontSize: 18, fontWeight: 700 }}>{n}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gap: 6 }}>
        {stavke.map((s) => (
          <button
            key={s.tab}
            type="button"
            onClick={() => onNavigate?.(s.tab)}
            style={{
              ...btnStyle(C, C.hover, { textAlign: "left", width: "100%" }),
              display: "block",
            }}
          >
            <strong style={{ color: C.plava }}>{s.label}</strong>
            <span style={{ display: "block", color: C.sivi, fontSize: 9, fontWeight: 400, marginTop: 2 }}>
              {s.hint}
            </span>
          </button>
        ))}
      </div>

      <button type="button" onClick={ucitaj} style={{ ...btnStyle(C, C.hover, { marginTop: 12, fontSize: 9 }) }}>
        ↻ Osveži brojeve
      </button>
    </div>
  );
}
