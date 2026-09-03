/**
 * Payload za error_log — bez mreže, da se može testirati.
 */
export function payloadGreskeApp(error, errorInfo = {}, extras = {}) {
  const poruka = String(error?.message || error || "Nepoznata greška").slice(0, 500);
  const stack = String(error?.stack || "").slice(0, 2000) || null;
  const component_stack = String(errorInfo?.componentStack || "").slice(0, 2000) || null;
  let url = extras.url ?? null;
  let user_agent = extras.userAgent ?? null;
  if (url == null && typeof location !== "undefined") {
    try { url = String(location.href).slice(0, 500); } catch { url = null; }
  }
  if (user_agent == null && typeof navigator !== "undefined") {
    try { user_agent = String(navigator.userAgent).slice(0, 300); } catch { user_agent = null; }
  }
  return {
    modul: String(extras.modul || "nepoznat").slice(0, 80),
    poruka,
    stack,
    component_stack,
    radnik_id: extras.radnikId ?? null,
    url,
    user_agent,
  };
}

export async function snimiGreskuApp(error, errorInfo, extras = {}) {
  const payload = payloadGreskeApp(error, errorInfo, extras);
  try {
    const { supabase } = await import("./supabaseClient.js");
    const { error: err } = await supabase.from("error_log").insert(payload);
    if (err) console.warn("[error_log]", err.message);
  } catch (e) {
    console.warn("[error_log]", e?.message || e);
  }
}
