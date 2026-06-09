/**
 * Javni Ed25519 ključ za verifikaciju license.json (Sloj A).
 * Generiši novi par: node scripts/generisi-par-licence.mjs
 * Posle zamene ključa ažuriraj ovaj fajl sadržajem license-keys/public.pem
 * (samo telo između BEGIN/END, u jednom stringu).
 */
export const LICENCA_PUBLIC_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAplaceholderZameniPosleGenerisanjaParKljučeva0000000=
-----END PUBLIC KEY-----`;
