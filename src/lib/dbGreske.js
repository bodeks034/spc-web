/** Poruke za česte Supabase/Postgres greške (sekvence posle CSV/demo uvoza). */
export function porukaDbGreske(error) {
  const msg = error?.message || "";
  if (msg.includes("duplicate key") && msg.includes("kontrolni_log")) {
    return "Dupli ID u bazi (sekvenca nije usklađena posle CSV importa). "
      + "Pokreni 09_fix_kontrolni_log_sequence.sql u Supabase SQL Editoru, pa pokušaj ponovo.";
  }
  if (msg.includes("duplicate key") && msg.includes("merenja_varijabilna")) {
    return "Dupli ID u bazi (sekvenca merenja nije usklađena posle demo/CSV uvoza). "
      + "Pokreni 19_fix_merenja_varijabilna_sequence.sql u Supabase SQL Editoru, pa ponovo Sačuvaj seriju.";
  }
  return msg;
}

/** Mrežna greška / flaky Wi‑Fi — snimi u offline red umesto gubitka unosa. */
export function jeMreznaGreska(error) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (!error) return false;
  if (error.name === "TypeError") return true;
  const msg = String(error.message || error || "").toLowerCase();
  if (!msg) return false;
  return (
    msg.includes("failed to fetch")
    || msg.includes("network")
    || msg.includes("timeout")
    || msg.includes("timed out")
    || msg.includes("abort")
    || msg.includes("load failed")
    || msg.includes("fetch failed")
    || msg.includes("econnreset")
    || msg.includes("econnrefused")
    || msg.includes("socket")
  );
}

/** Dupli client_id posle retry — tretira se kao uspeh (idempotentnost). */
export function jeDupliClientId(error) {
  const msg = String(error?.message || "");
  return msg.includes("duplicate key") && msg.includes("client_id");
}
