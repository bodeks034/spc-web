/** Obaveštenja — browser, Teams webhook, log u bazi. */

import { SUPABASE_ANON, SUPABASE_URL } from "./supabaseConfig.js";

const LS_KEY = "spc_notif_settings";
const DEDUPE_PREFIX = "spc_notif_sent_";
const DEDUPE_MS = 60 * 60 * 1000;

function jeBrowser() {
  return typeof globalThis !== "undefined" && globalThis.window != null;
}

function storageGet(storage, key) {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function storageSet(storage, key, value) {
  try {
    storage?.setItem(key, value);
  } catch { /* */ }
}

const DEFAULTS = {
  notif_browser: "1",
  notif_teams: "0",
  teams_webhook: "",
  notif_email: "0",
  notif_email_spc: "1",
  email_webhook: "",
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_pass: "",
  smtp_from: "",
  smtp_to: "",
  smtp_to_spc: "",
  smtp_tls: "1",
  email_provider: "auto",
  email_resend_from: "",
  notif_teams_auto: "1",
  teams_webhook_auto: "",
};

export async function ucitajPodesavanjaNotifikacija(supabase) {
  const local = (() => {
    if (!jeBrowser()) return {};
    try { return JSON.parse(storageGet(globalThis.localStorage, LS_KEY) || "{}"); } catch { return {}; }
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
  if (jeBrowser()) {
    storageSet(globalThis.localStorage, LS_KEY, JSON.stringify(settings));
  }
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
    const raw = storageGet(globalThis.sessionStorage, DEDUPE_PREFIX + alarmId);
    if (!raw) return false;
    return Date.now() - Number(raw) < DEDUPE_MS;
  } catch {
    return false;
  }
}

function oznaciPoslato(alarmId) {
  if (!alarmId) return;
  storageSet(globalThis.sessionStorage, DEDUPE_PREFIX + alarmId, String(Date.now()));
}

export async function zatraziBrowserDozvolu() {
  if (!jeBrowser() || typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

/** Browser notifikacija za kritične auto-događaje (dashboard / push pravilo). */
export function posaljiBrowserObavestenje(settings, { naslov, opis, tag } = {}) {
  if (settings?.notif_browser === "0") return;
  import("./autoPodesavanja.js").then(({ jeAutoPraviloUkljuceno }) => {
    if (!jeAutoPraviloUkljuceno(settings, "push_kriticno")) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
      new Notification(naslov || "SPC", {
        body: opis || "",
        tag: tag || naslov,
        icon: "/icon-192.png",
      });
    } catch { /* */ }
  }).catch(() => {});
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

function edgeEmailUrl() {
  return `${String(SUPABASE_URL).replace(/\/$/, "")}/functions/v1/send-email`;
}

/** Telo za send-email — Resend (edge secrets) ili SMTP iz admina. */
export function buildSmtpPayload(settings, { to, naslov, opis, html } = {}) {
  const primalac = (to || settings.smtp_to || "").trim();
  if (!primalac) throw new Error("Primalac (to) nije podešen");

  const host = settings.smtp_host?.trim();
  const user = settings.smtp_user?.trim();
  const pass = settings.smtp_pass?.trim();
  const punSmtp = Boolean(host && user && pass);
  const provider = String(settings.email_provider || "auto").toLowerCase();

  const body = {
    to: primalac,
    subject: naslov,
    text: opis,
  };
  if (html) body.html = html;

  const koristiResend = provider === "resend" || (provider === "auto" && !punSmtp);
  if (koristiResend) {
    body.provider = "resend";
    const from = settings.email_resend_from?.trim() || settings.smtp_from?.trim();
    if (from) body.from = from;
    return body;
  }

  const port = Number(settings.smtp_port) || 587;
  const tlsExplicit = settings.smtp_tls;
  body.smtp_tls = tlsExplicit === "0" || tlsExplicit === false
    ? false
    : tlsExplicit === "1" || tlsExplicit === true
      ? port === 465
      : port === 465;
  body.provider = "smtp";

  if (punSmtp) {
    body.smtp_host = host;
    body.smtp_port = port;
    body.smtp_user = user;
    body.smtp_pass = pass;
    body.smtp_from = settings.smtp_from?.trim() || user;
    return body;
  }

  if (host || user || pass) {
    throw new Error(
      "SMTP nije potpun (host, user, pass) — popuni sva tri u Admin → Obaveštenja, "
      + "ili izaberi provider Resend (npm run deploy:resend)",
    );
  }

  return body;
}

export async function posaljiSmtpEmail(settings, { to, naslov, opis, html }) {
  const body = buildSmtpPayload(settings, { to, naslov, opis, html });
  const res = await fetch(edgeEmailUrl(), {
    method: "POST",
    headers: edgeHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || `Email ${res.status}`);
  return json;
}

export async function posaljiObavestenje(supabase, settings, alarm, { dedupe } = {}) {
  const { id: alarmId, naslov, opis, nivo } = alarm;
  const vecPoslatoFn = dedupe?.vecPoslato
    ? (id) => Promise.resolve(dedupe.vecPoslato(id))
    : async (id) => vecPoslato(id);
  const oznaciFn = dedupe?.oznaci
    ? (id) => { dedupe.oznaci(id); }
    : (id) => oznaciPoslato(id);
  if (await vecPoslatoFn(alarmId)) return { preskoceno: true };

  const rezultati = [];

  if (
    settings.notif_browser === "1"
    && jeBrowser()
    && typeof Notification !== "undefined"
    && Notification.permission === "granted"
  ) {
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

  if (settings.notif_email === "1") {
    const imaPunSmtp = settings.smtp_host?.trim() && settings.smtp_user?.trim() && settings.smtp_pass?.trim();
    const provider = String(settings.email_provider || "auto").toLowerCase();
    const koristiResend = provider === "resend" || (provider === "auto" && !imaPunSmtp);
    const imaPrimalac = (settings.smtp_to || "").trim();
    const emailOk = (koristiResend && imaPrimalac) || imaPunSmtp || imaPrimalac;
    const kanal = koristiResend && !imaPunSmtp ? "resend" : "smtp";
    try {
      if (emailOk) {
        await posaljiSmtpEmail(settings, { naslov, opis });
        rezultati.push({ kanal, uspeh: true });
      } else if (settings.email_webhook?.trim()) {
        await posaljiGenericWebhook(settings.email_webhook.trim(), {
          subject: naslov,
          text: opis,
          source: "spc-web",
          level: nivo,
          alarm_id: alarmId,
        });
        rezultati.push({ kanal: "email_webhook", uspeh: true });
      }
    } catch (e) {
      rezultati.push({ kanal: emailOk ? kanal : "email_webhook", uspeh: false, greska: e.message });
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

  if (rezultati.some(r => r.uspeh)) oznaciFn(alarmId);
  return { rezultati };
}

/** Šalje obaveštenja za visoke/srednje alarme (dashboard, unos). */
export async function obradiAlarmeNotifikacije(supabase, alarmi, settings) {
  if (!settings || !alarmi?.length) return;
  const zaSlanje = alarmi.filter(a => a.nivo === "visok" || a.nivo === "srednji" || a.nivo === "kriticno");
  for (const a of zaSlanje) {
    await posaljiObavestenje(supabase, settings, a);
  }
}
