import { useEffect, useState } from "react";
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

/**
 * URL slike dijagrama za unos celog vozila (public ili Storage).
 * @param {{ id_deo?: string, vozilo_katalog_id?: string } | null | undefined} deoInfo
 */
export function useVoziloDijagramSrc(deoInfo) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!deoInfo) {
        if (!cancelled) setUrl(null);
        return;
      }
      try {
        const tipovi = await ucitajTipoviVozila();
        const raw = dijagramSrcZaDeo(deoInfo, tipovi);
        const resolved = await dijagramUrlZaPrikaz(raw, supabase);
        if (!cancelled) setUrl(resolved);
      } catch {
        if (!cancelled) setUrl(null);
      }
    })();

    return () => { cancelled = true; };
  }, [deoInfo, deoInfo?.id_deo, deoInfo?.vozilo_katalog_id]);

  return url;
}
