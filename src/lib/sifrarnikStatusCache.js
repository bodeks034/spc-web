/** Keš agregata statusa delova (GU / greške / barkod) — invalidacija preko sifrarnik-status-changed. */
import { fetchGlavniUnosBrojeviPoDeo } from "./glavniUnosApi.js";
import { fetchGreskeBrojeviPoDeo, fetchBarkodProfiliSet } from "./sifrarnikOdrzavanje.js";

let cache = null;

export async function ucitajStatusAgregate({ force = false } = {}) {
  if (!force && cache) return cache;
  const [gu, gr, bk] = await Promise.all([
    fetchGlavniUnosBrojeviPoDeo(),
    fetchGreskeBrojeviPoDeo(),
    fetchBarkodProfiliSet(),
  ]);
  cache = { gu, gr, bk, ts: Date.now() };
  return cache;
}

export function invalidirajStatusAgregate() {
  cache = null;
}
