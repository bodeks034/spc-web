export const QUICKSTART_SESSION_KEY = "spc_sifrarnik_quickstart_off";
export const QUICKSTART_PERM_KEY = "spc_sifrarnik_quickstart_perm_off";

export function quickStartTrajnoIskljucen() {
  try {
    return localStorage.getItem(QUICKSTART_PERM_KEY) === "1";
  } catch {
    return false;
  }
}

export function quickStartSakrivenSesija() {
  try {
    return sessionStorage.getItem(QUICKSTART_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function sakrijQuickStartSesija() {
  try {
    sessionStorage.setItem(QUICKSTART_SESSION_KEY, "1");
  } catch { /* ignore */ }
}

export function iskljuciQuickStartTrajno() {
  try {
    localStorage.setItem(QUICKSTART_PERM_KEY, "1");
    sessionStorage.setItem(QUICKSTART_SESSION_KEY, "1");
  } catch { /* ignore */ }
}

export function ukljuciQuickStartPonovo() {
  try {
    localStorage.removeItem(QUICKSTART_PERM_KEY);
    sessionStorage.removeItem(QUICKSTART_SESSION_KEY);
  } catch { /* ignore */ }
}
