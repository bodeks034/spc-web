/** Privremeno sakrivanje „Nastavi checklist“ bannera (do kraja sesije). */

export const BANNER_DISMISS_KEY = "spc_sifrarnik_nastavi_dismiss";

export function bannerDismissed() {
  try {
    return sessionStorage.getItem(BANNER_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissNastaviBanner() {
  try {
    sessionStorage.setItem(BANNER_DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function resetNastaviBannerDismiss() {
  try {
    sessionStorage.removeItem(BANNER_DISMISS_KEY);
  } catch {
    /* ignore */
  }
}
