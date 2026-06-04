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

/** Da li URL zaista učitava sliku (ne vraća broken link). */
export function testUrlSlike(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

/** Jedinstvene storage putanje za pokušaj učitavanja. */
export function storageKandidati(tip, vrednost) {
  if (!vrednost) return [];
  const raw = String(vrednost).trim().replace(/\\/g, "/");
  const fajl = imeFajlaSlika(vrednost);
  const pod = tip === "merljive" ? SLIKE_MERLJIVE : SLIKE_ATRIBUTIVNE;
  const list = [
    storagePutanjaSlike(tip, vrednost),
    raw.includes("/") ? raw : null,
    fajl ? `${pod}/${fajl}` : null,
    fajl,
  ].filter(Boolean);
  return [...new Set(list)];
}

/** Redosled pokušaja učitavanja slike (bez provere učitavanja). */
export async function ucitajUrlSlike(supabase, tip, vrednost) {
  if (!vrednost) return null;

  for (const put of storageKandidati(tip, vrednost)) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(put, 3600);
    if (!error && data?.signedUrl) return data.signedUrl;
  }

  return lokalnaPutanjaSlike(tip, vrednost);
}

/**
 * Prvi URL koji stvarno radi (Storage pa public/slike/...).
 * Vraća null ako nigde nema fajla — tada prikaži ručni uvoz.
 */
export async function ucitajPrikazSliku(supabase, tip, vrednost) {
  if (!vrednost) return null;

  for (const put of storageKandidati(tip, vrednost)) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(put, 3600);
    if (!error && data?.signedUrl && await testUrlSlike(data.signedUrl)) {
      return data.signedUrl;
    }
  }

  const lokal = lokalnaPutanjaSlike(tip, vrednost);
  if (lokal && await testUrlSlike(lokal)) return lokal;

  return null;
}
