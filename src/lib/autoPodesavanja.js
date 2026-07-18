/**
 * Uključivanje auto-pravila (app_podesavanja ključevi auto_pravilo_*).
 */

export const AUTO_PRAVILO_KLJUCEVI = {
  nok3: "auto_pravilo_nok3",
  spc_ncr: "auto_pravilo_spc_ncr",
  ncr_zatvori: "auto_pravilo_ncr_zatvori",
  ncr_8d_draft: "auto_pravilo_ncr_8d_draft",
  podsetnici: "auto_pravilo_podsetnici",
  digest: "auto_pravilo_digest",
  weekly: "auto_pravilo_weekly",
  health: "auto_pravilo_health",
  erp: "auto_pravilo_erp",
  erp_izvoz: "auto_pravilo_erp_izvoz",
  erp_cleanup: "auto_pravilo_erp_cleanup",
  push_kriticno: "auto_pravilo_push",
};

export const AUTO_PRAVILO_DEFAULTS = Object.fromEntries(
  Object.values(AUTO_PRAVILO_KLJUCEVI).map((k) => [k, "1"]),
);

export function jeAutoPraviloUkljuceno(settings, kljuc) {
  const key = AUTO_PRAVILO_KLJUCEVI[kljuc] || kljuc;
  const v = settings?.[key];
  if (v === undefined || v === null || v === "") return true;
  return String(v) !== "0";
}

export function spojiAutoPodesavanja(settings = {}) {
  return { ...AUTO_PRAVILO_DEFAULTS, ...settings };
}
