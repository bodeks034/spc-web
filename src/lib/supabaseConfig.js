/** Zajednički Supabase URL i anon ključ — Vite (browser) + Node skripte (.env.local). */

function readEnv(key) {
  if (typeof import.meta !== "undefined" && import.meta.env?.[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key];
  }
  return "";
}

export const SUPABASE_URL =
  readEnv("VITE_SUPABASE_URL")
  || readEnv("SUPABASE_URL")
  || "";

export const SUPABASE_ANON =
  readEnv("VITE_SUPABASE_ANON_KEY")
  || readEnv("SUPABASE_ANON_KEY")
  || "";

/** Nedostaje li konfiguracija — UI ovo prikazuje umesto praznog ekrana. */
export const KONFIG_NEDOSTAJE = !SUPABASE_URL || !SUPABASE_ANON;

export const KONFIG_PORUKA =
  "Nedostaje Supabase konfiguracija. Postavi VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY "
  + "u .env.local (vidi .env.example) pa ponovo pokreni build.";

if (KONFIG_NEDOSTAJE && typeof console !== "undefined") {
  // Ranije je ovde stajao hardkodovan produkcijski URL i anon ključ kao fallback,
  // pa je build bez .env tiho gađao produkcionu bazu.
  console.error(`[supabaseConfig] ${KONFIG_PORUKA}`);
}
