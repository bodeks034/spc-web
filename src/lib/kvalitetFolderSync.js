/**
 * Povezivanje i kreiranje foldera KONTROLA KVALITETA na disku.
 */

import {
  ncrRegistarMasterArrayBuffer,
  ncrObrazacTemplateArrayBuffer,
  ncrPojedinacniObrazacArrayBuffer,
} from "./ncrExcelExport.js";
import { ncrIzBaze } from "./ncrObrazacPolja.js";
import { generisiNcrObrazacPdf } from "./ncrObrazacPdf.js";
import {
  NCR_REGISTAR_MASTER,
  NCR_OBRAZAC_TEMPLATE,
  FOLDER_NCR,
  FOLDER_NCR_OBRASCI,
  FOLDER_8D,
  osigurajKvalitetStrukturu,
  osigurajKvalitetPlaceholdere,
  upisiFajlUDirektorijum,
  KVALITET_ROOT_NAZIV,
  spojiPogoneZaStrukturu,
  ime8dWordFajla,
  imeNcrObrazacFajla,
  imeNcrObrazacPdf,
} from "./kvalitetFolderStruktura.js";
import { buildOsmdWordHtml } from "./osmdIzvestajPdf.js";

const DB_NAME = "spc_kvalitet_folder_v1";
const STORE = "handles";
const KEY_ROOT = "root_dir";
const KEY_PARENT = "parent_path";

