/**
 * Struktura foldera KONTROLA KVALITETA na računaru.
 *
 * KONTROLA_KVALITETA/
 * ├── NCR_KVALITET/
 * │   ├── NCR_Registar_Master.xlsx          ← master lista (statistika)
 * │   ├── A4_NCR_Obrazac_Template.xlsx      ← blanko šablon (Save As)
 * │   └── Pojedinacni_Obrasci/              ← NCR-2026-001.xlsx, …
 * ├── 02_8D_Izvestaji/8D_*.doc
 * ├── 03_Inzenjering_Kvaliteta/Proces_{pogon}/PFMEA_*.xlsx, Control_Plan_*.xlsx
 * ├── 04_Izvestaji_Kupci/
 * ├── 05_Izvestaji_Dobavljaci/
 * └── 06_Operativni_Izvestaji/{Smena|Trasabilitet|FAI|Eskalacije|NCR_PDF}/
 */

export const KVALITET_ROOT_NAZIV = "KONTROLA_KVALITETA";

export const FOLDER_NCR = "NCR_KVALITET";
export const FOLDER_NCR_OBRASCI = "Pojedinacni_Obrasci";
export const NCR_REGISTAR_MASTER = "NCR_Registar_Master.xlsx";
export const NCR_OBRAZAC_TEMPLATE = "A4_NCR_Obrazac_Template.xlsx";
/** @deprecated koristi NCR_REGISTAR_MASTER */
export const NCR_EXCEL_IME = NCR_REGISTAR_MASTER;

export const FOLDER_8D = "02_8D_Izvestaji";
export const FOLDER_INZ = "03_Inzenjering_Kvaliteta";
export const FOLDER_KUPAC = "04_Izvestaji_Kupci";
export const FOLDER_DOBAVLJAC = "05_Izvestaji_Dobavljaci";
export const FOLDER_OPERATIVA = "06_Operativni_Izvestaji";

/** Podfolderi u 06_Operativni_Izvestaji */
export const OPERATIVA_POD = {
  smena: "Smena",
  trasabilitet: "Trasabilitet",
  fai: "FAI",
  eskalacije: "Eskalacije",
  ncr: "NCR_PDF",
};

