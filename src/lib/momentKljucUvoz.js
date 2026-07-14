/**
 * Automatski upis sa digitalnog momentnog ključa — USB/serial, Bluetooth, WiFi, fajl.
 */

const NUS_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_RX_CHAR = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

function normalizujBroj(s) {
  if (s == null || s === "") return null;
  const t = String(s).trim().replace(",", ".").replace(/[^\d.-]/g, "");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function rezultatIzTeksta(s) {
  const u = String(s || "").toUpperCase();
  if (u.includes("NOK") || u.includes("FAIL") || u.includes("LO") || u === "0") return "NOK";
  if (u.includes("OK") || u.includes("PASS") || u.includes("HI") || u === "1") return "OK";
  return null;
}

/** Parsiraj jednu liniju / JSON / CSV sa ključa. */
export function parsirajOdcitavanjeMomentKljuca(raw, vendorProfil = "generic") {
  const s = String(raw || "").trim();
  if (!s) return null;

  try {
    if (s.startsWith("{")) {
      const j = JSON.parse(s);
      const nm = normalizujBroj(j.torque ?? j.Torque ?? j.nm ?? j.Nm ?? j.value ?? j.ostvareno_nm);
      const ugao = normalizujBroj(j.angle ?? j.Angle ?? j.ugao ?? j.ugao_cilj);
      if (nm != null) {
        return {
          nm,
          ugao,
          status: rezultatIzTeksta(j.status ?? j.result ?? j.Result) || undefined,
          raw: s,
          vendor: vendorProfil,
        };
      }
    }
  } catch { /* nije JSON */ }

  const csv = s.split(/[,;|\t]/).map((x) => x.trim());
  if (csv.length >= 2) {
    const nm = normalizujBroj(csv.find((c) => /nm|torque|t$/i.test(c)) || csv[0]);
    const ugaoHit = csv.find((c) => /angle|ugao|a$/i.test(c));
    const ugao = ugaoHit ? normalizujBroj(ugaoHit) : normalizujBroj(csv[1]);
    const nmDirect = normalizujBroj(csv[0]);
    const finalNm = nm ?? nmDirect;
    if (finalNm != null) {
      return {
        nm: finalNm,
        ugao: csv.length > 2 ? normalizujBroj(csv[1]) : ugao,
        status: rezultatIzTeksta(csv[csv.length - 1]),
        raw: s,
        vendor: vendorProfil,
      };
    }
  }

  const paterni = [
    /TORQUE[=:\s]+(-?\d+[.,]?\d*)/i,
    /T[=:\s]+(-?\d+[.,]?\d*)\s*NM/i,
    /NM[=:\s]+(-?\d+[.,]?\d*)/i,
    /(-?\d+[.,]\d+)\s*NM/i,
    /(-?\d+[.,]\d+)/,
    /(-?\d+)/,
  ];
  let nm = null;
  for (const p of paterni) {
    const m = s.match(p);
    if (m) {
      nm = normalizujBroj(m[1]);
      if (nm != null) break;
    }
  }
  if (nm == null) return null;

  const ugaoM = s.match(/ANGLE[=:\s]+(-?\d+[.,]?\d*)|A[=:\s]+(-?\d+[.,]?\d*)\s*°?/i);
  const ugao = ugaoM ? normalizujBroj(ugaoM[1] || ugaoM[2]) : null;

  return {
    nm,
    ugao,
    status: rezultatIzTeksta(s),
    raw: s,
    vendor: vendorProfil,
  };
}

export function parsirajTekstMomentKljuca(text, vendorProfil) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => parsirajOdcitavanjeMomentKljuca(line, vendorProfil))
    .filter(Boolean);
}

function obradiBufferLinije(buffer, onOdcitavanje, vendorProfil) {
  const lines = buffer.split(/\r?\n/);
  const ostatak = lines.pop() || "";
  for (const line of lines) {
    const p = parsirajOdcitavanjeMomentKljuca(line, vendorProfil);
    if (p) onOdcitavanje?.(p);
  }
  return ostatak;
}

