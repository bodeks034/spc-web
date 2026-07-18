-- Veza prijemne kontrole dobavljača ↔ atributivni kontrolni_log (Ulazna kontrola).
-- Pokrenuti posle 69_dobavljaci_prijemna_kontrola.sql.

BEGIN;

ALTER TABLE kontrolni_log
  ADD COLUMN IF NOT EXISTS prijemna_kontrola_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'kontrolni_log_prijemna_kontrola_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE kontrolni_log
        ADD CONSTRAINT kontrolni_log_prijemna_kontrola_id_fkey
        FOREIGN KEY (prijemna_kontrola_id)
        REFERENCES prijemna_kontrola_dobavljaca(id)
        ON DELETE SET NULL;
    EXCEPTION
      WHEN undefined_table THEN NULL;
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_kontrolni_log_prijemna
  ON kontrolni_log (prijemna_kontrola_id)
  WHERE prijemna_kontrola_id IS NOT NULL;

COMMENT ON COLUMN kontrolni_log.prijemna_kontrola_id
  IS 'FK na prijem dobavljača — Ulazna kontrola (pogon A) puni OK/NOK prijema';

COMMIT;
