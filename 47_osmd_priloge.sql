-- Prilozi 8D: defekt, Lesson Learned, PFMEA i Control Plan reference

ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS defekt_nedostatak TEXT;

ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS lesson_learned TEXT;

ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS pfmea_ref TEXT;

ALTER TABLE osmd_izvestaji ADD COLUMN IF NOT EXISTS control_plan_ref TEXT;


