/** Zajednički Supabase URL i anon ključ — lokalno preko .env.local (Vite). */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://wzxkcomeurogvfisticq.supabase.co";

export const SUPABASE_ANON =
  import.meta.env.VITE_SUPABASE_ANON_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6eGtjb21ldXJvZ3ZmaXN0aWNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MzM1MDYsImV4cCI6MjA5NTEwOTUwNn0.Oa17CJOr-Zep2UsG5n8N7kehuoJmHanNYaNy4VriDBk";