/** Ime pojedinačnog NCR obrasca u Pojedinacni_Obrasci/. */
export function imeNcrObrazacFajla(brojNcr) {
  const s = String(brojNcr || "NCR").replace(/[\\/*?:[\]]/g, "-").trim();
  return `${s}.xlsx`;
}

/** Relativna putanja od NCR_KVALITET/ do pojedinačnog obrasca. */
export function putanjaNcrObrazacExcel(brojNcr) {
  return `${FOLDER_NCR_OBRASCI}/${imeNcrObrazacFajla(brojNcr)}`;
}

/** Ime PDF obrasca u Pojedinacni_Obrasci/ (pored Excel-a). */
export function imeNcrObrazacPdf(brojNcr) {
  return imeNcrObrazacFajla(brojNcr).replace(/\.xlsx$/i, ".pdf");
}

export function putanjaNcrObrazacPdf(brojNcr) {
  return `${FOLDER_NCR}/${FOLDER_NCR_OBRASCI}/${imeNcrObrazacPdf(brojNcr)}`;
}

export function sanitizeImeFoldera(ime) {
  const s = String(ime || "").trim();
  if (!s) return "Nepoznat";
  return s
    .replace(/[^\w\s\u0100-\u017F-]/gi, "")
    .replace(/\s+/g, "_")
    .slice(0, 48) || "Nepoznat";
}

/** Proces_Karoserija, Proces_CNC_Obrada, … */
export function imeProcesFoldera(pogon) {
  return `Proces_${sanitizeImeFoldera(pogon)}`;
}

export function imePfmeaExcela(pogon) {
  return `PFMEA_${sanitizeImeFoldera(pogon)}.xlsx`;
}

export function imeControlPlanExcela(pogon) {
  return `Control_Plan_${sanitizeImeFoldera(pogon)}.xlsx`;
}

/** 8D_2026_001_Reklamacija_Kupca.docx */
export function ime8dDocx({ broj_8d, opis, godina } = {}) {
  const g = godina || new Date().getFullYear();
  const br = String(broj_8d || "000").replace(/[^\w-]+/g, "_").slice(0, 24);
  const op = sanitizeImeFoldera(String(opis || "Izvestaj").slice(0, 40));
  return `8D_${g}_${br}_${op}.docx`;
}

/** Ime Word fajla u 02_8D_Izvestaji (.doc — HTML za Word). */
export function ime8dWordFajla(izv) {
  const g = izv?.datum_otvaranja_8d || izv?.created_at
    ? new Date(izv.datum_otvaranja_8d || izv.created_at).getFullYear()
    : new Date().getFullYear();
  return ime8dDocx({
    broj_8d: izv?.broj_8d || "000",
    opis: izv?.d2_opis_problema || izv?.defekt_nedostatak || "Izvestaj",
    godina: g,
  }).replace(/\.docx$/i, ".doc");
}

export function putanjaKvalitetFajla(folder, filename, podfolder = null) {
  const parts = [folder];
  if (podfolder) parts.push(podfolder);
  parts.push(filename);
  return parts.join("/");
}

export function putanjaOperativaPdf(kategorija, filename) {
  const pod = OPERATIVA_POD[kategorija] || kategorija;
  return putanjaKvalitetFajla(FOLDER_OPERATIVA, filename, pod);
}

export function putanjaPfmeaPdf(pogon, filename) {
  return `${FOLDER_INZ}/${imeProcesFoldera(pogon)}/${filename}`;
}

export const STRUKTURA_OPIS = [
  `${KVALITET_ROOT_NAZIV}/`,
  `├── ${FOLDER_NCR}/`,
  `│   ├── ${NCR_REGISTAR_MASTER} (master registar — uvek otvoren)`,
  `│   ├── ${NCR_OBRAZAC_TEMPLATE} (blanko šablon — Save As)`,
  `│   └── ${FOLDER_NCR_OBRASCI}/ → NCR-2026-001.xlsx, …`,
  `├── ${FOLDER_8D}/ → zasebni Word po 8D izveštaju`,
  `├── ${FOLDER_INZ}/Proces_{pogon}/ → PFMEA + Control Plan po pogonu/procesu`,
  `├── ${FOLDER_KUPAC}/ → PDF izveštaji za kupce`,
  `├── ${FOLDER_DOBAVLJAC}/ → PDF ocena i KPI dobavljača`,
  `└── ${FOLDER_OPERATIVA}/ → smena, trasabilitet, FAI, eskalacije, NCR PDF`,
];

/** Podrazumevani procesi — kreiraju se pri prvom povezivanju foldera. */
export const PODRAZUMEVANI_PROCESI = [
  "Karoserija",
  "CNC_Obrada",
  "Zavarivanje",
  "Montaza",
  "Masinska_obrada",
  "Lakirnica",
];

export function spojiPogoneZaStrukturu(pogoniIzBaze = []) {
  const set = new Set(PODRAZUMEVANI_PROCESI);
  for (const p of pogoniIzBaze || []) {
    const s = String(p || "").trim();
    if (s) set.add(s);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "sr"));
}

/** Stablo za prikaz u aplikaciji. */
export function strukturaDrvo(pogoni = []) {
  const procesi = spojiPogoneZaStrukturu(pogoni);
  return {
    root: KVALITET_ROOT_NAZIV,
    grane: [
      {
        id: "ncr",
        folder: FOLDER_NCR,
        fajlovi: [NCR_REGISTAR_MASTER, NCR_OBRAZAC_TEMPLATE],
        podfolder: FOLDER_NCR_OBRASCI,
        opis: "Master registar + blanko šablon + pojedinačni obrasci po NCR-u",
      },
      {
        id: "8d",
        folder: FOLDER_8D,
        primer: "8D_2026_001_Reklamacija_Kupca.docx",
        opis: "Zasebni Word izveštaj po 8D",
      },
      {
        id: "inz",
        folder: FOLDER_INZ,
        opis: "PFMEA i Control Plan po pogonu/procesu (+ PDF izvoz)",
        deca: procesi.map((p) => ({
          folder: imeProcesFoldera(p),
          pogon: p,
          fajlovi: [imePfmeaExcela(p), imeControlPlanExcela(p)],
        })),
      },
      {
        id: "kupac",
        folder: FOLDER_KUPAC,
        primer: "TRI-CORE_Izvestaj_kupca_*.pdf",
        opis: "PDF izveštaj kvaliteta za kupca (Modul 2 → KUPAC)",
      },
      {
        id: "dobavljac",
        folder: FOLDER_DOBAVLJAC,
        primer: "TRI-CORE_Izvestaj_dobavljac_*.pdf",
        opis: "PDF izveštaj i ocena dobavljača (Modul 2 → DOBAVLJAČI)",
      },
      {
        id: "operativa",
        folder: FOLDER_OPERATIVA,
        opis: "Operativni PDF: smena, trasabilitet, FAI, eskalacije, NCR obrazac",
        deca: Object.values(OPERATIVA_POD).map((f) => ({
          folder: f,
          fajlovi: ["*.pdf"],
        })),
      },
    ],
  };
}

export const UPUTSTVO_LOKACIJA = [
  "Preporučeno: Documents/KONTROLA_KVALITETA (Windows) ili Dokumenti/KONTROLA_KVALITETA (Mac).",
  "Na mrežnom disku firme: \\\\server\\Kvalitet\\KONTROLA_KVALITETA",
  "U aplikaciji: tab NCR → Folder kvaliteta → Kreiraj / poveži folder.",
];

/** Kreira podfoldere u povezanom root direktorijumu (File System Access API). */
export async function osigurajKvalitetStrukturu(rootHandle, pogoni = []) {
  if (!rootHandle?.getDirectoryHandle) {
    throw new Error("Nevažeći folder — izaberite glavni folder KONTROLA KVALITETA.");
  }

  const ncrDir = await rootHandle.getDirectoryHandle(FOLDER_NCR, { create: true });
  const ncrObrasci = await ncrDir.getDirectoryHandle(FOLDER_NCR_OBRASCI, { create: true });
  const osmdDir = await rootHandle.getDirectoryHandle(FOLDER_8D, { create: true });
  const inzDir = await rootHandle.getDirectoryHandle(FOLDER_INZ, { create: true });
  const kupacDir = await rootHandle.getDirectoryHandle(FOLDER_KUPAC, { create: true });
  const dobavljacDir = await rootHandle.getDirectoryHandle(FOLDER_DOBAVLJAC, { create: true });
  const operativaDir = await rootHandle.getDirectoryHandle(FOLDER_OPERATIVA, { create: true });

  const operativaPod = {};
  for (const pod of Object.values(OPERATIVA_POD)) {
    operativaPod[pod] = await operativaDir.getDirectoryHandle(pod, { create: true });
  }

  const procesFolderi = [];
  const sviPogoni = spojiPogoneZaStrukturu(pogoni);
  for (const pogon of sviPogoni) {
    const folderName = imeProcesFoldera(pogon);
    const procDir = await inzDir.getDirectoryHandle(folderName, { create: true });
    procesFolderi.push({ pogon, folder: folderName, handle: procDir });
  }

  return {
    root: rootHandle,
    ncr: ncrDir,
    ncrObrasci,
    osmd: osmdDir,
    inzenjering: inzDir,
    kupac: kupacDir,
    dobavljac: dobavljacDir,
    operativa: operativaDir,
    operativaPod,
    procesi: procesFolderi,
  };
}

export async function upisiFajlUDirektorijum(dirHandle, imeFajla, buffer) {
  const fileHandle = await dirHandle.getFileHandle(imeFajla, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(buffer);
  await writable.close();
  return fileHandle;
}

const PLACEHOLDER_IME = "CITAJ_ME.txt";

/** Kratko uputstvo u praznim folderima na disku (File System Access API). */
export async function osigurajKvalitetPlaceholdere(struktura) {
  if (!struktura) return;

  const upisi = async (handle, tekst) => {
    if (!handle) return;
    const buf = new TextEncoder().encode(tekst);
    await upisiFajlUDirektorijum(handle, PLACEHOLDER_IME, buf);
  };

  await upisi(struktura.ncr,
    `${FOLDER_NCR}\r\n\r\n• ${NCR_REGISTAR_MASTER} — master registar (statistika)\r\n• ${NCR_OBRAZAC_TEMPLATE} — blanko šablon (Save As)\r\n• ${FOLDER_NCR_OBRASCI}/ — pojedinačni NCR obrasci\r\n`);
  await upisi(struktura.ncrObrasci,
    `${FOLDER_NCR_OBRASCI}\r\n\r\nOvde čuvajte popunjene NCR obrasce:\r\n• NCR-2026-001.xlsx (Excel)\r\n• NCR-2026-001.pdf (A4 obrazac sa potpisima)\r\nBlanko šablon uvek kopirajte iz ${NCR_OBRAZAC_TEMPLATE} (Save As).\r\n`);
  await upisi(struktura.osmd,
    `${FOLDER_8D}\r\n\r\nZasebni Word izveštaji po 8D (8D_YYYY_NNN_Opis.doc).\r\nAko je u registru Pokrenut 8D? = DA → otvori odgovarajući fajl ovde.\r\n`);
  await upisi(struktura.inzenjering,
    `${FOLDER_INZ}\r\n\r\nPodfolderi Proces_{pogon}/ sa PFMEA i Control Plan Excel fajlovima.\r\n`);
  await upisi(struktura.kupac, `${FOLDER_KUPAC}\r\n\r\nPDF izveštaji za kupce.\r\n`);
  await upisi(struktura.dobavljac, `${FOLDER_DOBAVLJAC}\r\n\r\nPDF izveštaji za dobavljače.\r\n`);
  await upisi(struktura.operativa, `${FOLDER_OPERATIVA}\r\n\r\nOperativni PDF arhiv (Smena, Trasabilitet, FAI, Eskalacije, NCR PDF).\r\n`);

  for (const pod of Object.values(struktura.operativaPod || {})) {
    await upisi(pod, `Operativni izveštaji — ${pod.name || "podfolder"}\r\n`);
  }
  for (const proc of struktura.procesi || []) {
    await upisi(proc.handle, `Proces: ${proc.pogon}\r\nPFMEA + Control Plan za ovaj pogon.\r\n`);
  }
}
