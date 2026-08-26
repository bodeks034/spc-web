/**
 * Putanje foldera za tehničke crteže po liniji (VOZ-XX / PRO-XX).
 * Disk: public/sifrarnik/linije/{vozila|proizvodi}/{KOD}/
 */

import { jeLinijaProizvod, jeLinijaVozila, normalizujKodLinije } from "./linijaProizvoda.js";

export const LINIJE_CRTEZI_REL = "public/sifrarnik/linije";

/** Podfolderi unutar svake linije. */
export const LINIJA_PODFOLDERI = ["tehnicki", "dijagram", "sop"];

/** Podrazumevani starter kodovi (migracija 87). */
export function podrazumevaneLinije() {
  const vozila = Array.from({ length: 10 }, (_, i) => `VOZ-${String(i + 1).padStart(2, "0")}`);
  const proizvodi = Array.from({ length: 10 }, (_, i) => `PRO-${String(i + 1).padStart(2, "0")}`);
  return { vozila, proizvodi };
}

/** @param {string} kod */
export function kategorijaLinijeFoldera(kod) {
  const k = normalizujKodLinije(kod);
  if (jeLinijaVozila(k)) return "vozila";
  if (jeLinijaProizvod(k)) return "proizvodi";
  return null;
}

/** Relativna putanja od korena repoa: public/sifrarnik/linije/vozila/VOZ-01 */
export function putanjaLinijeRel(kod) {
  const k = normalizujKodLinije(kod);
  const kat = kategorijaLinijeFoldera(k);
  if (!kat) return null;
  return `${LINIJE_CRTEZI_REL}/${kat}/${k}`;
}

/** Web putanja za statičke fajlove: /sifrarnik/linije/vozila/VOZ-01/tehnicki/crt.pdf */
export function putanjaLinijeWeb(kod, podfolder = "", fajl = "") {
  const rel = putanjaLinijeRel(kod);
  if (!rel) return null;
  const base = `/${rel.replace(/^public\//, "")}`;
  if (!podfolder && !fajl) return base;
  const parts = [base.replace(/\/$/, "")];
  if (podfolder) parts.push(podfolder.replace(/^\/+|\/+$/g, ""));
  if (fajl) parts.push(fajl.replace(/^\/+/, ""));
  return parts.join("/");
}

/** @param {string} repoRoot @param {string} kod */
export function putanjaLinijeAbs(repoRoot, kod) {
  const rel = putanjaLinijeRel(kod);
  if (!rel) return null;
  const root = String(repoRoot).replace(/\\/g, "/").replace(/\/$/, "");
  return `${root}/${rel}`;
}

/** @param {Array<{ kod?: string }>} tipovi */
export function kodoviLinijaIzTipova(tipovi) {
  const set = new Set();
  for (const t of tipovi || []) {
    const k = normalizujKodLinije(t.kod);
    if (jeLinijaVozila(k) || jeLinijaProizvod(k)) set.add(k);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function citajMeLinija(kod, naziv = "") {
  const k = normalizujKodLinije(kod);
  const jeVoz = jeLinijaVozila(k);
  const naslov = naziv || k;
  const dijagramRed = jeVoz
    ? `Silueta vozila za finalnu kontrolu (PNG/SVG bez zona K/M/T). U Tipovima vozila upiši npr. \`/sifrarnik/linije/vozila/${k}/dijagram/silueta.png\`.`
    : "Opciono: shema proizvoda / fotografija (nema dijagram sa zonama).";
  return `# ${k} — ${naslov}

Folder za **${jeVoz ? "vozilo" : "proizvod"}** \`${k}\`. Naziv linije menjaš u Modul 0 → Tipovi vozila (polje Naziv).

## Podfolderi

| Folder | Šta stavljaš |
|--------|----------------|
| \`tehnicki/\` | Tehnički crteži delova i sklopova (PDF, PNG, DWG…). Referenca za inženjere. |
| \`dijagram/\` | ${dijagramRed} |
| \`sop/\` | SOP slike za operatere (može i u Storage \`atributivne/\`). |

## Veza sa šifrarnikom

- **Kod linije** \`${k}\` = \`vozilo_katalog_id\` na delovima + ERP šifra u Glavnom unosu.
- **GU sheet:** \`${k.toLowerCase()}_delovi\` (komponente), \`${k.toLowerCase()}_final\` (finalna kontrola).
- Crtež pojedinačnog dela u aplikaciji: Modul 0 → Crtež dela (\`slika_naziv\` + Storage).

## Novi folderi

Kad dodaš \`VOZ-11\` / \`PRO-11\` u Tipove vozila, pokreni:

\`\`\`bash
npm run sync:linije-crtezi
\`\`\`

Detaljno uputstvo: \`docs/obuka-paket/UPUTSTVO_LINIJE_VOZ_PRO.md\`
`;
}

export function citajMeKoren() {
  return `# Linije proizvoda — crteži na disku

\`public/sifrarnik/linije/\` — po jedan folder za svaku privremenu liniju:

| Grana | Kod | Primer |
|-------|-----|--------|
| \`vozila/\` | \`VOZ-01\` … | Delovi i final vozila |
| \`proizvodi/\` | \`PRO-01\` … | Samostalni proizvodi (ne u vozilu) |

**Automatsko kreiranje foldera:** \`npm run sync:linije-crtezi\` (čita \`tipovi_vozila\` iz baze + starter VOZ/PRO 01–10).

Uputstvo: [UPUTSTVO_LINIJE_VOZ_PRO.md](../../docs/obuka-paket/UPUTSTVO_LINIJE_VOZ_PRO.md)
`;
}
