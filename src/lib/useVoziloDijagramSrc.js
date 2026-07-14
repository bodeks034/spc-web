import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient.js";
import { fetchTipoviVozila } from "./sifrarnikApi.js";
import { dijagramSrcZaDeo, dijagramUrlZaPrikaz } from "./voziloDijagramConfig.js";

let tipoviCache = null;
let tipoviPromise = null;

export function resetTipoviVozilaCache() {
  tipoviCache = null;
  tipoviPromise = null;
}

async function ucitajTipoviVozila() {
  if (tipoviCache) return tipoviCache;
  if (!tipoviPromise) {
    tipoviPromise = fetchTipoviVozila()
      .then((rows) => {
        tipoviCache = rows || [];
        return tipoviCache;
      })
      .catch((e) => {
        tipoviPromise = null;
        throw e;
      });
  }
  return tipoviPromise;
}

function jeJavnaPutanja(src) {
  const s = String(src || "").trim();
  return s.startsWith("/") || /^https?:\/\//i.test(s);
}

/**
 * URL slike dijagrama za unos celog vozila (public ili Storage).
 * @param {{ id_deo?: string, vozilo_katalog_id?: string } | null | undefined} deoInfo
 * @returns {{ url: string | null, loading: boolean }}
 */
export function useVoziloDijagramSrc(deoInfo) {
  const syncUrl = useMemo(() => {
    if (!deoInfo) return null;
    const raw = dijagramSrcZaDeo(deoInfo, []);
    return jeJavnaPutanja(raw) ? String(raw).trim() : null;
  }, [deoInfo?.id_deo, deoInfo?.vozilo_katalog_id]);

  const [asyncUrl, setAsyncUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (syncUrl || !deoInfo) {
      setAsyncUrl(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setAsyncUrl(null);

    (async () => {
      try {
        const tipovi = await ucitajTipoviVozila();
        const raw = dijagramSrcZaDeo(deoInfo, tipovi);
        if (jeJavnaPutanja(raw)) {
          if (!cancelled) {
            setAsyncUrl(String(raw).trim());
            setLoading(false);
          }
          return;
        }
        const resolved = await dijagramUrlZaPrikaz(raw, supabase);
        if (!cancelled) {
          setAsyncUrl(resolved);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setAsyncUrl(null);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [deoInfo?.id_deo, deoInfo?.vozilo_katalog_id, syncUrl, deoInfo]);

  return {
    url: syncUrl || asyncUrl,
    loading: loading && !syncUrl,
  };
}
