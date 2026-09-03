/** Signal da se promenio status kompletnosti dela u šifrarniku (banner, pregledi). */

import {
  sacuvajPoslednjiDeo,
  postaviGotovoSledeci,
} from "./sifrarnikRadniTok.js";

export const SIFRARNIK_STATUS_EVENT = "sifrarnik-status-changed";

/** Akcije koje otvaraju „Gotovo → sledeći“ u Hubu. */
const GOTOV_AKCIJE = new Set([
  "snimi",
  "objavi",
  "propagiraj",
  "propagiraj_deo",
  "greske_sablon",
  "sablon",
  "kloniraj",
  "bulk_stampaj",
  "batch_objavi",
]);

function normIds(detail = {}) {
  const fromList = Array.isArray(detail.idDeovi) ? detail.idDeovi : [];
  const single = detail.idDeo ? [detail.idDeo] : [];
  return [...new Set(
    [...fromList, ...single]
      .map((x) => String(x || "").trim().toUpperCase())
      .filter(Boolean),
  )];
}

export function obavestiPromenuStatusaSifrarnika(detail = {}) {
  if (typeof window === "undefined") return;
  const ids = normIds(detail);
  const idDeo = ids[0] || null;
  const akcija = detail.akcija || null;

  if (idDeo) {
    sacuvajPoslednjiDeo({
      idDeo,
      tab: detail.tab || null,
      linija: detail.linija || "",
    });
  }

  if (akcija && GOTOV_AKCIJE.has(akcija)) {
    postaviGotovoSledeci({ idDeo, idDeovi: ids, akcija });
  }

  window.dispatchEvent(new CustomEvent(SIFRARNIK_STATUS_EVENT, {
    detail: { ...detail, idDeo, idDeovi: ids },
  }));
}
