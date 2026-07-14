import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { formatErpUvozVreme } from "../lib/erpUvozLog.js";
import {
  sumirajErpUvozLog,
  sastaviErpDiffSažetak,
  logJeDanas,
  formatirajErpLogKratko,
  danasIso,
} from "../lib/erpUvozDiff.js";

/** Admin — ERP diff: šta je novo/izmenjeno danas (bez čitanja loga). */
export default function ErpDiffPanel({ C }) {
  const [logovi, setLogovi] = useState([]);
  const [izabraniId, setIzabraniId] = useState(null);
  const [loading, setLoading] = useState(true);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("erp_uvoz_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);
    const lista = (data || []).map(sumirajErpUvozLog).filter(Boolean);
    setLogovi(lista);
    if (!izabraniId && lista[0]) setIzabraniId(lista[0].id);
    else if (izabraniId && !lista.find((l) => l.id === izabraniId) && lista[0]) {
      setIzabraniId(lista[0].id);
    }
    setLoading(false);
  }, [izabraniId]);

  useEffect(() => { ucitaj(); }, []); // eslint-disable-line

  const trenutni = logovi.find((l) => l.id === izabraniId) || logovi[0] || null;
  const idx = logovi.findIndex((l) => l.id === trenutni?.id);
  const prethodni = idx >= 0 ? logovi[idx + 1] : null;
  const sazetak = sastaviErpDiffSažetak(trenutni, prethodni);
  const danasLogovi = logovi.filter(logJeDanas);

  return (
    <div
      data-testid="erp-diff-panel"
      style={{
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
        <div>
          <div style={{ color: C.tekst, fontSize: 12, fontWeight: 700 }}>ERP DIFF — ŠTA JE NOVO DANAS</div>
          <div style={{ color: C.sivi, fontSize: 9, marginTop: 2 }}>
            Posle dnevnog uvoza · {danasIso()} · {danasLogovi.length} uvoz(a) danas
          </div>
        </div>
        <button
          type="button"
          onClick={ucitaj}
          disabled={loading}
          style={{
            background: C.hover, border: `1px solid ${C.border}`, borderRadius: 6,
            color: C.sivi, fontSize: 10, padding: "4px 10px", cursor: "pointer",
          }}
        >
          {loading ? "…" : "↻"}
        </button>
      </div>

      {logovi.length > 1 && (
        <select
          data-testid="erp-diff-izbor"
          value={trenutni?.id || ""}
          onChange={(e) => setIzabraniId(Number(e.target.value))}
          style={{
            width: "100%",
            background: C.input,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            color: C.tekst,
            fontSize: 10,
            padding: "6px 8px",
            marginBottom: 10,
          }}
        >
          {logovi.map((l) => (
            <option key={l.id} value={l.id}>
              {formatirajErpLogKratko(l)}{logJeDanas(l) ? " · danas" : ""}
            </option>
          ))}
        </select>
      )}

      {!trenutni ? (
        <div style={{ color: C.sivi, fontSize: 10 }}>
          Nema zapisa u erp_uvoz_log. Proveri cron <code>import:erp-dnevni</code> i folder <code>erp-drop/incoming</code>.
        </div>
      ) : (
        <>
          <div
            data-testid="erp-diff-sazetak"
            style={{
              marginBottom: 10,
              padding: "8px 10px",
              borderRadius: 8,
              border: `1px solid ${trenutni.uspeh ? C.zelena : C.crvena}44`,
              background: `${trenutni.uspeh ? C.zelena : C.crvena}10`,
              fontSize: 10,
              lineHeight: 1.55,
            }}
          >
            <div style={{ fontWeight: 700, color: C.tekst, marginBottom: 4 }}>{sazetak.naslov}</div>
            {sazetak.redovi.map((r, i) => (
              <div key={i} style={{ color: C.sivi }}>{r}</div>
            ))}
          </div>

          <div style={{ fontSize: 10, color: C.sivi, marginBottom: 8, lineHeight: 1.5 }}>
            <span style={{ color: trenutni.uspeh ? C.zelena : C.crvena, fontWeight: 700 }}>
              {trenutni.uspeh ? "OK" : "GREŠKA"}
            </span>
            {" · "}{formatErpUvozVreme(trenutni.created_at)}
            {" · "}upsert {trenutni.upsertovano ?? 0} / validnih {trenutni.validnih ?? 0}
            {trenutni.fajl && <> · {trenutni.fajl}</>}
          </div>

          {trenutni.greska && (
            <div style={{ color: C.crvena, fontSize: 9, marginBottom: 8 }}>{trenutni.greska}</div>
          )}

          {trenutni.stavke?.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto" }}>
              {trenutni.stavke.map((s, i) => (
                <div
                  key={`${s.entitet}-${i}`}
                  data-testid={s.promenjeno ? `erp-diff-promena-${s.entitet}` : undefined}
                  style={{
                    fontSize: 9,
                    padding: "5px 8px",
                    background: s.promenjeno ? `${C.plava}12` : C.bg,
                    borderRadius: 6,
                    border: `1px solid ${s.greska ? C.crvena : s.promenjeno ? C.plava : s.uspeh ? C.zelena : C.border}33`,
                    color: C.tekst,
                  }}
                >
                  <span style={{
                    color: s.greska ? C.crvena : s.promenjeno ? C.plava : s.uspeh ? C.zelena : C.sivi,
                    fontWeight: 700,
                    marginRight: 6,
                  }}
                  >
                    {s.entitet}
                  </span>
                  {s.promenjeno && (
                    <span style={{ color: C.plava, marginRight: 6 }}>+{s.upsertovano} upsert</span>
                  )}
                  {s.opis || "—"}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: C.sivi, fontSize: 9 }}>Nema detalja po entitetu u logu.</div>
          )}

          <div style={{ marginTop: 8, fontSize: 9, color: C.sivi }}>
            Detaljan log: <code>logs/erp-uvoz.log</code> · SAP fajlovi: <code>erp-drop/CITAJ_ME.md</code>
          </div>
        </>
      )}
    </div>
  );
}
