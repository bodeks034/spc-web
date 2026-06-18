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

const DEFAULT_URL = "https://wzxkcomeurogvfisticq.supabase.co";
const DEFAULT_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eGtjb21ldXJvZ3ZmaXN0aWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzM1MDYsImV4cCI6MjA5NTEwOTUwNn0.Oa17CJOr-Zep2UsG5n8N7kehuoJmHanNYaNy4VriDBk";

export const SUPABASE_URL =
  readEnv("VITE_SUPABASE_URL")
  || readEnv("SUPABASE_URL")
  || DEFAULT_URL;

export const SUPABASE_ANON =
  readEnv("VITE_SUPABASE_ANON_KEY")
  || readEnv("SUPABASE_ANON_KEY")
  || DEFAULT_ANON;
