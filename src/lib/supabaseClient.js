import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON, SUPABASE_URL } from "./supabaseConfig.js";

export { SUPABASE_ANON, SUPABASE_URL };
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
