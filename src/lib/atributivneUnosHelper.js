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

function istiId(a, b) {
  if (a == null || a === "" || b == null || b === "") return false;
  return String(a) === String(b);
}

function nazivIzVeze(veza, kljucevi) {
  if (!veza) return "";
  if (typeof veza === "string") return veza.trim();
  if (typeof veza !== "object") return "";
  for (const k of kljucevi) {
    const v = String(veza[k] ?? "").trim();
    if (v) return v;
  }
  return "";
}

export function lokacijaDela(deo, linije, masine) {
  if (!deo) return { linija: "-", masina: "-" };
  const linija = (linije || []).find((l) => istiId(l.id, deo.linija_id));
  const masina = (masine || []).find((m) => istiId(m.id, deo.masina_id));
  return {
    linija: linija?.naziv || linija?.linija || deo.linija_naziv || nazivIzVeze(deo.linija, ["linija", "naziv"]) || "-",
    masina: masina?.naziv || masina?.masina || deo.masina_naziv || nazivIzVeze(deo.masina, ["naziv", "masina"]) || "-",
  };
}

export function vreme() {
  return new Date().toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" });
}

export function mozeAdminLokalno(uloga) {
  return (uloga || "kontrolor").toLowerCase().trim() === "admin";
}
