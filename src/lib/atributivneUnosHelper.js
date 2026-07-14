/** Zajednički pomoćnici za atributivni unos (GlavnaForma i mobilni modul). */

export function ocistiRedZaInsert(row) {
  const { id, created_at, ...rest } = row;
  return rest;
}

export function dISO() {
  return new Date().toISOString().split("T")[0];
}

export function dPrikaz() {
  return new Date().toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function lokacijaDela(deo, linije, masine) {
  if (!deo) return { linija: "-", masina: "-" };
  const linija = linije.find((l) => l.id === deo.linija_id);
  const masina = masine.find((m) => m.id === deo.masina_id);
  return {
    linija: linija?.naziv || deo.linija_naziv || "-",
    masina: masina?.naziv || deo.masina_naziv || "-",
  };
}

export function vreme() {
  return new Date().toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" });
}

export function mozeAdminLokalno(uloga) {
  return (uloga || "kontrolor").toLowerCase().trim() === "admin";
}
