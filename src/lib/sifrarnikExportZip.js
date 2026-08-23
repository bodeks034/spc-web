/** ZIP export više delova (migracija / backup). */
import JSZip from "jszip";
import { exportujDeoJson } from "./sifrarnikExportJson.js";
import { normalizujIdDeo } from "./idDeoUtil.js";

export async function exportujDeloviZip(idLista = [], { onProgress } = {}) {
  const ids = [...new Set((idLista || []).map((x) => normalizujIdDeo(x)).filter(Boolean))];
  if (!ids.length) throw new Error("Nema validnih ID delova");

  const zip = new JSZip();
  const manifest = { exported_at: new Date().toISOString(), delovi: [], greske: [] };

  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    onProgress?.({ trenutni: i + 1, ukupno: ids.length, idDeo: id });
    try {
      const payload = await exportujDeoJson(id);
      zip.file(`delovi/${id}.json`, JSON.stringify(payload, null, 2));
      manifest.delovi.push({ id_deo: id, ok: true });
    } catch (e) {
      manifest.greske.push({ id_deo: id, greska: e.message || String(e) });
    }
  }

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sifrarnik-paket_${ids.length}delova_${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  return manifest;
}
