/** PWA service worker + vibracija za liniju + update baner. */

const UPDATE_EVENT = "spc-sw-update";

export function registrujPWA() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      const javiUpdate = () => {
        try {
          window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: { registration: reg } }));
        } catch { /* */ }
      };
      if (reg.waiting) javiUpdate();
      reg.addEventListener("updatefound", () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            javiUpdate();
          }
        });
      });
      // Periodična provera nove verzije (tableti ostaju dugo otvoreni).
      setInterval(() => { reg.update().catch(() => {}); }, 30 * 60 * 1000);
    }).catch(() => {});
  }
  if ("vibrate" in navigator) {
    window._vibrirajNOK = () => navigator.vibrate([100, 50, 100]);
    window._vibrirajOK = () => navigator.vibrate([50]);
  }
}

export function pretplatiSwUpdate(fn) {
  const handler = (e) => fn(e.detail);
  window.addEventListener(UPDATE_EVENT, handler);
  return () => window.removeEventListener(UPDATE_EVENT, handler);
}

/** Aktivira waiting SW i reload — korisnik eksplicitno potvrđuje. */
export function primeniSwUpdate(registration) {
  const w = registration?.waiting;
  if (!w) {
    window.location.reload();
    return;
  }
  w.postMessage({ type: "SKIP_WAITING" });
  const onController = () => {
    navigator.serviceWorker.removeEventListener("controllerchange", onController);
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener("controllerchange", onController);
  // Fallback ako controllerchange ne stigne.
  setTimeout(() => window.location.reload(), 1500);
}
