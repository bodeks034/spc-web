/**
 * Obaveštenja za auto-pravila — poseban Teams kanal (webhook_auto).
 */

import { posaljiObavestenje, posaljiTeamsWebhook } from "./notifikacije.js";

function envVar(key) {
  if (typeof import.meta !== "undefined" && import.meta.env?.[key]) return import.meta.env[key];
  if (typeof process !== "undefined" && process.env?.[key]) return process.env[key];
  return undefined;
}

export const AUTO_NOTIF_DEFAULTS = {
  notif_teams_auto: "1",
  teams_webhook_auto: "",
};

export function jeAutoObavestenje(alarm = {}) {
  const id = String(alarm.id || "");
  return id.startsWith("auto_")
    || id.startsWith("spc_auto_")
    || id.startsWith("kpi_dorada_")
    || id.startsWith("ncr_rok_")
    || id.startsWith("ncr_bez_8d_")
    || id.startsWith("auto_ncr_zatvoren_")
    || id.startsWith("kal_")
    || id.startsWith("msa_");
}

/** Teams auto kanal + email (bez duplog slanja na glavni Teams). */
export async function posaljiAutoObavestenje(supabase, settings, alarm, opts = {}) {
  const { dedupe } = opts;
  const naslov = alarm.naslov?.startsWith("🤖")
    ? alarm.naslov
    : `🤖 ${alarm.naslov || "Auto pravilo"}`;

  const rezultati = [];
  const teamsAuto = settings.notif_teams_auto !== "0";
  const webhookAuto = (settings.teams_webhook_auto || envVar("VITE_TEAMS_WEBHOOK_AUTO") || envVar("TEAMS_WEBHOOK_AUTO") || "").trim();

  if (teamsAuto && webhookAuto) {
    try {
      await posaljiTeamsWebhook(webhookAuto, {
        naslov,
        poruka: alarm.opis || "",
        nivo: alarm.nivo || "info",
      });
      rezultati.push({ kanal: "teams_auto", uspeh: true });
    } catch (e) {
      rezultati.push({ kanal: "teams_auto", uspeh: false, greska: e.message });
    }
  }

  const bezDuplogTeams = { ...settings, notif_teams: "0" };
  const emailRez = await posaljiObavestenje(supabase, bezDuplogTeams, {
    ...alarm,
    naslov,
  }, { dedupe });

  return {
    rezultati: [...rezultati, ...(emailRez?.rezultati || [])],
    preskoceno: emailRez?.preskoceno && !rezultati.some((r) => r.uspeh),
  };
}

/** Auto ili klasično obaveštenje. */
export async function posaljiPraviloObavestenje(supabase, settings, alarm, opts = {}) {
  if (opts.auto || jeAutoObavestenje(alarm)) {
    return posaljiAutoObavestenje(supabase, settings, alarm, opts);
  }
  return posaljiObavestenje(supabase, settings, alarm, opts);
}
