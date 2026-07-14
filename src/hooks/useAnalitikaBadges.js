import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { brojOtvorenihNcr } from "../lib/ncrCapa.js";
import useOdobrenjaQaBrojaci from "./useOdobrenjaQaBrojaci.js";

async function brojFaiCekaju() {
  const { count, error } = await supabase
    .from("fai_zapisi")
    .select("id", { count: "exact", head: true })
    .eq("status", "ceka");
  if (error) return 0;
  return count ?? 0;
}

/** Badge po tabu i po grupi navigacije (Kvalitet: odobrenja + FAI + NCR). */
export default function useAnalitikaBadges({
  enabled = false,
  qaEnabled = false,
  faiEnabled = false,
  ncrEnabled = false,
  grupe = [],
}) {
  const { ukupno: qaUkupno, badgePoTabu: qaBadge } = useOdobrenjaQaBrojaci({
    supabase,
    enabled: enabled && qaEnabled,
  });

  const [faiBroj, setFaiBroj] = useState(0);
  const [ncrBroj, setNcrBroj] = useState(0);

  const osveziFai = useCallback(async () => {
    if (!enabled || !faiEnabled) {
      setFaiBroj(0);
      return;
    }
    try {
      setFaiBroj(await brojFaiCekaju());
    } catch {
      setFaiBroj(0);
    }
  }, [enabled, faiEnabled]);

  const osveziNcr = useCallback(async () => {
    if (!enabled || !ncrEnabled) {
      setNcrBroj(0);
      return;
    }
    try {
      setNcrBroj(await brojOtvorenihNcr(supabase));
    } catch {
      setNcrBroj(0);
    }
  }, [enabled, ncrEnabled]);

  useEffect(() => { osveziFai(); }, [osveziFai]);
  useEffect(() => { osveziNcr(); }, [osveziNcr]);

  useEffect(() => {
    if (!enabled || !faiEnabled) return;
    const ch = supabase.channel("analitika_badge_fai")
      .on("postgres_changes", { event: "*", schema: "public", table: "fai_zapisi" }, osveziFai)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [enabled, faiEnabled, osveziFai]);

  useEffect(() => {
    if (!enabled || !ncrEnabled) return;
    const ch = supabase.channel("analitika_badge_ncr")
      .on("postgres_changes", { event: "*", schema: "public", table: "ncr_capa" }, osveziNcr)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [enabled, ncrEnabled, osveziNcr]);

  const badgePoTabu = useMemo(() => {
    const out = { ...qaBadge };
    if (faiBroj > 0) out.fai = faiBroj;
    if (ncrBroj > 0) out.ncr = ncrBroj;
    return out;
  }, [qaBadge, faiBroj, ncrBroj]);

  const badgePoGrupi = useMemo(() => {
    const out = {};
    for (const g of grupe || []) {
      let sum = 0;
      for (const [tabId] of g.tabovi || []) {
        sum += Number(badgePoTabu[tabId]) || 0;
      }
      if (sum > 0) out[g.id] = sum;
    }
    return out;
  }, [grupe, badgePoTabu]);

  return { badgePoTabu, badgePoGrupi, qaUkupno, faiBroj, ncrBroj };
}
