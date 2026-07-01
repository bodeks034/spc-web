import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { SkartDoradaOeePregled } from "../SkartDoradaOeePanel.jsx";
import { izracunajOeeKpi } from "../../lib/oeeKpi.js";

function datumOdIzPerioda(period) {
  const od = new Date();
  od.setDate(od.getDate() - Number(period || 7));
  return od.toISOString().split("T")[0];
}

export default function AnalitikaKpiStrip({
  C,
  modul,
  filterIdDeo,
  filterPeriod,
  filterSmena,
  onDetaljiOee,
}) {
  const [podaci, setPodaci] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sakrij, setSakrij] = useState(false);

  const ucitaj = useCallback(async () => {
    if (!modul) return;
    setLoading(true);
    try {
      let q = supabase.from("kpi_unos").select("*").eq("modul", modul);
      const id = String(filterIdDeo || "").trim().toUpperCase();
      if (id) q = q.eq("id_deo", id);
      q = q.gte("datum", datumOdIzPerioda(filterPeriod));
      if (filterSmena !== "" && filterSmena != null) {
        q = q.eq("smena", Number(filterSmena));
      }
      const { data, error } = await q.order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      setPodaci(data || []);
    } catch {
      setPodaci([]);
    } finally {
      setLoading(false);
    }
  }, [modul, filterIdDeo, filterPeriod, filterSmena]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  useEffect(() => {
    if (!modul) return;
    const ch = supabase.channel(`analitika_kpi_${modul}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "kpi_unos" }, ucitaj)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [modul, ucitaj]);

  const prosekOee = useMemo(() => {
    if (!podaci.length) return null;
    let sum = 0;
    let n = 0;
    podaci.forEach((r) => {
      const k = izracunajOeeKpi(r);
      if (k.oee != null) { sum += k.oee; n++; }
    });
    return n ? +(sum / n).toFixed(1) : null;
  }, [podaci]);

  if (!modul || sakrij) return null;

  const naslovModul = modul === "merljive" ? "merljive" : "atributivne";

  return (
    <div style={{
      width: "100%",
      boxSizing: "border-box",
    }}>
      <div style={{
        background: C.panel,
        border: `1px solid ${modul === "merljive" ? C.zelena : C.plava}35`,
        borderRadius: 12,
        padding: 16,
        marginTop: 4,
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
        }}>
          <div style={{ color: C.tekst, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
            KPI DORADA · ŠKART · OEE
            <span style={{
              color: modul === "merljive" ? C.zelena : C.plava,
              marginLeft: 8,
              fontSize: 9,
              fontWeight: 600,
            }}>
              ({naslovModul})
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {prosekOee != null && (
              <span style={{ color: C.sivi, fontSize: 10 }}>
                Prosek OEE:{" "}
                <strong style={{
                  color: prosekOee >= 85 ? C.zelena : prosekOee >= 65 ? C.zuta : C.crvena,
                }}>
                  {prosekOee}%
                </strong>
              </span>
            )}
            {onDetaljiOee && (
              <button
                type="button"
                onClick={onDetaljiOee}
                style={{
                  background: "none",
                  border: `1px solid ${C.plava}`,
                  borderRadius: 6,
                  color: C.plava,
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "5px 10px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Detalji → OEE
              </button>
            )}
            <button
              type="button"
              onClick={() => setSakrij(true)}
              style={{
                background: "none",
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.sivi,
                fontSize: 9,
                padding: "5px 8px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Sakrij
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ color: C.sivi, fontSize: 11, textAlign: "center", padding: 16 }}>Učitavanje KPI…</div>
        ) : podaci.length === 0 ? (
          <div style={{ color: C.border, fontSize: 11, textAlign: "center", padding: 16, lineHeight: 1.5 }}>
            Nema KPI unosa u izabranom periodu.
            {onDetaljiOee && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={onDetaljiOee}
                  style={{
                    background: "none",
                    border: "none",
                    color: C.plava,
                    cursor: "pointer",
                    fontSize: 11,
                    textDecoration: "underline",
                  }}
                >
                  Otvori OEE tab
                </button>
              </>
            )}
          </div>
        ) : (
          <SkartDoradaOeePregled C={C} podaci={podaci.slice(0, 5)} modul={modul} />
        )}
      </div>
    </div>
  );
}
