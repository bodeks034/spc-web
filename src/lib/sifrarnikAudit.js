/** Audit log izmena u šifrarniku (tabela sifrarnik_audit, migracija 80). */
import { supabase } from "./supabaseClient.js";

export async function logSifrarnikAudit({
  idDeo = null,
  akcija,
  izvor = null,
  detalji = null,
  korisnik = null,
} = {}) {
  if (!akcija) return;
  try {
    const { error } = await supabase.from("sifrarnik_audit").insert({
      id_deo: idDeo ? String(idDeo).trim().toUpperCase() : null,
      akcija: String(akcija).slice(0, 64),
      izvor: izvor ? String(izvor).slice(0, 64) : null,
      detalji: detalji && typeof detalji === "object" ? detalji : null,
      korisnik: korisnik ? String(korisnik).slice(0, 128) : null,
    });
    if (error && !/does not exist|could not find/i.test(error.message)) {
      console.warn("[sifrarnik_audit]", error.message);
    }
  } catch {
    /* tabela opciona dok migracija 80 nije primenjena */
  }
}

export async function fetchSifrarnikAudit({ idDeo = null, limit = 50 } = {}) {
  try {
    let q = supabase
      .from("sifrarnik_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (idDeo) {
      q = q.eq("id_deo", String(idDeo).trim().toUpperCase());
    }
    const { data, error } = await q;
    if (error) {
      if (/does not exist|could not find/i.test(error.message)) return [];
      throw error;
    }
    return data || [];
  } catch {
    return [];
  }
}
