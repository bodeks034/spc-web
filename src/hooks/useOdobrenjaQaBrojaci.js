import { useCallback, useEffect, useState } from "react";
import { brojCekajucihOdobrenjaQA } from "../lib/odobrenjaQaBrojaci.js";

export default function useOdobrenjaQaBrojaci({ supabase, enabled = false }) {
  const [ukupno, setUkupno] = useState(0);

  const osvezi = useCallback(async () => {
    if (!enabled || !supabase) return;
    try {
      const b = await brojCekajucihOdobrenjaQA(supabase);
      setUkupno(b.ukupno);
    } catch {
      setUkupno(0);
    }
  }, [enabled, supabase]);

  useEffect(() => { osvezi(); }, [osvezi]);

  useEffect(() => {
    if (!enabled || !supabase) return;
    const ch = supabase.channel("odobrenja_qa_brojaci")
      .on("postgres_changes", { event: "*", schema: "public", table: "prekidi_zahtevi" }, osvezi)
      .on("postgres_changes", { event: "*", schema: "public", table: "kalibracija_zahtevi" }, osvezi)
      .on("postgres_changes", { event: "*", schema: "public", table: "spc_alarmi" }, osvezi)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [enabled, supabase, osvezi]);

  return {
    ukupno,
    badgePoTabu: ukupno > 0 ? { odobrenja: ukupno } : {},
  };
}
