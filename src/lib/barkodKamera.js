/** Izbor kamere — zadnja na telefonu/tabletu, veb kamera na laptopu/desktopu. */
export function izaberiKameru(cameras, { mobilni = false, laptop = false } = {}) {
  if (!cameras?.length) return null;

  if (mobilni) {
    const zadnja = cameras.find((c) =>
      /back|rear|environment|zadnj|trás|arrière|wide/i.test(c.label || ""),
    );
    if (zadnja) return zadnja.id;
    if (cameras.length > 1) return cameras[cameras.length - 1].id;
  }

  if (laptop && cameras.length > 1) {
    const hd = cameras.find((c) =>
      /hd|1080|720|integrated|built.?in|facetime/i.test(c.label || ""),
    );
    if (hd) return hd.id;
  }

  return cameras[0].id;
}

/**
 * Konfig skenera.
 * Laptop: ceo kadar (bez qrbox) + veća rezolucija — Code 128 je horizontalan i težak u malom okviru.
 */
export function konfigSkeniranja({ laptop = false, deviceId = null } = {}) {
  const osnovno = {
    fps: laptop ? 20 : 10,
    aspectRatio: 1.777,
    disableFlip: false,
  };

  if (laptop) {
    return {
      ...osnovno,
      videoConstraints: {
        ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }),
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
      },
    };
  }

  return {
    ...osnovno,
    qrbox: (w, h) => ({
      width: Math.min(Math.floor(w * 0.88), 340),
      height: Math.min(Math.floor(h * 0.38), 160),
    }),
  };
}

/** Da li je uređaj laptop/desktop (nije telefon/tablet layout). */
export function jeLaptopKamera(ekran) {
  return ekran && !ekran.mob && !ekran.tablet;
}
