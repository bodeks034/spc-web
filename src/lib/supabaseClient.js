import { createClient } from "@supabase/supabase-js";
import {
  SUPABASE_ANON,
  SUPABASE_URL,
  KONFIG_NEDOSTAJE,
  KONFIG_PORUKA,
} from "./supabaseConfig.js";

export { SUPABASE_ANON, SUPABASE_URL, KONFIG_NEDOSTAJE, KONFIG_PORUKA };

// Bez konfiguracije createClient baca i ruši ceo bundle. Lokalni placeholder
// pušta aplikaciju da se podigne i prikaže jasnu poruku umesto belog ekrana —
// i, za razliku od ranijeg fallback-a, ne gađa produkcionu bazu.
export const supabase = createClient(
  SUPABASE_URL || "http://localhost:54321",
  SUPABASE_ANON || "anon-nije-podesen",
);
