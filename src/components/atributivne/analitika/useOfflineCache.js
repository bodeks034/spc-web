/** Offline cache za analitičke karte. */
export function useOfflineCache(key, ttlMin=30) {
  const get = () => {
    try {
      const raw = localStorage.getItem(`spc_cache_${key}`);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > ttlMin * 60000) return null;
      return data;
    } catch { return null; }
  };
  const set = (data) => {
    try { localStorage.setItem(`spc_cache_${key}`, JSON.stringify({ data, ts: Date.now() })); }
    catch {}
  };
  const clear = () => localStorage.removeItem(`spc_cache_${key}`);
  return { get, set, clear };
}
