/** Pragovi NOK alarma po AQL klasi — bez Supabase / varijabilneUtils (Node + browser). */

export const NOK_ALARM_PROCENAT = 0.20;
export const NOK_ALARM_MIN_NOK = 1;

/** Podrazumevano (uputstvo): Critical 20%, Major 30%, Minor 40%. */
export const NOK_ALARM_PO_KLASI = {
  critical: 0.20,
  major: 0.30,
  minor: 0.40,
};

export const SPC_ALARM_PRAG_KLJUCEVI = {
  default: "spc_alarm_prag_default",
  critical: "spc_alarm_prag_critical",
  major: "spc_alarm_prag_major",
  minor: "spc_alarm_prag_minor",
};

/** Procenat 1–100 za UI i app_podesavanja. */
export const PODRAZUMEVANI_SPC_ALARM_PRAGOVI = {
  default: 20,
  critical: 20,
  major: 30,
  minor: 40,
};

const KLASA_NAZIVI = {
  critical: "Critical",
  major: "Major",
  minor: "Minor",
};

export const LS_KEY_SPC_ALARM_PRAGOVI = "spc_alarm_pragovi";
export const SPC_ALARM_PRAGOVI_EVENT = "spc-alarm-pragovi-change";

const LS_KEY = LS_KEY_SPC_ALARM_PRAGOVI;

let _cache = null;
let _syncInited = false;

function emitPragoviChange(normalized) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(SPC_ALARM_PRAGOVI_EVENT, { detail: normalized }));
  } catch { /* ignore */ }
}

/** Sinhronizacija pragova između tabova (linija, šifrarnik, analitika). */
export function initSpcAlarmPragoviSync() {
  if (_syncInited || typeof window === "undefined") return;
  _syncInited = true;
  window.addEventListener("storage", (e) => {
    if (e.key !== LS_KEY || !e.newValue) return;
    try {
      setSpcAlarmPragoviCache(JSON.parse(e.newValue), { skipLs: true, skipEmit: true });
    } catch { /* ignore */ }
  });
}

function clampProcenat(n, fallback) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v) || v < 1 || v > 100) return fallback;
  return v;
}

function pragoviIzProcenata(pct) {
  const src = { ...PODRAZUMEVANI_SPC_ALARM_PRAGOVI, ...pct };
  return {
    default: clampProcenat(src.default, PODRAZUMEVANI_SPC_ALARM_PRAGOVI.default) / 100,
    critical: clampProcenat(src.critical, PODRAZUMEVANI_SPC_ALARM_PRAGOVI.critical) / 100,
    major: clampProcenat(src.major, PODRAZUMEVANI_SPC_ALARM_PRAGOVI.major) / 100,
    minor: clampProcenat(src.minor, PODRAZUMEVANI_SPC_ALARM_PRAGOVI.minor) / 100,
  };
}

export function setSpcAlarmPragoviCache(pct, { skipLs = false, skipEmit = false } = {}) {
  const normalized = {
    default: clampProcenat(pct?.default, PODRAZUMEVANI_SPC_ALARM_PRAGOVI.default),
    critical: clampProcenat(pct?.critical, PODRAZUMEVANI_SPC_ALARM_PRAGOVI.critical),
    major: clampProcenat(pct?.major, PODRAZUMEVANI_SPC_ALARM_PRAGOVI.major),
    minor: clampProcenat(pct?.minor, PODRAZUMEVANI_SPC_ALARM_PRAGOVI.minor),
  };
  _cache = pragoviIzProcenata(normalized);
  if (!skipLs) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(normalized));
    } catch { /* ignore */ }
  }
  if (!skipEmit) emitPragoviChange(normalized);
  return normalized;
}

export function getAktivniSpcAlarmPragovi() {
  if (_cache) return _cache;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      _cache = pragoviIzProcenata(parsed);
      return _cache;
    }
  } catch { /* ignore */ }
  return pragoviIzProcenata(PODRAZUMEVANI_SPC_ALARM_PRAGOVI);
}

export function spcAlarmPragoviIzPodesavanja(settings = {}) {
  const def = PODRAZUMEVANI_SPC_ALARM_PRAGOVI;
  const parse = (kljuc, fallback) => clampProcenat(settings[kljuc], fallback);
  return {
    default: parse(SPC_ALARM_PRAG_KLJUCEVI.default, def.default),
    critical: parse(SPC_ALARM_PRAG_KLJUCEVI.critical, def.critical),
    major: parse(SPC_ALARM_PRAG_KLJUCEVI.major, def.major),
    minor: parse(SPC_ALARM_PRAG_KLJUCEVI.minor, def.minor),
  };
}

