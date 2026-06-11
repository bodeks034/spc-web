/** Status kalibracije merila — povezivanje sa kolonama unosa (instrument). */

export function daniDoKalibracije(sledeca) {
  if (!sledeca) return null;
  return Math.ceil((new Date(sledeca) - new Date()) / 86400000);
}

export function statusKalibracijeMerila(merilo, upozorenjeDana = 30) {
  const kal = (merilo?.kalibracije || [])
    .sort((a, b) => new Date(b.datum_kal) - new Date(a.datum_kal))[0];
  if (!kal?.sledeca_kal) {
    return { status: "nepoznato", label: "Nije kalibrisano", bojaKey: "sivi", dani: null };
  }
  const dani = daniDoKalibracije(kal.sledeca_kal);
  if (dani < 0) {
    return { status: "istekla", label: `Kalibracija istekla (${Math.abs(dani)} d)`, bojaKey: "crvena", dani };
  }
  if (dani < upozorenjeDana) {
    return { status: "uskoro", label: `Kalibracija za ${dani} d`, bojaKey: "zuta", dani };
  }
  return { status: "ok", label: "Kalibracija OK", bojaKey: "zelena", dani };
}

function normKljuč(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Rezervni rokovi (docs/merila.csv) kad merilo nije u Supabase ili nema kalibracije. */
const FALLBACK_SLEdeca_KAL = [
  { kljucevi: ["mikrometar"], sledeca_kal: "2025-01-05" },
  { kljucevi: ["pomicno merilo", "pomicno", "dubinsko pomicno"], sledeca_kal: "2024-12-15" },
  { kljucevi: ["cigra"], sledeca_kal: "2024-06-01" },
];

function fallbackMerilo(instrumentTekst) {
  const key = normKljuč(instrumentTekst);
  if (!key || key === "-") return null;
  for (const row of FALLBACK_SLEdeca_KAL) {
    if (row.kljucevi.some(k => key.includes(k) || k.includes(key))) {
      return {
        naziv: instrumentTekst,
        kalibracije: [{ sledeca_kal: row.sledeca_kal }],
        _fallback: true,
      };
    }
  }
  return null;
}

/** Mapa naziv / serijski → merilo. */
export function mapaMerila(merilaList) {
  const map = new Map();
  for (const m of merilaList || []) {
    if (m.naziv) map.set(normKljuč(m.naziv), m);
    if (m.serijski_broj) map.set(normKljuč(m.serijski_broj), m);
  }
  return map;
}

export function nadjiMerilo(instrumentTekst, map) {
  const key = normKljuč(instrumentTekst);
  if (!key || key === "-") return null;
  if (map.has(key)) return map.get(key);
  for (const [k, m] of map.entries()) {
    if (key.includes(k) || k.includes(key)) return m;
  }
  return fallbackMerilo(instrumentTekst);
}

/** Da li admin dugme / blokada kalibracije važe za ovaj status. */
export function kalibracijaBlokiraUnos(status) {
  return status === "istekla" || status === "nepoznato";
}

export function upozorenjaInstrumentaZaKolone(kolone, map, upozorenjeDana = 30) {
  const out = [];
  for (const k of kolone || []) {
    if (!k || k.naziv === "-") continue;
    const inst = k.instrument;
    if (!inst || inst === "-") continue;
    const merilo = nadjiMerilo(inst, map);
    if (!merilo) continue;
    const st = statusKalibracijeMerila(merilo, upozorenjeDana);
    if (st.status === "ok") continue;
    out.push({
      pozicija: k.naziv,
      instrument: inst,
      meriloNaziv: merilo.naziv,
      meriloBroj: merilo.serijski_broj || null,
      izFallback: !!merilo._fallback,
      ...st,
    });
  }
  return out;
}

/** Prikaz instrumenta sa inventarskim brojem merila (šeta merila). */
export function tekstInstrumentaSaBrojem(instrumentTekst, map) {
  const inst = String(instrumentTekst || "").trim();
  if (!inst || inst === "-") return inst;
  const merilo = nadjiMerilo(inst, map);
  if (merilo?.serijski_broj) {
    return `${inst} · #${merilo.serijski_broj}`;
  }
  return inst;
}

export function sledecaPraznaDimenzija(kolone, potrebanBroj) {
  for (const k of kolone || []) {
    if (k.naziv === "-") continue;
    const n = k.merenja?.length || 0;
    if (n < potrebanBroj) {
      return { pozicija: k.naziv, preostalo: potrebanBroj - n, ukupno: potrebanBroj };
    }
  }
  return null;
}
