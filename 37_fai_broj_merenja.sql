-- FAI: broj merenja po dimenziji (nezavisno od broj_merenja serije / veličine lota)
ALTER TABLE karakteristike_merljive
  ADD COLUMN IF NOT EXISTS fai_broj_merenja INT;

COMMENT ON COLUMN karakteristike_merljive.fai_broj_merenja IS
  'Broj FAI merenja na prvo parče po dimenziji (nivo_kontrole=DA). Prazno = 1.';

NOTIFY pgrst, 'reload schema';
