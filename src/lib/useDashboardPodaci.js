import { useCallback, useEffect, useMemo, useState } from "react";
import { pretplati, stanjeZaFilter, ucitajZaFilter } from "./dashboardStore.js";

/**
 * Vraća dashboard podatke iz deljenog keša.
 * Sve komponente sa istim filterom dele jedan fetch i jedan realtime kanal.
 */
export function useDashboardPodaci({ period = 7, idDeo = "", linija = "", smena = "" } = {}) {
  const filter = useMemo(
    () => ({ period, idDeo, linija, smena }),
    [period, idDeo, linija, smena],
  );

  const [, prerenderuj] = useState(0);

  useEffect(() => pretplati(() => prerenderuj((n) => n + 1)), []);

  useEffect(() => {
    ucitajZaFilter(filter).catch(() => {});
  }, [filter]);

  const osvezi = useCallback(
    () => ucitajZaFilter(filter, { force: true }).catch(() => {}),
    [filter],
  );

  const stanje = stanjeZaFilter(filter);

  return {
    podaci: stanje.podaci,
    greska: stanje.greska,
    loading: stanje.loading && !stanje.podaci,
    osvezavaSe: stanje.loading,
    osvezeno: stanje.vreme || null,
    osvezi,
  };
}
