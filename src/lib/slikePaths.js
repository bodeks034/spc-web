/** Putanje za crteže delova — lokalno (public/) i Supabase Storage (spc-crtezi). */

export const SLIKE_FOLDER = "slike";
export const SLIKE_ATRIBUTIVNE = "atributivne";
export const SLIKE_MERLJIVE = "merljive";
export const SLIKE_MOMENT = "moment";
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

const EXT_SLIKE = ["jpg", "jpeg", "png", "webp"];

/** SOP crteži vozila (MRAP_SOP.jpg → public/vozilo/dijagrami/MRAP.png). */
const SOP_DIJAGRAM_LOKAL = {
  MRAP: "/vozilo/dijagrami/MRAP.png",
  MRAP1: "/vozilo/dijagrami/MRAP1.png",
  NTV: "/vozilo/dijagrami/NTV.png",
  OSOVINA: "/slike/atributivne/Osovina_SOP.jpg",
};

function sopDijagramKandidati(vrednost) {
  const m = String(vrednost || "").trim().match(/^([A-Za-z0-9]+)_SOP\./i);
  if (!m) return [];
  const pref = m[1].toUpperCase();
  const put = SOP_DIJAGRAM_LOKAL[pref];
  return put ? [put] : [];
}

/** Lokalni + storage kandidati (ime iz šifrarnika, pa fallback po id_deo). */
export function sviKandidatiSlike(tip, vrednost, idDeo) {
  const lokalni = new Set();
  const storage = new Set();

  const dodaj = (t, naziv) => {
    if (!naziv) return;
    const l = lokalnaPutanjaSlike(t, naziv);
    if (l) lokalni.add(l);
    const fajl = imeFajlaSlika(naziv);
    if (fajl) lokalni.add(`/${SLIKE_FOLDER}/${encodeURIComponent(fajl)}`);
    for (const p of storageKandidati(t, naziv)) storage.add(p);
  };

  dodaj(tip, vrednost);
  for (const l of sopDijagramKandidati(vrednost)) lokalni.add(l);

  const id = String(idDeo || "").trim().toUpperCase();
  if (id) {
    for (const ext of EXT_SLIKE) {
      const ime = `${id}.${ext}`;
      dodaj(tip, ime);
      dodaj(tip === "merljive" ? SLIKE_ATRIBUTIVNE : SLIKE_MERLJIVE, ime);
    }
  }

  return {
    lokalni: [...lokalni],
    storage: [...storage],
  };
}

/** Keš uspešnih URL-ova (neuspeh se ne kešira — fajl može stići kasnije). */
const prikazSlikeCache = new Map();

export function resetPrikazSlikeCache() {
  prikazSlikeCache.clear();
}

/** Redosled pokušaja učitavanja slike (bez provere učitavanja). */
export async function ucitajUrlSlike(supabase, tip, vrednost) {
  const url = await ucitajPrikazSliku(supabase, tip, vrednost);
  return url;
}

/**
 * Prvi URL koji stvarno radi (public/slike pa Storage).
 * idDeo — fallback npr. 5502-A.jpg ako Osovina_SOP.jpg ne postoji.
 */
export async function ucitajPrikazSliku(supabase, tip, vrednost, idDeo = null) {
  if (!vrednost && !idDeo) return null;
  const key = `${tip}|${String(vrednost || "").trim()}|${String(idDeo || "").trim().toUpperCase()}`;
  if (prikazSlikeCache.has(key)) return prikazSlikeCache.get(key);

  const { lokalni, storage } = sviKandidatiSlike(tip, vrednost, idDeo);

  for (const lokal of lokalni) {
    if (await testUrlSlike(lokal)) {
      prikazSlikeCache.set(key, lokal);
      return lokal;
    }
  }

  for (const put of storage) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(put, 3600);
    if (error || !data?.signedUrl) continue;
    if (await testUrlSlike(data.signedUrl)) {
      prikazSlikeCache.set(key, data.signedUrl);
      return data.signedUrl;
    }
  }

  return null;
}
