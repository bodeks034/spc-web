/** Licenca po uređaju (browser/PC) — max_uredjaja. */

const LS_KEY = "spc_uredjaj_id";

export function uredjajId() {
  try {
    let id = localStorage.getItem(LS_KEY);
    if (!id) {
      id = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(LS_KEY, id);
    }
    return id;
  } catch {
    return "anon-uredjaj";
  }
}

export function nazivUredjaja() {
  if (typeof navigator === "undefined") return "Node";
  const plat = navigator.platform || navigator.userAgentData?.platform || "browser";
  const dim = typeof screen !== "undefined" ? `${screen.width}×${screen.height}` : "?";
  return `${plat} · ${dim}`;
}

export async function brojRegistrovanihUredjaja(supabase) {
  try {
    const { data, error } = await supabase.rpc("broj_uredjaja_licence");
    if (!error) return Number(data) || 0;
  } catch { /* RPC možda nije primenjen */ }

  try {
    const { count, error } = await supabase
      .from("licenca_uredjaji")
      .select("id", { count: "exact", head: true });
    if (!error) return count ?? 0;
  } catch { /* */ }

  return null;
}

/** Pri loginu — registruj uređaj ili vrati grešku ako je kvota puna. */
export async function registrujUredjajLicence(supabase, { maxUredjaja } = {}) {
  const max = Number(maxUredjaja);
  if (!Number.isFinite(max) || max <= 0) return { ok: true, preskoceno: true };

  const uid = uredjajId();
  try {
    const { data, error } = await supabase.rpc("registruj_uredjaj_licence", {
      p_uredjaj_id: uid,
      p_naziv: nazivUredjaja(),
    });
    if (error) throw error;
    if (!data?.ok) {
      return {
        ok: false,
        kod: data?.kod || "max_uredjaja",
        poruka: data?.poruka || `Dostignut limit uređaja (${data?.max || max}).`,
        count: data?.count,
        max: data?.max ?? max,
      };
    }
    return { ok: true, count: data.count, max: data.max, vecRegistrovan: data.vec_registrovan };
  } catch (e) {
    return { ok: false, kod: "rpc", poruka: e.message || "Registracija uređaja nije uspela." };
  }
}
