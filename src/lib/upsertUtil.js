/** Poslednji red pobedi — upsert u jednom batch-u ne sme dva puta isti conflict ključ. */
export function dedupeRowsForUpsert(rows, onConflict) {
  if (!onConflict || rows.length < 2) return rows;
  const keys = onConflict.split(",").map((k) => k.trim());
  const conflictImaPogon = keys.includes("pogon_kod");
  const out = new Map();
  for (const row of rows) {
    const parts = keys.map((key) => {
      let v = row[key];
      if (key === "pogon_kod") {
        const p = v === undefined || v === null ? "" : String(v).trim().toUpperCase();
        return p || "A";
      }
      if (v === undefined || v === null || v === "") return null;
      if (key === "id_deo" || key === "broj_naloga") v = String(v).trim().toUpperCase();
      if (key === "sifra_merenja" || key === "pozicija") v = String(v).trim();
      return v;
    });
    if (parts.some((p) => p === null)) continue;
    const normalized = { ...row };
    if (normalized.id_deo) normalized.id_deo = String(normalized.id_deo).trim().toUpperCase();
    if (normalized.broj_naloga) {
      normalized.broj_naloga = String(normalized.broj_naloga).trim().toUpperCase();
    }
    if (conflictImaPogon) {
      const p = normalized.pogon_kod === undefined || normalized.pogon_kod === null
        ? ""
        : String(normalized.pogon_kod).trim().toUpperCase();
      normalized.pogon_kod = p || "A";
    } else if ("pogon_kod" in normalized) {
      delete normalized.pogon_kod;
    }
    out.set(parts.join("\0"), normalized);
  }
  return out.size ? [...out.values()] : rows;
}
