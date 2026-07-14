/**

 * Auto NCR draft iz SPC alarma (email šalje obavestiNoviSpcAlarm).

 */



import { ucitajPodesavanjaNotifikacija } from "./notifikacije.js";

import { jeAutoPraviloUkljuceno } from "./autoPodesavanja.js";

import { zapisAutoAkcijuBrowser } from "./autoRunLog.js";



export async function autoNcrIzSpcAlarma(supabase, alarm, { kreiraoId = null } = {}) {

  if (!alarm?.id || !alarm?.id_deo) return { preskoceno: true };

  const settings = await ucitajPodesavanjaNotifikacija(supabase);

  if (!jeAutoPraviloUkljuceno(settings, "spc_ncr")) return { preskoceno: true, razlog: "iskljuceno" };

  const { kreirajNcrIzAlarma } = await import("./ncrCapa.js");

  const rez = await kreirajNcrIzAlarma(supabase, alarm, { kreiraoId });

  if (rez?.row && !rez.vecPostojao) {

    await zapisAutoAkcijuBrowser(supabase, {

      tip: "spc_ncr",

      entitet: "ncr_capa",

      entitetId: rez.row.id,

      idDeo: alarm.id_deo,

      opis: `NCR ${rez.row.broj_ncr} iz SPC alarma #${alarm.id}`,

    });

  }

  return rez;

}

