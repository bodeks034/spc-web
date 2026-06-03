/** Putanje za crteže delova — lokalno (public/) i Supabase Storage (spc-crtezi). */

export const SLIKE_FOLDER = "slike";
export const SLIKE_ATRIBUTIVNE = "atributivne";
export const SLIKE_MERLJIVE = "merljive";
export const STORAGE_BUCKET = "spc-crtezi";

export function imeFajlaSlika(vrednost) {
  if (!vrednost) return "";
  const s = String(vrednost).trim().replace(/\\/g, "/");
  if (s.includes("/")) return s.split("/").pop();
  return s;
}

/** public/slike/atributivne/Deo1.jpg → URL u Vite dev/prod */
export function lokalnaPutanjaSlike(tip, vrednost) {
  const fajl = imeFajlaSlika(vrednost);
  if (!fajl) return null;
  const pod = tip === "merljive" ? SLIKE_MERLJIVE : SLIKE_ATRIBUTIVNE;
  return `/${SLIKE_FOLDER}/${pod}/${encodeURIComponent(fajl)}`;
}

/** Ključ u Supabase bucket-u: atributivne/5502-A.jpg */
export function storagePutanjaSlike(tip, vrednost) {
  if (!vrednost) return null;
  const s = String(vrednost).trim().replace(/\\/g, "/");
  if (s.includes("/")) return s;
  const fajl = imeFajlaSlika(s);
  const pod = tip === "merljive" ? SLIKE_MERLJIVE : SLIKE_ATRIBUTIVNE;
  return `${pod}/${fajl}`;
}

/** Redosled pokušaja učitavanja slike */
export async function ucitajUrlSlike(supabase, tip, vrednost) {
  if (!vrednost) return null;

  const putanje = [
    storagePutanjaSlike(tip, vrednost),
    String(vrednost).trim().replace(/\\/g, "/"),
    imeFajlaSlika(vrednost),
  ].filter(Boolean);

  const seen = new Set();
  for (const put of putanje) {
    if (seen.has(put)) continue;
    seen.add(put);
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(put, 3600);
    if (!error && data?.signedUrl) return data.signedUrl;
  }

  return lokalnaPutanjaSlike(tip, vrednost);
}