export async function ucitajSpcAlarmPragove(supabase) {
  try {
    const { ucitajPodesavanjaNotifikacija } = await import("./notifikacije.js");
    const settings = await ucitajPodesavanjaNotifikacija(supabase);
    return setSpcAlarmPragoviCache(spcAlarmPragoviIzPodesavanja(settings));
  } catch {
    return setSpcAlarmPragoviCache(PODRAZUMEVANI_SPC_ALARM_PRAGOVI);
  }
}

export async function snimiSpcAlarmPragove(supabase, pct) {
  const normalized = setSpcAlarmPragoviCache(pct);
  try {
    const { ucitajPodesavanjaNotifikacija, sacuvajPodesavanjaNotifikacija } = await import("./notifikacije.js");
    const postojece = await ucitajPodesavanjaNotifikacija(supabase);
    const merged = { ...postojece };
    for (const [id, kljuc] of Object.entries(SPC_ALARM_PRAG_KLJUCEVI)) {
      merged[kljuc] = String(normalized[id]);
    }
    const r = await sacuvajPodesavanjaNotifikacija(supabase, merged);
    return { ...r, pragovi: normalized };
  } catch (e) {
    return { ok: false, error: e.message, localOnly: true, pragovi: normalized };
  }
}

export function normalizujKlasaDefekta(klasa) {
  const s = String(klasa || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!s) return null;
  if (s.startsWith("crit") || s.includes("krit") || s === "aql critical") return "critical";
  if (s.startsWith("maj") || s.includes("glavn")) return "major";
  if (s.startsWith("min") || s.includes("manj")) return "minor";
  return null;
}

export function nokAlarmProcenatZaKlasu(klasa) {
  const pragovi = getAktivniSpcAlarmPragovi();
  const k = normalizujKlasaDefekta(klasa);
  if (!k) return pragovi.default;
  return pragovi[k] ?? pragovi.default;
}

export function labelKlasaSaPragom(klasa) {
  const k = normalizujKlasaDefekta(klasa);
  if (!k) return null;
  const pct = Math.round(nokAlarmProcenatZaKlasu(klasa) * 100);
  return `${KLASA_NAZIVI[k]} · alarm ≥${pct}% NOK`;
}

/** Operateru razumljivo objašnjenje linijskog NOK alarma (iz polja pravilo). */
export function objasniLinijskiNokAlarm(alarm) {
  const p = String(alarm?.pravilo || "").trim();
  if (!p || !p.includes("NOK")) return null;
  const m = p.match(/NOK ≥(\d+)%\s*(Critical|Major|Minor)?\s*\((\d+)\/(\d+)\)/i);
  if (!m) return null;
  const [, prag, klasa, nok, uk] = m;
  const proc = Number(uk) > 0 ? Math.round((Number(nok) / Number(uk)) * 100) : 0;
  const klasaTxt = klasa ? ` za ${klasa} klasu` : "";
  const poz = alarm?.pozicija ? ` na poziciji ${alarm.pozicija}` : "";
  return `U seriji${poz}: ${nok} od ${uk} merenja su NOK (${proc}%). `
    + `Limit je ${prag}% NOK${klasaTxt} — zato je unos blokiran dok ne potvrdite šta ste proverili.`;
}

export function statistikaNokSerije(merenja, procenat = null) {
  const uk = merenja?.length || 0;
  const nok = (merenja || []).filter((r) => r.status === "NOK").length;
  const proc = uk > 0 ? nok / uk : 0;
  const prag = procenat ?? getAktivniSpcAlarmPragovi().default;
  const minPotrebno = uk > 0
    ? Math.max(NOK_ALARM_MIN_NOK, Math.ceil(uk * prag))
    : 0;
  const pali = uk > 0 && nok >= minPotrebno && proc >= prag;
  return { uk, nok, proc, minPotrebno, pali, prag };
}

export function pozicijeSaPrekoracenimNok(rows, klasaPoPoziciji = {}) {
  const poPoz = {};
  for (const r of rows || []) {
    const poz = r.pozicija || "?";
    if (!poPoz[poz]) poPoz[poz] = [];
    poPoz[poz].push(r);
  }
  return Object.entries(poPoz)
    .map(([pozicija, merenja]) => {
      const prag = nokAlarmProcenatZaKlasu(klasaPoPoziciji[pozicija]);
      return {
        pozicija,
        merenja,
        klasa: klasaPoPoziciji[pozicija] || null,
        ...statistikaNokSerije(merenja, prag),
      };
    })
    .filter((p) => p.pali);
}

/** Primer: koliko NOK u seriji od n merenja pali alarm. */
export function primerAlarmSerija(nMerenja, procenat) {
  const n = Math.max(1, Math.round(Number(nMerenja) || 5));
  const prag = Number(procenat) / 100;
  const min = Math.max(NOK_ALARM_MIN_NOK, Math.ceil(n * prag));
  return { n, min, procenat: Math.round(Number(procenat)) };
}
