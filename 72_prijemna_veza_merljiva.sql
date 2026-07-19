-- Veza prijema dobavljača ↔ merljiva Ulazna kontrola.
-- Pokrenuti posle 69 i 70.

BEGIN;

ALTER TABLE merenja_varijabilna
  ADD COLUMN IF NOT EXISTS prijemna_kontrola_id BIGINT,
  ADD COLUMN IF NOT EXISTS inspekcija_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'merenja_varijabilna_prijemna_kontrola_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE merenja_varijabilna
        ADD CONSTRAINT merenja_varijabilna_prijemna_kontrola_id_fkey
        FOREIGN KEY (prijemna_kontrola_id)
        REFERENCES prijemna_kontrola_dobavljaca(id)
        ON DELETE SET NULL;
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_merenja_varijabilna_prijemna
  ON merenja_varijabilna (prijemna_kontrola_id)
  WHERE prijemna_kontrola_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_merenja_varijabilna_inspekcija
  ON merenja_varijabilna (inspekcija_id)
  WHERE inspekcija_id IS NOT NULL;

COMMENT ON COLUMN merenja_varijabilna.prijemna_kontrola_id
  IS 'FK na prijem dobavljača — merljiva Ulazna kontrola puni OK/NOK prijema';
COMMENT ON COLUMN merenja_varijabilna.inspekcija_id
  IS 'Jedan uzorak/komad; više dimenzija istog uzorka deli isti ID';

COMMIT;
