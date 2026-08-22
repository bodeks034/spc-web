import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { fetchDuplikatiKarakteristike, fetchDelimicniDeloviPreview, STATUS_DEO_LABEL } from "../../lib/sifrarnikOdrzavanje.js";
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
  const [duplikati, setDuplikati] = useState([]);
  const [delimicni, setDelimicni] = useState([]);
  const [loading, setLoading] = useState(true);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const [delovi, rnAktivni, merila, karakteristike, dups, delim] = await Promise.all([
        countTable("delovi"),
        countTable("radni_nalozi", { status: "aktivan" }),
        countTable("merila"),
        countTable("karakteristike_merljive"),
        fetchDuplikatiKarakteristike(),
        fetchDelimicniDeloviPreview({ limit: 12 }),
      ]);
      setPodaci({ delovi, rnAktivni, merila, karakteristike });
      setDuplikati(dups.slice(0, 15));
      setDelimicni(delim);
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
    { tab: "delovi", label: "Delovi (pregled)", hint: "Status kompletnosti po delu" },
    { tab: "pogon_mapa", label: "Pogon mapa", hint: "Audit A–F pre go-live" },
    { tab: "glavni_unos", label: "Glavni unos", hint: "Novi delovi i propagacija" },
  ];

  return (
    <div>
      <div style={{ color: C.sivi, fontSize: 10, marginBottom: 12, lineHeight: 1.5 }}>
        Mesečna provera šifrarnika — brojevi, duplikati dimenzija i prečice ka tabovima.
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

      {duplikati.length > 0 && (
        <div style={{
          marginBottom: 14,
          padding: 10,
          borderRadius: 8,
          border: `1px solid ${C.narandzasta || "#f59e0b"}55`,
          background: `${C.narandzasta || "#f59e0b"}10`,
        }}
        >
          <div style={{ color: C.tekst, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
            Dupli pogon + pozicija ({duplikati.length}{duplikati.length >= 15 ? "+" : ""})
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 9, color: C.sivi, lineHeight: 1.5 }}>
            {duplikati.map((d) => (
              <li key={`${d.idDeo}-${d.pogon}-${d.pozicija}`}>
                <strong style={{ color: C.plava }}>{d.idDeo}</strong>
                {" · "}{d.pogon}/{d.pozicija} — {d.broj}×
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => onNavigate?.("karakteristike")}
            style={{ ...btnStyle(C, C.hover, { marginTop: 8, fontSize: 9 }) }}>
            Otvori dimenzije →
          </button>
        </div>
      )}

      {!loading && !duplikati.length && podaci && (
        <div style={{ color: C.zelena, fontSize: 10, marginBottom: 12 }}>
          ✓ Nema duplih kombinacija pogon + pozicija (u učitanom uzorku)
        </div>
      )}

      {!loading && delimicni.length > 0 && (
        <div style={{
          marginBottom: 14,
          padding: 10,
          borderRadius: 8,
          border: `1px solid ${C.plava}44`,
          background: `${C.plava}10`,
        }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
            <div style={{ color: C.tekst, fontSize: 11, fontWeight: 700 }}>
              Delimični delovi ({delimicni.length}+)
            </div>
            <button type="button" onClick={() => onNavigate?.("delovi")}
              style={{ ...btnStyle(C, C.hover, { fontSize: 9, padding: "2px 6px" }) }}>
              Svi delovi →
            </button>
          </div>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: 9, lineHeight: 1.6 }}>
            {delimicni.map(({ deo, status, koraci }) => {
              const stMeta = STATUS_DEO_LABEL[status];
              const prvi = koraci[0];
              return (
                <li key={deo.id_deo} style={{ marginBottom: 4 }}>
                  <button
                    type="button"
                    disabled={!prvi}
                    onClick={() => prvi && onNavigate?.(prvi.tab, prvi.ctx)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: prvi ? "pointer" : "default",
                      color: C.plava,
                      fontWeight: 700,
                      fontSize: 9,
                    }}
                  >
                    {deo.id_deo}
                  </button>
                  <span style={{ color: C.sivi }}> · </span>
                  <span style={{ color: stMeta?.boja === "zelena" ? C.zelena : C.narandzasta || "#f59e0b" }}>
                    {stMeta?.label || status}
                  </span>
                  {prvi && (
                    <span style={{ color: C.sivi }}> → {prvi.label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!loading && delimicni.length === 0 && podaci && (
        <div style={{ color: C.zelena, fontSize: 10, marginBottom: 12 }}>
          ✓ Svi aktivni delovi u uzorku su kompletni
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
