/**
 * Lokalni API za kreiranje foldera crteža (scripts/linije-crtezi-api.mjs).
 * Env: VITE_LINIJE_CRTEZI_API_URL (podrazumevano http://localhost:3922)
 */

const podrazumevaniUrl = () => {
  try {
    return import.meta.env.VITE_LINIJE_CRTEZI_API_URL || "http://localhost:3922";
  } catch {
    return "http://localhost:3922";
  }
};

function apiKey() {
  try {
    return localStorage.getItem("spc_linije_crtezi_api_key") || "";
  } catch {
    return "";
  }
}

/** @param {string} [kod] — jedna linija ili sve kad prazno */
export async function syncLinijeCrteziApi(kod = "") {
  const base = podrazumevaniUrl().replace(/\/$/, "");
  const headers = { "Content-Type": "application/json" };
  const key = apiKey();
  if (key) headers["X-Linije-API-Key"] = key;

  const res = await fetch(`${base}/sync`, {
    method: "POST",
    headers,
    body: JSON.stringify({ kod: kod ? String(kod).trim().toUpperCase() : null }),
  });

  let body = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }

  if (!res.ok) {
    const err = new Error(body.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export function linijeCrteziApiDostupan() {
  return !!podrazumevaniUrl();
}
