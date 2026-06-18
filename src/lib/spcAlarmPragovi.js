/** Pragovi NOK alarma po AQL klasi — bez Supabase / varijabilneUtils (Node + browser). */

export const NOK_ALARM_PROCENAT = 0.20;
export const NOK_ALARM_MIN_NOK = 1;

export const NOK_ALARM_PO_KLASI = {
  critical: 0.20,
  major: 0.30,
  minor: 0.40,
};

const KLASA_NAZIVI = {
  critical: "Critical",
  major: "Major",
  minor: "Minor",
};

export function normalizujKlasaDefekta(klasa) {
  const s = String(klasa || "").trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith("crit") || s.includes("krit")) return "critical";
  if (s.startsWith("maj")) return "major";
  if (s.startsWith("min")) return "minor";
  return null;
}

export function nokAlarmProcenatZaKlasu(klasa) {
  const k = normalizujKlasaDefekta(klasa);
  if (!k) return NOK_ALARM_PROCENAT;
  return NOK_ALARM_PO_KLASI[k] ?? NOK_ALARM_PROCENAT;
}

export function labelKlasaSaPragom(klasa) {
  const k = normalizujKlasaDefekta(klasa);
  if (!k) return null;
  const pct = Math.round(nokAlarmProcenatZaKlasu(klasa) * 100);
  return `${KLASA_NAZIVI[k]} · alarm ≥${pct}% NOK`;
}

export function statistikaNokSerije(merenja, procenat = NOK_ALARM_PROCENAT) {
  const uk = merenja?.length || 0;
  const nok = (merenja || []).filter((r) => r.status === "NOK").length;
  const proc = uk > 0 ? nok / uk : 0;
  const prag = procenat ?? NOK_ALARM_PROCENAT;
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
