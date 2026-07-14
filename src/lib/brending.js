/** Brending po firmi — env u .env / .env.production (vidi deploy/env.production.example). */

function viteEnv(key, fallback = "") {
  const vite = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : null;
  let v = vite?.[key];
  if (v == null || v === "") {
    v = typeof process !== "undefined" && process.env ? process.env[key] : undefined;
  }
  return v != null && v !== "" ? v : fallback;
}

export function getBrending() {
  const base = viteEnv("BASE_URL", "/");
  const logoEnv = viteEnv("VITE_LOGO_URL");
  const logoUrl = logoEnv === "none" || logoEnv === ""
    ? null
    : (logoEnv || `${base}tri-core-qc-logo.png`);

  const logoSymbolEnv = viteEnv("VITE_LOGO_SYMBOL_URL");
  const logoIconUrl = logoSymbolEnv === "none"
    ? null
    : (viteEnv("VITE_LOGO_ICON_URL") || `${base}tri-core-qc-icon.png`);

  const logoSymbolUrl = logoSymbolEnv === "none"
    ? null
    : (logoSymbolEnv || `${base}tri-core-qc-icon.png`);

  const email = viteEnv("VITE_RAZVOJ_EMAIL").trim();
  const tel = viteEnv("VITE_RAZVOJ_TEL").trim();
  const kontakt = viteEnv("VITE_RAZVOJ_KONTAKT").trim();

  return {
    nazivAplikacije: viteEnv("VITE_NAZIV_APLIKACIJE", "TRI-CORE QC"),
    slogan: viteEnv("VITE_SLOGAN", "Tri modula. Jedan sistem kvaliteta.").trim(),
    nazivFirme: viteEnv("VITE_NAZIV_FIRME").trim(),
    logoUrl,
    logoIconUrl,
    logoSymbolUrl,
    razvojNaziv: viteEnv("VITE_RAZVOJ_NAZIV").trim(),
    razvojAutor: viteEnv("VITE_RAZVOJ_AUTOR", "Dejan Bogdanovic").trim(),
    razvojEmail: email,
    razvojTel: tel,
    razvojKontakt: kontakt || [email, tel].filter(Boolean).join(" · "),
    verzija: viteEnv("VITE_APP_VERSION", "1.0.0"),
  };
}
