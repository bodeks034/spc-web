import { jeLinijskiSpcAlarm } from "./spcAlarmWorkflow.js";

/** Broj stavki koje čekaju QA odobrenje (prekidi, kalibracija, linijski SPC alarmi). */
export async function brojCekajucihOdobrenjaQA(supabase) {
  const [prekidi, kalibracija, spcRes] = await Promise.all([
    supabase.from("prekidi_zahtevi").select("id", { count: "exact", head: true }).eq("status", "ceka"),
    supabase.from("kalibracija_zahtevi").select("id", { count: "exact", head: true }).eq("status", "ceka"),
    supabase.from("spc_alarmi")
      .select("id, status, tip_karte, pravilo, id_deo, created_at")
      .in("status", ["otvoren", "potvrden", "karantin"])
      .limit(100),
  ]);

  const spcLinijski = (spcRes.data || []).filter(jeLinijskiSpcAlarm).length;
  const nPrekid = prekidi.count ?? 0;
  const nKal = kalibracija.count ?? 0;

  return {
    prekidi: nPrekid,
    kalibracija: nKal,
    spcAlarmi: spcLinijski,
    ukupno: nPrekid + nKal + spcLinijski,
  };
}
