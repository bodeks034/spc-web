/** Batch propagacija delova spremnih za objavu (GU + greške + crtež). */
import { propagirajMerljiviDeo } from "./glavniUnosApi.js";
import {
  jeSpremanZaBatchObjavu,
  fetchAktivniDeloviSaStatusom,
} from "./sifrarnikOdrzavanje.js";

export { jeSpremanZaBatchObjavu };

export async function fetchDeloviSpremniZaObjavu() {
  const stavke = await fetchAktivniDeloviSaStatusom();
  return stavke
    .filter(({ deo, opts, status }) => jeSpremanZaBatchObjavu(deo, opts) && status !== "kompletan")
    .map(({ deo }) => String(deo.id_deo || "").trim().toUpperCase())
    .filter(Boolean);
}

/** Propagira sve delove sa GU + greškama + crtežom. */
export async function objaviSpremneDelove({ onProgress } = {}) {
  const ids = await fetchDeloviSpremniZaObjavu();
  const rezultati = [];

  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    onProgress?.({ trenutni: i + 1, ukupno: ids.length, idDeo: id });
    try {
      const res = await propagirajMerljiviDeo(id);
      rezultati.push({ idDeo: id, ok: true, karakteristike: res.karakteristike || 0 });
    } catch (e) {
      rezultati.push({ idDeo: id, ok: false, greska: e.message || String(e) });
    }
  }

  const uspeh = rezultati.filter((r) => r.ok).length;
  return { ids, rezultati, uspeh, neuspelo: rezultati.length - uspeh };
}
