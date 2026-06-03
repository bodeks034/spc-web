-- RLS za kontrolnu listu + brzi seed ako CSV nije uvezen

ALTER TABLE kontrolna_lista_stavke ENABLE ROW LEVEL SECURITY;
ALTER TABLE kontrolna_lista_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_stavke" ON kontrolna_lista_stavke
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "auth_read_lista_log" ON kontrolna_lista_log
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "auth_insert_lista_log" ON kontrolna_lista_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

INSERT INTO kontrolna_lista_stavke (id, kategorija, stavka, redosled, aktivna) VALUES
  (1, 'BEZBEDNOST', 'Proverena lična zaštitna oprema (rukavice, naočari, obuća)', 1, true),
  (2, 'BEZBEDNOST', 'Radno mesto je čisto i bez prepreka', 2, true),
  (3, 'OPREMA', 'Mašina/alat je ispravan i spreman za rad', 3, true),
  (4, 'OPREMA', 'Merila su dostupna i kalibrisana', 4, true),
  (5, 'DOKUMENTACIJA', 'Radni nalog i crtež dela su dostupni', 5, true),
  (6, 'DOKUMENTACIJA', 'SOP / uputstvo za kontrolu je pročitano', 6, true),
  (7, 'MATERIJAL', 'Materijal i delovi odgovaraju radnom nalogu', 7, true),
  (8, 'KVALITET', 'Prethodna smena ostavila napomenu — provereno', 8, true)
ON CONFLICT (id) DO UPDATE SET
  kategorija = EXCLUDED.kategorija,
  stavka = EXCLUDED.stavka,
  redosled = EXCLUDED.redosled,
  aktivna = EXCLUDED.aktivna;

NOTIFY pgrst, 'reload schema';
