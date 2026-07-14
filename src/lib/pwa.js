/** PWA service worker + vibracija za liniju. */
export function registrujPWA() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
  if ("vibrate" in navigator) {
    window._vibrirajNOK = () => navigator.vibrate([100, 50, 100]);
    window._vibrirajOK = () => navigator.vibrate([50]);
  }
}
