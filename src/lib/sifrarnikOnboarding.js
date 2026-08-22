/** Onboarding mod Modula 0 — sakrivanje tabova dok korisnik ne objavi prvi deo. */

export const ONBOARDING_KEY = "spc_sifrarnik_onboarding_off";
export const ONBOARDING_EVENT = "sifrarnik-onboarding-off";

export function onboardingIskljucen() {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "1";
  } catch {
    return false;
  }
}

export function zavrsiSifrarnikOnboarding() {
  try {
    localStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ONBOARDING_EVENT));
  }
}
