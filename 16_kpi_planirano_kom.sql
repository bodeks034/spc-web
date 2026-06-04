-- Planirana količina za OEE performansu
ALTER TABLE kpi_unos
  ADD COLUMN IF NOT EXISTS planirano_kom INT NOT NULL DEFAULT 0;

NOTIFY pgrst, 'reload schema';
