import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { fetchZajednickiDashboard } from "../lib/zajednickiDashboard.js";
import OperativniAlarmiStrip from "./OperativniAlarmiStrip.jsx";

/** Kontrolor na početnom ekranu — samo kritični alarmi, bez punog pregleda proizvodnje. */
export default function LinijaAlarmiPocetna({ C }) {
  const [alarmi, setAlarmi] = useState([]);
  const [sakrij, setSakrij] = useState(false);

  const ucitaj = useCallback(async () => {
    try {
      const d = await fetchZajednickiDashboard(supabase, { period: 1 });
      setAlarmi(d?.alarmi || []);
    } catch {
      setAlarmi([]);
    }
  }, []);

  useEffect(() => { ucitaj(); }, [ucitaj]);

  useEffect(() => {
    const ch = supabase.channel("linija_alarmi_pocetna")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "kontrolni_log" }, () => ucitaj())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "merenja_varijabilna" }, () => ucitaj())
      .on("postgres_changes", { event: "*", schema: "public", table: "spc_alarmi" }, () => ucitaj())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [ucitaj]);

  if (sakrij || !alarmi.length) return null;

  return (
    <div style={{ width: "100%", maxWidth: 960 }}>
      <OperativniAlarmiStrip
        alarmi={alarmi}
        C={C}
        kompakt
        onZatvori={() => setSakrij(true)}
      />
    </div>
  );
}
