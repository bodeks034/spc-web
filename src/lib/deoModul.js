import { normalizujIdDeo } from "./idDeoUtil.js";

/** Heuristika kad deo nije u šifrarniku. */
export function pogodiModulPoPrefiksu(idDeo) {
  const id = normalizujIdDeo(idDeo);
  if (/^(NM|NT|DEMO-NM|DEMO-NT)-/i.test(id)) return "merljive";
  return "atributivne";
}

/** Odredi modul dela: merljive (varijabilne) ili atributivne. */
export async function odrediModulZaDeo(supabase, idDeo) {
  const id = normalizujIdDeo(idDeo);
  if (!id || id.length < 3) return "merljive";

  const [{ data: atr }, { data: mer }] = await Promise.all([
    supabase.from("delovi").select("id_deo").eq("id_deo", id).limit(1),
    supabase.from("sop_deo_varijabilni").select("id_deo").eq("id_deo", id).limit(1),
  ]);

  const imaAtr = (atr || []).length > 0;
  const imaMer = (mer || []).length > 0;
  if (imaMer && !imaAtr) return "merljive";
  if (imaAtr && !imaMer) return "atributivne";
  if (imaMer && imaAtr) return "merljive";
  return pogodiModulPoPrefiksu(id);
}

/** API modul string → ključ za App routing. */
export function modulZaRouting(modul) {
  const m = String(modul || "").toLowerCase();
  if (m === "merljive" || m === "varijabilne") return "varijabilne";
  return "atributivne";
}
