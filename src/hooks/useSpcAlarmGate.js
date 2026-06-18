import { useState, useEffect, useCallback } from "react";
import { normalizujIdDeo, ucitajBlokirajuciSpcAlarm, alarmBlokiraLiniju } from "../lib/spcAlarmWorkflow.js";

/** Prati otvorene SPC alarme za aktivan deo — blokada linije dok operater ne potvrdi. */
export function useSpcAlarmGate(supabase, { idDeo, enabled = false }) {
  const [alarm, setAlarm] = useState(null);
  const [loading, setLoading] = useState(false);

  const osvezi = useCallback(async () => {
    if (!enabled || !supabase) {
      setAlarm(null);
      return;
    }
    const deo = normalizujIdDeo(idDeo);
    if (deo.length < 3) {
      setAlarm(null);
      return;
    }

    setLoading(true);
    try {
      const row = await ucitajBlokirajuciSpcAlarm(supabase, deo);
      setAlarm(row);
    } catch {
      setAlarm(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, idDeo, enabled]);

  useEffect(() => {
    osvezi();
  }, [osvezi]);

  useEffect(() => {
    if (!enabled || !supabase) return;
    const deo = normalizujIdDeo(idDeo);
    if (deo.length < 3) return;

    const ch = supabase
      .channel(`spc_alarm_gate_${deo}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "spc_alarmi", filter: `id_deo=eq.${deo}` },
        () => { osvezi(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [supabase, idDeo, enabled, osvezi]);

  return { alarm, blokira: alarmBlokiraLiniju(alarm), loading, osvezi, postaviAlarm: setAlarm };
}
