-- Sekvenca id posle ručnog uvoza sa eksplicitnim id vrednostima
SELECT setval(
  pg_get_serial_sequence('karakteristike_merljive', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM karakteristike_merljive), 0), 1),
  true
);

NOTIFY pgrst, 'reload schema';
