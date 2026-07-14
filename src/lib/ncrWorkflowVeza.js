/** NCR ↔ alarm ↔ 8D ↔ eskalacija — objašnjenje auto-otvaranja i veza. */

import { opisSpcAlarma } from "./spcAlarmWorkflow.js";
import { fetchAutoAkcijaZaNcr, jeAutoKreiraniNcr } from "./autoRunLog.js";

const IZVOR_NAZIV = {
  rucno: "Ručni unos",
  auto_pravilo: "Auto-pravilo (NOK streak)",
  spc_alarm: "SPC alarm na liniji",
  operativni_alarm: "Operativni alarm",
};

/** Ljudski tekst: zašto je NCR otvoren automatski. */
export function objasniAutoUzrokNcr(ncr, autoAkcija = null) {
  if (!ncr) return null;

  const izvor = ncr.izvor || "";
  const opis = String(ncr.opis || "");

  if (autoAkcija?.opis) {
    return {
      naslov: "Otvoreno automatski",
      razlog: autoAkcija.opis,
      tip: autoAkcija.tip || "auto",
      vreme: autoAkcija.created_at || null,
    };
  }

  if (izvor === "spc_alarm" || ncr.spc_alarm_id) {
    return {
      naslov: "Otvoreno iz SPC alarma",
      razlog: opis.replace(/^SPC alarm:\s*/i, "") || "Prekoračen prag na liniji",
      tip: "spc_alarm",
    };
  }

  if (izvor === "auto_pravilo" || /^AUTO-NCR/i.test(opis)) {
    const cist = opis.replace(/^AUTO-NCR(-3X)?:\s*/i, "");
    return {
      naslov: "Otvoreno automatski (auto-pravilo)",
      razlog: cist || "Uzastopni NOK — eskalacija i draft NCR",
      tip: "nok3_streak",
    };
  }

  if (jeAutoKreiraniNcr(ncr)) {
    return {
      naslov: "Otvoreno automatski",
      razlog: opis || IZVOR_NAZIV[izvor] || "Sistemska akcija",
      tip: izvor || "auto",
    };
  }

  return null;
}

/** Učitaj povezane entitete za NCR detalj. */
export async function fetchNcrVeze(supabase, ncr) {
  if (!ncr?.id) return { alarm: null, osmd: null, eskalacija: null, pfmea: null, autoAkcija: null };

  const jobs = [
    ncr.spc_alarm_id
      ? supabase.from("spc_alarmi").select("id,id_deo,pravilo,status,pozicija,tip_karte,eskalacija_id")
        .eq("id", ncr.spc_alarm_id).maybeSingle()
      : Promise.resolve({ data: null }),
    ncr.osmd_id
      ? supabase.from("osmd_izvestaji").select("id,broj_8d,id_deo,status,created_at")
        .eq("id", ncr.osmd_id).maybeSingle()
      : Promise.resolve({ data: null }),
    ncr.eskalacija_id
      ? supabase.from("eskalacije").select("id,id_deo,opis,status,prioritet,created_at")
        .eq("id", ncr.eskalacija_id).maybeSingle()
      : Promise.resolve({ data: null }),
    ncr.pfmea_stavka_id
      ? supabase.from("pfmea_stavke").select("id,dokument_id,pfmea_veza,mod_greske,rpn_before")
        .eq("id", ncr.pfmea_stavka_id).maybeSingle()
      : Promise.resolve({ data: null }),
    jeAutoKreiraniNcr(ncr) ? fetchAutoAkcijaZaNcr(supabase, ncr) : Promise.resolve(null),
  ];

  const [alarmRes, osmdRes, eskRes, pfmeaRes, autoAkcija] = await Promise.all(jobs);

  let pfmea = pfmeaRes.data;
  if (pfmea?.dokument_id) {
    const { data: doc } = await supabase.from("pfmea_cp_dokumenti")
      .select("id,naziv,id_deo,revizija,broj_8d")
      .eq("id", pfmea.dokument_id)
      .maybeSingle();
    pfmea = { ...pfmea, _dokument: doc };
  }

  const alarm = alarmRes.data;
  return {
    alarm: alarm ? { ...alarm, opis: opisSpcAlarma(alarm) } : null,
    osmd: osmdRes.data,
    eskalacija: eskRes.data,
    pfmea,
    autoAkcija,
    autoUzrok: objasniAutoUzrokNcr(ncr, autoAkcija),
  };
}

export function labelIzvorNcr(ncr) {
  return IZVOR_NAZIV[ncr?.izvor] || ncr?.izvor || "—";
}
