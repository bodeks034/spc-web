/** Uvoz merenja sa digitalnih mernih uređaja (serial, Bluetooth, WiFi, paste, fajl). */

import { validirajUnos, proveriOkNok, brojPotrebnihZaKolonu } from "./varijabilneUtils.js";

const NUS_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_RX_CHAR = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

export const MERILO_BAUD = [4800, 9600, 19200, 38400, 57600, 115200];

export const MERILO_NACINI = [
  { id: "serial", label: "USB / Serial", opis: "Chrome/Edge — Web Serial API" },
  { id: "bluetooth", label: "Bluetooth", opis: "BLE UART (Mitutoyo wireless, Mahr, …)" },
  { id: "wifi", label: "WiFi HTTP", opis: "Polling lokalnog gateway URL-a" },
  { id: "wifi_ws", label: "WiFi WebSocket", opis: "ws:// stream sa merila" },
  { id: "uvoz", label: "Fajl / paste", opis: "Izvoz sa merila ili USB wedge" },
  { id: "simulacija", label: "Simulacija", opis: "Test bez merila" },
];

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
    .map((line) => parsirajOdcitavanjeMerila(line))
    .filter(Boolean);
}

/** JSON ili tekstualna linija sa merila (WiFi gateway, BLE). */
export function parsirajOdcitavanjeMerila(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  try {
    if (s.startsWith("{")) {
      const j = JSON.parse(s);
      const v = normalizujBroj(
        j.value ?? j.Value ?? j.merenje ?? j.measurement ?? j.reading ?? j.data,
      );
      if (v != null) {
        return {
          pozicija: j.position ?? j.pozicija ?? j.channel ?? null,
          vrednost: v,
        };
      }
    }
  } catch { /* nije JSON */ }
  return parsirajLinijuMerila(s);
}

function obradiBufferLinijeMerilo(buffer, onLinija) {
  const lines = buffer.split(/\r?\n/);
  const ostatak = lines.pop() || "";
  for (const line of lines) {
    const p = parsirajOdcitavanjeMerila(line);
    if (p) onLinija?.(p);
  }
  return ostatak;
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
export async function citajSerialMerilo({ onLinija, onGreska, onStatus, signal, baudRate = 9600 }) {
  if (!navigator.serial) {
    onGreska?.("Web Serial nije podržan (koristi Chrome/Edge).");
    return null;
  }
  const port = await navigator.serial.requestPort();
  await port.open({ baudRate });
  onStatus?.("serial", "Povezan USB/serial");
  const reader = port.readable.getReader();
  const dec = new TextDecoder();
  let buffer = "";

  try {
    while (!signal?.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += dec.decode(value, { stream: true });
      buffer = obradiBufferLinijeMerilo(buffer, onLinija);
    }
  } finally {
    reader.releaseLock();
    try { await port.close(); } catch { /* */ }
    onStatus?.("serial", "Prekinuto");
  }
  return port;
}

/** Bluetooth LE — Nordic UART ili SPP servis. */
export async function citajBluetoothMerilo({
  onLinija, onGreska, onStatus, signal,
}) {
  if (!navigator.bluetooth) {
    onGreska?.("Web Bluetooth nije podržan u ovom pregledaču.");
    return null;
  }
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [NUS_SERVICE, "00001101-0000-1000-8000-00805f9b34fb"],
  });
  onStatus?.("bluetooth", `Povezan: ${device.name || "BLE merilo"}`);
  const server = await device.gatt.connect();
  let buffer = "";

  const attachNotify = async (serviceUuid, charUuid) => {
    try {
      const svc = await server.getPrimaryService(serviceUuid);
      const ch = await svc.getCharacteristic(charUuid);
      await ch.startNotifications();
      ch.addEventListener("characteristicvaluechanged", (ev) => {
        const dec = new TextDecoder();
        buffer += dec.decode(ev.target.value);
        buffer = obradiBufferLinijeMerilo(buffer, onLinija);
      });
      return true;
    } catch {
      return false;
    }
  };

  const ok = await attachNotify(NUS_SERVICE, NUS_RX_CHAR);
  if (!ok) {
    onGreska?.("Uređaj nema prepoznat BLE UART — probaj USB ili WiFi gateway.");
    try { server.disconnect(); } catch { /* */ }
    return null;
  }

  await new Promise((resolve) => {
    const check = () => {
      if (signal?.aborted) {
        try { server.disconnect(); } catch { /* */ }
        onStatus?.("bluetooth", "Prekinuto");
        resolve();
        return;
      }
      setTimeout(check, 500);
    };
    signal?.addEventListener?.("abort", () => {
      try { server.disconnect(); } catch { /* */ }
      onStatus?.("bluetooth", "Prekinuto");
      resolve();
    });
    check();
  });

  return device;
}

/** WiFi — HTTP polling (lokalni gateway / REST). */
export function pokreniWifiPollingMerilo({
  url,
  intervalMs = 1200,
  onLinija,
  onGreska,
  onStatus,
  signal,
}) {
  if (!url?.trim()) {
    onGreska?.("Unesi URL (npr. http://192.168.1.50:8080/reading)");
    return () => {};
  }
  onStatus?.("wifi", `Polling ${url}`);
  let lastRaw = "";

  const tick = async () => {
    if (signal?.aborted) return;
    try {
      const res = await fetch(url.trim(), { signal, cache: "no-store" });
      const text = await res.text();
      if (text === lastRaw) return;
      lastRaw = text;
      const p = parsirajOdcitavanjeMerila(text)
        || parsirajTekstMerila(text).at(-1);
      if (p) onLinija?.(p);
    } catch (e) {
      if (e.name !== "AbortError") onGreska?.(e.message || "WiFi poll greška");
    }
  };

  tick();
  const id = setInterval(tick, intervalMs);
  signal?.addEventListener?.("abort", () => {
    clearInterval(id);
    onStatus?.("wifi", "Prekinuto");
  });
  return () => clearInterval(id);
}

/** WiFi — WebSocket stream. */
export function pokreniWifiWebSocketMerilo({
  url,
  onLinija,
  onGreska,
  onStatus,
  signal,
}) {
  if (!url?.trim()) {
    onGreska?.("Unesi WebSocket URL (ws://…)");
    return () => {};
  }
  let ws;
  try {
    ws = new WebSocket(url.trim());
  } catch (e) {
    onGreska?.(e.message);
    return () => {};
  }

  let buffer = "";
  ws.onopen = () => onStatus?.("wifi_ws", "WebSocket povezan");
  ws.onmessage = (ev) => {
    const data = typeof ev.data === "string" ? ev.data : "";
    buffer += data;
    buffer = obradiBufferLinijeMerilo(buffer, onLinija);
    if (!buffer.includes("\n")) {
      const p = parsirajOdcitavanjeMerila(data);
      if (p) onLinija?.(p);
    }
  };
  ws.onerror = () => onGreska?.("WebSocket greška");
  ws.onclose = () => onStatus?.("wifi_ws", "WebSocket zatvoren");

  signal?.addEventListener?.("abort", () => {
    try { ws.close(); } catch { /* */ }
    onStatus?.("wifi_ws", "Prekinuto");
  });

  return () => { try { ws.close(); } catch { /* */ } };
}
