-- Sekvence posle seed-a sa eksplicitnim id (05_dopuna_tabele_rls.sql)
SELECT setval(
  pg_get_serial_sequence('masine', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM masine), 0), 1),
  true
);

SELECT setval(
  pg_get_serial_sequence('linije', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM linije), 0), 1),
  true
);

SELECT setval(
  pg_get_serial_sequence('smene', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM smene), 0), 1),
  true
);

NOTIFY pgrst, 'reload schema';
