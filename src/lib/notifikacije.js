/** Obaveštenja — browser, Teams webhook, log u bazi. */

import { SUPABASE_ANON, SUPABASE_URL } from "./supabaseConfig.js";

const LS_KEY = "spc_notif_settings";
const DEDUPE_PREFIX = "spc_notif_sent_";
const DEDUPE_MS = 60 * 60 * 1000;

const DEFAULTS = {
  notif_browser: "1",
  notif_teams: "0",
  teams_webhook: "",
  notif_email: "0",
  email_webhook: "",
};

export async function ucitajPodesavanjaNotifikacija(supabase) {
  const local = (() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
  })();

  try {
    const { data } = await supabase.from("app_podesavanja").select("kljuc,vrednost");
    const db = {};
    (data || []).forEach(r => { db[r.kljuc] = r.vrednost ?? ""; });
    return { ...DEFAULTS, ...local, ...db };
  } catch {
    return { ...DEFAULTS, ...local };
  }
}

export async function sacuvajPodesavanjaNotifikacija(supabase, settings) {
  localStorage.setItem(LS_KEY, JSON.stringify(settings));
  const rows = Object.entries(settings).map(([kljuc, vrednost]) => ({
    kljuc,
    vrednost: String(vrednost ?? ""),
    updated_at: new Date().toISOString(),
  }));
  try {
    const { error } = await supabase.from("app_podesavanja").upsert(rows, { onConflict: "kljuc" });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message, localOnly: true };
  }
}

async function logNotifikacija(supabase, row) {
  try {
    await supabase.from("notifikacije_log").insert(row);
  } catch { /* */ }
}

function vecPoslato(alarmId) {
  if (!alarmId) return false;
  try {
    const raw = sessionStorage.getItem(DEDUPE_PREFIX + alarmId);
    if (!raw) return false;
    return Date.now() - Number(raw) < DEDUPE_MS;
  } catch {
    return false;
  }
}

function oznaciPoslato(alarmId) {
  if (!alarmId) return;
  try { sessionStorage.setItem(DEDUPE_PREFIX + alarmId, String(Date.now())); } catch { /* */ }
}

export async function zatraziBrowserDozvolu() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

function edgeProxyUrl() {
  return `${String(SUPABASE_URL).replace(/\/$/, "")}/functions/v1/send-webhook`;
}

function edgeHeaders() {
  const anon = SUPABASE_ANON;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${anon}`,
    apikey: anon,
  };
}

/** Proxy preko Supabase Edge (zaobilazi CORS). */
export async function posaljiWebhookPrekoProxy(targetUrl, payload) {
  const res = await fetch(edgeProxyUrl(), {
    method: "POST",
    headers: edgeHeaders(),
    body: JSON.stringify({ url: targetUrl.trim(), payload }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || json.body || `Proxy ${res.status}`);
  }
  return json;
}

export async function posaljiTeamsWebhook(url, { naslov, poruka, nivo }) {
  const body = {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    summary: naslov,
    themeColor: nivo === "visok" ? "CF222E" : nivo === "srednji" ? "D29922" : "0969DA",
    title: `SPC — ${naslov}`,
    text: poruka,
  };
  try {
    await posaljiWebhookPrekoProxy(url, body);
    return;
  } catch (proxyErr) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Teams: proxy (${proxyErr.message}) i direktno (${res.status})`);
    }
  }
}

export async function posaljiGenericWebhook(url, payload) {
  try {
    await posaljiWebhookPrekoProxy(url, payload);
    return;
  } catch (proxyErr) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Webhook: proxy (${proxyErr.message}) i direktno (${res.status})`);
    }
  }
}

export async function posaljiObavestenje(supabase, settings, alarm) {
  const { id: alarmId, naslov, opis, nivo } = alarm;
  if (vecPoslato(alarmId)) return { preskoceno: true };

  const rezultati = [];

  if (settings.notif_browser === "1" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(naslov, { body: opis, tag: alarmId });
      rezultati.push({ kanal: "browser", uspeh: true });
    } catch (e) {
      rezultati.push({ kanal: "browser", uspeh: false, greska: e.message });
    }
  }

  if (settings.notif_teams === "1" && settings.teams_webhook?.trim()) {
    try {
      await posaljiTeamsWebhook(settings.teams_webhook.trim(), { naslov, poruka: opis, nivo });
      rezultati.push({ kanal: "teams", uspeh: true });
    } catch (e) {
      rezultati.push({ kanal: "teams", uspeh: false, greska: e.message });
    }
  }

  if (settings.notif_email === "1" && settings.email_webhook?.trim()) {
    try {
      await posaljiGenericWebhook(settings.email_webhook.trim(), {
        subject: naslov,
        text: opis,
        source: "spc-web",
        level: nivo,
        alarm_id: alarmId,
      });
      rezultati.push({ kanal: "email_webhook", uspeh: true });
    } catch (e) {
      rezultati.push({ kanal: "email_webhook", uspeh: false, greska: e.message });
    }
  }

  for (const r of rezultati) {
    await logNotifikacija(supabase, {
      kanal: r.kanal,
      alarm_id: alarmId,
      naslov,
      poruka: opis,
      nivo,
      uspeh: r.uspeh,
      greska: r.greska || null,
    });
  }

  if (rezultati.some(r => r.uspeh)) oznaciPoslato(alarmId);
  return { rezultati };
}

/** Šalje obaveštenja za visoke/srednje alarme (dashboard, unos). */
export async function obradiAlarmeNotifikacije(supabase, alarmi, settings) {
  if (!settings || !alarmi?.length) return;
  const zaSlanje = alarmi.filter(a => a.nivo === "visok" || a.nivo === "srednji");
  for (const a of zaSlanje) {
    await posaljiObavestenje(supabase, settings, a);
  }
}
