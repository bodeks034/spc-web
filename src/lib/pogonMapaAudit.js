/** Audit pogon_linija_mapa pre go-live. */

export const PREPORUCENI_POGONI = ["A", "B", "C", "D", "E", "F", "G", "H"];

const FAZE_A_F = [
  { pogon: "A", naziv: "Ulazna kontrola" },
  { pogon: "B", naziv: "Preseraj" },
  { pogon: "C", naziv: "Karoserija" },
  { pogon: "D", naziv: "Lakirnica" },
  { pogon: "E", naziv: "Montaža" },
  { pogon: "F", naziv: "Završna" },
];

/**
 * @param {Array<{ pogon_kod?: string, linija_faza?: string }>} lista
 */
export function auditPogonMapa(lista) {
  const rows = lista || [];
  const byPogon = new Map();
  for (const r of rows) {
    const p = String(r.pogon_kod || "").trim().toUpperCase();
    if (p) byPogon.set(p, r.linija_faza);
  }

  const nedostaju = FAZE_A_F.filter(({ pogon }) => !byPogon.has(pogon));
  const dupliPogon = [];
  const seen = new Map();
  for (const r of rows) {
    const p = String(r.pogon_kod || "").trim().toUpperCase();
    if (!p) continue;
    seen.set(p, (seen.get(p) || 0) + 1);
  }
  for (const [p, n] of seen) {
    if (n > 1) dupliPogon.push(p);
  }

  const upozorenja = [];
  if (nedostaju.length) {
    upozorenja.push(`Nedostaju pogoni: ${nedostaju.map((x) => `${x.pogon} (${x.naziv})`).join(", ")}.`);
  }
  if (dupliPogon.length) {
    upozorenja.push(`Dupli pogon_kod: ${dupliPogon.join(", ")}.`);
  }
  if (!rows.length) {
    upozorenja.push("Mapa je prazna — unesi bar Ulaznu (A) i Završnu (F).");
  }

  return {
    ok: upozorenja.length === 0,
    brojRedova: rows.length,
    mapiraniPogoni: [...byPogon.keys()].sort(),
    nedostaju,
    upozorenja,
  };
}