/** USB / RS232 — Web Serial API. */
export async function citajSerialMomentKljuc({
  onOdcitavanje,
  onGreska,
  onStatus,
  signal,
  baudRate = 9600,
  vendorProfil = "generic",
}) {
  if (!navigator.serial) {
    onGreska?.("Web Serial nije podržan — koristi Chrome/Edge na HTTPS ili localhost.");
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
      buffer = obradiBufferLinije(buffer, onOdcitavanje, vendorProfil);
    }
  } finally {
    reader.releaseLock();
    try { await port.close(); } catch { /* */ }
    onStatus?.("serial", "Prekinuto");
  }
  return port;
}

/** Bluetooth LE — Nordic UART ili generički notify karakteristika. */
export async function citajBluetoothMomentKljuc({
  onOdcitavanje,
  onGreska,
  onStatus,
  signal,
  vendorProfil = "generic",
}) {
  if (!navigator.bluetooth) {
    onGreska?.("Web Bluetooth nije podržan u ovom pregledaču.");
    return null;
  }
  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [NUS_SERVICE, "00001101-0000-1000-8000-00805f9b34fb"],
  });
  onStatus?.("bluetooth", `Povezan: ${device.name || "BLE uređaj"}`);
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
        buffer = obradiBufferLinije(buffer, onOdcitavanje, vendorProfil);
      });
      return true;
    } catch {
      return false;
    }
  };

  const ok = await attachNotify(NUS_SERVICE, NUS_RX_CHAR);
  if (!ok) {
    onGreska?.("Uređaj nema prepoznat BLE UART servis — probaj USB ili WiFi gateway.");
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

/** WiFi — HTTP polling (lokalni gateway / REST na ključu). */
export function pokreniWifiPollingMomentKljuc({
  url,
  intervalMs = 1500,
  onOdcitavanje,
  onGreska,
  onStatus,
  signal,
  vendorProfil = "generic",
}) {
  if (!url?.trim()) {
    onGreska?.("Unesi URL (npr. http://192.168.1.50:8080/torque)");
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
      const p = parsirajOdcitavanjeMomentKljuca(text, vendorProfil)
        || parsirajTekstMomentKljuca(text, vendorProfil).at(-1);
      if (p) onOdcitavanje?.(p);
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
export function pokreniWifiWebSocketMomentKljuc({
  url,
  onOdcitavanje,
  onGreska,
  onStatus,
  signal,
  vendorProfil = "generic",
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

  ws.onopen = () => onStatus?.("wifi_ws", "WebSocket povezan");
  ws.onmessage = (ev) => {
    const p = parsirajOdcitavanjeMomentKljuca(ev.data, vendorProfil);
    if (p) onOdcitavanje?.(p);
  };
  ws.onerror = () => onGreska?.("WebSocket greška");
  ws.onclose = () => onStatus?.("wifi_ws", "WebSocket zatvoren");

  signal?.addEventListener?.("abort", () => {
    try { ws.close(); } catch { /* */ }
    onStatus?.("wifi_ws", "Prekinuto");
  });

  return () => { try { ws.close(); } catch { /* */ } };
}

export const MOMENT_KLJUC_BAUD = [4800, 9600, 19200, 38400, 57600, 115200];

export const MOMENT_KLJUC_NACINI = [
  { id: "serial", label: "USB / Serial", opis: "Chrome/Edge — Web Serial API" },
  { id: "bluetooth", label: "Bluetooth", opis: "BLE UART (Atlas, Bosch, …)" },
  { id: "wifi", label: "WiFi HTTP", opis: "Polling lokalnog gateway URL-a" },
  { id: "wifi_ws", label: "WiFi WebSocket", opis: "ws:// stream sa alata" },
  { id: "uvoz", label: "Fajl / paste", opis: "Izvoz sa ključa u moment-drop" },
  { id: "simulacija", label: "Simulacija", opis: "Test bez alata" },
];
