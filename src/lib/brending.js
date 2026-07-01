/** Brending po firmi — env u .env / .env.production (vidi deploy/env.production.example). */

export function getBrending() {
  const base = import.meta.env.BASE_URL || "/";
  const logoEnv = import.meta.env.VITE_LOGO_URL;
  const logoUrl = logoEnv === "none" || logoEnv === ""
    ? null
    : (logoEnv || `${base}tri-core-qc-logo.png`);

  const logoSymbolEnv = import.meta.env.VITE_LOGO_SYMBOL_URL;
  const logoIconUrl = logoSymbolEnv === "none"
    ? null
    : (import.meta.env.VITE_LOGO_ICON_URL || `${base}tri-core-qc-icon.png`);

  const logoSymbolUrl = logoSymbolEnv === "none"
    ? null
    : (logoSymbolEnv || `${base}tri-core-qc-icon.png`);

  const email = (import.meta.env.VITE_RAZVOJ_EMAIL || "").trim();
  const tel = (import.meta.env.VITE_RAZVOJ_TEL || "").trim();
  const kontakt = (import.meta.env.VITE_RAZVOJ_KONTAKT || "").trim();

  return {
    nazivAplikacije: import.meta.env.VITE_NAZIV_APLIKACIJE || "TRI-CORE QC",
    slogan: (import.meta.env.VITE_SLOGAN || "Tri modula. Jedan sistem kvaliteta.").trim(),
    nazivFirme: (import.meta.env.VITE_NAZIV_FIRME || "").trim(),
    logoUrl,
    logoIconUrl,
    logoSymbolUrl,
    razvojNaziv: (import.meta.env.VITE_RAZVOJ_NAZIV || "").trim(),
    razvojAutor: (import.meta.env.VITE_RAZVOJ_AUTOR || "Dejan Bogdanovic").trim(),
    razvojEmail: email,
    razvojTel: tel,
    razvojKontakt: kontakt || [email, tel].filter(Boolean).join(" · "),
    verzija: import.meta.env.VITE_APP_VERSION || "1.0.0",
  };
}
