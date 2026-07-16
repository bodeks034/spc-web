/**
 * Katalog uputstava — putanje su u /obuka-paket/ (docs + public, sync skripta).
 * uloge: lista dozvoljenih uloga (obavezno — bez null „svi”).
 * Operater / kontrolor = samo unos merenja (Modul 1); inženjer/šef/admin = širi set.
 */
export const UPUTSTVO_KATEGORIJE = [
  { id: "obuka-operater", naziv: "Obuka — operater / linija", ikon: "👷" },
  { id: "obuka-inzenjer", naziv: "Obuka — inženjer / kvalitet", ikon: "🔧" },
  { id: "koriscenje", naziv: "Korišćenje aplikacije", ikon: "📱" },
  { id: "erp-it", naziv: "ERP, deploy i IT", ikon: "⚙️" },
];

/** Linija — samo Obuka Modul 1 (bez „Korišćenje aplikacije”). */
const LINIJA = ["operator", "kontrolor"];
/** Kancelarija — Modul 2, šifrarnik, analitika, indeks korišćenja. */
const KANCELARIJA = ["kvalitet", "sef", "admin"];
/** Obuka Modul 1 — linija + kancelarija. */
const UNOS_MERENJA = [...LINIJA, ...KANCELARIJA];
const ADMIN = ["admin"];

