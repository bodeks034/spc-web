/** Batch propagacija delova spremnih za objavu (GU + greške + crtež). */
import { propagirajMerljiviDeo, osveziSifrarnikStatusMv } from "./glavniUnosApi.js";
import { logSifrarnikAudit } from "./sifrarnikAudit.js";
import { posaljiBatchObjavaDigest } from "./sifrarnikBatchDigest.js";
import { snapBatchPreObjave, sacuvajBatchRezultat } from "./sifrarnikBatchRollback.js";
import { fetchSpremniBatchIzMv } from "./sifrarnikDeloviMv.js";
import {
  jeSpremanZaBatchObjavu,
  fetchAktivniDeloviSaStatusom,
  filtrirajIdovePoLiniji,
} from "./sifrarnikOdrzavanje.js";
import { normalizujKodLinije } from "./linijaProizvoda.js";

export { jeSpremanZaBatchObjavu };

export async function fetchDeloviSpremniZaObjavu({ linijaKod = null } = {}) {
  const linija = normalizujKodLinije(linijaKod);
  const mvIds = await fetchSpremniBatchIzMv();
  if (mvIds?.length) {
    return linija ? filtrirajIdovePoLiniji(mvIds, linija) : mvIds;
  }

  const { stavke } = await fetchAktivniDeloviSaStatusom({ linijaKod: linija || null });
  return stavke
    .filter(({ deo, opts, status }) => jeSpremanZaBatchObjavu(deo, opts) && status !== "kompletan")
    .map(({ deo }) => String(deo.id_deo || "").trim().toUpperCase())
    .filter(Boolean);
}

/** Propagira sve delove sa GU + greškama + crtežom. */
export async function objaviSpremneDelove({ onProgress, linijaKod = null } = {}) {
  const ids = await fetchDeloviSpremniZaObjavu({ linijaKod });
  snapBatchPreObjave({ ids, statistika: { ukupno: ids.length, linijaKod: linijaKod || null } });
  logSifrarnikAudit({
    akcija: "batch_objavi_pocetak",
    izvor: "odrzavanje",
    detalji: { ukupno: ids.length, ids: ids.slice(0, 50), linijaKod: linijaKod || null },
  });
  const rezultati = [];

  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    onProgress?.({ trenutni: i + 1, ukupno: ids.length, idDeo: id });
    try {
      const res = await propagirajMerljiviDeo(id);
      logSifrarnikAudit({ idDeo: id, akcija: "batch_objavi", izvor: "odrzavanje", detalji: { ok: true } });
      rezultati.push({ idDeo: id, ok: true, karakteristike: res.karakteristike || 0 });
    } catch (e) {
      const greska = e.message || String(e);
      logSifrarnikAudit({ idDeo: id, akcija: "batch_objavi", izvor: "odrzavanje", detalji: { ok: false, greska } });
      rezultati.push({ idDeo: id, ok: false, greska });
    }
  }

  const uspeh = rezultati.filter((r) => r.ok).length;
  await osveziSifrarnikStatusMv();
  const digest = await posaljiBatchObjavaDigest(rezultati).catch(() => ({ preskoceno: true }));
  sacuvajBatchRezultat({ rezultati, linijaKod });
  return { ids, rezultati, uspeh, neuspelo: rezultati.length - uspeh, digest };
}
