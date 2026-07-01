/**
 * Poziv lokalnog ERP API servera (scripts/erp-uvoz-api.mjs).
 * URL i ključ: VITE_ERP_UVoz_API_URL + localStorage override.
 */

const LS_URL = "spc_erp_api_url";
const LS_KEY = "spc_erp_api_key";

function readEnv(key) {
  if (typeof import.meta !== "undefined" && import.meta.env?.[key]) {
    return import.meta.env[key];
  }
  return "";
}

export function podrazumevaniErpApiUrl() {
  return readEnv("VITE_ERP_UVoz_API_URL") || "http://127.0.0.1:3921";
}

export function ucitajErpApiPodesavanja() {
  try {
    return {
      url: localStorage.getItem(LS_URL) || podrazumevaniErpApiUrl(),
      apiKey: localStorage.getItem(LS_KEY) || "",
    };
  } catch {
    return { url: podrazumevaniErpApiUrl(), apiKey: "" };
  }
}

export function sacuvajErpApiPodesavanja({ url, apiKey }) {
  try {
    if (url != null) localStorage.setItem(LS_URL, String(url).trim());
    if (apiKey != null) localStorage.setItem(LS_KEY, String(apiKey));
  } catch { /* */ }
}

/** Health check — da li server radi. */
export async function proveriErpApi({ url, apiKey } = ucitajErpApiPodesavanja()) {
  const base = String(url || "").replace(/\/$/, "");
  const res = await fetch(`${base}/api/erp-uvoz/health`, {
    headers: apiKey ? { "X-ERP-API-Key": apiKey } : {},
  });
  if (!res.ok) {
    throw new Error(`ERP API nije dostupan (${res.status})`);
  }
  return res.json();
}

/** Server trigger — čita erp-drop/incoming na firm serveru. */
export async function pokreniErpServerTrigger({
  preset,
  dryRun = false,
  minAgeMin,
  url,
  apiKey,
} = {}) {
  const cfg = ucitajErpApiPodesavanja();
  const base = String(url || cfg.url).replace(/\/$/, "");
  const key = apiKey ?? cfg.apiKey;

  const res = await fetch(`${base}/api/erp-uvoz/trigger`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { "X-ERP-API-Key": key } : {}),
    },
    body: JSON.stringify({ preset, dryRun, minAgeMin }),
  });

  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`ERP API odgovor nije JSON (${res.status})`);
  }

  if (!res.ok || body.ok === false) {
    throw new Error(body.error || body.greska || `ERP API greška (${res.status})`);
  }

  return body;
}