/** @type {Array<{id:string,kategorija:string,naslov:string,opis:string,fajl:string,tip:'markdown'|'html',uloge:string[],obukaPaket?:boolean}>} */
export const UPUTSTVO_DOKUMENTI = [
  {
    id: "obuka-komplet-html",
    kategorija: "obuka-inzenjer",
    naslov: "Obuka SPC — komplet (HTML)",
    opis: "Cela aplikacija A4: uloge, M0/M1/M2, tabovi, problem→rešenje",
    fajl: "/obuka-paket/OBUKA_SPC_KOMPLET.html",
    tip: "html",
    uloge: KANCELARIJA,
    obukaPaket: true,
  },
  {
    id: "operater-modul1",
    kategorija: "obuka-operater",
    naslov: "Operater / kontrolor — Modul 1",
    opis: "A4 štampa: zlatna pravila, koraci, LOG, FAI, checklist",
    fajl: "/obuka-paket/OBUKA_OPERATER_MODUL1.html",
    tip: "html",
    uloge: UNOS_MERENJA,
    obukaPaket: true,
  },
  {
    id: "inzenjer-modul2",
    kategorija: "obuka-inzenjer",
    naslov: "Inženjer / šef — Modul 2",
    opis: "A4: grupe tabova, Odobrenja, NCR, 8D, predaja, checklist",
    fajl: "/obuka-paket/OBUKA_INZENJER_MODUL2.html",
    tip: "html",
    uloge: KANCELARIJA,
    obukaPaket: true,
  },
  {
    id: "iso-2859",
    kategorija: "koriscenje",
    naslov: "ISO 2859 — AQL atributivne",
    opis: "Kalkulator prihvatanja lota po broju NOK",
    fajl: "/obuka-paket/UPUTSTVO_ISO_2859.md",
    tip: "markdown",
    uloge: KANCELARIJA,
  },
  {
    id: "iso-3951",
    kategorija: "koriscenje",
    naslov: "ISO 3951 — merljive (uzorkovanje)",
    opis: "Kalkulator prihvatanja lota po dimenzijama",
    fajl: "/obuka-paket/UPUTSTVO_ISO_3951.md",
    tip: "markdown",
    uloge: KANCELARIJA,
  },
  {
    id: "koriscenje-app",
    kategorija: "koriscenje",
    naslov: "Korišćenje aplikacije",
    opis: "Indeks: moduli, uloge, linkovi na svu obuku",
    fajl: "/obuka-paket/UPUTSTVO_KORISCENJE_APLIKACIJE.md",
    tip: "markdown",
    uloge: KANCELARIJA,
    obukaPaket: true,
  },
  {
    id: "glavni-unos",
    kategorija: "koriscenje",
    naslov: "Glavni unos",
    opis: "Atributivni glavni unos i kontrolna lista",
    fajl: "/obuka-paket/UPUTSTVO_GLAVNI_UNOS.md",
    tip: "markdown",
    uloge: KANCELARIJA,
  },
  {
    id: "barkod-merila",
    kategorija: "koriscenje",
    naslov: "Barkod i merila",
    opis: "Skeniranje, digitalna merila, kalibracija",
    fajl: "/obuka-paket/UPUTSTVO_BARKOD_I_MERILA.md",
    tip: "markdown",
    uloge: KANCELARIJA,
  },
  {
    id: "barkod-pravljenje",
    kategorija: "koriscenje",
    naslov: "Pravljenje barkodova",
    opis: "Etikete i profili po delu",
    fajl: "/obuka-paket/UPUTSTVO_PRAVLJENJE_BARKODOVA.md",
    tip: "markdown",
    uloge: KANCELARIJA,
  },
  {
    id: "spc-analitika",
    kategorija: "koriscenje",
    naslov: "SPC karte i analitika",
    opis: "X̄/R, P, C, alarmi, trendovi",
    fajl: "/obuka-paket/UPUTSTVO_SPC_KARTE_I_ANALITIKA.md",
    tip: "markdown",
    uloge: KANCELARIJA,
  },
  {
    id: "sifrarnik-modul",
    kategorija: "koriscenje",
    naslov: "Modul 0 — Šifrarnik",
    opis: "Svih 25 tabova, ERP CSV uvoz, Glavni unos, propagacija",
    fajl: "/obuka-paket/UPUTSTVO_MODUL_SIFARNIK.md",
    tip: "markdown",
    uloge: KANCELARIJA,
    obukaPaket: true,
  },
  {
    id: "novo-vozilo-sifrarnik",
    kategorija: "koriscenje",
    naslov: "Novo vozilo u Šifrarniku",
    opis: "Dijagram, tipovi, delovi tip_kontrole=vozilo, defekti po zonama, pogon F",
    fajl: "/obuka-paket/UPUTSTVO_NOVO_VOZILO_SIFARNIK.md",
    tip: "markdown",
    uloge: KANCELARIJA,
    obukaPaket: true,
  },
  {
    id: "novi-deo-sifrarnik",
    kategorija: "koriscenje",
    naslov: "Novi deo u Šifrarniku",
    opis: "Master deo, greške, crtež, pogon, RN, merljive — tip_kontrole=deo",
    fajl: "/obuka-paket/UPUTSTVO_NOVI_DEO_SIFARNIK.md",
    tip: "markdown",
    uloge: KANCELARIJA,
    obukaPaket: true,
  },
  {
    id: "sifrarnik-modul-html",
    kategorija: "koriscenje",
    naslov: "Modul 0 — Šifrarnik (HTML)",
    opis: "A4 PDF — svi tabovi, ERP CSV",
    fajl: "/obuka-paket/OBUKA_MODUL_SIFARNIK.html",
    tip: "html",
    uloge: KANCELARIJA,
    obukaPaket: true,
  },
  {
    id: "erp-sap-drop",
    kategorija: "erp-it",
    naslov: "SAP → erp-drop/incoming",
    opis: "Šta SAP stavlja u folder za dnevni uvoz",
    fajl: "/obuka-paket/UPUTSTVO_SAP_ERP_DROP.md",
    tip: "markdown",
    uloge: ADMIN,
  },
  {
    id: "erp-konfig",
    kategorija: "erp-it",
    naslov: "ERP uvoz — konfiguracija",
    opis: "SAP/Pantheon CSV, cron, folder erp-drop",
    fajl: "/obuka-paket/UPUTSTVO_ERP_KONFIGURACIJA.md",
    tip: "markdown",
    uloge: ADMIN,
  },
  {
    id: "erp-rn",
    kategorija: "erp-it",
    naslov: "ERP radni nalozi",
    opis: "Mapiranje kolona RN iz ERP-a",
    fajl: "/obuka-paket/UPUTSTVO_ERP_RADNI_NALOZI.md",
    tip: "markdown",
    uloge: ADMIN,
  },
  {
    id: "test-deploy",
    kategorija: "erp-it",
    naslov: "Testiranje i deploy",
    opis: "Go-live, E2E, checklist",
    fajl: "/obuka-paket/UPUTSTVO_TESTIRANJE_I_DEPLOY.md",
    tip: "markdown",
    uloge: ADMIN,
  },
  {
    id: "go-live",
    kategorija: "erp-it",
    naslov: "Go-live runbook",
    opis: "Koraci za puštanje u rad",
    fajl: "/obuka-paket/GO_LIVE_RUNBOOK.md",
    tip: "markdown",
    uloge: ADMIN,
  },
  {
    id: "automatizacija",
    kategorija: "erp-it",
    naslov: "Automatizacija",
    opis: "Cron, digest, health check",
    fajl: "/obuka-paket/UPUTSTVO_AUTOMATIZACIJA.md",
    tip: "markdown",
    uloge: ADMIN,
  },
];

export function dokumentiZaUlogu(uloga) {
  const u = String(uloga || "operator").toLowerCase();
  return UPUTSTVO_DOKUMENTI.filter((d) => Array.isArray(d.uloge) && d.uloge.includes(u));
}

export function dokumentPoId(id) {
  return UPUTSTVO_DOKUMENTI.find((d) => d.id === id) || null;
}

export function obukaPaketDokumenti(uloga) {
  return dokumentiZaUlogu(uloga).filter((d) => d.obukaPaket);
}
