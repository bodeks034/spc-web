import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { fetchZajednickiDashboard } from "../../lib/zajednickiDashboard.js";
import { useAnalitikaFilter } from "../../lib/AnalitikaFilterContext.jsx";
import AnalitikaKpiSestPolja from "./AnalitikaKpiSestPolja.jsx";

/** Učitava i prikazuje 6 KPI polja u punoj širini forme. */
export default function AnalitikaPregledKpi({ C, modul, onNavigacija }) {
  const filter = useAnalitikaFilter();
  const [podaci, setPodaci] = useState(null);
  const [loading, setLoading] = useState(true);

  const ucitaj = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchZajednickiDashboard(supabase, {
        period: Number(filter?.period || 7),
        idDeo: filter?.idDeo || undefined,
        linija: filter?.linija || undefined,
        smena: filter?.smena || undefined,
      });
      setPodaci(d);
    } catch {
      setPodaci(null);
    } finally {
      setLoading(false);
    }
  }, [filter?.period, filter?.idDeo, filter?.linija, filter?.smena]);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  useEffect(() => {
    const ch = supabase.channel("analitika_pregled_kpi")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "kontrolni_log" }, ucitaj)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "merenja_varijabilna" }, ucitaj)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ucitaj]);

  if (loading) {
    return (
      <div style={{ color: C.sivi, fontSize: 10, width: "100%", padding: "2px 0" }}>
        Učitavanje KPI…
      </div>
    );
  }

  if (!podaci) {
    return (
      <div style={{ color: C.border, fontSize: 10, width: "100%", padding: "2px 0" }}>
        Nema KPI podataka
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minWidth: 0, boxSizing: "border-box" }}>
      <AnalitikaKpiSestPolja
        C={C}
        podaci={podaci}
        modul={modul}
        onNavigacija={onNavigacija}
      />
    </div>
  );
}
