import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REAKCIONI_KANON,
  REAKCIONI_UKLONITI,
  JEDINICE_KANON,
  filtrirajKarakteristikeBezBrojeva,
  karakteristikaImaBroj,
} from "../src/lib/sifrarnikListeKanoni.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, "../src/data/sifrarnikListeSeed.json");
const raw = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const esc = (s) => String(s).replace(/'/g, "''");

const seed = {
  ...raw,
  jedinica: JEDINICE_KANON,
  reakcioni_plan: REAKCIONI_KANON,
  karakteristika: filtrirajKarakteristikeBezBrojeva(raw.karakteristika),
};
fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);

let sql = `-- Šifrarnik liste vrednosti (dropdown)
-- Pokreni u Supabase SQL Editoru

CREATE TABLE IF NOT EXISTS sifrarnik_liste_vrednosti (
  id          BIGSERIAL PRIMARY KEY,
  lista_kljuc TEXT NOT NULL,
  vrednost    TEXT NOT NULL,
  redosled    INT NOT NULL DEFAULT 0,
  aktivna     BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lista_kljuc, vrednost)
);

CREATE INDEX IF NOT EXISTS idx_sifrarnik_liste_kljuc ON sifrarnik_liste_vrednosti(lista_kljuc, redosled);

ALTER TABLE sifrarnik_liste_vrednosti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS auth_sifrarnik_liste ON sifrarnik_liste_vrednosti;
CREATE POLICY auth_sifrarnik_liste ON sifrarnik_liste_vrednosti
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Stari pogrešni reakcioni planovi
`;

for (const v of REAKCIONI_UKLONITI) {
  sql += `DELETE FROM sifrarnik_liste_vrednosti WHERE lista_kljuc = 'reakcioni_plan' AND vrednost = '${esc(v)}';\n`;
}

sql += `
-- Karakteristike sa brojevima / Ø (ne u dropdown-u)
DELETE FROM sifrarnik_liste_vrednosti
WHERE lista_kljuc = 'karakteristika'
  AND (vrednost ~ '[0-9]' OR vrednost LIKE '%Ø%');

`;

const lists = {
  reakcioni_plan: REAKCIONI_KANON,
  karakteristika: seed.karakteristika,
  instrument: seed.instrument,
  jedinica: JEDINICE_KANON,
};

for (const [kljuc, vals] of Object.entries(lists)) {
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (kljuc === "karakteristika" && karakteristikaImaBroj(v)) continue;
    sql += `INSERT INTO sifrarnik_liste_vrednosti (lista_kljuc, vrednost, redosled) VALUES ('${kljuc}', '${esc(v)}', ${i + 1}) ON CONFLICT (lista_kljuc, vrednost) DO UPDATE SET redosled = EXCLUDED.redosled, aktivna = TRUE;\n`;
  }
}

sql += "\nNOTIFY pgrst, 'reload schema';\n";
fs.writeFileSync(path.join(__dirname, "../41_sifrarnik_liste.sql"), sql);
console.log("OK", { karakteristika: seed.karakteristika.length });
