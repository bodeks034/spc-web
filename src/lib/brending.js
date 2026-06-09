/** Brending po firmi — env u .env / .env.production (vidi deploy/env.production.example). */

export function getBrending() {
  const base = import.meta.env.BASE_URL || "/";
  const logoEnv = import.meta.env.VITE_LOGO_URL;
  const logoUrl = logoEnv === "none" || logoEnv === ""
    ? null
    : (logoEnv || `${base}logo-firme.png`);

  const email = (import.meta.env.VITE_RAZVOJ_EMAIL || "").trim();
  const tel = (import.meta.env.VITE_RAZVOJ_TEL || "").trim();
  const kontakt = (import.meta.env.VITE_RAZVOJ_KONTAKT || "").trim();

  return {
    nazivAplikacije: import.meta.env.VITE_NAZIV_APLIKACIJE || "SPC Kontrola kvaliteta",
    nazivFirme: (import.meta.env.VITE_NAZIV_FIRME || "").trim(),
    logoUrl,
    razvojNaziv: (import.meta.env.VITE_RAZVOJ_NAZIV || "SPC razvoj").trim(),
    razvojAutor: (import.meta.env.VITE_RAZVOJ_AUTOR || "").trim(),
    razvojEmail: email,
    razvojTel: tel,
    razvojKontakt: kontakt || [email, tel].filter(Boolean).join(" · "),
    verzija: import.meta.env.VITE_APP_VERSION || "1.0.0",
  };
}
