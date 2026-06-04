-- ============================================================
-- Fix: duplicate key na merenja_varijabilna_pkey posle CSV/demo uvoza
-- Pokreni u Supabase SQL Editoru (jednom, posle seed ili import-a sa id kolonom)
-- ============================================================

SELECT setval(
  pg_get_serial_sequence('karakteristike_merljive', 'id'),
  COALESCE((SELECT MAX(id) FROM karakteristike_merljive), 1),
  (SELECT COUNT(*) > 0 FROM karakteristike_merljive)
);

SELECT setval(
  pg_get_serial_sequence('merenja_varijabilna', 'id'),
  COALESCE((SELECT MAX(id) FROM merenja_varijabilna), 1),
  (SELECT COUNT(*) > 0 FROM merenja_varijabilna)
);

NOTIFY pgrst, 'reload schema';
