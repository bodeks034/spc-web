/** Trenutni korisnik za audit log (postavlja SifrarnikHub). */

let trenutni = null;

export function setSifrarnikAuditKorisnik(korisnik) {
  if (!korisnik) {
    trenutni = null;
    return;
  }
  trenutni = String(korisnik.email || korisnik.ime || korisnik.uloga || "").trim() || null;
}

export function getSifrarnikAuditKorisnik() {
  return trenutni;
}