function podrzavaFsAccess() {
  return typeof window !== "undefined"
    && typeof window.showDirectoryPicker === "function";
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function proveriDozvolu(handle) {
  const perm = await handle.queryPermission({ mode: "readwrite" });
  if (perm === "granted") return true;
  const req = await handle.requestPermission({ mode: "readwrite" });
  return req === "granted";
}

async function getRootHandle() {
  return idbGet(KEY_ROOT);
}

async function syncNcrPdfNaDisk(struktura, forma) {
  if (!forma?.broj_ncr || typeof document === "undefined") return;
  try {
    const { pdf } = await generisiNcrObrazacPdf(forma);
    const buf = pdf.output("arraybuffer");
    await upisiFajlUDirektorijum(struktura.ncrObrasci, imeNcrObrazacPdf(forma.broj_ncr), buf);
  } catch { /* PDF sync opciono */ }
}

async function syncNcrExcelNaDisk(struktura, { listaNcr = [], aktivniObrazac = null } = {}) {
  const masterBuf = ncrRegistarMasterArrayBuffer({ lista: listaNcr });
  await upisiFajlUDirektorijum(struktura.ncr, NCR_REGISTAR_MASTER, masterBuf);

  const templateBuf = ncrObrazacTemplateArrayBuffer();
  await upisiFajlUDirektorijum(struktura.ncr, NCR_OBRAZAC_TEMPLATE, templateBuf);

  const seen = new Set();
  for (const row of listaNcr || []) {
    const forma = ncrIzBaze(row);
    if (!forma.broj_ncr || seen.has(forma.broj_ncr)) continue;
    seen.add(forma.broj_ncr);
    const buf = ncrPojedinacniObrazacArrayBuffer(forma);
    await upisiFajlUDirektorijum(struktura.ncrObrasci, imeNcrObrazacFajla(forma.broj_ncr), buf);
    await syncNcrPdfNaDisk(struktura, forma);
  }

  if (aktivniObrazac?.broj_ncr) {
    const buf = ncrPojedinacniObrazacArrayBuffer(aktivniObrazac);
    await upisiFajlUDirektorijum(
      struktura.ncrObrasci,
      imeNcrObrazacFajla(aktivniObrazac.broj_ncr),
      buf,
    );
    await syncNcrPdfNaDisk(struktura, aktivniObrazac);
  }
}

/** Bira roditeljski folder i kreira KONTROLA_KVALITETA unutra ako treba. */
async function resolveRootHandle(parentHandle) {
  if (parentHandle.name === KVALITET_ROOT_NAZIV) {
    return { root: parentHandle, parentIme: parentHandle.name, kreiran: false };
  }
  const root = await parentHandle.getDirectoryHandle(KVALITET_ROOT_NAZIV, { create: true });
  return { root, parentIme: parentHandle.name, kreiran: true };
}

/**
 * Korisnik bira lokaciju (npr. Dokumenti) — aplikacija kreira KONTROLA_KVALITETA i podfoldere.
 */
export async function poveziKvalitetFolder({ pogoni = [], listaNcr = [], aktivniObrazac = null } = {}) {
  if (!podrzavaFsAccess()) {
    throw new Error("Browser ne podržava direktno čuvanje — koristite Chrome/Edge.");
  }

  const parentHandle = await window.showDirectoryPicker({
    id: "spc-kvalitet-parent",
    mode: "readwrite",
    startIn: "documents",
  });

  const { root: rootHandle, parentIme, kreiran } = await resolveRootHandle(parentHandle);
  const sviPogoni = spojiPogoneZaStrukturu([
    ...pogoni,
    ...(listaNcr || []).map((r) => r.pogon),
  ]);

  const struktura = await osigurajKvalitetStrukturu(rootHandle, sviPogoni);
  await osigurajKvalitetPlaceholdere(struktura);
  await syncNcrExcelNaDisk(struktura, { listaNcr, aktivniObrazac });

  await idbPut(KEY_ROOT, rootHandle);
  await idbPut(KEY_PARENT, parentIme);

  return {
    root: rootHandle.name,
    parent: parentIme,
    kreiran,
    punaPutanja: kreiran ? `${parentIme}/${KVALITET_ROOT_NAZIV}` : KVALITET_ROOT_NAZIV,
    ncrPutanja: `${FOLDER_NCR}/${NCR_REGISTAR_MASTER}`,
    ncrObrasciPutanja: `${FOLDER_NCR}/${FOLDER_NCR_OBRASCI}/`,
    procesFolderi: struktura.procesi.map((p) => p.folder),
  };
}

export async function syncKvalitetFolder({
  pogoni = [],
  listaNcr = [],
  aktivniObrazac = null,
} = {}) {
  if (!podrzavaFsAccess()) return { synced: false, reason: "no_fs" };

  const rootHandle = await getRootHandle();
  if (!rootHandle) return { synced: false, reason: "no_folder" };

  try {
    if (!(await proveriDozvolu(rootHandle))) {
      return { synced: false, reason: "denied" };
    }

    const sviPogoni = spojiPogoneZaStrukturu([
      ...pogoni,
      ...(listaNcr || []).map((r) => r.pogon).filter(Boolean),
    ]);

    const struktura = await osigurajKvalitetStrukturu(rootHandle, sviPogoni);
    await osigurajKvalitetPlaceholdere(struktura);
    await syncNcrExcelNaDisk(struktura, { listaNcr, aktivniObrazac });

    const parent = await idbGet(KEY_PARENT);
    const rel = `${FOLDER_NCR}/${NCR_REGISTAR_MASTER}`;
    return {
      synced: true,
      putanja: parent ? `${parent}/${KVALITET_ROOT_NAZIV}/${rel}` : `${KVALITET_ROOT_NAZIV}/${rel}`,
      obrasciPutanja: `${FOLDER_NCR}/${FOLDER_NCR_OBRASCI}/`,
      procesFolderi: struktura.procesi.length,
    };
  } catch (e) {
    return { synced: false, reason: e.message };
  }
}

export async function getKvalitetFolderStatus() {
  if (!podrzavaFsAccess()) {
    return { podrzan: false, povezan: false };
  }
  const root = await getRootHandle();
  const parent = await idbGet(KEY_PARENT);
  if (!root) {
    return { podrzan: true, povezan: false };
  }
  return {
    podrzan: true,
    povezan: true,
    rootIme: root.name,
    parentIme: parent || null,
    punaPutanja: parent ? `${parent}/${KVALITET_ROOT_NAZIV}` : KVALITET_ROOT_NAZIV,
  };
}

export async function imaPovezanKvalitetFolder() {
  if (!podrzavaFsAccess()) return false;
  return !!(await getRootHandle());
}

export async function otkaciKvalitetFolder() {
  await idbDelete(KEY_ROOT);
  await idbDelete(KEY_PARENT);
}

/** Snima 8D Word u 02_8D_Izvestaji/ ako je folder povezan. */
export async function snimi8dWordUFolder(izv, wordOptions = {}) {
  if (!podrzavaFsAccess()) return { synced: false, reason: "no_fs" };

  const rootHandle = await getRootHandle();
  if (!rootHandle) return { synced: false, reason: "no_folder" };

  try {
    if (!(await proveriDozvolu(rootHandle))) {
      return { synced: false, reason: "denied" };
    }

    const struktura = await osigurajKvalitetStrukturu(rootHandle, []);
    const html = buildOsmdWordHtml(izv, wordOptions);
    const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
    const buf = await blob.arrayBuffer();
    const ime = ime8dWordFajla(izv);
    await upisiFajlUDirektorijum(struktura.osmd, ime, buf);

    const parent = await idbGet(KEY_PARENT);
    const putanja = parent
      ? `${parent}/${KVALITET_ROOT_NAZIV}/${FOLDER_8D}/${ime}`
      : `${KVALITET_ROOT_NAZIV}/${FOLDER_8D}/${ime}`;

    return { synced: true, putanja, ime };
  } catch (e) {
    return { synced: false, reason: e.message };
  }
}

/** Snima fajl u povezani KONTROLA_KVALITETA po relativnoj putanji (npr. 04_Izvestaji_Kupci/izv.pdf). */
export async function snimiFajlUKvalitetPutanja(relativnaPutanja, buffer) {
  if (!podrzavaFsAccess()) return { synced: false, reason: "no_fs" };

  const rootHandle = await getRootHandle();
  if (!rootHandle) return { synced: false, reason: "no_folder" };

  try {
    if (!(await proveriDozvolu(rootHandle))) {
      return { synced: false, reason: "denied" };
    }

    const delovi = String(relativnaPutanja || "").split("/").filter(Boolean);
    if (delovi.length < 2) {
      return { synced: false, reason: "invalid_path" };
    }

    const imeFajla = delovi.pop();
    await osigurajKvalitetStrukturu(rootHandle, []);

    let dir = rootHandle;
    for (const segment of delovi) {
      dir = await dir.getDirectoryHandle(segment, { create: true });
    }

    await upisiFajlUDirektorijum(dir, imeFajla, buffer);

    const parent = await idbGet(KEY_PARENT);
    const rel = delovi.join("/");
    const putanja = parent
      ? `${parent}/${KVALITET_ROOT_NAZIV}/${rel}/${imeFajla}`
      : `${KVALITET_ROOT_NAZIV}/${rel}/${imeFajla}`;

    return { synced: true, putanja, ime: imeFajla };
  } catch (e) {
    return { synced: false, reason: e.message };
  }
}

export { podrzavaFsAccess, KVALITET_ROOT_NAZIV };
