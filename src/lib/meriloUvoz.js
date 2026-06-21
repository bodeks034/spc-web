/** Uvoz merenja sa digitalnih mernih uređaja (serial, paste, fajl). */

import { validirajUnos, proveriOkNok, brojPotrebnihZaKolonu } from "./varijabilneUtils.js";

/** Iz jedne linije izvuci numeričku vrednost (Mitutoyo, generički CSV). */
export function parsirajLinijuMerila(line) {
  const s = String(line || "").trim();
  if (!s) return null;

  // Mitutoyo: pozicija,vrednost ili samo broj
  const csv = s.match(/^([^,;|\t]+)[,;|\t]\s*(-?\d+[.,]?\d*)/);
  if (csv) {
    const v = normalizujBroj(csv[2]);
    if (v != null) return { pozicija: csv[1].trim(), vrednost: v };
  }

  // Samo broj (često serial wedge)
  const num = s.match(/(-?\d+[.,]\d+|-?\d+)/);
  if (num) {
    const v = normalizujBroj(num[1]);
    if (v != null) return { pozicija: null, vrednost: v };
  }
  return null;
}

function normalizujBroj(s) {
  const t = String(s).trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return t;
}

export function parsirajTekstMerila(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map(parsirajLinijuMerila)
    .filter(Boolean);
}

export function indeksSledecePrazno(kolone, potrebanBroj, odKolone = 0) {
  const n = kolone.length;
  const podrazumevano = potrebanBroj || 5;
  for (let off = 0; off < n; off++) {
    const i = (odKolone + off) % n;
    const k = kolone[i];
    if (!k || k.naziv === "-") continue;
    const potrebno = brojPotrebnihZaKolonu(k, podrazumevano);
    if ((k.merenja?.length || 0) < potrebno) return i;
  }
  return -1;
}

/**
 * Dodaje jednu vrednost u kolonu (ista logika kao ručni unos).
 */
export function dodajMerenjeUKolonu(kolone, colIdx, rawVrednost, potrebanBroj) {
  const k = kolone[colIdx];
  if (!k || k.naziv === "-") return { kolone, greska: "Nepoznata kolona" };
  const potrebno = brojPotrebnihZaKolonu(k, potrebanBroj);
  if (k.merenja.length >= potrebno) return { kolone, greska: `Kolona ${k.naziv} je puna` };

  const val = validirajUnos(rawVrednost, k.jedinica, {
    lslDec: k.lslDec,
    uslDec: k.uslDec,
    nominalDec: k.nominalDec,
  });
  if (!val.ok) return { kolone, greska: val.poruka || "Neispravna vrednost" };

  const status = proveriOkNok(val.vrednost, k.lslDec, k.uslDec, k.jedinica);
  const next = [...kolone];
  const col = { ...next[colIdx] };
  col.merenja = [...col.merenja, { raw: val.vrednost, dec: val.dec }];
  if (status === "OK") col.cntOK += 1;
  else col.cntNOK += 1;
  col.input = "";
  col.ukupnoLabel = `${col.merenja.length} / ${potrebno}`;
  next[colIdx] = col;
  return { kolone: next, status, kolona: col.naziv };
}

/** Uvoz liste vrednosti — redom u kolone (po jedna vrednost po sledećoj praznoj ćeliji). */
export function uvozListeUKolone(kolone, vrednosti, potrebanBroj, startColIdx = 0) {
  let k = [...kolone];
  let col = startColIdx >= 0 ? startColIdx : 0;
  const uneto = [];
  const greske = [];

  for (const item of vrednosti) {
    const raw = typeof item === "string" ? item : item.vrednost;
    const idx = item.pozicija
      ? k.findIndex(c => c.naziv !== "-" && String(c.naziv).toLowerCase() === String(item.pozicija).toLowerCase())
      : indeksSledecePrazno(k, potrebanBroj, col);

    if (idx < 0) {
      greske.push(`Nema mesta: ${raw}`);
      break;
    }
    const res = dodajMerenjeUKolonu(k, idx, raw, potrebanBroj);
    if (res.greska) {
      greske.push(res.greska);
      continue;
    }
    k = res.kolone;
    uneto.push({ kolona: res.kolona, vrednost: raw, status: res.status });
    col = idx + 1;
  }

  return { kolone: k, uneto, greske };
}

/** Web Serial — čitanje linija završenih Enter ili LF. */
export async function citajSerialMerilo({ onLinija, onGreska, signal, baudRate = 9600 }) {
  if (!navigator.serial) {
    onGreska?.("Web Serial nije podržan (koristi Chrome/Edge).");
    return null;
  }
  const port = await navigator.serial.requestPort();
  await port.open({ baudRate });
  const reader = port.readable.getReader();
  const dec = new TextDecoder();
  let buffer = "";

  try {
    while (!signal?.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += dec.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) {
        const p = parsirajLinijuMerila(line);
        if (p) onLinija?.(p);
      }
    }
  } finally {
    reader.releaseLock();
    try { await port.close(); } catch { /* */ }
  }
  return port;
}
